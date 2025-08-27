import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.UserCreateInput> = z
  .object({
    createdAt: z.date().optional(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    email: z.string(),
    googleId: z.string().optional().nullable(),
  })
  .strict();

export const UserCreateInputObjectSchema = Schema;
