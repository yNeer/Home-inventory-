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
  reminderOption?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom_days';
  medicineTiming?: 'before_food' | 'after_food' | 'any';
  reminderTimes?: string[]; // Array of 'HH:MM' strings (e.g., ['08:00', '20:00'])
  reminderDays?: number[]; // Array of 1-7 representing Mon-Sun for custom_days
  totalQuantity?: number;
  dailyDose?: number;
  doseAmount?: string; // e.g., "1 Pill", "10ml"
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
    // Version 6 Schema update: Added advanced reminder properties
    this.version(6).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, batchNo, components, barcode, reminderOption, medicineTiming, reminderTimes, reminderDays, totalQuantity, dailyDose, doseAmount, description, details, image'
    }).upgrade(tx => {
       return tx.table('items').toCollection().modify(item => {
           if (item.reminderTimes === undefined) item.reminderTimes = [];
           if (item.reminderDays === undefined) item.reminderDays = [];
           if (item.doseAmount === undefined) item.doseAmount = '';
       });
    });
  }
}

export const db = new HomeInventoryDB();
