import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format, isBefore, addDays } from 'date-fns';
import { FaBox, FaPills, FaTrash, FaExclamationCircle } from 'react-icons/fa';
import GlassContainer from './GlassContainer';

const Dashboard = ({ onAddNew }) => {
  const items = useLiveQuery(() => db.items.toArray(), []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.items.delete(id);
    }
  };

  const getStatusColor = (expiryDate) => {
    if (!expiryDate) return 'text-gray-500';
    const expiry = new Date(expiryDate);
    const now = new Date();

    if (isBefore(expiry, now)) return 'text-red-500 font-bold'; // Expired
    if (isBefore(expiry, addDays(now, 7))) return 'text-yellow-500 font-bold'; // Expiring soon
    return 'text-green-500'; // Good
  };

  const getStatusText = (expiryDate) => {
    if (!expiryDate) return 'No expiry date';
    const expiry = new Date(expiryDate);
    const now = new Date();

    if (isBefore(expiry, now)) return 'Expired';
    if (isBefore(expiry, addDays(now, 7))) return 'Expiring Soon';
    return 'Good';
  };

  return (
    <GlassContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm">Inventory Dashboard</h1>
        <button onClick={onAddNew} className="glass-button flex items-center gap-2">
          <span>+ Add Item</span>
        </button>
      </div>

      {!items || items.length === 0 ? (
        <div className="text-center py-10">
          <FaBox className="mx-auto text-6xl text-gray-400 mb-4 opacity-50" />
          <p className="text-xl text-gray-600">Your inventory is empty.</p>
          <p className="text-gray-500 mt-2">Click 'Add Item' to scan and track your groceries or medicines.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-white/30 border border-white/50 rounded-xl p-4 shadow-sm backdrop-blur-sm hover:bg-white/40 transition-colors relative group">

              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${item.type === 'medicine' ? 'bg-red-100/80 text-red-500' : 'bg-green-100/80 text-green-600'}`}>
                    {item.type === 'medicine' ? <FaPills size={20} /> : <FaBox size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 capitalize leading-tight">{item.name}</h3>
                    <span className="text-xs text-gray-500 uppercase font-medium tracking-wider">{item.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  aria-label="Delete item"
                >
                  <FaTrash />
                </button>
              </div>

              {item.image && (
                <div className="mb-4 rounded-lg overflow-hidden h-32 bg-black/5 flex items-center justify-center border border-white/40">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                  <span className="font-medium text-gray-500">Price:</span>
                  <span className="font-semibold">{item.price ? `₹${item.price}` : 'N/A'}</span>
                </div>

                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                  <span className="font-medium text-gray-500">Mfg Date:</span>
                  <span>{item.mfgDate ? format(new Date(item.mfgDate), 'MMM dd, yyyy') : 'N/A'}</span>
                </div>

                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                  <span className="font-medium text-gray-500">Exp Date:</span>
                  <span className={`font-semibold ${getStatusColor(item.expiryDate)}`}>
                    {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>

                {item.purchaseDate && (
                  <div className="flex justify-between pb-1">
                    <span className="font-medium text-gray-500">Purchased:</span>
                    <span>{format(new Date(item.purchaseDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/50 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getStatusColor(item.expiryDate).replace('text-', 'bg-').replace('-500', '-100/80')} ${getStatusColor(item.expiryDate)}`}>
                   {getStatusText(item.expiryDate) !== 'Good' && <FaExclamationCircle />}
                   {getStatusText(item.expiryDate)}
                </span>

                {item.reminderOption && item.reminderOption !== 'none' && (
                  <span className="text-xs text-indigo-500 font-medium bg-indigo-50/80 px-2 py-1 rounded-full">
                    {item.reminderOption} reminder
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassContainer>
  );
};

export default Dashboard;
