import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  name: string;
  type: 'grocery' | 'medicine';
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
  price?: string;
  reminderOption?: 'none' | 'daily' | 'weekly' | 'monthly';
  image?: string;
}

export class HomeInventoryDB extends Dexie {
  items!: Table<InventoryItem>;

  constructor() {
    super('HomeInventoryDB');
    this.version(1).stores({
      items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, reminderOption, image'
    });
  }
}

export const db = new HomeInventoryDB();
