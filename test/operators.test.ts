/**
 * Tests for logic operators (and, or, not, chain, race)
 */
import { describe, expect, it, vi } from 'vitest';
import { and, chain, not, or, race } from '../src/operators.js';
import { allow, deny, rule } from '../src/rule.js';
// eslint-disable-next-line sort-imports
import { createTestContext, delay, TestPaths, type TestContext } from './helpers/setup.js';
import { TestRules } from './helpers/rules.js';

describe('and operator', () => {
  it('should return true when all rules return true', async () => {
    const rule1 = rule<TestContext>()(() => true);
    const rule2 = rule<TestContext>()(() => true);
    const rule3 = rule<TestContext>()(() => true);

    const andRule = and(rule1, rule2, rule3);
    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should return first error when any rule fails', async () => {
    const rule1 = rule<TestContext>()(() => true);
    const rule2 = rule<TestContext>()(() => 'Error message');
    const rule3 = rule<TestContext>()(() => false);

    const andRule = and(rule1, rule2, rule3);
    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe('Error message');
  });

  it('should short-circuit on first failure', async () => {
    const rule1 = rule<TestContext>()(() => true);
    const rule2 = rule<TestContext>()(() => false);
    const rule3 = vi.fn(() => true);
    const mockRule3 = rule<TestContext>()(rule3);

    const andRule = and(rule1, rule2, mockRule3);
    const context = createTestContext();

    await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(rule3).not.toHaveBeenCalled();
  });

  it('should handle async rules', async () => {
    const asyncRule1 = rule<TestContext>()(async () => {
      await delay(10);
      return true;
    });
    const asyncRule2 = rule<TestContext>()(async () => {
      await delay(20);
      return true;
    });

    const andRule = and(asyncRule1, asyncRule2);
    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should work with built-in rules', async () => {
    const andRule = and(allow, TestRules.isAuthenticated);
    const context = createTestContext({ isAuthenticated: true });

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle empty rule array', async () => {
    const andRule = and();
    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle single rule', async () => {
    const andRule = and(allow);
    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });
});

describe('or operator', () => {
  it('should return true when at least one rule returns true', async () => {
    const rule1 = rule<TestContext>()(() => false);
    const rule2 = rule<TestContext>()(() => true);
    const rule3 = rule<TestContext>()(() => false);

    const orRule = or(rule1, rule2, rule3);
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should return first error when all rules fail', async () => {
    const rule1 = rule<TestContext>()(() => 'First error');
    const rule2 = rule<TestContext>()(() => false);
    const rule3 = rule<TestContext>()(() => new Error('Third error'));

    const orRule = or(rule1, rule2, rule3);
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe('First error');
  });

  it('should not short-circuit - evaluate all rules until one passes', async () => {
    const rule1 = vi.fn(() => false);
    const rule2 = vi.fn(() => 'error');
    const rule3 = vi.fn(() => true);
    const rule4 = vi.fn(() => false);

    const mockRule1 = rule<TestContext>()(rule1);
    const mockRule2 = rule<TestContext>()(rule2);
    const mockRule3 = rule<TestContext>()(rule3);
    const mockRule4 = rule<TestContext>()(rule4);

    const orRule = or(mockRule1, mockRule2, mockRule3, mockRule4);
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
    expect(rule1).toHaveBeenCalled();
    expect(rule2).toHaveBeenCalled();
    expect(rule3).toHaveBeenCalled();
    expect(rule4).not.toHaveBeenCalled(); // Should stop after rule3 passes
  });

  it('should handle async rules', async () => {
    const asyncRule1 = rule<TestContext>()(async () => {
      await delay(10);
      return false;
    });
    const asyncRule2 = rule<TestContext>()(async () => {
      await delay(20);
      return true;
    });

    const orRule = or(asyncRule1, asyncRule2);
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should return error for empty rule array', async () => {
    const orRule = or();
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('All rules failed');
  });

  it('should handle single rule', async () => {
    const orRule = or(deny);
    const context = createTestContext();

    const result = await orRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
  });
});

describe('not operator', () => {
  it('should invert true to error', async () => {
    const notRule = not(allow);
    const context = createTestContext();

    const result = await notRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Rule should not pass');
  });

  it('should invert false to true', async () => {
    const falseRule = rule<TestContext>()(() => false);
    const notRule = not(falseRule);
    const context = createTestContext();

    const result = await notRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should invert string error to true', async () => {
    const errorRule = rule<TestContext>()(() => 'Some error');
    const notRule = not(errorRule);
    const context = createTestContext();

    const result = await notRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should invert Error object to true', async () => {
    const notRule = not(deny);
    const context = createTestContext();

    const result = await notRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle async rules', async () => {
    const asyncRule = rule<TestContext>()(async () => {
      await delay(10);
      return true;
    });
    const notRule = not(asyncRule);
    const context = createTestContext();

    const result = await notRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
  });
});

describe('chain operator', () => {
  it('should execute rules in sequence and return true if all pass', async () => {
    const rule1 = rule<TestContext>()(() => true);
    const rule2 = rule<TestContext>()(() => true);
    const rule3 = rule<TestContext>()(() => true);

    const chainRule = chain(rule1, rule2, rule3);
    const context = createTestContext();

    const result = await chainRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should short-circuit on first failure', async () => {
    const rule1 = rule<TestContext>()(() => true);
    const rule2 = rule<TestContext>()(() => 'Chain error');
    const rule3 = vi.fn(() => true);
    const mockRule3 = rule<TestContext>()(rule3);

    const chainRule = chain(rule1, rule2, mockRule3);
    const context = createTestContext();

    const result = await chainRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe('Chain error');
    expect(rule3).not.toHaveBeenCalled();
  });

  it('should maintain execution order', async () => {
    const executionOrder: number[] = [];

    const rule1 = rule<TestContext>()(() => {
      executionOrder.push(1);
      return true;
    });
    const rule2 = rule<TestContext>()(() => {
      executionOrder.push(2);
      return true;
    });
    const rule3 = rule<TestContext>()(() => {
      executionOrder.push(3);
      return true;
    });

    const chainRule = chain(rule1, rule2, rule3);
    const context = createTestContext();

    await chainRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it('should handle async rules in order', async () => {
    const executionOrder: number[] = [];

    const asyncRule1 = rule<TestContext>()(async () => {
      await delay(30);
      executionOrder.push(1);
      return true;
    });
    const asyncRule2 = rule<TestContext>()(async () => {
      await delay(10);
      executionOrder.push(2);
      return true;
    });

    const chainRule = chain(asyncRule1, asyncRule2);
    const context = createTestContext();

    await chainRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(executionOrder).toEqual([1, 2]);
  });

  it('should handle empty rule array', async () => {
    const chainRule = chain();
    const context = createTestContext();

    const result = await chainRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe(true);
  });
});

describe('race operator', () => {
  it('should return result of first completed rule', async () => {
    const slowRule = rule<TestContext>()(async () => {
      await delay(100);
      return 'slow result';
    });
    const fastRule = rule<TestContext>()(async () => {
      await delay(10);
      return 'fast result';
    });

    const raceRule = race(slowRule, fastRule);
    const context = createTestContext();

    const result = await raceRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBe('fast result');
  });

  it('should handle sync rules', async () => {
    const syncRule1 = rule<TestContext>()(() => 'sync result 1');
    const syncRule2 = rule<TestContext>()(() => 'sync result 2');

    const raceRule = race(syncRule1, syncRule2);
    const context = createTestContext();

    const result = await raceRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    // One of the sync results should be returned
    expect(['sync result 1', 'sync result 2']).toContain(result);
  });

  it('should return first error if that completes first', async () => {
    const errorRule = rule<TestContext>()(async () => {
      await delay(10);
      return new Error('Fast error');
    });
    const slowRule = rule<TestContext>()(async () => {
      await delay(100);
      return true;
    });

    const raceRule = race(errorRule, slowRule);
    const context = createTestContext();

    const result = await raceRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Fast error');
  });

  it('should handle mixed async and sync rules', async () => {
    const asyncRule = rule<TestContext>()(async () => {
      await delay(50);
      return 'async result';
    });
    const syncRule = rule<TestContext>()(() => true);

    const raceRule = race(asyncRule, syncRule);
    const context = createTestContext();

    const result = await raceRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    // Sync rule should complete first
    expect(result).toBe(true);
  });
});

describe('nested operators', () => {
  it('should handle and inside or', async () => {
    const adminRule = rule<TestContext>()((params) => params.ctx.user?.role === 'admin');
    const ownerRule = rule<TestContext>()((params) => params.ctx.user?.id === 'user123');
    const authenticatedRule = rule<TestContext>()((params) => params.ctx.isAuthenticated);

    // (admin AND authenticated) OR (owner AND authenticated)
    const complexRule = or(and(adminRule, authenticatedRule), and(ownerRule, authenticatedRule));

    const ownerContext = createTestContext({
      user: { id: 'user123', role: 'user', isActive: true },
      isAuthenticated: true,
    });

    const result = await complexRule.resolve({
      ctx: ownerContext,
      path: TestPaths.users.update,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle or inside and', async () => {
    const adminRule = rule<TestContext>()((params) => params.ctx.user?.role === 'admin');
    const ownerRule = rule<TestContext>()((params) => params.ctx.user?.id === 'user123');
    const authenticatedRule = rule<TestContext>()((params) => params.ctx.isAuthenticated);

    // authenticated AND (admin OR owner)
    const complexRule = and(authenticatedRule, or(adminRule, ownerRule));

    const adminContext = createTestContext({
      user: { id: 'admin1', role: 'admin', isActive: true },
      isAuthenticated: true,
    });

    const result = await complexRule.resolve({
      ctx: adminContext,
      path: TestPaths.users.update,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle not with complex expressions', async () => {
    const guestRule = rule<TestContext>()((params) => params.ctx.user?.role === 'guest');
    const inactiveRule = rule<TestContext>()((params) => params.ctx.user?.isActive === false);

    // NOT (guest OR inactive) - equivalent to (NOT guest AND NOT inactive)
    const complexRule = not(or(guestRule, inactiveRule));

    const activeUserContext = createTestContext({
      user: { id: 'user1', role: 'user', isActive: true },
      isAuthenticated: true,
    });

    const result = await complexRule.resolve({
      ctx: activeUserContext,
      path: TestPaths.users.update,
      input: {},
    });

    expect(result).toBe(true);
  });

  it('should handle chain with nested operators', async () => {
    const authenticatedRule = rule<TestContext>()((params) => params.ctx.isAuthenticated);
    const adminOrOwnerRule = or(TestRules.isAdmin, TestRules.isOwner);
    const activeRule = rule<TestContext>()((params) => params.ctx.user?.isActive === true);

    const complexRule = chain(authenticatedRule, adminOrOwnerRule, activeRule);

    const context = createTestContext({
      user: { id: 'admin1', role: 'admin', isActive: true },
      isAuthenticated: true,
    });

    const result = await complexRule.resolve({
      ctx: context,
      path: TestPaths.admin.users,
      input: { userId: 'admin1' },
    });

    expect(result).toBe(true);
  });
});

describe('operator error handling', () => {
  it('should propagate errors from nested operators', async () => {
    const errorRule = rule<TestContext>()(() => {
      throw new Error('Nested error');
    });
    const nestedAnd = and(errorRule, allow);
    const outerOr = or(deny, nestedAnd);

    const context = createTestContext();

    const result = await outerOr.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    // Should get the error from deny since it's evaluated first
    expect(result).toBeInstanceOf(Error);
  });

  it('should handle async errors in operators', async () => {
    const asyncErrorRule = rule<TestContext>()(async () => {
      await delay(10);
      throw new Error('Async nested error');
    });
    const andRule = and(allow, asyncErrorRule);

    const context = createTestContext();

    const result = await andRule.resolve({
      ctx: context,
      path: TestPaths.users.list,
      input: {},
    });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Async nested error');
  });
});
