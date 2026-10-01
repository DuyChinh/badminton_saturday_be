require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');
const SpinHistory = require('./src/models/SpinHistory');

mongoose.connect(config.MONGODB_URI)
  .then(async () => {
    const history = await SpinHistory.find({});
    console.log("Total records:", history.length);
    console.log(history);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
