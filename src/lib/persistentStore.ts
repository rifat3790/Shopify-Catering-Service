import fs from 'fs';
import path from 'path';
import { ChatMessage, ChatGroup, OrderData, MenuItemData, UserRecord } from './types';

interface PersistentData {
  messages: ChatMessage[];
  groups: ChatGroup[];
  orders: OrderData[];
  menuItems: MenuItemData[];
  userOverrides: Record<string, Partial<UserRecord>>;
}

const STORAGE_FILE = path.join(process.cwd(), '.data_storage.json');

// In-memory cache loaded once
let memoryData: PersistentData = {
  messages: [],
  groups: [],
  orders: [],
  menuItems: [],
  userOverrides: {},
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
        menuItems: Array.isArray(parsed.menuItems) ? parsed.menuItems : [],
        userOverrides: parsed.userOverrides || {},
      };
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

  // User Overrides (profile name, username, avatar, department, phone)
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

  deleteOrder: (idOrNumber: string) => {
    loadStorage();
    memoryData.orders = memoryData.orders.filter(o => o._id !== idOrNumber && o.orderNumber !== idOrNumber);
    persistStorage();
  },
};
