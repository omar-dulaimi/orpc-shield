# oRPC Shield

<div align="center">

Type‑safe authorization for modern oRPC apps — lightweight, composable, fast.

<p>
  <a href="https://www.npmjs.com/package/orpc-shield"><img src="https://img.shields.io/npm/v/orpc-shield?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/orpc-shield"><img src="https://img.shields.io/npm/dm/orpc-shield?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square&logo=typescript" alt="TypeScript" /></a>
</p>

</div>

## Why

- 🛡️ Declarative rules and composable operators
- 🎯 Strong typing for context and inputs
- 🧩 Global middleware or per‑route
- 📡 OpenAPI‑friendly denials (map to HTTP 403)
- ⚡ Zero runtime dependencies

## Install

```bash
pnpm add orpc-shield
# or: npm i | yarn add | bun add orpc-shield
```

## Quick Start

```ts
import { os } from '@orpc/server';
import { rule, allow, shield } from 'orpc-shield';

type Ctx = { user?: { id: string; role: 'admin' | 'user' } };

const isAuthed = rule<Ctx>()(({ ctx }) => !!ctx.user);
const isAdmin = rule<Ctx>()(({ ctx }) => ctx.user?.role === 'admin');

// Map denials to ORPCError('FORBIDDEN') → HTTP 403 in adapters
const permissions = shield<Ctx>(
  { users: { list: allow, profile: { get: isAuthed, delete: isAdmin } } },
  { denyErrorCode: 'FORBIDDEN' }
);

const api = os.$context<Ctx>().use(permissions);
export const router = api.router({
  users: api.router({
    list: api
      .route({ method: 'GET', path: '/users' })
      .handler(async () => [{ id: '1' }]),
    profile: api.router({
      get: api
        .route({ method: 'GET', path: '/users/profile' })
        .handler(async ({ context }) => ({
          id: context.user?.id ?? 'anonymous',
        })),
      delete: api
        .route({ method: 'DELETE', path: '/users/profile' })
        .handler(async ({ context }) => ({
          ok: context.user?.role === 'admin',
        })),
    }),
  }),
});
```

<details>
<summary><b>Rules & Operators</b></summary>

```ts
import { rule, allow, deny, and, or, not, chain, race } from 'orpc-shield';
const canEdit = rule<Ctx>()(
  ({ ctx, input }) => ctx.user?.id === input.authorId
);
const canAdmin = rule<Ctx>()(({ ctx }) => ctx.user?.role === 'admin');
const canModify = and(canEdit, or(canAdmin, allow));
```

</details>

<details>
<summary><b>Adapter‑Friendly Denials</b></summary>

- `shield(..., { denyErrorCode: 'FORBIDDEN' })` maps denials to
  `ORPCError('FORBIDDEN')` (HTTP 403).
- Prefer global usage: `os.$context().use(permissions)`.

</details>

<details>
<summary><b>API Surface</b></summary>

- `rule<TContext, TInput>()(fn)` – define a rule
- Built‑ins: `allow`, `deny`, `denyWithMessage(msg)`
- Operators: `and`, `or`, `not`, `chain`, `race`
- `shield(rules, { denyErrorCode?, debug?, allowExternalErrors? })`
- `shieldDebug(...)` – shield with debug enabled

</details>

<details>
<summary><b>Testing & Example</b></summary>

- Tests: `pnpm test` (Sandbox/CI: `VITEST_POOL=threads pnpm test`).
- Example app (Express + oRPC + OpenAPI): see `example/` and
  `example/SHIELD_TESTS.md`.

</details>

<details>
<summary><b>Full Documentation</b></summary>

## 📖 Documentation

### Rule Types

#### Built-in Rules

```typescript
import { allow, deny, denyWithMessage } from 'orpc-shield';

// Always allow access
allow;

// Always deny access
deny;

// Deny with custom message
denyWithMessage('Custom error message');
```

#### Custom Rules

```typescript
// Simple custom rule
const isOwner = rule<Context>()(async ({ ctx, path, input }) => {
  return ctx.user?.id === input?.userId;
});

// Named rule (useful for debugging)
const isOwner = rule<Context>('isOwner')(async ({ ctx, input }) => {
  return ctx.user?.id === input?.userId;
});

// Rule with typed input
interface UpdateInput {
  userId: string;
  data: any;
}

const canUpdate = rule<Context, UpdateInput>()(async ({ ctx, input }) => {
  return ctx.user?.id === input.userId;
});
```

#### Rule Return Types

Rules can return different values:

```typescript
// Boolean - simple allow/deny
return true; // Allow
return false; // Deny with default error

// Error object - custom error
return new Error('Custom error message');

// String - converted to error
return 'Access denied';

// Context extension - modify context for downstream procedures
return {
  ctx: {
    ...ctx,
    permissions: ['read', 'write'],
  },
};
```

### Logical Operators

#### `and` - All rules must pass

```typescript
const permissions = shield({
  posts: {
    delete: and(isAuthenticated, isOwner, isNotArchived),
  },
});
```

#### `or` - At least one rule must pass

```typescript
const permissions = shield({
  posts: {
    update: or(isAdmin, isOwner),
  },
});
```

#### `not` - Inverts rule result

```typescript
const permissions = shield({
  auth: {
    register: not(isAuthenticated), // Only unauthenticated users
  },
});
```

#### `chain` - Sequential execution with short-circuiting

```typescript
const permissions = shield({
  posts: {
    publish: chain(isAuthenticated, hasPublishPermission, isNotRateLimited),
  },
});
```

#### `race` - Returns first completed result

```typescript
const permissions = shield({
  posts: {
    read: race(isCached, isPublic), // Use cache if available, otherwise check if public
  },
});
```

### Configuration Options

```typescript
const permissions = shield(ruleTree, {
  // Fallback rule when no rule matches (default: allow)
  fallbackRule: deny,

  // Custom error for authorization failures
  fallbackError: 'Access denied',

  // Enable debug logging (default: false)
  debug: true,

  // Allow external errors to propagate (default: false)
  allowExternalErrors: false,
});

// Or use the debug convenience function
import { shieldDebug } from 'orpc-shield';
const permissions = shieldDebug(ruleTree); // Enables debug mode
```

### Path-based Authorization

oRPC Shield works with oRPC's path-based procedure system:

```typescript
// For procedure: router.api.v1.users.profile.update
// Path will be: ['api', 'v1', 'users', 'profile', 'update']

const pathBasedRule = rule<Context>()(async ({ path, ctx }) => {
  // Check if path includes admin routes
  if (path.includes('admin')) {
    return ctx.user?.role === 'admin';
  }

  // Check API version
  if (path[0] === 'api' && path[1] === 'v2') {
    return ctx.user?.hasV2Access;
  }

  return true;
});
```

### Nested Router Support

Shield supports arbitrarily nested router structures:

```typescript
const permissions = shield({
  api: {
    v1: {
      users: {
        list: allow,
        create: isAdmin,
        profile: {
          get: isAuthenticated,
          update: isOwner,
          settings: {
            read: isOwner,
            write: and(isOwner, hasSettingsPermission),
          },
        },
      },
      posts: {
        list: allow,
        create: isAuthenticated,
        categories: {
          list: allow,
          manage: isAdmin,
        },
      },
    },
    v2: {
      // Different rules for v2 API
      users: {
        list: isAuthenticated, // v2 requires auth for listing
      },
    },
  },
  public: {
    health: allow,
    status: allow,
  },
});
```

## 🔧 Advanced Usage

### Error Handling

```typescript
// Custom error with details
const detailedErrorRule = rule<Context>()(async ({ ctx }) => {
  if (!ctx.user) {
    return new Error('Authentication required. Please log in.');
  }
  if (!ctx.user.emailVerified) {
    return new Error('Email verification required.');
  }
  if (ctx.user.suspended) {
    return new Error('Account suspended. Contact support.');
  }
  return true;
});

// Safe async operations
const safeAsyncRule = rule<Context>()(async ({ ctx }) => {
  try {
    const permissions = await getUserPermissions(ctx.user.id);
    return permissions.includes('write');
  } catch (error) {
    console.error('Permission check failed:', error);
    return new Error('Permission check failed');
  }
});
```

### Dynamic Rules

```typescript
// Factory function for reusable rules
const hasRole = (role: string) =>
  rule<Context>(`hasRole:${role}`)(async ({ ctx }) => ctx.user?.role === role);

const hasPermission = (permission: string) =>
  rule<Context>(`hasPermission:${permission}`)(async ({ ctx }) =>
    ctx.user?.permissions?.includes(permission)
  );

// Usage
const permissions = shield({
  admin: {
    users: hasRole('admin'),
    reports: hasPermission('view_reports'),
  },
});
```

### Context Extension

```typescript
const enrichContext = rule<Context>()(async ({ ctx }) => {
  if (ctx.user?.role === 'admin') {
    return {
      ctx: {
        ...ctx,
        permissions: ['read', 'write', 'delete'],
        adminFeatures: true,
      },
    };
  }
  return true;
});

// The enriched context will be available in your procedure
const router = os.router({
  adminAction: os.procedure
    .use(shield({ adminAction: enrichContext }))
    .mutation(async ({ ctx }) => {
      // ctx now has permissions and adminFeatures
      console.log(ctx.permissions); // ['read', 'write', 'delete']
      console.log(ctx.adminFeatures); // true
    }),
});
```

## 🐛 Debugging

Enable debug mode to see detailed rule execution:

```typescript
import { shieldDebug } from 'orpc-shield';

// Option 1: Use convenience function
const permissions = shieldDebug(ruleTree);

// Option 2: Enable debug in options
const permissions = shield(ruleTree, { debug: true });
```

Debug output includes:

- 🔍 Rule execution path
- ⏱️ Execution time
- ✅/❌ Rule results
- 📝 Error details
- 🛤️ Path information

Example debug output:

```
[oRPC Shield] Processing path: users.profile.update
[oRPC Shield] Rule result for users.profile.update: true (12ms)
[oRPC Shield] ✅ Access granted
```

## 🎯 TypeScript Support

oRPC Shield provides full type safety:

```typescript
interface MyContext {
  user?: {
    id: string;
    role: 'admin' | 'user';
    permissions: string[];
  };
  session: {
    id: string;
    expiresAt: Date;
  };
}

interface PostInput {
  id: string;
  title: string;
  authorId: string;
}

// Fully typed rule with context and input inference
const canEditPost = rule<MyContext, PostInput>()(async ({ ctx, input }) => {
  // ctx and input are fully typed here
  return ctx.user?.id === input.authorId || ctx.user?.role === 'admin';
});

// Type-safe shield configuration
const permissions = shield<MyContext>({
  posts: {
    edit: canEditPost, // TypeScript ensures rule compatibility
  },
});
```

## 📈 Performance

oRPC Shield is built for performance:

- ⚡ **Lazy Evaluation** - Rules execute only when needed
- 🔄 **Short-circuiting** - `and`/`or` operators stop at first decisive result
- 🗺️ **Efficient Path Lookup** - O(1) rule resolution for most cases
- 📦 **Minimal Overhead** - Lightweight middleware with fast execution
- 🌳 **Tree Shaking** - Only import what you use

### Benchmarks

```
✓ Simple rule evaluation: ~0.01ms
✓ Complex nested rules: ~0.05ms
✓ Rule tree lookup: ~0.001ms
✓ Context extension: ~0.02ms
```

## 🛡️ Best Practices

### 1. Keep Rules Focused

```typescript
// ✅ Good - Single responsibility
const isAuthenticated = rule<Context>()(async ({ ctx }) => {
  return !!ctx.user;
});

const isAdmin = rule<Context>()(async ({ ctx }) => {
  return ctx.user?.role === 'admin';
});

// ❌ Avoid - Too much logic in one rule
const complexRule = rule<Context>()(async ({ ctx, input }) => {
  // Validating input, checking permissions, logging, etc.
  // This should be broken down into smaller rules
});
```

### 2. Use Descriptive Names

```typescript
// ✅ Good - Clear intent
const canDeleteOwnPost = rule<Context>('canDeleteOwnPost')(async ({
  ctx,
  input,
}) => {
  return ctx.user?.id === input.authorId;
});

// ✅ Good - Compose for readability
const permissions = shield({
  posts: {
    delete: or(isAdmin, canDeleteOwnPost),
  },
});
```

### 3. Handle Edge Cases

```typescript
// ✅ Good - Graceful error handling
const safePermissionCheck = rule<Context>()(async ({ ctx }) => {
  try {
    if (!ctx.user) return false;

    const permissions = await getPermissions(ctx.user.id);
    return permissions?.includes('admin') ?? false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false; // Fail closed for security
  }
});
```

### 4. Use Composition

```typescript
// ✅ Good - Reusable and testable
const isPostOwner = rule<Context>()(async ({ ctx, input }) => {
  return ctx.user?.id === input.authorId;
});

const canModifyPost = or(isAdmin, isPostOwner);

const permissions = shield({
  posts: {
    update: and(isAuthenticated, canModifyPost),
    delete: and(isAuthenticated, canModifyPost),
  },
});
```

</details>

## 🔗 Related Projects

- [oRPC](https://orpc.unnoq.com/) - The RPC framework this library is built for
- [tRPC Shield](https://github.com/omar-dulaimi/trpc-shield) - Authorization for
  tRPC (inspiration)
- [GraphQL Shield](https://the-guild.dev/graphql/shield) - Original GraphQL
  authorization library

## 🤝 Contributing

We welcome contributions! Please open issues or pull requests. Follow
Conventional Commits and ensure a clean run of lint, typecheck, and tests.

### Development Setup

```bash
git clone https://github.com/omar-dulaimi/orpc-shield
cd orpc-shield
pnpm i
pnpm typecheck && pnpm lint && pnpm test
```

<div align="center">

**[⭐ Star on GitHub](https://github.com/omar-dulaimi/orpc-shield)** •
**[📚 Documentation](https://github.com/omar-dulaimi/orpc-shield#readme)** •
**[🐛 Report Issues](https://github.com/omar-dulaimi/orpc-shield/issues)**

Made with ❤️ by [Omar Dulaimi](https://github.com/omar-dulaimi)

</div>

## Legal

- License: MIT — see the `LICENSE` file.
- Copyright © 2025 Omar Dulaimi.
