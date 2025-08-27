# oRPC Shield

A powerful authorization layer for [oRPC](https://orpc.unnoq.com/) applications,
inspired by [tRPC Shield](https://github.com/omar-dulaimi/trpc-shield). Define
authorization rules as middleware for your oRPC procedures.

[![npm version](https://badge.fury.io/js/orpc-shield.svg)](https://badge.fury.io/js/orpc-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Features

- 🛡️ **Declarative Authorization** - Define rules as composable functions
- 🔧 **Path-based Routing** - Works with oRPC's procedure path system
- 🔗 **Rule Composition** - Combine rules with logical operators (`and`, `or`,
  `not`, etc.)
- 🎯 **Type Safe** - Full TypeScript support with generic context types
- 🚀 **High Performance** - Efficient rule evaluation with short-circuiting
- 🔍 **Debug Mode** - Optional logging for development and troubleshooting
- 🌳 **Nested Routers** - Support for complex router structures
- ⚡ **ES Modules** - Modern ESM output with tree-shaking support

## Installation

```bash
npm install orpc-shield
# or
yarn add orpc-shield
# or
pnpm add orpc-shield
```

## Quick Start

```typescript
import { os } from '@orpc/server';
import { rule, shield, and, or, allow, deny } from 'orpc-shield';

// Define your context type
interface Context {
  user?: {
    id: string;
    role: 'admin' | 'editor' | 'user';
  };
}

// Create authorization rules
const isAuthenticated = rule<Context>()(async ({ ctx }) => {
  return !!ctx.user;
});

const isAdmin = rule<Context>()(async ({ ctx }) => {
  return ctx.user?.role === 'admin';
});

const isOwner = rule<Context>()(async ({ ctx, input }) => {
  return ctx.user?.id === (input as any)?.userId;
});

// Define your permission tree
const permissions = shield<Context>({
  users: {
    list: allow,
    create: isAdmin,
    update: and(isAuthenticated, or(isAdmin, isOwner)),
    delete: isAdmin,
  },
  posts: {
    list: allow,
    create: isAuthenticated,
    update: and(isAuthenticated, isOwner),
    delete: or(isAdmin, isOwner),
  },
});

// Apply to your oRPC router
const router = os.router({
  users: os.router({
    list: os.procedure.use(permissions).query(async () => {
      /* ... */
    }),
    create: os.procedure.use(permissions).mutation(async () => {
      /* ... */
    }),
    // ... other procedures
  }),
  posts: os.router({
    // ... post procedures
  }),
});
```

## Rule Types

### Basic Rules

```typescript
// Always allow access
allow;

// Always deny access
deny;

// Custom rule
const isOwner = rule<Context>()(async ({ ctx, path, input }) => {
  return ctx.user?.id === input?.userId;
});

// Rule with name (useful for debugging)
const isOwner = rule<Context>('isOwner')(async ({ ctx, input }) => {
  return ctx.user?.id === input?.userId;
});
```

### Rule Results

Rules can return different types of results:

```typescript
// Boolean - simple allow/deny
const simpleRule = rule<Context>()(async ({ ctx }) => {
  return !!ctx.user;
});

// Error object - custom error message
const errorRule = rule<Context>()(async ({ ctx }) => {
  if (!ctx.user) {
    return new Error('Authentication required');
  }
  return true;
});

// Context extension - extend the context for downstream procedures
const contextRule = rule<Context>()(async ({ ctx }) => {
  if (ctx.user?.role === 'admin') {
    return {
      ctx: {
        permissions: ['read', 'write', 'delete'],
      },
    };
  }
  return true;
});
```

## Logical Operators

### and

All rules must pass:

```typescript
const permissions = shield({
  posts: {
    delete: and(isAuthenticated, isOwner, isNotArchived),
  },
});
```

### or

At least one rule must pass:

```typescript
const permissions = shield({
  posts: {
    update: or(isAdmin, isOwner),
  },
});
```

### not

Inverts rule result:

```typescript
const permissions = shield({
  auth: {
    register: not(isAuthenticated), // Only unauthenticated users can register
  },
});
```

### chain

Sequential execution with short-circuiting:

```typescript
const permissions = shield({
  posts: {
    publish: chain(isAuthenticated, hasPublishPermission, isNotRateLimited),
  },
});
```

### race

Returns first completed result:

```typescript
const permissions = shield({
  posts: {
    read: race(isCached, isPublic), // Use cache if available, otherwise check if public
  },
});
```

## Options

```typescript
const permissions = shield(ruleTree, {
  // Fallback rule when no rule is found (default: allow)
  fallbackRule: deny,

  // Custom error for authorization failures
  fallbackError: 'Access denied',

  // Enable debug logging
  debug: true,

  // Allow external errors to propagate
  allowExternalErrors: false,
});
```

## Path-based Authorization

oRPC Shield works with oRPC's path-based procedure system. The path array
represents the nested route to your procedure:

```typescript
// For a procedure at router.users.profile.update
// The path will be: ['users', 'profile', 'update']

const pathBasedRule = rule<Context>()(async ({ path }) => {
  if (path.includes('admin')) {
    return ctx.user?.role === 'admin';
  }
  return true;
});
```

## Nested Routers

Shield supports complex nested router structures:

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
        },
      },
      posts: {
        list: allow,
        create: isAuthenticated,
      },
    },
  },
});
```

## Error Handling

### Custom Errors

```typescript
const customErrorRule = rule<Context>()(async ({ ctx }) => {
  if (!ctx.user) {
    return new Error('Please log in to continue');
  }
  if (ctx.user.role !== 'admin') {
    return new Error('Admin access required');
  }
  return true;
});
```

### Error Types

Rules can return:

- `true` - Allow access
- `false` - Deny with default error
- `Error` - Deny with custom error message
- `string` - Deny with string as error message
- `{ ctx: object }` - Allow and extend context

## Debugging

Enable debug mode to see rule execution:

```typescript
const permissions = shield(ruleTree, { debug: true });
// or use the convenience function
const permissions = shieldDebug(ruleTree);
```

Debug output includes:

- Rule execution time
- Rule results
- Path information
- Error details

## TypeScript Support

oRPC Shield is fully typed:

```typescript
interface MyContext {
  user?: {
    id: string;
    role: string;
  };
}

interface MyInput {
  userId: string;
}

const typedRule = rule<MyContext, MyInput>()(async ({ ctx, input }) => {
  return ctx.user?.id === input.userId; // Full type safety
});
```

## Best Practices

### 1. Keep Rules Simple

```typescript
// Good
const isAdmin = rule<Context>()(async ({ ctx }) => {
  return ctx.user?.role === 'admin';
});

// Avoid complex logic in rules
const complexRule = rule<Context>()(async ({ ctx, input }) => {
  // Too much business logic here...
});
```

### 2. Use Descriptive Names

```typescript
// Good
const canDeletePost = rule<Context>('canDeletePost')(async ({ ctx, input }) => {
  return ctx.user?.id === input.authorId || ctx.user?.role === 'admin';
});
```

### 3. Compose Rules

```typescript
// Good - composable and readable
const permissions = shield({
  posts: {
    delete: or(isAdmin, and(isAuthenticated, isOwner)),
  },
});
```

### 4. Handle Errors Gracefully

```typescript
const safeRule = rule<Context>()(async ({ ctx }) => {
  try {
    // Some async operation
    const result = await checkPermission(ctx.user);
    return result;
  } catch (error) {
    // Log error and deny access
    console.error('Permission check failed:', error);
    return false;
  }
});
```

## Performance

oRPC Shield is optimized for performance:

- **Lazy evaluation** - Rules are only executed when needed
- **Short-circuiting** - `and`/`or` operators stop at first decisive result
- **Efficient path lookup** - O(1) rule resolution for most cases
- **Minimal overhead** - Lightweight middleware with fast rule execution

## Contributing

We welcome contributions! Please read our [contributing guide](CONTRIBUTING.md)
for details.

## License

MIT © [Omar Dulaimi](https://github.com/omar-dulaimi)
