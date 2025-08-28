# Express Server with oRPC + oRPC Shield

This example runs an Express server with **oRPC** and **oRPC Shield** and
exposes OpenAPI endpoints at the root.

## Getting started

### 1. Install dependencies

```
pnpm install
```

### 2. Start the server

Launch your server with this command:

```
pnpm dev
```

Your server is ready at [http://localhost:3001](http://localhost:3001).

See `SHIELD_TESTS.md` for cURL examples:

- `GET /users` (public)
- `GET /users/profile` (requires `X-User-Id`, `X-User-Role`)
- `DELETE /users/profile` (requires `X-User-Role: admin`)
