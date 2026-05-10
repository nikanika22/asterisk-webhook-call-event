import * as mysql from 'mysql';
import { ConfigService } from '@nestjs/config';

export const DATABASE_POOL = 'DATABASE_POOL';

export const databaseProviders = [
  {
    provide: DATABASE_POOL,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const pool = mysql.createPool({
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        user: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        connectionLimit: 10,
        connectTimeout: 10000,
      });

      pool.on('error', (err) => {
        console.error('[DB] Pool error:', err.message);
      });

      return pool;
    },
  },
];
