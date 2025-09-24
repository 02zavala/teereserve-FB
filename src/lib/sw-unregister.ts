// sw-unregister.ts (solo en dev)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
  const unregisterServiceWorkers = async () => {
    try {
      // Wait for document to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            console.log('🧹 Unregistering Service Worker:', registration.scope);
            await registration.unregister();
          } catch (err) {
            console.warn('Failed to unregister individual service worker:', err);
          }
        })
      );
    } catch (error) {
      console.warn('Error unregistering Service Workers:', error);
    }
  };
  
  unregisterServiceWorkers();
}

export {};