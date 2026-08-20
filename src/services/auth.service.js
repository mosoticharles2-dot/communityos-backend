import { getDb } from '../db/connection.js';

export const AuthService = {
  /**
   * Link a Supabase user to the local user table and assign roles.
   * supabaseUser: object from Supabase auth (id, email, user_metadata)
   * tenantId: string
   * roles: array of { role: 'RESIDENT'|'MANAGER'..., resourceId? }
   */
  async linkUser(supabaseUser, tenantId, roles = []) {
    const prisma = getDb();

    // Upsert user by supabase id (we store supabase id in id field)
    const data = {
      id: supabaseUser.id,
      tenantId,
      email: supabaseUser.email,
      fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
      phone: supabaseUser.user_metadata?.phone || null,
      isActive: true,
    };

    // Use upsert-like behavior
    const existing = await prisma.user.findUnique({ where: { id: supabaseUser.id } });
    if (!existing) {
      await prisma.user.create({ data });
    } else {
      await prisma.user.update({ where: { id: supabaseUser.id }, data });
    }

    // Assign roles if provided
    for (const r of roles) {
      // Avoid duplicate roles
      const exists = await prisma.userRole.findFirst({
        where: { userId: supabaseUser.id, role: r.role, resourceId: r.resourceId || null },
      });
      if (!exists) {
        await prisma.userRole.create({
          data: {
            userId: supabaseUser.id,
            tenantId,
            role: r.role,
            resourceId: r.resourceId || null,
          },
        });
      }
    }

    return await prisma.user.findUnique({ where: { id: supabaseUser.id } });
  },
};
