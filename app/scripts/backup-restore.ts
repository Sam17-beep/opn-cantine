import fs from 'node:fs';
import readline from 'node:readline/promises';
import { BSON } from 'mongodb';
import { getDb } from '../src/lib/infrastructure/db/mongo';
import { COLLECTIONS, getCounts, printCounts } from './backup-lib';

const { EJSON } = BSON;

interface BackupPayload {
  exportedAt?: string;
  dbName?: string;
  collections: Record<string, unknown[]>;
}

async function confirm(promptText: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(promptText);
  rl.close();
  return answer.trim() === 'yes';
}

function loadBackup(filePath: string): BackupPayload {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = EJSON.parse(raw) as BackupPayload;

  if (!payload || typeof payload !== 'object' || typeof payload.collections !== 'object') {
    throw new Error('Invalid backup file: missing top-level "collections" object');
  }

  return payload;
}

async function main() {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes('--yes');
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    console.log('Usage: tsx scripts/backup-restore.ts <backup-file.json> [--yes]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'cantine';

  // Validate the file fully before touching the DB, so a bad file can't
  // cause a half-wiped database.
  const payload = loadBackup(filePath);

  for (const name of COLLECTIONS) {
    if (!(name in payload.collections)) {
      console.log(`WARNING: '${name}' not found in backup file, will be emptied`);
    }
  }

  const db = await getDb();
  const currentCounts = await getCounts(db);

  console.log(`\nTarget: ${dbName} (${uri})`);
  console.log(`Backup file: ${filePath}`);
  if (payload.exportedAt) console.log(`Backup exported at: ${payload.exportedAt}`);
  console.log();
  printCounts('Current document counts (will be DELETED):', currentCounts);
  console.log();
  const fileCounts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    fileCounts[name] = (payload.collections[name] ?? []).length;
  }
  printCounts('Backup file document counts (will be RESTORED):', fileCounts);

  console.log(`\nThis will DELETE all documents in: ${dbName} (${uri})`);
  console.log('and replace them with the contents of the backup file shown above.\n');

  if (!skipPrompt) {
    const ok = await confirm('Type "yes" to continue, anything else to cancel: ');
    if (!ok) {
      console.log('Aborted. No changes were made.');
      process.exit(0);
    }
  }

  console.log('\nRestoring...');
  for (const name of COLLECTIONS) {
    const docs = payload.collections[name] ?? [];
    const col = db.collection(name);
    await col.deleteMany({});
    if (docs.length > 0) {
      await col.insertMany(docs as object[], { ordered: true });
    }
    console.log(`  ${name.padEnd(16)} ${docs.length}`);
  }

  const finalCounts = await getCounts(db);
  console.log();
  printCounts('Final document counts:', finalCounts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
