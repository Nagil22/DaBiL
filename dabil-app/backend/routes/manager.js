const express = require('express');
const router = express.Router();
const restaurantManagerController = require('../controllers/managerController');
const auth = require('../middleware/auth');
const manager = require('../middleware/manager'); // Add manager middleware

// All routes require authentication (restaurant managers)
router.use(auth);
router.use(manager); // Add manager authorization

router.get('/my-restaurant', restaurantManagerController.getMyRestaurant);
router.get('/stats', restaurantManagerController.getMyRestaurantStats);
router.post('/staff', restaurantManagerController.createMyStaff);
router.post('/menu-item', restaurantManagerController.addMyMenuItem);
router.get('/staff', restaurantManagerController.getMyStaff);

router.get('/loyalty-overview', async (req, res) => {
  try {
    // FIXED: Get restaurant_id from the manager's owned restaurant
    const restaurantResult = await req.app.locals.db.query(
      'SELECT id FROM restaurants WHERE owner_user_id = $1',
      [req.userId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Get ALL-TIME loyalty points summary (removed weekly filter)
    const result = await req.app.locals.db.query(`
      SELECT 
        COALESCE(SUM(lp.points_earned), 0) as total_points_earned,
        COUNT(DISTINCT lp.user_id) as active_customers,
        COALESCE(SUM(lp.points_earned * 0.1), 0) as revenue_generated -- Assuming 10% of points = revenue
      FROM loyalty_points lp
      WHERE lp.restaurant_id = $1 
    `, [restaurantId]);

    // Get loyalty tier distribution (ALL-TIME)
    const tierResult = await req.app.locals.db.query(`
      SELECT 
        u.current_tier,
        COUNT(DISTINCT u.id) as customer_count,
        COALESCE(SUM(lp.points_earned), 0) as points_earned,
        COALESCE(SUM(lp.points_earned * 0.1), 0) as revenue_generated
      FROM users u
      JOIN loyalty_points lp ON u.id = lp.user_id
      WHERE lp.restaurant_id = $1 
      GROUP BY u.current_tier
      ORDER BY points_earned DESC
    `, [restaurantId]);

    res.json({
      loyaltyOverview: result.rows[0] || { 
        total_points_earned: 0, 
        active_customers: 0,
        revenue_generated: 0 
      },
      tierDistribution: tierResult.rows
    });
  } catch (error) {
    console.error('Loyalty overview error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty overview' });
  }
});
module.exports = router;