import { 
  jobs, comments, replies, tasks, activities, settings, replyTemplates,
  type Job, type InsertJob,
  type Comment, type InsertComment,
  type Reply, type InsertReply,
  type Task, type InsertTask,
  type Activity, type InsertActivity,
  type Setting, type InsertSetting,
  type ReplyTemplate, type InsertReplyTemplate
} from "@shared/schema";

export interface IStorage {
  // Jobs
  getJobs(limit?: number, offset?: number): Promise<Job[]>;
  getJobById(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  getJobsBySource(source: string): Promise<Job[]>;

  // Comments
  getComments(jobId?: number, limit?: number): Promise<Comment[]>;
  getCommentById(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined>;
  getJobSeekerComments(): Promise<Comment[]>;

  // Replies
  getReplies(commentId?: number): Promise<Reply[]>;
  getReplyById(id: number): Promise<Reply | undefined>;
  createReply(reply: InsertReply): Promise<Reply>;
  updateReply(id: number, reply: Partial<InsertReply>): Promise<Reply | undefined>;
  getPendingReplies(): Promise<Reply[]>;

  // Tasks
  getTasks(status?: string, limit?: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  getActiveTasks(): Promise<Task[]>;

  // Activities
  getActivities(limit?: number, offset?: number): Promise<Activity[]>;
  getActivityById(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(hours?: number): Promise<Activity[]>;

  // Settings
  getSettings(category?: string): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  createOrUpdateSetting(setting: InsertSetting): Promise<Setting>;

  // Reply Templates
  getReplyTemplates(category?: string): Promise<ReplyTemplate[]>;
  getReplyTemplateById(id: number): Promise<ReplyTemplate | undefined>;
  createReplyTemplate(template: InsertReplyTemplate): Promise<ReplyTemplate>;
  updateReplyTemplate(id: number, template: Partial<InsertReplyTemplate>): Promise<ReplyTemplate | undefined>;

  // Statistics
  getStats(): Promise<{
    jobsToday: number;
    commentsAnalyzed: number;
    repliesSent: number;
    activeTasks: number;
  }>;
}

export class MemStorage implements IStorage {
  private jobs: Map<number, Job> = new Map();
  private comments: Map<number, Comment> = new Map();
  private replies: Map<number, Reply> = new Map();
  private tasks: Map<number, Task> = new Map();
  private activities: Map<number, Activity> = new Map();
  private settings: Map<string, Setting> = new Map();
  private replyTemplates: Map<number, ReplyTemplate> = new Map();

  private currentJobId = 1;
  private currentCommentId = 1;
  private currentReplyId = 1;
  private currentTaskId = 1;
  private currentActivityId = 1;
  private currentSettingId = 1;
  private currentTemplateId = 1;

  constructor() {
    this.initializeDefaultSettings();
    this.initializeDefaultTemplates();
  }

  // إضافة دالة initDatabase للتوافق
  async initDatabase(): Promise<void> {
    // لا حاجة لتهيئة قاعدة بيانات - البيانات محفوظة في الذاكرة
    console.log("✅ Memory storage initialized successfully");
  }

  private initializeDefaultSettings() {
    const defaultSettings: InsertSetting[] = [
      { key: 'facebook_check_interval', value: '300000', category: 'scraping', description: 'Facebook check interval in milliseconds' },
      { key: 'linkedin_check_interval', value: '600000', category: 'scraping', description: 'LinkedIn check interval in milliseconds' },
      { key: 'max_comments_per_job', value: '100', category: 'analysis', description: 'Maximum comments to analyze per job post' },
      { key: 'auto_reply_enabled', value: 'true', category: 'replies', description: 'Enable automatic replies' },
      { key: 'reply_delay_min', value: '60000', category: 'replies', description: 'Minimum delay between replies in milliseconds' },
      { key: 'reply_delay_max', value: '300000', category: 'replies', description: 'Maximum delay between replies in milliseconds' },
    ];

    defaultSettings.forEach(setting => {
      this.createOrUpdateSetting(setting);
    });
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: InsertReplyTemplate[] = [
      {
        name: 'دعوة عامة للتوظيف',
        content: 'مرحباً، نحن نوفر فرص عمل مميزة قد تناسب خبراتك. يرجى التواصل معنا للمزيد من التفاصيل.',
        category: 'job_invitation',
        isActive: true
      },
      {
        name: 'رد تلقائي متابعة',
        content: 'شكراً لاهتمامك. سنتواصل معك قريباً بخصوص الفرص المتاحة.',
        category: 'follow_up',
        isActive: true
      }
    ];

    defaultTemplates.forEach(template => {
      this.createReplyTemplate(template);
    });
  }

  // Jobs implementation
  async getJobs(limit = 50, offset = 0): Promise<Job[]> {
    const allJobs = Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.collectedAt || 0).getTime() - new Date(a.collectedAt || 0).getTime());
    return allJobs.slice(offset, offset + limit);
  }

  async getJobById(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const newJob: Job = {
      ...job,
      id,
      collectedAt: new Date(),
      postedAt: job.postedAt || new Date()
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...job };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async getJobsBySource(source: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => job.source === source);
  }

  // Comments implementation
  async getComments(jobId?: number, limit = 50): Promise<Comment[]> {
    let comments = Array.from(this.comments.values());
    if (jobId) {
      comments = comments.filter(comment => comment.jobId === jobId);
    }
    return comments
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  async getCommentById(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: new Date()
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined> {
    const existing = this.comments.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...comment };
    this.comments.set(id, updated);
    return updated;
  }

  async getJobSeekerComments(): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(comment => comment.isJobSeeker);
  }

  // Replies implementation
  async getReplies(commentId?: number): Promise<Reply[]> {
    let replies = Array.from(this.replies.values());
    if (commentId) {
      replies = replies.filter(reply => reply.commentId === commentId);
    }
    return replies.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getReplyById(id: number): Promise<Reply | undefined> {
    return this.replies.get(id);
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const id = this.currentReplyId++;
    const newReply: Reply = {
      ...reply,
      id,
      createdAt: new Date()
    };
    this.replies.set(id, newReply);
    return newReply;
  }

  async updateReply(id: number, reply: Partial<InsertReply>): Promise<Reply | undefined> {
    const existing = this.replies.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...reply };
    this.replies.set(id, updated);
    return updated;
  }

  async getPendingReplies(): Promise<Reply[]> {
    return Array.from(this.replies.values()).filter(reply => reply.status === 'pending');
  }

  // Tasks implementation
  async getTasks(status?: string, limit = 50): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    return tasks
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date()
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...task };
    this.tasks.set(id, updated);
    return updated;
  }

  async getActiveTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.status === 'running' || task.status === 'pending'
    );
  }

  // Activities implementation
  async getActivities(limit = 50, offset = 0): Promise<Activity[]> {
    const allActivities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return allActivities.slice(offset, offset + limit);
  }

  async getActivityById(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: new Date()
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async getRecentActivities(hours = 24): Promise<Activity[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.activities.values())
      .filter(activity => new Date(activity.createdAt || 0) > cutoff)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  // Settings implementation
  async getSettings(category?: string): Promise<Setting[]> {
    let settings = Array.from(this.settings.values());
    if (category) {
      settings = settings.filter(setting => setting.category === category);
    }
    return settings;
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async createOrUpdateSetting(setting: InsertSetting): Promise<Setting> {
    const existing = this.settings.get(setting.key);

    if (existing) {
      const updated: Setting = {
        ...existing,
        ...setting,
        updatedAt: new Date()
      };
      this.settings.set(setting.key, updated);
      return updated;
    } else {
      const id = this.currentSettingId++;
      const newSetting: Setting = {
        ...setting,
        id,
        updatedAt: new Date()
      };
      this.settings.set(setting.key, newSetting);
      return newSetting;
    }
  }

  // Reply Templates implementation
  async getReplyTemplates(category?: string): Promise<ReplyTemplate[]> {
    let templates = Array.from(this.replyTemplates.values());
    if (category) {
      templates = templates.filter(template => template.category === category);
    }
    return templates.filter(template => template.isActive);
  }

  async getReplyTemplateById(id: number): Promise<ReplyTemplate | undefined> {
    return this.replyTemplates.get(id);
  }

  async createReplyTemplate(template: InsertReplyTemplate): Promise<ReplyTemplate> {
    const id = this.currentTemplateId++;
    const newTemplate: ReplyTemplate = {
      ...template,
      id,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.replyTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateReplyTemplate(id: number, template: Partial<InsertReplyTemplate>): Promise<ReplyTemplate | undefined> {
    const existing = this.replyTemplates.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...template,
      updatedAt: new Date()
    };
    this.replyTemplates.set(id, updated);
    return updated;
  }

  // Statistics implementation
  async getStats(): Promise<{
    jobsToday: number;
    commentsAnalyzed: number;
    repliesSent: number;
    activeTasks: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const jobsToday = Array.from(this.jobs.values())
      .filter(job => new Date(job.collectedAt || 0) >= today).length;

    const commentsAnalyzed = Array.from(this.comments.values())
      .filter(comment => comment.analyzedAt && new Date(comment.analyzedAt) >= today).length;

    const repliesSent = Array.from(this.replies.values())
      .filter(reply => reply.sentAt && new Date(reply.sentAt) >= today).length;

    const activeTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'running' || task.status === 'pending').length;

    return {
      jobsToday,
      commentsAnalyzed,
      repliesSent,
      activeTasks
    };
  }
}

export const storage = new MemStorage();