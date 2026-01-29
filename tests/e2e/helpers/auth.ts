import { Page, expect } from '@playwright/test'

/**
 * Test user credentials
 * Should be configured in .env.local
 */
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner@test.com',
    password: process.env.TEST_OWNER_PASSWORD || 'owner123'
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL || 'manager@test.com',
    password: process.env.TEST_MANAGER_PASSWORD || 'manager123'
  }
}

/**
 * Login helper with validation
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  
  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 5000 })
  
  // Fill credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  
  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }),
    page.click('button[type="submit"]')
  ])
  
  // Verify successful login
  await expect(page).toHaveURL(/\/dashboard/)
}

/**
 * Login as admin
 */
export async function loginAsAdmin(page: Page) {
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
}

/**
 * Login as owner
 */
export async function loginAsOwner(page: Page) {
  await login(page, TEST_USERS.owner.email, TEST_USERS.owner.password)
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Look for logout button (adjust selector based on your UI)
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")')
  
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click()
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
  }
}

/**
 * Verify user is authenticated
 */
export async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/dashboard/)
}

/**
 * Verify user is NOT authenticated
 */
export async function expectUnauthenticated(page: Page) {
  await expect(page).toHaveURL(/\/auth\/login/)
}
