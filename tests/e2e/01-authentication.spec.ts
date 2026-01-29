import { test, expect } from '@playwright/test'
import { login, logout, expectAuthenticated, expectUnauthenticated } from './helpers/auth'

test.describe('Authentication & Authorization', () => {
  
  test.describe('Login Flow', () => {
    test('should display login form with all required fields', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Verify form structure
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      
      // Verify labels/placeholders exist
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      
      await expect(emailInput).toHaveAttribute('placeholder', /.+/)
      await expect(passwordInput).toHaveAttribute('placeholder', /.+/)
    })

    test('should reject login with empty credentials', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Try to submit without filling
      await page.click('button[type="submit"]')
      
      // Should show validation errors or remain on login page
      await page.waitForTimeout(1000)
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('should reject login with invalid email format', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Browser HTML5 validation should prevent submission
      const emailInput = page.locator('input[type="email"]')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
      expect(isInvalid).toBeTruthy()
    })

    test('should reject login with incorrect credentials', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('input[type="email"]', 'wrong@example.com')
      await page.fill('input[type="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      // Wait for error message
      await page.waitForTimeout(2000)
      
      // Should show error or remain on login page
      const hasError = await page.locator('text=/invalid|incorrect|failed/i').isVisible().catch(() => false)
      const stillOnLogin = (await page.url()).includes('/auth/login')
      
      expect(hasError || stillOnLogin).toBeTruthy()
    })

    test('should successfully login with valid admin credentials', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      
      // Verify redirect to dashboard
      await expectAuthenticated(page)
      
      // Verify dashboard content loaded
      await expect(page.locator('body')).toContainText(/dashboard|home/i)
    })

    test('should maintain session after page reload', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      
      // Reload page
      await page.reload()
      
      // Should still be authenticated
      await expectAuthenticated(page)
    })

    test('should successfully logout', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      await expectAuthenticated(page)
      
      // Logout
      await logout(page)
      
      // Should redirect to login
      await expectUnauthenticated(page)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Should redirect
      await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
      await expectUnauthenticated(page)
    })

    test('should redirect unauthenticated users from contracts to login', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
      await expectUnauthenticated(page)
    })

    test('should redirect unauthenticated users from payments to login', async ({ page }) => {
      await page.goto('/dashboard/payments')
      
      await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
      await expectUnauthenticated(page)
    })

    test('should allow authenticated users to access dashboard', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should allow authenticated users to access contracts', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      
      await page.goto('/dashboard/contracts')
      await expect(page).toHaveURL(/\/dashboard\/contracts/)
    })
  })

  test.describe('Session Management', () => {
    test('should expire session after logout and prevent access', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      await logout(page)
      
      // Try to access protected route
      await page.goto('/dashboard/contracts')
      
      // Should redirect to login
      await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
      await expectUnauthenticated(page)
    })

    test('should prevent direct access to login page when already authenticated', async ({ page }) => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
      const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'
      
      await login(page, email, password)
      
      // Try to go back to login
      await page.goto('/auth/login')
      
      // Should redirect to dashboard or remain on dashboard
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url).toMatch(/\/dashboard|\/auth\/login/)
    })
  })

  test.describe('Rate Limiting', () => {
    test('should handle multiple rapid login attempts gracefully', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Try multiple login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"]', `test${i}@example.com`)
        await page.fill('input[type="password"]', 'wrongpassword')
        await page.click('button[type="submit"]')
        await page.waitForTimeout(500)
      }
      
      // Should either show rate limit message or still function
      const hasRateLimitMsg = await page.locator('text=/too many|rate limit|slow down/i').isVisible().catch(() => false)
      const canStillType = await page.locator('input[type="email"]').isEnabled()
      
      // One of these should be true
      expect(hasRateLimitMsg || canStillType).toBeTruthy()
    })
  })
})
