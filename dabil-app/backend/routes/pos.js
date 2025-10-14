// routes/pos.js - Updated version
const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const auth = require('../middleware/auth');

// All POS routes require authentication
router.use(auth);

// These routes now get restaurantId from the authenticated staff
router.get('/guests', posController.getCheckedInGuests);
router.get('/session/:sessionId/orders', posController.getSessionOrders);
router.get('/menu', posController.getRestaurantMenu);

module.exports = router;