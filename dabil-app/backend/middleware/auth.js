// middleware/auth.js - Updated version
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    console.log('🔐 Auth Middleware - Token length:', token.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Verified token:', JSON.stringify(decoded, null, 2));
    
    // Handle staff tokens - NO SESSION VALIDATION FOR STAFF
    if (decoded.staffId) {
      console.log('🔐 Staff authentication detected - skipping session validation');
      
      // Verify staff exists and is active
      const staffCheck = await req.app.locals.db.query(
        'SELECT id, restaurant_id, role, is_active FROM restaurant_staff WHERE id = $1 AND is_active = $2',
        [decoded.staffId, true]
      );
      
      if (staffCheck.rows.length === 0) {
        console.log('🔐 Staff not found or inactive');
        return res.status(401).json({ error: 'Staff account not found or inactive' });
      }
      
      const staff = staffCheck.rows[0];
      
      req.staffId = decoded.staffId;
      req.restaurantId = staff.restaurant_id;
      req.userRole = decoded.role;
      req.userId = decoded.staffId;
      
      console.log('🔐 Staff auth set:', {
        staffId: req.staffId,
        restaurantId: req.restaurantId,
        role: req.userRole
      });
      
      return next();
    }
    
    // Handle user tokens - FIXED: Only validate user exists, don't check user_sessions table
    if (decoded.userId) {
      console.log('🔐 User authentication detected');
      
      // FIX: Only verify user exists and is active, don't check user_sessions
      const userCheck = await req.app.locals.db.query(
        'SELECT id, email, status FROM users WHERE id = $1 AND status = $2',
        [decoded.userId, 'active']
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }
      
      const user = userCheck.rows[0];
      
      req.userId = decoded.userId;
      req.userEmail = user.email;
      req.userRole = 'user';
      
      console.log('🔐 User auth set:', {
        userId: req.userId,
        email: req.userEmail,
        role: req.userRole
      });
      
      return next();
    }
    
    // If we get here, token doesn't have expected structure
    console.error('🔐 Token missing required fields:', decoded);
    return res.status(400).json({ error: 'Invalid token structure' });
    
  } catch (error) {
    console.error('🔐 Auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token.' });
    }
    
    res.status(400).json({ error: 'Token validation failed: ' + error.message });
  }
};