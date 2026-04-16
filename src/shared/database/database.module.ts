import { Module, Global } from '@nestjs/common';
import { databaseProviders, DATABASE_POOL } from './database.providers';

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
