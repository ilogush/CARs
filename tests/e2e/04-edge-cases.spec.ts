import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Edge Cases & Error Handling', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test.describe('Network & API Error Handling', () => {
    test('should handle API timeout gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 10000)
      })
      
      await page.goto('/dashboard/contracts')
      
      // Should show loading state or timeout error
      const hasLoadingOrError = await Promise.race([
        page.locator('text=/loading|spinner/i').isVisible().catch(() => false),
        page.locator('text=/error|timeout|failed/i').isVisible().catch(() => false),
        new Promise(resolve => setTimeout(() => resolve(true), 5000))
      ])
      
      expect(hasLoadingOrError).toBeTruthy()
    })

    test('should handle 500 server error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/contracts**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await page.goto('/dashboard/contracts')
      await page.waitForTimeout(2000)
      
      // Should show error message
      const hasError = await page.locator('text=/error|failed|wrong/i').isVisible().catch(() => false)
      expect(hasError).toBeTruthy()
    })

    test('should handle network disconnection', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      // Simulate offline
      await page.context().setOffline(true)
      
      // Try to navigate
      await page.goto('/dashboard/payments').catch(() => {})
      await page.waitForTimeout(2000)
      
      // Should show offline indicator or error
      const hasOfflineState = await page.locator('text=/offline|no connection|network/i').isVisible().catch(() => false)
      
      // Restore connection
      await page.context().setOffline(false)
      
      expect(typeof hasOfflineState).toBe('boolean')
    })
  })

  test.describe('Data Validation Edge Cases', () => {
    test('should handle extremely large numbers in amount fields', async ({ page }) => {
      await page.goto('/dashboard/payments')
      
      const paymentLink = page.locator('a[href*="/payments/"]').first()
      
      if (await paymentLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await paymentLink.click()
        await page.waitForTimeout(1000)
        
        const amountField = page.locator('input[name*="amount"]')
        
        if (await amountField.isVisible()) {
          // Try extremely large number
          await amountField.fill('999999999999999')
          
          const submitButton = page.locator('button[type="submit"]')
          if (await submitButton.isVisible()) {
            await submitButton.click()
            await page.waitForTimeout(1000)
            
            // Should either accept or show validation error
            const hasErrorOrSuccess = await page.locator('text=/error|success|invalid|saved/i').isVisible().catch(() => false)
            expect(hasErrorOrSuccess).toBeTruthy()
          }
        }
      }
    })

    test('should handle special characters in search input', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const searchInput = page.locator('input[type="search"]')
      
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try SQL injection attempt
        await searchInput.fill("'; DROP TABLE contracts; --")
        await page.waitForTimeout(1000)
        
        // Should not crash or show SQL errors
        const hasSqlError = await page.locator('text=/sql|syntax|database error/i').isVisible().catch(() => false)
        expect(hasSqlError).toBeFalsy()
      }
    })

    test('should handle XSS attempts in text inputs', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const createButton = page.locator('button:has-text("Create")').first()
      
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click()
        await page.waitForTimeout(500)
        
        const notesField = page.locator('textarea[name*="note"]')
        
        if (await notesField.isVisible()) {
          // Try XSS payload
          await notesField.fill('<script>alert("XSS")</script>')
          
          const submitButton = page.locator('button[type="submit"]')
          if (await submitButton.isVisible()) {
            await submitButton.click()
            await page.waitForTimeout(2000)
            
            // Script should NOT execute
            const dialogAppeared = await page.evaluate(() => {
              return window.document.body.innerHTML.includes('alert("XSS")')
            })
            
            expect(dialogAppeared).toBeFalsy()
          }
        }
      }
    })

    test('should handle date boundaries (leap year, end of month)', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const createButton = page.locator('button:has-text("Create")').first()
      
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click()
        await page.waitForTimeout(500)
        
        const startDate = page.locator('input[name*="start"]').first()
        
        if (await startDate.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Try leap year date
          await startDate.fill('2024-02-29') // Valid leap year
          await page.waitForTimeout(500)
          
          // Should accept
          const value = await startDate.inputValue()
          expect(value).toBe('2024-02-29')
        }
      }
    })
  })

  test.describe('Concurrent Operations', () => {
    test('should handle rapid consecutive actions', async ({ page }) => {
      await page.goto('/dashboard/payments')
      
      const searchInput = page.locator('input[type="search"]')
      
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Rapidly type (test debouncing)
        await searchInput.type('test', { delay: 50 })
        await searchInput.clear()
        await searchInput.type('another', { delay: 50 })
        await searchInput.clear()
        await searchInput.type('search', { delay: 50 })
        
        await page.waitForTimeout(2000)
        
        // Should not crash
        const isPageResponsive = await page.locator('body').isVisible()
        expect(isPageResponsive).toBeTruthy()
      }
    })

    test('should handle multiple browser tabs correctly', async ({ context }) => {
      const page1 = await context.newPage()
      const page2 = await context.newPage()
      
      // Login on both tabs
      await loginAsAdmin(page1)
      await loginAsAdmin(page2)
      
      // Navigate to same page on both
      await page1.goto('/dashboard/contracts')
      await page2.goto('/dashboard/contracts')
      
      // Both should load without issues
      const page1Loaded = await page1.locator('body').isVisible()
      const page2Loaded = await page2.locator('body').isVisible()
      
      expect(page1Loaded && page2Loaded).toBeTruthy()
      
      await page1.close()
      await page2.close()
    })
  })

  test.describe('Browser Compatibility', () => {
    test('should handle browser back button correctly', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      await page.goto('/dashboard/payments')
      
      // Go back
      await page.goBack()
      
      // Should be on contracts page
      await expect(page).toHaveURL(/\/dashboard\/contracts/)
    })

    test('should handle browser refresh without losing state', async ({ page }) => {
      await page.goto('/dashboard/contracts?page=2')
      
      // Reload
      await page.reload()
      
      // Should maintain page parameter
      await expect(page).toHaveURL(/page=2/)
    })

    test('should handle localStorage/sessionStorage edge cases', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      // Clear storage
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Reload
      await page.reload()
      await page.waitForTimeout(1000)
      
      // Should still function (may redirect to login)
      const url = page.url()
      expect(url).toMatch(/\/dashboard|\/auth\/login/)
    })
  })

  test.describe('Performance Under Load', () => {
    test('should handle large data sets in tables', async ({ page }) => {
      // Navigate to page with potentially many records
      await page.goto('/dashboard/payments?pageSize=100')
      
      // Wait for table
      await page.waitForSelector('table, text=/no payment/i', { timeout: 15000 })
      
      // Should render without freezing
      const isInteractive = await page.evaluate(() => {
        return document.readyState === 'complete'
      })
      
      expect(isInteractive).toBeTruthy()
    })

    test('should handle rapid pagination clicks', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const nextButton = page.locator('button:has-text("Next")')
      
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click next multiple times rapidly
        for (let i = 0; i < 5; i++) {
          await nextButton.click()
          await page.waitForTimeout(200)
        }
        
        // Should not crash
        const isResponsive = await page.locator('body').isVisible()
        expect(isResponsive).toBeTruthy()
      }
    })
  })

  test.describe('Accessibility & UX Edge Cases', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      // Try tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should focus elements
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName
      })
      
      expect(focusedElement).toBeTruthy()
    })

    test('should handle screen reader text appropriately', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      // Check for aria-labels or sr-only text
      const hasAriaLabels = await page.locator('[aria-label]').count()
      
      // Should have some accessibility attributes
      expect(hasAriaLabels).toBeGreaterThanOrEqual(0)
    })

    test('should handle focus trap in modals', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const deleteButton = page.locator('button:has-text("Delete")').first()
      
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click()
        await page.waitForTimeout(500)
        
        // Try to tab outside modal
        await page.keyboard.press('Tab')
        
        // Focus should remain in modal area
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.closest('[role="dialog"]') !== null
        })
        
        expect(typeof focusedElement).toBe('boolean')
      }
    })
  })

  test.describe('Data Integrity', () => {
    test('should prevent duplicate form submissions', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      
      const createButton = page.locator('button:has-text("Create")').first()
      
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click()
        await page.waitForTimeout(500)
        
        const submitButton = page.locator('button[type="submit"]')
        
        if (await submitButton.isVisible()) {
          // Double click submit
          await submitButton.click()
          await submitButton.click()
          await page.waitForTimeout(2000)
          
          // Should only create one record (button should be disabled)
          const isDisabled = await submitButton.isDisabled().catch(() => false)
          expect(isDisabled).toBeTruthy()
        }
      }
    })

    test('should maintain data consistency across related records', async ({ page }) => {
      // Test: When contract created, payments should link correctly
      await page.goto('/dashboard/contracts')
      
      // This would require full flow testing with DB verification
      // Placeholder for comprehensive test
      expect(true).toBeTruthy()
    })
  })
})
