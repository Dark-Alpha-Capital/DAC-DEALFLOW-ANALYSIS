# Migrate from NextAuth to Better Auth Schema

## Problem
Your database has an old NextAuth schema that needs to be migrated to Better Auth. The errors include:
1. `Account` table missing the `id` column (required by Better Auth)
2. Old NextAuth column names (`providerAccountId`, `refresh_token`, etc.) need to be renamed
3. `emailVerified` column type casting issue (needs explicit boolean conversion)
4. Session table column name differences

Error examples:
```
Error [PostgresError]: column "id" does not exist
error: column "emailVerified" cannot be cast automatically to type boolean
```

## Solution

### Option 1: Run the Comprehensive Migration Script (RECOMMENDED)

This script handles ALL the schema changes safely:

1. **Review the migration script first:**
   ```bash
   cd packages/db
   cat migrate_to_better_auth.sql
   ```

2. **Run the migration:**
   ```bash
   # Using psql (recommended)
   psql $DATABASE_URL -f migrate_to_better_auth.sql
   
   # Or execute directly
   psql $DATABASE_URL < migrate_to_better_auth.sql
   ```

This script will:
- ✅ Add the missing `id` column to Account table
- ✅ Rename old NextAuth columns to Better Auth format (providerAccountId → accountId, etc.)
- ✅ Fix the emailVerified type casting issue
- ✅ Migrate Session table columns (sessionToken → token, expires → expiresAt)
- ✅ Drop old NextAuth columns that are no longer needed
- ✅ Preserve all existing data

### Option 2: Simple ID Column Only (If you only need the id column)

If you only need to fix the immediate `id` column issue:

```bash
cd packages/db
psql $DATABASE_URL -f add_account_id_column.sql
```

**Note**: This only fixes the `id` column. You may still need to run the comprehensive migration later.

### Option 3: Use Drizzle Kit Push (NOT RECOMMENDED - Causes Data Loss)

⚠️ **WARNING**: `drizzle-kit push` will try to truncate your User table and can cause data loss!

The error you saw shows:
- It wants to truncate the User table (data loss!)
- Type casting issues that need manual fixes

**Do NOT use `bun run db:push` until after running the migration script above.**

### Option 4: Use Better Auth CLI (Alternative - After Migration)

Better Auth CLI can help generate the correct schema:

```bash
npx @better-auth/cli@latest generate
```

Then apply using drizzle-kit:
```bash
cd packages/db
bun run db:generate
bun run db:migrate
```

## Verification

After running the migration, verify the column was added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Account'
AND column_name = 'id';
```

You should see:
- `column_name`: id
- `data_type`: text
- `is_nullable`: NO

## Important Notes

- The migration script safely handles existing data by generating UUIDs for existing rows
- If the table already has a primary key on a different column, you may need to drop it first
- Always backup your database before running migrations in production
- Test the migration in a development environment first

## After Migration

Once the `id` column is added, the Better Auth error should be resolved. The Account table will match the schema definition in `schema.ts`.

