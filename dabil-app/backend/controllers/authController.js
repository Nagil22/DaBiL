const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { email, name, password } = req.body;
    
    // Validate input
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash, email_verified) VALUES ($1, $2, $3, $4) RETURNING *',
      [email.toLowerCase(), name, password_hash, false]
    );
    
    const user = result.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remove sensitive data
    delete user.password_hash;
    
    res.status(201).json({ 
      user, 
      token,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Convert email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase();
    
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND status = $2',
      [normalizedEmail, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if user already has an active session and remove it
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [user.id]
    );
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store session in database
    await pool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, token]
    );
    
    // Remove sensitive data
    delete user.password_hash;
    
    res.json({ 
      user, 
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// Add logout function to authController.js
exports.logout = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [req.userId]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const result = await pool.query(`
      SELECT 
        u.*,
        w.balance,
        w.total_funded,
        w.total_spent,
        lp.points_balance,
        lp.current_tier
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN loyalty_points lp ON u.id = lp.user_id
      WHERE u.id = $1
    `, [req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    delete user.password_hash;
    
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { name, email } = req.body;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), req.userId]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken' });
    }
    
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, email.toLowerCase(), req.userId]
    );
    
    const user = result.rows[0];
    delete user.password_hash;
    
    res.json({ 
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get current user
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.userId]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
};