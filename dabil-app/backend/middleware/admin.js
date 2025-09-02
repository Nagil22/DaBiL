// admin.js middleware - fix to include super_admin
module.exports = async (req, res, next) => {
  const pool = req.app.locals.db;
  
  try {
    // Check user role from database
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userRole = result.rows[0].role;
    
    // Allow both admin and super_admin roles
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Admin verification failed' });
  }
};