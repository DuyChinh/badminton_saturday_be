const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// Public - QR code info
router.get('/qr/:memberId', paymentController.getQRInfo);

// SePay Webhook - No auth (SePay calls this)
router.post('/sepay-webhook', paymentController.sepayWebhook);

// Admin - Transaction history
router.get('/transactions', authMiddleware, paymentController.getTransactions);

module.exports = router;
