import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordReset extends Document {
  email: string;
  userName?: string;
  code: string;
  status: 'pending' | 'used' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, default: '' },
    code: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'used', 'cancelled'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.PasswordReset)
  ? (mongoose.models.PasswordReset as mongoose.Model<IPasswordReset>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema)
  : (null as any);
