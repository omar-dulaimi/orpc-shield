import { z } from 'zod';
import { UserSelectObjectSchema } from './objects/UserSelect.schema';
import { UserWhereUniqueInputObjectSchema } from './objects/UserWhereUniqueInput.schema';

export const UserDeleteOneSchema = z.object({
  select: UserSelectObjectSchema.optional(),
  where: UserWhereUniqueInputObjectSchema,
});
