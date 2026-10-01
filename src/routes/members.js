const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', memberController.getAll);
router.get('/:id', memberController.getById);

// Admin routes (require authentication)
router.post('/', authMiddleware, memberController.create);
router.put('/bulk-update', authMiddleware, memberController.bulkUpdate);
router.put('/:id/reset-spins', authMiddleware, memberController.resetSpins);
router.put('/:id', authMiddleware, memberController.update);
router.delete('/:id', authMiddleware, memberController.delete);

module.exports = router;
