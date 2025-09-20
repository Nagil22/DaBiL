const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

// THIS WAS MISSING - Add the POST route for creating orders
router.post('/', orderController.createOrder);

router.put('/:orderId/serve', orderController.serveOrder);
router.post('/:orderId/request-payment', orderController.requestPaymentConfirmation);
router.get('/:orderId/payment-status', orderController.checkPaymentStatus);
router.post('/:orderId/confirm-payment', orderController.confirmPayment);
router.post('/:orderId/decline-payment', orderController.declinePayment);

module.exports = router;