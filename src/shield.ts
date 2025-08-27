import type {
  IRule,
  IRules,
  ORPCContext,
  ORPCMiddleware,
  Path,
  RuleResult,
  ShieldOptions,
} from './types.js';
import { allow } from './rule.js';

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
function findRuleInTree<TContext = ORPCContext>(
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
function validateRuleTree<TContext = ORPCContext>(
  rules: IRules<TContext>,
  path: string[] = []
): void {
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
export function shield<TContext = ORPCContext>(
  rules: IRules<TContext>,
  options: ShieldOptions<TContext> = {}
): ORPCMiddleware<TContext> {
  const { fallbackRule = allow, allowExternalErrors = true, debug = false } = options;

  // Validate rule tree structure
  validateRuleTree(rules);

  return async function shieldMiddleware({ context, next, path, input }): Promise<any> {
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

      // If we get here, access is allowed
      return await next({ context });
    } catch (error) {
      if (debug) {
        console.error(`[oRPC Shield] Error processing ${path.join('.')}:`, error);
      }

      // Re-throw ShieldError instances as-is
      if (error instanceof ShieldError) {
        throw error;
      }

      // Handle external errors based on configuration
      if (allowExternalErrors && error instanceof Error) {
        throw error;
      }

      // Convert other errors to ShieldError
      throw new ShieldError(error instanceof Error ? error.message : String(error), path);
    }
  };
}

/**
 * Creates a shield with debug logging enabled
 */
export function shieldDebug<TContext = ORPCContext>(
  rules: IRules<TContext>,
  options: Omit<ShieldOptions<TContext>, 'debug'> = {}
): ORPCMiddleware<TContext> {
  return shield(rules, { ...options, debug: true });
}
