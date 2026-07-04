// backend/src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;
      
    if (status >= 500) {
      fs.appendFileSync('nest-error.log', new Date().toISOString() + ' ' + (exception instanceof Error ? exception.stack : String(exception)) + '\n');
      console.error('HTTP Exception Filter Caught Server Error (5xx):', exception);
    } else {
      // 4xx client errors like 401 Token Expiry, 404 Not Found are normal operational events.
      // Log them lightly without cluttering stderr or log files with stack traces.
      const clientMsg = exception instanceof HttpException ? exception.message : String(exception);
      console.warn(`[HTTP ${status}] Client Request Warning: ${clientMsg} (Path: ${request.url})`);
    }

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    let errorMessage = exception instanceof HttpException ? exception.message : 'Internal Server Error (Custom)';
    let errorDetails = null;

    if (exceptionResponse && typeof exceptionResponse === 'object') {
        if ('message' in exceptionResponse) {
            const msg = (exceptionResponse as any).message;
            errorMessage = Array.isArray(msg) ? msg.join(', ') : msg;
        }
        if ('code' in exceptionResponse) {
            errorDetails = exceptionResponse;
        }
    } else if (!(exception instanceof HttpException)) {
        errorMessage = (exception as Error).message;
        errorDetails = (exception as any).stack;
        console.error("UNHANDLED EXCEPTION:", exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}


