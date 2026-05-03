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

class AuthService {
  static async loginWithIdentityPassword(identityNumber, password, req) {
    assertJwtSecrets();
    const { ipAddress, userAgent } = getClientMeta(req);

    const user = await prisma.user.findFirst({
      where: {
        identityNumber,
        deletedAt: null,
      },
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

    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

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

    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

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

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh' || !decoded.userId) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    assertAccountCanAuthenticate(user);

    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const newRefreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

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

    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), otpCode: null, otpExpiresAt: null },
    });

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
        availabilityStatus: true,
        employeeNumber: true,
        joinDate: true,
        contractEndDate: true,
        jobTitle: true,
        cityId: true,
        regionId: true,
        branchId: true,
        supervisorId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
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

  static async logout(userId, req) {
    const { ipAddress, userAgent } = getClientMeta(req);
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
