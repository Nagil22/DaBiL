const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

router.post('/', orderController.createOrder);
router.put('/:orderId/serve', orderController.serveOrder);

module.exports = router;