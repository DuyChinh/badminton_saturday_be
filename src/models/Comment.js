const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: false
  },
  guestName: {
    type: String,
    default: 'Người lạ'
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: false
    },
    guestId: { type: String },
    guestName: { type: String },
    type: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      required: true
    }
  }]
}, { timestamps: true });

// Prevent a single user from having multiple reactions on the same comment
// This can be handled in logic, but defining index is optional.

module.exports = mongoose.model('Comment', commentSchema);
