import { connectToDatabase } from './mongodb';
import Order from './models/Order';
import MenuItem from './models/MenuItem';
import Customer from './models/Customer';
import User from './models/User';
import { 
  OrderData, 
  MenuItemData, 
  UserRecord, 
  UserRole,
  SUPER_ADMIN_EMAIL,
  initialOrders, 
  initialMenuItems,
  initialUsers 
} from './types';

export { 
  type OrderData, 
  type MenuItemData, 
  type UserRecord, 
  type UserRole, 
  SUPER_ADMIN_EMAIL,
  initialOrders, 
  initialMenuItems,
  initialUsers 
};

// In-memory fallback caches - completely clean, no dummy users
let ordersCache: OrderData[] = [];
let menuItemsCache: MenuItemData[] = [];
let usersCache: UserRecord[] = [];

// User Management - ONLY REAL LOGGED-IN USERS
export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    await connectToDatabase();
    if (User) {
      const docs = await User.find().sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        const mapped = docs.map((d: any) => ({
          id: d._id.toString(),
          name: d.name,
          email: d.email,
          role: (d.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : d.role) as UserRole,
          balance: Number(d.balance) || 0,
          currentDue: Number(d.currentDue) || 0,
          totalSpent: Number(d.totalSpent) || 0,
          department: d.department || 'Shopify Team',
          avatar: d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'User')}&background=047857&color=fff`,
          phone: d.phone || '',
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString()
        }));
        usersCache = mapped;
        return mapped;
      }
    }
  } catch (err) {
    console.warn("MongoDB connection fallback to memory users:", err);
  }
  return usersCache;
}

export async function getUserById(idOrEmailOrName: string): Promise<UserRecord | null> {
  const users = await getAllUsers();
  const search = idOrEmailOrName.toLowerCase().trim();
  return users.find(u => 
    u.id === idOrEmailOrName || 
    u.email.toLowerCase() === search || 
    u.name.toLowerCase() === search
  ) || null;
}

export async function syncUser(userData: {
  uid?: string;
  name?: string | null;
  email: string;
  avatar?: string | null;
}): Promise<UserRecord> {
  const emailClean = userData.email.toLowerCase().trim();
  const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();

  try {
    await connectToDatabase();
    if (User) {
      let doc = await User.findOne({ email: emailClean });
      if (!doc) {
        // Create new real authenticated user in MongoDB
        doc = await User.create({
          uid: userData.uid || '',
          name: userData.name || emailClean.split('@')[0],
          email: emailClean,
          role: isSuper ? 'super_admin' : 'user',
          balance: 0,
          currentDue: 0,
          totalSpent: 0,
          department: isSuper ? 'Super Admin & Executive' : 'Shopify Member',
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=047857&color=fff`,
        });
      } else {
        // If super admin email, enforce super_admin role
        if (isSuper && doc.role !== 'super_admin') {
          doc.role = 'super_admin';
          await doc.save();
        }
      }

      const syncedRecord: UserRecord = {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        role: (isSuper ? 'super_admin' : doc.role) as UserRole,
        balance: Number(doc.balance) || 0,
        currentDue: Number(doc.currentDue) || 0,
        totalSpent: Number(doc.totalSpent) || 0,
        department: doc.department || 'Shopify Team',
        avatar: doc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || 'User')}&background=047857&color=fff`,
        phone: doc.phone || '',
        createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString()
      };

      const idx = usersCache.findIndex(u => u.email.toLowerCase() === emailClean);
      if (idx !== -1) {
        usersCache[idx] = syncedRecord;
      } else {
        usersCache = [syncedRecord, ...usersCache];
      }

      return syncedRecord;
    }
  } catch (err) {
    console.error("MongoDB user sync failed, fallback to memory:", err);
  }

  // Memory fallback
  const existing = usersCache.find(u => u.email.toLowerCase() === emailClean);
  if (existing) {
    if (isSuper) existing.role = 'super_admin';
    return existing;
  }

  const newRec: UserRecord = {
    id: `usr-${Date.now()}`,
    name: userData.name || emailClean.split('@')[0],
    email: emailClean,
    role: isSuper ? 'super_admin' : 'user',
    balance: 0,
    currentDue: 0,
    totalSpent: 0,
    department: isSuper ? 'Super Admin & Executive' : 'Shopify Member',
    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=047857&color=fff`,
    phone: '',
    createdAt: new Date().toISOString()
  };
  usersCache = [newRec, ...usersCache];
  return newRec;
}

export async function createUser(data: Partial<UserRecord>): Promise<UserRecord> {
  const emailClean = (data.email || `${(data.name || 'member').toLowerCase().replace(/\s+/g, '')}@shopify.com`).toLowerCase().trim();
  const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();

  const newUser: UserRecord = {
    id: `usr-${Date.now()}`,
    name: data.name || 'New Member',
    email: emailClean,
    role: isSuper ? 'super_admin' : (data.role || 'user'),
    balance: Number(data.balance) || 0,
    currentDue: Number(data.currentDue) || 0,
    totalSpent: 0,
    department: data.department || 'Shopify Member',
    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=047857&color=fff`,
    phone: data.phone || '',
    createdAt: new Date().toISOString()
  };

  try {
    await connectToDatabase();
    if (User) {
      const doc = await User.create({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        balance: newUser.balance,
        currentDue: newUser.currentDue,
        totalSpent: newUser.totalSpent,
        department: newUser.department,
        avatar: newUser.avatar,
        phone: newUser.phone,
      });
      if (doc) newUser.id = doc._id.toString();
    }
  } catch (err) {
    console.warn("MongoDB create user failed, using cache:", err);
  }

  usersCache = [newUser, ...usersCache];
  return newUser;
}

export async function updateUserRole(idOrEmail: string, newRole: UserRole): Promise<UserRecord | null> {
  const search = idOrEmail.toLowerCase().trim();
  
  // Primary super admin cannot be demoted
  if (search === SUPER_ADMIN_EMAIL.toLowerCase() && newRole !== 'super_admin') {
    newRole = 'super_admin';
  }

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: idOrEmail } : { $or: [{ email: search }, { name: search }] };
      const doc = await User.findOneAndUpdate(query, { role: newRole }, { new: true });
      if (doc) {
        const updated: UserRecord = {
          id: doc._id.toString(),
          name: doc.name,
          email: doc.email,
          role: doc.role,
          balance: Number(doc.balance) || 0,
          currentDue: Number(doc.currentDue) || 0,
          totalSpent: Number(doc.totalSpent) || 0,
          department: doc.department,
          avatar: doc.avatar,
          phone: doc.phone,
          createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString()
        };
        usersCache = usersCache.map(u => (u.id === doc._id.toString() || u.email.toLowerCase() === doc.email.toLowerCase()) ? updated : u);
        return updated;
      }
    }
  } catch (err) {
    console.warn("MongoDB update role failed, using cache:", err);
  }

  const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === search || u.name.toLowerCase() === search);
  if (idx !== -1) {
    usersCache[idx].role = newRole;
    return usersCache[idx];
  }
  return null;
}

// Delete Member permanently from Database & Memory Cache
export async function deleteUser(idOrEmail: string): Promise<boolean> {
  const search = idOrEmail.toLowerCase().trim();

  // Root Super Admin account cannot be deleted!
  if (search === SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Primary Root Super Admin account cannot be deleted');
  }

  let deleted = false;

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId 
        ? { _id: idOrEmail } 
        : { $or: [{ email: search }, { name: search }] };

      const target = await User.findOne(query);
      if (target && target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error('Primary Root Super Admin account cannot be deleted');
      }

      const res = await User.findOneAndDelete(query);
      if (res) {
        deleted = true;
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Super Admin')) {
      throw err;
    }
    console.warn("MongoDB delete user failed, using cache fallback:", err);
  }

  const initialLen = usersCache.length;
  usersCache = usersCache.filter(u => 
    u.id !== idOrEmail && 
    u.email.toLowerCase() !== search && 
    u.name.toLowerCase() !== search
  );
  if (usersCache.length < initialLen) {
    deleted = true;
  }

  return deleted;
}

// Balance Add, Remove, and Edit (Direct Set)
export async function updateUserBalance(
  idOrEmail: string, 
  amount: number, 
  action: 'add' | 'deduct' | 'set' = 'add'
): Promise<UserRecord | null> {
  const search = idOrEmail.toLowerCase().trim();
  const amt = Number(amount) || 0;

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: idOrEmail } : { $or: [{ email: search }, { name: search }] };
      const userDoc = await User.findOne(query);
      if (userDoc) {
        if (action === 'add') {
          userDoc.balance = (userDoc.balance || 0) + amt;
        } else if (action === 'deduct') {
          userDoc.balance = Math.max(0, (userDoc.balance || 0) - amt);
        } else if (action === 'set') {
          userDoc.balance = Math.max(0, amt);
        }
        await userDoc.save();
        const updated: UserRecord = {
          id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          balance: userDoc.balance,
          currentDue: userDoc.currentDue,
          totalSpent: userDoc.totalSpent,
          department: userDoc.department,
          avatar: userDoc.avatar,
          phone: userDoc.phone,
          createdAt: userDoc.createdAt?.toISOString?.() || new Date().toISOString()
        };
        usersCache = usersCache.map(u => u.id === updated.id ? updated : u);
        return updated;
      }
    }
  } catch (err) {
    console.warn("MongoDB update balance failed, using cache:", err);
  }

  const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === search || u.name.toLowerCase() === search);
  if (idx !== -1) {
    if (action === 'add') {
      usersCache[idx].balance += amt;
    } else if (action === 'deduct') {
      usersCache[idx].balance = Math.max(0, usersCache[idx].balance - amt);
    } else if (action === 'set') {
      usersCache[idx].balance = Math.max(0, amt);
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
      const docs = await Order.find().sort({ createdAt: -1 }).lean();
      if (docs) {
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
    customerName: data.customerName || "Customer",
    customerPhone: data.customerPhone || "",
    customerDepartment: data.customerDepartment || "General",
    customerEmail: data.customerEmail || "",
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
    // fallback
  }

  // Update user balance/spent dynamically
  if (data.customerName || data.customerEmail) {
    const custSearch = (data.customerEmail || data.customerName || '').toLowerCase().trim();
    const user = usersCache.find(u => u.name.toLowerCase() === custSearch || u.email.toLowerCase() === custSearch);
    if (user) {
      user.totalSpent += totalBill;
      if (data.paymentMethod === 'Wallet') {
        user.balance = Math.max(0, user.balance - totalBill);
        updateUserBalance(user.id, totalBill, 'deduct').catch(() => {});
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
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { orderNumber: id };
      const doc = await Order.findOneAndUpdate(query, updates, { new: true }).lean();
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
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { orderNumber: id };
      await Order.findOneAndDelete(query);
    }
  } catch (err) {
    // fallback
  }

  ordersCache = ordersCache.filter(o => o._id !== id && o.orderNumber !== id);
  return true;
}

// Menu Management APIs
export async function getAllMenuItems(): Promise<MenuItemData[]> {
  try {
    await connectToDatabase();
    if (MenuItem) {
      const docs = await MenuItem.find().sort({ createdAt: -1 }).lean();
      if (docs) {
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
    price: Number(data.price) || 0,
    description: data.description || '',
    descriptionBn: data.descriptionBn || '',
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    popular: !!data.popular,
    calories: Number(data.calories) || 0,
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
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { name: id };
      const doc = await MenuItem.findOneAndUpdate(query, updates, { new: true }).lean();
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
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { name: id };
      await MenuItem.findOneAndDelete(query);
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
