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

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  delayMinutes: number,
  imageUrl?: string,
  recurringData?: { times: string[], days: number[], type: string }
) => {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log(`Notification permission denied. Cannot schedule: ${title}`);
    return false;
  }

  const delayMs = delayMinutes * 60 * 1000;
  console.log(`Scheduling local notification for ${delayMinutes} minutes from now...`);

  if (Capacitor.isNativePlatform()) {
     // Ensure channel exists (fixes Android 8+ issue)
     await LocalNotifications.createChannel({
         id: 'med-reminders',
         name: 'Medicine Reminders',
         description: 'Notifications for medicine doses',
         importance: 5,
         visibility: 1,
         vibration: true
     });

     const baseNativeOptions: any = {
         title: title,
         body: body,
         smallIcon: "ic_stat_icon_config_sample",
         channelId: 'med-reminders'
     };

     if (imageUrl && !imageUrl.startsWith('data:')) {
         baseNativeOptions.largeIcon = imageUrl;
     }

     const notificationsToSchedule = [];
     let idCounter = new Date().getTime();

     if (recurringData && recurringData.type !== 'none' && recurringData.times && recurringData.times.length > 0) {
        // Complex Scheduling logic for multiple times a day
        for (const time of recurringData.times) {
            const timeParts = time.split(':');
            const hour = parseInt(timeParts[0]);
            const minute = parseInt(timeParts[1]);

            if (recurringData.type === 'daily') {
               notificationsToSchedule.push({
                  ...baseNativeOptions,
                  id: idCounter++,
                  schedule: { on: { hour, minute }, allowWhileIdle: true }
               });
            } else if (recurringData.type === 'weekly') {
               // Weekly assumes scheduling on the current day if not specified otherwise
               notificationsToSchedule.push({
                  ...baseNativeOptions,
                  id: idCounter++,
                  schedule: { on: { weekday: new Date().getDay(), hour, minute }, allowWhileIdle: true }
               });
            } else if (recurringData.type === 'custom_days' && recurringData.days && recurringData.days.length > 0) {
               // Schedule for each selected day (0-6 mapping to Capacitor's weekday 1-7 depending on plugin version, usually 1=Sun, 7=Sat)
               // Javascript getDay() is 0=Sun, 6=Sat. Capacitor `weekday` is usually 1-7 (1=Sun)
               for (const day of recurringData.days) {
                   notificationsToSchedule.push({
                      ...baseNativeOptions,
                      id: idCounter++,
                      schedule: { on: { weekday: day + 1, hour, minute }, allowWhileIdle: true }
                   });
               }
            } else if (recurringData.type === 'monthly') {
               notificationsToSchedule.push({
                  ...baseNativeOptions,
                  id: idCounter++,
                  schedule: { on: { day: new Date().getDate(), hour, minute }, allowWhileIdle: true }
               });
            }
        }
     } else {
        // Fallback one-time delay
        notificationsToSchedule.push({
            ...baseNativeOptions,
            id: idCounter,
            schedule: { at: new Date(Date.now() + delayMs), allowWhileIdle: true }
        });
     }

     await LocalNotifications.schedule({ notifications: notificationsToSchedule });
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
               image: imageUrl, // Web API supports data URIs directly
               vibrate: [200, 100, 200],
               tag: 'med-reminder', // Groups similar notifications
               renotify: true
           });
           return;
       }
    }

    new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        image: imageUrl
    });
  }, delayMs);

  return true;
};
