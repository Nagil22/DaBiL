exports.checkIn = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { restaurantId, tableNumber, partySize = 1 } = req.body;
    
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }
    
    // Check if restaurant exists
    const restaurantResult = await pool.query(
      'SELECT id, name FROM restaurants WHERE id = $1 AND status = $2',
      [restaurantId, 'active']
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Check if user already has active session at this restaurant
    const existingSession = await pool.query(
      'SELECT id FROM sessions WHERE user_id = $1 AND restaurant_id = $2 AND status = $3',
      [req.userId, restaurantId, 'active']
    );
    
    if (existingSession.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active session at this restaurant' });
    }
    
    // Create new session
    const result = await pool.query(`
      INSERT INTO sessions (user_id, restaurant_id, table_number, party_size)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.userId, restaurantId, tableNumber, partySize]);
    
    const session = result.rows[0];
    
    res.status(201).json({
      session,
      restaurant: restaurantResult.rows[0],
      message: 'Checked in successfully'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    const { handleDatabaseError } = require('../middleware/errorHandler');
    const dbError = handleDatabaseError(error);
    res.status(dbError.status).json({ error: dbError.message });
  }
};

exports.checkOut = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { sessionId } = req.params;
    
    // FIXED: For staff checkout, don't filter by user_id
    // Staff should be able to check out any user at their restaurant
    const result = await pool.query(
      'UPDATE sessions SET status = $1, checked_out_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['completed', sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      session: result.rows[0],
      message: 'Checked out successfully'
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveSession = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const result = await pool.query(`
      SELECT s.*, r.name as restaurant_name, r.restaurant_type
      FROM sessions s
      JOIN restaurants r ON s.restaurant_id = r.id
      WHERE s.user_id = $1 AND s.status = $2
      ORDER BY s.checked_in_at DESC
      LIMIT 1
    `, [req.userId, 'active']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active session found' });
    }
    
    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: error.message });
  }
};