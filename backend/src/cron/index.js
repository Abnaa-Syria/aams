const cron = require('node-cron');
const DocumentService = require('../modules/documents/service');
const TraineeService = require('../modules/trainees/service');
const VehicleService = require('../modules/vehicles/service');
const { checkIdleDrivers, checkGpsDisconnect } = require('./trackingJobs');

/**
 * Initialize all scheduled background workers.
 */
function initCronJobs() {
  console.log('[Cron] Initializing background automation workers...');

  // 1. Daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Executing daily midnight tasks...');
    try {
      await DocumentService.checkExpiringDocuments();
    } catch (err) {
      console.error('[Cron] Error in checkExpiringDocuments:', err);
    }

    try {
      await TraineeService.checkTraineeCompletion();
    } catch (err) {
      console.error('[Cron] Error in checkTraineeCompletion:', err);
    }

    try {
      await VehicleService.checkOilChangeReminders();
    } catch (err) {
      console.error('[Cron] Error in checkOilChangeReminders:', err);
    }
  });

  // Every 15 minutes: idle / GPS disconnect alerts for active shifts
  cron.schedule('*/15 * * * *', async () => {
    try {
      const idle = await checkIdleDrivers();
      const disconnected = await checkGpsDisconnect();
      if (idle || disconnected) {
        console.log(`[Cron] Tracking alerts: idle=${idle}, gps_disconnect=${disconnected}`);
      }
    } catch (err) {
      console.error('[Cron] Error in tracking jobs:', err);
    }
  });

  // Example: Run every hour for other tasks (uncomment when needed)
  // cron.schedule('0 * * * *', async () => { ... });
  
  console.log('[Cron] Background workers initialized successfully.');
}

module.exports = { initCronJobs };
