import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const method = request.method;
    const url = request.url;
    const now = Date.now();
    const requestId = request.headers['x-request-id'] as string || uuidv4();
    request.headers['x-request-id'] = requestId; // attach for filter

    return next
      .handle()
      .pipe(
        tap({
          next: () => {
            const logData = {
              timestamp: new Date().toISOString(),
              level: 'INFO',
              requestId,
              message: 'Request completed',
              context: {
                method,
                url,
                statusCode: response.statusCode,
                durationMs: Date.now() - now,
              }
            };
            this.logger.log(JSON.stringify(logData));
          },
          error: (err) => {
            // Error is handled by exception filter
          }
        }),
      );
  }
}
