# Database Migration Guide

## Current Situation

Your database has an **old NextAuth schema** that needs to be migrated to **Better Auth schema**.

## Quick Fix (Recommended)

Run the comprehensive migration script that handles everything:

```bash
cd packages/db
psql $DATABASE_URL -f migrate_to_better_auth.sql
```

This script will safely:
1. Add the missing `id` column to Account table
2. Rename/migrate all old NextAuth columns to Better Auth format
3. Fix type casting issues (emailVerified → boolean)
4. Preserve all existing data
5. Handle Session table migrations

## What the Migration Does

### Account Table Changes:
- ✅ Adds `id` column (primary key) - generates UUIDs for existing rows
- ✅ Renames `providerAccountId` → `accountId`
- ✅ Renames `provider` → `providerId`
- ✅ Renames `access_token` → `accessToken`
- ✅ Renames `refresh_token` → `refreshToken`
- ✅ Renames `expires_at` → `accessTokenExpiresAt`
- ✅ Renames `id_token` → `idToken`
- ✅ Drops old columns: `type`, `session_state`, `token_type`

### User Table Changes:
- ✅ Fixes `emailVerified` type casting (converts to boolean safely)

### Session Table Changes:
- ✅ Renames `sessionToken` → `token`
- ✅ Renames `expires` → `expiresAt`

## After Migration

Once the migration is complete, verify:

```sql
-- Check Account table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Account' 
ORDER BY ordinal_position;

-- Verify id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Account'
AND column_name = 'id';
```

You should see the `id` column with:
- `data_type`: text
- `is_nullable`: NO
- Primary key constraint exists

## Troubleshooting

### If migration fails:

1. **Check current schema:**
   ```sql
   \d "Account"
   \d "User"
   \d "Session"
   ```

2. **Backup first:**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Run migration step by step:**
   - Comment out sections you've already completed
   - Run the script again

### If you still see errors:

The migration script is idempotent - you can run it multiple times safely. It checks if changes are needed before applying them.

## Next Steps

After running the migration:

1. ✅ Verify the schema matches Better Auth requirements
2. ✅ Test your authentication flow
3. ✅ The original error should be resolved

## Important Notes

- ⚠️ **Always backup your database before migrations**
- ✅ The migration script preserves all existing data
- ✅ The script is idempotent (safe to run multiple times)
- ✅ All changes are wrapped in a transaction (ROLLBACK if anything fails)

