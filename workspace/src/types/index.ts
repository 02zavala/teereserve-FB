

export type Locale = 'en' | 'es';

export interface ReviewUserInput {
  name: string;
  avatarUrl?: string;
}

export interface ReviewMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string; // For videos
  filename: string;
  size: number;
  uploadedAt: string;
}

export interface ReviewInput {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number; // 1-5
  text: string;
  comment: string; // Alias for text for backward compatibility
  imageUrl?: string; // Deprecated - use media array
  videoUrl?: string; // Deprecated - use media array
  media?: ReviewMediaItem[];
  experienceType?: 'service' | 'facilities' | 'green' | 'overall';
}

export interface ReviewComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
}

export interface ReviewLike {
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Review extends ReviewInput {
  id: string;
  courseId: string;
  courseName?: string; // Added for admin panel
  user: ReviewUserInput;
  createdAt: string; // ISO String
  approved: boolean | null; // true: approved, false: rejected, null: pending
  status: 'pending' | 'approved' | 'rejected'; // New status field
  verified: boolean; // Simplified verification status
  isVerifiedBooking: boolean; // Reserva verificada via TeeReserve
  likes: ReviewLike[];
  comments: ReviewComment[];
  likesCount: number;
  commentsCount: number;
  media?: ReviewMediaItem[];
}

export interface TeeTime {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'available' | 'booked' | 'blocked' | 'partial';
  price: number;
  maxPlayers?: number; // Máximo de jugadores permitidos (default: 4)
  bookedPlayers?: number; // Jugadores ya reservados
  availableSpots?: number; // Espacios disponibles restantes
  bookingIds?: string[]; // IDs de las reservas asociadas a este tee time
}

// This represents the data stored in the main "courses" collection document
export interface GolfCourseInput {
  name: string;
  location: string;
  address?: string;
  description: string;
  rules: string;
  basePrice: number;
  imageUrls: string[];
  slug?: string;
  hidden?: boolean; // Campo para ocultar cursos del público
  isFeatured?: boolean; // New field for featured courses
  latLng?: {
    lat: number;
    lng: number;
  };
  teeTimeInterval?: number; // Interval in minutes (10, 12, 15, etc.)
  operatingHours?: {
    openingTime: string; // Format: "HH:mm" (e.g., "07:30")
    closingTime: string; // Format: "HH:mm" (e.g., "16:30")
  };
  // Course specifications
  availableHoles: number[]; // Available hole options (e.g., [9, 18] or [9, 18, 27])
  totalYards?: number; // Total yardage of the course
  par: number; // Course par (e.g., 72, 71, etc.)
  holeDetails?: {
    holes9?: { yards: number; par: number };
    holes18?: { yards: number; par: number };
    holes27?: { yards: number; par: number };
  };
  // New bilingual content support
  translations?: {
    es: { name: string; location: string; description: string; rules: string };
    en: { name: string; location: string; description: string; rules: string };
  };
}

// This is the full course object, including related data that might be fetched separately
export interface GolfCourse extends GolfCourseInput {
  id:string;
  reviews: Review[];
}

export type BookingStatus = 
  | 'pending'
  | 'confirmed' 
  | 'rescheduled'
  | 'checked_in'
  | 'completed'
  | 'canceled_customer'
  | 'canceled_admin'
  | 'no_show'
  | 'disputed';

export type PaymentStatus = string;

export interface BookingInput {
    userId: string;
    userName: string;
    userEmail?: string;
    userPhone?: string;
    courseId: string;
    courseName: string;
    courseLocation?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    players: number;
    holes: number; // Number of holes to play (9, 18, or 27)
    totalPrice: number;
    status: BookingStatus;
    teeTimeId: string;
    comments?: string;
    specialRequests?: string;
    couponCode?: string;
    version?: number; // For optimistic locking
    paymentStatus?: PaymentStatus;
    currency?: string;
    paymentMethod?: string;
    paymentIntentId?: string; // Stripe Payment Intent ID
    refundAmount?: number;
    cancellationReason?: string;
    adminNotes?: string;
    formattedDate?: string;
}

export interface Booking extends BookingInput {
    id: string;
    confirmationNumber: string; // TRG- followed by random characters
    createdAt: string; // ISO String
    updatedAt?: string; // ISO String
    reviewInvitationSent?: boolean;
    reviewInvitationSentAt?: string;
    addOns?: BookingAddOn[];
    customerInfo?: {
        name?: string;
        phone?: string;
        email?: string;
        rfc?: string;
        companyName?: string;
        notes?: string;
    };
    teeDateTime?: Date;
    numberOfPlayers?: number;
    isGuest?: boolean;
    guest?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    reschedulesUsed?: number; // Track number of times booking has been rescheduled
    pricing_snapshot?: PricingSnapshot; // Immutable pricing breakdown from checkout
}

export interface BookingAddOn {
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'cart' | 'caddie' | 'club_rental' | 'lesson' | 'other';
}

export interface BookingAuditLog {
    id: string;
    bookingId: string;
    actorId: string;
    actorName: string;
    action: string;
    beforeData?: any;
    afterData?: any;
    reason?: string;
    createdAt: string;
}

export interface CancellationPolicy {
    id: string;
    courseId: string;
    hoursBeforeStart: number;
    refundPercentage: number;
    fixedFee?: number;
    description: string;
}

export interface BookingChange {
    id: string;
    bookingId: string;
    changeType: 'reschedule' | 'players' | 'addons' | 'cancellation';
    oldValue: any;
    newValue: any;
    priceDifference: number;
    reason: string;
    processedBy: string;
    createdAt: string;
}

export type AchievementId = 'firstBooking' | 'earlyBird' | 'courseExplorer' | 'trustedReviewer' | 'weekendWarrior';

// Notification System Types
export interface NotificationSettings {
  email: {
    welcome: boolean;
    bookingConfirmation: boolean;
    bookingReminder: boolean;
    paymentConfirmation: boolean;
    reviewInvitation: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  push: {
    bookingReminder: boolean;
    paymentDue: boolean;
    newPromotions: boolean;
    reviewReminder: boolean;
  };
  sms: {
    bookingReminder: boolean;
    urgentUpdates: boolean;
  };
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'SuperAdmin' | 'Admin' | 'Customer' | 'Affiliate';
    createdAt: string;
    assignedCourses?: string[];
    handicap?: number;
    xp: number;
    achievements: AchievementId[];
    notificationSettings?: NotificationSettings;
}

export interface ScorecardInput {
    userId: string;
    courseName: string;
    date: string; // YYYY-MM-DD
    score: number;
    notes?: string;
}

export interface Scorecard extends ScorecardInput {
    id: string;
    createdAt: string; // ISO String
}

export interface TeamMember {
    id: string;
    name: string;
    role_en: string;
    role_es: string;
    avatarUrl: string;
    order: number;
}

export interface AboutPageContent {
    heroImageUrl: string;
    missionImageUrl: string;
}

export interface Coupon {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    expiresAt?: string; // ISO string
    createdAt: string; // ISO string
    timesUsed?: number;
    usageLimit?: number;
}

export interface CouponInput extends Omit<Coupon, 'createdAt'> {}

// Review System Types
export interface ReviewBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'explorer' | 'expert' | 'top_reviewer' | 'verified_player';
}

export interface UserReviewStats {
  totalReviews: number;
  totalLikes: number;
  coursesReviewed: string[];
  badges: ReviewBadge[];
  monthlyRank?: number;
  isTopReviewer: boolean;
}

export interface ReviewFilter {
  courseId?: string;
  experienceType?: 'service' | 'facilities' | 'green' | 'overall';
  rating?: number;
  isVerifiedBooking?: boolean;
  sortBy: 'newest' | 'oldest' | 'highest_rated' | 'most_liked';
}

export interface SocialFeedItem {
  id: string;
  type: 'review' | 'achievement' | 'booking';
  userId: string;
  userName: string;
  userAvatar?: string | null;
  content: any; // Review, Achievement, or Booking data
  createdAt: string;
  likes: ReviewLike[];
  comments: ReviewComment[];
}

// Social Posts
export interface PostInput {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  media?: ReviewMediaItem[];
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
  likes: ReviewLike[];
  comments: ReviewComment[];
  media?: ReviewMediaItem[];
}

// *** PRICING SYSTEM INTERFACES ***

// Temporadas (alta/baja: fechas)
export interface Season {
  id: string;
  courseId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  priority: number; // Mayor número = mayor prioridad
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Bandas horarias (Early, Prime, Twilight)
export interface TimeBand {
  id: string;
  courseId: string;
  label: string; // 'Early', 'Prime', 'Twilight'
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Tipos de reglas de precios
export type PriceRuleType = 'fixed' | 'delta' | 'multiplier';

// Reglas de precios flexibles
export interface PriceRule {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  
  // Filtros opcionales
  seasonId?: string;
  dow?: number[]; // Días de la semana (0=domingo, 6=sábado)
  timeBandId?: string;
  leadTimeMin?: number; // Horas mínimas de anticipación
  leadTimeMax?: number; // Horas máximas de anticipación
  occupancyMin?: number; // % mínimo de ocupación
  occupancyMax?: number; // % máximo de ocupación
  playersMin?: number; // Número mínimo de jugadores
  playersMax?: number; // Número máximo de jugadores
  
  // Acción de precio
  priceType: PriceRuleType;
  priceValue: number; // Valor fijo, delta o multiplicador
  
  // Configuración
  priority: number; // Mayor número = mayor prioridad
  active: boolean;
  effectiveFrom?: string; // ISO string
  effectiveTo?: string; // ISO string
  
  // Límites opcionales
  minPrice?: number;
  maxPrice?: number;
  roundTo?: number; // Redondear a múltiplo de (5, 10, etc.)
  
  createdAt: string;
  updatedAt?: string;
}

// Overrides especiales (feriados, torneos, cierre parcial)
export interface SpecialOverride {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  
  // Fechas y horarios específicos
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (opcional para todo el día)
  endTime?: string; // HH:mm (opcional para todo el día)
  
  // Acción
  overrideType: 'price' | 'block'; // Precio fijo o bloquear
  priceValue?: number; // Solo si overrideType = 'price'
  
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Productos base por curso
export interface BaseProduct {
  id: string;
  courseId: string;
  greenFeeBaseUsd: number;
  cartFeeUsd?: number;
  caddieFeeUsd?: number;
  insuranceFeeUsd?: number;
  updatedAt: string;
}

// Cache de precios para performance
export interface PriceCache {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  timeBand?: string;
  pricePerPlayer: number;
  totalPrice: number;
  appliedRules?: any[];
  calculatedAt: string;
  expiresAt: string;
}

// Resultado del cálculo de precios
export interface PriceCalculationResult {
  basePrice: number;
  appliedRules: {
    ruleId: string;
    ruleName: string;
    ruleType: PriceRuleType;
    value: number;
    resultPrice: number;
  }[];
  finalPricePerPlayer: number;
  totalPrice: number; // Para el número de jugadores especificado
  players: number;
  calculationTimestamp: string;
}

// Input para el motor de cálculo de precios
export interface PriceCalculationInput {
  courseId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  players: number;
  leadTimeHours?: number; // Calculado automáticamente si no se proporciona
  occupancyPercent?: number; // % de ocupación actual
}

// Pricing Snapshot interfaces for checkout system
export interface PricingSnapshot {
  currency: string;
  tax_rate: number; // e.g., 0.16 for 16%
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  quote_id?: string;
  quote_hash?: string;
  createdAt: string; // ISO string
  promoCode?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface QuoteRequest {
  courseId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  players: number;
  holes: number;
  basePrice: number;
  promoCode?: string;
  userId?: string;
  userEmail?: string;
}

export interface QuoteResponse {
  currency: string;
  tax_rate: number;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  quote_hash: string;
  expires_at: string; // ISO string
  promoCode?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

// *** CMS Content Types ***

export interface CMSSection {
  id: string;
  type: 'hero' | 'text' | 'image' | 'event' | 'gallery' | 'testimonial' | 'cta';
  title: string;
  content: Record<string, any>; // Flexible content based on section type
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}

export interface CMSEventSection extends CMSSection {
  type: 'event';
  content: {
    eventTitle: string;
    eventDescription: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    eventPrice: number;
    eventCurrency: string;
    maxTickets: number;
    soldTickets: number;
    eventImage?: string;
    eventFeatures: string[];
    isTicketSaleActive: boolean;
    ticketSaleStartDate?: string;
    ticketSaleEndDate?: string;
  };
}

export interface CMSHeroSection extends CMSSection {
  type: 'hero';
  content: {
    headline: string;
    subheadline: string;
    backgroundImage: string;
    ctaText: string;
    ctaLink: string;
    overlayOpacity: number;
  };
}

export interface CMSTextSection extends CMSSection {
  type: 'text';
  content: {
    headline?: string;
    body: string;
    alignment: 'left' | 'center' | 'right';
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface CMSImageSection extends CMSSection {
  type: 'image';
  content: {
    imageUrl: string;
    altText: string;
    caption?: string;
    alignment: 'left' | 'center' | 'right';
    size: 'small' | 'medium' | 'large' | 'full';
  };
}

export interface CMSGallerySection extends CMSSection {
  type: 'gallery';
  content: {
    images: Array<{
      url: string;
      altText: string;
      caption?: string;
    }>;
    layout: 'grid' | 'carousel' | 'masonry';
    columns: number;
  };
}

export interface CMSTestimonialSection extends CMSSection {
  type: 'testimonial';
  content: {
    testimonials: Array<{
      name: string;
      role?: string;
      avatar?: string;
      text: string;
      rating?: number;
    }>;
    layout: 'single' | 'carousel' | 'grid';
  };
}

export interface CMSCTASection extends CMSSection {
  type: 'cta';
  content: {
    headline: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  sections: string[]; // Array of section IDs
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CMSTemplate {
  id: string;
  name: string;
  description: string;
  sections: Partial<CMSSection>[]; // Template sections without IDs
  category: 'landing' | 'event' | 'promotion' | 'general';
  previewImage?: string;
}

export interface EventTicket {
  id: string;
  eventSectionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentIntentId?: string;
  purchaseDate: string;
  ticketCode: string; // Unique code for validation
}
