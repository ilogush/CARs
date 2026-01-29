# E2E Tests (Playwright) - Comprehensive Test Suite

## 📊 Test Coverage

**Total: 79 Deep Integration Tests**

### Test Files:
1. **01-authentication.spec.ts** (16 tests)
   - Login/logout flows with validation
   - Protected route access control
   - Session management
   - Rate limiting verification

2. **02-contracts-crud.spec.ts** (17 tests)
   - Complete CRUD operations
   - Form validation (dates, amounts, required fields)
   - Business logic (auto-payment generation)
   - List operations (search, sort, pagination)

3. **03-payments-module.spec.ts** (20 tests)
   - Payment display & filtering
   - Auto-creation from contracts
   - Edit & validation
   - Currency symbol verification (฿)
   - Creator tracking

4. **04-edge-cases.spec.ts** (17 tests)
   - Network errors (timeout, 500, offline)
   - Data validation edge cases
   - XSS/SQL injection attempts
   - Concurrent operations
   - Browser compatibility
   - Performance under load
   - Accessibility

5. **05-full-integration.spec.ts** (9 tests)
   - Complete rental flow (contract → payments → edit)
   - RBAC verification
   - Data consistency checks
   - Audit trail verification
   - Performance benchmarks
   - Currency handling across pages
   - Business rules enforcement

## 🚀 Setup

### 1. Install Playwright browsers:
```bash
npx playwright install
```

### 2. Configure test credentials in `.env.local`:
```bash
# Admin user (required)
TEST_ADMIN_EMAIL=admin@yourcompany.com
TEST_ADMIN_PASSWORD=your_secure_password

# Owner user (optional)
TEST_OWNER_EMAIL=owner@yourcompany.com
TEST_OWNER_PASSWORD=your_secure_password

# Manager user (optional)
TEST_MANAGER_EMAIL=manager@yourcompany.com
TEST_MANAGER_PASSWORD=your_secure_password
```

### 3. Ensure dev server is running:
```bash
npm run dev
```

## 🧪 Running Tests

### Run all tests (headless, recommended for CI)
```bash
npm run test:e2e
```

### Run with UI (interactive debugging)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug specific test
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test 01-authentication.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run with trace (for debugging failures)
```bash
npx playwright test --trace on
```

## 📁 Test Structure

```
tests/e2e/
├── helpers/
│   ├── auth.ts           # Authentication utilities
│   ├── api-helpers.ts    # API testing utilities
│   └── test-data.ts      # Test data factories
├── 01-authentication.spec.ts
├── 02-contracts-crud.spec.ts
├── 03-payments-module.spec.ts
├── 04-edge-cases.spec.ts
└── 05-full-integration.spec.ts
```

## 🎯 What These Tests Cover

### ✅ Authentication & Authorization
- Login validation (empty, invalid, wrong credentials)
- Session persistence
- Protected route access
- Role-based access control (RBAC)
- Rate limiting

### ✅ CRUD Operations
- **Contracts**: Create, Read, Update, Delete
- **Payments**: Create, Read, Update
- Form validation
- Required field checks
- Date logic validation

### ✅ Business Logic
- **Auto-payment generation**: When contract created, 2 payments auto-created
- **Amount restrictions**: Cannot edit payment amounts from contract form
- **Currency display**: ฿ symbol used (not "THB" text)
- **Creator tracking**: "Created By" column shows user who created payment
- **Payment linkage**: Payments correctly linked to contracts

### ✅ Data Integrity
- API response structure validation
- Pagination consistency
- Search/filter accuracy
- Data consistency across related records

### ✅ Edge Cases
- Network errors (timeout, 500, offline)
- Large numbers and boundary values
- Special characters & Unicode
- XSS/SQL injection attempts
- Concurrent operations
- Browser back/forward/refresh
- localStorage/sessionStorage edge cases

### ✅ Performance
- Page load time benchmarks (<3s)
- Large dataset handling
- Rapid pagination
- Multiple tab consistency

### ✅ Accessibility
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA attributes

## 📝 Writing New Tests

### Example: Basic page test
```typescript
test('page loads', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
})
```

### Example: Authenticated test
```typescript
import { loginAsAdmin } from './helpers/auth'

test.describe('Feature name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })
  
  test('should do something', async ({ page }) => {
    // test code
  })
})
```

### Example: API validation test
```typescript
import { ApiHelpers } from './helpers/api-helpers'

test('should validate API response', async ({ page }) => {
  const api = new ApiHelpers(page)
  
  const data = await api.expectApiResponse(
    '/api/contracts',
    200,
    ['id', 'client_id', 'total_amount']
  )
  
  expect(data).toBeDefined()
})
```

### Example: Using test data factory
```typescript
import { TestDataFactory } from './helpers/test-data'

test('should create contract with generated data', async ({ page }) => {
  const contractData = TestDataFactory.generateContract()
  
  // Use contractData in test
  await page.fill('[name="total_amount"]', contractData.total_amount.toString())
})
```

## 🔍 Debugging Failed Tests

### View test report
```bash
npx playwright show-report
```

### Run with debug console
```bash
npx playwright test --debug
```

### Take screenshots on failure
Screenshots are automatically saved to `test-results/` when tests fail.

### View traces
```bash
npx playwright show-trace trace.zip
```

## 🎭 Best Practices

1. **Always use helpers**: Reuse `loginAsAdmin()`, `ApiHelpers`, etc.
2. **Wait for elements**: Use `await page.waitForSelector()` or `isVisible()`
3. **Avoid hard timeouts**: Use conditions instead of `waitForTimeout()`
4. **Clean up test data**: Delete created test records after tests
5. **Test what matters**: Focus on user flows, not implementation details
6. **Make tests resilient**: Handle optional elements gracefully
7. **Verify business logic**: Don't just check UI, validate data consistency

## 🚨 Common Issues

### Issue: "Timed out waiting for element"
**Solution**: Element may not exist. Use `.catch(() => false)` or check visibility first.

### Issue: "Test passes locally but fails in CI"
**Solution**: Network timing differences. Add appropriate waits or use API polling.

### Issue: "Rate limit errors during tests"
**Solution**: Tests may be running too fast. Add delays between auth attempts.

### Issue: "Database state inconsistent"
**Solution**: Clean up test data properly. Use transactions if possible.

## 📊 CI/CD Integration

### GitHub Actions example:
```yaml
- name: Run E2E Tests
  run: |
    npm run dev &
    npx playwright test
  env:
    TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
    TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
```

## 📈 Test Metrics

- **Total tests**: 79
- **Average test duration**: ~5-10s per test
- **Full suite runtime**: ~8-12 minutes
- **Coverage**: Authentication, CRUD, Business Logic, Edge Cases, Integration
- **Browsers tested**: Chromium, Firefox, WebKit
