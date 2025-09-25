import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.service.js';
import {
  userIdSchema,
  updateUserSchema,
} from '#validations/users.validation.js';
import { formatValidationError } from '#utils/format.js';
import { jwttoken } from '#utils/jwt.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting users... ');

    const allUsers = await getAllUsers();

    res.json({
      message: 'Successfully retrieved users',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (e) {
    logger.error(e);
    next(e);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(idValidation.error),
        });
    }

    const { id } = idValidation.data;
    logger.info(`Getting user by id: ${id}`);

    const user = await getUserByIdService(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'Successfully retrieved user', user });
  } catch (e) {
    logger.error('Error fetching user by id', e);
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    // Validate id param
    const idValidation = userIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(idValidation.error),
        });
    }
    const { id } = idValidation.data;

    // Validate body
    const bodyValidation = updateUserSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(bodyValidation.error),
        });
    }
    const updates = bodyValidation.data;

    // AuthN: require a valid token
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let authUser;
    try {
      authUser = jwttoken.verify(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // AuthZ: allow users to update only their own info; admins can update anyone
    const isSelf = Number(authUser.id) === Number(id);
    const isAdmin = authUser.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only admins can change roles
    if (Object.prototype.hasOwnProperty.call(updates, 'role') && !isAdmin) {
      return res.status(403).json({ error: 'Only admin can update role' });
    }

    const user = await updateUserService(id, updates);

    logger.info(
      `User updated: id=${id} by userId=${authUser.id} role=${authUser.role}`
    );
    return res.json({ message: 'User updated', user });
  } catch (e) {
    logger.error('Error updating user', e);
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    // Validate id param
    const idValidation = userIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res
        .status(400)
        .json({
          error: 'Validation failed',
          details: formatValidationError(idValidation.error),
        });
    }
    const { id } = idValidation.data;

    // AuthN
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let authUser;
    try {
      authUser = jwttoken.verify(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // AuthZ: user can delete self, admin can delete anyone
    const isSelf = Number(authUser.id) === Number(id);
    const isAdmin = authUser.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await deleteUserService(id);

    logger.info(
      `User deleted: id=${id} by userId=${authUser.id} role=${authUser.role}`
    );
    return res.json({ message: 'User deleted', user: deleted });
  } catch (e) {
    logger.error('Error deleting user', e);
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(e);
  }
};
