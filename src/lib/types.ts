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

// Clean dynamic state - ZERO dummy users, real catering items
export const initialUsers: UserRecord[] = [];
export const initialOrders: OrderData[] = [];
export const initialMenuItems: MenuItemData[] = [
  {
    _id: 'menu-1',
    name: 'Special Chicken Roast & Polao',
    nameBn: 'স্পেশাল চিকেন রোস্ট ও পোলাও',
    category: 'Lunch',
    price: 180,
    description: 'Aromatic chinigura rice served with tender chicken roast, egg & crisp beresta',
    descriptionBn: 'সুস্বাদু চিনিগুঁড়া পোলাও সাথে ফ্রেশ চিকেন রোস্ট ও ডিম',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 650,
  },
  {
    _id: 'menu-2',
    name: 'Classic Beef Tehari',
    nameBn: 'ঐতিহ্যবাহী গরুর মাংসের তেহারি',
    category: 'Lunch',
    price: 220,
    description: 'Traditional mustard oil beef tehari with tender meat chunks & green chili',
    descriptionBn: 'খাটি সরিষার তেলে রান্না স্পেশাল বিফ তেহারি',
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 720,
  },
  {
    _id: 'menu-3',
    name: 'Executive Platter Deluxe',
    nameBn: 'এক্সিকিউটিভ প্ল্যাটার ডিলাক্স',
    category: 'Executive Catering',
    price: 350,
    description: 'Polao, Chicken Roast, Beef Rezala, Borhani, Shahi Firni & Fresh Salad',
    descriptionBn: 'পোলাও, চিকেন রোস্ট, বিফ রেজালা, বোরহানি, ফিরনি ও সালাদ',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 950,
  },
  {
    _id: 'menu-4',
    name: 'Club Sandwich & Fries',
    nameBn: 'ক্লাব স্যান্ডউইচ ও ফ্রাইস',
    category: 'Refreshments',
    price: 130,
    description: 'Triple layer toasted sandwich with shredded chicken, egg, cheese, mayo & fries',
    descriptionBn: 'চিকেন, ডিম, চিজ ও মেয়োনিজ সহযোগে ট্রিপল লেয়ার স্যান্ডউইচ',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 450,
  },
  {
    _id: 'menu-5',
    name: 'Special Chicken Shawarma Roll',
    nameBn: 'চিকেন শাওয়ারমা রোল',
    category: 'Refreshments',
    price: 110,
    description: 'Arabic pita bread stuffed with garlic sauce & grilled seasoned chicken slices',
    descriptionBn: 'গার্লিক সস ও গ্রিল্ড চিকেন ভরা সুস্বাদু শাওয়ারমা',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: false,
    calories: 380,
  },
  {
    _id: 'menu-6',
    name: 'Masala Milk Tea & Cookies',
    nameBn: 'মশলা দুধ চা ও বিস্কুট',
    category: 'Beverages',
    price: 30,
    description: 'Fresh cardamom-ginger infused whole milk tea served with crisp bakery butter cookies',
    descriptionBn: 'এলাচ-আদা মিশ্রিত গাঢ় দুধের চা এবং বেকারি কুকিজ',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 120,
  },
  {
    _id: 'menu-7',
    name: 'Cold Pressed Orange Juice',
    nameBn: 'তাজা কমলার জুস',
    category: 'Beverages',
    price: 80,
    description: '100% freshly squeezed chilled sweet orange juice with pulps, no added sugar',
    descriptionBn: 'চিনিমুক্ত তাজা কমলার স্বাস্থ্যকর রিফ্রেশিং জুস',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: false,
    calories: 110,
  },
  {
    _id: 'menu-8',
    name: 'Royal Shahi Firni',
    nameBn: 'রয়েল শাহী ফিরনি',
    category: 'Dessert',
    price: 60,
    description: 'Traditional earthen pot saffron rice firni garnished with pistachios & silver vark',
    descriptionBn: 'মাটির পাত্রে জাফরান ও পেস্তা বাদামে তৈরি সুস্বাদু শাহী ফিরনি',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    popular: true,
    calories: 220,
  },
];
