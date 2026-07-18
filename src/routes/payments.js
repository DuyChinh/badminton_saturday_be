const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Public - QR code info
router.get('/qr/:memberId', paymentController.getQRInfo);

// SePay Webhook - No auth (SePay calls this)
router.post('/sepay-webhook', paymentController.sepayWebhook);

// Public - Transaction history
router.get('/transactions', paymentController.getTransactions);

module.exports = router;
