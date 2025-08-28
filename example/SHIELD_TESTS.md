# oRPC Shield – cURL Test Guide

This example exposes OpenAPI endpoints at `http://localhost:3001` (root) and
applies `orpc-shield` as a global middleware. Context is derived from request
headers:

- `X-User-Id`: user identifier
- `X-User-Role`: one of `admin`, `editor`, `user`, `guest`

Start the server first from the `example/` folder:

```bash
pnpm dev
# or
pnpm build && pnpm start
```

## 1) Public: List Users (allowed)

```bash
curl -i \
  -X GET \
  http://localhost:3001/users
```

Expected: 200 OK with a JSON array of users.

## 2) Protected: Get Profile (unauthenticated → denied)

```bash
curl -i \
  -X GET \
  http://localhost:3001/users/profile
```

Expected: Access denied (Shield blocks unauthenticated requests). Status code
depends on error mapping; a 4xx is expected.

## 3) Protected: Get Profile (authenticated → allowed)

```bash
curl -i \
  -X GET \
  -H 'X-User-Id: 1' \
  -H 'X-User-Role: user' \
  http://localhost:3001/users/profile
```

Expected: 200 OK with `{ "id": "1" }`.

## 4) Admin-only: Delete Profile (user → denied)

```bash
curl -i \
  -X DELETE \
  -H 'X-User-Id: 1' \
  -H 'X-User-Role: user' \
  http://localhost:3001/users/profile
```

Expected: Access denied (non-admin).

## 5) Admin-only: Delete Profile (admin → allowed)

```bash
curl -i \
  -X DELETE \
  -H 'X-User-Id: 42' \
  -H 'X-User-Role: admin' \
  http://localhost:3001/users/profile
```

Expected: 200 OK with `{ "ok": true }`.
