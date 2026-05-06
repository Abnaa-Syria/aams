const router = require('express').Router();
const AssetController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
} = require('./validator');

// --- ASSET CATALOG ---

router.get('/catalog', authenticate, AssetController.listAssets);
router.get('/catalog/:id', authenticate, AssetController.getAsset);

router.post(
  '/catalog',
  ...adminPerm(P.INVENTORY_WRITE),
  validate(createAssetSchema),
  AssetController.createAsset
);

router.put(
  '/catalog/:id',
  ...adminPerm(P.INVENTORY_WRITE),
  validate(updateAssetSchema),
  AssetController.updateAsset
);

// --- ASSET ASSIGNMENTS ---

router.get('/assignments', authenticate, AssetController.listAssignments);

router.post(
  '/assignments',
  ...adminPerm(P.INVENTORY_WRITE),
  upload.single('photo'),
  validate(assignAssetSchema),
  AssetController.assignAsset
);

router.patch(
  '/assignments/:id/return',
  ...adminPerm(P.INVENTORY_WRITE),
  upload.single('photo'),
  validate(returnAssetSchema),
  AssetController.returnAsset
);

module.exports = router;
