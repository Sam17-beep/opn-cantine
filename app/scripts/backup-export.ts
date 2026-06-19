import fs from 'node:fs';
import path from 'node:path';
import { BSON } from 'mongodb';
import { getDb } from '../src/lib/infrastructure/db/mongo';
import { COLLECTIONS } from './backup-lib';

const { EJSON } = BSON;

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'cantine';

  console.log(`Exporting from: ${dbName} (${uri})\n`);

  const db = await getDb();

  const collections: Record<string, unknown[]> = {};
  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray();
    collections[name] = docs;
    console.log(`  ${name.padEnd(16)} ${docs.length}`);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    dbName,
    collections,
  };

  const backupsDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupsDir, `${timestamp}-backup.json`);
  fs.writeFileSync(filePath, EJSON.stringify(payload, undefined, 2));

  console.log(`\nWrote backup to: ${filePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
