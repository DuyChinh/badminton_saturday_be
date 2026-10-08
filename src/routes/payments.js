const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

// Public - QR code info
router.get('/qr/:memberId', paymentController.getQRInfo);

// Game rotation & settings
router.get('/game-setting', paymentController.getGameSetting);
router.put('/game-setting', authMiddleware, paymentController.updateGameSetting);

// Public - Lucky games (draw happens server-side; applies to member.amountDue)
router.post('/lucky-spin/:memberId', paymentController.luckySpin);
router.post('/lucky-cancel/:memberId', paymentController.luckyCancel);

// SePay Webhook - No auth (SePay calls this)
router.post('/sepay-webhook', paymentController.sepayWebhook);

// Public/User/Admin - Transaction history
router.get('/transactions', optionalAuth, paymentController.getTransactions);

// Public/User/Admin - Spin history
router.get('/spin-history', optionalAuth, paymentController.getSpinHistory);
router.delete('/spin-history/:id', optionalAuth, paymentController.deleteSpinHistory);

module.exports = router;
