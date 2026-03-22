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
  }
}

export const db = new HomeInventoryDB();
