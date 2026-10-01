const mongoose = require('mongoose');

const SpinHistorySchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  memberCode: {
    type: String,
    required: true
  },
  prizeId: {
    type: String,
    required: true
  },
  prizeLabel: {
    type: String,
    required: true
  },
  discount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['applied', 'cancelled'],
    default: 'applied'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SpinHistory', SpinHistorySchema);
