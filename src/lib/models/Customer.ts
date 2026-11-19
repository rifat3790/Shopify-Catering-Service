import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  nameBn?: string;
  phone?: string;
  email?: string;
  department?: string;
  totalOrders: number;
  totalSpent: number;
  currentDue: number;
  lastOrderDate?: Date;
  status: 'Active' | 'VIP' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, unique: true },
    nameBn: { type: String },
    phone: { type: String },
    email: { type: String },
    department: { type: String, default: 'Shopify Team' },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    currentDue: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    status: {
      type: String,
      enum: ['Active', 'VIP', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.Customer)
  ? (mongoose.models.Customer as mongoose.Model<ICustomer>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<ICustomer>('Customer', CustomerSchema)
  : (null as any);
