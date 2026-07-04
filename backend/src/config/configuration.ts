// backend/src/config/configuration.ts
import * as path from 'path';

export default () => {
  const isProd = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET || (isProd ? 'un_secret_tres_long_et_securise_pour_local_jwt_token_1234' : undefined);
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || (isProd ? 'un_secret_tres_long_et_securise_pour_local_refresh_token_1234' : undefined);

  if (isProd && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
    console.warn('\x1b[33m%s\x1b[0m', '[SECURITY WARNING] JWT_SECRET or JWT_REFRESH_SECRET is not set in the environment variables!');
    console.warn('\x1b[33m%s\x1b[0m', 'Using default secure fallback keys. For maximum production security, please define JWT_SECRET and JWT_REFRESH_SECRET in your docker-compose.yml or .env file.');
  }

  return {
    port: parseInt(process.env.BACKEND_PORT ?? (isProd ? process.env.PORT ?? '3000' : '2999'), 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      type: process.env.DB_TYPE ?? '',
      sync: process.env.DB_SYNC === 'true',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'admin',
      password: process.env.DB_PASSWORD ?? 'password123',
      database: process.env.DB_DATABASE ?? 'school_absences',
      sqlitePath: process.env.DB_SQLITE_PATH ?? path.resolve(__dirname, '../../school.sqlite'),
    },
    jwt: {
      secret: jwtSecret ?? 'super-secret-jwt-min-32-chars-change-in-prod',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      refreshSecret: jwtRefreshSecret ?? 'super-secret-refresh-min-32-chars-change-in-prod',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    },
  };
};
