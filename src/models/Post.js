const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  blocks: [{
    type: { type: String, enum: ['text', 'image'], required: true },
    content: { type: String, default: '' },
    isBold: { type: Boolean, default: false },
    fontSize: { type: String, default: 'text-base' }
  }],
  season: {
    type: String,
    default: 'Mới nhất'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
