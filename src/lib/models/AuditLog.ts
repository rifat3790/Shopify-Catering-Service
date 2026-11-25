import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  userRole?: string;
  path: string;
  pageTitle?: string;
  action: string;
  details?: string;
  device?: string;
  ip?: string;
  timestamp: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, default: '' },
    userName: { type: String, default: 'Anonymous' },
    userEmail: { type: String, default: '', lowercase: true, trim: true },
    userAvatar: { type: String, default: '' },
    userRole: { type: String, default: 'user' },
    path: { type: String, required: true },
    pageTitle: { type: String, default: '' },
    action: {
      type: String,
      enum: ['page_view', 'order_placed', 'order_updated', 'balance_update', 'due_update', 'chat_message', 'login', 'duty_completed'],
      default: 'page_view',
    },
    details: { type: String, default: '' },
    device: { type: String, default: 'Desktop' },
    ip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userEmail: 1 });
AuditLogSchema.index({ path: 1 });
AuditLogSchema.index({ action: 1 });

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.AuditLog)
  ? (mongoose.models.AuditLog as mongoose.Model<IAuditLog>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
  : (null as any);
