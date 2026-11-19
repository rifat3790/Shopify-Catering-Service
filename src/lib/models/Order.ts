import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  itemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerDepartment?: string;
  itemsText: string;
  items: IOrderItem[];
  totalBill: number;
  paidAmount: number;
  changeDue: number;
  status: 'Paid' | 'Pending' | 'Due' | 'Partial' | 'Cancelled';
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Card' | 'Credit';
  notes?: string;
  orderDate: Date;
  dateString: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  itemId: { type: String },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  subtotal: { type: Number, required: true, default: 0 },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerDepartment: { type: String },
    itemsText: { type: String, default: '' },
    items: [OrderItemSchema],
    totalBill: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    changeDue: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Due', 'Partial', 'Cancelled'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'bKash', 'Nagad', 'Card', 'Credit'],
      default: 'Cash',
    },
    notes: { type: String },
    orderDate: { type: Date, default: Date.now },
    dateString: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  {
    timestamps: true,
  }
);

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.Order)
  ? (mongoose.models.Order as mongoose.Model<IOrder>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IOrder>('Order', OrderSchema)
  : (null as any);
