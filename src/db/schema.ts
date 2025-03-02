import {
  sqliteTable,
  integer,
  text,
  type AnySQLiteColumn,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: "cascade" }),
    name: text("name", { length: 100 }).notNull(),
    username: text("username", { length: 50 }).notNull().unique(),
    description: text("description", { length: 255 }).default(""),
    roleId: integer("role_id").references(() => roles.id, {
      onDelete: "cascade",
    }),
    github: text("github", { length: 255 }).default(""),
    phrase: text("phrase", { length: 255 }).default(""),
    primaryColor: text("primaryColor", { length: 7 }).default(""),
    secondaryColor: text("secondaryColor", { length: 7 }).default(""),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIndex: index("idx_members_name").on(table.name),
    userIdIndex: index("idx_members_user_id").on(table.userId),
  })
);

// Permssions
export const roles = sqliteTable(
  "roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull(),
    priority: integer("priority").notNull().default(1),
  },
  (table) => ({
    roleIndex: index("idx_roles_name").on(table.name),
  })
);

export const memberImages = sqliteTable(
  "member_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id")
      .notNull()
      .references((): AnySQLiteColumn => members.id, { onDelete: "cascade" }),
    imageId: integer("image_id")
      .notNull()
      .references((): AnySQLiteColumn => images.id, { onDelete: "cascade" }),
    type: text("type", { length: 50 }).default("general"),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    memberImageIndex: index("idx_member_images_member_id").on(table.memberId),
    imageIndex: index("idx_member_images_image_id").on(table.imageId),
  })
);

export const memberTags = sqliteTable(
  "member_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").references(
      (): AnySQLiteColumn => members.id,
      { onDelete: "cascade" }
    ),
    tagId: integer("tag_id").references((): AnySQLiteColumn => tags.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    memberTagIndex: index("idx_member_tags_member_id_tag_id").on(
      table.memberId,
      table.tagId
    ),
    uniqueMemberTag: unique("uq_member_tags_member_id_tag_id").on(
      table.memberId,
      table.tagId
    ),
  })
);

// Personalizacion
export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url", { length: 255 }).notNull(),
  publicId: text("public_id", { length: 255 }).default(""), // Para Cloudinary u otro servicio
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sounds = sqliteTable("sounds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url", { length: 255 }).notNull(),
  path: text("path", { length: 255 }).default(""), // Ruta en Supabase Storage u otro sistema
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const memberSounds = sqliteTable(
  "member_sounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id")
      .notNull()
      .references((): AnySQLiteColumn => members.id, { onDelete: "cascade" }),
    soundId: integer("sound_id")
      .notNull()
      .references((): AnySQLiteColumn => sounds.id, { onDelete: "cascade" }),
    type: text("type", { length: 50 }).default("general"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    memberSoundIndex: index("idx_member_sounds_member_id").on(table.memberId),
    soundIndex: index("idx_member_sounds_sound_id").on(table.soundId),
    uniqueMemberSound: unique("uq_member_sound").on(
      table.memberId,
      table.soundId
    ), // Evita duplicados
  })
);

export const badges = sqliteTable(
  "badges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull(), // Nombre de la insignia (ej. "Veteran", "Contributor")
    description: text("description", { length: 255 }).default(""), // Descripción de la insignia
  },
  (table) => ({
    badgeIndex: index("idx_badges_name").on(table.name),
  })
);

// Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // ID proporcionado por Discord
  name: text("name", { length: 100 }).default(""), // Nombre global del usuario
  username: text("username", { length: 32 }).notNull().unique(), // Identificador único de usuario
  email: text("email", { length: 255 }).unique(), // Puede ser null si Discord no lo provee
  image: text("image", { length: 255 }).default(""), // Avatar de Discord
  banner: text("banner", { length: 255 }).default(""), // URL del banner de Discord
  bannerColor: text("banner_color", { length: 7 }).default(""), // Hexadecimal del color del banner
  roleId: integer("role_id")
    .notNull()
    .references((): AnySQLiteColumn => roles.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const permissions = sqliteTable(
  "permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull().unique(),
  },
  (table) => ({
    permissionIndex: index("idx_permissions_name").on(table.name),
  })
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roleId: integer("role_id")
      .notNull()
      .references((): AnySQLiteColumn => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references((): AnySQLiteColumn => permissions.id, {
        onDelete: "cascade",
      }),
  },
  (table) => ({
    rolePermissionIndex: index("idx_role_permissions").on(
      table.roleId,
      table.permissionId
    ),
  })
);

export const bans = sqliteTable(
  "bans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: "cascade" }),
    reason: text("reason", { length: 255 }).notNull(),
    moderatorId: text("moderator_id")
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: "set null" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userBanIndex: index("idx_bans_user").on(table.userId),
  })
);

// Tabla de etiquetas
export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull(),
  },
  (table) => ({
    tagIndex: index("idx_tags_name").on(table.name),
  })
);

// Projects
export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references((): AnySQLiteColumn => users.id, {
        onDelete: "cascade",
      }), // Usuario que creó el proyecto
    title: text("title", { length: 100 }).notNull(),
    description: text("description", { length: 255 }).default(""),
    url: text("url", { length: 255 }).default(""),
    repository: text("repository", { length: 255 }).default(""),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    titleIndex: index("idx_projects_title").on(table.title),
    userIndex: index("idx_projects_user_id").on(table.userId), // Index para consultas rápidas
  })
);

export const projectImages = sqliteTable(
  "project_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(
      (): AnySQLiteColumn => projects.id,
      {
        onDelete: "cascade",
      }
    ),
    imageId: integer("image_id").references((): AnySQLiteColumn => images.id, {
      onDelete: "cascade",
    }),
    type: text("type", { length: 50 }).default("general"), // "banner", "portada", etc.
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    projectImageIndex: index("idx_project_images_project_id").on(
      table.projectId
    ),
  })
);

export const projectTags = sqliteTable(
  "project_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(
      (): AnySQLiteColumn => projects.id,
      { onDelete: "cascade" }
    ),
    tagId: integer("tag_id").references((): AnySQLiteColumn => tags.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    projectTagIndex: index("idx_project_tags_project_id_tag_id").on(
      table.projectId,
      table.tagId
    ),
    uniqueProjectTag: unique("uq_project_tags_project_id_tag_id").on(
      table.projectId,
      table.tagId
    ),
  })
);

// Discord accounts
export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references((): AnySQLiteColumn => users.id, {
      onDelete: "cascade",
    }),
    provider: text("provider", { length: 50 }).notNull(), // "discord"
    providerAccountId: text("provider_account_id", { length: 255 }).notNull(),
  },
  (table) => ({
    uniqueProviderAccount: unique("uq_accounts_provider_provider_id").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references((): AnySQLiteColumn => users.id, {
      onDelete: "cascade",
    }),
    refreshToken: text("refresh_token", { length: 255 }).notNull().unique(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userSessionIndex: index("idx_sessions_user_id").on(table.userId),
    uniqueRefreshToken: unique("uq_sessions_refresh_token").on(
      table.refreshToken
    ),
  })
);

// Likes
export const projectLikes = sqliteTable(
  "project_likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(
      (): AnySQLiteColumn => projects.id,
      {
        onDelete: "cascade",
      }
    ),
    userId: text("user_id").references((): AnySQLiteColumn => users.id, {
      onDelete: "cascade",
    }), // Solo usuarios registrados pueden dar likes
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueProjectUserLike: unique("uq_project_likes_project_id_user_id").on(
      table.projectId,
      table.userId
    ), // Un usuario solo puede dar un like por proyecto
  })
);

//
export const projectMembers = sqliteTable(
  "project_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(
      (): AnySQLiteColumn => projects.id,
      { onDelete: "cascade" }
    ),
    memberId: integer("member_id").references(
      (): AnySQLiteColumn => members.id,
      { onDelete: "cascade" }
    ),
    roleId: integer("role_id").references((): AnySQLiteColumn => roles.id, {
      onDelete: "cascade",
    }),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    projectMemberIndex: index(
      "idx_project_members_project_id_member_id_role_id"
    ).on(table.projectId, table.memberId, table.roleId),
    uniqueProjectMember: unique(
      "uq_project_members_project_id_member_id_role_id"
    ).on(table.projectId, table.memberId, table.roleId),
  })
);

// Notifications

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: "cascade" }), // Usuario que recibe la notificación
    senderId: text("sender_id").references((): AnySQLiteColumn => users.id, {
      onDelete: "set null",
    }), // Usuario que generó la notificación
    type: text("type", { length: 50 }).notNull(), // "project_invite", "like", "comment", etc.
    entityId: integer("entity_id"), // ID del recurso relacionado (ej. id del proyecto)
    message: text("message", { length: 255 }).notNull(), // Mensaje personalizado
    status: text("status", { length: 20 }).default("pending"), // "pending", "accepted", "rejected", "read"
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userNotificationIndex: index("idx_notifications_user_id").on(table.userId),
  })
);
