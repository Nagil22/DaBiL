// Update middleware/auth.js to handle both user and staff tokens
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle both user and staff tokens
    if (decoded.userId) {
      req.userId = decoded.userId;
      req.userPhone = decoded.phone;
      req.userRole = decoded.role;
    } else if (decoded.staffId) {
      req.userId = decoded.staffId;
      req.staffId = decoded.staffId;
      req.restaurantId = decoded.restaurantId;
      req.userRole = decoded.role;
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token.' });
    }
    
    res.status(400).json({ error: 'Token validation failed.' });
  }
};