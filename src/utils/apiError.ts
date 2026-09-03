import axios from 'axios';

// NestJS's default exception filter returns { message, error, statusCode }
// -- message is a string for most errors (BadRequestException, NotFoundException,
// etc.) but can be a string[] for class-validator payload errors. This pulls
// out the actual message instead of just the numeric status code, so users
// see e.g. "Recipe X needs 8 of Screws and Hinges..." instead of "400".
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as { message?: string | string[]; requestId?: string } | undefined;
    const message = data?.message;
    // Backend's global exception filter tags every 5xx response with a
    // short requestId that's also in its server-side log line, so a report
    // of "got a 500" can be grep'd straight to the full stack trace instead
    // of guessing which log lines match:
    // pm2 logs canprosys-backend --err --lines 500 --nostream | grep <id>
    // Only shown on 5xx -- 4xx messages are already specific enough on
    // their own and don't need it.
    const idSuffix = err.response.status >= 500 && data?.requestId ? ` (id: ${data.requestId})` : '';

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ') + idSuffix;
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message + idSuffix;
    }
    return `Request failed: ${err.response.status}${idSuffix}`;
  }
  return fallback;
}
