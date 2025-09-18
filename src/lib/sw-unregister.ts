// sw-unregister.ts (solo en dev)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      console.log('🧹 Unregistering Service Worker:', reg.scope);
      reg.unregister();
    });
  }).catch(err => {
    console.warn('Error unregistering Service Workers:', err);
  });
}

export {};