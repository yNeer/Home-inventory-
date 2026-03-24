/**
 * Utility for handling Native PWA / Browser / Capacitor Native Notifications
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    const permStatus = await LocalNotifications.requestPermissions();
    return permStatus.display === 'granted';
  }

  // Web fallback
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const scheduleLocalNotification = async (title: string, body: string, delayMinutes: number) => {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log(`Notification permission denied. Cannot schedule: ${title}`);
    return false;
  }

  const delayMs = delayMinutes * 60 * 1000;
  console.log(`Scheduling local notification for ${delayMinutes} minutes from now...`);

  if (Capacitor.isNativePlatform()) {
     // True native Android/iOS background push scheduling
     await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + delayMs) },
            smallIcon: "ic_stat_icon_config_sample"
          }
        ]
     });
     return true;
  }

  // Web/PWA Local timeout for when the app is currently open/running in background tab
  setTimeout(async () => {
    if ('serviceWorker' in navigator) {
       const registration = await navigator.serviceWorker.getRegistration();
       if (registration && 'showNotification' in registration) {
           registration.showNotification(title, {
               body,
               icon: '/pwa-192x192.png',
               badge: '/favicon.ico',
               vibrate: [200, 100, 200],
               tag: 'med-reminder', // Groups similar notifications
               renotify: true
           });
           return;
       }
    }

    new Notification(title, {
        body,
        icon: '/pwa-192x192.png'
    });
  }, delayMs);

  return true;
};
