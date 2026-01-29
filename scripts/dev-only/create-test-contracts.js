#!/usr/bin/env node

/**
 * Script to create test contracts using pg client
 * Usage: node scripts/create-test-contracts.js
 */

require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL in .env.local')
    process.exit(1)
}

const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
})

function log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'
    console.log(`${prefix} [${timestamp}] ${message}`)
}

async function createTestContracts() {
    try {
        log('Starting test contracts creation...')
        await client.connect()
        log('✅ Connected to database')

        // 1. Get owner
        const ownersRes = await client.query("SELECT id, email FROM users WHERE role = 'owner' LIMIT 1")
        const owner = ownersRes.rows[0]
        if (!owner) throw new Error('No owner found')
        log(`Using owner: ${owner.email}`)

        // 2. Get companies
        const companiesRes = await client.query("SELECT id, name FROM companies WHERE owner_id = $1", [owner.id])
        const companies = companiesRes.rows
        if (companies.length === 0) throw new Error('No companies found')
        log(`Found ${companies.length} companies`)

        // 3. Get cars
        const companyIds = companies.map(c => c.id)
        const carsRes = await client.query(
            "SELECT id, company_id, license_plate, price_per_day FROM company_cars WHERE company_id = ANY($1)",
            [companyIds]
        )
        const cars = carsRes.rows
        if (cars.length === 0) throw new Error('No cars found')
        log(`Found ${cars.length} cars`)

        // 4. Get clients
        const clientsRes = await client.query("SELECT id, email, name, surname FROM users WHERE role = 'client' LIMIT 20")
        const clients = clientsRes.rows
        if (clients.length === 0) throw new Error('No clients found')
        log(`Found ${clients.length} clients`)

        // 5. Create contracts
        log('Creating 10 test contracts...')
        for (let i = 0; i < 10; i++) {
            const car = cars[i % cars.length]
            const user = clients[i % clients.length]

            const startDate = new Date()
            startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 10))
            const endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1)

            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            const totalAmount = (car.price_per_day || 1000) * days
            const status = i % 2 === 0 ? 'active' : 'completed'

            await client.query(
                `INSERT INTO contracts (
          client_id, company_car_id, start_date, end_date, total_amount, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    user.id, car.id, startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0], totalAmount, status,
                    `Test contract #${i + 1}`
                ]
            )

            // Update car status
            if (status === 'active') {
                await client.query("UPDATE company_cars SET status = 'rented' WHERE id = $1", [car.id])
            }

            console.log(`✅ Created contract for car ${car.license_plate} and client ${user.email}`)
        }

        log('✅ Test contracts creation completed!', 'success')
        await client.end()

    } catch (error) {
        log(`Error: ${error.message}`, 'error')
        if (client) await client.end().catch(() => { })
        process.exit(1)
    }
}

createTestContracts()
