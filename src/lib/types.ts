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
  balance: number; // Current wallet/catering balance in BDT
  currentDue: number; // Any unpaid dues
  totalSpent: number; // Lifetime catering expenditure
  department: string;
  avatar: string;
  phone?: string;
  createdAt: string;
}

// Initial Users with Balances and Roles
export const initialUsers: UserRecord[] = [
  {
    id: "usr-super",
    name: "Rifat (Super Admin)",
    email: "superadmin@shopifycatering.com",
    role: "super_admin",
    balance: 5000,
    currentDue: 0,
    totalSpent: 1250,
    department: "Executive Management",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-admin",
    name: "Tanvir Hasan (Admin)",
    email: "admin@shopifycatering.com",
    role: "admin",
    balance: 2400,
    currentDue: 0,
    totalSpent: 890,
    department: "Catering Operations",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-shamim",
    name: "Shamim",
    email: "shamim@shopify.com",
    role: "user",
    balance: 450,
    currentDue: 0,
    totalSpent: 620,
    department: "Development",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-shagor",
    name: "Shagor",
    email: "shagor@shopify.com",
    role: "user",
    balance: 620,
    currentDue: 0,
    totalSpent: 750,
    department: "Marketing",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-ismail",
    name: "Ismail",
    email: "ismail@shopify.com",
    role: "user",
    balance: 310,
    currentDue: 0,
    totalSpent: 280,
    department: "Design & UX",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-refayet",
    name: "Refayet",
    email: "refayet@shopify.com",
    role: "user",
    balance: 550,
    currentDue: 0,
    totalSpent: 420,
    department: "Engineering",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-muzahid",
    name: "Muzahid",
    email: "muzahid@shopify.com",
    role: "user",
    balance: 200,
    currentDue: 0,
    totalSpent: 190,
    department: "Support",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-muhaimenul",
    name: "Muhaimenul",
    email: "muhaimenul@shopify.com",
    role: "user",
    balance: 380,
    currentDue: 0,
    totalSpent: 210,
    department: "Operations",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-azim",
    name: "Azim",
    email: "azim@shopify.com",
    role: "user",
    balance: 150,
    currentDue: 0,
    totalSpent: 180,
    department: "Logistics",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString()
  }
];

// Initial seed orders directly reflecting user's Google Sheet
export const initialOrders: OrderData[] = [
  {
    _id: "ord-1",
    orderNumber: "ORD-1001",
    customerName: "Shamim",
    customerDepartment: "Development",
    itemsText: "2 ta Singara + 1 ta comoccha",
    items: [
      { name: "Singara (সিঙ্গারা)", quantity: 2, unitPrice: 10, subtotal: 20 },
      { name: "Comoccha / Somucha (চমচা)", quantity: 1, unitPrice: 10, subtotal: 10 }
    ],
    totalBill: 30,
    paidAmount: 30,
    changeDue: 0,
    status: "Paid",
    paymentMethod: "Cash",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-2",
    orderNumber: "ORD-1002",
    customerName: "Ismail",
    customerDepartment: "Design & UX",
    itemsText: "",
    items: [],
    totalBill: 0,
    paidAmount: 0,
    changeDue: 0,
    status: "Pending",
    paymentMethod: "Cash",
    notes: "Special order queue",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-3",
    orderNumber: "ORD-1003",
    customerName: "Shagor",
    customerDepartment: "Marketing",
    itemsText: "2 ta Singara + 1 ta comoccha + 1ta mojo",
    items: [
      { name: "Singara (সিঙ্গারা)", quantity: 2, unitPrice: 10, subtotal: 20 },
      { name: "Comoccha / Somucha (চমচা)", quantity: 1, unitPrice: 10, subtotal: 10 },
      { name: "Chilled Mojo 250ml (মোজো)", quantity: 1, unitPrice: 20, subtotal: 20 }
    ],
    totalBill: 50,
    paidAmount: 200,
    changeDue: 150,
    status: "Paid",
    paymentMethod: "Cash",
    notes: "Received ৳200 note, return ৳150 change",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-4",
    orderNumber: "ORD-1004",
    customerName: "Muhaimenul",
    customerDepartment: "Operations",
    itemsText: "",
    items: [],
    totalBill: 0,
    paidAmount: 0,
    changeDue: 0,
    status: "Pending",
    paymentMethod: "Cash",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-5",
    orderNumber: "ORD-1005",
    customerName: "Azim",
    customerDepartment: "Logistics",
    itemsText: "",
    items: [],
    totalBill: 0,
    paidAmount: 0,
    changeDue: 0,
    status: "Pending",
    paymentMethod: "Cash",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-6",
    orderNumber: "ORD-1006",
    customerName: "Refayet",
    customerDepartment: "Engineering",
    itemsText: "2 ta Singara + 1 ta comoccha",
    items: [
      { name: "Singara (সিঙ্গারা)", quantity: 2, unitPrice: 10, subtotal: 20 },
      { name: "Comoccha / Somucha (চমচা)", quantity: 1, unitPrice: 10, subtotal: 10 }
    ],
    totalBill: 30,
    paidAmount: 200,
    changeDue: 170,
    status: "Paid",
    paymentMethod: "Cash",
    notes: "Received ৳200 note, return ৳170 change",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    _id: "ord-7",
    orderNumber: "ORD-1007",
    customerName: "Muzahid",
    customerDepartment: "Support",
    itemsText: "2 ta somusa",
    items: [
      { name: "Comoccha / Somucha (চমচা)", quantity: 2, unitPrice: 10, subtotal: 20 }
    ],
    totalBill: 20,
    paidAmount: 20,
    changeDue: 0,
    status: "Paid",
    paymentMethod: "Cash",
    orderDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

export const initialMenuItems: MenuItemData[] = [
  {
    _id: "menu-1",
    name: "Crispy Royal Singara",
    nameBn: "ক্রিস্পি রয়েল সিঙ্গারা",
    category: "Refreshments",
    price: 10,
    description: "Golden flaky pastry stuffed with seasoned spiced potato, peanut, and aromatic herbs.",
    descriptionBn: "মচমচে বাদামি সিঙ্গারা, স্পেশাল আলু ও গরম মশলার পুর সহ।",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 140
  },
  {
    _id: "menu-2",
    name: "Golden Somucha (Comoccha)",
    nameBn: "মচমচে সমুচা / চমচা",
    category: "Refreshments",
    price: 10,
    description: "Crisp triangular pastry pouch packed with spicy minced filling and fresh coriander.",
    descriptionBn: "চিকন ক্রাঞ্চি লেয়ারের সুস্বাদু চমচা।",
    imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 125
  },
  {
    _id: "menu-3",
    name: "Chilled Mojo Cola (250ml)",
    nameBn: "চিলড মোজো (২৫০ মি.লি.)",
    category: "Beverages",
    price: 20,
    description: "Ice-cold refreshing Bangladesh original beverage to pair with hot snacks.",
    descriptionBn: "বরফ শীতল রিফ্রেশিং মোজো।",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 105
  },
  {
    _id: "menu-4",
    name: "Royal Spiced Dudh Cha",
    nameBn: "স্পেশাল জাফরানি দুধ চা",
    category: "Beverages",
    price: 15,
    description: "Slow-brewed strong milk tea infused with cardamom, cloves, and premium Assam tea leaves.",
    descriptionBn: "এলাচ ও লবঙ্গ সমৃদ্ধ খাঁটি ঘন দুধ চা।",
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 85
  },
  {
    _id: "menu-5",
    name: "Executive Mutton Kacchi Box",
    nameBn: "এক্সিকিউটিভ খাসির কাচ্চি বক্স",
    category: "Executive Catering",
    price: 280,
    description: "Fragrant Chinigura rice layered with tender mutton chunks, potato, egg, and salad.",
    descriptionBn: "ঘিয়ে ভাজা চিনিগুঁড়া চাল ও নরম খাসির মাংসের স্পেশাল কাচ্চি বিরিয়ানি।",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 650
  },
  {
    _id: "menu-6",
    name: "Premium Chicken Roast & Polao",
    nameBn: "শাহী চিকেন রোস্ট ও পোলাও থালি",
    category: "Lunch",
    price: 220,
    description: "Rich yogurt & almond marinated chicken roast paired with aromatic basmati polao & borhani.",
    descriptionBn: "বাদাম ও মালাই সমৃদ্ধ রোস্ট ও সুগন্ধি পোলাও।",
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: true,
    calories: 580
  },
  {
    _id: "menu-7",
    name: "Luxury Shahi Firni & Sweet Cup",
    nameBn: "শাহী জাফরানি ফিরনি",
    category: "Dessert",
    price: 60,
    description: "Creamy traditional rice pudding garnished with saffron strands, pistachios, and silver leaf.",
    descriptionBn: "ঘরোয়া খাঁটি দুধে তৈরি জাফরান ও পেস্তা বাদামের ফিরনি।",
    imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: false,
    calories: 210
  },
  {
    _id: "menu-8",
    name: "Pure Himalayan Mineral Water (500ml)",
    nameBn: "মিনারেল ওয়াটার (৫০০ মি.লি.)",
    category: "Beverages",
    price: 15,
    description: "Reverse osmosis purified bottled mineral drinking water.",
    descriptionBn: "বিশুদ্ধ নিরাপদ বোতলজাত খাবার পানি।",
    imageUrl: "https://images.unsplash.com/photo-1559839914-1b34645a3803?w=600&auto=format&fit=crop&q=80",
    isAvailable: true,
    popular: false,
    calories: 0
  }
];
