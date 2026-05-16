const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class TicketService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.category && { category: query.category }),
    };

    // Scoping using userId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where, skip, take: limit, orderBy: { updatedAt: 'desc' },
        include: { 
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          assignedTo: { select: { id: true, fullNameAr: true } },
          _count: { select: { messages: true } }
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, identityNumber: true, mobileNumber: true, profileImageUrl: true } },
        assignedTo: { select: { id: true, fullNameAr: true } },
        messages: {
          include: {
            sender: { select: { id: true, fullNameAr: true, profileImageUrl: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!ticket) throw new NotFoundError('Ticket');
    
    // Authorization check
    if (currentUser.appRole === 'DRIVER' && ticket.userId !== currentUser.id) {
      throw new BusinessLogicError('Unauthorized to view this ticket');
    }

    return {
      ...ticket,
      appUser: ticket.user ? { user: ticket.user } : null,
    };
  }

  static async create(userId, data) {
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category || 'OTHER',
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
      },
    });

    // Create initial message
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        message: data.description,
      }
    });

    return ticket;
  }

  static async addMessage(ticketId, senderId, data, file = null) {
    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(ticketId) } });
    if (!ticket) throw new NotFoundError('Ticket');

    let attachmentType = null;
    if (file) {
      if (file.mimetype.startsWith('image/')) attachmentType = 'IMAGE';
      else if (file.mimetype.startsWith('audio/')) attachmentType = 'VOICE';
      else attachmentType = 'DOCUMENT';
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: parseInt(ticketId),
        senderId,
        message: data.message,
        attachmentUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
        attachmentType,
        isInternal: data.isInternal === 'true' || data.isInternal === true,
      },
    });

    // Update ticket last reply timestamp and status if admin replied
    const updateData = { updatedAt: new Date(), lastReplyAt: new Date() };
    
    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { userType: true } });
    if (sender.userType !== 'APP_USER' && ticket.status === 'OPEN') {
      updateData.status = 'IN_PROGRESS';
    }

    await prisma.ticket.update({
      where: { id: parseInt(ticketId) },
      data: updateData
    });

    return message;
  }

  static async updateStatus(id, adminId, data) {
    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) throw new NotFoundError('Ticket');

    const updateData = {
      status: data.status,
      ...(data.priority && { priority: data.priority }),
      ...(data.assignedToId && { assignedToId: parseInt(data.assignedToId) }),
    };

    if (data.status === 'CLOSED' || data.status === 'RESOLVED') {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({
      userId: adminId,
      action: 'UPDATE_TICKET_STATUS',
      entity: 'Ticket',
      entityId: String(id),
      newValue: { status: data.status }
    });

    return updated;
  }
}

module.exports = TicketService;
