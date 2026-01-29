/**
 * Test data factory for E2E tests
 * Provides realistic test data generation
 */

export const TestDataFactory = {
  /**
   * Generate random client data
   */
  generateClient() {
    const timestamp = Date.now()
    return {
      name: `TestClient${timestamp}`,
      surname: `Surname${timestamp}`,
      email: `client${timestamp}@test.com`,
      phone: '+66812345678',
      passport_number: `AB${timestamp.toString().slice(-6)}`,
      citizenship: 'Russian',
      gender: 'male'
    }
  },

  /**
   * Generate contract data
   */
  generateContract(clientId?: string, carId?: string) {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 7)

    return {
      client_id: clientId || 'test-client-id',
      car_id: carId || 'test-car-id',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_amount: 5000,
      deposit_amount: 1000,
      currency: 'THB'
    }
  },

  /**
   * Generate payment data
   */
  generatePayment(contractId?: string) {
    return {
      contract_id: contractId || 'test-contract-id',
      amount: 2500,
      payment_method: 'cash',
      payment_type_id: 1,
      payment_status_id: 1,
      notes: 'Test payment'
    }
  },

  /**
   * Generate edge case data for validation testing
   */
  getEdgeCaseData() {
    return {
      veryLongString: 'A'.repeat(1000),
      specialChars: `<script>alert('xss')</script>`,
      sqlInjection: `'; DROP TABLE users; --`,
      unicodeChars: '🚗 租车 テスト',
      emptyString: '',
      whitespace: '   ',
      nullString: 'null',
      undefinedString: 'undefined',
      negativeNumber: -999999,
      hugeNumber: 999999999999,
      decimalNumber: 123.456789,
      zeroValue: 0
    }
  },

  /**
   * Generate valid test dates
   */
  getTestDates() {
    const today = new Date()
    return {
      today: today.toISOString().split('T')[0],
      yesterday: new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0],
      tomorrow: new Date(today.setDate(today.getDate() + 2)).toISOString().split('T')[0],
      nextWeek: new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0],
      nextMonth: new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0],
      leapYear: '2024-02-29',
      endOfMonth: '2024-01-31'
    }
  }
}

/**
 * Realistic test scenarios
 */
export const TestScenarios = {
  /**
   * Standard rental scenario
   */
  weeklyRental: {
    name: 'Weekly car rental',
    duration: 7,
    expectedPayments: 2, // Rental fee + Deposit
    totalAmount: 7000,
    depositAmount: 1500
  },

  /**
   * Long-term rental
   */
  monthlyRental: {
    name: 'Monthly car rental',
    duration: 30,
    expectedPayments: 2,
    totalAmount: 25000,
    depositAmount: 3000
  },

  /**
   * Short rental
   */
  dailyRental: {
    name: 'Single day rental',
    duration: 1,
    expectedPayments: 2,
    totalAmount: 1200,
    depositAmount: 500
  }
}
