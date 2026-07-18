const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Member = require('../models/Member');
const config = require('../config');

// Config cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv7w1z8si',
  api_key: process.env.CLOUDINARY_API_KEY || '983972251958653',
  api_secret: process.env.CLOUDINARY_API_SECRET || '8xGOEmGimfKV45V3zgs16lSb35c',
});

const userController = {
  // POST /api/users/login
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập username và password' });
      }

      const member = await Member.findOne({ username: username.toLowerCase() });
      if (!member) {
        return res.status(401).json({ message: 'Tài khoản không tồn tại' });
      }

      if (!member.password) {
        return res.status(401).json({ message: 'Tài khoản này chưa thiết lập mật khẩu, vui lòng liên hệ admin' });
      }

      const isMatch = await bcrypt.compare(password, member.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Mật khẩu không chính xác' });
      }

      const token = jwt.sign(
        { id: member._id, username: member.username, role: 'user' },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          id: member._id,
          name: member.name,
          username: member.username,
          memberCode: member.memberCode,
          avatarUrl: member.avatarUrl,
          amountDue: member.amountDue,
          isFirstLogin: member.isFirstLogin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // GET /api/users/me
  getMe: async (req, res) => {
    try {
      const member = await Member.findById(req.user.id).select('-password');
      if (!member) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ success: true, user: member });
    } catch (error) {
      console.error('GetMe error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // POST /api/users/avatar
  // Requires: multipart/form-data with "avatar" field
  uploadAvatar: async (req, res) => {
    try {
      // Logic for both admin updating a user or user updating themselves
      // If admin, we expect memberId in body. If user, we use req.user.id.
      let targetMemberId;
      if (req.user.role === 'admin' && req.body.memberId) {
        targetMemberId = req.body.memberId;
      } else if (req.user.role === 'user') {
        targetMemberId = req.user.id;
      } else {
        return res.status(403).json({ message: 'Không có quyền thực hiện thao tác này' });
      }

      const member = await Member.findById(targetMemberId);
      if (!member) {
        return res.status(404).json({ message: 'Không tìm thấy user' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng chọn ảnh' });
      }

      // Convert buffer to base64
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'edumap/avatars'
      });

      // Delete old avatar if exists
      if (member.avatarPublicId) {
        try {
          await cloudinary.uploader.destroy(member.avatarPublicId);
        } catch (delErr) {
          console.error('Failed to delete old avatar:', delErr);
        }
      }

      member.avatarUrl = result.secure_url;
      member.avatarPublicId = result.public_id;
      await member.save();

      res.status(200).json({
        success: true,
        message: 'Cập nhật avatar thành công',
        avatarUrl: member.avatarUrl
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ message: 'Lỗi server khi upload avatar' });
    }
  },

  // PUT /api/users/change-password
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
      }

      const member = await Member.findById(req.user.id);
      if (!member) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(oldPassword, member.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
      }

      const salt = await bcrypt.genSalt(10);
      member.password = await bcrypt.hash(newPassword, salt);
      member.isFirstLogin = false; // đánh dấu đã đổi mật khẩu
      await member.save();

      res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
    }
  }
};

module.exports = userController;
