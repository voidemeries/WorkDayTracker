import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.number(),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Room schema
export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  inviteCode: z.string(),
});

export const insertRoomSchema = roomSchema.omit({ id: true, createdAt: true, inviteCode: true });

export type Room = z.infer<typeof roomSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// Room member schema
export const roomMemberRoleSchema = z.enum(["admin", "member"]);
export const roomMemberStatusSchema = z.enum(["pending", "active"]);

export const roomMemberSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  role: roomMemberRoleSchema,
  status: roomMemberStatusSchema,
  createdAt: z.number(),
});

export const insertRoomMemberSchema = roomMemberSchema.omit({ id: true, createdAt: true });

export type RoomMember = z.infer<typeof roomMemberSchema>;
export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;
export type RoomMemberRole = z.infer<typeof roomMemberRoleSchema>;
export type RoomMemberStatus = z.infer<typeof roomMemberStatusSchema>;

// Office schedule schema
export const scheduleStatusSchema = z.enum(["office", "remote"]);

export const officeScheduleSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  status: scheduleStatusSchema,
  createdAt: z.number(),
});

export const insertOfficeScheduleSchema = officeScheduleSchema.omit({ id: true, createdAt: true });

export type OfficeSchedule = z.infer<typeof officeScheduleSchema>;
export type InsertOfficeSchedule = z.infer<typeof insertOfficeScheduleSchema>;
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

// Change request schema
export const changeRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const changeRequestSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  originalDate: z.string().nullable(),
  newDate: z.string(),
  reason: z.string().optional(),
  status: changeRequestStatusSchema,
  createdAt: z.number(),
  resolvedAt: z.number().nullable(),
  resolvedBy: z.string().nullable(),
});

export const insertChangeRequestSchema = changeRequestSchema.omit({ 
  id: true, 
  createdAt: true, 
  resolvedAt: true, 
  resolvedBy: true,
  status: true 
}).extend({
  status: z.literal("pending").default("pending").optional(),
});

export type ChangeRequest = z.infer<typeof changeRequestSchema>;
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;
export type ChangeRequestStatus = z.infer<typeof changeRequestStatusSchema>;

// Notification schema
export const notificationTypeSchema = z.enum([
  "join_request",
  "join_approved",
  "join_rejected",
  "schedule_request",
  "schedule_approved",
  "schedule_rejected",
]);

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  roomId: z.string(),
  type: notificationTypeSchema,
  message: z.string(),
  read: z.boolean(),
  createdAt: z.number(),
  relatedId: z.string().optional(), // ID of related request/member
});

export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true });

export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// Extended types for UI (with populated data)
export type RoomMemberWithUser = RoomMember & {
  user: User;
};

export type ChangeRequestWithUser = ChangeRequest & {
  user: User;
};

export type OfficeScheduleWithUser = OfficeSchedule & {
  user: User;
};
