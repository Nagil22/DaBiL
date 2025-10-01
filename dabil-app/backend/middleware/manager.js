module.exports = function (req, res, next) {
  // Check if user is logged in and is a restaurant manager
  if (req.user && (req.user.role === 'restaurant_manager' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Restaurant manager role required.' });
  }
};