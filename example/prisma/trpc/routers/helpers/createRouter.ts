import * as trpc from '@trpc/server';
import { permissions } from '../../shield/shield';

import { Context } from '../../../../src/context';

export const t = trpc.initTRPC.context<Context>().create();

export const globalMiddleware = t.middleware(async ({ ctx, next }) => {
  console.log('inside middleware!');
  return next();
});

export const permissionsMiddleware = t.middleware(permissions);

export const publicProcedure = t.procedure;

export const shieldedProcedure = t.procedure

  .use(globalMiddleware)

  .use(permissionsMiddleware);
