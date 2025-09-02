const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const auth = require('../middleware/auth');

// All POS routes require authentication
router.use(auth);

router.get('/restaurant/:restaurantId/guests', posController.getCheckedInGuests);
router.get('/session/:sessionId/orders', posController.getSessionOrders);
router.get('/restaurant/:restaurantId/menu', posController.getRestaurantMenu);

module.exports = router;