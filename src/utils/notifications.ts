/**
 * Utility for handling Native PWA / Browser Notifications
 * Works across Desktop, Android, and iOS (if installed as PWA and supported)
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
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

  // Local timeout for when the app is currently open/running in background tab
  setTimeout(async () => {
    // Prefer ServiceWorker for better PWA native integration (Android/iOS)
    if ('serviceWorker' in navigator) {
       const registration = await navigator.serviceWorker.getRegistration();
       if (registration && 'showNotification' in registration) {
           registration.showNotification(title, {
               body,
               icon: '/pwa-192x192.png',
               badge: '/masked-icon.svg',
               vibrate: [200, 100, 200],
               tag: 'med-reminder', // Groups similar notifications
               renotify: true
           });
           return;
       }
    }

    // Fallback to standard browser notification API (Desktop)
    new Notification(title, {
        body,
        icon: '/pwa-192x192.png'
    });
  }, delayMs);

  return true;
};
