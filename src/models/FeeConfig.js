const mongoose = require('mongoose');

const feeConfigSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    default: '18/07/2026'
  },
  courtFee: {
    type: String,
    required: true,
    default: '100k'
  },
  shuttleFee: {
    type: String,
    required: true,
    default: '100k'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeeConfig', feeConfigSchema);
