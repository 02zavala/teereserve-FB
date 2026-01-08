"use client";

// Configuraciones de animaciones para Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.2, ease: "easeOut" }
};

export const bounceIn = {
  initial: { opacity: 0, scale: 0.3 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  exit: { opacity: 0, scale: 0.3 }
};

// Animaciones para listas
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Animaciones para modales
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

// Animaciones para navegación
export const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

// Animaciones para botones
export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export const buttonTap = {
  scale: 0.98,
  transition: { duration: 0.1 }
};

// Animaciones para cards
export const cardHover = {
  y: -5,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  transition: { duration: 0.2 }
};

// Animaciones para loading
export const loadingSpinner = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear" as const
    }
  }
};

export const loadingPulse = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Animaciones para notificaciones
export const notificationSlideIn = {
  initial: { opacity: 0, x: 300, scale: 0.3 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    x: 300, 
    scale: 0.5,
    transition: {
      duration: 0.2
    }
  }
};

// Animaciones para formularios
export const formFieldFocus = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export const formError = {
  x: [-10, 10, -10, 10, 0],
  transition: { duration: 0.4 }
};

// Animaciones para imágenes
export const imageLoad = {
  initial: { opacity: 0, scale: 1.1 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Animaciones para skeleton loading
export const skeletonPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

// Configuraciones de viewport para animaciones
export const viewportConfig = {
  once: true,
  margin: "-100px",
  amount: 0.3
};

// Utilidades para animaciones condicionales
export const createConditionalAnimation = (condition: boolean, animation: any, fallback: any = {}) => {
  return condition ? animation : fallback;
};

// Animaciones para diferentes breakpoints
export const responsiveAnimation = {
  mobile: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  },
  desktop: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  }
};

// Presets de animaciones comunes
export const animationPresets = {
  // Para elementos que aparecen al hacer scroll
  scrollReveal: {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: viewportConfig,
    transition: { duration: 0.6, ease: "easeOut" }
  },
  
  // Para elementos interactivos
  interactive: {
    whileHover: buttonHover,
    whileTap: buttonTap
  },
  
  // Para elementos de navegación
  navigation: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: 0.1 }
  },
  
  // Para contenido principal
  mainContent: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5, delay: 0.2 }
  }
};

// Funciones helper para animaciones
export const createStaggeredAnimation = (itemCount: number, baseDelay: number = 0.1) => {
  return {
    animate: {
      transition: {
        staggerChildren: baseDelay,
        delayChildren: 0.1
      }
    }
  };
};

export const createDelayedAnimation = (delay: number, animation: any) => {
  return {
    ...animation,
    transition: {
      ...animation.transition,
      delay
    }
  };
};

// Configuración global de animaciones
export const globalAnimationConfig = {
  // Reducir animaciones si el usuario prefiere menos movimiento
  respectMotionPreference: true,
  
  // Configuración por defecto
  defaultTransition: {
    type: "tween",
    ease: "easeOut",
    duration: 0.3
  },
  
  // Configuración para animaciones de layout
  layoutTransition: {
    type: "spring",
    stiffness: 300,
    damping: 30
  }
};