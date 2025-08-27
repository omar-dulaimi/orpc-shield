/**
 * Tests for shield middleware generation and execution
 */
import { describe, expect, it, vi } from 'vitest';
import { ShieldError, shield, shieldDebug } from '../src/shield.js';
import { allow, deny, rule } from '../src/rule.js';
import { and, not, or } from '../src/operators.js';
import {
  MockMiddlewareExecutor,
  TestPaths,
  createAdminContext,
  createAuthenticatedContext,
  createTestContext,
} from './helpers/setup.js';
import { TestRules } from './helpers/rules.js';
import type { TestContext } from './helpers/setup.js';
import type { IRules } from '../src/types.js';

describe('shield middleware creation', () => {
  it('should create middleware function from rule tree', () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
        create: TestRules.isAuthenticated,
      },
    };

    const middleware = shield(rules);

    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(1); // Should accept one parameter object
  });

  it('should validate rule tree structure', () => {
    const invalidRules = {
      users: {
        list: 'not a rule', // Invalid rule
      },
    } as any;

    expect(() => shield(invalidRules)).toThrow('Invalid rule at path users.list');
  });

  it('should accept nested rule structures', () => {
    const rules: IRules<TestContext> = {
      api: {
        v1: {
          users: {
            list: allow,
            create: TestRules.isAuthenticated,
          },
          posts: {
            list: allow,
            create: TestRules.isAdmin,
          },
        },
      },
    };

    expect(() => shield(rules)).not.toThrow();
  });

  it('should handle empty rule tree', () => {
    const rules: IRules<TestContext> = {};

    expect(() => shield(rules)).not.toThrow();
  });
});

describe('shield middleware execution', () => {
  it('should allow access when rule returns true', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.list,
    });

    expect(result.success).toBe(true);
  });

  it('should deny access when rule returns false', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: TestRules.returnsFalse,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.list,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ShieldError);
    expect(result.error?.message).toBe('Access denied');
  });

  it('should deny access when rule returns string error', async () => {
    const rules: IRules<TestContext> = {
      users: {
        create: TestRules.returnsStringError,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.create,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ShieldError);
    expect(result.error?.message).toBe('String error message');
  });

  it('should deny access when rule returns Error object', async () => {
    const rules: IRules<TestContext> = {
      users: {
        update: TestRules.returnsErrorObject,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.update,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ShieldError);
    expect(result.error?.message).toBe('Error object message');
  });

  it('should use fallback rule when no matching rule found', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    const fallbackRule = TestRules.isAuthenticated;
    const middleware = shield(rules, { fallbackRule });

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(middleware);

    // Try to access a path not defined in rules
    const result = await executor.execute({
      context: createTestContext({ isAuthenticated: true }),
      path: TestPaths.posts.list,
    });

    expect(result.success).toBe(true);
  });

  it('should use default allow fallback when no fallbackRule specified', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: TestRules.isAuthenticated,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules)); // No fallback specified, should default to allow

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.posts.list, // Path not in rules
    });

    expect(result.success).toBe(true);
  });

  it('should pass context, path, and input to rules', async () => {
    let receivedParams: any;
    const testRule = rule<TestContext>()((params) => {
      receivedParams = params;
      return true;
    });

    const rules: IRules<TestContext> = {
      users: {
        create: testRule,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const context = createAuthenticatedContext();
    const input = { name: 'test user' };

    await executor.execute({
      context,
      path: TestPaths.users.create,
      input,
    });

    expect(receivedParams).toEqual({
      ctx: context,
      path: TestPaths.users.create,
      input,
    });
  });

  it('should handle async rules', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: TestRules.asyncAllow,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.list,
    });

    expect(result.success).toBe(true);
  });

  it('should handle rules that throw errors', async () => {
    const rules: IRules<TestContext> = {
      users: {
        delete: TestRules.throwsError,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.delete,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ShieldError);
    expect(result.error?.message).toBe('Test error from rule');
  });
});

describe('shield with logic operators', () => {
  it('should work with AND operator', async () => {
    const rules: IRules<TestContext> = {
      users: {
        create: and(TestRules.isAuthenticated, TestRules.isActiveUser),
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const authenticatedActiveUser = createAuthenticatedContext({
      id: 'user1',
      role: 'user',
      isActive: true,
    });

    const result = await executor.execute({
      context: authenticatedActiveUser,
      path: TestPaths.users.create,
    });

    expect(result.success).toBe(true);
  });

  it('should work with OR operator', async () => {
    const rules: IRules<TestContext> = {
      admin: {
        stats: or(TestRules.isAdmin, TestRules.hasPermission('read-stats')),
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const userWithPermission = createAuthenticatedContext(
      { id: 'user1', role: 'user', isActive: true },
      ['read-stats']
    );

    const result = await executor.execute({
      context: userWithPermission,
      path: TestPaths.admin.stats,
    });

    expect(result.success).toBe(true);
  });

  it('should work with NOT operator', async () => {
    const isGuest = rule<TestContext>()((params) => params.ctx.user?.role === 'guest');

    const rules: IRules<TestContext> = {
      users: {
        create: not(isGuest), // Only non-guests can create
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const regularUser = createAuthenticatedContext({
      id: 'user1',
      role: 'user',
      isActive: true,
    });

    const result = await executor.execute({
      context: regularUser,
      path: TestPaths.users.create,
    });

    expect(result.success).toBe(true);
  });

  it('should work with nested operators', async () => {
    const rules: IRules<TestContext> = {
      users: {
        update: and(TestRules.isAuthenticated, or(TestRules.isAdmin, TestRules.isOwner)),
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const adminUser = createAdminContext();

    const result = await executor.execute({
      context: adminUser,
      path: TestPaths.users.update,
      input: { userId: 'some-user' },
    });

    expect(result.success).toBe(true);
  });
});

describe('shield path resolution', () => {
  it('should find rules in nested structures', async () => {
    const rules: IRules<TestContext> = {
      api: {
        v1: {
          users: {
            profile: {
              update: TestRules.isAuthenticated,
            },
          },
        },
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createAuthenticatedContext(),
      path: ['api', 'v1', 'users', 'profile', 'update'],
    });

    expect(result.success).toBe(true);
  });

  it('should handle partial path matches gracefully', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    // Path is longer than defined in rules
    const result = await executor.execute({
      context: createTestContext(),
      path: ['users', 'list', 'filtered'],
    });

    // Should use fallback rule (allow by default)
    expect(result.success).toBe(true);
  });

  it('should handle empty paths', async () => {
    const rules: IRules<TestContext> = {
      '': allow, // Empty string key
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: [],
    });

    expect(result.success).toBe(true);
  });

  it('should be case sensitive for path matching', async () => {
    const rules: IRules<TestContext> = {
      Users: {
        List: allow,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shield(rules, { fallbackRule: deny }));

    // Different case should not match
    const result = await executor.execute({
      context: createTestContext(),
      path: ['users', 'list'],
    });

    expect(result.success).toBe(false);
  });
});

describe('shield options', () => {
  describe('allowExternalErrors', () => {
    it('should handle rules that throw errors normally', async () => {
      const externalErrorRule = rule<TestContext>()(() => {
        throw new Error('External error');
      });

      const rules: IRules<TestContext> = {
        users: {
          list: externalErrorRule,
        },
      };

      const executor = new MockMiddlewareExecutor<TestContext>();
      executor.use(shield(rules, { allowExternalErrors: true }));

      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.users.list,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ShieldError);
      expect(result.error?.message).toBe('External error');
    });

    it('should convert external errors to ShieldError when allowExternalErrors is false', async () => {
      const externalErrorRule = rule<TestContext>()(() => {
        throw new Error('External error');
      });

      const rules: IRules<TestContext> = {
        users: {
          list: externalErrorRule,
        },
      };

      const executor = new MockMiddlewareExecutor<TestContext>();
      executor.use(shield(rules, { allowExternalErrors: false }));

      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.users.list,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ShieldError);
      expect(result.error?.message).toBe('External error');
    });
  });

  describe('debug', () => {
    it('should log debug information when debug is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rules: IRules<TestContext> = {
        users: {
          list: allow,
        },
      };

      const executor = new MockMiddlewareExecutor<TestContext>();
      executor.use(shield(rules, { debug: true }));

      await executor.execute({
        context: createTestContext(),
        path: TestPaths.users.list,
      });

      expect(consoleSpy).toHaveBeenCalledWith('[oRPC Shield] Processing path: users.list');
      expect(consoleSpy).toHaveBeenCalledWith('[oRPC Shield] Rule result for users.list: true');

      consoleSpy.mockRestore();
    });

    it('should log fallback rule usage', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rules: IRules<TestContext> = {};

      const executor = new MockMiddlewareExecutor<TestContext>();
      executor.use(shield(rules, { debug: true }));

      await executor.execute({
        context: createTestContext(),
        path: TestPaths.users.list,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[oRPC Shield] No rule found for users.list, using fallback'
      );

      consoleSpy.mockRestore();
    });

    it('should log errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const rules: IRules<TestContext> = {
        users: {
          list: TestRules.throwsError,
        },
      };

      const executor = new MockMiddlewareExecutor<TestContext>();
      executor.use(shield(rules, { debug: true }));

      await executor.execute({
        context: createTestContext(),
        path: TestPaths.users.list,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[oRPC Shield] Error processing users.list:',
        expect.any(ShieldError)
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('shieldDebug', () => {
  it('should create shield with debug enabled', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shieldDebug(rules));

    await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.list,
    });

    expect(consoleSpy).toHaveBeenCalledWith('[oRPC Shield] Processing path: users.list');

    consoleSpy.mockRestore();
  });

  it('should accept other options while forcing debug to true', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const rules: IRules<TestContext> = {
      users: {
        list: TestRules.throwsError,
      },
    };

    const executor = new MockMiddlewareExecutor<TestContext>();
    executor.use(shieldDebug(rules, { allowExternalErrors: true }));

    await executor.execute({
      context: createTestContext(),
      path: TestPaths.users.list,
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('ShieldError', () => {
  it('should create ShieldError with message and path', () => {
    const error = new ShieldError('Test error', TestPaths.users.list);

    expect(error.message).toBe('Test error');
    expect(error.path).toEqual(TestPaths.users.list);
    expect(error.name).toBe('ShieldError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new ShieldError('Test error', TestPaths.users.list);
    }).toThrow('Test error');
  });
});

describe('shield middleware integration', () => {
  it('should call next middleware when access is allowed', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    let nextCalled = false;
    const mockNext = vi.fn(async () => {
      nextCalled = true;
      return { data: 'success' };
    });

    const middleware = shield(rules);
    const context = createTestContext();

    const result = await middleware({
      context,
      path: TestPaths.users.list,
      input: {},
      next: mockNext,
    });

    expect(nextCalled).toBe(true);
    expect(mockNext).toHaveBeenCalledWith({ context });
    expect(result).toEqual({ data: 'success' });
  });

  it('should not call next middleware when access is denied', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: deny,
      },
    };

    const mockNext = vi.fn(async () => ({ data: 'should not be called' }));
    const middleware = shield(rules);

    await expect(
      middleware({
        context: createTestContext(),
        path: TestPaths.users.list,
        input: {},
        next: mockNext,
      })
    ).rejects.toThrow(ShieldError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should pass original context to next middleware', async () => {
    const rules: IRules<TestContext> = {
      users: {
        list: allow,
      },
    };

    const originalContext = createAuthenticatedContext();
    let receivedContext: any;

    const mockNext = vi.fn(async ({ context }) => {
      receivedContext = context;
      return { data: 'success' };
    });

    const middleware = shield(rules);

    await middleware({
      context: originalContext,
      path: TestPaths.users.list,
      input: {},
      next: mockNext,
    });

    expect(receivedContext).toBe(originalContext);
  });
});
