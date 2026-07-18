const express = require('express');
const router = express.Router();
const multer = require('multer');
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', postController.getAll);
router.post('/', authMiddleware, upload.array('images', 5), postController.create);
router.put('/:id', authMiddleware, upload.array('images', 5), postController.update);
router.delete('/:id', authMiddleware, postController.delete);

module.exports = router;
