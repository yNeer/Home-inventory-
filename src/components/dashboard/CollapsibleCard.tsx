import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';

export type CardTheme = 'default' | 'rose' | 'amber' | 'orange' | 'purple' | 'indigo' | 'emerald';

interface CollapsibleCardProps {
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  badge?: string | React.ReactNode;
  badgeColor?: string;
  count?: number;
  previewSummary?: string | React.ReactNode;
  headerActions?: React.ReactNode;
  theme?: CardTheme;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
}

const themeStyles: Record<CardTheme, {
  border: string;
  bg: string;
  headerHover: string;
  accent: string;
}> = {
  default: {
    border: 'border-slate-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-slate-50/70',
    accent: 'text-slate-800'
  },
  rose: {
    border: 'border-rose-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-rose-50/30',
    accent: 'text-rose-800'
  },
  amber: {
    border: 'border-amber-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-amber-50/30',
    accent: 'text-amber-900'
  },
  orange: {
    border: 'border-orange-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-orange-50/30',
    accent: 'text-orange-900'
  },
  purple: {
    border: 'border-purple-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-purple-50/30',
    accent: 'text-purple-900'
  },
  indigo: {
    border: 'border-indigo-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-indigo-50/30',
    accent: 'text-indigo-900'
  },
  emerald: {
    border: 'border-emerald-100',
    bg: 'bg-white',
    headerHover: 'hover:bg-emerald-50/30',
    accent: 'text-emerald-900'
  }
};

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id,
  isOpen,
  onToggle,
  title,
  subtitle,
  icon,
  iconBg = 'bg-slate-100 text-slate-700',
  badge,
  badgeColor,
  count,
  previewSummary,
  headerActions,
  theme = 'default',
  children,
  emptyState,
  isEmpty = false
}) => {
  const styles = themeStyles[theme];

  return (
    <div
      id={id}
      className={`rounded-[28px] ${styles.bg} border ${styles.border} shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-200 overflow-hidden mb-5`}
    >
      {/* Clickable Card Header */}
      <div
        onClick={onToggle}
        className={`w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${styles.headerHover}`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* Left Side: Icon + Title + Badges */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 text-sm sm:text-base font-bold shadow-2xs ${iconBg}`}>
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-base sm:text-lg font-extrabold tracking-tight ${styles.accent} truncate`}>
                {title}
              </h3>

              {badge && (
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {badge}
                </span>
              )}

              {typeof count === 'number' && !badge && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>

            {/* Subtitle or Collapsed Preview */}
            {!isOpen && previewSummary ? (
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5 max-w-lg">
                <span className="font-semibold text-slate-500">Preview:</span> {previewSummary}
              </p>
            ) : subtitle ? (
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right Side: Header Actions & Chevron */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {headerActions}

          <button
            type="button"
            onClick={onToggle}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isOpen ? 'Collapse Section' : 'Expand Section'}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaChevronDown size={12} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 pt-1 sm:pt-2 border-t border-slate-100/80">
              {isEmpty && emptyState ? emptyState : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
