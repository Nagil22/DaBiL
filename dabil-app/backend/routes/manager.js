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
      'SELECT id FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Calculate points from sessions (since orders might not have user_id directly)
    const result = await req.app.locals.db.query(`
      SELECT 
        COALESCE(SUM(s.total_spent * 0.1), 0) as total_points_earned,
        COUNT(DISTINCT s.user_id) as active_customers,
        COALESCE(SUM(s.total_spent), 0) as total_customer_spend,
        COALESCE(AVG(s.total_spent * 0.1), 0) as average_points_per_customer,
        COALESCE(SUM(CASE 
          WHEN s.check_in_time >= date_trunc('month', CURRENT_DATE) 
          THEN s.total_spent * 0.1 
          ELSE 0 
        END), 0) as points_earned_this_month
      FROM sessions s
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
    `, [restaurantId]);

    // Get loyalty tier distribution from users who visited this restaurant
    const tierResult = await req.app.locals.db.query(`
      SELECT 
        u.current_tier,
        COUNT(DISTINCT u.id) as customer_count,
        COALESCE(SUM(s.total_spent * 0.1), 0) as points_earned,
        COALESCE(SUM(s.total_spent), 0) as total_spent
      FROM users u
      JOIN sessions s ON u.id = s.user_id
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
      GROUP BY u.current_tier
      ORDER BY points_earned DESC
    `, [restaurantId]);

    // Get top customers by points earned
    const topCustomersResult = await req.app.locals.db.query(`
      SELECT 
        u.name as customer_name,
        u.current_tier,
        COALESCE(SUM(s.total_spent * 0.1), 0) as total_points_earned,
        COALESCE(SUM(s.total_spent), 0) as total_spent,
        COUNT(s.id) as visit_count
      FROM users u
      JOIN sessions s ON u.id = s.user_id
      WHERE s.restaurant_id = $1 
        AND s.status = 'completed'
      GROUP BY u.id, u.name, u.current_tier
      ORDER BY total_points_earned DESC
      LIMIT 10
    `, [restaurantId]);

    res.json({
      restaurant_loyalty_stats: {
        total_points_earned: Math.floor(result.rows[0].total_points_earned),
        total_points_redeemed: 0, // You might calculate this from redemption transactions
        active_customers: result.rows[0].active_customers,
        total_customer_spend: result.rows[0].total_customer_spend,
        average_points_per_customer: Math.floor(result.rows[0].average_points_per_customer),
        points_earned_this_month: Math.floor(result.rows[0].points_earned_this_month)
      },
      tierDistribution: tierResult.rows,
      topCustomers: topCustomersResult.rows
    });
  } catch (error) {
    console.error('Loyalty overview error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty overview' });
  }
});
module.exports = router;