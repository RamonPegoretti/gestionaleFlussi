import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Structures (tenants). Every other row belongs to one structure.
// ---------------------------------------------------------------------------

export const structures = pgTable("structures", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  istatCode: text("istat_code").notNull().default(""),
  comune: text("comune").notNull().default(""),
  // Which regional exporter produces the monthly file (see src/lib/exporters).
  exporter: text("exporter").notNull().default("veneto"),
  // "Letti disponibili" on each open day.
  beds: integer("beds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Periods when the structure is open; they fill "giorni di apertura" on the form.
export const openingPeriods = pgTable(
  "opening_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => structures.id, { onDelete: "cascade" }),
    start: date("start", { mode: "string" }).notNull(),
    end: date("end", { mode: "string" }).notNull(),
  },
  (t) => [index("opening_periods_structure_idx").on(t.structureId)],
);

// ---------------------------------------------------------------------------
// Logins (tables used by Better Auth).
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // "owner" | "staff" | "superadmin"
  role: text("role").notNull().default("staff"),
  structureId: uuid("structure_id").references(() => structures.id, { onDelete: "set null" }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Guest groups. Only counts and origins: no personal data.
// ---------------------------------------------------------------------------

export const groups = pgTable(
  "groups",
  {
    // Generated on the device, so a group entered offline keeps its id when synced.
    id: uuid("id").primaryKey(),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => structures.id, { onDelete: "cascade" }),
    people: integer("people").notNull(),
    originKey: text("origin_key").notNull(),
    arrival: date("arrival", { mode: "string" }).notNull(),
    departure: date("departure", { mode: "string" }).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Time of the last edit on the device that made it: the latest edit wins.
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("groups_structure_arrival_idx").on(t.structureId, t.arrival),
    index("groups_structure_departure_idx").on(t.structureId, t.departure),
    check("groups_people_positive", sql`${t.people} > 0`),
    check("groups_departure_after_arrival", sql`${t.departure} > ${t.arrival}`),
  ],
);

// Edit history, so a mistaken change can be looked up and undone.
export const groupEvents = pgTable(
  "group_events",
  {
    id: serial("id").primaryKey(),
    groupId: uuid("group_id").notNull(),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => structures.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(), // "create" | "update" | "delete"
    data: jsonb("data").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("group_events_group_idx").on(t.groupId)],
);

export const structuresRelations = relations(structures, ({ many }) => ({
  openingPeriods: many(openingPeriods),
  users: many(user),
  groups: many(groups),
}));

export const openingPeriodsRelations = relations(openingPeriods, ({ one }) => ({
  structure: one(structures, { fields: [openingPeriods.structureId], references: [structures.id] }),
}));

export const userRelations = relations(user, ({ one }) => ({
  structure: one(structures, { fields: [user.structureId], references: [structures.id] }),
}));

export const groupsRelations = relations(groups, ({ one }) => ({
  structure: one(structures, { fields: [groups.structureId], references: [structures.id] }),
}));
