const { z } = require('zod');

const addLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    speed: z.number().optional(),
    heading: z.number().optional(),
    recordedAt: z.string().optional(),
  }),
});

const bulkAddLocationSchema = z.object({
  body: z.object({
    locations: z.array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        recordedAt: z.string().optional(),
      })
    ).min(1).max(50),
  }),
});

const createZoneSchema = z.object({
  body: z.object({
    nameAr: z.string().min(1).max(150),
    nameEn: z.string().max(150).optional(),
    description: z.string().optional(),
    boundary: z.any(), // GeoJSON object
    isRestricted: z.boolean().optional(),
    isActive: z.boolean().optional(),
    alertMessage: z.string().max(500).optional(),
  }),
});

const updateZoneSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    nameAr: z.string().min(1).max(150).optional(),
    nameEn: z.string().max(150).optional(),
    description: z.string().optional(),
    boundary: z.any().optional(),
    isRestricted: z.boolean().optional(),
    isActive: z.boolean().optional(),
    alertMessage: z.string().max(500).optional(),
  }),
});

module.exports = {
  addLocationSchema,
  bulkAddLocationSchema,
  createZoneSchema,
  updateZoneSchema,
};
