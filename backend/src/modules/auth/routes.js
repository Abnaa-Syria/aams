const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const AuthController = require('./controller');
const {
  loginSchema,
  loginMobileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  adminLoginSchema,
  meSchema,
  logoutSchema,
  registerPushTokenSchema,
  removePushTokenSchema,
} = require('./validator');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again shortly' },
});
router.use(authLimiter);

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and session management
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         identityNumber: { type: string, example: "1234567890" }
 *         mobileNumber: { type: string, nullable: true }
 *         email: { type: string, nullable: true }
 *         fullNameAr: { type: string }
 *         fullNameEn: { type: string, nullable: true }
 *         role:
 *           type: string
 *           enum: [SUPER_ADMIN, OPERATIONS_ADMIN, HR_ADMIN, FLEET_ADMIN, FINANCE_ADMIN, SUPERVISOR, DRIVER]
 *         accountStatus:
 *           type: string
 *           enum: [ACTIVE, TEMPORARILY_SUSPENDED, RESTRICTED, UNDER_INVESTIGATION, PENDING_APPROVAL, INCOMPLETE_PROFILE, ARCHIVED]
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken: { type: string }
 *         refreshToken: { type: string }
 *         expiresIn: { type: string, example: "1d" }
 *     LoginPayload:
 *       type: object
 *       required: [identityNumber, password]
 *       properties:
 *         identityNumber: { type: string, maxLength: 20 }
 *         password: { type: string, format: password }
 *     MobileOtpPayload:
 *       type: object
 *       required: [mobileNumber, otp]
 *       properties:
 *         mobileNumber: { type: string, maxLength: 20 }
 *         otp: { type: string, pattern: "^\\d{6}$" }
 *     SendOtpPayload:
 *       type: object
 *       required: [mobileNumber]
 *       properties:
 *         mobileNumber: { type: string, maxLength: 20 }
 *     RefreshTokenPayload:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken: { type: string }
 *     ForgotPasswordPayload:
 *       type: object
 *       required: [identityNumber]
 *       properties:
 *         identityNumber: { type: string, maxLength: 20 }
 *     ResetPasswordPayload:
 *       type: object
 *       required: [identityNumber, otp, newPassword]
 *       properties:
 *         identityNumber: { type: string, maxLength: 20 }
 *         otp: { type: string, pattern: "^\\d{6}$" }
 *         newPassword: { type: string, minLength: 8, maxLength: 128, format: password }
 *     AuthSessionResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/AuthUser' }
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 expiresIn: { type: string }
 *     MeResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               description: Current user profile (sanitized)
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with identity number and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginPayload'
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSessionResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Account cannot sign in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema), AuthController.login);

/**
 * @openapi
 * /auth/login-mobile:
 *   post:
 *     tags: [Auth]
 *     summary: Login with mobile number and OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MobileOtpPayload'
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSessionResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login-mobile', validate(loginMobileSchema), AuthController.loginMobile);

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send a 6-digit OTP to the user's registered mobile (generic response)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpPayload'
 *     responses:
 *       200:
 *         description: Request accepted
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message: { type: string }
 *                         devOtp:
 *                           type: string
 *                           description: Only returned in development
 */
router.post('/send-otp', validate(sendOtpSchema), AuthController.sendOtp);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP without consuming it (read-only check)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MobileOtpPayload'
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         valid: { type: boolean }
 *                         reason:
 *                           type: string
 *                           nullable: true
 *                           example: expired
 */
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verifyOtp);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange refresh token for new access and refresh tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenPayload'
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken: { type: string }
 *                         refreshToken: { type: string }
 *                         expiresIn: { type: string }
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Start password reset (issues OTP on file when identity and mobile exist)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordPayload'
 *     responses:
 *       200:
 *         description: Generic acknowledgment (anti-enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Complete password reset with identity number and OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordPayload'
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       422:
 *         description: Invalid or expired verification code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login (identity number + password, admin roles only)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginPayload'
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSessionResponse'
 *       401:
 *         description: Invalid credentials or not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/admin/login', validate(adminLoginSchema), AuthController.adminLogin);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticate, validate(meSchema), AuthController.me);

router.put('/me', authenticate, AuthController.updateMe);
router.put('/users/:userId', authenticate, AuthController.updateUser);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (client should discard tokens; server records audit)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authenticate, validate(logoutSchema), AuthController.logout);

/**
 * @openapi
 * /auth/push-token:
 *   post:
 *     tags: [Auth]
 *     summary: Register device push token (Expo / FCM legacy)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *               provider: { type: string, enum: [EXPO, FCM_LEGACY, WEB_PUSH, CUSTOM] }
 *     responses:
 *       201:
 *         description: Registered
 *   delete:
 *     tags: [Auth]
 *     summary: Remove push token (e.g. on logout)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Removed
 */
router.post('/push-token', authenticate, validate(registerPushTokenSchema), AuthController.registerPushToken);
router.delete('/push-token', authenticate, validate(removePushTokenSchema), AuthController.removePushToken);

module.exports = router;
