const ScheduledReminderService = require('./service');
const ApiResponse = require('../../utils/response');

class ScheduledReminderController {
  static async list(req, res, next) {
    try {
      const result = await ScheduledReminderService.list(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const reminder = await ScheduledReminderService.create(req.validated.body);
      return ApiResponse.created(res, reminder, 'Scheduled reminder created');
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const reminder = await ScheduledReminderService.update(req.params.id, req.validated.body);
      return ApiResponse.success(res, reminder, 'Scheduled reminder updated');
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      await ScheduledReminderService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Scheduled reminder deleted');
    } catch (err) { next(err); }
  }
}

module.exports = ScheduledReminderController;
