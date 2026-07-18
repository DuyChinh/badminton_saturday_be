const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  memberCode: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  transactionContent: {
    type: String,
    default: ''
  },
  sepayTransactionId: {
    type: String,
    default: ''
  },
  gateway: {
    type: String,
    default: ''
  },
  transactionDate: {
    type: String,
    default: ''
  },
  referenceCode: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['success', 'unmatched', 'failed'],
    default: 'success'
  },
  matchedAmountDue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for preventing duplicate webhook processing
TransactionSchema.index({ sepayTransactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
