/**
 * Integration tests for oRPC Shield with realistic scenarios
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shield } from '../src/shield.js';
import { allow, deny, rule } from '../src/rule.js';
import { and, chain, not, or, race } from '../src/operators.js';
import {
  MockMiddlewareExecutor,
  TestInputs,
  TestPaths,
  createAdminContext,
  createAuthenticatedContext,
  createTestContext,
} from './helpers/setup.js';
import type { TestContext } from './helpers/setup.js';
import type { IRules } from '../src/types.js';

describe('integration: realistic application scenarios', () => {
  let executor: MockMiddlewareExecutor<TestContext>;

  beforeEach(() => {
    executor = new MockMiddlewareExecutor<TestContext>();
  });

  describe('blog application permissions', () => {
    const isAuthenticated = rule<TestContext>()((params) => {
      return params.ctx.isAuthenticated;
    });

    const isAdmin = rule<TestContext>()((params) => {
      return params.ctx.user?.role === 'admin';
    });

    const isAuthor = rule<TestContext, { authorId?: string }>()((params) => {
      return params.ctx.user?.id === params.input?.authorId;
    });

    const isPublished = rule<TestContext, { published?: boolean }>()((params) => {
      return params.input?.published === true;
    });

    const blogRules: IRules<TestContext> = {
      posts: {
        // Anyone can list published posts
        list: allow,
        // Anyone can read published posts, authenticated users can read drafts
        get: or(isPublished, isAuthenticated),
        // Only authenticated users can create posts
        create: isAuthenticated,
        // Only author or admin can update posts
        update: and(isAuthenticated, or(isAdmin, isAuthor)),
        // Only admin can delete posts
        delete: isAdmin,
      },
      comments: {
        // Anyone can read comments
        list: allow,
        get: allow,
        // Only authenticated users can create comments
        create: isAuthenticated,
        // Only comment author or admin can update
        update: and(isAuthenticated, or(isAdmin, isAuthor)),
        // Only admin can delete comments
        delete: isAdmin,
      },
      admin: {
        // All admin routes require admin role
        stats: isAdmin,
        users: isAdmin,
        posts: isAdmin,
        settings: isAdmin,
      },
    };

    beforeEach(() => {
      executor.use(shield(blogRules));
    });

    it('should allow anonymous users to list posts', async () => {
      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.posts.list,
      });

      expect(result.success).toBe(true);
    });

    it('should allow anonymous users to read published posts', async () => {
      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.posts.get,
        input: { published: true },
      });

      expect(result.success).toBe(true);
    });

    it('should deny anonymous users from reading draft posts', async () => {
      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.posts.get,
        input: { published: false },
      });

      expect(result.success).toBe(false);
    });

    it('should allow authenticated users to read draft posts', async () => {
      const result = await executor.execute({
        context: createAuthenticatedContext(),
        path: TestPaths.posts.get,
        input: { published: false },
      });

      expect(result.success).toBe(true);
    });

    it('should allow authenticated users to create posts', async () => {
      const result = await executor.execute({
        context: createAuthenticatedContext(),
        path: TestPaths.posts.create,
        input: TestInputs.post.create,
      });

      expect(result.success).toBe(true);
    });

    it('should deny unauthenticated users from creating posts', async () => {
      const result = await executor.execute({
        context: createTestContext(),
        path: TestPaths.posts.create,
        input: TestInputs.post.create,
      });

      expect(result.success).toBe(false);
    });

    it('should allow post author to update their own posts', async () => {
      const authorContext = createAuthenticatedContext({
        id: 'author123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: authorContext,
        path: TestPaths.posts.update,
        input: { ...TestInputs.post.update, authorId: 'author123' },
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-authors from updating posts', async () => {
      const userContext = createAuthenticatedContext({
        id: 'user456',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: userContext,
        path: TestPaths.posts.update,
        input: { ...TestInputs.post.update, authorId: 'author123' },
      });

      expect(result.success).toBe(false);
    });

    it('should allow admin to update any post', async () => {
      const adminContext = createAdminContext();

      const result = await executor.execute({
        context: adminContext,
        path: TestPaths.posts.update,
        input: { ...TestInputs.post.update, authorId: 'author123' },
      });

      expect(result.success).toBe(true);
    });

    it('should only allow admin to delete posts', async () => {
      const userContext = createAuthenticatedContext();

      const userResult = await executor.execute({
        context: userContext,
        path: TestPaths.posts.delete,
        input: TestInputs.post.delete,
      });

      expect(userResult.success).toBe(false);

      const adminContext = createAdminContext();

      const adminResult = await executor.execute({
        context: adminContext,
        path: TestPaths.posts.delete,
        input: TestInputs.post.delete,
      });

      expect(adminResult.success).toBe(true);
    });

    it('should protect all admin routes', async () => {
      const userContext = createAuthenticatedContext();

      const userResult = await executor.execute({
        context: userContext,
        path: TestPaths.admin.stats,
      });

      expect(userResult.success).toBe(false);

      const adminContext = createAdminContext();

      const adminResult = await executor.execute({
        context: adminContext,
        path: TestPaths.admin.stats,
      });

      expect(adminResult.success).toBe(true);
    });
  });

  describe('multi-tenant application', () => {
    const isTenantMember = rule<TestContext, { tenantId?: string }>()((params) => {
      const userTenantId = params.ctx.user?.id?.split('-')[0]; // Mock: user-{tenantId}-{userId}
      return userTenantId === params.input?.tenantId;
    });

    const isTenantAdmin = rule<TestContext, { tenantId?: string }>()((params) => {
      return (
        params.ctx.user?.role === 'admin' &&
        params.ctx.user.id.includes(params.input?.tenantId || '')
      );
    });

    const tenantRules: IRules<TestContext> = {
      tenants: {
        // Users can only access their own tenant data
        get: and(
          rule<TestContext>()((params) => params.ctx.isAuthenticated),
          isTenantMember
        ),
        update: and(
          rule<TestContext>()((params) => params.ctx.isAuthenticated),
          isTenantAdmin
        ),
        users: {
          list: and(
            rule<TestContext>()((params) => params.ctx.isAuthenticated),
            isTenantMember
          ),
          create: and(
            rule<TestContext>()((params) => params.ctx.isAuthenticated),
            isTenantAdmin
          ),
        },
      },
    };

    beforeEach(() => {
      executor.use(shield(tenantRules));
    });

    it('should allow tenant members to access tenant data', async () => {
      const tenantMemberContext = createAuthenticatedContext({
        id: 'tenant1-user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: tenantMemberContext,
        path: ['tenants', 'get'],
        input: { tenantId: 'tenant1' },
      });

      expect(result.success).toBe(true);
    });

    it('should deny access to other tenant data', async () => {
      const tenantMemberContext = createAuthenticatedContext({
        id: 'tenant1-user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: tenantMemberContext,
        path: ['tenants', 'get'],
        input: { tenantId: 'tenant2' },
      });

      expect(result.success).toBe(false);
    });

    it('should allow tenant admin to manage tenant users', async () => {
      const tenantAdminContext = createAuthenticatedContext({
        id: 'tenant1-admin123',
        role: 'admin',
        isActive: true,
      });

      const result = await executor.execute({
        context: tenantAdminContext,
        path: ['tenants', 'users', 'create'],
        input: { tenantId: 'tenant1' },
      });

      expect(result.success).toBe(true);
    });

    it('should deny regular tenant members from managing users', async () => {
      const tenantMemberContext = createAuthenticatedContext({
        id: 'tenant1-user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: tenantMemberContext,
        path: ['tenants', 'users', 'create'],
        input: { tenantId: 'tenant1' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('resource ownership patterns', () => {
    const isResourceOwner = rule<TestContext, { userId?: string }>()((params) => {
      return params.ctx.user?.id === params.input?.userId;
    });

    const hasReadPermission = rule<TestContext>()((params) => {
      return params.ctx.permissions?.includes('read') === true;
    });

    const ownershipRules: IRules<TestContext> = {
      profile: {
        get: or(isResourceOwner, hasReadPermission),
        update: isResourceOwner,
        delete: isResourceOwner,
      },
      settings: {
        get: isResourceOwner,
        update: isResourceOwner,
      },
    };

    beforeEach(() => {
      executor.use(shield(ownershipRules));
    });

    it('should allow users to access their own profile', async () => {
      const userContext = createAuthenticatedContext({
        id: 'user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: userContext,
        path: ['profile', 'get'],
        input: { userId: 'user123' },
      });

      expect(result.success).toBe(true);
    });

    it('should allow users with read permission to access profiles', async () => {
      const userContext = createAuthenticatedContext(
        { id: 'user456', role: 'user', isActive: true },
        ['read']
      );

      const result = await executor.execute({
        context: userContext,
        path: ['profile', 'get'],
        input: { userId: 'user123' },
      });

      expect(result.success).toBe(true);
    });

    it('should deny users without permission from accessing other profiles', async () => {
      const userContext = createAuthenticatedContext({
        id: 'user456',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: userContext,
        path: ['profile', 'get'],
        input: { userId: 'user123' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('async rule scenarios', () => {
    const asyncDatabaseCheck = rule<TestContext, { id?: string }>()(async (params) => {
      // Simulate async database call
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Mock: user can only access their own records
      return params.ctx.user?.id === params.input?.id;
    });

    const asyncExternalService = rule<TestContext>()(async (params) => {
      // Simulate external service call
      await new Promise((resolve) => setTimeout(resolve, 20));

      if (params.ctx.user?.id === 'banned-user') {
        return new Error('User is banned by external service');
      }

      return true;
    });

    const asyncRules: IRules<TestContext> = {
      data: {
        get: and(
          rule<TestContext>()((params) => params.ctx.isAuthenticated),
          asyncDatabaseCheck,
          asyncExternalService
        ),
      },
    };

    beforeEach(() => {
      executor.use(shield(asyncRules));
    });

    it('should handle successful async rules', async () => {
      const userContext = createAuthenticatedContext({
        id: 'user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: userContext,
        path: ['data', 'get'],
        input: { id: 'user123' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle async rule failures', async () => {
      const userContext = createAuthenticatedContext({
        id: 'user123',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: userContext,
        path: ['data', 'get'],
        input: { id: 'user456' }, // Different user ID
      });

      expect(result.success).toBe(false);
    });

    it('should handle async external service errors', async () => {
      const bannedUserContext = createAuthenticatedContext({
        id: 'banned-user',
        role: 'user',
        isActive: true,
      });

      const result = await executor.execute({
        context: bannedUserContext,
        path: ['data', 'get'],
        input: { id: 'banned-user' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('User is banned by external service');
    });
  });

  describe('race conditions and performance', () => {
    const fastRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    });

    const slowRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return true;
    });

    const verySlowRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return new Error('This should not be reached in race');
    });

    const performanceRules: IRules<TestContext> = {
      fast: {
        endpoint: race(fastRule, slowRule, verySlowRule),
      },
      fallback: {
        endpoint: or(
          rule<TestContext>()(() => new Error('Primary failed')),
          rule<TestContext>()(() => new Error('Secondary failed')),
          rule<TestContext>()(() => true) // Fallback succeeds
        ),
      },
    };

    beforeEach(() => {
      executor.use(shield(performanceRules));
    });

    it('should use fastest rule result in race scenarios', async () => {
      const startTime = Date.now();

      const result = await executor.execute({
        context: createTestContext(),
        path: ['fast', 'endpoint'],
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete in ~10ms, not 100-200ms
    });

    it('should try fallback options in OR scenarios', async () => {
      const result = await executor.execute({
        context: createTestContext(),
        path: ['fallback', 'endpoint'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('complex nested permissions', () => {
    const roles = {
      superAdmin: rule<TestContext>()((params) => params.ctx.user?.role === 'super-admin'),
      admin: rule<TestContext>()((params) => params.ctx.user?.role === 'admin'),
      moderator: rule<TestContext>()((params) => params.ctx.user?.role === 'moderator'),
      user: rule<TestContext>()((params) => params.ctx.user?.role === 'user'),
    };

    const permissions = {
      canRead: rule<TestContext>()((params) => params.ctx.permissions?.includes('read') === true),
      canWrite: rule<TestContext>()((params) => params.ctx.permissions?.includes('write') === true),
      canDelete: rule<TestContext>()(
        (params) => params.ctx.permissions?.includes('delete') === true
      ),
    };

    const complexRules: IRules<TestContext> = {
      content: {
        // Reading: users and above with read permission
        read: and(
          or(roles.user, roles.moderator, roles.admin, roles.superAdmin),
          permissions.canRead
        ),
        // Writing: moderators and above with write permission
        write: and(or(roles.moderator, roles.admin, roles.superAdmin), permissions.canWrite),
        // Deleting: admins and above with delete permission
        delete: and(or(roles.admin, roles.superAdmin), permissions.canDelete),
      },
      system: {
        // System operations: only super admin
        config: roles.superAdmin,
        backup: roles.superAdmin,
        restore: roles.superAdmin,
      },
      moderation: {
        // Moderation: moderators and above
        queue: or(roles.moderator, roles.admin, roles.superAdmin),
        ban: or(roles.admin, roles.superAdmin),
        unban: roles.superAdmin,
      },
    };

    beforeEach(() => {
      executor.use(shield(complexRules));
    });

    it('should enforce hierarchical permissions correctly', async () => {
      const moderatorContext = createAuthenticatedContext(
        { id: 'mod1', role: 'moderator', isActive: true },
        ['read', 'write']
      );

      // Moderator can read and write content
      const readResult = await executor.execute({
        context: moderatorContext,
        path: ['content', 'read'],
      });
      expect(readResult.success).toBe(true);

      const writeResult = await executor.execute({
        context: moderatorContext,
        path: ['content', 'write'],
      });
      expect(writeResult.success).toBe(true);

      // But cannot delete without delete permission
      const deleteResult = await executor.execute({
        context: moderatorContext,
        path: ['content', 'delete'],
      });
      expect(deleteResult.success).toBe(false);
    });

    it('should respect role hierarchy', async () => {
      const adminContext = createAuthenticatedContext(
        { id: 'admin1', role: 'admin', isActive: true },
        ['read', 'write', 'delete']
      );

      // Admin can access moderation queue and ban users
      const queueResult = await executor.execute({
        context: adminContext,
        path: ['moderation', 'queue'],
      });
      expect(queueResult.success).toBe(true);

      const banResult = await executor.execute({
        context: adminContext,
        path: ['moderation', 'ban'],
      });
      expect(banResult.success).toBe(true);

      // But cannot unban (only super admin)
      const unbanResult = await executor.execute({
        context: adminContext,
        path: ['moderation', 'unban'],
      });
      expect(unbanResult.success).toBe(false);

      // And cannot access system operations
      const configResult = await executor.execute({
        context: adminContext,
        path: ['system', 'config'],
      });
      expect(configResult.success).toBe(false);
    });

    it('should allow super admin full access', async () => {
      const superAdminContext = createAuthenticatedContext(
        { id: 'super1', role: 'super-admin', isActive: true },
        ['read', 'write', 'delete']
      );

      // Super admin should have access to everything
      const paths = [
        ['content', 'read'],
        ['content', 'write'],
        ['content', 'delete'],
        ['system', 'config'],
        ['system', 'backup'],
        ['moderation', 'queue'],
        ['moderation', 'ban'],
        ['moderation', 'unban'],
      ];

      for (const path of paths) {
        const result = await executor.execute({
          context: superAdminContext,
          path,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('integration: error handling and edge cases', () => {
  let executor: MockMiddlewareExecutor<TestContext>;
  let consoleSpy: any;

  beforeEach(() => {
    executor = new MockMiddlewareExecutor<TestContext>();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it('should handle rules that throw async errors', async () => {
    const asyncErrorRule = rule<TestContext>()(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error('Async rule error');
    });

    const rules: IRules<TestContext> = {
      test: {
        endpoint: asyncErrorRule,
      },
    };

    executor.use(shield(rules));

    const result = await executor.execute({
      context: createTestContext(),
      path: ['test', 'endpoint'],
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Async rule error');
  });

  it('should handle malformed rule trees gracefully', async () => {
    const partialRules = {
      users: {
        list: allow,
        // Missing create rule - should fall back to default
      },
    } as IRules<TestContext>;

    executor.use(shield(partialRules, { fallbackRule: deny }));

    const listResult = await executor.execute({
      context: createTestContext(),
      path: ['users', 'list'],
    });
    expect(listResult.success).toBe(true);

    const createResult = await executor.execute({
      context: createTestContext(),
      path: ['users', 'create'],
    });
    expect(createResult.success).toBe(false); // Should use fallback (deny)
  });

  it('should handle very deep path nesting', async () => {
    const deepRules: IRules<TestContext> = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                endpoint: allow,
              },
            },
          },
        },
      },
    };

    executor.use(shield(deepRules));

    const result = await executor.execute({
      context: createTestContext(),
      path: ['level1', 'level2', 'level3', 'level4', 'level5', 'endpoint'],
    });

    expect(result.success).toBe(true);
  });

  it('should handle concurrent rule evaluations', async () => {
    const concurrentRule = rule<TestContext>()(async (params) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return params.ctx.user?.id === 'concurrent-user';
    });

    const rules: IRules<TestContext> = {
      concurrent: {
        endpoint: concurrentRule,
      },
    };

    executor.use(shield(rules));

    const context1 = createAuthenticatedContext({
      id: 'concurrent-user',
      role: 'user',
      isActive: true,
    });
    const context2 = createAuthenticatedContext({ id: 'other-user', role: 'user', isActive: true });

    // Execute multiple requests concurrently
    const [result1, result2, result3] = await Promise.all([
      executor.execute({ context: context1, path: ['concurrent', 'endpoint'] }),
      executor.execute({ context: context2, path: ['concurrent', 'endpoint'] }),
      executor.execute({ context: context1, path: ['concurrent', 'endpoint'] }),
    ]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    expect(result3.success).toBe(true);
  });

  it('should maintain performance with large rule trees', async () => {
    // Create a large rule tree
    const largeRules: IRules<TestContext> = {};

    for (let i = 0; i < 100; i++) {
      largeRules[`module${i}`] = {
        read: allow,
        write: rule<TestContext>()(() => Math.random() > 0.5),
        delete: deny,
      };
    }

    executor.use(shield(largeRules));

    const startTime = Date.now();

    const results = await Promise.all([
      executor.execute({ context: createTestContext(), path: ['module50', 'read'] }),
      executor.execute({ context: createTestContext(), path: ['module75', 'read'] }),
      executor.execute({ context: createTestContext(), path: ['module99', 'read'] }),
    ]);

    const duration = Date.now() - startTime;

    expect(results.every((r) => r.success)).toBe(true);
    expect(duration).toBeLessThan(100); // Should be fast even with large trees
  });
});
