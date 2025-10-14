// middleware/auth.js - Updated version
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    console.log('🔐 Auth Middleware - Token length:', token.length);
    
    // Decode without verification first to see structure
    const decodedWithoutVerify = jwt.decode(token);
    console.log('🔐 Decoded token (unverified):', JSON.stringify(decodedWithoutVerify, null, 2));
    
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
      req.restaurantId = staff.restaurant_id; // Use from database, not token
      req.userRole = decoded.role;
      req.userId = decoded.staffId; // For compatibility
      
      console.log('🔐 Staff auth set:', {
        staffId: req.staffId,
        restaurantId: req.restaurantId,
        role: req.userRole
      });
      
      return next();
    }
    
    // Handle user tokens (existing logic with session validation)
    if (decoded.userId) {
      console.log('🔐 User authentication detected');
      
      // Session validation for users only
      const sessionCheck = await req.app.locals.db.query(
        'SELECT * FROM user_sessions WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
        [decoded.userId, token]
      );
      
      if (sessionCheck.rows.length === 0) {
        return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
      }
      
      req.userId = decoded.userId;
      req.userPhone = decoded.phone;
      req.userRole = decoded.role || 'user';
      
      console.log('🔐 User auth set:', {
        userId: req.userId,
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