import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.Setting)
  ? (mongoose.models.Setting as mongoose.Model<ISetting>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<ISetting>('Setting', SettingSchema)
  : (null as any);
