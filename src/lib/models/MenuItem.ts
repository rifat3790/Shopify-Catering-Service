import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  nameBn: string;
  category: 'Refreshments' | 'Lunch' | 'Breakfast' | 'Beverages' | 'Dessert' | 'Executive Catering';
  price: number;
  costPrice?: number;
  description: string;
  descriptionBn: string;
  imageUrl: string;
  isAvailable: boolean;
  popular: boolean;
  calories?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    nameBn: { type: String, required: true },
    category: {
      type: String,
      enum: ['Refreshments', 'Lunch', 'Breakfast', 'Beverages', 'Dessert', 'Executive Catering'],
      required: true,
      default: 'Refreshments',
    },
    price: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, default: 0 },
    description: { type: String, default: '' },
    descriptionBn: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
    calories: { type: Number },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

MenuItemSchema.index({ category: 1 });
MenuItemSchema.index({ isAvailable: 1 });
MenuItemSchema.index({ createdAt: -1 });

export default (typeof mongoose !== 'undefined' && mongoose.models && mongoose.models.MenuItem)
  ? (mongoose.models.MenuItem as mongoose.Model<IMenuItem>)
  : (typeof mongoose !== 'undefined' && mongoose.model)
  ? mongoose.model<IMenuItem>('MenuItem', MenuItemSchema)
  : (null as any);
