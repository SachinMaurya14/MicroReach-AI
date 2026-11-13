import type { NextFunction, Request, Response } from 'express';

export class AppHttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) return;

  if (err instanceof AppHttpError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  const safeMessage =
    err instanceof Error && err.message
      ? err.message
      : 'An unexpected server error occurred.';

  // Never log cookies, headers, or tokens
  console.error('[server-error]', safeMessage);

  res.status(500).json({
    error: 'internal_server_error',
    message: 'Unable to process request right now.',
  });
}
