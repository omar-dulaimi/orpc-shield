import { z } from 'zod';
import { UserSelectObjectSchema } from './objects/UserSelect.schema';
import { UserCreateInputObjectSchema } from './objects/UserCreateInput.schema';
import { UserUncheckedCreateInputObjectSchema } from './objects/UserUncheckedCreateInput.schema';

export const UserCreateOneSchema = z.object({
  select: UserSelectObjectSchema.optional(),
  data: z.union([UserCreateInputObjectSchema, UserUncheckedCreateInputObjectSchema]),
});
