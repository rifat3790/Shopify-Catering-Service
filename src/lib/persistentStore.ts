import fs from 'fs';
import path from 'path';
import { 
  ChatMessage, 
  ChatGroup, 
  OrderData, 
  MenuItemData, 
  UserRecord, 
  RoutePermissions, 
  DEFAULT_ROUTE_PERMISSIONS, 
  initialMenuItems 
} from './types';

interface PersistentData {
  messages: ChatMessage[];
  groups: ChatGroup[];
  orders: OrderData[];
  menuItems: MenuItemData[];
  userOverrides: Record<string, Partial<UserRecord>>;
  routePermissions: RoutePermissions;
}

const STORAGE_FILE = path.join(process.cwd(), '.data_storage.json');

// In-memory cache loaded once
let memoryData: PersistentData = {
  messages: [],
  groups: [],
  orders: [],
  menuItems: [],
  userOverrides: {},
  routePermissions: { ...DEFAULT_ROUTE_PERMISSIONS },
};

let isLoaded = false;

function loadStorage() {
  if (isLoaded) return;
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryData = {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        menuItems: Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0 ? parsed.menuItems : [...initialMenuItems],
        userOverrides: parsed.userOverrides || {},
        routePermissions: parsed.routePermissions || { ...DEFAULT_ROUTE_PERMISSIONS },
      };
    } else {
      memoryData.menuItems = [...initialMenuItems];
      memoryData.routePermissions = { ...DEFAULT_ROUTE_PERMISSIONS };
    }
  } catch (err) {
    console.warn('Persistent storage read warning:', err);
  }
  isLoaded = true;
}

function persistStorage() {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Persistent storage write warning:', err);
  }
}

// Ensure loaded at module evaluation
loadStorage();

export const persistentStore = {
  // Dynamic Route Permissions
  getRoutePermissions: (): RoutePermissions => {
    loadStorage();
    if (!memoryData.routePermissions || !Array.isArray(memoryData.routePermissions.admin)) {
      memoryData.routePermissions = { ...DEFAULT_ROUTE_PERMISSIONS };
      persistStorage();
    }
    return { ...memoryData.routePermissions };
  },

  setRoutePermissions: (perms: RoutePermissions): RoutePermissions => {
    loadStorage();
    memoryData.routePermissions = {
      admin: Array.isArray(perms.admin) ? perms.admin : DEFAULT_ROUTE_PERMISSIONS.admin,
      user: Array.isArray(perms.user) ? perms.user : DEFAULT_ROUTE_PERMISSIONS.user,
    };
    persistStorage();
    return { ...memoryData.routePermissions };
  },

  // Menu Items
  getMenuItems: (): MenuItemData[] => {
    loadStorage();
    if (!memoryData.menuItems || memoryData.menuItems.length === 0) {
      memoryData.menuItems = [...initialMenuItems];
      persistStorage();
    }
    return [...memoryData.menuItems];
  },

  saveMenuItem: (item: MenuItemData): MenuItemData => {
    loadStorage();
    const idx = memoryData.menuItems.findIndex(m => m._id === item._id || m.name === item.name);
    if (idx >= 0) {
      memoryData.menuItems[idx] = { ...memoryData.menuItems[idx], ...item };
    } else {
      memoryData.menuItems.unshift(item);
    }
    persistStorage();
    return item;
  },

  deleteMenuItem: (id: string) => {
    loadStorage();
    memoryData.menuItems = memoryData.menuItems.filter(m => m._id !== id);
    persistStorage();
  },

  // Messages
  getMessages: (filter?: { userId1?: string; userId2?: string; groupId?: string }): ChatMessage[] => {
    loadStorage();
    if (!filter) return [...memoryData.messages];
    if (filter.groupId) {
      return memoryData.messages.filter(m => m.groupId === filter.groupId);
    }
    if (filter.userId1 && filter.userId2) {
      return memoryData.messages.filter(
        m => (m.senderId === filter.userId1 && m.receiverId === filter.userId2) ||
             (m.senderId === filter.userId2 && m.receiverId === filter.userId1)
      );
    }
    return [...memoryData.messages];
  },

  addMessage: (msg: ChatMessage) => {
    loadStorage();
    // Prevent duplicates
    const exists = memoryData.messages.find(m => m.id === msg.id);
    if (!exists) {
      memoryData.messages.push(msg);
      persistStorage();
    }
    return msg;
  },

  // Groups
  getGroups: (): ChatGroup[] => {
    loadStorage();
    return [...memoryData.groups];
  },

  setGroups: (groups: ChatGroup[]) => {
    loadStorage();
    memoryData.groups = groups;
    persistStorage();
  },

  addGroup: (group: ChatGroup) => {
    loadStorage();
    const idx = memoryData.groups.findIndex(g => g.id === group.id);
    if (idx >= 0) {
      memoryData.groups[idx] = group;
    } else {
      memoryData.groups.unshift(group);
    }
    persistStorage();
    return group;
  },

  updateGroup: (groupId: string, updater: (g: ChatGroup) => ChatGroup) => {
    loadStorage();
    const idx = memoryData.groups.findIndex(g => g.id === groupId);
    if (idx >= 0) {
      memoryData.groups[idx] = updater(memoryData.groups[idx]);
      persistStorage();
      return memoryData.groups[idx];
    }
    return null;
  },

  deleteGroup: (groupId: string) => {
    loadStorage();
    memoryData.groups = memoryData.groups.filter(g => g.id !== groupId);
    persistStorage();
  },

  // User Overrides (profile name, username, avatar, department, phone, balance)
  getUserOverrides: (): Record<string, Partial<UserRecord>> => {
    loadStorage();
    return { ...memoryData.userOverrides };
  },

  updateUserProfile: (userIdOrEmail: string, data: Partial<UserRecord>) => {
    loadStorage();
    const key = userIdOrEmail.toLowerCase().trim();
    memoryData.userOverrides[key] = {
      ...(memoryData.userOverrides[key] || {}),
      ...data,
    };
    persistStorage();
    return memoryData.userOverrides[key];
  },

  // Orders
  getOrders: (): OrderData[] => {
    loadStorage();
    return [...memoryData.orders];
  },

  saveOrder: (order: OrderData) => {
    loadStorage();
    const idx = memoryData.orders.findIndex(o => o._id === order._id || o.orderNumber === order.orderNumber);
    if (idx >= 0) {
      memoryData.orders[idx] = order;
    } else {
      memoryData.orders.unshift(order);
    }
    persistStorage();
    return order;
  },

  updateOrder: (idOrNumber: string, updates: Partial<OrderData>): OrderData | null => {
    loadStorage();
    const idx = memoryData.orders.findIndex(o => o._id === idOrNumber || o.orderNumber === idOrNumber);
    if (idx >= 0) {
      memoryData.orders[idx] = {
        ...memoryData.orders[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      persistStorage();
      return memoryData.orders[idx];
    }
    return null;
  },

  deleteOrder: (idOrNumber: string): boolean => {
    loadStorage();
    const initialLen = memoryData.orders.length;
    memoryData.orders = memoryData.orders.filter(o => o._id !== idOrNumber && o.orderNumber !== idOrNumber);
    persistStorage();
    return memoryData.orders.length < initialLen;
  },
};
