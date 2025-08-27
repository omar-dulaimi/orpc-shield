import { z } from 'zod';
import { UserSelectObjectSchema } from './UserSelect.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.UserArgs> = z
  .object({
    select: z.lazy(() => UserSelectObjectSchema).optional(),
  })
  .strict();

export const UserArgsObjectSchema = Schema;
