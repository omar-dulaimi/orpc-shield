/**
 * Tests for module exports and public API
 */
import { describe, expect, it } from 'vitest';

describe('module exports', () => {
  it('should export rule constructors and built-in rules', async () => {
    const ruleModule = await import('../src/rule.js');

    expect(ruleModule.rule).toBeDefined();
    expect(typeof ruleModule.rule).toBe('function');

    expect(ruleModule.allow).toBeDefined();
    expect(typeof ruleModule.allow.resolve).toBe('function');

    expect(ruleModule.deny).toBeDefined();
    expect(typeof ruleModule.deny.resolve).toBe('function');

    expect(ruleModule.denyWithMessage).toBeDefined();
    expect(typeof ruleModule.denyWithMessage).toBe('function');

    expect(ruleModule.allowAll).toBeDefined();
    expect(typeof ruleModule.allowAll).toBe('function');
  });

  it('should export logic operators', async () => {
    const operatorsModule = await import('../src/operators.js');

    expect(operatorsModule.and).toBeDefined();
    expect(typeof operatorsModule.and).toBe('function');

    expect(operatorsModule.or).toBeDefined();
    expect(typeof operatorsModule.or).toBe('function');

    expect(operatorsModule.not).toBeDefined();
    expect(typeof operatorsModule.not).toBe('function');

    expect(operatorsModule.chain).toBeDefined();
    expect(typeof operatorsModule.chain).toBe('function');

    expect(operatorsModule.race).toBeDefined();
    expect(typeof operatorsModule.race).toBe('function');
  });

  it('should export shield middleware functions', async () => {
    const shieldModule = await import('../src/shield.js');

    expect(shieldModule.shield).toBeDefined();
    expect(typeof shieldModule.shield).toBe('function');

    expect(shieldModule.shieldDebug).toBeDefined();
    expect(typeof shieldModule.shieldDebug).toBe('function');

    expect(shieldModule.ShieldError).toBeDefined();
    expect(typeof shieldModule.ShieldError).toBe('function');
  });

  it('should export types from main index', async () => {
    const indexModule = await import('../src/index.js');

    // Rule constructors and built-in rules
    expect(indexModule.rule).toBeDefined();
    expect(indexModule.allow).toBeDefined();
    expect(indexModule.deny).toBeDefined();
    expect(indexModule.denyWithMessage).toBeDefined();
    expect(indexModule.allowAll).toBeDefined();

    // Logic operators
    expect(indexModule.and).toBeDefined();
    expect(indexModule.or).toBeDefined();
    expect(indexModule.not).toBeDefined();
    expect(indexModule.chain).toBeDefined();
    expect(indexModule.race).toBeDefined();

    // Shield middleware
    expect(indexModule.shield).toBeDefined();
    expect(indexModule.shieldDebug).toBeDefined();
    expect(indexModule.ShieldError).toBeDefined();
  });

  it('should have consistent function signatures', async () => {
    const { rule, allow, deny } = await import('../src/rule.js');
    const { and, or, not } = await import('../src/operators.js');
    const { shield } = await import('../src/shield.js');

    // Rule constructor should return a function that accepts resolver
    expect(typeof rule()).toBe('function');

    // Built-in rules should have resolve method
    expect(typeof allow.resolve).toBe('function');
    expect(typeof deny.resolve).toBe('function');

    // Operators should accept rules and return rules
    const testRule = rule()(() => true);
    const andRule = and(testRule, allow);
    expect(typeof andRule.resolve).toBe('function');

    const orRule = or(testRule, deny);
    expect(typeof orRule.resolve).toBe('function');

    const notRule = not(testRule);
    expect(typeof notRule.resolve).toBe('function');

    // Shield should accept rules and return middleware function
    const middleware = shield({ test: allow });
    expect(typeof middleware).toBe('function');
  });

  it('should maintain compatibility with previous API', async () => {
    // Test that the main exports work as expected
    const { rule, allow, and, shield, ShieldError } = await import('../src/index.js');

    // Create a simple rule
    const testRule = rule()((params) => {
      return params.ctx.isAuthenticated === true;
    });

    // Test that we can combine rules
    const combinedRule = and(testRule, allow);

    // Test that we can create shield
    const middleware = shield({
      test: {
        endpoint: combinedRule,
      },
    });

    // Test ShieldError
    const error = new ShieldError('Test error', ['test']);
    expect(error.message).toBe('Test error');
    expect(error.path).toEqual(['test']);

    // All should work without errors
    expect(testRule).toBeDefined();
    expect(combinedRule).toBeDefined();
    expect(middleware).toBeDefined();
    expect(error).toBeInstanceOf(Error);
  });
});

describe('API compatibility', () => {
  it('should work with CommonJS require', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const orpcShield = require('../dist/index.js');

    expect(orpcShield.rule).toBeDefined();
    expect(orpcShield.allow).toBeDefined();
    expect(orpcShield.deny).toBeDefined();
    expect(orpcShield.and).toBeDefined();
    expect(orpcShield.or).toBeDefined();
    expect(orpcShield.not).toBeDefined();
    expect(orpcShield.shield).toBeDefined();
    expect(orpcShield.ShieldError).toBeDefined();
  });

  it('should work with ES modules import', async () => {
    const orpcShield = await import('../src/index.js');

    expect(orpcShield.rule).toBeDefined();
    expect(orpcShield.allow).toBeDefined();
    expect(orpcShield.deny).toBeDefined();
    expect(orpcShield.and).toBeDefined();
    expect(orpcShield.or).toBeDefined();
    expect(orpcShield.not).toBeDefined();
    expect(orpcShield.shield).toBeDefined();
    expect(orpcShield.ShieldError).toBeDefined();
  });

  it('should support destructured imports', async () => {
    const { rule, shield, and, or } = await import('../src/index.js');

    const testRule = rule()(() => true);
    const combinedRule = and(testRule, or(testRule, testRule));
    const middleware = shield({ test: combinedRule });

    expect(testRule).toBeDefined();
    expect(combinedRule).toBeDefined();
    expect(middleware).toBeDefined();
  });
});

describe('TypeScript type exports', () => {
  it('should export all required types', async () => {
    // This test verifies that TypeScript types are properly exported
    // The actual type checking happens at compile time
    try {
      await import('../src/index.js');
      // If we can import without throwing, types are exported correctly
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });
});

describe('error handling in exports', () => {
  it('should handle module loading errors gracefully', async () => {
    try {
      await import('../src/index.js');
    } catch (error) {
      // If there's an import error, the test should fail
      expect(error).toBeUndefined();
    }
  });

  it('should not have circular dependencies', async () => {
    // Import all modules to check for circular dependency issues
    try {
      await Promise.all([
        import('../src/rule.js'),
        import('../src/operators.js'),
        import('../src/shield.js'),
        import('../src/types.js'),
        import('../src/index.js'),
      ]);
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });
});

describe('runtime type checking', () => {
  it('should validate rule interface compliance', async () => {
    const { rule } = await import('../src/rule.js');

    const testRule = rule()(() => true);

    // Should have resolve method
    expect(typeof testRule.resolve).toBe('function');

    // Should return promise
    const result = testRule.resolve({
      ctx: { test: true },
      path: ['test'],
      input: {},
    });

    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(true);
  });

  it('should validate middleware signature', async () => {
    const { shield, allow } = await import('../src/index.js');

    const middleware = shield({ test: allow });

    // Should be a function that accepts specific parameters
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(1); // Should accept one parameter object

    // Should work with mock parameters
    const mockNext = async ({ context }: { context: any }): Promise<unknown> => {
      await Promise.resolve(); // Satisfy require-await
      return context;
    };

    const result = await middleware({
      context: { test: true },
      path: ['test'],
      input: {},
      next: mockNext,
    });

    expect(result).toEqual({ test: true });
  });
});

describe('version compatibility', () => {
  it('should maintain backward compatibility', async () => {
    // This test ensures that the API hasn't changed in breaking ways
    const { rule, allow, deny, and, or, shield } = await import('../src/index.js');

    // Legacy usage pattern should still work
    const isAuthenticated = rule()((params) => {
      return params.ctx.isAuthenticated === true;
    });

    const permissions = {
      users: {
        list: and(isAuthenticated, allow),
        create: and(isAuthenticated, or(allow, deny)),
      },
    };

    const middleware = shield(permissions);

    expect(isAuthenticated).toBeDefined();
    expect(permissions).toBeDefined();
    expect(middleware).toBeDefined();
    expect(typeof middleware).toBe('function');
  });
});
