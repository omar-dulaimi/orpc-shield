import type { Context, IRule, ORPCInput, Path, RuleResolver, RuleResult } from './types.js';

/**
 * Rule class implementation for oRPC
 */
export class Rule<TContext = Context, TInput = ORPCInput> implements IRule<TContext, TInput> {
  constructor(private resolver: RuleResolver<TContext, TInput>) {}

  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    try {
      return await this.resolver(params);
    } catch (error) {
      if (error instanceof Error) {
        return error;
      }
      return new Error(String(error));
    }
  }
}

/**
 * Creates a new rule from a resolver function
 */
export function rule<TContext = Context, TInput = ORPCInput>() {
  return (resolver: RuleResolver<TContext, TInput>) => {
    return new Rule(resolver);
  };
}

/**
 * Built-in rule that always allows access
 */
export const allow = new Rule<Context, ORPCInput>(() => true);

/**
 * Built-in rule that always denies access
 */
export const deny = new Rule<Context, ORPCInput>(() => new Error('Access denied'));

/**
 * Creates a rule that always denies with a custom message
 */
export function denyWithMessage(message: string) {
  return new Rule<Context, ORPCInput>(() => new Error(message));
}

/**
 * Creates a rule that always allows (alias for allow)
 */
export function allowAll() {
  return allow;
}
