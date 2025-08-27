# CLAUDE.md

This file provides guidance to AI assistants when working with code in this
repository.

## Project Overview

This is **orpc-shield**, a TypeScript library that provides a permission layer
for oRPC applications. It's inspired by GraphQL Shield and allows developers to
define authorization rules as middleware for oRPC procedures.

**Version 1.0.0+** supports oRPC v1.x, providing a path-based permissions system
that matches oRPC's single procedure model.

## Build and Development Commands

- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm run prebuild` - Clean the dist folder before building
- `npm run release` - Build and publish the package (runs `./package.sh` then
  publishes from `package/` dir)
- `npm run prettier` - Format code using Prettier

## Testing

- `npm test` - Run all tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with Vitest UI

The project has comprehensive test coverage (>99%) including:

- Unit tests for all rule types and logic operations
- Integration tests with oRPC procedures
- Edge case and error handling tests
- TypeScript type validation tests

## Code Quality

- `npm run lint` - Run ESLint for code linting
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - Run TypeScript type checking

The project uses:

- **ESLint 9** with TypeScript support
- **Prettier** for code formatting
- **lint-staged** for pre-commit hooks
- Relaxed type safety for library flexibility while maintaining code quality

## Architecture

### Core Components

- **`src/shield.ts`** - Main shield function that creates oRPC middleware from
  rule trees
- **`src/rule.ts`** - Rule constructor and built-in rules (`rule`, `allow`,
  `deny`)
- **`src/operators.ts`** - Logic operators (`and`, `or`, `not`, `chain`, `race`)
- **`src/types.ts`** - TypeScript type definitions for all shield components
- **`src/index.ts`** - Main exports

### Key Concepts

1. **Rules**: Basic permission units created with `rule()` function that return
   boolean/Error/string
2. **Logic Rules**: Composite rules (`and`, `or`, `not`, `chain`, `race`) that
   combine other rules
3. **Shield**: Main function that generates oRPC middleware from a rule tree
4. **Rule Tree**: Nested object structure defining permissions for procedure
   paths

### oRPC v1 Compatibility Notes

oRPC uses path-based procedure routing, so rules receive a `path` array instead
of separate `query`/`mutation` buckets:

```typescript
const isOwner = rule<Context>()(async ({ ctx, path, input }) => {
  // path is ['users', 'update'] for example
  return ctx.user?.id === input?.userId;
});
```

Rules integrate with oRPC's middleware system and context extension via
`next({ context: ... })`.

### Rule Resolution

Rules are resolved in the middleware by:

1. Extracting procedure path from the oRPC request (e.g., `['users', 'list']`)
2. Finding the matching rule in the tree (supports nested routers)
3. Falling back to `fallbackRule` (default: `allow`) if no rule found
4. Executing the rule and handling results (true = allow, false/Error = deny)

### Example Structure

The library supports both flat and namespaced router structures:

```typescript
// Flat structure
shield({
  users: { list: isAuthenticated },
  posts: { create: and(isAuthenticated, isAdmin) },
});

// Namespaced structure
shield({
  users: {
    list: isAuthenticated,
    create: isAdmin,
    update: and(isAuthenticated, isOwner),
  },
  posts: {
    list: allow,
    create: isAuthenticated,
  },
});
```

## Development Notes

- The project uses TypeScript with strict mode enabled
- Built files are excluded from Git (in `dist/`)
- Package publication uses a custom script that operates from a `package/`
  subdirectory
- ES modules with `.js` import extensions for Node.js compatibility
- Modern toolchain with Vitest, ESLint 9, and Prettier
- Pre-commit hooks ensure code quality

## Important Instructions

Do what has been asked; nothing more, nothing less. NEVER create files unless
they're absolutely necessary for achieving your goal. ALWAYS prefer editing an
existing file to creating a new one. NEVER proactively create documentation
files (\*.md) or README files. Only create documentation files if explicitly
requested by the User.
