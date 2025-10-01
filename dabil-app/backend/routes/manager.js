const express = require('express');
const router = express.Router();
const restaurantManagerController = require('../controllers/managerController');
const auth = require('../middleware/auth');


// All routes require authentication (restaurant managers)
router.use(auth);


router.get('/my-restaurant', restaurantManagerController.getMyRestaurant);
router.get('/stats', restaurantManagerController.getMyRestaurantStats);
router.post('/staff', restaurantManagerController.createMyStaff);
router.post('/menu-item', restaurantManagerController.addMyMenuItem);
router.get('/staff', restaurantManagerController.getMyStaff);

router.get('/loyalty-overview', async (req, res) => {
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
});
module.exports = router;