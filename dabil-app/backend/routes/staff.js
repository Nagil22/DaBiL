const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Staff authentication
router.post('/login', staffController.staffLogin);

// Admin only - create staff
router.post('/', auth, admin, staffController.createStaff);

module.exports = router;