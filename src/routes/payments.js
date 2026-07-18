const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

// Public - QR code info
router.get('/qr/:memberId', paymentController.getQRInfo);

// SePay Webhook - No auth (SePay calls this)
router.post('/sepay-webhook', paymentController.sepayWebhook);

// Public/User/Admin - Transaction history
router.get('/transactions', optionalAuth, paymentController.getTransactions);

module.exports = router;
