import axios from 'axios';

// NestJS's default exception filter returns { message, error, statusCode }
// -- message is a string for most errors (BadRequestException, NotFoundException,
// etc.) but can be a string[] for class-validator payload errors. This pulls
// out the actual message instead of just the numeric status code, so users
// see e.g. "Recipe X needs 8 of Screws and Hinges..." instead of "400".
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as { message?: string | string[] } | undefined;
    const message = data?.message;

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
    return `Request failed: ${err.response.status}`;
  }
  return fallback;
}
