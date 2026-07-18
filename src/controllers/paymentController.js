const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const config = require('../config');

const paymentController = {
  /**
   * GET /api/payments/qr/:memberId
   * Public - Trả thông tin tạo QR VietQR cho thành viên
   */
  getQRInfo: async (req, res) => {
    try {
      const member = await Member.findById(req.params.memberId);
      if (!member) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }

      if (member.paymentStatus === 'paid' || member.amountDue <= 0) {
        return res.status(400).json({ message: 'Thành viên này đã thanh toán' });
      }

      // Build transfer description
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}/${month}/${year}`;

      const transferDescription = `CAULONG ${member.memberCode} chuyen tien cau ngay ${dateStr}`;

      // Build VietQR URL
      const bankCode = config.SEPAY.bankCode;
      const bankAccount = config.SEPAY.bankAccount;
      const amount = member.amountDue;
      const encodedDescription = encodeURIComponent(transferDescription);

      const qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodedDescription}&accountName=${encodeURIComponent(config.SEPAY.accountName)}`;

      res.status(200).json({
        success: true,
        data: {
          member: {
            id: member._id,
            name: member.name,
            memberCode: member.memberCode,
            amountDue: member.amountDue
          },
          payment: {
            bankCode,
            bankAccount,
            bankName: config.SEPAY.bankName,
            accountName: config.SEPAY.accountName,
            amount,
            transferDescription,
            qrUrl
          }
        }
      });
    } catch (error) {
      console.error('Get QR info error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /**
   * POST /api/payments/sepay-webhook
   * SePay Webhook - Nhận thông báo khi có giao dịch
   * 
   * SePay payload example:
   * {
   *   "id": 93166,
   *   "gateway": "MBBank",
   *   "transactionDate": "2024-07-15 10:20:30",
   *   "accountNumber": "0962470964046722",
   *   "code": null,
   *   "content": "CAULONG DUYCHINH chuyen tien cau ngay 15/07/2024",
   *   "transferType": "in",
   *   "transferAmount": 50000,
   *   "accumulated": 500000,
   *   "subAccount": null,
   *   "referenceCode": "FT24197xxxx",
   *   "description": ""
   * }
   */
  sepayWebhook: async (req, res) => {
    try {
      const data = req.body;

      // Xác thực API Key từ SePay
      const authHeader = req.headers['authorization'];
      const apiKey = config.SEPAY.apiKey;

      if (apiKey && (!authHeader || !authHeader.includes(apiKey))) {
        console.warn('⚠️ SePay Webhook: Unauthorized. API Key mismatch.');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      console.log('📥 SePay Webhook received:', JSON.stringify(data, null, 2));

      const {
        id: sepayId,
        gateway,
        transactionDate,
        content,
        transferType,
        transferAmount,
        referenceCode
      } = data;

      // Only process incoming transfers
      if (transferType && transferType !== 'in') {
        console.log('⏭️ Skipping non-incoming transfer');
        return res.status(200).json({ success: true, message: 'Not an incoming transfer' });
      }

      // Prevent duplicate processing
      if (sepayId) {
        const existingTx = await Transaction.findOne({ sepayTransactionId: String(sepayId) });
        if (existingTx) {
          console.log('⏭️ Duplicate webhook, already processed:', sepayId);
          return res.status(200).json({ success: true, message: 'Already processed' });
        }
      }

      // Extract memberCode from content using regex
      // Pattern: "CAULONG MEMBERCODE ..."
      const match = content ? content.match(/CAULONG\s+([A-Za-z0-9]+)/i) : null;

      if (!match) {
        console.log('⚠️ No CAULONG pattern found in content:', content);
        // Still log the transaction as unmatched
        await Transaction.create({
          memberCode: '',
          amount: transferAmount,
          transactionContent: content || '',
          sepayTransactionId: String(sepayId || ''),
          gateway: gateway || '',
          transactionDate: transactionDate || '',
          referenceCode: referenceCode || '',
          status: 'unmatched'
        });
        return res.status(200).json({ success: true, message: 'No matching content' });
      }

      const memberCode = match[1].toUpperCase();
      console.log('🔍 Extracted memberCode:', memberCode);

      // Find member by memberCode
      const member = await Member.findOne({ memberCode });

      if (!member) {
        console.log('⚠️ Member not found for code:', memberCode);
        await Transaction.create({
          memberCode,
          amount: transferAmount,
          transactionContent: content,
          sepayTransactionId: String(sepayId || ''),
          gateway: gateway || '',
          transactionDate: transactionDate || '',
          referenceCode: referenceCode || '',
          status: 'unmatched'
        });
        return res.status(200).json({ success: true, message: 'Member not found' });
      }

      // Check if payment amount is sufficient
      const amount = parseFloat(transferAmount);

      // Save transaction log
      const transaction = await Transaction.create({
        memberId: member._id,
        memberCode,
        amount,
        transactionContent: content,
        sepayTransactionId: String(sepayId || ''),
        gateway: gateway || '',
        transactionDate: transactionDate || '',
        referenceCode: referenceCode || '',
        status: 'success',
        matchedAmountDue: member.amountDue
      });

      // Update member payment status if amount is sufficient
      if (amount >= member.amountDue) {
        member.amountDue = 0;
        member.paymentStatus = 'paid';
        await member.save();
        console.log(`✅ Member ${member.name} (${memberCode}) marked as PAID`);
      } else {
        // Partial payment - reduce the amount due
        member.amountDue = member.amountDue - amount;
        await member.save();
        console.log(`⚠️ Partial payment for ${member.name}: paid ${amount}, remaining ${member.amountDue}`);
      }

      return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

    } catch (error) {
      console.error('❌ SePay Webhook Error:', error);
      // Always return 200 to SePay to prevent retries
      return res.status(200).json({ success: false, message: 'Internal error' });
    }
  },

  /**
   * GET /api/payments/transactions
   * Admin - Lấy lịch sử giao dịch
   */
  getTransactions: async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [transactions, total] = await Promise.all([
        Transaction.find()
          .populate('memberId', 'name memberCode')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Transaction.countDocuments()
      ]);

      res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = paymentController;
