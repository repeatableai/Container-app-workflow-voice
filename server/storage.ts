import {
  users,
  containers,
  userPermissions,
  type User,
  type UpsertUser,
  type Container,
  type InsertContainer,
  type UserPermission,
  type InsertUserPermission,
  type UpdateUserPermission,
  type ContainerStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, inArray, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Container operations
  getContainers(filters?: {
    type?: string;
    industry?: string;
    department?: string;
    visibility?: string;
    search?: string;
    userId?: string;
  }): Promise<Container[]>;
  getContainerById(id: string): Promise<Container | undefined>;
  createContainer(container: InsertContainer): Promise<Container>;
  updateContainer(id: string, updates: Partial<InsertContainer>): Promise<Container>;
  deleteContainer(id: string): Promise<void>;
  incrementContainerViews(id: string): Promise<void>;
  
  // Permission operations
  getUserPermissions(userId: string): Promise<UserPermission | undefined>;
  upsertUserPermissions(permissions: InsertUserPermission): Promise<UserPermission>;
  updateUserPermissions(updates: UpdateUserPermission): Promise<UserPermission>;
  
  // Statistics
  getContainerStats(): Promise<ContainerStats>;
  
  // Filter options
  getIndustries(): Promise<string[]>;
  getDepartments(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
      
    // Create default permissions for new users
    await this.upsertUserPermissions({
      userId: user.id,
      canAccessApps: true,
      canAccessVoices: true,
      canAccessWorkflows: true,
    });
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getContainers(filters?: {
    type?: string;
    industry?: string;
    department?: string;
    visibility?: string;
    search?: string;
    userId?: string;
  }): Promise<Container[]> {
    let query = db.select().from(containers);
    const conditions: any[] = [];

    if (filters?.type) {
      conditions.push(eq(containers.type, filters.type as any));
    }
    
    if (filters?.industry) {
      conditions.push(eq(containers.industry, filters.industry));
    }
    
    if (filters?.department) {
      conditions.push(eq(containers.department, filters.department));
    }
    
    if (filters?.visibility) {
      conditions.push(eq(containers.visibility, filters.visibility as any));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(${containers.title} ILIKE ${`%${filters.search}%`} OR ${containers.description} ILIKE ${`%${filters.search}%`})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(containers.createdAt));
  }

  async getContainerById(id: string): Promise<Container | undefined> {
    const [container] = await db.select().from(containers).where(eq(containers.id, id));
    return container;
  }

  async createContainer(container: InsertContainer): Promise<Container> {
    const [newContainer] = await db
      .insert(containers)
      .values(container)
      .returning();
    return newContainer;
  }

  async updateContainer(id: string, updates: Partial<InsertContainer>): Promise<Container> {
    const [updatedContainer] = await db
      .update(containers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(containers.id, id))
      .returning();
    return updatedContainer;
  }

  async deleteContainer(id: string): Promise<void> {
    await db.delete(containers).where(eq(containers.id, id));
  }

  async incrementContainerViews(id: string): Promise<void> {
    await db
      .update(containers)
      .set({ views: sql`${containers.views} + 1` })
      .where(eq(containers.id, id));
  }

  async getUserPermissions(userId: string): Promise<UserPermission | undefined> {
    const [permissions] = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
    return permissions;
  }

  async upsertUserPermissions(permissions: InsertUserPermission): Promise<UserPermission> {
    const [upsertedPermissions] = await db
      .insert(userPermissions)
      .values(permissions)
      .onConflictDoUpdate({
        target: userPermissions.userId,
        set: {
          ...permissions,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedPermissions;
  }

  async updateUserPermissions(updates: UpdateUserPermission): Promise<UserPermission> {
    const [updatedPermissions] = await db
      .update(userPermissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPermissions.userId, updates.userId))
      .returning();
    return updatedPermissions;
  }

  async getContainerStats(): Promise<ContainerStats> {
    const [totalContainersResult] = await db
      .select({ count: count() })
      .from(containers);
    
    const [totalViewsResult] = await db
      .select({ totalViews: sql<number>`sum(${containers.views})` })
      .from(containers);
    
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [appsResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'app'));

    const [voicesResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'voice'));

    const [workflowsResult] = await db
      .select({ count: count() })
      .from(containers)
      .where(eq(containers.type, 'workflow'));

    return {
      totalContainers: totalContainersResult.count,
      totalViews: totalViewsResult.totalViews || 0,
      activeUsers: activeUsersResult.count,
      apps: appsResult.count,
      voices: voicesResult.count,
      workflows: workflowsResult.count,
    };
  }

  async getIndustries(): Promise<string[]> {
    const result = await db
      .selectDistinct({ industry: containers.industry })
      .from(containers)
      .where(sql`${containers.industry} IS NOT NULL`);
    
    return result.map(r => r.industry).filter(Boolean) as string[];
  }

  async getDepartments(): Promise<string[]> {
    const result = await db
      .selectDistinct({ department: containers.department })
      .from(containers)
      .where(sql`${containers.department} IS NOT NULL`);
    
    return result.map(r => r.department).filter(Boolean) as string[];
  }
}

export const storage = new DatabaseStorage();
