const { z } = require('zod');

const emptyObject = z.object({}).strict();

/** Express may omit body on GET or empty POST; normalize to {} for strict empty object. */
const emptyBody = z.preprocess(
  (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
  emptyObject
);

const loginSchema = z.object({
  body: z.object({
    identityNumber: z.string().trim().min(1, 'Identity number is required').max(20),
    password: z.string().min(1, 'Password is required'),
  }),
  query: emptyObject,
  params: emptyObject,
});

const loginMobileSchema = z.object({
  body: z.object({
    mobileNumber: z.string().trim().min(1, 'Mobile number is required').max(20),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  query: emptyObject,
  params: emptyObject,
});

const sendOtpSchema = z.object({
  body: z.object({
    mobileNumber: z.string().trim().min(1, 'Mobile number is required').max(20),
  }),
  query: emptyObject,
  params: emptyObject,
});

const verifyOtpSchema = z.object({
  body: z.object({
    mobileNumber: z.string().trim().min(1, 'Mobile number is required').max(20),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  query: emptyObject,
  params: emptyObject,
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
  query: emptyObject,
  params: emptyObject,
});

const forgotPasswordSchema = z.object({
  body: z.object({
    identityNumber: z.string().trim().min(1, 'Identity number is required').max(20),
  }),
  query: emptyObject,
  params: emptyObject,
});

const resetPasswordSchema = z.object({
  body: z.object({
    identityNumber: z.string().trim().min(1, 'Identity number is required').max(20),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),
  query: emptyObject,
  params: emptyObject,
});

const adminLoginSchema = z.object({
  body: z.object({
    identityNumber: z.string().trim().min(1, 'Identity number is required').max(20),
    password: z.string().min(1, 'Password is required'),
  }),
  query: emptyObject,
  params: emptyObject,
});

const meSchema = z.object({
  body: emptyBody,
  query: emptyObject,
  params: emptyObject,
});

const logoutSchema = z.object({
  body: emptyBody,
  query: emptyObject,
  params: emptyObject,
});

const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().trim().min(10, 'Token is required').max(512),
    provider: z.enum(['EXPO', 'FCM_LEGACY', 'WEB_PUSH', 'CUSTOM']).optional(),
  }),
  query: emptyObject,
  params: emptyObject,
});

const removePushTokenSchema = z.object({
  body: z.object({
    token: z.string().trim().min(10, 'Token is required').max(512),
  }),
  query: emptyObject,
  params: emptyObject,
});

module.exports = {
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
};
