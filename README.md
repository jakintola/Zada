# ZADA Water Delivery App

A comprehensive water delivery management system with real-time features, built with React Native and Expo.

## 🚀 Features

- **Real-time Inventory Management**: Track products, stock levels, and pricing
- **Order Management**: Complete order lifecycle from placement to delivery
- **Customer Support**: Real-time chat system between customers and admin
- **Business Intelligence**: Live analytics and reporting
- **Multi-platform**: Works on web and mobile
- **Database Integration**: Supabase with localStorage fallback

## 📁 Project Structure

```
Zada1.0/
├── 📱 Core App Files
│   ├── App.tsx                 # Main application component (refactored)
│   ├── index.ts               # Entry point
│   ├── storageUtils.ts        # Cross-platform storage utilities
│   ├── supabaseClient.ts      # Supabase configuration
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   └── app.json              # Expo configuration
│
├── 🏗️ Source Code (src/)
│   ├── components/common/     # Reusable UI components
│   ├── contexts/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── screens/             # Main application screens
│   ├── services/            # External service integrations
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── constants/           # Application constants
│
├── 🗄️ Database
│   └── supabase/             # Database setup files
│       ├── fixed_setup.sql   # Complete database setup
│       └── step_by_step_setup.sql # Step-by-step setup
│
├── 🎨 Assets
│   └── assets/               # App icons and images
│
└── 📚 Documentation
    ├── README.md             # This file
    ├── ARCHITECTURE.md       # Detailed architecture docs
    ├── MIGRATION_GUIDE.md    # Migration from old structure
    ├── BEST_PRACTICES_SUMMARY.md # Implementation summary
    └── PROJECT_STRUCTURE.md  # Clean project structure
```

> **Note**: This project has been refactored to follow React Native and TypeScript best practices with a clean, modular architecture. See `ARCHITECTURE.md` for detailed documentation.

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Choose one of the following options:

#### Option A: Complete Setup (Recommended)
Run `supabase/fixed_setup.sql` in your Supabase SQL editor.

#### Option B: Step-by-Step Setup
Run each step in `supabase/step_by_step_setup.sql` individually.

### 3. Environment Variables
Set up your Supabase credentials:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Application

#### Web Development
```bash
npx expo start --web
```

#### Mobile Development
```bash
npx expo start
```

#### Production Build
```bash
npx expo export -p web --output-dir dist
```

## 🗄️ Database Schema

The application uses the following tables:
- `users` - User accounts and authentication
- `products` - Inventory management
- `orders` - Order management and tracking
- `customers` - Customer profiles
- `messages` - Chat system
- `analytics` - Business intelligence data

## 🔧 Key Components

- **Inventory Management**: Real-time product editing and stock management
- **Order Processing**: Complete order lifecycle with status tracking
- **Customer Support**: Live chat system with notifications
- **Business Analytics**: Real-time metrics and reporting
- **User Management**: Admin and customer account management

## 🌐 Deployment

The app is ready for deployment on:
- **Web**: Any static hosting service (Netlify, Vercel, etc.)
- **Mobile**: Expo Go app or custom builds
- **Database**: Supabase (with localStorage fallback)

## 📱 Usage

1. **Admin Users**: Can manage inventory, orders, and customer support
2. **Customer Users**: Can browse products, place orders, and contact support
3. **Real-time Sync**: All changes sync instantly across devices
4. **Offline Support**: App works with localStorage when database unavailable

## 🚀 Getting Started

1. Clone the repository
2. Run `npm install`
3. Set up Supabase database using provided SQL files
4. Configure environment variables
5. Run `npx expo start --web` for web development
6. Open http://localhost:8082 in your browser

## 📄 License

This project is proprietary software for ZADA Water Delivery.
