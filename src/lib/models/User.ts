import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  uid?: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  balance: number;
  currentDue: number;
  totalSpent: number;
  department: string;
  avatar: string;
  phone?: string;
  lastSeen?: Date;
  isOnline?: boolean;
  blockedUsers?: string[];
  themeColor?: string;
  customTheme?: {
    primary?: string;
    accent?: string;
    bg?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String },
    name: { type: String, required: true },
    username: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'staff', 'user'],
      default: 'user',
    },
    balance: { type: Number, default: 0 },
    currentDue: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    department: { type: String, default: 'General Team' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    lastSeen: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    blockedUsers: [{ type: String }],
    themeColor: { type: String, default: 'emerald' },
    customTheme: {
      primary: { type: String, default: '' },
      accent: { type: String, default: '' },
      bg: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ uid: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ isOnline: 1 });

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.User)
  ? (mongoose.models.User as mongoose.Model<IUser>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IUser>('User', UserSchema)
  : (null as any);

