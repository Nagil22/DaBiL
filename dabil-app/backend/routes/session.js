const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const auth = require('../middleware/auth');

// All session routes require authentication
router.use(auth);

router.post('/checkin', sessionController.checkIn);
router.put('/:sessionId/checkout', sessionController.checkOut);
router.get('/active', sessionController.getActiveSession);

module.exports = router;