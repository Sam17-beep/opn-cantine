# Database backup & restore

These scripts let you take a full snapshot of the MongoDB database and restore
from it later. Use this **before any risky change** to the data (schema
migrations, bulk edits, etc.) so you can undo it if something goes wrong.

There are three commands:

- `pnpm backup:status` — show how many documents are in each collection, and
  which database you're currently pointed at.
- `pnpm backup:export` — download every document from every collection into a
  single JSON file under `backups/`.
- `pnpm backup:restore <file>` — wipe the database and reload it from a
  backup file.

## Dev vs. production

By default these scripts read `MONGODB_URI`/`MONGODB_DB` from your local
`.env.local`, so running them with no extra setup targets your **dev**
database.

To target **production**, get the values from the Vercel dashboard
(Project → Settings → Environment Variables → Production) and pass them
inline, just for that one command:

```bash
MONGODB_URI="<prod-uri>" MONGODB_DB="<prod-db>" pnpm backup:export
```

`pnpm backup:status` always prints which DB/URI it's about to use — check
this line before doing anything against production.

## Commands

### Check status

```bash
pnpm backup:status
```

Prints the document count for every collection. Good for confirming you're
pointed at the right database, and for sanity-checking a restore afterward.

### Export (backup)

```bash
pnpm backup:export
```

Dumps every document from every collection into
`backups/<timestamp>-backup.json`. This file is a full, exact snapshot —
`ObjectId`s and dates are preserved correctly, not just dumped as plain
strings.

### Restore

```bash
pnpm backup:restore backups/<file>.json
```

**This is destructive.** Restoring means: every collection is fully wiped
(all existing documents deleted), then refilled with exactly what's in the
backup file. It is not a merge — anything not in the backup file is gone
after a restore, including documents added since the backup was taken.

Before changing anything, the script prints a plan showing the target
database, the current document counts (about to be deleted), and the backup
file's document counts (about to be restored), then asks you to type `yes`
to confirm. Typing anything else cancels with no changes made.

```
Type "yes" to continue, anything else to cancel:
```

To skip the confirmation prompt (e.g. in a script), pass `--yes`:

```bash
pnpm backup:restore backups/<file>.json --yes
```

## Where backup files live

Backup files are written to `backups/`, which is gitignored — they contain
real data and must never be committed. This also means they only exist on
whatever machine you ran `backup:export` on. Keep copies somewhere safe
(e.g. download them, or copy them off the machine) before relying on them.

## Recommended checklist before a risky change

1. `pnpm backup:status` — confirm you're pointed at the right database.
2. `pnpm backup:export` — take a snapshot.
3. Open the resulting file and confirm it looks right (non-empty, recent
   data).
4. Make the risky change (e.g. run a migration).
5. If something goes wrong: `pnpm backup:restore backups/<file>.json` to
   roll back to the exact state from step 2.
