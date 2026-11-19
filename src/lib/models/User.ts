import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  uid?: string;
  name: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String },
    name: { type: String, required: true },
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
  },
  {
    timestamps: true,
  }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.User)
  ? (mongoose.models.User as mongoose.Model<IUser>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IUser>('User', UserSchema)
  : (null as any);

