import { shield, allow } from 'trpc-shield';
import { Context } from '../../../src/context';

export const permissions = shield<Context>({
  query: {
    aggregateUser: allow,
    findFirstUser: allow,
    findManyUser: allow,
    findUniqueUser: allow,
    groupByUser: allow,
  },
  mutation: {
    createOneUser: allow,
    deleteManyUser: allow,
    deleteOneUser: allow,
    updateManyUser: allow,
    updateOneUser: allow,
    upsertOneUser: allow,
  },
});
