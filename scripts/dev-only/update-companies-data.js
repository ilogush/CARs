/**
 * Script to update all companies with unique test data
 * Usage: node scripts/update-companies-data.js
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

// Sample data pools
const companyTypes = ['Rental', 'Rentals', 'Auto', 'Cars', 'Transport', 'Wheels', 'Motors', 'Drive', 'Express', 'Elite']
const descriptors = ['Premium', 'Luxury', 'Budget', 'Express', 'Royal', 'Fast', 'Golden', 'Silver', 'Elite', 'Direct', 'Island', 'Beach']
const areas = ['Phuket']


const domains = ['@rental.com', '@autocars.co', '@thailand-rent.com', '@wheels.net', '@drive-elite.com', '@express-rental.co.th']

function generateUniqueName(index) {
  const desc = descriptors[Math.floor(Math.random() * descriptors.length)]
  const type = companyTypes[Math.floor(Math.random() * companyTypes.length)]
  const area = areas[Math.floor(Math.random() * areas.length)]
  return `${desc} ${area} ${type} #${index + 1}`
}

function generatePhone() {
  const code = Math.floor(Math.random() * 900) + 100
  const num1 = Math.floor(Math.random() * 900) + 100
  const num2 = Math.floor(Math.random() * 9000) + 1000
  return `+66 ${code} ${num1} ${num2}`
}

function generateAddress() {
  const num = Math.floor(Math.random() * 500) + 1
  const street = ['Beach Road', 'Main St', 'Rawai Rd', 'Airport Blvd', 'Patong St', 'Kamala Grove', 'Chalong Ave']

  const area = areas[Math.floor(Math.random() * areas.length)]
  return `${num} ${street[Math.floor(Math.random() * street.length)]}, ${area}`
}

async function updateCompaniesData() {
  try {
    console.log('🔍 Fetching all companies...\n')

    await client.connect()
    console.log('✅ Connected to database')

    // Get all companies
    const res = await client.query('SELECT id, name FROM companies')
    const companies = res.rows

    if (!companies || companies.length === 0) {
      console.log('⚠️  No companies found')
      await client.end()
      return
    }

    console.log(`✅ Found ${companies.length} company(ies) to update\n`)

    let updatedCount = 0

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      const uniqueName = generateUniqueName(i)
      const domain = domains[Math.floor(Math.random() * domains.length)]
      const emailName = uniqueName.toLowerCase().replace(/\s+/g, '.').replace(/#/g, '')

      const email = `${emailName}${domain}`
      const phone = generatePhone()
      const address = generateAddress()

      await client.query(
        `UPDATE companies SET 
          name = $1, email = $2, phone = $3, address = $4, is_active = true
         WHERE id = $5`,
        [uniqueName, email, phone, address, company.id]
      )

      console.log(`✅ Fully updated company: ${uniqueName} (ID: ${company.id})`)
      updatedCount++
    }

    console.log('\n' + '═'.repeat(60))
    console.log('✨ All companies updated with unique random data!')
    console.log('═'.repeat(60))
    console.log(`\n📊 Summary:`)
    console.log(`   - Companies fully updated: ${updatedCount}`)
    console.log(`   - Total companies: ${companies.length}`)

    await client.end()

  } catch (error) {
    console.error('❌ Error updating companies:', error)
    if (client) await client.end().catch(() => { })
    process.exit(1)
  }
}

updateCompaniesData()
