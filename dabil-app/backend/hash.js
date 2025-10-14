require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateAdminPassword() {
  try {
    console.log('🔐 Generating secure password hash for admin123...\n');
    
    // Generate hash with bcrypt (10 rounds is standard)
    const password = 'admin123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Hash generated successfully');
    console.log('📋 Hash:', hash);
    console.log('');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ Hash verification:', isValid ? 'PASSED' : 'FAILED');
    console.log('');
    
    // Update the admin user in database
    console.log('🔄 Updating admin user in database...');
    
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 
       RETURNING id, email, name, role`,
      [hash, 'admin@dabil.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('');
      console.log('📊 Admin User Details:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Email:', result.rows[0].email);
      console.log('   Name:', result.rows[0].name);
      console.log('   Role:', result.rows[0].role);
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('   Email: admin@dabil.com');
      console.log('   Password: admin123');
      console.log('');
      
      // Test the updated password
      console.log('🧪 Testing login...');
      const testUser = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        ['admin@dabil.com']
      );
      
      const testResult = await bcrypt.compare('admin123', testUser.rows[0].password_hash);
      console.log('✅ Login test:', testResult ? 'SUCCESS ✓' : 'FAILED ✗');
      
    } else {
      console.log('❌ Admin user not found. Creating new admin...');
      
      const newAdmin = await pool.query(
        `INSERT INTO users (email, name, password_hash, email_verified, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, role`,
        ['admin@dabil.com', 'Super Admin', hash, true, 'admin']
      );
      
      console.log('✅ New admin created!');
      console.log('   ID:', newAdmin.rows[0].id);
      console.log('   Email:', newAdmin.rows[0].email);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Check if bcrypt is installed
try {
  require.resolve('bcrypt');
  updateAdminPassword();
} catch (e) {
  console.error('❌ bcrypt is not installed!');
  console.error('Please run: npm install bcrypt');
  process.exit(1);
}