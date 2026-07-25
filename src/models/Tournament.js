const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }]
});

const matchSchema = new mongoose.Schema({
  stage: { 
    type: String, 
    enum: ['group', 'semi_final', 'final'], 
    default: 'group' 
  },
  round: { type: Number, default: 1 },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null }, // or Team ObjectId reference
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  teamAName: { type: String, default: '' },
  teamBName: { type: String, default: '' },
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  status: { type: String, enum: ['scheduled', 'playing', 'completed'], default: 'scheduled' },
  winner: { type: String, default: '' }, // team ID or team Name
  winnerTeamId: { type: mongoose.Schema.Types.ObjectId, default: null },
  // Link to next match in knockout
  nextMatchId: { type: mongoose.Schema.Types.ObjectId, default: null },
  nextMatchSlot: { type: String, enum: ['teamA', 'teamB', ''], default: '' }
});

const tournamentSchema = new mongoose.Schema({
  title: { type: String, default: 'Giải Cầu Lông Sát Thủ' },
  season: { type: String, default: 'Season Mới' },
  isActive: { type: Boolean, default: true },
  teams: [teamSchema],
  matches: [matchSchema]
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
