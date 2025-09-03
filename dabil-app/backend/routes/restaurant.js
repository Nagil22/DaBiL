// Update routes/restaurant.js to allow restaurant managers
const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public routes (no auth needed)
router.get('/', restaurantController.getAllRestaurants);
router.get('/:id', restaurantController.getRestaurant);

// Admin only routes
router.post('/', auth, admin, restaurantController.createRestaurant);

router.post('/:restaurantId/menu', auth, restaurantController.addMenuItem); // Remove admin middleware
router.put('/:id/regenerate-qr', auth, admin, restaurantController.regenerateQRCode);
// Add this route to routes/restaurant.js
router.delete('/:id', auth, admin, restaurantController.deleteRestaurant);
module.exports = router;