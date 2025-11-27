// Restaurant managers manage their own restaurant only
exports.getMyRestaurant = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    // Get restaurant owned by this user (restaurant manager)
    const result = await pool.query(
      'SELECT * FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ restaurant: result.rows[0] });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMyRestaurant = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    // Get restaurant owned by this user (restaurant manager)
    const result = await pool.query(
      'SELECT * FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant = result.rows[0];
    
    // ✅ ADD THIS: Get menu items for this restaurant
    const menuItemsResult = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
      [restaurant.id]
    );
    
    // ✅ ADD THIS: Include menu items in the response
    restaurant.menu_items = menuItemsResult.rows;
    
    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createMyStaff = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { email, name, role, password } = req.body;
    
    if (!email || !name || !role || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    // Get manager's restaurant
    const restaurantResult = await pool.query(
      'SELECT id FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant_id = restaurantResult.rows[0].id;
    
    // Create staff
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO restaurant_staff (restaurant_id, email, name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, restaurant_id, is_active, created_at
    `, [restaurant_id, email, name, role, password_hash]);
    
    res.status(201).json({
      staff: result.rows[0],
      message: 'Staff created successfully'
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.addMyMenuItem = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { name, description, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    
    // Get manager's restaurant
    const restaurantResult = await pool.query(
      'SELECT id FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant_id = restaurantResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO menu_items (restaurant_id, name, description, price, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [restaurant_id, name, description, price, category]);
    
    res.status(201).json({ 
      menuItem: result.rows[0],
      message: 'Menu item added successfully'
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMyStaff = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    // Get restaurant owned by this user
    const restaurantResult = await pool.query(
      'SELECT id FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant_id = restaurantResult.rows[0].id;
    
    // Get staff for this restaurant
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM restaurant_staff WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [restaurant_id]
    );
    
    res.json({ staff: result.rows });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: error.message });
  }
};
