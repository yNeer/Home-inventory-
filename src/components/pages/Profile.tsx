import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaCog, FaSignOutAlt, FaShieldAlt, FaBell, FaDownload } from 'react-icons/fa';
import { usePWAInstall } from '../../hooks/usePWAInstall';

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
        <div className="col-span-1 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-32 h-32 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-5xl shadow-xl shadow-indigo-200 mb-6 border-4 border-white">
            <FaUserCircle />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-1">John Doe</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">user@example.com</p>
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

        {isInstallable && (
          <button
            onClick={installPWA}
            className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100 group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <FaDownload size={18} />
            </div>
            <div className="flex flex-col flex-1">
               <span className="font-bold text-slate-700">Install App</span>
               <span className="text-xs font-medium text-slate-400">Add to Home Screen</span>
            </div>
          </button>
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
