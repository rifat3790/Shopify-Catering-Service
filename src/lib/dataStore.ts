import { connectToDatabase } from './mongodb';
import { adminAuth, getFirebaseUsersList } from './firebaseAdmin';
import { persistentStore } from './persistentStore';
import { cloudBackupService } from './cloudBackupService';
import Order from './models/Order';
import MenuItem from './models/MenuItem';
import Customer from './models/Customer';
import User from './models/User';
import Message from './models/Message';
import Group from './models/Group';
import PasswordReset from './models/PasswordReset';
import Setting from './models/Setting';
import AuditLog from './models/AuditLog';
import DutyAssignment from './models/DutyAssignment';
import { 
  OrderData, 
  MenuItemData, 
  UserRecord, 
  UserRole,
  ChatMessage,
  ChatGroup,
  PasswordResetRequest,
  DailyDutyAssignment,
  UserAuditLog,
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

// Apply persistent overrides (name, username, avatar, department, etc.) and ensure @username exists
export function applyUserOverridesAndUsername(user: UserRecord): UserRecord {
  const overrides = persistentStore.getUserOverrides();
  const emailKey = user.email.toLowerCase().trim();
  const idKey = (user.id || '').toLowerCase().trim();
  const ov = overrides[emailKey] || overrides[idKey] || {};

  const cleanEmail = user.email.toLowerCase().trim();
  const defaultUsername = '@' + cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');

  let rawUsername = user.username || ov.username || defaultUsername;
  if (!rawUsername.startsWith('@')) {
    rawUsername = '@' + rawUsername;
  }

  const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  return {
    ...user,
    name: user.name || ov.name,
    username: rawUsername.toLowerCase(),
    avatar: (user.avatar && user.avatar.trim()) ? user.avatar : (ov.avatar || user.avatar),
    department: user.department || ov.department,
    phone: user.phone !== undefined ? user.phone : (ov.phone !== undefined ? ov.phone : ''),
    balance: user.balance !== undefined ? user.balance : (ov.balance !== undefined ? ov.balance : 0),
    role: isSuper ? 'super_admin' : (user.role || ov.role || 'user'),
  };
}

// Cached Firebase Auth users to prevent throttling Google APIs on every request
let cachedFbUsers: Array<{ uid: string; email: string; displayName?: string; photoURL?: string; role?: string; createdAt?: string }> = [];
let lastFbFetch = 0;

// High-speed TTL caches to reduce MongoDB Atlas latency by ~100x while remaining 100% dynamic
let cachedUsersResult: UserRecord[] | null = null;
let lastUsersFetch = 0;
const USERS_CACHE_TTL = 3000;

let cachedOrdersResult: OrderData[] | null = null;
let lastOrdersFetch = 0;
const ORDERS_CACHE_TTL = 2000;

let cachedMenuResult: MenuItemData[] | null = null;
let lastMenuFetch = 0;
const MENU_CACHE_TTL = 4000;

export function invalidateUsersCache() {
  lastUsersFetch = 0;
  cachedUsersResult = null;
}

export function invalidateOrdersCache() {
  lastOrdersFetch = 0;
  cachedOrdersResult = null;
}

export function invalidateMenuCache() {
  lastMenuFetch = 0;
  cachedMenuResult = null;
}

async function getCachedFbUsers() {
  const now = Date.now();
  if (cachedFbUsers.length > 0 && (now - lastFbFetch) < 30000) {
    return cachedFbUsers;
  }
  try {
    cachedFbUsers = await getFirebaseUsersList();
    lastFbFetch = now;
  } catch (err) {
    console.warn("Could not fetch Firebase Auth users:", err);
  }
  return cachedFbUsers;
}

// User Management - ALL REGISTERED USERS (FROM FIREBASE AUTH & DATABASE)
export async function getAllUsers(): Promise<UserRecord[]> {
  const now = Date.now();
  if (cachedUsersResult && (now - lastUsersFetch < USERS_CACHE_TTL)) {
    return cachedUsersResult;
  }

  // 1. Fetch real registered users from Firebase Authentication (cached for fast 0-latency)
  const fbUsers = await getCachedFbUsers();

  // 2. Try MongoDB
  let mongoDocs: any[] = [];
  let deletedSet = new Set<string>();

  try {
    await connectToDatabase();

    // Read deleted_users tombstone list
    if (Setting) {
      const delDoc = await Setting.findOne({ key: 'deleted_users' }).lean();
      if (delDoc && Array.isArray((delDoc as any).value)) {
        deletedSet = new Set((delDoc as any).value.map((x: any) => String(x).toLowerCase().trim()));
      }
    }

    if (User) {
      // 1 single query to fetch all documents
      const rawDocs = await User.find().sort({ createdAt: -1 }).lean();
      
      // Filter out tombstoned deleted users
      mongoDocs = rawDocs.filter((d: any) => {
        const mEmail = (d.email || '').toLowerCase().trim();
        const mUid = (d.uid || '').toLowerCase().trim();
        if (deletedSet.has(mEmail) || (mUid && deletedSet.has(mUid))) {
          User.deleteOne({ _id: d._id }).catch(() => {});
          return false;
        }
        return true;
      });

      // Fast in-memory lookup to check for missing Firebase users
      const existingEmailSet = new Set(mongoDocs.map((d: any) => (d.email || '').toLowerCase().trim()));
      
      for (const fb of fbUsers) {
        if (!fb.email) continue;
        const emailClean = fb.email.toLowerCase().trim();
        const uidClean = (fb.uid || '').toLowerCase().trim();

        if (deletedSet.has(emailClean) || (uidClean && deletedSet.has(uidClean))) {
          continue;
        }

        if (!existingEmailSet.has(emailClean)) {
          const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();
          const targetRole = isSuper ? 'super_admin' : (fb.role === 'admin' ? 'admin' : 'user');
          try {
            const newDoc = await User.create({
              uid: fb.uid,
              name: fb.displayName || emailClean.split('@')[0],
              email: emailClean,
              role: targetRole,
              balance: 0,
              currentDue: 0,
              totalSpent: 0,
              department: isSuper ? 'Executive Management' : (targetRole === 'admin' ? 'Admin Team' : 'Shopify Member'),
              avatar: fb.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.displayName || 'Member')}&background=047857&color=fff`,
              createdAt: fb.createdAt ? new Date(fb.createdAt) : new Date(),
            });
            mongoDocs.push(newDoc.toObject ? newDoc.toObject() : newDoc);
            existingEmailSet.add(emailClean);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn("MongoDB connection fallback to Firebase users & memory:", err);
  }

  // Pre-calculate real totalSpent and real currentDue strictly from MongoDB orders
  const orderStatsMap = new Map<string, { totalSpent: number; currentDue: number }>();
  try {
    if (Order) {
      const orderDocs = await Order.find({}).select('customerEmail userId customerName totalBill paidAmount changeDue status').lean();
      for (const o of orderDocs as any[]) {
        const mail = (o.customerEmail || '').toLowerCase().trim();
        const uid = (o.userId || '').toLowerCase().trim();
        const name = (o.customerName || '').toLowerCase().trim();
        const bill = Number(o.totalBill) || 0;
        const isDue = o.status === 'Due' || o.changeDue < 0;
        const due = isDue ? Math.max(0, bill - (Number(o.paidAmount) || 0)) : 0;

        const keys = [mail, uid, name].filter(Boolean);
        for (const k of keys) {
          const current = orderStatsMap.get(k) || { totalSpent: 0, currentDue: 0 };
          current.totalSpent += bill;
          current.currentDue += due;
          orderStatsMap.set(k, current);
        }
      }
    }
  } catch (ordErr) {
    console.warn("Could not calculate orderStatsMap:", ordErr);
  }

  // 3. If MongoDB has records, map them
  if (mongoDocs && mongoDocs.length > 0) {
    const mapped: UserRecord[] = mongoDocs.map((d: any) => {
      const lastSeenTime = d.lastSeen ? new Date(d.lastSeen).getTime() : (d.updatedAt ? new Date(d.updatedAt).getTime() : now);
      const isRecentlyActive = (now - lastSeenTime) < (3 * 60 * 1000);
      const isSuper = d.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      const userMail = (d.email || '').toLowerCase().trim();
      const userUid = (d.uid || '').toLowerCase().trim();
      const userName = (d.name || '').toLowerCase().trim();

      const stats = orderStatsMap.get(userMail) || (userUid ? orderStatsMap.get(userUid) : undefined) || (userName ? orderStatsMap.get(userName) : undefined);
      const realSpent = stats ? stats.totalSpent : 0;
      const realDue = typeof d.currentDue === 'number' && d.currentDue > 0
        ? d.currentDue
        : (stats ? stats.currentDue : 0);

      // Auto-heal User record in MongoDB Atlas if stale
      if (User && (Number(d.totalSpent) !== realSpent || Number(d.currentDue) !== realDue)) {
        User.updateOne({ _id: d._id }, { $set: { totalSpent: realSpent, currentDue: realDue } }).catch(() => {});
      }

      return {
        id: d.uid || d._id.toString(),
        name: d.name,
        username: d.username || ('@' + d.email.split('@')[0].replace(/[^a-z0-9_]/g, '')),
        email: d.email,
        role: (isSuper ? 'super_admin' : d.role) as UserRole,
        status: (isSuper ? 'approved' : (d.status || 'approved')) as any,
        balance: Number(d.balance) || 0,
        currentDue: realDue,
        totalSpent: realSpent,
        department: d.department || (isSuper ? 'Executive Management' : 'Shopify Team'),
        avatar: d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'User')}&background=047857&color=fff`,
        phone: d.phone || '',
        lastSeen: d.lastSeen?.toISOString?.() || new Date(lastSeenTime).toISOString(),
        isOnline: Boolean(d.isOnline || isRecentlyActive),
        blockedUsers: d.blockedUsers || [],
        themeColor: d.themeColor || 'emerald',
        customTheme: d.customTheme,
        createdAt: d.createdAt?.toISOString?.() || new Date().toISOString()
      };
    });

    // Ensure any Firebase user not yet in MongoDB is also included (EXCLUDING deleted users)
    for (const fb of fbUsers) {
      if (!fb.email) continue;
      const emailClean = fb.email.toLowerCase().trim();
      const uidClean = (fb.uid || '').toLowerCase().trim();
      if (deletedSet.has(emailClean) || (uidClean && deletedSet.has(uidClean))) {
        continue;
      }

      const found = mapped.find(m => m.email.toLowerCase() === emailClean);
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

    const finalized = mapped.map(u => applyUserOverridesAndUsername(u));
    usersCache = finalized;
    cachedUsersResult = finalized;
    lastUsersFetch = now;
    return finalized;
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

  const finalized = combinedList.map(u => applyUserOverridesAndUsername(u));
  usersCache = finalized;
  cachedUsersResult = finalized;
  lastUsersFetch = now;
  return finalized;
}

// Presence & Heartbeat update
export async function updateUserPresence(idOrEmail: string, isOnline: boolean = true): Promise<void> {
  const search = idOrEmail.toLowerCase().trim();
  const now = new Date();

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId 
        ? { _id: idOrEmail } 
        : { $or: [{ uid: idOrEmail }, { email: search }, { name: search }] };
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

// Update User Profile (Name, @Username, Avatar, Department, Phone)
export async function updateUserProfile(
  userIdOrEmail: string,
  updates: Partial<UserRecord>,
  fallbackEmail?: string
): Promise<UserRecord | null> {
  invalidateUsersCache();
  if (updates.username) {
    let un = updates.username.trim();
    if (!un.startsWith('@')) un = '@' + un;
    updates.username = un.toLowerCase().replace(/[^a-z0-9_@]/g, '');
  }

  const cleanEmail = (fallbackEmail || (userIdOrEmail.includes('@') ? userIdOrEmail : '')).toLowerCase().trim();
  const isObjectId = userIdOrEmail.match(/^[0-9a-fA-F]{24}$/);

  // 1. Authoritative update in MongoDB Atlas
  let updatedDoc: any = null;
  try {
    const db = await connectToDatabase();
    if (db && User) {
      const orConditions: any[] = [];
      if (cleanEmail) orConditions.push({ email: cleanEmail });
      orConditions.push({ uid: userIdOrEmail });
      if (isObjectId) orConditions.push({ _id: userIdOrEmail });
      if (userIdOrEmail.toLowerCase().trim() !== cleanEmail) {
        orConditions.push({ email: userIdOrEmail.toLowerCase().trim() });
      }

      const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
      updatedDoc = await User.findOneAndUpdate(query, { $set: updates }, { new: true });
      if (!updatedDoc && cleanEmail) {
        updatedDoc = await User.findOneAndUpdate({ email: cleanEmail }, { $set: updates }, { new: true });
      }
    }
  } catch (e) {
    console.error('MongoDB updateUserProfile error:', e);
  }

  // 2. Update persistentStore with email key
  const storeKey = cleanEmail || updatedDoc?.email || userIdOrEmail;
  persistentStore.updateUserProfile(storeKey, updates);

  // 3. If Firebase user, update Firebase Auth profile (safe with photoURL format check)
  try {
    if (adminAuth) {
      const targetUid = updatedDoc?.uid || (userIdOrEmail.length > 20 && !userIdOrEmail.includes('@') ? userIdOrEmail : null);
      if (targetUid) {
        const fbUpdates: any = {};
        if (updates.name) fbUpdates.displayName = updates.name;
        // Firebase strictly requires valid HTTP/HTTPS URL and <= 2048 chars for photoURL (data: URIs are rejected)
        if (updates.avatar && (updates.avatar.startsWith('http://') || updates.avatar.startsWith('https://')) && updates.avatar.length <= 2000) {
          fbUpdates.photoURL = updates.avatar;
        }
        if (Object.keys(fbUpdates).length > 0) {
          await adminAuth.updateUser(targetUid, fbUpdates).catch(() => {});
        }
      }
    }
  } catch (e) {}

  // 4. Update in-memory cache and return finalized record
  if (updatedDoc) {
    const freshRecord: UserRecord = {
      id: updatedDoc.uid || updatedDoc._id.toString(),
      name: updatedDoc.name,
      username: updatedDoc.username,
      email: updatedDoc.email,
      role: updatedDoc.role as UserRole,
      balance: Number(updatedDoc.balance) || 0,
      currentDue: Number(updatedDoc.currentDue) || 0,
      totalSpent: Number(updatedDoc.totalSpent) || 0,
      department: updatedDoc.department,
      avatar: updatedDoc.avatar,
      phone: updatedDoc.phone,
      themeColor: updatedDoc.themeColor || 'emerald',
      customTheme: updatedDoc.customTheme,
      createdAt: updatedDoc.createdAt?.toISOString?.() || new Date().toISOString()
    };
    usersCache = usersCache.map(u => 
      (u.id === freshRecord.id || u.email.toLowerCase() === freshRecord.email.toLowerCase()) ? freshRecord : u
    );
    return applyUserOverridesAndUsername(freshRecord);
  }

  const all = await getAllUsers();
  return all.find(
    u => u.id === userIdOrEmail || 
    (cleanEmail && u.email.toLowerCase() === cleanEmail) || 
    u.email.toLowerCase() === userIdOrEmail.toLowerCase()
  ) || null;
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
  allowRevive?: boolean;
}): Promise<UserRecord> {
  invalidateUsersCache();
  const emailClean = userData.email.toLowerCase().trim();
  const uidClean = (userData.uid || '').toLowerCase().trim();
  const isSuper = emailClean === SUPER_ADMIN_EMAIL.toLowerCase();

  try {
    await connectToDatabase();

    // When a user signs in or registers fresh, clear any previous deletion tombstone so their new account works permanently
    if (Setting) {
      await Setting.findOneAndUpdate(
        { key: 'deleted_users' },
        { $pull: { value: { $in: [emailClean, uidClean].filter(Boolean) } } }
      ).catch(() => {});
    }

    if (User) {
      let doc = await User.findOne({
        $or: [
          { email: emailClean },
          ...(userData.uid ? [{ uid: userData.uid }] : [])
        ]
      });
      if (!doc) {
        // Create new real authenticated user in MongoDB
        doc = await User.create({
          uid: userData.uid || '',
          name: userData.name || emailClean.split('@')[0],
          email: emailClean,
          role: isSuper ? 'super_admin' : 'user',
          status: isSuper ? 'approved' : 'pending',
          balance: 0,
          currentDue: 0,
          totalSpent: 0,
          department: isSuper ? 'Super Admin & Executive' : 'Shopify Member',
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=047857&color=fff`,
        });
      } else {
        // If super admin email, enforce super_admin role
        let changed = false;
        if (isSuper && doc.role !== 'super_admin') {
          doc.role = 'super_admin';
          changed = true;
        }
        // CRITICAL FIX: Only set avatar if doc.avatar is empty! NEVER overwrite a user's chosen custom avatar with Firebase default
        if (!doc.avatar && userData.avatar) {
          doc.avatar = userData.avatar;
          changed = true;
        }
        if (userData.uid && !doc.uid) {
          doc.uid = userData.uid;
          changed = true;
        }
        if (userData.name && !doc.name) {
          doc.name = userData.name;
          changed = true;
        }
        if (changed) {
          await doc.save();
        }
      }

      const syncedRecord: UserRecord = {
        id: doc.uid || doc._id.toString(),
        name: doc.name,
        username: doc.username,
        email: doc.email,
        role: (isSuper ? 'super_admin' : doc.role) as UserRole,
        status: (isSuper ? 'approved' : (doc.status || 'approved')) as any,
        balance: Number(doc.balance) || 0,
        currentDue: Number(doc.currentDue) || 0,
        totalSpent: Number(doc.totalSpent) || 0,
        department: doc.department || 'Shopify Team',
        avatar: doc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || 'User')}&background=047857&color=fff`,
        phone: doc.phone || '',
        blockedUsers: doc.blockedUsers || [],
        themeColor: doc.themeColor || 'emerald',
        customTheme: doc.customTheme,
        createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString()
      };

      const finalized = applyUserOverridesAndUsername(syncedRecord);
      const idx = usersCache.findIndex(u => u.email.toLowerCase() === emailClean);
      if (idx !== -1) {
        usersCache[idx] = finalized;
      } else {
        usersCache = [finalized, ...usersCache];
      }

      return finalized;
    }
  } catch (err) {
    console.error("MongoDB user sync failed, fallback to memory:", err);
  }

  // Memory fallback
  const existing = usersCache.find(u => u.email.toLowerCase() === emailClean);
  if (existing) {
    if (isSuper) existing.role = 'super_admin';
    return applyUserOverridesAndUsername(existing);
  }

  const newRec: UserRecord = applyUserOverridesAndUsername({
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
  });
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

export async function updateUserRole(
  idOrEmail: string,
  newRole: UserRole,
  fallbackEmail?: string
): Promise<UserRecord | null> {
  invalidateUsersCache();
  const search = idOrEmail.toLowerCase().trim();
  const cleanEmail = (fallbackEmail || (idOrEmail.includes('@') ? idOrEmail : '')).toLowerCase().trim();
  
  // Primary super admin cannot be demoted
  if ((search === SUPER_ADMIN_EMAIL.toLowerCase() || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) && newRole !== 'super_admin') {
    newRole = 'super_admin';
  }

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const orConditions: any[] = [];
      if (cleanEmail) orConditions.push({ email: cleanEmail });
      orConditions.push({ uid: idOrEmail });
      if (isObjectId) orConditions.push({ _id: idOrEmail });
      if (search && search !== cleanEmail) {
        orConditions.push({ email: search });
        orConditions.push({ name: search });
      }

      const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
      let doc = await User.findOneAndUpdate(query, { role: newRole }, { new: true });
      if (!doc && cleanEmail) {
        doc = await User.findOneAndUpdate({ email: cleanEmail }, { role: newRole }, { new: true });
      }

      if (doc) {
        lastFbFetch = 0; // Invalidate cached Firebase users
        // Also update Firebase custom claims if Firebase Admin SDK available
        if (adminAuth) {
          const targetUid = doc.uid || (idOrEmail.length > 20 && !idOrEmail.includes('@') ? idOrEmail : '');
          if (targetUid) {
            try {
              await adminAuth.setCustomUserClaims(targetUid, { role: newRole });
            } catch (fbErr) {
              console.warn('Could not set Firebase custom claims for role:', fbErr);
            }
          } else if (doc.email) {
            try {
              const fbUser = await adminAuth.getUserByEmail(doc.email);
              if (fbUser && fbUser.uid) {
                await adminAuth.setCustomUserClaims(fbUser.uid, { role: newRole });
                doc.uid = fbUser.uid;
                await doc.save();
              }
            } catch (fbErr) {}
          }
        }

        // Also update persistentStore overrides
        persistentStore.updateUserProfile(doc.email, { role: newRole });

        const updated: UserRecord = {
          id: doc.uid || doc._id.toString(),
          name: doc.name,
          username: doc.username,
          email: doc.email,
          role: doc.role as UserRole,
          balance: Number(doc.balance) || 0,
          currentDue: Number(doc.currentDue) || 0,
          totalSpent: Number(doc.totalSpent) || 0,
          department: doc.department,
          avatar: doc.avatar,
          phone: doc.phone,
          createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString()
        };
        usersCache = usersCache.map(u => (u.id === updated.id || u.email.toLowerCase() === doc.email.toLowerCase()) ? updated : u);
        return updated;
      }
    }
  } catch (err) {
    console.warn("MongoDB update role failed, using cache:", err);
  }

  const idx = usersCache.findIndex(u => 
    u.id === idOrEmail || 
    (cleanEmail && u.email.toLowerCase() === cleanEmail) || 
    u.email.toLowerCase() === search || 
    u.name.toLowerCase() === search
  );
  if (idx !== -1) {
    usersCache[idx].role = newRole;
    persistentStore.updateUserProfile(usersCache[idx].email, { role: newRole });
    return usersCache[idx];
  }
  return null;
}

// Update User Approval Status ('approved' | 'pending' | 'rejected')
export async function updateUserStatus(
  idOrEmail: string,
  newStatus: 'approved' | 'pending' | 'rejected',
  fallbackEmail?: string
): Promise<UserRecord | null> {
  invalidateUsersCache();
  const search = idOrEmail.toLowerCase().trim();
  const cleanEmail = (fallbackEmail || (idOrEmail.includes('@') ? idOrEmail : '')).toLowerCase().trim();

  // Primary super admin is always approved
  if (search === SUPER_ADMIN_EMAIL.toLowerCase() || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    newStatus = 'approved';
  }

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const orConditions: any[] = [];
      if (cleanEmail) orConditions.push({ email: cleanEmail });
      orConditions.push({ uid: idOrEmail });
      if (isObjectId) orConditions.push({ _id: idOrEmail });
      if (search && search !== cleanEmail) {
        orConditions.push({ email: search });
        orConditions.push({ name: search });
      }

      const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
      let doc = await User.findOneAndUpdate(query, { status: newStatus }, { new: true });
      if (!doc && cleanEmail) {
        doc = await User.findOneAndUpdate({ email: cleanEmail }, { status: newStatus }, { new: true });
      }

      if (doc) {
        lastFbFetch = 0;
        persistentStore.updateUserProfile(doc.email, { status: newStatus } as any);

        const updated: UserRecord = {
          id: doc.uid || doc._id.toString(),
          name: doc.name,
          username: doc.username,
          email: doc.email,
          role: (doc.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : doc.role) as UserRole,
          status: (doc.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'approved' : doc.status) as any,
          balance: Number(doc.balance) || 0,
          currentDue: Number(doc.currentDue) || 0,
          totalSpent: Number(doc.totalSpent) || 0,
          department: doc.department || 'Shopify Team',
          avatar: doc.avatar,
          phone: doc.phone || '',
          blockedUsers: doc.blockedUsers || [],
          themeColor: doc.themeColor || 'emerald',
          customTheme: doc.customTheme,
          createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString()
        };

        const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === cleanEmail || u.email.toLowerCase() === search);
        if (idx !== -1) {
          usersCache[idx] = { ...usersCache[idx], status: newStatus };
        }
        return applyUserOverridesAndUsername(updated);
      }
    }
  } catch (e) {
    console.warn('updateUserStatus error:', e);
  }

  const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === cleanEmail || u.email.toLowerCase() === search);
  if (idx !== -1) {
    usersCache[idx].status = newStatus;
    persistentStore.updateUserProfile(usersCache[idx].email, { status: newStatus } as any);
    return usersCache[idx];
  }

  return null;
}

// Delete Member permanently from Database, Firebase Auth & Memory Cache
export async function deleteUser(idOrEmail: string, fallbackEmail?: string): Promise<boolean> {
  invalidateUsersCache();
  const search = idOrEmail.toLowerCase().trim();
  const cleanFallback = fallbackEmail ? fallbackEmail.toLowerCase().trim() : '';

  // Root Super Admin account cannot be deleted!
  if (search === SUPER_ADMIN_EMAIL.toLowerCase() || cleanFallback === SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Primary Root Super Admin account cannot be deleted');
  }

  // Check if target user in cache is root super admin
  const cachedUser = usersCache.find(u => 
    u.id === idOrEmail || 
    (cleanFallback && u.email.toLowerCase() === cleanFallback) ||
    u.email.toLowerCase() === search || 
    u.name.toLowerCase() === search
  );
  if (cachedUser && cachedUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Primary Root Super Admin account cannot be deleted');
  }

  let deleted = false;
  let targetEmail = cachedUser?.email?.toLowerCase().trim() || cleanFallback || (search.includes('@') ? search : '');
  let targetUid = (cachedUser && !cachedUser.id.startsWith('usr-') ? cachedUser.id : '') || (idOrEmail.length > 20 && !idOrEmail.includes('@') ? idOrEmail : '');

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const orList: any[] = [{ uid: idOrEmail }, { email: search }];
      if (isObjectId) orList.push({ _id: idOrEmail });
      if (targetEmail) orList.push({ email: targetEmail });
      if (cleanFallback) orList.push({ email: cleanFallback });
      if (targetUid) orList.push({ uid: targetUid });
      orList.push({ name: search });

      const query = { $or: orList };
      const target = await User.findOne(query).lean();
      if (target) {
        if ((target as any).email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          throw new Error('Primary Root Super Admin account cannot be deleted');
        }
        if (!targetEmail && (target as any).email) targetEmail = (target as any).email.toLowerCase().trim();
        if (!targetUid && (target as any).uid) targetUid = (target as any).uid;
      }

      const identifiers = [targetEmail, targetUid, search, cleanFallback].filter(Boolean);

      // Run MongoDB purge, tombstone record, and Firebase Auth purge IN PARALLEL for instant deletion speed
      const ops: Promise<any>[] = [
        User.deleteMany(query).then((res: any) => {
          if (res && res.deletedCount && res.deletedCount > 0) deleted = true;
        }),
      ];

      if (Setting && identifiers.length > 0) {
        ops.push(
          Setting.findOneAndUpdate(
            { key: 'deleted_users' },
            { $addToSet: { value: { $each: identifiers } } },
            { upsert: true, new: true }
          )
        );
      }

      if (adminAuth) {
        if (targetUid) {
          ops.push(adminAuth.deleteUser(targetUid).catch(() => {}));
        }
        if (targetEmail) {
          ops.push(
            adminAuth
              .getUserByEmail(targetEmail)
              .then((fbUser) => (fbUser?.uid ? adminAuth.deleteUser(fbUser.uid) : null))
              .catch(() => {})
          );
        }
      }

      await Promise.allSettled(ops);
    }
  } catch (err: any) {
    if (err.message?.includes('Super Admin')) {
      throw err;
    }
    console.warn("MongoDB delete user failed, using cache fallback:", err);
  }

  // Purge from persistentStore & cached Firebase list immediately so deleted user never flickers back
  cachedFbUsers = cachedFbUsers.filter(
    (fb) =>
      fb.uid !== idOrEmail &&
      (targetUid ? fb.uid !== targetUid : true) &&
      (fb.email || '').toLowerCase() !== search &&
      (cleanFallback ? (fb.email || '').toLowerCase() !== cleanFallback : true) &&
      (targetEmail ? (fb.email || '').toLowerCase() !== targetEmail : true)
  );

  // 3. Purge from persistentStore
  persistentStore.deleteUser(search);
  if (targetEmail) persistentStore.deleteUser(targetEmail);
  if (cleanFallback) persistentStore.deleteUser(cleanFallback);
  if (targetUid) persistentStore.deleteUser(targetUid);

  // 4. Purge from in-memory cache
  const initialLen = usersCache.length;
  usersCache = usersCache.filter(u => 
    u.id !== idOrEmail && 
    (targetUid ? u.id !== targetUid : true) &&
    u.email.toLowerCase() !== search && 
    (cleanFallback ? u.email.toLowerCase() !== cleanFallback : true) &&
    (targetEmail ? u.email.toLowerCase() !== targetEmail : true) &&
    u.name.toLowerCase() !== search
  );
  if (usersCache.length < initialLen) {
    deleted = true;
  }

  return true;
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
  invalidateUsersCache();
  const search = idOrEmail.toLowerCase().trim();
  const amt = Number(amount) || 0;

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const query = isObjectId 
        ? { _id: idOrEmail } 
        : { 
            $or: [
              { uid: idOrEmail }, 
              { email: { $regex: new RegExp(`^${escapeRegex(search)}$`, 'i') } }, 
              { name: { $regex: new RegExp(`^${escapeRegex(search)}$`, 'i') } }
            ] 
          };
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

        // Also sync customClaims in Firebase Auth if available
        if (adminAuth) {
          try {
            const fbUser = await adminAuth.getUser(userDoc.uid || '').catch(() => 
              adminAuth.getUserByEmail(userDoc.email).catch(() => null)
            );
            if (fbUser) {
              await adminAuth.setCustomUserClaims(fbUser.uid, {
                ...(fbUser.customClaims || {}),
                balance: userDoc.balance,
                totalSpent: userDoc.totalSpent,
                role: userDoc.role,
              });
            }
          } catch (e) {}
        }

        // Persist to store
        persistentStore.updateUserProfile(userDoc.email, {
          balance: userDoc.balance,
          totalSpent: userDoc.totalSpent,
        });

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
        usersCache = usersCache.map(u => (u.id === updated.id || u.email.toLowerCase() === updated.email.toLowerCase()) ? updated : u);
        cloudBackupService.setMongoHealthy(true);
        cloudBackupService.backupUser(updated);
        return applyUserOverridesAndUsername(updated);
      }
    }
  } catch (err: any) {
    cloudBackupService.setMongoHealthy(false, err?.message);
    console.warn("MongoDB update balance failed, using resilient backup cache:", err);
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
    persistentStore.updateUserProfile(usersCache[idx].email, {
      balance: usersCache[idx].balance,
    });
    cloudBackupService.backupUser(usersCache[idx]);
    return applyUserOverridesAndUsername(usersCache[idx]);
  }
  return null;
}

// Due Amount Add, Deduct, Set, and Clear
export async function updateUserDue(
  idOrEmail: string,
  amount: number,
  action: 'add' | 'deduct' | 'set' | 'clear' = 'set'
): Promise<UserRecord | null> {
  invalidateUsersCache();
  const search = idOrEmail.toLowerCase().trim();
  const amt = Number(amount) || 0;

  try {
    await connectToDatabase();
    if (User) {
      const isObjectId = idOrEmail.match(/^[0-9a-fA-F]{24}$/);
      const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const query = isObjectId
        ? { _id: idOrEmail }
        : {
            $or: [
              { uid: idOrEmail },
              { email: { $regex: new RegExp(`^${escapeRegex(search)}$`, 'i') } },
              { name: { $regex: new RegExp(`^${escapeRegex(search)}$`, 'i') } }
            ]
          };
      const userDoc = await User.findOne(query);
      if (userDoc) {
        if (action === 'clear') {
          userDoc.currentDue = 0;
        } else if (action === 'add') {
          userDoc.currentDue = (userDoc.currentDue || 0) + amt;
        } else if (action === 'deduct') {
          userDoc.currentDue = Math.max(0, (userDoc.currentDue || 0) - amt);
        } else if (action === 'set') {
          userDoc.currentDue = Math.max(0, amt);
        }
        await userDoc.save();

        persistentStore.updateUserProfile(userDoc.email, {
          currentDue: userDoc.currentDue,
        });

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
        usersCache = usersCache.map(u => (u.id === updated.id || u.email.toLowerCase() === updated.email.toLowerCase()) ? updated : u);
        cloudBackupService.setMongoHealthy(true);
        cloudBackupService.backupUser(updated);
        return applyUserOverridesAndUsername(updated);
      }
    }
  } catch (err: any) {
    cloudBackupService.setMongoHealthy(false, err?.message);
    console.warn("MongoDB update due failed, using resilient backup cache:", err);
  }

  const idx = usersCache.findIndex(u => u.id === idOrEmail || u.email.toLowerCase() === search || u.name.toLowerCase() === search);
  if (idx !== -1) {
    if (action === 'clear') {
      usersCache[idx].currentDue = 0;
    } else if (action === 'add') {
      usersCache[idx].currentDue = (usersCache[idx].currentDue || 0) + amt;
    } else if (action === 'deduct') {
      usersCache[idx].currentDue = Math.max(0, (usersCache[idx].currentDue || 0) - amt);
    } else if (action === 'set') {
      usersCache[idx].currentDue = Math.max(0, amt);
    }
    persistentStore.updateUserProfile(usersCache[idx].email, {
      currentDue: usersCache[idx].currentDue,
    });
    cloudBackupService.backupUser(usersCache[idx]);
    return applyUserOverridesAndUsername(usersCache[idx]);
  }
  return null;
}

// Order Management APIs
export async function getAllOrders(): Promise<OrderData[]> {
  const now = Date.now();
  if (cachedOrdersResult && (now - lastOrdersFetch < ORDERS_CACHE_TTL)) {
    return cachedOrdersResult;
  }

  try {
    const db = await connectToDatabase();
    if (db && Order) {
      const docs = await Order.find().sort({ createdAt: -1 }).lean();
      const mapped = docs.map((d: any) => {
        let avatar = d.customerAvatar;
        let mail = d.customerEmail;
        if ((!avatar || !mail) && d.customerName) {
          const u = usersCache.find(usr => 
            (d.customerEmail && usr.email.toLowerCase() === d.customerEmail.toLowerCase()) ||
            usr.name.toLowerCase() === d.customerName.toLowerCase()
          );
          if (u) {
            if (!avatar) avatar = u.avatar;
            if (!mail) mail = u.email;
          }
        }
        if (!avatar && d.customerName) {
          avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.customerName)}&background=047857&color=fff`;
        }
        return {
          ...d,
          customerAvatar: avatar,
          customerEmail: mail || '',
          _id: d._id.toString(),
          orderDate: d.orderDate?.toISOString?.() || new Date().toISOString(),
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
        } as unknown as OrderData;
      });
      ordersCache = mapped;
      cachedOrdersResult = mapped;
      lastOrdersFetch = now;
      mapped.forEach(o => persistentStore.saveOrder(o));
      cloudBackupService.setMongoHealthy(true);
      return mapped;
    }
  } catch (err: any) {
    cloudBackupService.setMongoHealthy(false, err?.message);
    console.warn("MongoDB getAllOrders error, fallback to persistent backup store:", err);
  }

  let pOrders = persistentStore.getOrders();
  if (!pOrders || pOrders.length === 0) {
    const snapshot = cloudBackupService.restoreLatestSnapshot();
    if (snapshot && snapshot.orders.length > 0) {
      pOrders = snapshot.orders;
      pOrders.forEach(o => persistentStore.saveOrder(o));
    }
  }

  cachedOrdersResult = pOrders;
  lastOrdersFetch = now;
  return pOrders;
}

export async function createOrder(data: Partial<OrderData>): Promise<OrderData> {
  const newOrderNumber = `ORD-${Date.now().toString().slice(-4)}`;
  const totalBill = Number(data.totalBill) || 0;
  const paidAmount = Number(data.paidAmount) || 0;
  const changeDue = paidAmount - totalBill;
  
  let status: OrderData['status'] = data.status || 'Pending';
  if (totalBill > 0 && (paidAmount >= totalBill || data.paymentMethod === 'Wallet')) {
    status = 'Paid';
  } else if (totalBill > 0 && paidAmount > 0 && paidAmount < totalBill) {
    status = 'Partial';
  } else if (totalBill > 0 && paidAmount === 0) {
    status = 'Due';
  }

  // Auto-populate avatar, email, and user id from known users or MongoDB if not provided
  let custAvatar = data.customerAvatar || '';
  let uId = data.userId || '';
  let custEmail = (data.customerEmail || '').toLowerCase().trim();
  const custName = (data.customerName || '').toLowerCase().trim();

  // Find user in cache or MongoDB
  let matchedUser = usersCache.find(
    u => (custEmail && u.email.toLowerCase() === custEmail) ||
         (custName && u.name.toLowerCase() === custName)
  );

  if (!matchedUser) {
    try {
      await connectToDatabase();
      if (User) {
        const uDoc = await User.findOne({
          $or: [
            { email: custEmail || '___none___' },
            { name: custName || '___none___' }
          ]
        });
        if (uDoc) {
          matchedUser = {
            id: uDoc._id.toString(),
            name: uDoc.name,
            email: uDoc.email,
            avatar: uDoc.avatar,
            role: uDoc.role,
            balance: Number(uDoc.balance) || 0,
            currentDue: Number(uDoc.currentDue) || 0,
            totalSpent: Number(uDoc.totalSpent) || 0,
            department: uDoc.department,
            createdAt: uDoc.createdAt?.toISOString?.() || new Date().toISOString()
          };
          usersCache = [matchedUser, ...usersCache];
        }
      }
    } catch (e) {}
  }

  if (matchedUser) {
    custAvatar = custAvatar || matchedUser.avatar;
    uId = uId || matchedUser.id;
    custEmail = custEmail || matchedUser.email;
  }

  if (!custAvatar && data.customerName) {
    custAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.customerName)}&background=047857&color=fff`;
  }

  // Check if change is to be credited to wallet
  const shouldDepositChange = Boolean(data.depositChangeToWallet && changeDue > 0);

  const newOrder: OrderData = {
    _id: `ord-${Date.now()}`,
    orderNumber: data.orderNumber || newOrderNumber,
    customerName: data.customerName || "Customer",
    customerPhone: data.customerPhone || "",
    customerDepartment: data.customerDepartment || "General",
    customerEmail: custEmail,
    customerAvatar: custAvatar,
    userId: uId,
    itemsText: data.itemsText || (data.items?.map(i => `${i.quantity} ta ${i.name}`).join(' + ') || "Quick Order"),
    items: data.items || [],
    totalBill,
    paidAmount,
    changeDue,
    status,
    paymentMethod: data.paymentMethod || 'Cash',
    depositChangeToWallet: shouldDepositChange,
    notes: data.notes || '',
    orderDate: data.orderDate || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // 1. Update user balance/spent dynamically in database and memory
  const userTargetIdOrEmail = matchedUser?.id || custEmail || custName;
  if (userTargetIdOrEmail) {
    // If Wallet payment: deduct totalBill from balance
    if (data.paymentMethod === 'Wallet' && totalBill > 0) {
      await updateUserBalance(userTargetIdOrEmail, totalBill, 'deduct');
    }

    // If change is to be credited to wallet: add changeDue to balance
    if (shouldDepositChange) {
      await updateUserBalance(userTargetIdOrEmail, changeDue, 'add');
    }

    // Always increment totalSpent for customer in MongoDB Atlas
    if (totalBill > 0) {
      try {
        await connectToDatabase();
        if (User) {
          await User.findOneAndUpdate(
            { $or: [{ email: custEmail }, { name: custName }] },
            { $inc: { totalSpent: totalBill } }
          );
        }
      } catch (e) {
        console.warn("MongoDB totalSpent update error:", e);
      }
      if (matchedUser) {
        matchedUser.totalSpent = (matchedUser.totalSpent || 0) + totalBill;
        persistentStore.updateUserProfile(matchedUser.email, {
          totalSpent: matchedUser.totalSpent
        });
      }
    }
  }

  // 2. Persist to MongoDB Atlas (Awaited for 100% serverless durability)
  try {
    const db = await connectToDatabase();
    if (db && Order) {
      const doc = await Order.create({
        ...newOrder,
        _id: undefined,
        orderDate: new Date(newOrder.orderDate)
      });
      if (doc) newOrder._id = doc._id.toString();
      cloudBackupService.setMongoHealthy(true);
    }
  } catch (e: any) {
    cloudBackupService.setMongoHealthy(false, e?.message);
    console.warn('MongoDB Order.create storage/connection issue. Resilient backup active:', e?.message);
  }

  // 3. Immediately persist to disk, cloud backup & memory
  persistentStore.saveOrder(newOrder);
  cloudBackupService.backupOrder(newOrder);
  ordersCache = [newOrder, ...ordersCache];
  invalidateOrdersCache();
  invalidateUsersCache();

  return newOrder;
}

export async function updateOrder(id: string, updates: Partial<OrderData>): Promise<OrderData | null> {
  // Fetch previous order first so wallet charges and changeDue stay 100% accurate
  let prevOrder: OrderData | null =
    persistentStore.getOrders().find(o => o._id === id || o.orderNumber === id) ||
    ordersCache.find(o => o._id === id || o.orderNumber === id) ||
    null;

  try {
    const db = await connectToDatabase();
    if (db && Order) {
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { orderNumber: id };
      if (!prevOrder) {
        const prevDoc = await Order.findOne(query).lean();
        if (prevDoc) prevOrder = prevDoc as unknown as OrderData;
      }

      // Compute clean financial & status fields when items, totalBill, paidAmount, or paymentMethod change
      const enrichedUpdates: Partial<OrderData> = { ...updates };
      const finalMethod = enrichedUpdates.paymentMethod ?? prevOrder?.paymentMethod ?? 'Cash';
      const finalBill =
        enrichedUpdates.totalBill !== undefined
          ? Number(enrichedUpdates.totalBill) || 0
          : Number(prevOrder?.totalBill) || 0;

      let finalPaid =
        enrichedUpdates.paidAmount !== undefined
          ? Number(enrichedUpdates.paidAmount) || 0
          : Number(prevOrder?.paidAmount) || 0;

      if (finalMethod === 'Wallet' && enrichedUpdates.paidAmount === undefined) {
        finalPaid = finalBill;
        enrichedUpdates.paidAmount = finalPaid;
      }

      if (
        enrichedUpdates.totalBill !== undefined ||
        enrichedUpdates.paidAmount !== undefined ||
        enrichedUpdates.paymentMethod !== undefined
      ) {
        enrichedUpdates.changeDue = finalPaid - finalBill;
        if (!enrichedUpdates.status || ['Paid', 'Due', 'Partial', 'Pending'].includes(enrichedUpdates.status)) {
          if (finalBill > 0 && (finalPaid >= finalBill || finalMethod === 'Wallet')) {
            enrichedUpdates.status = 'Paid';
          } else if (finalBill > 0 && finalPaid > 0 && finalPaid < finalBill) {
            enrichedUpdates.status = 'Partial';
          } else if (finalBill > 0 && finalPaid === 0) {
            enrichedUpdates.status = 'Due';
          } else {
            enrichedUpdates.status = 'Pending';
          }
        }
      }

      // Adjust user wallet balance automatically if Wallet payment total changed
      const oldWalletCharged = prevOrder?.paymentMethod === 'Wallet' ? Number(prevOrder.totalBill) || 0 : 0;
      const newWalletCharge = finalMethod === 'Wallet' ? finalBill : 0;
      const walletDelta = newWalletCharge - oldWalletCharged;
      const walletTarget =
        prevOrder?.userId ||
        (prevOrder?.customerEmail || '').toLowerCase().trim() ||
        (prevOrder?.customerName || '').trim();

      if (walletDelta !== 0 && walletTarget) {
        await updateUserBalance(
          walletTarget,
          Math.abs(walletDelta),
          walletDelta > 0 ? 'deduct' : 'add'
        ).catch(() => {});
      }

      const pUpdated = persistentStore.updateOrder(id, enrichedUpdates);
      if (pUpdated) {
        ordersCache = ordersCache.map(o => (o._id === id || o.orderNumber === id) ? pUpdated : o);
        cloudBackupService.backupOrder(pUpdated);
      }
      invalidateOrdersCache();
      invalidateUsersCache();

      const doc = await Order.findOneAndUpdate(query, enrichedUpdates, { new: true }).lean();
      if (doc) {
        const formatted: OrderData = {
          ...doc,
          _id: (doc as any)._id.toString(),
          orderDate: (doc as any).orderDate?.toISOString?.() || new Date().toISOString(),
        } as unknown as OrderData;

        // Recalculate customer real totalSpent & currentDue from MongoDB orders
        try {
          const custEmail = (formatted.customerEmail || '').toLowerCase().trim();
          const custName = (formatted.customerName || '').toLowerCase().trim();
          const custUserId = formatted.userId || '';
          if (custEmail || custUserId || custName) {
            const orderFilterList: any[] = [];
            if (custEmail) orderFilterList.push({ customerEmail: custEmail });
            if (custUserId) orderFilterList.push({ userId: custUserId });
            if (custName) orderFilterList.push({ customerName: custName });

            const remainingOrders = await Order.find({ $or: orderFilterList }).select('totalBill status changeDue paidAmount').lean();
            const realTotalSpent = remainingOrders.reduce((sum: number, o: any) => sum + (Number(o.totalBill) || 0), 0);
            const realCurrentDue = remainingOrders
              .filter((o: any) => o.status === 'Due' || o.changeDue < 0)
              .reduce((sum: number, o: any) => sum + Math.max(0, (Number(o.totalBill) || 0) - (Number(o.paidAmount) || 0)), 0);

            const userFilterList: any[] = [];
            if (custEmail) userFilterList.push({ email: custEmail });
            if (custUserId) userFilterList.push({ uid: custUserId });
            if (custName) userFilterList.push({ name: custName });

            await User.updateMany(
              { $or: userFilterList },
              { $set: { totalSpent: realTotalSpent, currentDue: realCurrentDue } }
            );

            if (Customer && custName) {
              await Customer.updateOne(
                { name: custName },
                { $set: { totalSpent: realTotalSpent, totalOrders: remainingOrders.length, currentDue: realCurrentDue } }
              );
            }

            const matched = usersCache.find(u =>
              (custEmail && u.email.toLowerCase() === custEmail) ||
              (custUserId && u.id === custUserId) ||
              (custName && u.name.toLowerCase() === custName)
            );
            if (matched) {
              matched.totalSpent = realTotalSpent;
              matched.currentDue = realCurrentDue;
              persistentStore.updateUserProfile(matched.email, {
                totalSpent: realTotalSpent,
                currentDue: realCurrentDue,
              });
            }
          }
        } catch (recalcErr) {
          console.warn('Error recalculating user spent after updateOrder:', recalcErr);
        }

        return formatted;
      }
    }
  } catch (err) {
    console.error('MongoDB Order.findOneAndUpdate error:', err);
  }

  const pFallback = persistentStore.updateOrder(id, updates);
  invalidateOrdersCache();
  invalidateUsersCache();
  return pFallback || (ordersCache.find(o => o._id === id || o.orderNumber === id) || null);
}

export async function deleteOrder(id: string): Promise<boolean> {
  invalidateOrdersCache();
  invalidateUsersCache();

  let orderDoc: any = null;
  const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const query = isObjectId ? { _id: id } : { orderNumber: id };

  try {
    const db = await connectToDatabase();
    if (db && Order) {
      orderDoc = await Order.findOne(query).lean();
    }
  } catch (findErr) {
    console.warn('MongoDB Order.findOne error on delete:', findErr);
  }

  const existing = orderDoc ||
                   persistentStore.getOrders().find(o => o._id === id || o.orderNumber === id) ||
                   ordersCache.find(o => o._id === id || o.orderNumber === id);

  const custEmail = (existing?.customerEmail || '').toLowerCase().trim();
  const custName = (existing?.customerName || '').toLowerCase().trim();
  const custUserId = existing?.userId || '';
  const bill = Number(existing?.totalBill) || 0;
  const method = existing?.paymentMethod;

  // 1. If paid with Wallet, refund the totalBill back to the user's wallet
  if (method === 'Wallet' && bill > 0 && (custUserId || custEmail || custName)) {
    try {
      await updateUserBalance(custUserId || custEmail || custName, bill, 'add');
    } catch (refErr) {
      console.warn('Error refunding wallet on order delete:', refErr);
    }
  }

  // 1b. If cash change was credited to user wallet, reverse that change credit upon order cancellation/delete
  if (existing?.depositChangeToWallet && Number(existing?.changeDue) > 0 && (custUserId || custEmail || custName)) {
    try {
      await updateUserBalance(custUserId || custEmail || custName, Number(existing.changeDue), 'deduct');
    } catch (dedErr) {
      console.warn('Error reversing change deposit on order delete:', dedErr);
    }
  }

  // 2. Remove order from MongoDB Atlas
  try {
    const db = await connectToDatabase();
    if (db && Order) {
      await Order.findOneAndDelete(query);
    }
  } catch (err) {
    console.error('MongoDB Order.findOneAndDelete error:', err);
  }

  // 3. Remove order from memory & persistent store
  persistentStore.deleteOrder(id);
  ordersCache = ordersCache.filter(o => o._id !== id && o.orderNumber !== id);

  // 4. Recalculate and auto-sync accurate totalSpent & currentDue from remaining orders in MongoDB
  try {
    const db = await connectToDatabase();
    if (db && Order && User && (custEmail || custUserId || custName)) {
      const orderFilterList: any[] = [];
      if (custEmail) orderFilterList.push({ customerEmail: custEmail });
      if (custUserId) orderFilterList.push({ userId: custUserId });
      if (custName) orderFilterList.push({ customerName: custName });

      const remainingOrders = await Order.find({ $or: orderFilterList }).select('totalBill status changeDue paidAmount').lean();
      const realTotalSpent = remainingOrders.reduce((sum: number, o: any) => sum + (Number(o.totalBill) || 0), 0);
      const realCurrentDue = remainingOrders
        .filter((o: any) => o.status === 'Due' || o.changeDue < 0)
        .reduce((sum: number, o: any) => sum + Math.max(0, (Number(o.totalBill) || 0) - (Number(o.paidAmount) || 0)), 0);

      const userFilterList: any[] = [];
      if (custEmail) userFilterList.push({ email: custEmail });
      if (custUserId) userFilterList.push({ uid: custUserId });
      if (custName) userFilterList.push({ name: custName });

      await User.updateMany(
        { $or: userFilterList },
        { $set: { totalSpent: realTotalSpent, currentDue: realCurrentDue } }
      );

      if (Customer && custName) {
        await Customer.updateOne(
          { name: custName },
          { $set: { totalSpent: realTotalSpent, totalOrders: remainingOrders.length, currentDue: realCurrentDue } }
        );
      }

      const matched = usersCache.find(u =>
        (custEmail && u.email.toLowerCase() === custEmail) ||
        (custUserId && u.id === custUserId) ||
        (custName && u.name.toLowerCase() === custName)
      );
      if (matched) {
        matched.totalSpent = realTotalSpent;
        matched.currentDue = realCurrentDue;
        persistentStore.updateUserProfile(matched.email, {
          totalSpent: realTotalSpent,
          currentDue: realCurrentDue,
        });
      }
    }
  } catch (syncErr) {
    console.warn('Error recalculating user spent after delete:', syncErr);
  }

  invalidateOrdersCache();
  invalidateUsersCache();
  return true;
}

// Menu Management APIs
export async function getAllMenuItems(): Promise<MenuItemData[]> {
  const now = Date.now();
  if (cachedMenuResult && (now - lastMenuFetch < MENU_CACHE_TTL)) {
    return cachedMenuResult;
  }

  try {
    const db = await connectToDatabase();
    if (db && MenuItem) {
      const docs = await MenuItem.find().sort({ createdAt: -1 }).lean();
      const mapped = docs.map((d: any) => ({
        ...d,
        _id: d._id.toString()
      })) as unknown as MenuItemData[];
      menuItemsCache = mapped;
      cachedMenuResult = mapped;
      lastMenuFetch = now;
      mapped.forEach(m => persistentStore.saveMenuItem(m));
      return mapped;
    }
  } catch (err) {
    console.warn("MongoDB getAllMenuItems error, fallback to persistentStore:", err);
  }

  const pItems = persistentStore.getMenuItems();
  cachedMenuResult = pItems;
  lastMenuFetch = now;
  return pItems;
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

  // Await MongoDB write for durable cloud persistence
  try {
    const db = await connectToDatabase();
    if (db && MenuItem) {
      const doc = await MenuItem.create({ ...newItem, _id: undefined });
      if (doc) newItem._id = doc._id.toString();
    }
  } catch (e) {
    console.error('MongoDB MenuItem.create error:', e);
  }

  persistentStore.saveMenuItem(newItem);
  menuItemsCache = [newItem, ...menuItemsCache];
  invalidateMenuCache();

  return newItem;
}

export async function updateMenuItem(id: string, updates: Partial<MenuItemData>): Promise<MenuItemData | null> {
  invalidateMenuCache();
  try {
    const db = await connectToDatabase();
    if (db && MenuItem) {
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { name: id };
      const doc = await MenuItem.findOneAndUpdate(query, updates, { new: true }).lean();
      if (doc) {
        const formatted: MenuItemData = {
          ...doc,
          _id: (doc as any)._id.toString(),
        } as unknown as MenuItemData;
        persistentStore.saveMenuItem(formatted);
        menuItemsCache = menuItemsCache.map(m => m._id === id ? formatted : m);
        return formatted;
      }
    }
  } catch (err) {
    console.error('MongoDB MenuItem.findOneAndUpdate error:', err);
  }

  const current = persistentStore.getMenuItems().find(m => m._id === id);
  if (current) {
    const updated = { ...current, ...updates };
    persistentStore.saveMenuItem(updated);
    menuItemsCache = menuItemsCache.map(m => m._id === id ? updated : m);
    return updated;
  }
  return null;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  invalidateMenuCache();
  persistentStore.deleteMenuItem(id);
  menuItemsCache = menuItemsCache.filter(m => m._id !== id);

  try {
    const db = await connectToDatabase();
    if (db && MenuItem) {
      const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: id } : { name: id };
      await MenuItem.findOneAndDelete(query);
    }
  } catch (err) {
    console.error('MongoDB MenuItem.findOneAndDelete error:', err);
  }

  return true;
}

export async function getStatsSummary() {
  const [orders, users] = await Promise.all([
    getAllOrders(),
    getAllUsers()
  ]);
  
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

  const totalMemberBalance = users.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  const collectionRate = totalBill > 0 ? ((totalPaid / totalBill) * 100).toFixed(1) : "0.0";

  return {
    ordersCount: activeOrdersCount,
    completedOrdersCount: completedOrders.length,
    totalOrders: orders.length,
    totalBill,
    totalPaid,
    totalRefundChange,
    totalDue,
    totalMemberBalance,
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
  // 1. Query MongoDB first to get live, real-time messages across all clients
  try {
    const db = await connectToDatabase();
    if (db && Message) {
      let filter: any = {};
      if (query.groupId) {
        filter = { groupId: query.groupId };
      } else if (query.userId1 && query.userId2) {
        // Resolve all possible identifiers for user 1 and user 2 so messages are never missed
        const allUsers = usersCache.length > 0 ? usersCache : await getAllUsers();
        const u1 = allUsers.find(u => u.id === query.userId1 || u.email.toLowerCase() === query.userId1?.toLowerCase());
        const u2 = allUsers.find(u => u.id === query.userId2 || u.email.toLowerCase() === query.userId2?.toLowerCase());

        const u1List = Array.from(new Set([query.userId1, u1?.id, u1?.email].filter(Boolean))) as string[];
        const u2List = Array.from(new Set([query.userId2, u2?.id, u2?.email].filter(Boolean))) as string[];

        filter = {
          $or: [
            { senderId: { $in: u1List }, receiverId: { $in: u2List } },
            { senderId: { $in: u2List }, receiverId: { $in: u1List } },
          ]
        };
      }
      const docs = await Message.find(filter).sort({ createdAt: 1 }).limit(200).lean();
      if (docs && docs.length > 0) {
        const mapped: ChatMessage[] = docs.map((d: any) => ({
          id: d._id.toString(),
          senderId: d.senderId,
          senderName: d.senderName,
          senderAvatar: d.senderAvatar,
          receiverId: d.receiverId,
          groupId: d.groupId,
          text: d.text,
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString()
        }));
        mapped.forEach(m => persistentStore.addMessage(m));
        return mapped;
      }
    }
  } catch (err) {
    console.warn("MongoDB getChatMessages error, using cache fallback:", err);
  }

  // 2. Fallback to persistentStore and in-memory cache
  const stored = persistentStore.getMessages(query);
  if (stored && stored.length > 0) {
    return stored;
  }

  if (query.groupId) {
    return messagesCache.filter(m => m.groupId === query.groupId);
  }
  if (query.userId1 && query.userId2) {
    const allUsers = usersCache;
    const u1 = allUsers.find(u => u.id === query.userId1 || u.email.toLowerCase() === query.userId1?.toLowerCase());
    const u2 = allUsers.find(u => u.id === query.userId2 || u.email.toLowerCase() === query.userId2?.toLowerCase());
    const u1List = Array.from(new Set([query.userId1, u1?.id, u1?.email].filter(Boolean))) as string[];
    const u2List = Array.from(new Set([query.userId2, u2?.id, u2?.email].filter(Boolean))) as string[];

    return messagesCache.filter(m => 
      (u1List.includes(m.senderId) && u2List.includes(m.receiverId || '')) ||
      (u2List.includes(m.senderId) && u1List.includes(m.receiverId || ''))
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
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId: data.senderId,
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
    receiverId: data.receiverId,
    groupId: data.groupId,
    text: data.text,
    createdAt: new Date().toISOString()
  };

  // 1. Instantly store to persistentStore & memory
  persistentStore.addMessage(newMsg);
  messagesCache.push(newMsg);

  // 2. Await MongoDB persistence to guarantee message is saved in serverless environments
  try {
    const db = await connectToDatabase();
    if (db && Message) {
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
  } catch (e) {
    console.warn("MongoDB Message.create error:", e);
  }

  return newMsg;
}

export async function getAllChatGroups(): Promise<ChatGroup[]> {
  try {
    const db = await connectToDatabase();
    if (db && Group) {
      const docs = await Group.find().sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        const mapped: ChatGroup[] = docs.map((d: any) => ({
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
        persistentStore.setGroups(mapped);
        groupsCache = mapped;
        return mapped;
      }
    }
  } catch (err) {
    console.warn("MongoDB groups fetch failed, using fallback:", err);
  }

  const stored = persistentStore.getGroups();
  if (stored && stored.length > 0) {
    return stored;
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

  persistentStore.addGroup(newGroup);
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
  requesterId: string,
  requesterEmail?: string
): Promise<boolean> {
  const groups = await getAllChatGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return false;

  const cleanReqEmail = (requesterEmail || '').toLowerCase().trim();
  const cleanReqId = (requesterId || '').toLowerCase().trim();

  // Find user to check role
  const allUsers = await getAllUsers();
  const reqUser = allUsers.find(u => 
    (cleanReqEmail && u.email.toLowerCase() === cleanReqEmail) ||
    (cleanReqId && (u.id.toLowerCase() === cleanReqId || u.email.toLowerCase() === cleanReqId))
  );

  const isSuper = cleanReqEmail === SUPER_ADMIN_EMAIL.toLowerCase() ||
                  cleanReqId === SUPER_ADMIN_EMAIL.toLowerCase() ||
                  reqUser?.role === 'super_admin' ||
                  reqUser?.role === 'admin';

  const isOwner = isSuper ||
                  group.createdBy === requesterId ||
                  (cleanReqEmail && group.createdBy.toLowerCase() === cleanReqEmail) ||
                  (reqUser && (group.createdBy === reqUser.id || group.createdBy.toLowerCase() === reqUser.email.toLowerCase()));

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

// ==================== WEBRTC CALL SIGNALING SYSTEM ====================

export interface ActiveCallSession {
  callId: string;
  callerId: string;
  callerEmail?: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverEmail?: string;
  receiverName: string;
  receiverAvatar?: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  endedBy?: string;
  endedAt?: number;
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
  groupMemberIds?: string[];
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  receiverCandidates?: any[];
  createdAt: number;
  updatedAt: number;
}

const activeCallSessions: Map<string, ActiveCallSession> = new Map();
const ENDED_CALL_GRACE_MS = 18000; // Keep ended/rejected state briefly so peer sees hangup immediately
const RINGING_TIMEOUT_MS = 45000;

export async function initiateCallSession(data: {
  callerId: string;
  callerEmail?: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverEmail?: string;
  receiverName: string;
  receiverAvatar?: string;
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
  groupMemberIds?: string[];
  offer?: any;
}): Promise<ActiveCallSession> {
  const now = Date.now();
  const callId = `call-${now}-${Math.random().toString(36).slice(2, 6)}`;
  const callerLower = (data.callerId || '').toLowerCase();

  // Clean up any stale prior session initiated by this same caller
  for (const [oldId, oldSess] of activeCallSessions.entries()) {
    if ((oldSess.callerId || '').toLowerCase() === callerLower) {
      activeCallSessions.delete(oldId);
    }
  }

  const session: ActiveCallSession = {
    callId,
    callerId: data.callerId,
    callerEmail: data.callerEmail,
    callerName: data.callerName,
    callerAvatar: data.callerAvatar,
    receiverId: data.receiverId,
    receiverEmail: data.receiverEmail,
    receiverName: data.receiverName,
    receiverAvatar: data.receiverAvatar,
    status: 'ringing',
    isGroup: !!data.isGroup,
    groupId: data.groupId,
    groupName: data.groupName,
    groupMemberIds: data.groupMemberIds,
    offer: data.offer || null,
    callerCandidates: [],
    receiverCandidates: [],
    createdAt: now,
    updatedAt: now,
  };

  activeCallSessions.set(callId, session);

  try {
    await connectToDatabase();
    if (Setting) {
      await Setting.findOneAndUpdate(
        { key: `call_${callId}` },
        { key: `call_${callId}`, value: session },
        { upsert: true, new: true }
      );
    }
  } catch (e) {}

  return session;
}

function isCallSessionExpired(session: ActiveCallSession, now: number): boolean {
  if (session.status === 'ended' || session.status === 'rejected') {
    const endTime = session.endedAt || session.updatedAt || session.createdAt;
    return now - endTime > ENDED_CALL_GRACE_MS;
  }
  if (session.status === 'ringing' && now - session.createdAt > RINGING_TIMEOUT_MS) {
    return true;
  }
  // Accepted calls older than 4 hours are stale
  if (now - session.updatedAt > 4 * 60 * 60 * 1000) {
    return true;
  }
  return false;
}

export async function getCallSessionForUser(
  userId: string,
  userEmail?: string,
  callId?: string
): Promise<ActiveCallSession | null> {
  const now = Date.now();

  // Fast O(1) lookup by specific callId (used during active call polling to catch 'ended'/'rejected' reliably!)
  if (callId) {
    const memSess = activeCallSessions.get(callId);
    if (memSess) {
      if (isCallSessionExpired(memSess, now)) {
        activeCallSessions.delete(callId);
      } else {
        try {
          // Also check MongoDB in case another Vercel instance updated/ended this call
          await connectToDatabase();
          if (Setting) {
            const doc = await Setting.findOne({ key: `call_${callId}` }).lean();
            if (doc && (doc as any).value) {
              const dbSess: ActiveCallSession = (doc as any).value;
              activeCallSessions.set(callId, dbSess);
              return dbSess;
            }
          }
        } catch (e) {}
        return memSess;
      }
    }

    try {
      await connectToDatabase();
      if (Setting) {
        const doc = await Setting.findOne({ key: `call_${callId}` }).lean();
        if (doc && (doc as any).value) {
          const val: ActiveCallSession = (doc as any).value;
          if (isCallSessionExpired(val, now)) {
            Setting.deleteOne({ key: `call_${callId}` }).catch(() => {});
            activeCallSessions.delete(callId);
            return null;
          }
          activeCallSessions.set(callId, val);
          return val;
        }
      }
    } catch (e) {}
    return null;
  }

  // Incoming call listener mode: build user identifier set
  const idSet = new Set<string>();
  if (userId) idSet.add(userId.toLowerCase());
  if (userEmail) idSet.add(userEmail.toLowerCase());

  try {
    const allUsers = await getAllUsers();
    const match = allUsers.find(u =>
      (userId && (u.id === userId || (u as any).uid === userId || u.email?.toLowerCase() === userId.toLowerCase())) ||
      (userEmail && (u.email?.toLowerCase() === userEmail.toLowerCase() || u.id === userEmail || (u as any).uid === userEmail))
    );
    if (match) {
      if (match.id) idSet.add(match.id.toLowerCase());
      if ((match as any).uid) idSet.add(String((match as any).uid).toLowerCase());
      if (match.email) idSet.add(match.email.toLowerCase());
    }
  } catch (e) {}

  const matchesId = (id?: string) => (id ? idSet.has(id.toLowerCase()) : false);
  const matchesIncomingSession = (session: ActiveCallSession): boolean => {
    if (session.status !== 'ringing') return false;
    const isCaller = matchesId(session.callerId) || matchesId(session.callerEmail);
    if (isCaller) return false;
    if (matchesId(session.receiverId) || matchesId(session.receiverEmail)) return true;
    if (session.isGroup && Array.isArray(session.groupMemberIds)) {
      return session.groupMemberIds.some(mid => matchesId(mid));
    }
    return false;
  };

  // Query MongoDB first so cross-instance state on Vercel is always authoritative
  try {
    await connectToDatabase();
    if (Setting) {
      const docs = await Setting.find({ key: { $regex: '^call_' } }).lean();
      let latestMatch: ActiveCallSession | null = null;
      for (const d of docs) {
        const val: ActiveCallSession = (d as any).value;
        if (!val) continue;
        if (isCallSessionExpired(val, now)) {
          Setting.deleteOne({ _id: (d as any)._id }).catch(() => {});
          activeCallSessions.delete(val.callId);
          continue;
        }
        activeCallSessions.set(val.callId, val);
        if (matchesIncomingSession(val)) {
          if (!latestMatch || val.createdAt > latestMatch.createdAt) {
            latestMatch = val;
          }
        }
      }
      if (latestMatch) return latestMatch;
    }
  } catch (e) {}

  // In-memory fallback
  let memMatch: ActiveCallSession | null = null;
  for (const [id, session] of activeCallSessions.entries()) {
    if (isCallSessionExpired(session, now)) {
      activeCallSessions.delete(id);
      continue;
    }
    if (matchesIncomingSession(session)) {
      if (!memMatch || session.createdAt > memMatch.createdAt) {
        memMatch = session;
      }
    }
  }
  return memMatch;
}

export async function updateCallSignal(callId: string, updates: {
  status?: 'ringing' | 'accepted' | 'rejected' | 'ended';
  offer?: any;
  answer?: any;
  iceCandidate?: any;
  iceCandidates?: any[];
  senderId?: string;
  senderEmail?: string;
  endedBy?: string;
}): Promise<ActiveCallSession | null> {
  let session = activeCallSessions.get(callId);
  try {
    await connectToDatabase();
    if (Setting) {
      const doc = await Setting.findOne({ key: `call_${callId}` }).lean();
      if (doc && (doc as any).value) {
        session = (doc as any).value;
      }
    }
  } catch (e) {}

  if (!session) return null;

  const now = Date.now();
  const setFields: Record<string, any> = { 'value.updatedAt': now };
  const pushFields: Record<string, any> = {};

  if (updates.status) {
    session.status = updates.status;
    setFields['value.status'] = updates.status;
    if (updates.status === 'ended' || updates.status === 'rejected') {
      session.endedAt = now;
      session.endedBy = updates.endedBy || updates.senderId;
      setFields['value.endedAt'] = now;
      if (session.endedBy) setFields['value.endedBy'] = session.endedBy;
    }
  }
  if (updates.offer) {
    session.offer = updates.offer;
    setFields['value.offer'] = updates.offer;
  }
  if (updates.answer) {
    session.answer = updates.answer;
    setFields['value.answer'] = updates.answer;
  }

  const incomingBatch = [
    ...(Array.isArray(updates.iceCandidates) ? updates.iceCandidates : []),
    ...(updates.iceCandidate ? [updates.iceCandidate] : []),
  ];

  if (incomingBatch.length > 0 && (updates.senderId || updates.senderEmail)) {
    const sId = (updates.senderId || '').toLowerCase();
    const sEmail = (updates.senderEmail || '').toLowerCase();
    const cId = (session.callerId || '').toLowerCase();
    const cEmail = (session.callerEmail || '').toLowerCase();

    const isFromCaller = Boolean(
      (sId && (sId === cId || sId === cEmail)) ||
      (sEmail && (sEmail === cId || sEmail === cEmail))
    );

    if (isFromCaller) {
      session.callerCandidates = [...(session.callerCandidates || []), ...incomingBatch];
      pushFields['value.callerCandidates'] = { $each: incomingBatch };
    } else {
      session.receiverCandidates = [...(session.receiverCandidates || []), ...incomingBatch];
      pushFields['value.receiverCandidates'] = { $each: incomingBatch };
    }
  }

  session.updatedAt = now;
  activeCallSessions.set(callId, session);

  try {
    await connectToDatabase();
    if (Setting) {
      const updateOp: any = { $set: setFields };
      if (Object.keys(pushFields).length > 0) {
        updateOp.$push = pushFields;
      }
      const updatedDoc = await Setting.findOneAndUpdate(
        { key: `call_${callId}` },
        updateOp,
        { new: true }
      ).lean();
      if (updatedDoc && (updatedDoc as any).value) {
        session = (updatedDoc as any).value;
        activeCallSessions.set(callId, session!);
      }
    }
  } catch (e) {}

  return session;
}

export async function endCallSession(callId: string, endedBy?: string): Promise<boolean> {
  // Mark as ended (retained briefly via ENDED_CALL_GRACE_MS so peer polling sees status === 'ended')
  await updateCallSignal(callId, { status: 'ended', endedBy });
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

// ==========================================
// DAILY DUTY ROTATION MANAGEMENT
// ==========================================
let dailyDutiesCache: DailyDutyAssignment[] = [];

export async function getAllDailyDuties(): Promise<DailyDutyAssignment[]> {
  try {
    await connectToDatabase();
    if (DutyAssignment) {
      const docs = await DutyAssignment.find({}).sort({ date: -1 }).lean();
      const mapped: DailyDutyAssignment[] = (docs as any[]).map(d => ({
        id: d._id?.toString() || `duty_${d.date}`,
        date: d.date,
        assignedUserId: d.assignedUserId,
        assignedUserName: d.assignedUserName,
        assignedUserEmail: d.assignedUserEmail,
        assignedUserAvatar: d.assignedUserAvatar,
        assignedUserPhone: d.assignedUserPhone,
        assignedByUserId: d.assignedByUserId,
        assignedByName: d.assignedByName,
        instructions: d.instructions,
        status: d.status || 'assigned',
        tasks: d.tasks || [],
        acknowledged: Boolean(d.acknowledged),
        createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: d.updatedAt?.toISOString?.() || new Date().toISOString(),
      }));
      dailyDutiesCache = mapped;
      return mapped;
    }
  } catch (err) {
    console.warn("MongoDB getAllDailyDuties error, using cache:", err);
  }
  return dailyDutiesCache;
}

export async function getDailyDutyForDate(dateStr: string): Promise<DailyDutyAssignment | null> {
  const cleanDate = dateStr.trim();
  try {
    await connectToDatabase();
    if (DutyAssignment) {
      const doc = await DutyAssignment.findOne({ date: cleanDate }).lean();
      if (doc) {
        const d: any = doc;
        return {
          id: d._id?.toString() || `duty_${d.date}`,
          date: d.date,
          assignedUserId: d.assignedUserId,
          assignedUserName: d.assignedUserName,
          assignedUserEmail: d.assignedUserEmail,
          assignedUserAvatar: d.assignedUserAvatar,
          assignedUserPhone: d.assignedUserPhone,
          assignedByUserId: d.assignedByUserId,
          assignedByName: d.assignedByName,
          instructions: d.instructions,
          status: d.status || 'assigned',
          tasks: d.tasks || [],
          acknowledged: Boolean(d.acknowledged),
          createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
          updatedAt: d.updatedAt?.toISOString?.() || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("MongoDB getDailyDutyForDate error:", err);
  }
  return dailyDutiesCache.find(d => d.date === cleanDate) || null;
}

export async function assignDailyDuty(dutyData: {
  date: string;
  assignedUserId: string;
  assignedUserName: string;
  assignedUserEmail: string;
  assignedUserAvatar?: string;
  assignedUserPhone?: string;
  assignedByUserId?: string;
  assignedByName?: string;
  instructions?: string;
  tasks?: string[];
}): Promise<DailyDutyAssignment> {
  const cleanDate = dutyData.date.trim();
  const now = new Date();
  let saved: any = null;

  try {
    await connectToDatabase();
    if (DutyAssignment) {
      saved = await DutyAssignment.findOneAndUpdate(
        { date: cleanDate },
        {
          $set: {
            ...dutyData,
            date: cleanDate,
            status: 'assigned',
            acknowledged: false,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn("MongoDB assignDailyDuty error, falling back to cache:", err);
  }

  const assignment: DailyDutyAssignment = {
    id: saved?._id?.toString() || `duty_${cleanDate}`,
    date: cleanDate,
    assignedUserId: dutyData.assignedUserId,
    assignedUserName: dutyData.assignedUserName,
    assignedUserEmail: dutyData.assignedUserEmail,
    assignedUserAvatar: dutyData.assignedUserAvatar,
    assignedUserPhone: dutyData.assignedUserPhone,
    assignedByUserId: dutyData.assignedByUserId,
    assignedByName: dutyData.assignedByName || 'Admin',
    instructions: dutyData.instructions || 'Collect money, purchase snacks/refreshments, and deliver on time.',
    status: 'assigned',
    tasks: dutyData.tasks || [
      'Collect Catering Cash / Payments',
      'Purchase Fresh Snacks / Refreshments',
      'Deliver & Distribute to Members'
    ],
    acknowledged: false,
    createdAt: saved?.createdAt?.toISOString?.() || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const idx = dailyDutiesCache.findIndex(d => d.date === cleanDate);
  if (idx !== -1) {
    dailyDutiesCache[idx] = assignment;
  } else {
    dailyDutiesCache.unshift(assignment);
  }

  return assignment;
}

export async function updateDailyDutyStatus(
  dutyIdOrDate: string,
  status?: 'assigned' | 'in_progress' | 'completed',
  acknowledged?: boolean
): Promise<DailyDutyAssignment | null> {
  const now = new Date();
  const updateFields: any = { updatedAt: now };
  if (status) updateFields.status = status;
  if (acknowledged !== undefined) updateFields.acknowledged = acknowledged;

  try {
    await connectToDatabase();
    if (DutyAssignment) {
      const isObjectId = dutyIdOrDate.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: dutyIdOrDate } : { date: dutyIdOrDate };
      const updated = await DutyAssignment.findOneAndUpdate(query, { $set: updateFields }, { new: true });
      if (updated) {
        const d: any = updated;
        const res: DailyDutyAssignment = {
          id: d._id?.toString() || `duty_${d.date}`,
          date: d.date,
          assignedUserId: d.assignedUserId,
          assignedUserName: d.assignedUserName,
          assignedUserEmail: d.assignedUserEmail,
          assignedUserAvatar: d.assignedUserAvatar,
          assignedUserPhone: d.assignedUserPhone,
          assignedByUserId: d.assignedByUserId,
          assignedByName: d.assignedByName,
          instructions: d.instructions,
          status: d.status,
          tasks: d.tasks || [],
          acknowledged: Boolean(d.acknowledged),
          createdAt: d.createdAt?.toISOString?.() || now.toISOString(),
          updatedAt: d.updatedAt?.toISOString?.() || now.toISOString(),
        };
        const idx = dailyDutiesCache.findIndex(x => x.id === res.id || x.date === res.date);
        if (idx !== -1) dailyDutiesCache[idx] = res;
        return res;
      }
    }
  } catch (err) {
    console.warn("MongoDB updateDailyDutyStatus error:", err);
  }

  const idx = dailyDutiesCache.findIndex(d => d.id === dutyIdOrDate || d.date === dutyIdOrDate);
  if (idx !== -1) {
    if (status) dailyDutiesCache[idx].status = status;
    if (acknowledged !== undefined) (dailyDutiesCache[idx] as any).acknowledged = acknowledged;
    dailyDutiesCache[idx].updatedAt = now.toISOString();
    return dailyDutiesCache[idx];
  }
  return null;
}

export async function deleteDailyDuty(dutyIdOrDate: string): Promise<boolean> {
  try {
    await connectToDatabase();
    if (DutyAssignment) {
      const isObjectId = dutyIdOrDate.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: dutyIdOrDate } : { date: dutyIdOrDate };
      await DutyAssignment.deleteOne(query);
    }
  } catch (err) {
    console.warn("MongoDB deleteDailyDuty error:", err);
  }
  dailyDutiesCache = dailyDutiesCache.filter(d => d.id !== dutyIdOrDate && d.date !== dutyIdOrDate);
  return true;
}

// ==========================================
// USER ACTIVITY & AUDIT LOGS
// ==========================================
const auditLogsCache: UserAuditLog[] = [];

export async function recordAuditLog(log: Omit<UserAuditLog, 'id'>): Promise<UserAuditLog> {
  const now = new Date();
  const entry: UserAuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...log,
    timestamp: log.timestamp || now.toISOString(),
  };

  try {
    await connectToDatabase();
    if (AuditLog) {
      const doc = await AuditLog.create({
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail,
        userAvatar: entry.userAvatar,
        userRole: entry.userRole,
        path: entry.path,
        pageTitle: entry.pageTitle,
        action: entry.action,
        details: entry.details,
        device: entry.device,
        timestamp: new Date(entry.timestamp),
      });
      if (doc) {
        entry.id = doc._id.toString();
      }
    }
  } catch (err) {
    // resilient in-memory fallback
  }

  auditLogsCache.unshift(entry);
  if (auditLogsCache.length > 500) {
    auditLogsCache.pop();
  }

  return entry;
}

export async function getAuditLogs(filters?: {
  limit?: number;
  userId?: string;
  userEmail?: string;
  path?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<UserAuditLog[]> {
  const limit = Math.min(filters?.limit || 100, 500);

  try {
    await connectToDatabase();
    if (AuditLog) {
      const q: any = {};
      if (filters?.userEmail) {
        q.userEmail = { $regex: new RegExp(filters.userEmail.trim(), 'i') };
      }
      if (filters?.path && filters.path !== 'all') {
        q.path = filters.path;
      }
      if (filters?.action && filters.action !== 'all') {
        q.action = filters.action;
      }
      if (filters?.startDate || filters?.endDate) {
        q.timestamp = {};
        if (filters.startDate) q.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) q.timestamp.$lte = new Date(filters.endDate);
      }

      const docs = await AuditLog.find(q).sort({ timestamp: -1 }).limit(limit).lean();
      return (docs as any[]).map(d => ({
        id: d._id.toString(),
        userId: d.userId,
        userName: d.userName,
        userEmail: d.userEmail,
        userAvatar: d.userAvatar,
        userRole: d.userRole,
        path: d.path,
        pageTitle: d.pageTitle,
        action: d.action,
        details: d.details,
        device: d.device,
        timestamp: d.timestamp?.toISOString?.() || d.createdAt?.toISOString?.() || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("MongoDB getAuditLogs error, using cache:", err);
  }

  let result = [...auditLogsCache];
  if (filters?.userEmail) {
    const s = filters.userEmail.toLowerCase();
    result = result.filter(l => l.userEmail.toLowerCase().includes(s));
  }
  if (filters?.path && filters.path !== 'all') {
    result = result.filter(l => l.path === filters.path);
  }
  if (filters?.action && filters.action !== 'all') {
    result = result.filter(l => l.action === filters.action);
  }
  return result.slice(0, limit);
}

export async function clearAuditLogs(): Promise<boolean> {
  try {
    await connectToDatabase();
    if (AuditLog) {
      await AuditLog.deleteMany({});
    }
  } catch (err) {}
  auditLogsCache.length = 0;
  return true;
}
