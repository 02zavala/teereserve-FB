# TeeReserve Golf Platform 🌍⛳

![TeeReserve](./public/logo.svg)

TeeReserve is a premium golf booking platform built with a modern tech stack, focusing on a global user experience, robust features, and high-quality code. This project serves as a comprehensive example of a full-stack Next.js application.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)

---

## ✨ Features

- **Internationalization (i18n)**: Full support for English and Spanish with locale-based formatting.
- **Dark Mode**: Professional, flash-free dark mode implementation with CSS variables.
- **Authentication**: Secure user authentication with email/password and Google sign-in.
- **Booking System**: Real-time tee time availability and a complete booking flow with secure payments.
- **Discount Coupons**: Admin-managed coupon system with validation and dynamic price updates.
- **Admin Dashboard**: A comprehensive panel for managing courses, bookings, users, reviews, and site content.
- **AI-Powered Features**:
  - Personalized course recommendations.
  - AI-assisted review moderation.
  - Automated transactional emails for booking confirmations and contact forms.
- **User Profiles**: Personalized user dashboards with booking history, scorecard management, and gamification elements.
- **Gamification**: XP and achievement system to enhance user engagement.
- **Guest Booking Lookup**: Allows users without an account to check their reservation status.
- **Notification System**: Comprehensive notification system with email, in-app, and SMS notifications.
  - Professional email templates for welcome, booking confirmations, and reminders.
  - In-app notifications with toasts, modals, and notification bell.
  - User-configurable notification preferences.
  - SMS notifications for urgent updates and booking reminders.
- **Webhook Integration**: n8n webhook system for advanced automation and third-party integrations.

---

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Database**: [Firestore](https://firebase.google.com/docs/firestore)
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
- **AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Payments**: [Stripe](https://stripe.com/)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Git
- A configured Firebase project with Firestore, Auth, and Storage enabled.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/teereserve.git
    cd teereserve
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the example environment file and fill in the required values from your Firebase, Stripe, and Google Cloud projects.
    ```bash
    cp .env.example .env.local
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open in your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

The project follows a standard Next.js App Router structure:

```
src/
├── app/[lang]/         # Localized routes
│   ├── (pages)/        # Public pages (home, courses, etc.)
│   └── admin/          # Admin dashboard routes
├── components/         # Reusable React components
│   ├── ui/             # shadcn/ui components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components (Header, Footer)
├── lib/                # Utilities, data fetching, Firebase config
├── context/            # React context providers (Auth)
├── ai/                 # Genkit AI flows and configuration
├── hooks/              # Custom React hooks
├── i18n-config.ts      # i18n configuration
└── middleware.ts       # Next.js middleware for localization
```

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### 🔥 Firebase Configuration (Required)
```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

### 💳 Payment Configuration (Required)
```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox # or production
PAYPAL_WEBHOOK_ID=your-webhook-id
PAYPAL_WEBHOOK_URL=your-webhook-url

# Currency Exchange
FX_RATE_FALLBACK=20.00
NEXT_PUBLIC_SHOW_FX_NOTE=true
```

### 🤖 AI & Analytics Configuration
```bash
# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Google reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
```

### 📧 Email Configuration (Required)
```bash
# Resend Email Service
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@teereserve.golf
RESEND_FROM_EMAIL=TeeReserve Golf <noreply@teereserve.golf>
CONTACT_FORM_RECIPIENT=info@teereserve.golf

# Zoho Mail Configuration (Alternative)
ZOHO_MAIL_FROM=your-email@domain.com
ZOHO_MAIL_CLIENT_ID=your-client-id
ZOHO_MAIL_CLIENT_SECRET=your-client-secret
ZOHO_MAIL_REFRESH_TOKEN=your-refresh-token
```

### 📱 Notifications Configuration
```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
TELEGRAM_ALERTS_ENABLED=true

# Admin Telegram Alerts
ADMIN_TELEGRAM_ALERTS_ENABLED=true
ADMIN_TELEGRAM_CHAT_ID=your-admin-chat-id

# Twilio SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=your-phone-number

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_ALERTS_ENABLED=true
ADMIN_WHATSAPP_ALERTS_ENABLED=true
ADMIN_WHATSAPP_NUMBER=your-admin-whatsapp-number

# Email Alerts
ADMIN_EMAIL_ALERTS_ENABLED=true
ADMIN_EMAIL_ADDRESS=admin@teereserve.golf
```

### 🌐 Application Configuration
```bash
# Base URL
NEXT_PUBLIC_BASE_URL=https://teereserve.golf

# Application Info
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_URL=https://teereserve.golf

# Environment
NODE_ENV=production # or development

# Security
ADMIN_API_KEY=your-secure-admin-api-key
QUOTE_SECRET=your-quote-secret-key
```

### 🔗 Webhooks & Integrations
```bash
# n8n Webhooks
N8N_WEBHOOK_URL=your-webhook-url
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_ENABLED=true

# Weather Service
NEXT_PUBLIC_OPENWEATHER_API_KEY=your-openweather-api-key
```

### 📊 Monitoring & Error Tracking
```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project

# Logging
REACT_APP_LOGGING_ENDPOINT=your-logging-endpoint
REACT_APP_LOGGING_API_KEY=your-logging-api-key
```

### 🔍 SEO & Verification
```bash
# Site Verification
GOOGLE_SITE_VERIFICATION=your-google-verification-code
YANDEX_VERIFICATION=your-yandex-verification-code
YAHOO_VERIFICATION=your-yahoo-verification-code
```

### ⚙️ Configuration Priority

**Essential for basic functionality:**
- Firebase Configuration (all variables)
- Stripe Configuration (for payments)
- Email Configuration (Resend or Zoho)
- Base URL

**Important for production:**
- Admin notifications (Telegram/Email)
- Sentry monitoring
- reCAPTCHA protection

**Optional enhancements:**
- PayPal payments
- WhatsApp notifications
- Weather service
- Analytics tracking

---

## 📜 Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase for errors.
# Teereserve-Golf