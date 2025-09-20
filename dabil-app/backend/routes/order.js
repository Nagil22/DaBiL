const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

// CREATE ORDER - This is the missing/broken route
router.post('/', orderController.createOrder);

// SERVE ORDER
router.put('/:orderId/serve', orderController.serveOrder);

// Payment confirmation routes
router.post('/:orderId/request-payment', orderController.requestPaymentConfirmation);
router.get('/:orderId/payment-status', orderController.checkPaymentStatus);
router.post('/:orderId/confirm-payment', orderController.confirmPayment);
router.post('/:orderId/decline-payment', orderController.declinePayment);

module.exports = router;