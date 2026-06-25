const { z } = require('zod');

const assetTypes = ['MOTORCYCLE', 'SAFETY_EQUIPMENT', 'PHONE', 'SIM_CARD', 'LICENSE_CARD', 'THERMAL_BOX', 'HELMET', 'UNIFORM', 'CHARGER', 'TABLET', 'OTHER'];

const createAssetSchema = z.object({
  body: z.object({
    nameAr: z.string().min(1).max(150),
    nameEn: z.string().max(150).optional(),
    type: z.enum(assetTypes),
    otherDetails: z.string().max(500).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateAssetSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    nameAr: z.string().min(1).max(150).optional(),
    nameEn: z.string().max(150).optional(),
    type: z.enum(assetTypes).optional(),
    otherDetails: z.string().max(500).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const assignAssetSchema = z.object({
  body: z.object({
    assetId: z.string().or(z.number()),
    userId: z.string().or(z.number()),
    condition: z.string().max(100).optional(),
    notes: z.string().optional(),
  }),
});

const returnAssetSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    condition: z.string().max(100).optional(),
    notes: z.string().optional(),
    status: z.enum(['RETURNED', 'DAMAGED', 'LOST']).optional(),
  }),
});

module.exports = {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
};
