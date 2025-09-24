import logger from "#config/logger.js";
import { db } from "#config/database.js";
import { users } from "#models/user.model.js";
import { eq } from "drizzle-orm";

export const getAllUsers = async () => {
    try {
        return await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users);
    } catch (e) {
        logger.error('Error getting users', e);
        throw e;
    }
};

export const getUserById = async (id) => {
    try {
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return user || null;
    } catch (e) {
        logger.error(`Error getting user by id: ${id}`, e);
        throw e;
    }
};

export const updateUser = async (id, updates) => {
    try {
        // Ensure the user exists
        const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (!existing) throw new Error('User not found');

        // Only allow updating specific fields
        const allowed = {};
        if (typeof updates.name === 'string') allowed.name = updates.name;
        if (typeof updates.email === 'string') allowed.email = updates.email;
        if (typeof updates.role === 'string') allowed.role = updates.role;

        if (Object.keys(allowed).length === 0) {
            // Nothing to update
            return {
                id: existing.id,
                name: existing.name,
                email: existing.email,
                role: existing.role,
                created_at: existing.created_at,
                updated_at: existing.updated_at,
            };
        }

        const [updated] = await db
            .update(users)
            .set({ ...allowed, updated_at: new Date() })
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                created_at: users.created_at,
                updated_at: users.updated_at,
            });

        logger.info(`User updated successfully: id=${id}`);
        return updated;
    } catch (e) {
        logger.error(`Error updating user id=${id}`, e);
        throw e;
    }
};

export const deleteUser = async (id) => {
    try {
        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

        if (!deleted) throw new Error('User not found');

        logger.info(`User deleted successfully: id=${id}`);
        return deleted;
    } catch (e) {
        logger.error(`Error deleting user id=${id}`, e);
        throw e;
    }
};
