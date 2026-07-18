const Member = require('../models/Member');
const { generateMemberCode } = require('../utils/helpers');

const memberController = {
  /**
   * GET /api/members
   * Public - Lấy danh sách tất cả thành viên
   */
  getAll: async (req, res) => {
    try {
      const members = await Member.find().sort({ name: 1 });
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * GET /api/members/:id
   * Public - Lấy thông tin 1 thành viên
   */
  getById: async (req, res) => {
    try {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }
      res.status(200).json({ success: true, data: member });
    } catch (error) {
      console.error('Get member error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * POST /api/members
   * Admin - Thêm thành viên mới
   * Body: { name, memberCode? }
   */
  create: async (req, res) => {
    try {
      const { name, memberCode } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Tên thành viên là bắt buộc' });
      }

      // Auto-generate memberCode from name if not provided
      const code = memberCode ? memberCode.toUpperCase().replace(/\s/g, '') : generateMemberCode(name);

      // Check duplicate memberCode
      const existing = await Member.findOne({ memberCode: code });
      if (existing) {
        return res.status(400).json({ message: `Mã thành viên "${code}" đã tồn tại` });
      }

      const member = await Member.create({
        name: name.trim(),
        memberCode: code,
        amountDue: 0,
        paymentStatus: 'paid'
      });

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      console.error('Create member error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Mã thành viên đã tồn tại' });
      }
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * PUT /api/members/:id
   * Admin - Cập nhật thành viên (tên, số tiền, trạng thái)
   * Body: { name?, amountDue?, paymentStatus?, weekLabel? }
   */
  update: async (req, res) => {
    try {
      const { name, amountDue, paymentStatus, weekLabel, memberCode } = req.body;
      const member = await Member.findById(req.params.id);

      if (!member) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }

      // Update name and regenerate memberCode if name changed
      if (name && name.trim()) {
        member.name = name.trim();
        if (!memberCode) {
          const newCode = generateMemberCode(name);
          // Check if the new code conflicts with another member
          const existing = await Member.findOne({ memberCode: newCode, _id: { $ne: member._id } });
          if (!existing) {
            member.memberCode = newCode;
          }
        }
      }

      if (memberCode) {
        const code = memberCode.toUpperCase().replace(/\s/g, '');
        const existing = await Member.findOne({ memberCode: code, _id: { $ne: member._id } });
        if (existing) {
          return res.status(400).json({ message: `Mã thành viên "${code}" đã tồn tại` });
        }
        member.memberCode = code;
      }

      // Update amountDue - KEY LOGIC: if amountDue > 0, set status to unpaid
      if (amountDue !== undefined) {
        member.amountDue = Number(amountDue);
        if (Number(amountDue) > 0) {
          member.paymentStatus = 'unpaid';
        } else if (Number(amountDue) === 0) {
          member.paymentStatus = 'paid';
        }
      }

      // Manual status override (if explicitly provided)
      if (paymentStatus && amountDue === undefined) {
        member.paymentStatus = paymentStatus;
      }

      if (weekLabel) {
        member.weekLabel = weekLabel;
      }

      await member.save();
      res.status(200).json({ success: true, data: member });
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * PUT /api/members/bulk-update
   * Admin - Cập nhật amountDue cho nhiều thành viên cùng lúc
   * Body: { amountDue, weekLabel?, memberIds? }
   */
  bulkUpdate: async (req, res) => {
    try {
      const { amountDue, weekLabel } = req.body;

      if (amountDue === undefined) {
        return res.status(400).json({ message: 'Số tiền là bắt buộc' });
      }

      const updateData = {
        amountDue: Number(amountDue),
        paymentStatus: Number(amountDue) > 0 ? 'unpaid' : 'paid'
      };

      if (weekLabel) {
        updateData.weekLabel = weekLabel;
      }

      const result = await Member.updateMany({}, updateData);

      res.status(200).json({
        success: true,
        message: `Đã cập nhật ${result.modifiedCount} thành viên`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * DELETE /api/members/:id
   * Admin - Xóa thành viên
   */
  delete: async (req, res) => {
    try {
      const member = await Member.findByIdAndDelete(req.params.id);
      if (!member) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }
      res.status(200).json({ success: true, message: 'Đã xóa thành viên' });
    } catch (error) {
      console.error('Delete member error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = memberController;
