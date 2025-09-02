// Database error handler
exports.handleDatabaseError = (error) => {
  if (error.code === '23505') {
    return { status: 400, message: 'Duplicate entry - record already exists' };
  }
  if (error.code === '23503') {
    return { status: 400, message: 'Referenced record not found' };
  }
  if (error.code === '23514') {
    return { status: 400, message: 'Invalid data format' };
  }
  return { status: 500, message: 'Database error occurred' };
};

// Validation middleware
exports.validateRestaurant = (req, res, next) => {
  const { name, restaurant_type } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Restaurant name is required' });
  }
  
  if (!restaurant_type || !['QSR', 'Casual', 'Luxury', 'Fast Food', 'Fine Dining'].includes(restaurant_type)) {
    return res.status(400).json({ error: 'Valid restaurant type is required' });
  }
  
  next();
};

exports.validateMenuItem = (req, res, next) => {
  const { name, price } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Menu item name is required' });
  }
  
  if (!price || price <= 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  
  next();
};

exports.validateOrder = (req, res, next) => {
  const { sessionId, items } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }
  
  // Validate each item
  for (let item of items) {
    if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Each item must have menuItemId and valid quantity' });
    }
  }
  
  next();
};