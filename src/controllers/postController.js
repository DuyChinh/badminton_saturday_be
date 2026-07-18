const Post = require('../models/Post');
const cloudinary = require('cloudinary').v2;

const postController = {
  // GET /api/posts
  getAll: async (req, res) => {
    try {
      const { season, sort } = req.query;
      let filter = {};
      if (season && season !== 'Tất cả') {
        filter.season = season;
      }
      
      const sortOrder = sort === 'oldest' ? 1 : -1;

      const posts = await Post.find(filter)
        .populate('author', 'name avatarUrl username role')
        .sort({ createdAt: sortOrder });

      res.status(200).json({ success: true, data: posts });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // POST /api/posts
  create: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền đăng bài' });
      }

      let blocks = [];
      if (req.body.blocks) {
        blocks = JSON.parse(req.body.blocks);
      }

      if (blocks.length === 0) {
        return res.status(400).json({ message: 'Bài viết không được để trống' });
      }

      const { season } = req.body;

      // Upload files to cloudinary and map URLs to blocks
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'image' && block.fileIndex !== undefined) {
          const file = req.files[block.fileIndex];
          if (file) {
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = "data:" + file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
              folder: 'edumap/posts'
            });
            block.content = result.secure_url;
            delete block.fileIndex;
          }
        }
      }

      const newPost = new Post({
        blocks,
        season: season || 'Season Mới',
        author: req.user.id
      });

      await newPost.save();

      const populatedPost = await Post.findById(newPost._id).populate('author', 'name avatarUrl username role');

      res.status(201).json({ success: true, data: populatedPost });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Lỗi server khi đăng bài' });
    }
  },

  // PUT /api/posts/:id
  update: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền sửa bài' });
      }

      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }

      let newBlocks = [];
      if (req.body.blocks) {
        newBlocks = JSON.parse(req.body.blocks);
      }
      const { season } = req.body;

      // Identify old image URLs
      const oldImageUrls = post.blocks.filter(b => b.type === 'image' && b.content).map(b => b.content);

      // Process new blocks
      for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];
        if (block.type === 'image') {
          if (block.fileIndex !== undefined) {
            // Upload new file
            const file = req.files[block.fileIndex];
            if (file) {
              const b64 = Buffer.from(file.buffer).toString('base64');
              const dataURI = "data:" + file.mimetype + ";base64," + b64;
              const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'edumap/posts'
              });
              block.content = result.secure_url;
              delete block.fileIndex;
            }
          }
        }
      }

      // Identify images to delete
      const currentImageUrls = newBlocks.filter(b => b.type === 'image' && b.content).map(b => b.content);
      const imagesToDelete = oldImageUrls.filter(url => !currentImageUrls.includes(url));

      for (const url of imagesToDelete) {
        try {
          const parts = url.split('/');
          const folderAndFile = parts.slice(parts.length - 3).join('/');
          const publicId = folderAndFile.split('.')[0]; 
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }

      post.blocks = newBlocks;
      post.season = season || 'Season Mới';
      await post.save();

      const populatedPost = await Post.findById(post._id).populate('author', 'name avatarUrl username role');
      res.status(200).json({ success: true, data: populatedPost });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: 'Lỗi server khi sửa bài' });
    }
  },

  // DELETE /api/posts/:id
  delete: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền xóa bài' });
      }

      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }

      // Xóa ảnh trên cloudinary
      const imageUrls = post.blocks.filter(b => b.type === 'image' && b.content).map(b => b.content);
      for (const url of imageUrls) {
        try {
          const parts = url.split('/');
          const folderAndFile = parts.slice(parts.length - 3).join('/');
          const publicId = folderAndFile.split('.')[0]; 
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Error deleting image from cloudinary:', err);
        }
      }

      await Post.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Đã xóa bài viết' });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ message: 'Lỗi server khi xóa bài' });
    }
  },

  // POST /api/posts/:id/react
  reactToPost: async (req, res) => {
    try {
      const postId = req.params.id;
      const { type, guestId } = req.body;
      const userId = req.user ? req.user.id : null;

      if (!userId && !guestId) {
        return res.status(400).json({ message: 'Missing user or guest identity' });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết' });
      }

      const existingReactionIndex = post.reactions.findIndex(r => 
        (userId && r.user && r.user.toString() === userId) ||
        (guestId && r.guestId === guestId)
      );

      if (type) {
        if (existingReactionIndex > -1) {
          post.reactions[existingReactionIndex].type = type;
        } else {
          post.reactions.push(userId ? { user: userId, type } : { guestId, type });
        }
      } else {
        if (existingReactionIndex > -1) {
          post.reactions.splice(existingReactionIndex, 1);
        }
      }

      await post.save();
      await post.populate('reactions.user', 'name');

      res.status(200).json({ success: true, data: post });
    } catch (error) {
      console.error('React post error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = postController;
