// backend/src/seed/seed.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from '../entities/user.entity';
import { Classe } from '../entities/classe.entity';
import { Eleve } from '../entities/eleve.entity';
import { Seance } from '../entities/seance.entity';
import { Absence } from '../entities/absence.entity';

import { SEED_USERS, SEED_CLASSES, SEED_ELEVES, SEED_SEANCES, SEED_ABSENCES } from './seed-data';

import * as path from 'path';
import * as net from 'net';

dotenv.config();
// Par défaut, on ne force pas le seeding pour éviter de supprimer vos insertions à chaque redémarrage de conteneur.
// Si vous voulez recréer la base de données, vous pouvez définir FORCE_SEED=true dans le docker-compose.yml ou via les Envs.
if (process.env.FORCE_SEED === undefined) {
  process.env.FORCE_SEED = 'false';
}

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

let dataSource: DataSource;

async function runSeed() {
  const dbTypeArg = process.env.DB_TYPE;
  const dbHost = process.env.DB_HOST ?? 'localhost';
  const dbPort = parseInt(process.env.DB_PORT ?? '5432', 10);
  const isProdEnv = process.env.NODE_ENV === 'production' && process.env.DB_HOST && process.env.DB_HOST !== 'localhost';
  let isPostgres = dbTypeArg === 'postgres' || isProdEnv;

  if (isPostgres && dbTypeArg !== 'sqlite') {
    const isReachable = await checkPort(dbPort, dbHost, 800);
    if (!isReachable) {
      console.warn(`[SEED] PostgreSQL à ${dbHost}:${dbPort} est inaccessible. Repli automatique sur SQLite.`);
      isPostgres = false;
    }
  }

  dataSource = new DataSource({
    type: isPostgres ? 'postgres' : 'better-sqlite3',
    ...(isPostgres
      ? {
          host: dbHost,
          port: dbPort,
          username: process.env.DB_USERNAME ?? 'admin',
          password: process.env.DB_PASSWORD ?? 'password123',
          database: process.env.DB_DATABASE ?? 'school_absences',
        }
      : { database: process.env.DB_SQLITE_PATH ?? path.resolve(__dirname, '../../school.sqlite') }),
    entities: [User, Classe, Eleve, Seance, Absence],
    synchronize: isPostgres ? (process.env.DB_SYNC === 'true') : true,
  });

  try {
    await dataSource.initialize();
    console.log('[SEED] Connexion à la base de données établie.');

    if (dataSource.options.type === 'postgres') {
      await dataSource.query('SET session_replication_role = replica');
    } else {
      await dataSource.query('PRAGMA foreign_keys = OFF');
    }

    console.log('[SEED] Étape 1 : Vérification de la base de données...');
    const userCount = await dataSource.getRepository(User).count();
    const forceSeed = process.env.FORCE_SEED === 'true';
    
    if (userCount > 0 && !forceSeed) {
      console.log('[SEED] La base de données contient déjà des données. Seeding ignoré pour éviter la destruction des données. Utilisez FORCE_SEED=true pour forcer.');
      return;
    }

    if (forceSeed) {
      console.log('[SEED] Nettoyage de la base de données sans erreurs de clés étrangères...');
      if (dataSource.options.type === 'postgres') {
        try {
          await dataSource.query('TRUNCATE TABLE "audit_logs", "absences", "seances", "eleves", "classes", "users" CASCADE');
        } catch (err: any) {
          console.warn('[SEED] Échec TRUNCATE avec audit_logs, essai sans audit_logs... ' + (err.message || err));
          try {
            await dataSource.query('TRUNCATE TABLE "absences", "seances", "eleves", "classes", "users" CASCADE');
          } catch (err2) {
            console.error('[SEED] Échec TRUNCATE cascade complet:', err2);
            throw err2;
          }
        }
      } else {
        try { await dataSource.query('DELETE FROM audit_logs'); } catch (e) {}
        await dataSource.getRepository(Absence).delete({});
        await dataSource.getRepository(Seance).delete({});
        await dataSource.getRepository(Eleve).delete({});
        await dataSource.getRepository(Classe).delete({});
        await dataSource.getRepository(User).delete({});
      }
    }

    console.log('[SEED] Insertion des données...');

    console.log('[SEED] Étape 2 : Hashage des mots de passe et génération des CINs/Contacts...');
    let cinSeedNum = 111111;
    let contactNum = 612345000;
    for (const u of SEED_USERS) {
      u.password = await bcryptjs.hash(u.password, 10);
      (u as any).cin = `CN${cinSeedNum++}`;
      (u as any).contact = `0${contactNum++}`;
    }

    console.log('[SEED] Étape 3 : Insertion des entités...');
    await dataSource.getRepository(User).save(SEED_USERS);
    console.log(`[SEED] ✓ ${SEED_USERS.length} utilsateurs insérés.`);

    await dataSource.getRepository(Classe).save(SEED_CLASSES);
    console.log(`[SEED] ✓ ${SEED_CLASSES.length} classes insérées.`);

    for (const e of SEED_ELEVES) {
      delete (e as any).contactParent;
    }
    await dataSource.getRepository(Eleve).save(SEED_ELEVES);
    console.log(`[SEED] ✓ ${SEED_ELEVES.length} élèves insérés.`);

    await dataSource.getRepository(Seance).save(SEED_SEANCES);
    console.log(`[SEED] ✓ ${SEED_SEANCES.length} séances insérées.`);

    await dataSource.getRepository(Absence).save(SEED_ABSENCES);
    console.log(`[SEED] ✓ ${SEED_ABSENCES.length} absences insérées.`);
    
    console.log('[SEED] Opération terminée avec succès !');

  } catch (err) {
    console.error('[SEED] Erreur pendant le seeding :', err);
    process.exit(1);
  } finally {
    try {
      if (dataSource && dataSource.isInitialized) {
        if (dataSource.options.type === 'postgres') {
          await dataSource.query('SET session_replication_role = DEFAULT');
        } else {
          await dataSource.query('PRAGMA foreign_keys = ON');
        }
        await dataSource.destroy();
      }
    } catch (finalErr) {
      console.error('[SEED] Erreur lors de la fermeture :', finalErr);
    }
    process.exit(0);
  }
}

runSeed();
