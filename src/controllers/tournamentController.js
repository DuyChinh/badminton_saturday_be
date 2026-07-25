const Tournament = require('../models/Tournament');
const Member = require('../models/Member');

const DEFAULT_TEAM_NAMES = [
  'Đôi Song Sát', 'Đôi Sát Thủ', 'Đôi Vô Địch', 'Đôi Phượng Hoàng', 
  'Đôi Sấm Sét', 'Đôi Thần Tốc', 'Đôi Rồng Lửa', 'Đôi Bão Táp'
];

const tournamentController = {
  // GET /api/tournament
  getTournament: async (req, res) => {
    try {
      let tournament = await Tournament.findOne({ isActive: true }).populate({
        path: 'teams.players',
        select: 'name avatarUrl memberCode username'
      });

      if (!tournament) {
        // Create initial empty active tournament
        tournament = new Tournament({
          title: 'Giải Cầu Lông Sát Thủ',
          season: 'Season Mới',
          isActive: true,
          teams: [],
          matches: []
        });
        await tournament.save();
      }

      // Calculate standings (BXH) for group stage
      const standingsMap = {};

      tournament.teams.forEach(team => {
        standingsMap[team._id.toString()] = {
          teamId: team._id,
          name: team.name,
          players: team.players,
          played: 0,
          wins: 0,
          losses: 0,
          pointsScored: 0,
          pointsConceded: 0,
          scoreDiff: 0,
          points: 0
        };
      });

      // Process completed group matches
      tournament.matches.forEach(match => {
        if (match.stage === 'group' && match.status === 'completed' && match.teamA && match.teamB) {
          const tA = standingsMap[match.teamA.toString()];
          const tB = standingsMap[match.teamB.toString()];

          if (tA && tB) {
            tA.played += 1;
            tB.played += 1;

            tA.pointsScored += match.scoreA;
            tA.pointsConceded += match.scoreB;

            tB.pointsScored += match.scoreB;
            tB.pointsConceded += match.scoreA;

            if (match.scoreA > match.scoreB) {
              tA.wins += 1;
              tA.points += 3; // 3 points per win
              tB.losses += 1;
            } else if (match.scoreB > match.scoreA) {
              tB.wins += 1;
              tB.points += 3;
              tA.losses += 1;
            }
          }
        }
      });

      // Calculate scoreDiff and convert to array
      const standings = Object.values(standingsMap).map(t => {
        t.scoreDiff = t.pointsScored - t.pointsConceded;
        return t;
      });

      // Sort by: Points (desc) -> Wins (desc) -> Score Difference (desc) -> Points Scored (desc)
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
        return b.pointsScored - a.pointsScored;
      });

      res.status(200).json({
        success: true,
        data: {
          tournament,
          standings
        }
      });
    } catch (error) {
      console.error('Get tournament error:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy thông tin giải đấu' });
    }
  },

  // POST /api/tournament/pair-teams (Admin)
  // Body: { memberIds: [] }
  pairTeamsRandomly: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền chia cặp' });
      }

      const { memberIds } = req.body;
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
        return res.status(400).json({ message: 'Vui lòng chọn ít nhất 2 thành viên' });
      }

      // Fetch member documents
      const members = await Member.find({ _id: { $in: memberIds } });
      
      // Shuffle members randomly (Fisher-Yates shuffle)
      const shuffled = [...members];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Group into pairs (2 players per team)
      const newTeams = [];
      let nameIndex = 0;

      for (let i = 0; i < shuffled.length; i += 2) {
        const teamPlayers = [shuffled[i]._id];
        if (i + 1 < shuffled.length) {
          teamPlayers.push(shuffled[i + 1]._id);
        }

        const teamName = DEFAULT_TEAM_NAMES[nameIndex] || `Đội ${nameIndex + 1}`;
        nameIndex++;

        newTeams.push({
          name: teamName,
          players: teamPlayers
        });
      }

      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament) {
        tournament = new Tournament({ isActive: true });
      }

      tournament.teams = newTeams;
      tournament.matches = []; // Reset matches when re-pairing teams
      await tournament.save();

      await tournament.populate({
        path: 'teams.players',
        select: 'name avatarUrl memberCode username'
      });

      res.status(200).json({
        success: true,
        message: `Đã chia thành công ${newTeams.length} cặp đấu ngẫu nhiên`,
        teams: tournament.teams
      });
    } catch (error) {
      console.error('Pair teams error:', error);
      res.status(500).json({ message: 'Lỗi server khi chia cặp' });
    }
  },

  // PUT /api/tournament/teams (Admin)
  // Body: { teams: [{ _id?, name, players: [] }] }
  updateTeams: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền sửa danh sách cặp đấu' });
      }

      const { teams } = req.body;
      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament) {
        return res.status(404).json({ message: 'Không tìm thấy giải đấu' });
      }

      tournament.teams = teams;
      await tournament.save();
      await tournament.populate({
        path: 'teams.players',
        select: 'name avatarUrl memberCode username'
      });

      res.status(200).json({ success: true, message: 'Cập nhật danh sách đội thành công', teams: tournament.teams });
    } catch (error) {
      console.error('Update teams error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // POST /api/tournament/generate-schedule (Admin)
  // Generates round-robin fixtures for group stage
  generateGroupSchedule: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền tạo lịch thi đấu' });
      }

      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament || tournament.teams.length < 2) {
        return res.status(400).json({ message: 'Cần ít nhất 2 đội để tạo lịch thi đấu' });
      }

      const teams = tournament.teams;
      const groupMatches = [];
      let roundCount = 1;

      // Round-robin algorithm: every team plays every other team once
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          groupMatches.push({
            stage: 'group',
            round: roundCount++,
            teamA: teams[i]._id,
            teamB: teams[j]._id,
            teamAName: teams[i].name,
            teamBName: teams[j].name,
            scoreA: 0,
            scoreB: 0,
            status: 'scheduled'
          });
        }
      }

      // Keep existing knockout matches if any, replace group matches
      const knockoutMatches = tournament.matches.filter(m => m.stage !== 'group');
      tournament.matches = [...groupMatches, ...knockoutMatches];

      await tournament.save();

      res.status(200).json({
        success: true,
        message: `Đã tạo thành công ${groupMatches.length} trận đấu vòng bảng (Vòng tròn 1 lượt)`,
        tournament
      });
    } catch (error) {
      console.error('Generate schedule error:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo lịch thi đấu' });
    }
  },

  // POST /api/tournament/setup-knockout (Admin)
  // Body: { semi1TeamA, semi1TeamB, semi2TeamA, semi2TeamB }
  setupKnockout: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền thiết lập vòng Knockout' });
      }

      const { semi1TeamA, semi1TeamB, semi2TeamA, semi2TeamB } = req.body;
      let tournament = await Tournament.findOne({ isActive: true });

      if (!tournament) {
        return res.status(404).json({ message: 'Không tìm thấy giải đấu' });
      }

      // Remove previous knockout matches
      tournament.matches = tournament.matches.filter(m => m.stage === 'group');

      // Create Final Match first so we have its ID
      const finalMatch = {
        stage: 'final',
        teamAName: 'Thắng Bán Kết 1',
        teamBName: 'Thắng Bán Kết 2',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled'
      };

      tournament.matches.push(finalMatch);
      const savedFinal = tournament.matches[tournament.matches.length - 1];

      // Helper to find team document by id
      const getTeamObj = (id) => tournament.teams.id(id);

      const tS1A = getTeamObj(semi1TeamA);
      const tS1B = getTeamObj(semi1TeamB);
      const tS2A = getTeamObj(semi2TeamA);
      const tS2B = getTeamObj(semi2TeamB);

      // Create Semi-final 1 & 2
      const semi1 = {
        stage: 'semi_final',
        round: 1,
        teamA: tS1A ? tS1A._id : null,
        teamB: tS1B ? tS1B._id : null,
        teamAName: tS1A ? tS1A.name : 'Đội Bán Kết 1A',
        teamBName: tS1B ? tS1B.name : 'Đội Bán Kết 1B',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        nextMatchId: savedFinal._id,
        nextMatchSlot: 'teamA'
      };

      const semi2 = {
        stage: 'semi_final',
        round: 2,
        teamA: tS2A ? tS2A._id : null,
        teamB: tS2B ? tS2B._id : null,
        teamAName: tS2A ? tS2A.name : 'Đội Bán Kết 2A',
        teamBName: tS2B ? tS2B.name : 'Đội Bán Kết 2B',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        nextMatchId: savedFinal._id,
        nextMatchSlot: 'teamB'
      };

      tournament.matches.push(semi1, semi2);
      await tournament.save();

      res.status(200).json({ success: true, message: 'Đã khởi tạo xong Bán kết & Chung kết', tournament });
    } catch (error) {
      console.error('Setup knockout error:', error);
      res.status(500).json({ message: 'Lỗi server khi thiết lập Knockout' });
    }
  },

  // PUT /api/tournament/matches/:matchId (Admin)
  // Body: { scoreA, scoreB, status, teamA?, teamB? }
  updateMatchScore: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền cập nhật tỉ số' });
      }

      const { matchId } = req.params;
      const { scoreA, scoreB, status, teamA, teamB } = req.body;

      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament) {
        return res.status(404).json({ message: 'Không tìm thấy giải đấu' });
      }

      const match = tournament.matches.id(matchId);
      if (!match) {
        return res.status(404).json({ message: 'Không tìm thấy trận đấu' });
      }

      if (scoreA !== undefined) match.scoreA = Number(scoreA);
      if (scoreB !== undefined) match.scoreB = Number(scoreB);
      if (status) match.status = status;

      if (teamA) {
        match.teamA = teamA;
        const t = tournament.teams.id(teamA);
        if (t) match.teamAName = t.name;
      }

      if (teamB) {
        match.teamB = teamB;
        const t = tournament.teams.id(teamB);
        if (t) match.teamBName = t.name;
      }

      // Check winner if completed
      if (match.status === 'completed') {
        let winningTeamId = null;
        let winningTeamName = '';

        if (match.scoreA > match.scoreB) {
          winningTeamId = match.teamA;
          winningTeamName = match.teamAName;
        } else if (match.scoreB > match.scoreA) {
          winningTeamId = match.teamB;
          winningTeamName = match.teamBName;
        }

        match.winnerTeamId = winningTeamId;
        match.winner = winningTeamName;

        // AUTO ADVANCE: If this is a semi-final match with nextMatchId, populate final match slot
        if (match.stage === 'semi_final' && match.nextMatchId && winningTeamId) {
          const finalMatch = tournament.matches.id(match.nextMatchId);
          if (finalMatch) {
            if (match.nextMatchSlot === 'teamA') {
              finalMatch.teamA = winningTeamId;
              finalMatch.teamAName = winningTeamName;
            } else if (match.nextMatchSlot === 'teamB') {
              finalMatch.teamB = winningTeamId;
              finalMatch.teamBName = winningTeamName;
            }
          }
        }
      }

      await tournament.save();

      res.status(200).json({ success: true, message: 'Cập nhật trận đấu thành công', tournament });
    } catch (error) {
      console.error('Update match score error:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật tỉ số' });
    }
  },

  // POST /api/tournament/reset-all (Admin)
  resetAll: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền reset giải đấu' });
      }

      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament) {
        return res.status(404).json({ message: 'Không tìm thấy giải đấu' });
      }

      tournament.teams = [];
      tournament.matches = [];
      await tournament.save();

      res.status(200).json({ success: true, message: 'Đã reset toàn bộ danh sách cặp đấu và tỉ số', tournament });
    } catch (error) {
      console.error('Reset tournament error:', error);
      res.status(500).json({ message: 'Lỗi server khi reset giải đấu' });
    }
  },

  // POST /api/tournament/reset-scores (Admin)
  resetScores: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới có quyền reset tỉ số' });
      }

      let tournament = await Tournament.findOne({ isActive: true });
      if (!tournament) {
        return res.status(404).json({ message: 'Không tìm thấy giải đấu' });
      }

      tournament.matches.forEach(m => {
        m.scoreA = 0;
        m.scoreB = 0;
        m.status = 'scheduled';
        m.winner = '';
        m.winnerTeamId = null;
      });

      await tournament.save();

      res.status(200).json({ success: true, message: 'Đã reset toàn bộ tỉ số trận đấu', tournament });
    } catch (error) {
      console.error('Reset scores error:', error);
      res.status(500).json({ message: 'Lỗi server khi reset tỉ số' });
    }
  }
};

module.exports = tournamentController;
