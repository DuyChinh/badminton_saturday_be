const Comment = require('../models/Comment');
const Post = require('../models/Post');

const ANIMAL_NAMES = [
  'Ngựa ẩn danh', 'Dê vui vẻ', 'Cáo lém lỉnh', 'Gấu ngái ngủ', 
  'Thỏ dũng cảm', 'Sói ngầu lòi', 'Hươu thông thái', 'Mèo lười biếng',
  'Cừu hiền lành', 'Lạc đà kiên nhẫn', 'Hải cẩu tinh nghịch',
  'Chim cánh cụt mập', 'Gấu trúc lơ ngơ', 'Cún đáng yêu', 'Ếch cốm'
];

const commentController = {
  // Get all comments for a post (flat array, populated with author)
  getCommentsByPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await Comment.find({ post: postId })
        .populate('author', 'name username avatarUrl')
        .populate('reactions.user', 'name avatarUrl memberCode')
        .sort({ createdAt: 1 }); // Oldest first to build thread correctly
      
      res.status(200).json({ success: true, data: comments });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  createComment: async (req, res) => {
    try {
      const { postId } = req.params;
      const { content, parentCommentId, guestName } = req.body;
      const userId = req.user ? req.user.id : null;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });
      }

      // Verify post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }

      // Verify parent comment if provided
      let parentId = null;
      if (parentCommentId) {
        const parent = await Comment.findById(parentCommentId);
        if (!parent) {
          return res.status(404).json({ message: 'Không tìm thấy bình luận gốc' });
        }
        // If parent itself is a reply, we link to the same parent to keep 2-level nesting
        // Or we just link to parentCommentId and handle 2-level nesting on frontend.
        // Usually handled on frontend for simplicity.
        parentId = parentCommentId;
      }

      const commentData = {
        post: postId,
        content: content.trim(),
        parentComment: parentId
      };
      if (userId) {
        commentData.author = userId;
      } else {
        commentData.guestName = guestName || ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
      }

      const comment = new Comment(commentData);

      await comment.save();

      // Populate author to return immediately
      await comment.populate('author', 'name username avatarUrl');

      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  reactToComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { type, guestId, guestName } = req.body;
      const userId = req.user ? req.user.id : null;

      if (!userId && !guestId) {
        return res.status(400).json({ message: 'Missing user or guest identity' });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }

      // Check if user already reacted
      const existingReactionIndex = comment.reactions.findIndex(r => 
        (userId && r.user && r.user.toString() === userId) ||
        (guestId && r.guestId === guestId)
      );

      if (type) {
        // Add or update reaction
        if (existingReactionIndex > -1) {
          comment.reactions[existingReactionIndex].type = type;
          if (guestName) comment.reactions[existingReactionIndex].guestName = guestName;
        } else {
          comment.reactions.push(userId ? { user: userId, type } : { guestId, guestName, type });
        }
      } else {
        // Remove reaction if type is empty/null
        if (existingReactionIndex > -1) {
          comment.reactions.splice(existingReactionIndex, 1);
        }
      }

      await comment.save();
      await comment.populate('author', 'name username avatarUrl');
      await comment.populate('reactions.user', 'name avatarUrl memberCode');

      res.status(200).json({ success: true, data: comment });
    } catch (error) {
      console.error('React comment error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  updateComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }

      // Check permission (only author can update, admin cannot update but can delete)
      if (!comment.author || comment.author.toString() !== userId) {
        return res.status(403).json({ message: 'Không có quyền sửa bình luận này' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });
      }

      comment.content = content.trim();
      await comment.save();

      res.status(200).json({ success: true, data: comment });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận' });
      }

      // Only author or admin can delete
      const isAuthor = comment.author && comment.author.toString() === userId;
      if (!isAuthor && userRole !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
      }

      await Comment.findByIdAndDelete(commentId);
      
      // Also delete all child replies
      await Comment.deleteMany({ parentComment: commentId });

      res.status(200).json({ success: true, message: 'Đã xóa bình luận' });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = commentController;
