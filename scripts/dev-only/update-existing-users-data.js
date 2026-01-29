#!/usr/bin/env node

/**
 * Script to update existing users with unique test data
 * Usage: node scripts/update-existing-users-data.js
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

// Test data pools for random generation
const genders = ['male', 'female', 'other']
const cities = ['Bangkok', 'Phuket', 'Pattaya', 'Chiang Mai', 'Krabi', 'Koh Samui', 'Hua Hin', 'Rayong', 'Surat Thani', 'Udon Thani']
const citizenships = ['Thai', 'American', 'British', 'Australian', 'Canadian', 'German', 'French', 'Italian', 'Spanish', 'Russian', 'Japanese', 'Chinese', 'Korean']
const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Anna', 'Peter', 'Mary', 'Robert', 'Emma', 'James', 'Sophia', 'William', 'Oliver', 'Charlotte', 'Noah', 'Amelia', 'Liam', 'Evelyn', 'Lucas', 'Mia']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Taylor', 'Anderson', 'Wilson', 'Thompson', 'Harris', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall']

function generatePhone() {
  const area = Math.floor(Math.random() * 10) + 80
  const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const num2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `+66 ${area} ${num1} ${num2}`
}

function generateSecondPhone() {
  const area = Math.floor(Math.random() * 10) + 90
  const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const num2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `+66 ${area} ${num1} ${num2}`
}

function generatePassportNumber() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const numbers = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return `${letter}${numbers}`
}

function generateTelegram(name, surname) {
  const cleanName = (name || 'user').toLowerCase().replace(/\s+/g, '')
  const cleanSurname = (surname || 'test').toLowerCase().replace(/\s+/g, '')
  return `${cleanName}_${cleanSurname}_${Math.floor(Math.random() * 1000)}`
}

async function updateUsers() {
  try {
    console.log('🚀 Starting update of all users with unique random data...\n')

    await client.connect()
    console.log('✅ Connected to database')

    // Get all users
    const res = await client.query('SELECT id, email, role, name, surname FROM users ORDER BY created_at')
    const users = res.rows

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database')
      await client.end()
      process.exit(0)
    }

    console.log(`📊 Found ${users.length} user(s) to update\n`)

    let updated = 0
    let failed = 0

    for (const user of users) {
      try {
        const randomName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const randomSurname = lastNames[Math.floor(Math.random() * lastNames.length)]

        const updateData = {
          name: randomName,
          surname: randomSurname,
          gender: genders[Math.floor(Math.random() * genders.length)],
          phone: generatePhone(),
          second_phone: generateSecondPhone(),
          telegram: generateTelegram(randomName, randomSurname),
          passport_number: generatePassportNumber(),
          citizenship: citizenships[Math.floor(Math.random() * citizenships.length)],
          city: cities[Math.floor(Math.random() * cities.length)]
        }

        await client.query(
          `UPDATE users SET 
            name = $1, surname = $2, gender = $3, phone = $4, 
            second_phone = $5, telegram = $6, passport_number = $7, 
            citizenship = $8, city = $9 
           WHERE id = $10`,
          [
            updateData.name, updateData.surname, updateData.gender, updateData.phone,
            updateData.second_phone, updateData.telegram, updateData.passport_number,
            updateData.citizenship, updateData.city, user.id
          ]
        )

        console.log(`✅ Fully updated user: ${user.email} (${user.role})`)
        updated++

        // Also update client_profile if user is a client
        if (user.role === 'client') {
          const address = `${Math.floor(Math.random() * 1000)} ${cities[Math.floor(Math.random() * cities.length)]} Road, ${updateData.city}`

          await client.query(
            `INSERT INTO client_profiles (user_id, phone, address, passport_number)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               phone = EXCLUDED.phone,
               address = EXCLUDED.address,
               passport_number = EXCLUDED.passport_number`,
            [user.id, updateData.phone, address, updateData.passport_number]
          ).catch(e => {
            if (!e.message.includes('relation "client_profiles" does not exist')) {
              console.error(`⚠️  Failed to update client profile for ${user.email}:`, e.message)
            }
          })
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message)
        failed++
      }
    }

    console.log('\n' + '═'.repeat(60))
    console.log('✨ All users updated with unique random data!')
    console.log('═'.repeat(60))
    console.log(`\n📊 Summary:`)
    console.log(`   - Users fully updated: ${updated}`)
    console.log(`   - Users failed: ${failed}`)
    console.log(`   - Total users: ${users.length}`)

    await client.end()

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error.stack)
    if (client) await client.end().catch(() => { })
    process.exit(1)
  }
}

updateUsers()
