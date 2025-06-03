import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company"),
  location: text("location"),
  source: text("source").notNull(), // 'facebook', 'linkedin', 'indeed', etc.
  sourceUrl: text("source_url").notNull(),
  sourceId: text("source_id"), // original post/job ID from source
  keywords: text("keywords").array(),
  isActive: boolean("is_active").default(true),
  postedAt: timestamp("posted_at"),
  collectedAt: timestamp("collected_at").defaultNow(),
  metadata: jsonb("metadata"), // additional scraped data
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id),
  content: text("content").notNull(),
  authorName: text("author_name"),
  authorId: text("author_id"), // social media user ID
  source: text("source").notNull(),
  sourceCommentId: text("source_comment_id"),
  isJobSeeker: boolean("is_job_seeker").default(false),
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  keywords: text("keywords").array(),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const replies = pgTable("replies", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").references(() => comments.id),
  content: text("content").notNull(),
  templateUsed: text("template_used"),
  status: text("status").notNull().default('pending'), // 'pending', 'sent', 'failed'
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'job_collection', 'comment_analysis', 'auto_reply'
  status: text("status").notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  source: text("source"),
  sourceUrl: text("source_url"),
  config: jsonb("config"), // task-specific configuration
  progress: integer("progress").default(0), // percentage 0-100
  result: jsonb("result"), // task results
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'job_collected', 'comment_analyzed', 'reply_sent', 'error'
  description: text("description").notNull(),
  source: text("source"),
  result: text("result"),
  status: text("status").notNull(), // 'success', 'warning', 'error'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(), // 'scraping', 'analysis', 'replies', 'scheduling'
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const replyTemplates = pgTable("reply_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // 'job_invitation', 'general_response', 'follow_up'
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  collectedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertReplySchema = createInsertSchema(replies).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertReplyTemplateSchema = createInsertSchema(replyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

// Types
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Reply = typeof replies.$inferSelect;
export type InsertReply = z.infer<typeof insertReplySchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type ReplyTemplate = typeof replyTemplates.$inferSelect;
export type InsertReplyTemplate = z.infer<typeof insertReplyTemplateSchema>;
