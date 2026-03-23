import React, { useState, useEffect } from 'react';
import { FaCog, FaSignOutAlt, FaShieldAlt, FaBell, FaDownload, FaCheckCircle, FaSpinner, FaApple, FaShareSquare, FaPlusSquare, FaChrome, FaEllipsisV } from 'react-icons/fa';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { CamelMascot } from '../ui/CamelMascot';
import { motion, AnimatePresence } from 'framer-motion';

export const Profile: React.FC = () => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  // Basic platform detection to show the most relevant instructions by default
  const [platformTab, setPlatformTab] = useState<'ios' | 'chrome'>('ios');

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    setPlatformTab(isIOS ? 'ios' : 'chrome');
  }, []);

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

        {/* Primary Install App Button - Copied from Sidebar for mobile visibility */}
        {!isInstalled && isInstallable && (
          <button
            onClick={async () => {
              setIsInstalling(true);
              const outcome = await installPWA();
              setIsInstalling(false);
              if (outcome === 'accepted') {
                setInstallSuccess(true);
                setTimeout(() => setInstallSuccess(false), 2000);
              }
            }}
            disabled={isInstalling || installSuccess}
            className="w-full h-14 mt-2 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl shadow-sm flex items-center justify-center gap-2 font-bold hover:bg-blue-50 transition-colors active:scale-95"
          >
            {installSuccess ? <FaCheckCircle size={16} /> : isInstalling ? <FaSpinner size={16} className="animate-spin" /> : <FaDownload size={16} />}
            <span>{installSuccess ? 'Installed!' : isInstalling ? 'Installing...' : 'Install App'}</span>
          </button>
        )}

        <AnimatePresence>
          {!isInstalled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
              className="my-2 p-5 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 flex flex-col sm:flex-row items-center gap-4 justify-between relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

              <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
                 <motion.div
                   animate={isInstalling ? { rotate: 360 } : installSuccess ? { scale: [1, 1.2, 1] } : {}}
                   transition={isInstalling ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.5 }}
                   className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border shrink-0 ${installSuccess ? 'bg-emerald-400/20 border-emerald-400/50' : 'bg-white/20 border-white/30'}`}
                 >
                   {installSuccess ? (
                     <FaCheckCircle size={22} className="text-emerald-300 drop-shadow-md" />
                   ) : isInstalling ? (
                     <FaSpinner size={20} className="text-white drop-shadow-md" />
                   ) : (
                     <FaDownload size={20} className="text-white drop-shadow-md" />
                   )}
                 </motion.div>
                 <div className="flex flex-col flex-1">
                   <span className="font-bold text-lg drop-shadow-sm">
                     Install App
                   </span>
                   <span className="text-sm font-medium text-blue-100">
                     Get faster access & offline mode
                   </span>
                   <span className="text-[10px] text-blue-200 mt-1 uppercase tracking-wider font-bold">Use browser menu to add</span>
                 </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                   setShowFallbackModal(true);
                   setPlatformTab('ios');
                }}
                className={`w-full sm:w-auto px-6 py-3 font-extrabold rounded-xl shadow-sm transition-all duration-300 shrink-0 relative z-10 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm`}
              >
                <FaApple size={18} />
                on iOS
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

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

      <AnimatePresence>
        {showFallbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowFallbackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-4 mb-6 bg-slate-100 p-1.5 rounded-full w-full">
                  <button
                    onClick={() => setPlatformTab('ios')}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${platformTab === 'ios' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FaApple size={16} /> iOS / Safari
                  </button>
                  <button
                    onClick={() => setPlatformTab('chrome')}
                    className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${platformTab === 'chrome' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FaChrome size={16} /> Chrome
                  </button>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">Install App</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed min-h-[40px]">
                  {platformTab === 'ios' ? 'To install this app on your iOS device, follow these steps:' : 'To install this app on Chrome or Android, follow these steps:'}
                </p>

                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex flex-col gap-4 min-h-[160px] justify-center">
                  {platformTab === 'ios' ? (
                    <>
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 shrink-0 font-bold">
                          1
                        </div>
                        <div className="text-sm font-medium text-slate-700 flex-1">
                          Tap the <FaShareSquare className="inline text-blue-500 mx-1 mb-1" /> <strong>Share</strong> button in your browser.
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 shrink-0 font-bold">
                          2
                        </div>
                        <div className="text-sm font-medium text-slate-700 flex-1">
                          Scroll down and select <br />
                          <span className="inline-flex items-center gap-1 mt-1 bg-white px-2 py-1 rounded shadow-sm text-xs font-bold text-slate-800">
                            <FaPlusSquare className="text-slate-400" /> Add to Home Screen
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 shrink-0 font-bold">
                          1
                        </div>
                        <div className="text-sm font-medium text-slate-700 flex-1">
                          Tap the <FaEllipsisV className="inline text-slate-500 mx-1 mb-1" /> <strong>Menu</strong> icon in the top right corner of Chrome.
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 shrink-0 font-bold">
                          2
                        </div>
                        <div className="text-sm font-medium text-slate-700 flex-1">
                          Select <br />
                          <span className="inline-flex items-center gap-1 mt-1 bg-white px-2 py-1 rounded shadow-sm text-xs font-bold text-slate-800">
                            <FaDownload className="text-slate-400" /> Install App
                          </span> or <br/>
                          <span className="inline-flex items-center gap-1 mt-1 bg-white px-2 py-1 rounded shadow-sm text-xs font-bold text-slate-800">
                            <FaPlusSquare className="text-slate-400" /> Add to Home Screen
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setShowFallbackModal(false)}
                  className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors active:scale-95"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
