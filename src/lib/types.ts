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
  depositChangeToWallet?: boolean;
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

export type ThemePresetId = 'emerald' | 'sapphire' | 'amethyst' | 'ruby' | 'arctic' | 'pearl' | 'custom';

export interface CustomThemeConfig {
  primary: string;
  accent: string;
  bg?: string;
  card?: string;
  fontHeading?: string;
  fontBody?: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  tag: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryRgb: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentRgb: string;
  bgBase: string;
  bgCard: string;
  fontHeading?: string;
  fontBody?: string;
  previewGradient: string;
}

export interface UserRecord {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  status?: 'approved' | 'pending' | 'rejected';
  balance: number;
  currentDue: number;
  totalSpent: number;
  department: string;
  avatar: string;
  phone?: string;
  lastSeen?: string;
  isOnline?: boolean;
  blockedUsers?: string[];
  themeColor?: string;
  customTheme?: CustomThemeConfig;
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

export interface DailyDutyAssignment {
  id: string; // e.g. duty-2026-11-25
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
  acknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  userRole?: string;
  path: string;
  pageTitle?: string;
  action: 'page_view' | 'order_placed' | 'balance_update' | 'chat_message' | 'login' | 'duty_completed';
  details?: string;
  device?: string;
  timestamp: string;
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
