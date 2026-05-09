const TicketService = require('./service');
const ApiResponse = require('../../utils/response');

class TicketController {
  static async list(req, res, next) {
    try {
      const result = await TicketService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const item = await TicketService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const item = await TicketService.create(req.user.id, req.body);
      return ApiResponse.created(res, item, 'Ticket created successfully');
    } catch (err) { next(err); }
  }

  static async addMessage(req, res, next) {
    try {
      const item = await TicketService.addMessage(req.params.id, req.user.id, req.body, req.file);
      return ApiResponse.created(res, item, 'Message sent successfully');
    } catch (err) { next(err); }
  }

  static async updateStatus(req, res, next) {
    try {
      const item = await TicketService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Ticket status updated');
    } catch (err) { next(err); }
  }
}

module.exports = TicketController;
