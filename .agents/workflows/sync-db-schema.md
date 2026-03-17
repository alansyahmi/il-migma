---
description: How to synchronize local and remote database schemas when new columns are missing
---

This workflow applies when the application fails to save certain fields because they are missing from the underlying database tables (local or remote).

### 1. Identify Missing Columns
Compare the table info from the current database with the reference schema in `db/schema.sql`.

// turbo
```powershell
# Check local schema
sqlite3 local.db "PRAGMA table_info(entries);"
```

### 2. Check Remote Schema
If you have access to the admin tools, you can use the `db-tools` API to check the remote schema.

```powershell
curl -s -X POST http://localhost:8788/api/admin/db-tools `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{"action":"table-info"}'
```

### 3. Create or Update a Migration Script
Use a script like `scripts/add-missing-columns.mjs` to automate column additions.

```javascript
// Example addition to migration list
const columnsToAdd = [
    'new_column_name',
    'another_column'
];
```

### 4. Run Migration
Run the script for both `local` and `remote` targets.

// turbo
```powershell
# Update local database
node scripts/add-missing-columns.mjs local

# Update remote Turso database
node scripts/add-missing-columns.mjs remote
```

### 5. Verify Synchronization
Verify the columns are now present.

// turbo
```powershell
sqlite3 local.db "PRAGMA table_info(entries);"
```
