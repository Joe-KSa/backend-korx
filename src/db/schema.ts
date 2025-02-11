import {
  sqliteTable,
  integer,
  text,
  type AnySQLiteColumn,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Discord authentication

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // ID proporcionado por Discord
    name: text("name", { length: 100 }).default(""), // Nombre global del usuario
    username: text("username", { length: 32 }).notNull().unique(), // Identificador único de usuario
    email: text("email", { length: 255 }).unique(), // Puede ser null si Discord no lo provee
    image: text("image", { length: 255 }).default(""), // Avatar de Discord
    banner: text("banner", { length: 255 }).default(""), // URL del banner de Discord
    bannerColor: text("banner_color", { length: 7 }).default(""), // Hexadecimal del color del banner
    writeAccess: integer("write_access").notNull().default(1), // 1 = puede escribir, 0 = solo lectura
    banned: integer("banned").notNull().default(0), // 1 = baneado, 0 = activo
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIndex: index("idx_users_email").on(table.email),
    usernameIndex: index("idx_users_username").on(table.username),
  })
);

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

// Tabla de roles
export const roles = sqliteTable(
  "roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull(),
  },
  (table) => ({
    roleIndex: index("idx_roles_name").on(table.name),
  })
);

// Tabla de miembros
export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 100 }).notNull(),
    username: text("username", { length: 50 }).notNull().unique(),
    roleId: integer("role_id").references((): AnySQLiteColumn => roles.id, {
      onDelete: "cascade",
    }),
    description: text("description", { length: 255 }).default(""),
    image: text("image", { length: 255 }).default(""),
    publicId: text("publicId", { length: 255 }).default(""),
    github: text("github", { length: 255 }).default(""),
    banner: text("banner", { length: 255 }).default(""),
    publicBannerId: text("publicBannerId", { length: 255 }).default(""),
    phrase: text("phrase", { length: 255 }).default(""),
    soundUrl: text("soundUrl", { length: 255 }).default(""),
    soundPath: text("soundPath", { length: 255 }).default(""), // Ruta en Supabase Storage
    primaryColor: text("primaryColor", { length: 25 }).default(""),
    secondaryColor: text("secondaryColor", { length: 25 }).default(""),
    hidden: integer("hidden").notNull().default(0), // 1 = oculto, 0 = visible
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
    roleIdIndex: index("idx_members_role_id").on(table.roleId),
    usernameIndex: index("idx_members_username").on(table.username),
  })
);

// Tabla de proyectos
export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").references((): AnySQLiteColumn => members.id, {
      onDelete: "cascade",
    }), // Miembro que creó el proyecto
    title: text("title", { length: 100 }).notNull(),
    description: text("description", { length: 255 }).default(""),
    url: text("url", { length: 255 }).default(""),
    repository: text("repository", { length: 255 }).default(""),
    image: text("image", { length: 255 }).default(""),
    publicId: text("publicId", { length: 255 }).notNull(),
    hidden: integer("hidden").notNull().default(0),
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
    memberIndex: index("idx_projects_member_id").on(table.memberId), // Index para consultas rápidas
  })
);


export const projectScores = sqliteTable(
  "project_scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(
      (): AnySQLiteColumn => projects.id,
      {
        onDelete: "cascade",
      }
    ),
    memberId: integer("member_id").references(
      (): AnySQLiteColumn => members.id,
      {
        onDelete: "cascade",
      }
    ),
    score: integer("score").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueProjectMemberScore: unique(
      "uq_project_scores_project_id_member_id"
    ).on(table.projectId, table.memberId),
  })
);

// Tabla combinada de relación muchos-a-muchos entre proyectos, miembros y roles específicos de proyectos
export const projectMembers = sqliteTable(
  "project_members",
  {
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

// Tabla de etiquetas de miembros
export const memberTags = sqliteTable(
  "member_tags",
  {
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

// Tabla de etiquetas de proyectos
export const projectTags = sqliteTable(
  "project_tags",
  {
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

//
export const profileThemes = sqliteTable(
  "profile_themes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 50 }).notNull(), // Nombre del tema (ej. "Nitro Pink", "Dark Blue")
    primaryColor: text("primary_color", { length: 50 }).notNull(), // Color principal
    accentColor: text("accent_color", { length: 50 }).notNull(), // Color de realce
    image: text("image", { length: 255 }).default(""), // URL o ruta de imagen opcional
    publicId: text("public_id", { length: 255 }).default(""), // Public ID de Cloudinary u otro servicio
  },
  (table) => ({
    themeIndex: index("idx_profile_themes_name").on(table.name),
  })
);

// Relación entre miembros y temas
export const memberThemes = sqliteTable(
  "member_themes",
  {
    memberId: integer("member_id").references(
      (): AnySQLiteColumn => members.id,
      {
        onDelete: "cascade",
      }
    ),
    themeId: integer("theme_id").references(
      (): AnySQLiteColumn => profileThemes.id,
      {
        onDelete: "cascade",
      }
    ),
    active: integer("active").notNull().default(0), // 1 = activado, 0 = desactivado
  },
  (table) => ({
    uniqueMemberTheme: unique("uq_member_themes_member_id_theme_id").on(
      table.memberId,
      table.themeId
    ),
  })
);

// Badges
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

// Relación de insignias con miembros
export const memberBadges = sqliteTable(
  "member_badges",
  {
    memberId: integer("member_id").references(
      (): AnySQLiteColumn => members.id,
      {
        onDelete: "cascade",
      }
    ),
    badgeId: integer("badge_id").references((): AnySQLiteColumn => badges.id, {
      onDelete: "cascade",
    }),
    earnedAt: text("earned_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`), // Cuándo se obtuvo la insignia
  },
  (table) => ({
    uniqueMemberBadge: unique("uq_member_badges_member_id_badge_id").on(
      table.memberId,
      table.badgeId
    ),
  })
);

// Moderation
// Moderators Table
export const moderators = sqliteTable(
  "moderators",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(
      (): AnySQLiteColumn => users.id,
      {
        onDelete: "cascade",
      }
    ),
    roleId: integer("role_id").references((): AnySQLiteColumn => roles.id, {
      onDelete: "cascade",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueModerator: unique("uq_moderators_user_id_role_id").on(
      table.userId,
      table.roleId
    ),
  })
);

// Permissions Table
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

// Moderator Permissions Table
export const moderatorPermissions = sqliteTable(
  "moderator_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(
      (): AnySQLiteColumn => users.id,
      {
        onDelete: "cascade",
      }
    ),
    roleId: integer("role_id").references(
      (): AnySQLiteColumn => roles.id,
      {
        onDelete: "cascade",
      }
    ),
    permissionId: integer("permission_id").references(
      (): AnySQLiteColumn => permissions.id,
      {
        onDelete: "cascade",
      }
    ),
  },
  (table) => ({
    uniqueModeratorPermission: unique("uq_moderator_permissions").on(
      table.userId,
      table.roleId,
      table.permissionId
    ),
  })
);
