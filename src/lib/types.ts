export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderData {
  _id?: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerDepartment?: string;
  customerEmail?: string;
  customerAvatar?: string;
  userId?: string;
  itemsText: string;
  items?: OrderItem[];
  totalBill: number;
  paidAmount: number;
  changeDue: number;
  status: 'Paid' | 'Pending' | 'Due' | 'Partial' | 'Cancelled' | 'Cooking' | 'Delivered';
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Card' | 'Credit' | 'Wallet';
  notes?: string;
  orderDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItemData {
  _id?: string;
  name: string;
  nameBn: string;
  category: 'Refreshments' | 'Lunch' | 'Breakfast' | 'Beverages' | 'Dessert' | 'Executive Catering';
  price: number;
  description: string;
  descriptionBn: string;
  imageUrl: string;
  isAvailable: boolean;
  popular: boolean;
  calories?: number;
}

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'user';

export interface UserRecord {
  id: string;
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
  lastSeen?: string;
  isOnline?: boolean;
  blockedUsers?: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  groupId?: string;
  text: string;
  createdAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  admins: string[];
  members: string[];
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PasswordResetRequest {
  id: string;
  email: string;
  userName?: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'used' | 'cancelled';
}

// System Super Admin configuration
export const SUPER_ADMIN_EMAIL = 'mdrifayethossen@gmail.com';

export interface RoutePermissions {
  admin: string[];
  user: string[];
}

export const DEFAULT_ROUTE_PERMISSIONS: RoutePermissions = {
  admin: ['/menu', '/orders', '/chat', '/tracker', '/members', '/pos', '/user', '/admin'],
  user: ['/menu', '/orders', '/chat', '/user'],
};

// Clean dynamic state - ZERO dummy users, ZERO static menu items
export const initialUsers: UserRecord[] = [];
export const initialOrders: OrderData[] = [];
export const initialMenuItems: MenuItemData[] = [];
