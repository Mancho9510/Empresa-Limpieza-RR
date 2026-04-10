import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('No DATABASE_URL environment variable.');
  }

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos de PostgreSQL exitosamente.');

    const files = [
      'supabase/migrations/001_initial_schema.sql',
      'supabase/migrations/002_rls_policies.sql'
    ];

    for (const file of files) {
      console.log(`⏳ Ejecutando ${file}...`);
      const sql = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      await client.query(sql);
      console.log(`✅ Completado: ${file}`);
    }

    console.log('🎉 Migraciones SQL completadas con éxito!');

  } catch (err) {
    console.error('❌ Error executing schemas:', err);
  } finally {
    await client.end();
  }
}

run();
