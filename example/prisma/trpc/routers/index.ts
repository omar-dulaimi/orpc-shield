import { t } from './helpers/createRouter';
import { usersRouter } from './User.router';

export const appRouter = t.router({
  user: usersRouter,
});
