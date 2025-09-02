const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/balance', walletController.getBalance);
router.post('/fund', walletController.fundWallet);
router.get('/verify/:reference', walletController.verifyPayment);
router.get('/transactions', walletController.getTransactions);
router.post('/debit', walletController.debitWallet);
router.post('/redeem', walletController.redeemPoints);

module.exports = router;