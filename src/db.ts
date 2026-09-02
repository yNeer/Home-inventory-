import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  name: string;
  type: 'grocery' | 'medicine';
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
  price?: string;
  batchNo?: string;
  components?: string;
  barcode?: string;
  reminderOption?: 'none' | 'daily' | 'weekly' | 'monthly';
  medicineTiming?: 'before_food' | 'after_food' | 'any';
  totalQuantity?: number;
  dailyDose?: number;
  quantity?: number; // current quantity on hand
  lowQuantityThreshold?: number; // default 2
  lastUsedDate?: string; // YYYY-MM-DD
  lastUsedTime?: string; // e.g. "10:30 AM"
  usedTodayCount?: number; // times used today
  description?: string;
  details?: string;
  image?: string;
}

export class HomeInventoryDB extends Dexie {
  items!: Table<InventoryItem>;

  constructor() {
    super('HomeInventoryDB');
    // Version 1 Schema
    this.version(1).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, reminderOption, image'
    });
    // Version 2 Schema update: Added batchNo, components, barcode
    this.version(2).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, image'
    }).upgrade(tx => {
       return tx.table('items').toCollection().modify(item => {
           if (item.batchNo === undefined) item.batchNo = '';
           if (item.components === undefined) item.components = '';
           if (item.barcode === undefined) item.barcode = '';
       });
    });
    // Version 3 Schema update: Added medicineTiming
    this.version(3).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, medicineTiming, image'
    }).upgrade(tx => {
       return tx.table('items').toCollection().modify(item => {
           if (item.medicineTiming === undefined) item.medicineTiming = 'any';
       });
    });
    // Version 4 Schema update: Added dosage properties
    this.version(4).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, medicineTiming, totalQuantity, dailyDose, image'
    });
    // Version 5 Schema update: Added description and details properties
    this.version(5).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, medicineTiming, totalQuantity, dailyDose, description, details, image'
    });
    // Version 6 Schema update: Added quantity, lastUsedDate, usedTodayCount
    this.version(6).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, medicineTiming, totalQuantity, dailyDose, quantity, lastUsedDate, description, details, image'
    });
    // Version 7 Schema update: Remove image, details, components from index tree to prevent IndexedDB key length and memory errors
    this.version(7).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, barcode, reminderOption, medicineTiming, totalQuantity, dailyDose, quantity, lastUsedDate'
    });
  }
}

export const db = new HomeInventoryDB();

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getItemStock = (item: InventoryItem): number => {
  if (item.quantity !== undefined) return item.quantity;
  if (item.totalQuantity !== undefined) return item.totalQuantity;
  return 1;
};

export const isItemLowQuantity = (item: InventoryItem): boolean => {
  const stock = getItemStock(item);
  const threshold = item.lowQuantityThreshold !== undefined ? item.lowQuantityThreshold : 2;
  return stock <= threshold;
};

export const markItemUsedToday = async (id: number, amount: number = 1) => {
  const item = await db.items.get(id);
  if (!item) return;

  const today = getTodayDateString();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isSameDay = item.lastUsedDate === today;
  const newCount = (isSameDay ? (item.usedTodayCount || 0) : 0) + amount;

  const currentStock = getItemStock(item);
  const newStock = Math.max(0, currentStock - amount);

  await db.items.update(id, {
    lastUsedDate: today,
    lastUsedTime: timeStr,
    usedTodayCount: newCount,
    quantity: newStock
  });
};

export const undoItemUsedToday = async (id: number) => {
  const item = await db.items.get(id);
  if (!item) return;

  const today = getTodayDateString();
  if (item.lastUsedDate !== today) return;

  const currentCount = item.usedTodayCount || 1;
  const currentStock = getItemStock(item);

  if (currentCount <= 1) {
    await db.items.update(id, {
      lastUsedDate: undefined,
      lastUsedTime: undefined,
      usedTodayCount: 0,
      quantity: currentStock + 1
    });
  } else {
    await db.items.update(id, {
      usedTodayCount: currentCount - 1,
      quantity: currentStock + 1
    });
  }
};

export const adjustItemStock = async (id: number, delta: number) => {
  const item = await db.items.get(id);
  if (!item) return;

  const currentStock = getItemStock(item);
  const newStock = Math.max(0, currentStock + delta);

  await db.items.update(id, {
    quantity: newStock
  });
};
