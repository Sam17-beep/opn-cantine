import { getDb } from '../src/lib/infrastructure/db/mongo';
import { getCounts, printCounts } from './backup-lib';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'cantine';

  console.log(`Target: ${dbName} (${uri})\n`);

  const db = await getDb();
  const counts = await getCounts(db);
  printCounts('Current document counts:', counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
