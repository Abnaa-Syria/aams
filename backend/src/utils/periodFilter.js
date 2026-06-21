/** Resolve period start date for week | month | year filters (mobile-friendly). */
function resolvePeriodStartDate(period = 'month', now = new Date()) {
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

module.exports = { resolvePeriodStartDate };
