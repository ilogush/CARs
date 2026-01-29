# Development Scripts

⚠️ **These scripts are for DEVELOPMENT/TESTING only!**

Do NOT run these in production environment.

## Available Scripts

- `create-test-contracts.js` - Creates test contracts with sample data
- `seed-company-21.js` - Seeds data for company ID 21 (configurable via TEST_COMPANY_ID env)
- `seed-phuket-data.js` - Seeds location-specific data for Phuket
- `update-companies-data.js` - Bulk update company records
- `update-existing-users-data.js` - Bulk update user records

## Usage

```bash
# Set environment variable if needed
export TEST_COMPANY_ID=21

# Run script
node scripts/dev-only/seed-company-21.js
```

## Safety

These scripts directly modify the database. Always:
1. Backup data before running
2. Test on dev/staging first
3. Never run on production
