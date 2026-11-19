import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  admins: string[];
  members: string[];
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: 'Member' },
    admins: [{ type: String }],
    members: [{ type: String, required: true }],
    avatar: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.Group)
  ? (mongoose.models.Group as mongoose.Model<IGroup>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IGroup>('Group', GroupSchema)
  : (null as any);

