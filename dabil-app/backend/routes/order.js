const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

router.post('/', orderController.createOrder);
router.put('/:orderId/serve', orderController.serveOrder);

// Add these missing routes for 2-step payment verification
router.post('/:orderId/request-payment', orderController.requestPaymentConfirmation);
router.get('/:orderId/payment-status', orderController.checkPaymentStatus);
router.post('/:orderId/confirm-payment', orderController.confirmPayment);
router.post('/:orderId/decline-payment', orderController.declinePayment);

module.exports = router;
