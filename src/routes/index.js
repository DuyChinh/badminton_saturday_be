const express = require('express');

const configureRoutes = (app) => {
  const api = express.Router();
  app.use('/api', api);

  api.use('/auth', require('./auth'));
  api.use('/members', require('./members'));
  api.use('/payments', require('./payments'));
  api.use('/users', require('./userRoutes'));
  api.use('/posts', require('./postRoutes'));

  // 404 handler for API routes
  api.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
};

module.exports = configureRoutes;
