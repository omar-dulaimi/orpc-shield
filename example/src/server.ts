import express from 'express';
import { os } from '@orpc/server';
import { allow, rule, shield } from 'orpc-shield';
import { OpenAPIHandler } from '@orpc/openapi/node';
import { Context, createContextFromRequest } from './context.js';

// Define rules
const isAuthenticated = rule<Context>()(({ ctx }) => !!ctx.user);
const isAdmin = rule<Context>()(({ ctx }) => ctx.user?.role === 'admin');

// Permissions with HTTP-friendly denial
const permissions = shield<Context>(
  {
    users: {
      list: allow,
      profile: {
        get: isAuthenticated,
        delete: isAdmin,
      },
    },
  },
  { denyErrorCode: 'FORBIDDEN' }
);

// Apply the middleware globally and build the router
const api = os.$context<Context>().use(permissions);
const appRouter = api.router({
  users: api.router({
    list: api
      .route({ method: 'GET', path: '/users' })
      .handler(async () => [{ id: '1' }, { id: '2' }]),
    profile: api.router({
      get: api
        .route({ method: 'GET', path: '/users/profile' })
        .handler(async ({ context }) => ({ id: context.user?.id ?? 'anonymous' })),
      delete: api
        .route({ method: 'DELETE', path: '/users/profile' })
        .handler(async ({ context }) => ({ ok: context.user?.role === 'admin' })),
    }),
  }),
});

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// OpenAPI at root
const openapi = new OpenAPIHandler(appRouter);
app.use(async (req, res) => {
  const result = await openapi.handle(req, res, { context: createContextFromRequest(req) });
  if (!result.matched) res.status(404).end('No procedure matched');
});

app.listen(PORT, () => {
  console.log(`server listening at http://localhost:${PORT}`);
  console.log(`OpenAPI endpoints at http://localhost:${PORT}/users ...`);
});
