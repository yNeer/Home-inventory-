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
  doseUnit?: string; // e.g. "tablets", "capsules", "ml", "drops", "puffs", "mg"
  doseFrequency?: string; // e.g. "Once Daily", "Twice Daily (1-0-1)", "Thrice Daily (1-1-1)", "As Needed (SOS)"
  doseTimes?: string[]; // e.g. ["Morning", "Night"]
  doseInstructions?: string; // special notes e.g. "Take with plenty of water"
  quantity?: number; // current quantity on hand
  lowQuantityThreshold?: number; // default 2
  lastUsedDate?: string; // YYYY-MM-DD
  lastUsedTime?: string; // e.g. "10:30 AM"
  usedTodayCount?: number; // times used today
  description?: string;
  details?: string;
  image?: string;
}

export interface UsageLogEntry {
  id?: number;
  itemId?: number;
  itemName: string;
  itemType: 'grocery' | 'medicine';
  amountUsed: number;
  unit?: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM"
  notes?: string;
  doseTiming?: 'before_food' | 'after_food' | 'any';
  remainingStock?: number;
  image?: string;
}

export class HomeInventoryDB extends Dexie {
  items!: Table<InventoryItem>;
  logs!: Table<UsageLogEntry>;

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
    // Version 8 Schema update: Added UsageLogEntry table and dose metadata
    this.version(8).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, barcode, reminderOption, medicineTiming, totalQuantity, dailyDose, doseUnit, doseFrequency, quantity, lastUsedDate',
      logs: '++id, itemId, itemName, itemType, date, timestamp'
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

export const markItemUsedToday = async (
  id: number,
  amount: number = 1,
  customNotes?: string,
  customUnit?: string
) => {
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

  // Record into persistent usage log
  try {
    const unit = customUnit || (item.type === 'medicine' ? (item.doseUnit || 'dose') : 'unit');
    await db.logs.add({
      itemId: id,
      itemName: item.name,
      itemType: item.type,
      amountUsed: amount,
      unit,
      timestamp: now.toISOString(),
      date: today,
      time: timeStr,
      notes: customNotes || (item.type === 'medicine' ? (item.medicineTiming ? `Timing: ${item.medicineTiming.replace('_', ' ')}` : undefined) : undefined),
      doseTiming: item.medicineTiming,
      remainingStock: newStock,
      image: item.image
    });
  } catch (err) {
    console.error('Failed to log usage entry:', err);
  }
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

  // Remove the most recent log for this item today
  try {
    const latestLog = await db.logs
      .where('itemId')
      .equals(id)
      .reverse()
      .sortBy('timestamp');

    const todayLog = latestLog.find(l => l.date === today);
    if (todayLog && todayLog.id) {
      await db.logs.delete(todayLog.id);
    }
  } catch (err) {
    console.error('Failed to remove log on undo:', err);
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

export const updateMedicineDose = async (
  id: number,
  doseData: {
    dailyDose?: number;
    doseUnit?: string;
    doseFrequency?: string;
    medicineTiming?: 'before_food' | 'after_food' | 'any';
    doseInstructions?: string;
    doseTimes?: string[];
  }
) => {
  await db.items.update(id, {
    ...doseData
  });
};

export const deleteLogEntry = async (logId: number, restoreStock: boolean = false) => {
  if (restoreStock) {
    const log = await db.logs.get(logId);
    if (log && log.itemId) {
      const item = await db.items.get(log.itemId);
      if (item) {
        const curStock = getItemStock(item);
        await db.items.update(log.itemId, {
          quantity: curStock + (log.amountUsed || 1)
        });
      }
    }
  }
  await db.logs.delete(logId);
};

export const clearAllLogs = async () => {
  await db.logs.clear();
};

