import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { validate } from './core/config/env.validation';

// Core
import { AsteriskModule } from './core/asterisk/asterisk.module';
import { HttpExceptionFilter } from './core/common/filters/http-exception.filter';
import { LoggingInterceptor } from './core/common/interceptors/logging.interceptor';

// Shared
import { DatabaseModule } from './shared/database/database.module';
import { SocketModule } from './shared/socket/socket.module';

// Feature Modules
import { WebhookModule } from './modules/webhook/webhook.module';
import { AsteriskGroupModule } from './modules/asterisk/asterisk-group.module';
import { MonitorModule } from './modules/monitor/monitor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    DatabaseModule,
    SocketModule,
    AsteriskModule,
    
    // Đăng ký các module nghiệp vụ
    WebhookModule,
    AsteriskGroupModule,
    MonitorModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
