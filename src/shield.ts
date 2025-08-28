import type {
  IRule,
  IRules,
  MiddlewareOptions,
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
function findRuleInTree<TContext = any>(
  rules: IRules<TContext>,
  path: Path
): IRule<TContext> | null {
  let current: any = rules;

  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }

    current = current[segment];
  }

  // Check if the found item is a rule (has resolve method)
  if (current && typeof current === 'object' && 'resolve' in current) {
    return current as IRule<TContext>;
  }

  return null;
}

/**
 * Validates that the rule tree is properly structured
 */
function validateRuleTree<TContext = any>(rules: IRules<TContext>, path: string[] = []): void {
  for (const [key, value] of Object.entries(rules)) {
    const currentPath = [...path, key];

    if (value && typeof value === 'object') {
      if ('resolve' in value && typeof value.resolve === 'function') {
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
function processRuleResult(result: RuleResult, path: Path): void {
  if (result === true) {
    return; // Allow access
  }

  if (typeof result === 'string') {
    throw new ShieldError(result, path);
  }

  if (result instanceof Error) {
    throw new ShieldError(result.message, path);
  }

  // result is false
  throw new ShieldError('Access denied', path);
}

/**
 * Creates oRPC shield middleware from a rule tree
 */
export function shield<TContext = any>(
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

  return async function shieldMiddleware(
    options: MiddlewareOptions<TContext>,
    input: any
  ): Promise<MiddlewareResult<TContext>> {
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
        console.log(`[oRPC Shield] Rule result for ${path.join('.')}: ${result}`);
      }

      // Process the result
      processRuleResult(result, path);

      // If we get here, access is allowed - call next middleware
      return next({ context });
    } catch (error) {
      if (debug) {
        console.error(`[oRPC Shield] Error processing ${path.join('.')}:`, error);
      }

      // Re-throw ShieldError instances (or map to ORPCError if configured)
      if (error instanceof ShieldError) {
        if (denyErrorCode) {
          throw new ORPCError(denyErrorCode as any, { message: error.message });
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
        throw new ORPCError(denyErrorCode as any, { message });
      }
      throw new ShieldError(message, path);
    }
  };
}

/**
 * Creates a shield with debug logging enabled
 */
export function shieldDebug<TContext = any>(
  rules: IRules<TContext>,
  options: Omit<ShieldOptions<TContext>, 'debug'> = {}
): ORPCMiddleware<TContext> {
  return shield(rules, { ...options, debug: true });
}

/**
 * Convenience helper: map denials to ORPCError('FORBIDDEN') for HTTP-friendly responses.
 */
export function shieldForORPC<TContext = any>(
  rules: IRules<TContext>,
  options: Omit<ShieldOptions<TContext>, 'denyErrorCode'> = {}
): ORPCMiddleware<TContext> {
  return shield(rules, { denyErrorCode: 'FORBIDDEN', ...options });
}
