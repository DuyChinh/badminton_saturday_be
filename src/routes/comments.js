const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

// Get comments for a specific post (Public or Protected, assuming users need to be logged in to see or interact)
// If public, we can remove `protect` but usually comments are visible to all.
router.get('/:postId', commentController.getCommentsByPost);

// Create a comment
router.post('/:postId', optionalAuth, commentController.createComment);

// React to a comment (type can be empty to unreact)
router.post('/react/:commentId', optionalAuth, commentController.reactToComment);

// Update comment
router.put('/:commentId', authMiddleware, commentController.updateComment);

// Delete comment
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

module.exports = router;
