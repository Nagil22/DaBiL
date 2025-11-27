exports.getMyRestaurantStats = async (req, res) => {
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
    
    const restaurantId = restaurantResult.rows[0].id;

    // Get total customers (unique users who have completed sessions at this restaurant)
    const totalCustomersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as total_customers
      FROM sessions 
      WHERE restaurant_id = $1 AND status = 'completed'
    `, [restaurantId]);

    // Get total orders and revenue - CORRECTED: Join through sessions table
    const ordersResult = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM orders o
      JOIN sessions s ON o.session_id = s.id
      WHERE s.restaurant_id = $1 AND o.status = 'served'
    `, [restaurantId]);

    // Get today's stats
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*) as today_orders,
        COALESCE(SUM(o.total_amount), 0) as today_revenue
      FROM orders o
      JOIN sessions s ON o.session_id = s.id
      WHERE s.restaurant_id = $1 
        AND o.status = 'served'
        AND DATE(o.created_at) = CURRENT_DATE
    `, [restaurantId]);

    // Calculate average order value
    const totalOrders = parseInt(ordersResult.rows[0].total_orders);
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      stats: {
        total_customers: parseInt(totalCustomersResult.rows[0].total_customers),
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        today_orders: parseInt(todayResult.rows[0].today_orders),
        today_revenue: parseFloat(todayResult.rows[0].today_revenue),
        avg_order_value: parseFloat(avgOrderValue.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get restaurant stats error:', error);
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
      return res.status(404).json({ error: 'Restaurant not found. You are not assigned as a manager for any restaurant.' });
    }

    const restaurant = result.rows[0];

    // Get menu items for this restaurant
    const menuItemsResult = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
      [restaurant.id]
    );
    
    // Include menu items in the response
    restaurant.menu_items = menuItemsResult.rows;
    
    res.json({ restaurant: restaurant });
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

exports.getLoyaltyOverview = async (req, res) => {
  try {
    // Get restaurant_id from the manager's owned restaurant
    const restaurantResult = await req.app.locals.db.query(
      'SELECT id, name FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurantId = restaurantResult.rows[0].id;
    const restaurantName = restaurantResult.rows[0].name;

    // Calculate points from sessions - ONLY using columns that exist
    const result = await req.app.locals.db.query(`
      SELECT 
        COALESCE(SUM(s.loyalty_points_earned), 0) as total_points_earned,
        COUNT(DISTINCT s.user_id) as active_customers,
        COALESCE(SUM(s.total_spent), 0) as total_customer_spend,
        COALESCE(AVG(s.loyalty_points_earned), 0) as average_points_per_customer,
        COALESCE(SUM(CASE 
          WHEN s.checked_in_at >= date_trunc('month', CURRENT_DATE) 
          THEN s.loyalty_points_earned 
          ELSE 0 
        END), 0) as points_earned_this_month,
        COUNT(s.id) as total_sessions
      FROM sessions s
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
    `, [restaurantId]);

    // Get top customers by points earned (without tier info)
    const topCustomersResult = await req.app.locals.db.query(`
      SELECT 
        u.name as customer_name,
        COALESCE(SUM(s.loyalty_points_earned), 0) as total_points_earned,
        COALESCE(SUM(s.total_spent), 0) as total_spent,
        COUNT(s.id) as visit_count
      FROM users u
      JOIN sessions s ON u.id = s.user_id
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
      GROUP BY u.id, u.name
      ORDER BY total_points_earned DESC
      LIMIT 10
    `, [restaurantId]);

    // Get points trend for the last 6 months
    const monthlyTrendResult = await req.app.locals.db.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', s.checked_in_at), 'YYYY-MM') as month,
        COALESCE(SUM(s.loyalty_points_earned), 0) as points_earned,
        COUNT(DISTINCT s.user_id) as active_customers,
        COALESCE(SUM(s.total_spent), 0) as total_spent
      FROM sessions s
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
        AND s.checked_in_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', s.checked_in_at)
      ORDER BY month DESC
    `, [restaurantId]);

    const stats = result.rows[0];
    
    res.json({
      restaurant_loyalty_stats: {
        total_points_earned: parseInt(stats.total_points_earned),
        total_points_redeemed: 0, // You might calculate this from redemption transactions
        active_customers: parseInt(stats.active_customers),
        total_customer_spend: parseFloat(stats.total_customer_spend),
        average_points_per_customer: parseInt(stats.average_points_per_customer),
        points_earned_this_month: parseInt(stats.points_earned_this_month),
        total_sessions: parseInt(stats.total_sessions),
        restaurant_name: restaurantName
      },
      tierDistribution: [], // Empty for now since we don't have tiers in users table
      topCustomers: topCustomersResult.rows,
      monthlyTrend: monthlyTrendResult.rows
    });
  } catch (error) {
    console.error('Loyalty overview error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty overview' });
  }
};
