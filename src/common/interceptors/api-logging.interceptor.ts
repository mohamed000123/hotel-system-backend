import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import {
  buildApiRequestContext,
  getApiRequestDurationMs,
  logApiRequestSuccess,
} from '../helpers/api-request.helper';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestContext = buildApiRequestContext(request);

    return next.handle().pipe(
      tap(() => {
        const durationMs = getApiRequestDurationMs(request);
        logApiRequestSuccess(this.logger, requestContext, durationMs);
      }),
    );
  }
}
