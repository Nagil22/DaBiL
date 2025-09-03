exports.getAdminStats = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    // Get total users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']);
    const totalUsers = parseInt(usersResult.rows[0].count);
    
    // Get total revenue from all completed orders
    const revenueResult = await pool.query(
      'SELECT SUM(total_amount) as total FROM orders WHERE status = $1',
      ['served']
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;
    
    // Get active users (users with sessions in last 30 days)
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM sessions 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const activeUsers = parseInt(activeUsersResult.rows[0].count);
    
    res.json({
      totalUsers,
      totalRevenue,
      activeUsers
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
};