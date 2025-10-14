const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.staffLogin = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find staff member with restaurant info
    const result = await pool.query(`
      SELECT s.*, r.name as restaurant_name, r.id as restaurant_id
      FROM restaurant_staff s
      JOIN restaurants r ON s.restaurant_id = r.id
      WHERE s.email = $1 AND s.is_active = $2
    `, [email, true]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const staff = result.rows[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, staff.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT with proper structure
    const tokenPayload = {
      staffId: staff.id, 
      userId: staff.id, // For compatibility with auth middleware
      restaurantId: staff.restaurant_id,
      role: staff.role,
      email: staff.email
    };
    
    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // **CRITICAL FIX: Create session entry in user_sessions table**
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now
    try {
      await pool.query(
        `INSERT INTO user_sessions (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE 
         SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
        [staff.id, token, expiresAt]
      );
      console.log('✅ Session created for staff:', staff.id);
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    // Update last login
    await pool.query(
      'UPDATE restaurant_staff SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [staff.id]
    );
    
    // Remove sensitive data
    const staffResponse = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      restaurant_id: staff.restaurant_id,
      restaurant_name: staff.restaurant_name,
      is_active: staff.is_active,
      last_login_at: staff.last_login_at,
      created_at: staff.created_at
    };
    
    console.log('✅ Staff login successful:', {
      staffId: staff.id,
      restaurantId: staff.restaurant_id,
      role: staff.role
    });
    
    res.json({ 
      staff: staffResponse,
      token,
      message: 'Staff login successful'
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { restaurant_id, email, name, role, password } = req.body;
    
    if (!email || !name || !role || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!['manager', 'cashier', 'waiter', 'chef'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(`
      INSERT INTO restaurant_staff (restaurant_id, email, name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, restaurant_id, is_active, created_at
    `, [restaurant_id, email, name, role, password_hash]);
    
    res.status(201).json({ 
      staff: result.rows[0],
      message: 'Staff member created successfully'
    });
  } catch (error) {
    console.error('Create staff error:', error);
    const { handleDatabaseError } = require('../middleware/errorHandler');
    const dbError = handleDatabaseError(error);
    res.status(dbError.status).json({ error: dbError.message });
  }
};