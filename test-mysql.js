// Test MySQL Connection
// Run with: node test-mysql.js

require('dotenv').config({ path: '.env.local' })
const mysql = require('mysql2/promise')

async function testConnection() {
  console.log('🔍 Testing MySQL connection...')
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tamanedu'
  }
  
  console.log(`📡 Connecting to MySQL at ${config.host}:${config.port}`)
  console.log(`📊 Database: ${config.database}`)
  console.log(`👤 User: ${config.user}`)
  
  try {
    // Test connection
    const connection = await mysql.createConnection(config)
    console.log('✅ MySQL connection successful!')
    
    // Test database exists
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${config.database}'`)
    if (databases.length === 0) {
      console.log('❌ Database does not exist!')
      console.log(`💡 Create it with: CREATE DATABASE ${config.database};`)
      await connection.end()
      return
    }
    console.log('✅ Database exists!')
    
    // Test tables exist
    const [tables] = await connection.execute('SHOW TABLES')
    console.log(`📋 Found ${tables.length} tables:`)
    
    const expectedTables = ['users', 'grading_sessions', 'answer_keys', 'students', 'responses', 'grades', 'file_uploads']
    const existingTables = tables.map(row => Object.values(row)[0])
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        console.log(`  ✅ ${table}`)
      } else {
        console.log(`  ❌ ${table} (missing)`)
      }
    }
    
    if (existingTables.length < expectedTables.length) {
      console.log('💡 Run the schema: mysql -u root -p tamanedu < mysql-schema.sql')
    }
    
    // Test sample query
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users')
    console.log(`👥 Users in database: ${users[0].count}`)
    
    await connection.end()
    console.log('🎉 All tests passed!')
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 MySQL server is not running. Start it with:')
      console.log('   - macOS: brew services start mysql')
      console.log('   - Linux: sudo systemctl start mysql')
      console.log('   - Docker: docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Check your username and password in .env.local')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`💡 Database '${config.database}' does not exist. Create it with:`)
      console.log(`   CREATE DATABASE ${config.database};`)
    }
  }
}

// Check environment variables
console.log('🔧 Environment Check:')
console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost (default)'}`)
console.log(`DB_PORT: ${process.env.DB_PORT || '3306 (default)'}`)
console.log(`DB_USER: ${process.env.DB_USER || 'root (default)'}`)
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`)
console.log(`DB_NAME: ${process.env.DB_NAME || 'tamanedu (default)'}`)
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'NOT SET'}`)
console.log('')

if (!process.env.DB_PASSWORD) {
  console.log('⚠️  DB_PASSWORD is not set in .env.local')
}

if (!process.env.JWT_SECRET) {
  console.log('⚠️  JWT_SECRET is not set in .env.local')
}

testConnection()
