const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const config = require('../../config');
const { logAudit } = require('../../utils/auditLogger');
const {
  AuthenticationError,
  BusinessLogicError,
  NotFoundError,
} = require('../../utils/errors');

const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'HR_ADMIN',
  'FLEET_ADMIN',
  'FINANCE_ADMIN',
]);

const BLOCKED_LOGIN_STATUSES = new Set([
  'ARCHIVED',
  'TEMPORARILY_SUSPENDED',
  'RESTRICTED',
  'UNDER_INVESTIGATION',
]);

const BCRYPT_ROUNDS = 12;

function assertJwtSecrets() {
  if (!config.jwt?.secret || !config.jwt?.refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured');
  }
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpExpiryDate() {
  const minutes = config.otp?.expiryMinutes ?? 5;
  return new Date(Date.now() + minutes * 60 * 1000);
}

function getClientMeta(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' && forwarded.split(',')[0]?.trim()) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.get('user-agent') || null;
  return { ipAddress: ip, userAgent };
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, otpCode, otpExpiresAt, ...rest } = user;
  return rest;
}

async function recordLoginActivity(userId, success, ipAddress, userAgent) {
  await prisma.loginActivity.create({
    data: {
      userId,
      success,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    },
  });
}

function assertAccountCanAuthenticate(user) {
  if (!user) throw new AuthenticationError('Invalid credentials');
  if (BLOCKED_LOGIN_STATUSES.has(user.accountStatus)) {
    throw new BusinessLogicError('Account cannot sign in with the current status');
  }
}

async function storeRefreshToken(userId, token) {
  const expiresAt = new Date();
  const days = parseInt(config.jwt.refreshExpiresIn, 10) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

class AuthService {
  static async loginWithPassword(identifiers, password, req) {
    assertJwtSecrets();
    const { ipAddress, userAgent } = getClientMeta(req);

    // Build dynamic where clause based on provided identifier
    const whereClause = { deletedAt: null };
    if (identifiers.identityNumber) {
      whereClause.identityNumber = identifiers.identityNumber;
    } else if (identifiers.mobileNumber) {
      whereClause.mobileNumber = identifiers.mobileNumber;
    } else if (identifiers.iqamaNumber) {
      // iqamaNumber maps to identityNumber in the DB (Iqama IS the identity for residents)
      whereClause.identityNumber = identifiers.iqamaNumber;
    }

    const user = await prisma.user.findFirst({ 
      where: whereClause,
      include: { appUser: true }
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await recordLoginActivity(user.id, false, ipAddress, userAgent);
      throw new AuthenticationError('Invalid credentials');
    }

    assertAccountCanAuthenticate(user);

    const appUserId = user.appUser?.id || null;
    const appRole = user.appUser?.appRole || null;

    const accessToken = jwt.sign({ 
      userId: user.id, 
      role: user.role,
      appUserId,
      appRole
    }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh', appUserId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

    await storeRefreshToken(user.id, refreshToken);

    await recordLoginActivity(user.id, true, ipAddress, userAgent);

    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  static async sendOtpForMobile(mobileNumber) {
    const user = await prisma.user.findFirst({
      where: {
        mobileNumber,
        deletedAt: null,
      },
    });

    if (!user) {
      return { message: 'If the number is registered, an OTP has been sent' };
    }

    const code = generateOtpCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: code, otpExpiresAt: otpExpiryDate() },
    });

    if (config.nodeEnv === 'development') {
      return {
        message: 'If the number is registered, an OTP has been sent',
        devOtp: code,
      };
    }

    return { message: 'If the number is registered, an OTP has been sent' };
  }

  static async verifyOtpForMobile(mobileNumber, otp) {
    const user = await prisma.user.findFirst({
      where: {
        mobileNumber,
        deletedAt: null,
      },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return { valid: false };
    }

    if (user.otpExpiresAt < new Date()) {
      return { valid: false, reason: 'expired' };
    }

    if (user.otpCode !== otp) {
      return { valid: false };
    }

    return { valid: true };
  }

  static async loginWithMobileOtp(mobileNumber, otp, req) {
    assertJwtSecrets();
    const { ipAddress, userAgent } = getClientMeta(req);

    const user = await prisma.user.findFirst({
      where: {
        mobileNumber,
        deletedAt: null,
      },
      include: { appUser: true }
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      if (user) await recordLoginActivity(user.id, false, ipAddress, userAgent);
      throw new AuthenticationError('Invalid or expired OTP');
    }

    if (user.otpExpiresAt < new Date() || user.otpCode !== otp) {
      await recordLoginActivity(user.id, false, ipAddress, userAgent);
      throw new AuthenticationError('Invalid or expired OTP');
    }

    assertAccountCanAuthenticate(user);

    const appUserId = user.appUser?.id || null;
    const appRole = user.appUser?.appRole || null;

    const accessToken = jwt.sign({ 
      userId: user.id, 
      role: user.role,
      appUserId,
      appRole 
    }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh', appUserId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

    await storeRefreshToken(user.id, refreshToken);

    await recordLoginActivity(user.id, true, ipAddress, userAgent);

    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  static async refreshTokens(refreshToken) {
    assertJwtSecrets();

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { appUser: true } } },
    });

    if (!storedToken || (storedToken.expiresAt < new Date()) || storedToken.revokedAt) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    assertAccountCanAuthenticate(storedToken.user);

    const appUserId = storedToken.user.appUser?.id || null;
    const appRole = storedToken.user.appUser?.appRole || null;

    const accessToken = jwt.sign({ 
      userId: storedToken.userId, 
      role: storedToken.user.role,
      appUserId,
      appRole 
    }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const newRefreshToken = jwt.sign(
      { userId: storedToken.userId, type: 'refresh', appUserId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Rotate tokens: delete old one and store new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await storeRefreshToken(storedToken.userId, newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  static async forgotPassword(identityNumber) {
    const user = await prisma.user.findFirst({
      where: { identityNumber, deletedAt: null },
    });

    if (!user) {
      return { message: 'If the account exists, further instructions have been sent' };
    }

    if (!user.mobileNumber) {
      return { message: 'If the account exists, further instructions have been sent' };
    }

    const code = generateOtpCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: code, otpExpiresAt: otpExpiryDate() },
    });

    if (config.nodeEnv === 'development') {
      return {
        message: 'If the account exists, further instructions have been sent',
        devOtp: code,
      };
    }

    return { message: 'If the account exists, further instructions have been sent' };
  }

  static async resetPassword(identityNumber, otp, newPassword, req) {
    const { ipAddress, userAgent } = getClientMeta(req);

    const user = await prisma.user.findFirst({
      where: { identityNumber, deletedAt: null },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new BusinessLogicError('Invalid or expired verification code');
    }

    if (user.otpExpiresAt < new Date() || user.otpCode !== otp) {
      throw new BusinessLogicError('Invalid or expired verification code');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      newValue: { via: 'otp' },
      ipAddress,
      userAgent,
    });

    return { message: 'Password updated successfully' };
  }

  static async adminLogin(identityNumber, password, req) {
    assertJwtSecrets();
    const { ipAddress, userAgent } = getClientMeta(req);

    const user = await prisma.user.findFirst({
      where: { identityNumber, deletedAt: null },
      include: { appUser: true }
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!ADMIN_ROLES.has(user.role)) {
      throw new AuthenticationError('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await recordLoginActivity(user.id, false, ipAddress, userAgent);
      throw new AuthenticationError('Invalid credentials');
    }

    assertAccountCanAuthenticate(user);

    const appUserId = user.appUser?.id || null;
    const appRole = user.appUser?.appRole || null;

    const accessToken = jwt.sign({ 
      userId: user.id, 
      role: user.role,
      appUserId,
      appRole 
    }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh', appUserId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

    await storeRefreshToken(user.id, refreshToken);

    await recordLoginActivity(user.id, true, ipAddress, userAgent);

    await logAudit({
      userId: user.id,
      action: 'ADMIN_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  static async getMe(userId) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        appUser: {
          select: {
            id: true,
            appRole: true,
            availabilityStatus: true,
            employmentStatus: true,
          }
        }
      },
      select: {
        id: true,
        identityNumber: true,
        mobileNumber: true,
        email: true,
        fullNameAr: true,
        fullNameEn: true,
        gender: true,
        dateOfBirth: true,
        nationality: true,
        profileImageUrl: true,
        role: true,
        accountStatus: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Add appUserId and appRole to response
    return {
      ...user,
      appUserId: user.appUser?.id || null,
      appRole: user.appUser?.appRole || null,
    };
  }

  static async registerPushToken(userId, { token, provider }) {
    const p = provider || 'EXPO';
    await prisma.pushDeviceToken.upsert({
      where: { token },
      create: { userId, token, provider: p },
      update: { userId, provider: p },
    });
    return { message: 'Push token registered' };
  }

  static async removePushToken(userId, token) {
    const deleted = await prisma.pushDeviceToken.deleteMany({
      where: { userId, token },
    });
    return { message: deleted.count ? 'Push token removed' : 'Token not found' };
  }

  static async updateMe(userId, data) {
    const allowedFields = [
      'fullNameAr', 'fullNameEn', 'mobileNumber', 'email',
      'emergencyName', 'emergencyRelation', 'emergencyPhone',
      'profileImageUrl', 'gender', 'dateOfBirth', 'nationality'
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, identityNumber: true, mobileNumber: true, email: true,
        fullNameAr: true, fullNameEn: true, gender: true, dateOfBirth: true,
        nationality: true, profileImageUrl: true, role: true, accountStatus: true,
        emergencyName: true, emergencyRelation: true, emergencyPhone: true,
        employeeNumber: true, jobTitle: true, joinDate: true, lastLoginAt: true,
      },
    });
    return user;
  }

  static async updateUser(userId, data) {
    const allowedFields = [
      'fullNameAr', 'fullNameEn', 'mobileNumber', 'email',
      'emergencyName', 'emergencyRelation', 'emergencyPhone',
      'profileImageUrl', 'gender', 'dateOfBirth', 'nationality',
      'role', 'accountStatus', 'availabilityStatus', 'employmentStatus',
      'jobTitle', 'employeeNumber', 'joinDate', 'contractEndDate',
      'cityId', 'regionId', 'branchId', 'supervisorId', 'transportType',
      'sevenHundredNumber', 'roomNumber'
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);
    if (updateData.contractEndDate) updateData.contractEndDate = new Date(updateData.contractEndDate);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, identityNumber: true, mobileNumber: true, email: true,
        fullNameAr: true, fullNameEn: true, gender: true, dateOfBirth: true,
        nationality: true, profileImageUrl: true, role: true, accountStatus: true,
        availabilityStatus: true, employmentStatus: true, transportType: true,
        sevenHundredNumber: true, emergencyName: true, emergencyRelation: true,
        emergencyPhone: true, roomNumber: true, employeeNumber: true,
        joinDate: true, contractEndDate: true, jobTitle: true,
        cityId: true, regionId: true, branchId: true, supervisorId: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
      },
    });
    return user;
  }

  static async logout(userId, req) {
    const { ipAddress, userAgent } = getClientMeta(req);

    // Revoke all tokens for this user on logout
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await logAudit({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
    return { message: 'Logged out successfully' };
  }
}

module.exports = AuthService;
