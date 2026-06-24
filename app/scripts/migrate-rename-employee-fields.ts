import { getDb } from '../src/lib/infrastructure/db/mongo';

async function status() {
  const db = await getDb();
  const employees = db.collection('employees');
  const transactions = db.collection('transactions');
  console.log('employees:', {
    oldShape: await employees.countDocuments({ fullName: { $exists: true } }),
    newShape: await employees.countDocuments({ cardNumber: { $exists: true } }),
  });
  console.log('transactions:', {
    oldShape: await transactions.countDocuments({ employeeNumber: { $exists: true } }),
    newShape: await transactions.countDocuments({ cardNumber: { $exists: true } }),
  });
}

async function up() {
  const db = await getDb();
  const employees = db.collection('employees');
  const transactions = db.collection('transactions');

  // Order matters: clear `employeeNumber` first so step 2 can't collide with it.
  const r1 = await employees.updateMany(
    { employeeNumber: { $exists: true }, cardNumber: { $exists: false } },
    { $rename: { employeeNumber: 'cardNumber' } }
  );
  const r2 = await employees.updateMany(
    { fullName: { $exists: true }, employeeNumber: { $exists: false } },
    { $rename: { fullName: 'employeeNumber' } }
  );
  const r3 = await transactions.updateMany(
    { employeeNumber: { $exists: true }, cardNumber: { $exists: false } },
    { $rename: { employeeNumber: 'cardNumber' } }
  );
  console.log({ employeesStep1: r1.modifiedCount, employeesStep2: r2.modifiedCount, transactions: r3.modifiedCount });
}

async function down() {
  const db = await getDb();
  const employees = db.collection('employees');
  const transactions = db.collection('transactions');

  const r1 = await employees.updateMany(
    { employeeNumber: { $exists: true }, fullName: { $exists: false } },
    { $rename: { employeeNumber: 'fullName' } }
  );
  const r2 = await employees.updateMany(
    { cardNumber: { $exists: true }, employeeNumber: { $exists: false } },
    { $rename: { cardNumber: 'employeeNumber' } }
  );
  const r3 = await transactions.updateMany(
    { cardNumber: { $exists: true }, employeeNumber: { $exists: false } },
    { $rename: { cardNumber: 'employeeNumber' } }
  );
  console.log({ employeesStep1: r1.modifiedCount, employeesStep2: r2.modifiedCount, transactions: r3.modifiedCount });
}

const cmd = process.argv[2];
const fn = { status, up, down }[cmd as 'status' | 'up' | 'down'];
if (!fn) {
  console.log('Usage: tsx scripts/migrate-rename-employee-fields.ts <status|up|down>');
  process.exit(1);
}
fn().then(() => process.exit(0));
