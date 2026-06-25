const router = require('express').Router();
const UserController = require('./controller');
const { adminPerm, sharedPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const { listUsersSchema, createUserSchema, updateUserSchema, changeStatusSchema, assignSupervisorSchema, idParamSchema } = require('./validator');

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users with pagination/filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: accountStatus
 *         schema: { type: string }
 *       - in: query
 *         name: cityId
 *         schema: { type: integer }
 *       - in: query
 *         name: supervisorId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Users list
 */
router.get('/', ...sharedPerm(P.USERS_READ), validate(listUsersSchema), UserController.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/:id', ...sharedPerm(P.USERS_READ), validate(idParamSchema), UserController.getById);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identityNumber, password, fullNameAr]
 *             properties:
 *               identityNumber: { type: string }
 *               password: { type: string }
 *               fullNameAr: { type: string }
 *               fullNameEn: { type: string }
 *               mobileNumber: { type: string }
 *               email: { type: string }
 *               role: { type: string }
 *               accountStatus: { type: string }
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/', ...adminMutationPerm(P.USERS_WRITE), validate(createUserSchema), UserController.create);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', ...adminMutationPerm(P.USERS_WRITE), validate(updateUserSchema), UserController.update);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Change user account status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountStatus]
 *             properties:
 *               accountStatus: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Status changed
 */
router.patch('/:id/status', ...adminMutationPerm(P.USERS_WRITE), validate(changeStatusSchema), UserController.changeStatus);

router.patch('/:id/restore', ...adminMutationPerm(P.USERS_WRITE), validate(idParamSchema), UserController.restore);

/**
 * @openapi
 * /users/{id}/assign-supervisor:
 *   patch:
 *     tags: [Users]
 *     summary: Assign supervisor to user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Supervisor assigned
 */
router.patch('/:id/assign-supervisor', ...adminMutationPerm(P.USERS_WRITE), validate(assignSupervisorSchema), UserController.assignSupervisor);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft delete user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', ...adminMutationPerm(P.USERS_WRITE), validate(idParamSchema), UserController.remove);

module.exports = router;
