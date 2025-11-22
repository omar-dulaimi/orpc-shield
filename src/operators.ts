import type { Context, IRule, ORPCInput, Path, RuleResult } from './types.js';

/**
 * Base class for logic rules that combine other rules
 */
abstract class LogicRule<TContext = Context, TInput = ORPCInput>
  implements IRule<TContext, TInput>
{
  constructor(protected rules: IRule<TContext, TInput>[]) {}

  abstract resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult>;
}

/**
 * AND logic rule - all rules must pass
 */
export class RuleAnd<TContext = Context, TInput = ORPCInput> extends LogicRule<TContext, TInput> {
  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    for (const rule of this.rules) {
      const result = await rule.resolve(params);
      if (result !== true) {
        return result;
      }
    }
    return true;
  }
}

/**
 * OR logic rule - at least one rule must pass
 */
export class RuleOr<TContext = Context, TInput = ORPCInput> extends LogicRule<TContext, TInput> {
  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    const errors: RuleResult[] = [];

    for (const rule of this.rules) {
      const result = await rule.resolve(params);
      if (result === true) {
        return true;
      }
      errors.push(result);
    }

    // Return the first error if all rules failed
    return errors[0] || new Error('All rules failed');
  }
}

/**
 * NOT logic rule - inverts the result of a single rule
 */
export class RuleNot<TContext = Context, TInput = ORPCInput> implements IRule<TContext, TInput> {
  constructor(private rule: IRule<TContext, TInput>) {}

  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    const result = await this.rule.resolve(params);
    if (result === true) {
      return new Error('Rule should not pass');
    }
    return true;
  }
}

/**
 * CHAIN logic rule - executes rules in sequence, short-circuiting on failure
 */
export class RuleChain<TContext = Context, TInput = ORPCInput> extends LogicRule<TContext, TInput> {
  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    for (const rule of this.rules) {
      const result = await rule.resolve(params);
      if (result !== true) {
        return result;
      }
    }
    return true;
  }
}

/**
 * RACE logic rule - returns the result of the first rule to complete
 */
export class RuleRace<TContext = Context, TInput = ORPCInput> extends LogicRule<TContext, TInput> {
  async resolve(params: { ctx: TContext; path: Path; input: TInput }): Promise<RuleResult> {
    const promises = this.rules.map((rule) => rule.resolve(params));
    return await Promise.race(promises);
  }
}

// Operator functions

/**
 * Creates an AND rule - all rules must pass
 */
export function and<TContext = Context, TInput = ORPCInput>(
  ...rules: IRule<TContext, TInput>[]
): IRule<TContext, TInput> {
  return new RuleAnd(rules);
}

/**
 * Creates an OR rule - at least one rule must pass
 */
export function or<TContext = Context, TInput = ORPCInput>(
  ...rules: IRule<TContext, TInput>[]
): IRule<TContext, TInput> {
  return new RuleOr(rules);
}

/**
 * Creates a NOT rule - inverts the result of a rule
 */
export function not<TContext = Context, TInput = ORPCInput>(
  rule: IRule<TContext, TInput>
): IRule<TContext, TInput> {
  return new RuleNot(rule);
}

/**
 * Creates a CHAIN rule - executes rules in sequence
 */
export function chain<TContext = Context, TInput = ORPCInput>(
  ...rules: IRule<TContext, TInput>[]
): IRule<TContext, TInput> {
  return new RuleChain(rules);
}

/**
 * Creates a RACE rule - returns first completed rule result
 */
export function race<TContext = Context, TInput = ORPCInput>(
  ...rules: IRule<TContext, TInput>[]
): IRule<TContext, TInput> {
  return new RuleRace(rules);
}
