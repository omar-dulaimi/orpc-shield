import type {
  Context,
  IRule,
  IRules,
  MiddlewareResult,
  ORPCMiddleware,
  Path,
  RuleResult,
  ShieldOptions,
} from './types.js';
import { allow } from './rule.js';
import { ORPCError } from '@orpc/server';

/**
 * Shield error class for authorization failures
 */
export class ShieldError extends Error {
  constructor(
    message: string,
    public path: Path
  ) {
    super(message);
    this.name = 'ShieldError';
  }
}

/**
 * Finds a rule in the rule tree based on the procedure path
 */
function isRule<TContext extends Context>(value: unknown): value is IRule<TContext> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resolve' in (value as Record<string, unknown>) &&
    typeof (value as { resolve?: unknown }).resolve === 'function'
  );
}

function findRuleInTree<TContext extends Context>(
  rules: IRules<TContext>,
  path: Path
): IRule<TContext> | null {
  let current: IRules<TContext> | IRule<TContext> | undefined = rules;

  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }

    // Annotated rather than inferred: `current` is assigned from `next` below, so without this the
    // two infer through each other and TypeScript reports TS7022.
    const next: IRules<TContext> | IRule<TContext> | undefined = (current as IRules<TContext>)[
      segment
    ];

    if (!next) {
      return null;
    }

    current = next;
  }

  return isRule(current) ? current : null;
}

/**
 * Validates that the rule tree is properly structured
 */
function validateRuleTree<TContext extends Context>(
  rules: IRules<TContext>,
  path: string[] = []
): void {
  for (const [key, value] of Object.entries(rules)) {
    const currentPath = [...path, key];

    if (value && typeof value === 'object') {
      if (isRule<TContext>(value)) {
        // It's a rule - valid
        continue;
      } else {
        // It should be a nested rule tree
        validateRuleTree(value as IRules<TContext>, currentPath);
      }
    } else {
      throw new Error(
        `Invalid rule at path ${currentPath.join('.')}: Expected rule or nested rules object`
      );
    }
  }
}

/**
 * Processes rule result and handles errors
 */
function processRuleResult(result: RuleResult, path: Path): unknown {
  if (result === true) {
    return undefined; // Allow access, context unchanged
  }

  if (typeof result === 'string') {
    throw new ShieldError(result, path);
  }

  if (result instanceof Error) {
    throw new ShieldError(result.message, path);
  }

  // A rule may allow the call and replace the context for everything downstream. Checked before the
  // deny branch, since an object is neither `true` nor an Error and would otherwise be read as a
  // refusal.
  if (result !== null && typeof result === 'object' && 'ctx' in result) {
    return (result as { ctx: unknown }).ctx;
  }

  // result is false
  throw new ShieldError('Access denied', path);
}

/**
 * Creates oRPC shield middleware from a rule tree
 */
export function shield<TContext extends Context = Context>(
  rules: IRules<TContext>,
  options: ShieldOptions<TContext> = {}
): ORPCMiddleware<TContext> {
  const {
    fallbackRule = allow,
    allowExternalErrors = true,
    debug = false,
    denyErrorCode,
  } = options;

  // Validate rule tree structure
  validateRuleTree(rules);

  const middleware: ORPCMiddleware<TContext> = async (
    options,
    input,
    _output
  ): Promise<MiddlewareResult<TContext>> => {
    const { context, path, next } = options;

    try {
      if (debug) {
        console.log(`[oRPC Shield] Processing path: ${path.join('.')}`);
      }

      // Find the appropriate rule for this path
      let rule = findRuleInTree(rules, path);

      if (!rule) {
        if (debug) {
          console.log(`[oRPC Shield] No rule found for ${path.join('.')}, using fallback`);
        }
        rule = fallbackRule;
      }

      // Execute the rule
      const result = await rule.resolve({
        ctx: context,
        path,
        input,
      });

      if (debug) {
        // Kept as one string so the shape of this line does not change. `RuleResult` now includes
        // an object, which cannot be interpolated directly.
        const shown =
          result instanceof Error
            ? result.message
            : typeof result === 'object'
              ? JSON.stringify(result)
              : String(result);
        console.log(`[oRPC Shield] Rule result for ${path.join('.')}: ${shown}`);
      }

      // Process the result
      const extendedContext = processRuleResult(result, path);

      // If we get here, access is allowed - call next middleware
      // The rule author decides the shape of a replacement context, so it is taken on trust here in
      // the same way the surrounding oRPC types treat the original.
      return next({ context: (extendedContext ?? context) as typeof context });
    } catch (error) {
      if (debug) {
        console.error(`[oRPC Shield] Error processing ${path.join('.')}:`, error);
      }

      // Re-throw ShieldError instances (or map to ORPCError if configured)
      if (error instanceof ShieldError) {
        if (denyErrorCode) {
          throw new ORPCError(denyErrorCode, { message: error.message });
        }
        throw error;
      }

      // Handle external errors based on configuration
      if (allowExternalErrors && error instanceof Error) {
        throw error;
      }

      // Convert other errors
      const message = error instanceof Error ? error.message : String(error);
      if (denyErrorCode) {
        throw new ORPCError(denyErrorCode, { message });
      }
      throw new ShieldError(message, path);
    }
  };
  return middleware;
}

/**
 * Creates a shield with debug logging enabled
 */
export function shieldDebug<TContext extends Context = Context>(
  rules: IRules<TContext>,
  options: Omit<ShieldOptions<TContext>, 'debug'> = {}
): ORPCMiddleware<TContext> {
  return shield(rules, { ...options, debug: true });
}

/**
 * Convenience helper: map denials to ORPCError('FORBIDDEN') for HTTP-friendly responses.
 */
export function shieldForORPC<TContext extends Context = Context>(
  rules: IRules<TContext>,
  options: Omit<ShieldOptions<TContext>, 'denyErrorCode'> = {}
): ORPCMiddleware<TContext> {
  return shield(rules, { denyErrorCode: 'FORBIDDEN', ...options });
}
