const router = require('express').Router();
const GeofencingController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  addLocationSchema,
  bulkAddLocationSchema,
  createZoneSchema,
  updateZoneSchema,
} = require('./validator');

// --- LOCATIONS ---

router.post(
  '/locations',
  authenticate,
  validate(addLocationSchema),
  GeofencingController.logLocation
);

router.post(
  '/locations/bulk',
  authenticate,
  validate(bulkAddLocationSchema),
  GeofencingController.bulkLogLocations
);

router.get(
  '/locations/history',
  ...adminPerm(P.FLEET_READ),
  GeofencingController.getLocationHistory
);

router.get(
  '/locations/latest',
  ...adminPerm(P.FLEET_READ),
  GeofencingController.getLatestLocations
);

// --- ZONES ---

router.get('/zones', ...adminPerm(P.FLEET_READ), authenticate, GeofencingController.listZones);
router.get('/zones/:id', ...adminPerm(P.FLEET_READ), authenticate, GeofencingController.getZone);

router.post(
  '/zones',
  ...adminPerm(P.FLEET_WRITE),
  validate(createZoneSchema),
  GeofencingController.createZone
);

router.put(
  '/zones/:id',
  ...adminPerm(P.FLEET_WRITE),
  validate(updateZoneSchema),
  GeofencingController.updateZone
);

module.exports = router;
