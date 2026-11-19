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
  email: string;
  role: UserRole;
  balance: number;
  currentDue: number;
  totalSpent: number;
  department: string;
  avatar: string;
  phone?: string;
  createdAt: string;
}

// System Super Admin configuration
export const SUPER_ADMIN_EMAIL = 'mdrifayethossen@gmail.com';

// Authentic clean initial users: Only the verified Super Admin
export const initialUsers: UserRecord[] = [
  {
    id: "usr-superadmin",
    name: "Md Refayet Hossen",
    email: SUPER_ADMIN_EMAIL,
    role: "super_admin",
    balance: 0,
    currentDue: 0,
    totalSpent: 0,
    department: "Executive Management & Super Admin",
    avatar: "https://ui-avatars.com/api/?name=Md+Refayet+Hossen&background=047857&color=fff",
    phone: "+880 1700-000000",
    createdAt: new Date().toISOString()
  }
];

// Clean dynamic initial state - NO dummy items
export const initialOrders: OrderData[] = [];
export const initialMenuItems: MenuItemData[] = [];
