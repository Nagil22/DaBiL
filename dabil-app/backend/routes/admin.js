const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/stats', auth, admin, adminController.getAdminStats);

router.get('/payouts', auth, admin, async (req, res) => {
  try {
    // Get ALL-TIME sales summary per restaurant
    // FIXED: Join orders through sessions to get restaurant_id
    const result = await req.app.locals.db.query(`
      SELECT 
        r.id,
        r.name,
        r.restaurant_type,
        r.cuisine_type,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COUNT(o.id) as total_orders,
        'pending' as payout_status
      FROM restaurants r
      LEFT JOIN sessions s ON r.id = s.restaurant_id
      LEFT JOIN orders o ON s.id = o.session_id 
        AND o.status = 'served'
      GROUP BY r.id, r.name, r.restaurant_type, r.cuisine_type
      ORDER BY total_sales DESC
    `);

    res.json({ payouts: result.rows });
  } catch (error) {
    console.error('Payouts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payout data' });
  }
});

router.get('/payouts/history', auth, admin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // FIXED: Join orders through sessions to get restaurant_id
    const result = await req.app.locals.db.query(`
      SELECT 
        r.id,
        r.name,
        DATE_TRUNC('month', o.created_at) as period,
        COALESCE(SUM(o.total_amount), 0) as period_sales,
        COUNT(o.id) as order_count,
        'paid' as payout_status
      FROM restaurants r
      LEFT JOIN sessions s ON r.id = s.restaurant_id
      LEFT JOIN orders o ON s.id = o.session_id 
        AND o.status = 'served'
      WHERE o.created_at IS NOT NULL
      GROUP BY r.id, r.name, period
      ORDER BY period DESC, period_sales DESC
      LIMIT $1
    `, [limit]);

    res.json({ payoutHistory: result.rows });
  } catch (error) {
    console.error('Payout history error:', error);
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

module.exports = router;