#!/usr/bin/env node

/**
 * Script to seed company 21 with linked data (Contracts -> Payments)
 * Usage: node scripts/seed-company-21.js
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

async function seed() {
    try {
        log('Starting seeding for company 21...')
        await client.connect()
        log('✅ Connected to database')

        const companyId = process.env.TEST_COMPANY_ID ? parseInt(process.env.TEST_COMPANY_ID) : 21
        log(`Using company ID: ${companyId}`)

        // 1. Ensure company 21 exists
        const compRes = await client.query('SELECT id, owner_id FROM companies WHERE id = $1', [companyId])
        if (compRes.rows.length === 0) {
            throw new Error(`Company ${companyId} not found`)
        }
        const ownerId = compRes.rows[0].owner_id

        // 2. Ensure cars exist for company 21
        let carsRes = await client.query('SELECT id, license_plate, price_per_day FROM company_cars WHERE company_id = $1', [companyId])

        if (carsRes.rows.length === 0) {
            log('No cars found for company 21. Creating test cars...')

            // Get a template or create one
            let templateRes = await client.query('SELECT id FROM car_templates LIMIT 1')
            let templateId;

            if (templateRes.rows.length === 0) {
                log('No car templates found. Creating 10 test templates...')
                // Need a brand and model first
                const brandRes = await client.query("INSERT INTO car_brands (name) VALUES ('Toyota') RETURNING id")
                const brandId = brandRes.rows[0].id
                const modelRes = await client.query("INSERT INTO car_models (brand_id, name) VALUES ($1, 'Camry') RETURNING id", [brandId])
                const modelId = modelRes.rows[0].id

                const newTemplate = await client.query(`
                    INSERT INTO car_templates (brand_id, model_id, body_production_start_year)
                    VALUES ($1, $2, 2022) RETURNING id
                `, [brandId, modelId])
                templateId = newTemplate.rows[0].id
            } else {
                templateId = templateRes.rows[0].id
            }

            // Create 3 company cars
            await client.query(`
                INSERT INTO company_cars (company_id, template_id, license_plate, price_per_day, mileage, status)
                VALUES 
                ($1, $2, 'ABC-123', 1500, 10000, 'available'),
                ($1, $2, 'XYZ-789', 2000, 5000, 'available'),
                ($1, $2, 'DEF-456', 1200, 25000, 'available')
            `, [companyId, templateId])

            carsRes = await client.query('SELECT id, license_plate, price_per_day FROM company_cars WHERE company_id = $1', [companyId])
        }

        const cars = carsRes.rows
        log(`Using ${cars.length} cars for company 21`)

        // 3. Get or create test clients
        let clientsRes = await client.query("SELECT id, email FROM users WHERE role = 'client' LIMIT 5")
        let clients = clientsRes.rows

        if (clients.length < 2) {
            log('Creating test clients...')
            const now = Date.now()
            await client.query(`
                INSERT INTO users (id, email, name, surname, role) 
                VALUES 
                (gen_random_uuid(), 'client1_${now}@test.com', 'John', 'Doe', 'client'),
                (gen_random_uuid(), 'client2_${now}@test.com', 'Jane', 'Smith', 'client')
             `)
            clientsRes = await client.query("SELECT id, email FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT 5")
            clients = clientsRes.rows
        }
        log(`Using ${clients.length} clients`)

        // 4. Get Payment Statuses and Types
        const statusRes = await client.query('SELECT id, name, value FROM payment_statuses')
        const typeRes = await client.query('SELECT id, name, sign FROM payment_types')

        const paidStatus = statusRes.rows.find(s => s.name.toLowerCase() === 'paid' || s.value === 1) || statusRes.rows[0]
        const pendingStatus = statusRes.rows.find(s => s.name.toLowerCase() === 'pending' || s.value === 0) || statusRes.rows[0]

        const rentalType = typeRes.rows.find(t => t.name.toLowerCase().includes('rental')) || typeRes.rows[0]
        const depositType = typeRes.rows.find(t => t.name.toLowerCase().includes('deposit')) || typeRes.rows[1] || typeRes.rows[0]

        log(`Using Payment Statuses: ${paidStatus.name}, ${pendingStatus.name}`)
        log(`Using Payment Types: ${rentalType.name}, ${depositType.name}`)

        // 5. Create 3 Contracts and linked Payments
        log('Creating linked contracts and payments...')

        for (let i = 0; i < 3; i++) {
            const car = cars[i % cars.length]
            const user = clients[i % clients.length]
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - (i * 5))
            const endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 7)

            const totalAmount = car.price_per_day * 7
            const status = i === 0 ? 'active' : 'completed'

            // Insert Contract
            const contractRes = await client.query(`
                INSERT INTO contracts (
                    client_id, company_car_id, start_date, end_date, total_amount, status, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [user.id, car.id, startDate.toISOString(), endDate.toISOString(), totalAmount, status, `Test contract ${i + 1} for Co 21`])

            const contractId = contractRes.rows[0].id
            log(`Created Contract #${contractId} for car ${car.license_plate}`)

            // Insert Rental Payment (Paid)
            await client.query(`
                INSERT INTO payments (
                    company_id, contract_id, payment_status_id, payment_type_id, amount, payment_method, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [companyId, contractId, paidStatus.id, rentalType.id, totalAmount, 'cash', 'Rental payment (prepaid)', ownerId])

            // Insert Deposit Payment (Paid)
            await client.query(`
                INSERT INTO payments (
                    company_id, contract_id, payment_status_id, payment_type_id, amount, payment_method, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [companyId, contractId, paidStatus.id, depositType.id, 5000, 'transfer', 'Security deposit', ownerId])

            if (i === 2) {
                // Add a pending fine for the last contract
                await client.query(`
                    INSERT INTO payments (
                        company_id, contract_id, payment_status_id, payment_type_id, amount, payment_method, notes, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [companyId, contractId, pendingStatus.id, rentalType.id, 1000, 'cash', 'Late return fine (Pending)', ownerId])
            }
        }

        log('✅ Seeding completed successfully!', 'success')
        await client.end()

    } catch (error) {
        log(`Error: ${error.message}`, 'error')
        if (client) await client.end().catch(() => { })
        process.exit(1)
    }
}

seed()
