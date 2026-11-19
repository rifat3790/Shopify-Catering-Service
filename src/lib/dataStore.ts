import { connectToDatabase } from './mongodb';
import { adminAuth, getFirebaseUsersList } from './firebaseAdmin';
import Order from './models/Order';
import MenuItem from './models/MenuItem';
import Customer from './models/Customer';
import User from './models/User';
import Message from './models/Message';
import Group from './models/Group';
import PasswordReset from './models/PasswordReset';
import { 
  OrderData, 
  MenuItemData, 
  UserRecord, 
  UserRole,
  ChatMessage,
  ChatGroup,
  PasswordResetRequest,
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
  type ChatMessage,
  type ChatGroup,
  type PasswordResetRequest,
  SUPER_ADMIN_EMAIL,
  initialOrders, 
  initialMenuItems,
  initialUsers 
};

// In-memory fallback caches - completely clean, no dummy users
let ordersCache: OrderData[] = [];
let menuItemsCache: MenuItemData[] = [];
let usersCache: UserRecord[] = [];
let messagesCache: ChatMessage[] = [];
let groupsCache: ChatGroup[] = [];
let resetRequestsCache: PasswordResetRequest[] = [];

// User Management - ALL REGISTERED USERS (FROM FIREBASE AUTH & DATABASE)
export async function getAllUsers(): Promise<UserRecord[]> {
  const now = Date.now();

  // 1. Fetch real registered users from Firebase Authentication (past, present & future)
  let fbUsers: Array<{ uid: string; email: string; displayName?: string; photoURL?: string; createdAt?: string }> = [];
  try {
    fbUsers = await getFirebaseUsersList();
  } catch (err) {
    console.warn("Could not fetch Firebase Auth users:", err);
  }

  // 2. Try MongoDB
  let mongoDocs: any[] = [];
  try {
    await connectToDatabase();
    if (User) {
      // Sync any missing Firebase user into MongoDB
      for (const fb of fbUsers) {
        if (!fb.email) continue;
        const emailClean = fb.email.toLowerCase().trim();
        const exists = await User.findOne({ email: emailClean });
        if (!exists) {
          const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();
          await User.create({
            uid: fb.uid,
            name: fb.displayName || emailClean.split('@')[0],
            email: emailClean,
            role: isSuper ? 'super_admin' : 'user',
            balance: 0,
            currentDue: 0,
            totalSpent: 0,
            department: isSuper ? 'Executive Management' : 'Shopify Member',
            avatar: fb.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.displayName || 'Member')}&background=047857&color=fff`,
            createdAt: fb.createdAt ? new Date(fb.createdAt) : new Date(),
          });
        }
      }

      mongoDocs = await User.find().sort({ createdAt: -1 }).lean();
    }
  } catch (err) {
    console.warn("MongoDB connection fallback to Firebase users & memory:", err);
  }

  // 3. If MongoDB has records, map them
  if (mongoDocs && mongoDocs.length > 0) {
    const mapped: UserRecord[] = mongoDocs.map((d: any) => {
      const lastSeenTime = d.lastSeen ? new Date(d.lastSeen).getTime() : (d.updatedAt ? new Date(d.updatedAt).getTime() : now);
      const isRecentlyActive = (now - lastSeenTime) < (3 * 60 * 1000);
      const isSuper = d.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      return {
        id: d.uid || d._id.toString(),
        name: d.name,
        email: d.email,
        role: (isSuper ? 'super_admin' : d.role) as UserRole,
        balance: Number(d.balance) || 0,
        currentDue: Number(d.currentDue) || 0,
        totalSpent: Number(d.totalSpent) || 0,
        department: d.department || (isSuper ? 'Executive Management' : 'Shopify Team'),
        avatar: d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'User')}&background=047857&color=fff`,
        phone: d.phone || '',
        lastSeen: d.lastSeen?.toISOString?.() || new Date(lastSeenTime).toISOString(),
        isOnline: Boolean(d.isOnline || isRecentlyActive),
        blockedUsers: d.blockedUsers || [],
        createdAt: d.createdAt?.toISOString?.() || new Date().toISOString()
      };
    });

    // Ensure any Firebase user not yet in MongoDB is also included
    for (const fb of fbUsers) {
      if (!fb.email) continue;
      const found = mapped.find(m => m.email.toLowerCase() === fb.email.toLowerCase());
      if (!found) {
        const isSuper = fb.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        mapped.push({
          id: fb.uid,
          name: fb.displayName || fb.email.split('@')[0],
          email: fb.email,
          role: isSuper ? 'super_admin' : 'user',
          balance: 0,
          currentDue: 0,
          totalSpent: 0,
          department: isSuper ? 'Executive Management' : 'Shopify Member',
          avatar: fb.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.displayName || 'Member')}&background=047857&color=fff`,
          phone: '',
          lastSeen: new Date().toISOString(),
          isOnline: false,
          blockedUsers: [],
          createdAt: fb.createdAt || new Date().toISOString()
        });
      }
    }

    usersCache = mapped;
    return mapped;
  }

  // 4. If MongoDB is down or empty, construct from Firebase Auth + usersCache overlay
  const combinedList: UserRecord[] = [];
  for (const fb of fbUsers) {
    if (!fb.email) continue;
    const emailClean = fb.email.toLowerCase();
    const cached = usersCache.find(u => u.email.toLowerCase() === emailClean);
    const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();

    if (cached) {
      combinedList.push({
        ...cached,
        id: fb.uid || cached.id,
        name: cached.name || fb.displayName || emailClean.split('@')[0],
        avatar: cached.avatar || fb.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.displayName || 'Member')}&background=047857&color=fff`,
        role: isSuper ? 'super_admin' : (cached.role || 'user'),
      });
    } else {
      combinedList.push({
        id: fb.uid,
        name: fb.displayName || emailClean.split('@')[0],
        email: fb.email,
        role: isSuper ? 'super_admin' : 'user',
        balance: 0,
        currentDue: 0,
        totalSpent: 0,
        department: isSuper ? 'Executive Management' : 'Shopify Member',
        avatar: fb.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.displayName || 'Member')}&background=047857&color=fff`,
        phone: '',
        lastSeen: new Date().toISOString(),
        isOnline: false,
        blockedUsers: [],
        createdAt: fb.createdAt || new Date().toISOString()
      });
    }
  }

  // Also include any manually added users from usersCache
  for (const c of usersCache) {
    if (!combinedList.some(u => u.email.toLowerCase() === c.email.toLowerCase())) {
      combinedList.push(c);
    }
  }

  usersCache = combinedList;
  return combinedList;
}

// Presence & Heartbeat update
export async function updateUserPresence(idOrEmail: string, isOnline: boolean = true): Promise<void> {
  const search = idOrEmail.toLowerCase().trim();
  const now = new Date();

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: idOrEmail } : { $or: [{ email: search }, { name: search }] };
      await User.updateOne(query, { $set: { lastSeen: now, isOnline } });
    }
  } catch (e) {
    // fallback
  }

  const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === search || u.name.toLowerCase() === search);
  if (idx !== -1) {
    usersCache[idx].lastSeen = now.toISOString();
    usersCache[idx].isOnline = isOnline;
  }
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
        blockedUsers: doc.blockedUsers || [],
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

  // Check if target user in cache is root super admin
  const cachedUser = usersCache.find(u => 
    u.id === idOrEmail || 
    u.email.toLowerCase() === search || 
    u.name.toLowerCase() === search
  );
  if (cachedUser && cachedUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
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

// Block / Unblock a User
export async function toggleBlockUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ isBlocked: boolean; blockedUsers: string[] }> {
  let isBlocked = false;
  let updatedList: string[] = [];

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = currentUserId.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: currentUserId } : { email: currentUserId.toLowerCase().trim() };
      const doc = await User.findOne(query);
      if (doc) {
        const list: string[] = doc.blockedUsers || [];
        const idx = list.indexOf(targetUserId);
        if (idx !== -1) {
          list.splice(idx, 1);
          isBlocked = false;
        } else {
          list.push(targetUserId);
          isBlocked = true;
        }
        doc.blockedUsers = list;
        await doc.save();
        updatedList = list;
      }
    }
  } catch (err) {
    console.warn("MongoDB toggle block failed:", err);
  }

  // Also update memory cache
  const idx = usersCache.findIndex(u => u.id === currentUserId || u.email.toLowerCase() === currentUserId.toLowerCase());
  if (idx !== -1) {
    const list = usersCache[idx].blockedUsers || [];
    const bIdx = list.indexOf(targetUserId);
    if (bIdx !== -1) {
      list.splice(bIdx, 1);
      isBlocked = false;
    } else {
      list.push(targetUserId);
      isBlocked = true;
    }
    usersCache[idx].blockedUsers = list;
    updatedList = list;
  }

  return { isBlocked, blockedUsers: updatedList };
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

// Chat & Group APIs
export async function getChatMessages(query: { 
  userId1?: string; 
  userId2?: string; 
  groupId?: string 
}): Promise<ChatMessage[]> {
  try {
    await connectToDatabase();
    if (Message) {
      let filter: any = {};
      if (query.groupId) {
        filter = { groupId: query.groupId };
      } else if (query.userId1 && query.userId2) {
        filter = {
          $or: [
            { senderId: query.userId1, receiverId: query.userId2 },
            { senderId: query.userId2, receiverId: query.userId1 },
          ]
        };
      }
      const docs = await Message.find(filter).sort({ createdAt: 1 }).limit(100).lean();
      if (docs) {
        return docs.map((d: any) => ({
          id: d._id.toString(),
          senderId: d.senderId,
          senderName: d.senderName,
          senderAvatar: d.senderAvatar,
          receiverId: d.receiverId,
          groupId: d.groupId,
          text: d.text,
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString()
        }));
      }
    }
  } catch (err) {
    // fallback to cache
  }

  if (query.groupId) {
    return messagesCache.filter(m => m.groupId === query.groupId);
  }
  if (query.userId1 && query.userId2) {
    return messagesCache.filter(m => 
      (m.senderId === query.userId1 && m.receiverId === query.userId2) ||
      (m.senderId === query.userId2 && m.receiverId === query.userId1)
    );
  }
  return messagesCache;
}

export async function sendChatMessage(data: {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  groupId?: string;
  text: string;
}): Promise<ChatMessage> {
  // Check if either sender or receiver is blocked in 1-on-1 chat
  if (data.receiverId) {
    const allUsers = await getAllUsers();
    const sender = allUsers.find(u => u.id === data.senderId);
    const receiver = allUsers.find(u => u.id === data.receiverId);
    
    if (sender?.blockedUsers?.includes(data.receiverId)) {
      throw new Error("You have blocked this member. Unblock to send messages.");
    }
    if (receiver?.blockedUsers?.includes(data.senderId)) {
      throw new Error("You cannot send messages to this member as you are blocked.");
    }
  }

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: data.senderId,
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
    receiverId: data.receiverId,
    groupId: data.groupId,
    text: data.text,
    createdAt: new Date().toISOString()
  };

  try {
    await connectToDatabase();
    if (Message) {
      const doc = await Message.create({
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        receiverId: data.receiverId,
        groupId: data.groupId,
        text: data.text
      });
      if (doc) newMsg.id = doc._id.toString();
    }
  } catch (err) {
    console.warn("Message save to DB failed, using memory:", err);
  }

  messagesCache.push(newMsg);
  return newMsg;
}

export async function getAllChatGroups(): Promise<ChatGroup[]> {
  try {
    await connectToDatabase();
    if (Group) {
      const docs = await Group.find().sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          id: d._id.toString(),
          name: d.name,
          description: d.description || '',
          createdBy: d.createdBy,
          createdByName: d.createdByName || 'Member',
          admins: (d.admins && d.admins.length > 0) ? d.admins : [d.createdBy],
          members: d.members || [],
          avatar: d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=047857&color=fff`,
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
          updatedAt: d.updatedAt?.toISOString?.() || new Date().toISOString()
        }));
      }
      return groupsCache;
    }
  } catch (err) {
    console.warn("MongoDB groups fetch failed, using memory:", err);
  }
  return groupsCache;
}

export async function createChatGroup(data: {
  name: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  members: string[];
  avatar?: string;
}): Promise<ChatGroup> {
  const membersList = Array.from(new Set([data.createdBy, ...(data.members || [])]));
  const adminsList = [data.createdBy];

  const newGroup: ChatGroup = {
    id: `grp-${Date.now()}`,
    name: data.name.trim(),
    description: (data.description || '').trim(),
    createdBy: data.createdBy,
    createdByName: data.createdByName || 'Team Member',
    admins: adminsList,
    members: membersList,
    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=047857&color=fff`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await connectToDatabase();
    if (Group) {
      const doc = await Group.create({
        name: newGroup.name,
        description: newGroup.description,
        createdBy: newGroup.createdBy,
        createdByName: newGroup.createdByName,
        admins: adminsList,
        members: membersList,
        avatar: newGroup.avatar
      });
      if (doc) newGroup.id = doc._id.toString();
    }
  } catch (err) {
    console.warn("Group save to DB failed, using memory:", err);
  }

  groupsCache.unshift(newGroup);
  return newGroup;
}

export async function updateChatGroup(
  groupId: string,
  data: { name?: string; description?: string; avatar?: string },
  requesterId: string
): Promise<ChatGroup | null> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const isSuper = requesterId === SUPER_ADMIN_EMAIL;
  const isAdmin = (group.admins || []).includes(requesterId) || group.createdBy === requesterId || isSuper;
  if (!isAdmin) {
    throw new Error("Unauthorized: Only group admins or owners can edit group settings.");
  }

  const updatedName = data.name !== undefined ? data.name.trim() : group.name;
  const updatedDesc = data.description !== undefined ? data.description.trim() : group.description;
  const updatedAvatar = data.avatar !== undefined ? data.avatar.trim() : group.avatar;

  try {
    await connectToDatabase();
    if (Group) {
      const isObjectId = groupId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await Group.findByIdAndUpdate(groupId, {
          $set: {
            name: updatedName,
            description: updatedDesc,
            avatar: updatedAvatar,
            updatedAt: new Date()
          }
        });
      }
    }
  } catch (err) {
    console.warn("MongoDB update group failed:", err);
  }

  const idx = groupsCache.findIndex(g => g.id === groupId);
  const updatedGroup: ChatGroup = {
    ...group,
    name: updatedName,
    description: updatedDesc,
    avatar: updatedAvatar,
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    groupsCache[idx] = updatedGroup;
  } else {
    groupsCache.unshift(updatedGroup);
  }

  return updatedGroup;
}

export async function addMembersToGroup(
  groupId: string,
  memberIds: string[],
  requesterId: string
): Promise<ChatGroup | null> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const isSuper = requesterId === SUPER_ADMIN_EMAIL;
  const isAdmin = (group.admins || []).includes(requesterId) || group.createdBy === requesterId || isSuper;
  const isMember = group.members.includes(requesterId);

  if (!isAdmin && !isMember) {
    throw new Error("Unauthorized: You must be a member of this group to invite colleagues.");
  }

  const newMembers = Array.from(new Set([...group.members, ...memberIds]));

  try {
    await connectToDatabase();
    if (Group) {
      const isObjectId = groupId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await Group.findByIdAndUpdate(groupId, {
          $set: { members: newMembers, updatedAt: new Date() }
        });
      }
    }
  } catch (err) {
    console.warn("MongoDB add group members failed:", err);
  }

  const idx = groupsCache.findIndex(g => g.id === groupId);
  const updated: ChatGroup = { ...group, members: newMembers, updatedAt: new Date().toISOString() };
  if (idx !== -1) groupsCache[idx] = updated;

  return updated;
}

export async function removeMemberFromGroup(
  groupId: string,
  targetUserId: string,
  requesterId: string
): Promise<ChatGroup | null> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const isSuper = requesterId === SUPER_ADMIN_EMAIL;
  const isOwner = group.createdBy === requesterId || isSuper;
  const isAdmin = (group.admins || []).includes(requesterId) || isOwner;
  const isSelf = requesterId === targetUserId;

  if (!isAdmin && !isSelf) {
    throw new Error("Unauthorized: Only group admins can remove members.");
  }

  if (targetUserId === group.createdBy && !isSelf && !isSuper) {
    throw new Error("Cannot remove the creator/owner of the group.");
  }

  const updatedMembers = group.members.filter(id => id !== targetUserId);
  const updatedAdmins = (group.admins || []).filter(id => id !== targetUserId);

  try {
    await connectToDatabase();
    if (Group) {
      const isObjectId = groupId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await Group.findByIdAndUpdate(groupId, {
          $set: { members: updatedMembers, admins: updatedAdmins, updatedAt: new Date() }
        });
      }
    }
  } catch (err) {
    console.warn("MongoDB remove member failed:", err);
  }

  const idx = groupsCache.findIndex(g => g.id === groupId);
  const updated: ChatGroup = {
    ...group,
    members: updatedMembers,
    admins: updatedAdmins,
    updatedAt: new Date().toISOString()
  };
  if (idx !== -1) groupsCache[idx] = updated;

  return updated;
}

export async function toggleGroupAdmin(
  groupId: string,
  targetUserId: string,
  requesterId: string
): Promise<ChatGroup | null> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const isSuper = requesterId === SUPER_ADMIN_EMAIL;
  const isOwner = group.createdBy === requesterId || isSuper;

  if (!isOwner) {
    throw new Error("Unauthorized: Only the group owner can promote or demote group admins.");
  }

  let updatedAdmins = [...(group.admins || [group.createdBy])];
  if (updatedAdmins.includes(targetUserId)) {
    // Cannot demote owner
    if (targetUserId === group.createdBy) return group;
    updatedAdmins = updatedAdmins.filter(id => id !== targetUserId);
  } else {
    updatedAdmins.push(targetUserId);
  }

  try {
    await connectToDatabase();
    if (Group) {
      const isObjectId = groupId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await Group.findByIdAndUpdate(groupId, {
          $set: { admins: updatedAdmins, updatedAt: new Date() }
        });
      }
    }
  } catch (err) {
    console.warn("MongoDB toggle admin failed:", err);
  }

  const idx = groupsCache.findIndex(g => g.id === groupId);
  const updated: ChatGroup = {
    ...group,
    admins: updatedAdmins,
    updatedAt: new Date().toISOString()
  };
  if (idx !== -1) groupsCache[idx] = updated;

  return updated;
}

export async function deleteChatGroup(
  groupId: string,
  requesterId: string
): Promise<boolean> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return false;

  const isSuper = requesterId === SUPER_ADMIN_EMAIL;
  const isOwner = group.createdBy === requesterId || isSuper;

  if (!isOwner) {
    throw new Error("Unauthorized: Only the group owner or Super Admin can delete this group.");
  }

  try {
    await connectToDatabase();
    if (Group) {
      const isObjectId = groupId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await Group.findByIdAndDelete(groupId);
      } else {
        await Group.deleteOne({ _id: groupId });
      }
    }
    if (Message) {
      await Message.deleteMany({ groupId });
    }
  } catch (err) {
    console.warn("MongoDB delete group failed:", err);
  }

  groupsCache = groupsCache.filter(g => g.id !== groupId);
  messagesCache = messagesCache.filter(m => m.groupId !== groupId);

  return true;
}

// ==================== PASSWORD RESET & OTP SYSTEM ====================

export async function createPasswordResetRequest(email: string): Promise<PasswordResetRequest> {
  const cleanEmail = email.toLowerCase().trim();
  const allUsers = await getAllUsers();
  const user = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error('No registered account found with this email address.');
  }

  // Generate a secure 6-digit verification OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes validity

  const newRequest: PasswordResetRequest = {
    id: `reset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    userName: user.name,
    code,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'pending',
  };

  try {
    await connectToDatabase();
    if (PasswordReset) {
      // Invalidate existing pending requests for this email
      await PasswordReset.updateMany(
        { email: cleanEmail, status: 'pending' },
        { $set: { status: 'cancelled' } }
      );

      const doc = await PasswordReset.create({
        email: cleanEmail,
        userName: user.name,
        code,
        status: 'pending',
        expiresAt,
      });
      if (doc) newRequest.id = doc._id.toString();
    }
  } catch (err) {
    console.warn("MongoDB save reset request failed, using memory:", err);
  }

  // Invalidate previous pending in memory cache
  resetRequestsCache = resetRequestsCache.map(r => 
    r.email === cleanEmail && r.status === 'pending' ? { ...r, status: 'cancelled' } : r
  );
  resetRequestsCache.unshift(newRequest);

  return newRequest;
}

export async function getActivePasswordResetRequests(): Promise<PasswordResetRequest[]> {
  const now = new Date();

  try {
    await connectToDatabase();
    if (PasswordReset) {
      const docs = await PasswordReset.find({
        status: 'pending',
        expiresAt: { $gt: now },
      }).sort({ createdAt: -1 }).lean();

      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          id: d._id.toString(),
          email: d.email,
          userName: d.userName,
          code: d.code,
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
          expiresAt: d.expiresAt?.toISOString?.() || new Date(Date.now() + 1800000).toISOString(),
          status: d.status,
        }));
      }
    }
  } catch (err) {
    console.warn("MongoDB get reset requests failed, using memory:", err);
  }

  return resetRequestsCache.filter(r => r.status === 'pending' && new Date(r.expiresAt) > now);
}

export async function verifyAndResetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const now = new Date();
  let matchedRequest: PasswordResetRequest | null = null;

  try {
    await connectToDatabase();
    if (PasswordReset) {
      const doc = await PasswordReset.findOne({
        email: cleanEmail,
        code: cleanCode,
        status: 'pending',
        expiresAt: { $gt: now },
      });

      if (doc) {
        matchedRequest = {
          id: doc._id.toString(),
          email: doc.email,
          userName: doc.userName,
          code: doc.code,
          createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
          expiresAt: doc.expiresAt?.toISOString?.() || new Date().toISOString(),
          status: doc.status,
        };
        doc.status = 'used';
        await doc.save();
      }
    }
  } catch (err) {
    console.warn("MongoDB verify reset failed, checking memory:", err);
  }

  if (!matchedRequest) {
    const memReq = resetRequestsCache.find(
      r => r.email === cleanEmail && r.code === cleanCode && r.status === 'pending' && new Date(r.expiresAt) > now
    );
    if (!memReq) {
      throw new Error('Invalid or expired verification code. Please check with your Admin.');
    }
    memReq.status = 'used';
    matchedRequest = memReq;
  }

  // Update password in Firebase Auth via Admin SDK
  if (adminAuth) {
    try {
      const userRecord = await adminAuth.getUserByEmail(cleanEmail);
      await adminAuth.updateUser(userRecord.uid, { password: newPassword });
    } catch (fbErr: any) {
      console.error("Firebase admin password update failed:", fbErr);
      throw new Error(fbErr.message || 'Failed to update password in Firebase Auth.');
    }
  } else {
    throw new Error('Firebase Admin Auth is not available.');
  }

  return { success: true, message: 'Password has been successfully reset. You can now login.' };
}

export async function cancelPasswordResetRequest(requestId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    if (PasswordReset) {
      const isObjectId = requestId.match(/^[0-9a-fA-F]{24}$/);
      if (isObjectId) {
        await PasswordReset.findByIdAndUpdate(requestId, { $set: { status: 'cancelled' } });
      }
    }
  } catch (err) {
    console.warn("MongoDB cancel reset failed:", err);
  }

  const idx = resetRequestsCache.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    resetRequestsCache[idx].status = 'cancelled';
  }
  return true;
}
