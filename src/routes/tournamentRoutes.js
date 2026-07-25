const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route
router.get('/', tournamentController.getTournament);

// Admin routes
router.post('/pair-teams', authMiddleware, tournamentController.pairTeamsRandomly);
router.put('/teams', authMiddleware, tournamentController.updateTeams);
router.post('/generate-schedule', authMiddleware, tournamentController.generateGroupSchedule);
router.post('/setup-knockout', authMiddleware, tournamentController.setupKnockout);
router.put('/matches/:matchId', authMiddleware, tournamentController.updateMatchScore);
router.post('/reset-all', authMiddleware, tournamentController.resetAll);
router.post('/reset-scores', authMiddleware, tournamentController.resetScores);

module.exports = router;
