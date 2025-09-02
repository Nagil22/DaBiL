require('dotenv').config();
console.log('Database URL:', process.env.DATABASE_URL);

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function test() {
  try {
    console.log('Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT current_user, current_database()');
    console.log('User:', result.rows[0].current_user);
    console.log('Database:', result.rows[0].current_database);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  }
}

test();