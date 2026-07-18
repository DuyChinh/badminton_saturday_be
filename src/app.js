const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const configureRoutes = require('./routes/index');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🏸 Badminton Payment Server is running!',
    version: 'v1',
    status: 'healthy'
  });
});

// Routes
configureRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = config.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🏸 Server is running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`💳 Webhook: POST http://localhost:${PORT}/api/payments/sepay-webhook`);
  });
});

module.exports = app;
