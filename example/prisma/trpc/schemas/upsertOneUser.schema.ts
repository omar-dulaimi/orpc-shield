import { z } from 'zod';
import { UserSelectObjectSchema } from './objects/UserSelect.schema';
import { UserWhereUniqueInputObjectSchema } from './objects/UserWhereUniqueInput.schema';
import { UserCreateInputObjectSchema } from './objects/UserCreateInput.schema';
import { UserUncheckedCreateInputObjectSchema } from './objects/UserUncheckedCreateInput.schema';
import { UserUpdateInputObjectSchema } from './objects/UserUpdateInput.schema';
import { UserUncheckedUpdateInputObjectSchema } from './objects/UserUncheckedUpdateInput.schema';

export const UserUpsertSchema = z.object({
  select: UserSelectObjectSchema.optional(),
  where: UserWhereUniqueInputObjectSchema,
  create: z.union([UserCreateInputObjectSchema, UserUncheckedCreateInputObjectSchema]),
  update: z.union([UserUpdateInputObjectSchema, UserUncheckedUpdateInputObjectSchema]),
});
