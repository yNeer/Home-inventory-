import React, { useMemo } from 'react';
import {
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  markItemUsedToday,
  adjustItemStock,
  getTodayDateString
} from '../../db';
import {
  FaLightbulb,
  FaExclamationTriangle,
  FaRegClock,
  FaPills,
  FaCheck,
  FaPlus,
  FaTrash,
  FaChevronRight,
  FaMagic,
  FaShoppingBag
} from 'react-icons/fa';
import { differenceInDays, format } from 'date-fns';

interface Suggestion {
  id: string;
  type: 'urgent_expiry' | 'expired' | 'low_stock' | 'medicine_routine' | 'all_good';
  title: string;
  message: string;
  item?: InventoryItem;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  icon: React.ReactNode;
  actionLabel?: string;
  actionType?: 'use_today' | 'restock' | 'discard' | 'view';
}

interface InventorySuggestionsProps {
  items: InventoryItem[];
  onViewItem: (item: InventoryItem) => void;
  onDeleteItem: (id: number) => void;
  hideHeader?: boolean;
}

export const InventorySuggestions: React.FC<InventorySuggestionsProps> = ({
  items,
  onViewItem,
  onDeleteItem,
  hideHeader = false
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);

  const suggestions = useMemo(() => {
    const list: Suggestion[] = [];
    const now = new Date();

    // 1. Check for Expired items that need action/discard
    const expiredList = items.filter(i => {
      if (!i.expiryDate) return false;
      return differenceInDays(new Date(i.expiryDate), now) < 0;
    });

    if (expiredList.length > 0) {
      const topExpired = expiredList[0];
      const daysAgo = Math.abs(differenceInDays(new Date(topExpired.expiryDate!), now));
      list.push({
        id: `expired-${topExpired.id}`,
        type: 'expired',
        title: `Expired item cleanup: ${topExpired.name}`,
        message: `${topExpired.name} passed its expiry date ${daysAgo === 0 ? 'today' : `${daysAgo} days ago`}. Discard it to keep your stock clean and safe.`,
        item: topExpired,
        badge: `${expiredList.length} Expired`,
        badgeBg: 'bg-rose-50 border-rose-200',
        badgeColor: 'text-rose-700',
        icon: <FaExclamationTriangle className="text-rose-500" />,
        actionLabel: 'Discard Item',
        actionType: 'discard'
      });
    }

    // 2. Check for Urgent Expiry (items expiring in 0-3 days)
    const urgentExpiryList = items
      .filter(i => {
        if (!i.expiryDate) return false;
        const diff = differenceInDays(new Date(i.expiryDate), now);
        return diff >= 0 && diff <= 3;
      })
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

    if (urgentExpiryList.length > 0) {
      const topUrgent = urgentExpiryList[0];
      const diff = differenceInDays(new Date(topUrgent.expiryDate!), now);
      const daysText = diff === 0 ? 'Expires today' : diff === 1 ? 'Expires tomorrow' : `Expires in ${diff} days`;
      list.push({
        id: `urgent-${topUrgent.id}`,
        type: 'urgent_expiry',
        title: `Use soon: ${topUrgent.name}`,
        message: `${daysText} (${format(new Date(topUrgent.expiryDate!), 'MMM dd')}). Consider consuming it today to avoid waste.`,
        item: topUrgent,
        badge: daysText,
        badgeBg: 'bg-amber-50 border-amber-200',
        badgeColor: 'text-amber-800',
        icon: <FaRegClock className="text-amber-500" />,
        actionLabel: 'Log Used Today',
        actionType: 'use_today'
      });
    }

    // 3. Check for Low Stock / Out of Stock
    const lowStockList = items.filter(i => isItemLowQuantity(i));
    if (lowStockList.length > 0) {
      const topLow = lowStockList[0];
      const stock = getItemStock(topLow);
      list.push({
        id: `low-${topLow.id}`,
        type: 'low_stock',
        title: `Low stock alert: ${topLow.name}`,
        message: stock <= 0
          ? `${topLow.name} is completely out of stock. Add it to your shopping list or restock.`
          : `Only ${stock} left in stock. Reorder or pick up another pack on your next grocery run.`,
        item: topLow,
        badge: stock <= 0 ? 'Out of Stock' : `Only ${stock} left`,
        badgeBg: 'bg-orange-50 border-orange-200',
        badgeColor: 'text-orange-700',
        icon: <FaShoppingBag className="text-orange-500" />,
        actionLabel: 'Restock +1',
        actionType: 'restock'
      });
    }

    // 4. Check for Daily Medicine Routine (medicines not taken today)
    const pendingMedicines = items.filter(i => {
      if (i.type !== 'medicine') return false;
      const isUsedToday = i.lastUsedDate === todayStr && (i.usedTodayCount || 0) > 0;
      return !isUsedToday && (i.dailyDose || i.medicineTiming);
    });

    if (pendingMedicines.length > 0) {
      const topMed = pendingMedicines[0];
      const timingLabel =
        topMed.medicineTiming === 'after_food'
          ? 'take after food'
          : topMed.medicineTiming === 'before_food'
          ? 'take before food'
          : 'daily dose';
      list.push({
        id: `med-${topMed.id}`,
        type: 'medicine_routine',
        title: `Daily Dose Reminder: ${topMed.name}`,
        message: `Scheduled ${timingLabel}. You haven't marked this medicine as taken today.`,
        item: topMed,
        badge: 'Routine Due',
        badgeBg: 'bg-indigo-50 border-indigo-200',
        badgeColor: 'text-indigo-700',
        icon: <FaPills className="text-indigo-500" />,
        actionLabel: 'Take Dose / Mark Used',
        actionType: 'use_today'
      });
    }

    // 5. Fallback positive status if everything is fresh & well-stocked
    if (list.length === 0 && items.length > 0) {
      list.push({
        id: 'all-good',
        type: 'all_good',
        title: 'Inventory in great shape!',
        message: 'No expired items or low stock warnings. All tracked products are fresh and well-managed.',
        badge: 'Optimized',
        badgeBg: 'bg-emerald-50 border-emerald-200',
        badgeColor: 'text-emerald-700',
        icon: <FaMagic className="text-emerald-500" />
      });
    }

    return list;
  }, [items, todayStr]);

  if (suggestions.length === 0) return null;

  const handleAction = async (sug: Suggestion) => {
    if (!sug.item || !sug.item.id) return;
    if (sug.actionType === 'use_today') {
      await markItemUsedToday(sug.item.id);
    } else if (sug.actionType === 'restock') {
      await adjustItemStock(sug.item.id, 1);
    } else if (sug.actionType === 'discard') {
      if (window.confirm(`Discard expired ${sug.item.name}?`)) {
        onDeleteItem(sug.item.id);
      }
    } else if (sug.actionType === 'view') {
      onViewItem(sug.item);
    }
  };

  return (
    <div className={hideHeader ? '' : 'mb-8'}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm shadow-xs">
              <FaLightbulb />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">
                Smart Inventory Suggestions
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {suggestions.length} {suggestions.length === 1 ? 'recommendation' : 'recommendations'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map(sug => (
          <div
            key={sug.id}
            className="bg-white/90 backdrop-blur-md rounded-[24px] p-4 md:p-5 border border-slate-100 shadow-[0_8px_24px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    {sug.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                    {sug.title}
                  </h3>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${sug.badgeBg} ${sug.badgeColor}`}>
                  {sug.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10 mb-3">
                {sug.message}
              </p>
            </div>

            {sug.item && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100/80 mt-1 pl-10">
                <button
                  onClick={() => sug.item && onViewItem(sug.item)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                >
                  <span>View Details</span>
                  <FaChevronRight size={10} />
                </button>

                {sug.actionLabel && (
                  <button
                    onClick={() => handleAction(sug)}
                    className={`text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 ${
                      sug.actionType === 'discard'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : sug.actionType === 'restock'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {sug.actionType === 'discard' && <FaTrash size={10} />}
                    {sug.actionType === 'restock' && <FaPlus size={10} />}
                    {sug.actionType === 'use_today' && <FaCheck size={10} />}
                    <span>{sug.actionLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
