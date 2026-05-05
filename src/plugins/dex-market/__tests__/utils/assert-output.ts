import { z } from 'zod';

export function assertOutput<T>(
  data: unknown,
  schema: z.ZodType<T>,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Output validation failed: ${result.error.errors.map((e) => e.message).join(', ')}`,
    );
  }
  return result.data;
}
