/**
 * Remove Vietnamese diacritics and convert to uppercase code
 * "Nguyễn Văn A" → "NGUYENVANA"
 */
const removeVietnameseDiacritics = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
};

/**
 * Generate memberCode from name
 * "Đoàn Duy Chính" → "DOANDUYCHINHH"
 */
const generateMemberCode = (name) => {
  return removeVietnameseDiacritics(name);
};

/**
 * Format number as VND currency
 * 50000 → "50.000đ"
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

/**
 * Get current week label
 * → "2026-W29"
 */
const getCurrentWeekLabel = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

module.exports = {
  removeVietnameseDiacritics,
  generateMemberCode,
  formatCurrency,
  getCurrentWeekLabel
};
