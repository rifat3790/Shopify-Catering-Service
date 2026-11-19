import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  groupId?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String, default: '' },
    receiverId: { type: String, index: true },
    groupId: { type: String, index: true },
    text: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
MessageSchema.index({ groupId: 1, createdAt: 1 });
MessageSchema.index({ createdAt: -1 });

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.Message)
  ? (mongoose.models.Message as mongoose.Model<IMessage>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IMessage>('Message', MessageSchema)
  : (null as any);

