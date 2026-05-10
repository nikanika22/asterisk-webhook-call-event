import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseResponseDto } from '../dto/base-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let stack = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
      code = (res as any).error || 'HTTP_EXCEPTION';
    } else if (exception instanceof Error) {
      // Not a standard HttpException, likely a 500
      message = 'Internal server error'; // Generic message for client
      stack = exception.stack;          // Actual error for logs
    }

    const requestId = request.headers['x-request-id'] as string || uuidv4();

    // Log the error
    const logData = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'ERROR' : 'WARN',
      requestId,
      message: exception instanceof Error ? exception.message : 'Unknown error',
      context: {
        method: request.method,
        url: request.url,
        body: request.body,
        statusCode: status,
      },
      ...(stack && { stack }) // Only include stack in logs for 500s
    };
    
    if (status >= 500) {
      this.logger.error(JSON.stringify(logData));
    } else {
      this.logger.warn(JSON.stringify(logData));
    }

    const errorResponse: BaseResponseDto = {
      success: false,
      error: {
        code,
        message: Array.isArray(message) ? message[0] : message,
      },
      requestId,
    };

    response.status(status).json(errorResponse);
  }
}
