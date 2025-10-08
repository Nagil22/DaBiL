exports.getCheckedInGuests = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const restaurantId = req.restaurantId || req.params.restaurantId;
    
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID not found' });
    }
    
    const result = await pool.query(`
      SELECT 
        s.id as session_id,
        s.session_code,
        s.table_number,
        s.party_size,
        s.checked_in_at,
        u.name as guest_name,
        u.email,  -- Use email instead of phone
        COUNT(o.id) as order_count,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_orders
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN orders o ON s.id = o.session_id
      WHERE s.restaurant_id = $1 AND s.status = $2
      GROUP BY s.id, u.name, u.email
      ORDER BY s.checked_in_at DESC
    `, [restaurantId, 'active']);
    
    res.json({ guests: result.rows });
  } catch (error) {
    console.error('Get checked-in guests error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRestaurantMenu = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { restaurantId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND status = $2 AND is_available = $3 ORDER BY category, sort_order',
      [restaurantId, 'active', true]
    );
    
    res.json({ menuItems: result.rows });
  } catch (error) {
    console.error('Get restaurant menu error:', error);
    res.status(500).json({ error: error.message });
  }
};
