const mongoose = require('mongoose');

const gameSettingSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  manualGame: {
    type: String,
    enum: ['wheel', 'cards', 'boxes'],
    default: 'wheel'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GameSetting', gameSettingSchema);
