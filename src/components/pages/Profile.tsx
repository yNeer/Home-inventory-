import React, { useState, useEffect } from 'react';
import { FaCog, FaSignOutAlt, FaShieldAlt, FaBell, FaDownload } from 'react-icons/fa';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { CamelMascot } from '../ui/CamelMascot';

export const Profile: React.FC = () => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const { isInstallable, installPWA } = usePWAInstall();

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifs = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };
  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-10 mt-6 sm:mt-8 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-1 drop-shadow-sm">Account</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Profile.
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60"></div>

          <div className="w-40 h-40 shrink-0 relative z-10 drop-shadow-xl transition-transform hover:scale-105 duration-300 mb-4">
             <CamelMascot />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-1 z-10">Inventory Camel</h2>
          <p className="text-amber-500 font-bold uppercase tracking-widest text-sm z-10">Your Mascot</p>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white rounded-[32px] p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-2">
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
            <FaCog size={18} />
          </div>
          <span className="font-bold text-slate-700 flex-1">Settings</span>
        </button>
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <FaShieldAlt size={18} />
          </div>
          <span className="font-bold text-slate-700 flex-1">Privacy & Security</span>
        </button>

        {!isInstalled && (
          <div className="my-2 p-5 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 flex flex-col sm:flex-row items-center gap-4 justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0">
                 <FaDownload size={20} className="text-white drop-shadow-md" />
               </div>
               <div className="flex flex-col flex-1">
                 <span className="font-bold text-lg drop-shadow-sm">Install App</span>
                 <span className="text-sm font-medium text-blue-100">Get faster access & offline mode</span>
                 {!isInstallable && <span className="text-[10px] text-blue-200 mt-1 uppercase tracking-wider font-bold">Use browser menu to add</span>}
               </div>
            </div>
            <button
              onClick={() => {
                 if (isInstallable) {
                    installPWA();
                 } else {
                    alert("To install: tap 'Share' then 'Add to Home Screen' (iOS), or use your browser menu (Android/Desktop).");
                 }
              }}
              className="w-full sm:w-auto px-6 py-3 bg-white text-blue-600 font-extrabold rounded-xl shadow-sm hover:bg-blue-50 transition-colors active:scale-95 shrink-0 relative z-10"
            >
              Install Now
            </button>
          </div>
        )}

        <button
          onClick={requestNotifs}
          disabled={notifPermission === 'granted'}
          className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <FaBell size={18} />
          </div>
          <div className="flex flex-col flex-1">
             <span className="font-bold text-slate-700">Push Notifications</span>
             <span className="text-xs font-medium text-slate-400">{notifPermission === 'granted' ? 'Enabled' : 'Click to enable device alerts'}</span>
          </div>
        </button>
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <FaSignOutAlt size={18} />
          </div>
          <span className="font-bold text-rose-600 flex-1">Sign Out</span>
        </button>
        </div>
      </div>
    </div>
  );
};
