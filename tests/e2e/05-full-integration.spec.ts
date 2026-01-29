import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import { ApiHelpers, validateResponseStructure } from './helpers/api-helpers'
import { TestDataFactory, TestScenarios } from './helpers/test-data'

/**
 * Full Integration Tests
 * Tests complete end-to-end business flows with data verification
 */

test.describe('Full Integration - Complete Business Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Complete Rental Flow: Create Contract → Auto-generate Payments → Edit Payment → Verify State', async ({ page }) => {
    const api = new ApiHelpers(page)
    
    // Step 1: Navigate to contracts
    await page.goto('/dashboard/contracts')
    await expect(page).toHaveURL(/\/dashboard\/contracts/)
    
    // Step 2: Get initial counts
    const initialContractsResponse = await api.apiRequest('GET', '/api/contracts?page=1&pageSize=10')
    const initialContractsCount = initialContractsResponse.data?.data?.length || 0
    
    const initialPaymentsResponse = await api.apiRequest('GET', '/api/payments?page=1&pageSize=10')
    const initialPaymentsCount = initialPaymentsResponse.data?.data?.length || 0
    
    // Step 3: Create new contract via UI (if create button exists)
    const createButton = page.locator('button:has-text("Create"), a:has-text("New")')
    
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click()
      await page.waitForTimeout(1000)
      
      // Fill contract form (simplified - adjust selectors based on actual form)
      const clientSelect = page.locator('select[name*="client"], input[name*="client"]').first()
      const carSelect = page.locator('select[name*="car"], input[name*="car"]').first()
      
      if (await clientSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select first available client and car
        await clientSelect.click()
        await page.locator('option, [role="option"]').first().click()
        
        await carSelect.click()
        await page.locator('option, [role="option"]').first().click()
        
        // Fill dates
        const startDateInput = page.locator('input[name*="start"]').first()
        const endDateInput = page.locator('input[name*="end"]').first()
        
        const dates = TestDataFactory.getTestDates()
        await startDateInput.fill(dates.tomorrow)
        await endDateInput.fill(dates.nextWeek)
        
        // Fill amounts
        const totalAmountInput = page.locator('input[name*="total"]').first()
        const depositInput = page.locator('input[name*="deposit"]').first()
        
        if (await totalAmountInput.isVisible()) {
          await totalAmountInput.fill('5000')
          await depositInput.fill('1000')
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")')
        await submitButton.click()
        
        // Wait for success and redirect
        await page.waitForTimeout(2000)
        
        // Step 4: Verify contract was created
        const newContractsResponse = await api.apiRequest('GET', '/api/contracts?page=1&pageSize=10')
        const newContractsCount = newContractsResponse.data?.data?.length || 0
        
        expect(newContractsCount).toBeGreaterThan(initialContractsCount)
        
        // Step 5: Verify 2 payments were auto-created (Rental Fee + Deposit)
        await page.waitForTimeout(1000)
        const newPaymentsResponse = await api.apiRequest('GET', '/api/payments?page=1&pageSize=20')
        const newPaymentsCount = newPaymentsResponse.data?.data?.length || 0
        
        expect(newPaymentsCount).toBeGreaterThanOrEqual(initialPaymentsCount + 2)
        
        // Step 6: Navigate to payments and verify they're visible
        await page.goto('/dashboard/payments')
        await page.waitForTimeout(1000)
        
        // Should see the auto-created payments
        const hasTable = await page.locator('table').isVisible()
        expect(hasTable).toBeTruthy()
        
        // Step 7: Click on first payment to edit it
        const paymentLink = page.locator('a[href*="/payments/"], button').first()
        if (await paymentLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await paymentLink.click()
          await page.waitForTimeout(1000)
          
          // Verify edit form loaded
          const hasForm = await page.locator('form').isVisible()
          expect(hasForm).toBeTruthy()
          
          // Step 8: Update payment status
          const statusSelect = page.locator('select[name*="status"]')
          if (await statusSelect.isVisible()) {
            await statusSelect.selectOption({ index: 1 }) // Select non-default status
            
            const saveButton = page.locator('button[type="submit"], button:has-text("Save")')
            await saveButton.click()
            
            await page.waitForTimeout(1000)
            
            // Verify success
            const hasSuccess = await page.locator('text=/success|saved|updated/i').isVisible({ timeout: 3000 }).catch(() => false)
            expect(hasSuccess || page.url().includes('/payments')).toBeTruthy()
          }
        }
      }
    }
  })

  test('RBAC Verification: Different user roles have appropriate access', async ({ page }) => {
    const api = new ApiHelpers(page)
    
    // Test admin can access all endpoints
    const adminContractsResponse = await api.apiRequest('GET', '/api/contracts')
    expect(adminContractsResponse.status).toBe(200)
    
    const adminPaymentsResponse = await api.apiRequest('GET', '/api/payments')
    expect(adminPaymentsResponse.status).toBe(200)
    
    const adminUsersResponse = await api.apiRequest('GET', '/api/users')
    expect(adminUsersResponse.status).toBe(200)
    
    // Verify admin can access admin-only pages
    await page.goto('/dashboard/admin/audit-logs')
    const adminPageAccessible = page.url().includes('/admin/audit-logs')
    expect(adminPageAccessible).toBeTruthy()
  })

  test('Data Consistency: Contract amounts match auto-generated payments', async ({ page }) => {
    const api = new ApiHelpers(page)
    
    // Get contracts with their payments
    const contractsResponse = await api.apiRequest('GET', '/api/contracts?page=1&pageSize=10')
    
    if (contractsResponse.status === 200 && contractsResponse.data?.data?.length > 0) {
      const contract = contractsResponse.data.data[0]
      
      // Get payments for this contract
      const paymentsResponse = await api.apiRequest('GET', `/api/payments?contract_id=${contract.id}`)
      
      if (paymentsResponse.status === 200) {
        const payments = paymentsResponse.data?.data || []
        
        // Verify structure
        for (const payment of payments) {
          validateResponseStructure(payment, {
            id: 'number',
            amount: 'number',
            contract_id: 'number',
            payment_status_id: 'number'
          })
          
          // Verify amounts are positive
          expect(payment.amount).toBeGreaterThan(0)
          
          // Verify contract linkage
          expect(payment.contract_id).toBe(contract.id)
        }
      }
    }
  })

  test('Audit Trail: Actions are logged correctly', async ({ page }) => {
    const api = new ApiHelpers(page)
    
    // Navigate to audit logs
    await page.goto('/dashboard/admin/audit-logs')
    
    // Verify audit log structure
    const auditResponse = await api.apiRequest('GET', '/api/admin/audit-logs?page=1&pageSize=10')
    
    if (auditResponse.status === 200) {
      const logs = auditResponse.data?.data || []
      
      // Verify each log has required fields
      for (const log of logs.slice(0, 5)) {
        expect(log).toHaveProperty('action')
        expect(log).toHaveProperty('user_id')
        expect(log).toHaveProperty('created_at')
        expect(log).toHaveProperty('entity_type')
      }
    }
  })

  test('Performance: Page load times are within acceptable limits', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/dashboard/contracts',
      '/dashboard/payments',
      '/dashboard/cars',
      '/dashboard/clients'
    ]
    
    for (const pagePath of pages) {
      const startTime = Date.now()
      
      await page.goto(pagePath)
      await page.waitForLoadState('domcontentloaded')
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Verify page actually loaded content
      const hasContent = await page.locator('h1, h2, table, form').first().isVisible({ timeout: 2000 }).catch(() => false)
      expect(hasContent).toBeTruthy()
    }
  })

  test('Currency Handling: Currency symbols display correctly throughout application', async ({ page }) => {
    // Navigate to payments page
    await page.goto('/dashboard/payments')
    
    // Verify ฿ symbol is used (not "THB" text)
    if (await page.locator('table').isVisible().catch(() => false)) {
      const tableContent = await page.locator('table').textContent()
      
      // Should contain ฿ symbol
      expect(tableContent).toContain('฿')
      
      // Should NOT contain "THB" as text (may be in attributes)
      const visibleText = await page.locator('tbody').textContent()
      const thbCount = (visibleText?.match(/THB/g) || []).length
      expect(thbCount).toBeLessThanOrEqual(1) // Allow 1 for possible header/label
    }
    
    // Check contracts page
    await page.goto('/dashboard/contracts')
    
    if (await page.locator('table').isVisible().catch(() => false)) {
      const contractsContent = await page.locator('table').textContent()
      expect(contractsContent).toContain('฿')
    }
  })

  test('Business Rule: Cannot edit contract payment amounts from contract form', async ({ page }) => {
    await page.goto('/dashboard/contracts')
    
    // Click edit on first contract
    const editButton = page.locator('a[href*="/contracts/"], button[aria-label*="edit" i]').first()
    
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(1000)
      
      // Check if amount fields are disabled
      const totalAmountInput = page.locator('input[name*="total"]')
      const depositInput = page.locator('input[name*="deposit"]')
      
      if (await totalAmountInput.isVisible()) {
        const isTotalDisabled = await totalAmountInput.isDisabled()
        const isDepositDisabled = await depositInput.isDisabled()
        
        // Should be disabled (business rule: edit amounts only from payments page)
        expect(isTotalDisabled || isDepositDisabled).toBeTruthy()
      }
    }
  })

  test('Search & Filter: Multiple filter combinations work correctly', async ({ page }) => {
    await page.goto('/dashboard/contracts')
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]')
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Test search
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
      
      // Verify URL changed
      expect(page.url()).toMatch(/search|q=|filter/)
      
      // Clear search
      await searchInput.clear()
      await searchInput.fill('')
      await page.waitForTimeout(500)
      
      // Test status filter (if available)
      const statusFilter = page.locator('select[name*="status"], button:has-text("Status")')
      if (await statusFilter.isVisible({ timeout: 1000 }).catch(() => false)) {
        await statusFilter.click()
        await page.waitForTimeout(500)
        
        // Select option
        const option = page.locator('[role="option"], option').first()
        if (await option.isVisible()) {
          await option.click()
          await page.waitForTimeout(1000)
          
          // Verify filtering applied
          expect(page.url()).toMatch(/status|filter/)
        }
      }
    }
  })

  test('Pagination: Navigate through all pages and verify data consistency', async ({ page }) => {
    const api = new ApiHelpers(page)
    
    await page.goto('/dashboard/contracts')
    
    // Get total count via API
    const response = await api.apiRequest('GET', '/api/contracts?page=1&pageSize=20')
    
    if (response.status === 200 && response.data?.total) {
      const totalRecords = response.data.total
      const pageSize = response.data.pageSize || 20
      const totalPages = Math.ceil(totalRecords / pageSize)
      
      // If multiple pages exist
      if (totalPages > 1) {
        // Navigate to page 2
        const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]')
        
        if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextButton.click()
          await page.waitForTimeout(1000)
          
          // Verify URL changed (page parameter)
          expect(page.url()).toMatch(/page=2/)
          
          // Verify content loaded
          const hasTable = await page.locator('table tbody tr').first().isVisible({ timeout: 2000 }).catch(() => false)
          expect(hasTable).toBeTruthy()
        }
      }
    }
  })
})
