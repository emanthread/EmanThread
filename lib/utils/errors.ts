import { Prisma } from '@prisma/client';

/**
 * Sanitize a database or runtime error for safe client-facing responses.
 * Never leaks internal schema details, column names, or stack traces.
 * Logs the full error server-side for debugging.
 */
export function sanitizeDbError(error: unknown): { message: string; status: number } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return { message: 'This value already exists', status: 409 };
      case 'P2025':
        return { message: 'Record not found', status: 404 };
      case 'P2003':
        return { message: 'Referenced record not found', status: 400 };
      case 'P2016':
        return { message: 'Record not found', status: 404 };
      default:
        console.error('[DB Error]', error.code, error.message);
        return { message: 'Database operation failed', status: 500 };
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[DB Validation Error]', error.message);
    return { message: 'Invalid data provided', status: 400 };
  }
  if (error instanceof Error) {
    // Check for known operational errors
    if (error.message === 'Discount usage limit reached') {
      return { message: error.message, status: 400 };
    }
    if (error.message.includes('not found')) {
      return { message: error.message, status: 404 };
    }
    console.error('[Unexpected Error]', error.message, error.stack);
  }
  return { message: 'An internal error occurred', status: 500 };
}
