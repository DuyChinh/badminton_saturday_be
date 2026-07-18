require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  SEPAY: {
    apiKey: process.env.SEPAY_API_KEY,
    bankAccount: process.env.SEPAY_BANK_ACCOUNT,
    bankCode: process.env.SEPAY_BANK_CODE,
    bankName: process.env.SEPAY_BANK_NAME,
    accountName: process.env.SEPAY_ACCOUNT_NAME,
  }
};
