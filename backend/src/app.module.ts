// backend/src/app.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import * as net from 'net';
import configuration from './config/configuration';
import { User } from './entities/user.entity';
import { Classe } from './entities/classe.entity';
import { Eleve } from './entities/eleve.entity';
import { Seance } from './entities/seance.entity';
import { Absence } from './entities/absence.entity';
import { AuditLog } from './entities/audit-log.entity';

// ─── Feature modules — décommenter au fur et à mesure des SPs ───
import { AuthModule } from './features/auth/auth.module'
import { UsersModule } from './features/users/users.module'
import { ClassesModule } from './features/classes/classes.module'
import { ElevesModule } from './features/eleves/eleves.module'
import { SeancesModule } from './features/seances/seances.module'
import { AbsencesModule } from './features/absences/absences.module'
import { ExportModule } from './features/export/export.module'
import { AuditModule } from './features/audit/audit.module';

const featureModules = [
  AuthModule,
  UsersModule,
  ClassesModule,
  ElevesModule,
  SeancesModule,
  AbsencesModule,
  ExportModule,
  AuditModule,
];

function checkPort(port: number, host: string, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let solved = false;
    socket.on('connect', () => {
      socket.destroy();
      if (!solved) { solved = true; resolve(true); }
    });
    socket.on('error', () => {
      socket.destroy();
      if (!solved) { solved = true; resolve(false); }
    });
    socket.on('timeout', () => {
      socket.destroy();
      if (!solved) { solved = true; resolve(false); }
    });
    socket.setTimeout(timeout);
    socket.connect(port, host);
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ([{
        ttl: cfg.get<number>('throttle.ttl') ?? 60000,
        limit: cfg.get<number>('throttle.limit') ?? 100,
      }]),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService): Promise<TypeOrmModuleOptions> => {
        const dbTypeArg = cfg.get<string>('database.type');
        const dbHost = cfg.get<string>('database.host') ?? 'localhost';
        const dbPort = cfg.get<number>('database.port') ?? 5432;
        
        let isPostgres = dbTypeArg === 'postgres' || (dbHost && dbHost !== 'localhost');
        if (isPostgres && dbTypeArg !== 'sqlite') {
          const isReachable = await checkPort(dbPort, dbHost, 800);
          if (!isReachable) {
            console.warn(`[DATABASE] PostgreSQL à ${dbHost}:${dbPort} est inaccessible. Repli automatique sur SQLite.`);
            isPostgres = false;
          }
        }

        const dbType = isPostgres ? 'postgres' : 'sqlite';
        const syncDb = cfg.get<boolean>('database.sync') ?? false;

        if (dbType === 'postgres') {
          return {
            type: 'postgres',
            host: dbHost,
            port: dbPort,
            username: cfg.get<string>('database.username'),
            password: cfg.get<string>('database.password'),
            database: cfg.get<string>('database.database'),
            entities: [User, Classe, Eleve, Seance, Absence, AuditLog],
            synchronize: syncDb,
            logging: false,
          };
        } else {
          return {
            type: 'better-sqlite3',
            database: cfg.get<string>('database.sqlitePath') ?? './school.sqlite',
            entities: [User, Classe, Eleve, Seance, Absence, AuditLog],
            synchronize: true,
            logging: true,
          };
        }
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '../../frontend/dist'),
      exclude: ['/api/(.*)'],
    }),
    ...featureModules,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
