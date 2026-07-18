const express = require('express');
const router = express.Router();
const feeConfigController = require('../controllers/feeConfigController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route to get the config
router.get('/', feeConfigController.getLatest);

// Admin route to update the config
router.put('/', authMiddleware, feeConfigController.updateLatest);

module.exports = router;
