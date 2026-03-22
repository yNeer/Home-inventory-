import Dexie from 'dexie';

export const db = new Dexie('HomeInventoryDB');

db.version(1).stores({
  items: '++id, name, type, purchaseDate, mfgDate, expiryDate, price, reminderOption, image'
});
