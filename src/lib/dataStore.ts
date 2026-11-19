import { connectToDatabase } from './mongodb';
import Order from './models/Order';
import MenuItem from './models/MenuItem';
import Customer from './models/Customer';
import { 
  OrderData, 
  MenuItemData, 
  UserRecord, 
  UserRole,
  initialOrders, 
  initialMenuItems,
  initialUsers 
} from './types';

export { 
  type OrderData, 
  type MenuItemData, 
  type UserRecord, 
  type UserRole, 
  initialOrders, 
  initialMenuItems,
  initialUsers 
};

// In-memory fallback caches
let ordersCache: OrderData[] = [...initialOrders];
let menuItemsCache: MenuItemData[] = [...initialMenuItems];
let usersCache: UserRecord[] = [...initialUsers];

// User & Member Management
export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    await connectToDatabase();
    if (Customer) {
      const count = await Customer.countDocuments();
      if (count === 0) {
        await Customer.insertMany(initialUsers.map(u => ({
          name: u.name,
          email: u.email,
          department: u.department,
          totalSpent: u.totalSpent,
          currentDue: u.currentDue,
          status: 'Active',
        })));
      }
    }
  } catch (err) {
    // using memory store
  }
  return usersCache;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const users = await getAllUsers();
  return users.find(u => u.id === id || u.name.toLowerCase() === id.toLowerCase() || u.email.toLowerCase() === id.toLowerCase()) || null;
}

export async function createUser(data: Partial<UserRecord>): Promise<UserRecord> {
  const newUser: UserRecord = {
    id: `usr-${Date.now()}`,
    name: data.name || 'New Member',
    email: data.email || `${(data.name || 'member').toLowerCase().replace(/\s+/g, '')}@shopify.com`,
    role: data.role || 'user',
    balance: Number(data.balance) || 0,
    currentDue: Number(data.currentDue) || 0,
    totalSpent: 0,
    department: data.department || 'General Team',
    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=047857&color=fff`,
    phone: data.phone || '',
    createdAt: new Date().toISOString()
  };

  usersCache = [newUser, ...usersCache];
  return newUser;
}

export async function updateUserRole(id: string, newRole: UserRole): Promise<UserRecord | null> {
  const idx = usersCache.findIndex(u => u.id === id || u.name.toLowerCase() === id.toLowerCase() || u.email.toLowerCase() === id.toLowerCase());
  if (idx !== -1) {
    usersCache[idx].role = newRole;
    return usersCache[idx];
  }
  return null;
}

export async function updateUserBalance(id: string, amount: number, action: 'add' | 'deduct' = 'add'): Promise<UserRecord | null> {
  const idx = usersCache.findIndex(u => u.id === id || u.name.toLowerCase() === id.toLowerCase());
  if (idx !== -1) {
    if (action === 'add') {
      usersCache[idx].balance += Number(amount);
    } else {
      usersCache[idx].balance = Math.max(0, usersCache[idx].balance - Number(amount));
      usersCache[idx].totalSpent += Number(amount);
    }
    return usersCache[idx];
  }
  return null;
}

// Order Management APIs
export async function getAllOrders(): Promise<OrderData[]> {
  try {
    await connectToDatabase();
    if (Order) {
      const count = await Order.countDocuments();
      if (count === 0) {
        await Order.insertMany(initialOrders.map(o => ({
          ...o,
          _id: undefined,
          orderDate: new Date(o.orderDate)
        })));
      }
      const docs = await Order.find().sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          ...d,
          _id: d._id.toString(),
          orderDate: d.orderDate?.toISOString?.() || new Date().toISOString(),
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
        })) as unknown as OrderData[];
      }
    }
    return ordersCache;
  } catch (err) {
    return ordersCache;
  }
}

export async function createOrder(data: Partial<OrderData>): Promise<OrderData> {
  const newOrderNumber = `ORD-${Date.now().toString().slice(-4)}`;
  const totalBill = Number(data.totalBill) || 0;
  const paidAmount = Number(data.paidAmount) || 0;
  const changeDue = paidAmount - totalBill;
  
  let status: OrderData['status'] = data.status || 'Pending';
  if (totalBill > 0 && paidAmount >= totalBill) {
    status = 'Paid';
  } else if (totalBill > 0 && paidAmount > 0 && paidAmount < totalBill) {
    status = 'Partial';
  } else if (totalBill > 0 && paidAmount === 0) {
    status = 'Due';
  }

  const newOrder: OrderData = {
    _id: `ord-${Date.now()}`,
    orderNumber: data.orderNumber || newOrderNumber,
    customerName: data.customerName || "Anonymous Customer",
    customerPhone: data.customerPhone || "",
    customerDepartment: data.customerDepartment || "General",
    itemsText: data.itemsText || (data.items?.map(i => `${i.quantity} ta ${i.name}`).join(' + ') || "Quick Order"),
    items: data.items || [],
    totalBill,
    paidAmount,
    changeDue,
    status,
    paymentMethod: data.paymentMethod || 'Cash',
    notes: data.notes || '',
    orderDate: data.orderDate || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  try {
    await connectToDatabase();
    if (Order) {
      const doc = await Order.create({
        ...newOrder,
        _id: undefined,
        orderDate: new Date(newOrder.orderDate)
      });
      if (doc) {
        newOrder._id = doc._id.toString();
      }
    }
  } catch (err) {
    // cached fallback
  }

  // Update user records if member exists
  if (data.customerName) {
    const user = usersCache.find(u => u.name.toLowerCase() === data.customerName!.toLowerCase());
    if (user) {
      user.totalSpent += totalBill;
      if (data.paymentMethod === 'Wallet') {
        user.balance = Math.max(0, user.balance - totalBill);
      }
    }
  }

  ordersCache = [newOrder, ...ordersCache];
  return newOrder;
}

export async function updateOrder(id: string, updates: Partial<OrderData>): Promise<OrderData | null> {
  try {
    await connectToDatabase();
    if (Order) {
      const doc = await Order.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (doc) {
        const formatted: OrderData = {
          ...doc,
          _id: (doc as any)._id.toString(),
          orderDate: (doc as any).orderDate?.toISOString?.() || new Date().toISOString(),
        } as unknown as OrderData;
        ordersCache = ordersCache.map(o => (o._id === id || o.orderNumber === id) ? formatted : o);
        return formatted;
      }
    }
  } catch (err) {
    // fallback
  }

  const idx = ordersCache.findIndex(o => o._id === id || o.orderNumber === id);
  if (idx !== -1) {
    ordersCache[idx] = { ...ordersCache[idx], ...updates, updatedAt: new Date().toISOString() };
    return ordersCache[idx];
  }
  return null;
}

export async function deleteOrder(id: string): Promise<boolean> {
  try {
    await connectToDatabase();
    if (Order) {
      await Order.findByIdAndDelete(id);
    }
  } catch (err) {
    // fallback
  }

  ordersCache = ordersCache.filter(o => o._id !== id && o.orderNumber !== id);
  return true;
}

// Menu Management APIs (Full CRUD for Admin & Super Admin)
export async function getAllMenuItems(): Promise<MenuItemData[]> {
  try {
    await connectToDatabase();
    if (MenuItem) {
      const count = await MenuItem.countDocuments();
      if (count === 0) {
        await MenuItem.insertMany(initialMenuItems.map(m => ({ ...m, _id: undefined })));
      }
      const docs = await MenuItem.find().lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          ...d,
          _id: d._id.toString()
        })) as unknown as MenuItemData[];
      }
    }
    return menuItemsCache;
  } catch (err) {
    return menuItemsCache;
  }
}

export async function createMenuItem(data: Partial<MenuItemData>): Promise<MenuItemData> {
  const newItem: MenuItemData = {
    _id: `menu-${Date.now()}`,
    name: data.name || 'New Dish',
    nameBn: data.nameBn || data.name || 'নতুন খাবার',
    category: data.category || 'Refreshments',
    price: Number(data.price) || 20,
    description: data.description || '',
    descriptionBn: data.descriptionBn || '',
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    popular: !!data.popular,
    calories: Number(data.calories) || 150,
  };

  try {
    await connectToDatabase();
    if (MenuItem) {
      const doc = await MenuItem.create({ ...newItem, _id: undefined });
      if (doc) newItem._id = doc._id.toString();
    }
  } catch (err) {
    // fallback
  }

  menuItemsCache = [newItem, ...menuItemsCache];
  return newItem;
}

export async function updateMenuItem(id: string, updates: Partial<MenuItemData>): Promise<MenuItemData | null> {
  try {
    await connectToDatabase();
    if (MenuItem) {
      const doc = await MenuItem.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (doc) {
        const formatted: MenuItemData = {
          ...doc,
          _id: (doc as any)._id.toString(),
        } as unknown as MenuItemData;
        menuItemsCache = menuItemsCache.map(m => m._id === id ? formatted : m);
        return formatted;
      }
    }
  } catch (err) {
    // fallback
  }

  const idx = menuItemsCache.findIndex(m => m._id === id);
  if (idx !== -1) {
    menuItemsCache[idx] = { ...menuItemsCache[idx], ...updates };
    return menuItemsCache[idx];
  }
  return null;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  try {
    await connectToDatabase();
    if (MenuItem) {
      await MenuItem.findByIdAndDelete(id);
    }
  } catch (err) {
    // fallback
  }

  menuItemsCache = menuItemsCache.filter(m => m._id !== id);
  return true;
}

export async function getStatsSummary() {
  const orders = await getAllOrders();
  
  const completedOrders = orders.filter(o => o.status === 'Paid');
  const activeOrdersCount = orders.filter(o => o.totalBill > 0).length;
  
  const totalBill = orders.reduce((acc, curr) => acc + (curr.totalBill || 0), 0);
  const totalPaid = orders.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  
  const totalRefundChange = orders.reduce((acc, curr) => {
    const diff = (curr.paidAmount || 0) - (curr.totalBill || 0);
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const totalDue = orders.reduce((acc, curr) => {
    const diff = (curr.totalBill || 0) - (curr.paidAmount || 0);
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const collectionRate = totalBill > 0 ? ((totalPaid / totalBill) * 100).toFixed(1) : "0.0";

  return {
    ordersCount: activeOrdersCount,
    completedOrdersCount: completedOrders.length,
    totalOrders: orders.length,
    totalBill,
    totalPaid,
    totalRefundChange,
    totalDue,
    collectionRate: `${collectionRate}%`,
    rawCollectionRate: Number(collectionRate)
  };
}
