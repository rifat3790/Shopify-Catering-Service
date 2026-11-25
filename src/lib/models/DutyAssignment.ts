import mongoose, { Schema, Document } from 'mongoose';

export interface IDutyAssignment extends Document {
  date: string; // YYYY-MM-DD
  assignedUserId: string;
  assignedUserName: string;
  assignedUserEmail: string;
  assignedUserAvatar?: string;
  assignedUserPhone?: string;
  assignedByUserId?: string;
  assignedByName?: string;
  instructions?: string;
  tasks?: string[];
  status: 'assigned' | 'in_progress' | 'completed';
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DutyAssignmentSchema = new Schema<IDutyAssignment>(
  {
    date: { type: String, required: true, unique: true },
    assignedUserId: { type: String, required: true },
    assignedUserName: { type: String, required: true },
    assignedUserEmail: { type: String, required: true, lowercase: true, trim: true },
    assignedUserAvatar: { type: String, default: '' },
    assignedUserPhone: { type: String, default: '' },
    assignedByUserId: { type: String, default: '' },
    assignedByName: { type: String, default: 'Admin' },
    instructions: { type: String, default: 'Collect money, purchase snacks/refreshments, and deliver on time.' },
    tasks: {
      type: [String],
      default: [
        'Collect Catering Cash / Payments',
        'Purchase Fresh Snacks / Refreshments',
        'Deliver & Distribute to Members'
      ],
    },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed'],
      default: 'assigned',
    },
    acknowledged: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

DutyAssignmentSchema.index({ assignedUserEmail: 1 });
DutyAssignmentSchema.index({ status: 1 });

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.DutyAssignment)
  ? (mongoose.models.DutyAssignment as mongoose.Model<IDutyAssignment>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IDutyAssignment>('DutyAssignment', DutyAssignmentSchema)
  : (null as any);
