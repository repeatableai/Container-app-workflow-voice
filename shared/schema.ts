import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("viewer").notNull(), // admin, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Container types enum
export const containerTypeEnum = pgEnum('container_type', ['app', 'voice', 'workflow']);

// Visibility enum
export const visibilityEnum = pgEnum('visibility', ['public', 'restricted', 'admin_only']);

// Containers table
export const containers = pgTable("containers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  type: containerTypeEnum("type").notNull(),
  industry: varchar("industry"),
  department: varchar("department"),
  visibility: visibilityEnum("visibility").default("public").notNull(),
  tags: text("tags").array(),
  views: integer("views").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User permissions table for granular access control
export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  canAccessApps: boolean("can_access_apps").default(true),
  canAccessVoices: boolean("can_access_voices").default(true), 
  canAccessWorkflows: boolean("can_access_workflows").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  containers: many(containers),
  permissions: one(userPermissions, {
    fields: [users.id],
    references: [userPermissions.userId],
  }),
}));

export const containersRelations = relations(containers, ({ one }) => ({
  creator: one(users, {
    fields: [containers.createdBy],
    references: [users.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContainerSchema = createInsertSchema(containers).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserPermissionSchema = insertUserPermissionSchema.partial().extend({
  userId: z.string(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Container = typeof containers.$inferSelect;
export type InsertContainer = z.infer<typeof insertContainerSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UpdateUserPermission = z.infer<typeof updateUserPermissionSchema>;

// Statistics type
export type ContainerStats = {
  totalContainers: number;
  totalViews: number;
  activeUsers: number;
  apps: number;
  voices: number;
  workflows: number;
};
