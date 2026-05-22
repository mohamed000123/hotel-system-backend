import { Logger } from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedUserLike {
  id?: string;
  sub?: string;
  email?: string;
}

interface AuthenticatedRequestLike extends Request {
  user?: AuthenticatedUserLike;
  _requestStartedAt?: number;
}

export interface ApiRequestContext {
  method: string;
  path: string;
  userRef?: string;
  requestId?: string;
}

export function buildApiRequestContext(request: Request): ApiRequestContext {
  const authRequest = request as AuthenticatedRequestLike;
  const userRef = authRequest.user?.id ?? authRequest.user?.sub ?? authRequest.user?.email;
  const requestIdHeader = request.headers['x-request-id'];
  const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;

  return {
    method: request.method,
    path: request.originalUrl ?? request.url,
    userRef,
    requestId,
  };
}

export function logApiRequestSuccess(
  logger: Logger,
  context: ApiRequestContext,
  durationMs: number,
): void {
  logger.log(formatPrefix(context, `completed in ${durationMs}ms`));
}

export function logApiRequestError(
  logger: Logger,
  context: ApiRequestContext,
  error: unknown,
  durationMs: number,
): void {
  const details = resolveErrorDetails(error);
  logger.error(
    formatPrefix(context, `failed in ${durationMs}ms: ${details.message}`),
    details.stack,
  );
}

export function markApiRequestStart(request: Request): void {
  const authRequest = request as AuthenticatedRequestLike;
  authRequest._requestStartedAt = Date.now();
}

export function getApiRequestDurationMs(request: Request): number {
  const authRequest = request as AuthenticatedRequestLike;
  const startedAt = authRequest._requestStartedAt;
  if (!startedAt) {
    return 0;
  }

  return Date.now() - startedAt;
}

function formatPrefix(context: ApiRequestContext, suffix: string): string {
  const requestIdSegment = context.requestId ? ` [requestId=${context.requestId}]` : '';
  const userSegment = context.userRef ? ` [user=${context.userRef}]` : '';
  return `${context.method} ${context.path}${requestIdSegment}${userSegment} ${suffix}`;
}

function resolveErrorDetails(error: unknown): { message: string; stack?: string } {
  try {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown error payload' };
  }
}
