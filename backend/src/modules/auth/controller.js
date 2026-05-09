const ApiResponse = require('../../utils/response');
const AuthService = require('./service');

class AuthController {
  static async login(req, res, next) {
    try {
      const { identityNumber, mobileNumber, iqamaNumber, password } = req.validated.body;
      const result = await AuthService.loginWithPassword(
        { identityNumber, mobileNumber, iqamaNumber },
        password,
        req
      );
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err) {
      return next(err);
    }
  }

  static async loginMobile(req, res, next) {
    try {
      const { mobileNumber, otp } = req.validated.body;
      const result = await AuthService.loginWithMobileOtp(mobileNumber, otp, req);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err) {
      return next(err);
    }
  }

  static async sendOtp(req, res, next) {
    try {
      const { mobileNumber } = req.validated.body;
      const result = await AuthService.sendOtpForMobile(mobileNumber);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async verifyOtp(req, res, next) {
    try {
      const { mobileNumber, otp } = req.validated.body;
      const result = await AuthService.verifyOtpForMobile(mobileNumber, otp);
      return ApiResponse.success(res, result, 'OTP verification result');
    } catch (err) {
      return next(err);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.validated.body;
      const result = await AuthService.refreshTokens(refreshToken);
      return ApiResponse.success(res, result, 'Token refreshed');
    } catch (err) {
      return next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { identityNumber } = req.validated.body;
      const result = await AuthService.forgotPassword(identityNumber);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { identityNumber, otp, newPassword } = req.validated.body;
      const result = await AuthService.resetPassword(identityNumber, otp, newPassword, req);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async adminLogin(req, res, next) {
    try {
      const { identityNumber, password } = req.validated.body;
      const result = await AuthService.adminLogin(identityNumber, password, req);
      return ApiResponse.success(res, result, 'Admin login successful');
    } catch (err) {
      return next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user.id);
      return ApiResponse.success(res, user, 'Profile retrieved');
    } catch (err) {
      return next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const result = await AuthService.logout(req.user.id, req);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async registerPushToken(req, res, next) {
    try {
      const { token, provider } = req.validated.body;
      const result = await AuthService.registerPushToken(req.user.id, { token, provider });
      return ApiResponse.created(res, null, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async removePushToken(req, res, next) {
    try {
      const { token } = req.validated.body;
      const result = await AuthService.removePushToken(req.user.id, token);
      return ApiResponse.success(res, null, result.message);
    } catch (err) {
      return next(err);
    }
  }

  static async updateMe(req, res, next) {
    try {
      const user = await AuthService.updateMe(req.user.id, req.body);
      return ApiResponse.success(res, user, 'Profile updated');
    } catch (err) {
      return next(err);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.userId);
      const user = await AuthService.updateUser(userId, req.body);
      return ApiResponse.success(res, user, 'User updated');
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AuthController;
