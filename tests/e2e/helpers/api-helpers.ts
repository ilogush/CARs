import { Page, expect } from '@playwright/test'

/**
 * API test helpers for E2E testing
 * Allows testing API responses directly within E2E tests
 */

export class ApiHelpers {
  constructor(private page: Page) {}

  /**
   * Make authenticated API request
   */
  async apiRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<{ status: number; data: any }> {
    const response = await this.page.request.fetch(path, {
      method,
      data: body,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const status = response.status()
    let data: any

    try {
      data = await response.json()
    } catch {
      data = await response.text()
    }

    return { status, data }
  }

  /**
   * Verify API response structure
   */
  async expectApiResponse(
    path: string,
    expectedStatus: number,
    expectedFields?: string[]
  ) {
    const { status, data } = await this.apiRequest('GET', path)

    expect(status).toBe(expectedStatus)

    if (expectedFields && typeof data === 'object') {
      for (const field of expectedFields) {
        expect(data).toHaveProperty(field)
      }
    }

    return data
  }

  /**
   * Wait for API response to match condition
   */
  async waitForApiCondition(
    path: string,
    condition: (data: any) => boolean,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<any> {
    const timeout = options.timeout || 10000
    const interval = options.interval || 500
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const { data } = await this.apiRequest('GET', path)

      if (condition(data)) {
        return data
      }

      await this.page.waitForTimeout(interval)
    }

    throw new Error(`API condition not met within ${timeout}ms for ${path}`)
  }

  /**
   * Test API error handling
   */
  async expectApiError(
    path: string,
    method: string = 'GET',
    expectedStatus: number = 400
  ) {
    const { status, data } = await this.apiRequest(method, path)

    expect(status).toBe(expectedStatus)
    expect(data).toHaveProperty('error')

    return data
  }

  /**
   * Create test data via API
   */
  async createTestContract(contractData: any): Promise<any> {
    const { status, data } = await this.apiRequest(
      'POST',
      '/api/contracts',
      contractData
    )

    expect(status).toBe(200)
    expect(data).toHaveProperty('id')

    return data
  }

  /**
   * Create test payment via API
   */
  async createTestPayment(paymentData: any): Promise<any> {
    const { status, data } = await this.apiRequest(
      'POST',
      '/api/payments',
      paymentData
    )

    expect(status).toBe(200)
    expect(data).toHaveProperty('id')

    return data
  }

  /**
   * Clean up test data
   */
  async deleteTestData(resourceType: string, id: string) {
    await this.apiRequest('DELETE', `/api/${resourceType}/${id}`)
  }
}

/**
 * Network condition helpers
 */
export async function simulateSlowNetwork(page: Page) {
  await page.route('**/*', (route) => {
    setTimeout(() => route.continue(), 2000) // 2s delay
  })
}

export async function simulateOffline(page: Page) {
  await page.route('**/*', (route) => {
    route.abort('connectionfailed')
  })
}

export async function simulate500Error(page: Page, pathPattern: string) {
  await page.route(pathPattern, (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    })
  })
}

export async function simulateTimeout(page: Page, pathPattern: string) {
  await page.route(pathPattern, (route) => {
    // Never respond - simulates timeout
    setTimeout(() => route.abort('timedout'), 30000)
  })
}

/**
 * Response validation helpers
 */
export function validateResponseStructure(
  data: any,
  expectedStructure: Record<string, string>
) {
  for (const [key, type] of Object.entries(expectedStructure)) {
    expect(data).toHaveProperty(key)
    expect(typeof data[key]).toBe(type)
  }
}

export function validatePaginationResponse(data: any) {
  expect(data).toHaveProperty('data')
  expect(data).toHaveProperty('total')
  expect(data).toHaveProperty('page')
  expect(data).toHaveProperty('pageSize')
  expect(Array.isArray(data.data)).toBeTruthy()
}
