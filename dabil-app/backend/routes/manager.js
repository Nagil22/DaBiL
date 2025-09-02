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

module.exports = router;