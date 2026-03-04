# FinTrack

**AI-powered offline personal finance tracker built for India**

FinTrack is a mobile app that helps you track expenses, manage budgets, and gain insights into your spending — all without requiring an internet connection. Your financial data stays on your device.

## Features

### Core Finance
- **Multi-Account Management** — Track checking, savings, credit cards, cash, and digital wallets
- **Transaction Tracking** — Add income, expenses, and transfers with category tagging
- **Budget System** — Set monthly budgets per category with real-time progress tracking
- **Recurring Transactions** — Mark and track recurring payments

### Smart Import
- **CSV/Excel Import** — Import bank statements with smart column auto-detection
- **PDF Statement OCR** — Extract transactions from scanned PDF bank statements with confidence scoring
- **15 Indian Bank Templates** — Pre-built mappings for SBI, HDFC, ICICI, Axis, Kotak, PNB, and more
- **UPI Transaction Parsing** — Parse UPI payment descriptions and merchant names

### AI & Categorization
- **Rule-Based Categorization** — 500+ Indian merchant mappings (Swiggy, Zomato, Flipkart, Amazon, etc.)
- **AI Insights Engine** — Spending summaries, anomaly detection, and savings tips
- **12 Built-in Categories** — Food & Dining, Transport, Shopping, Bills, Entertainment, Health, Education, Investments, Rent & EMI, Groceries, Income, Others

### Analytics & Reports
- **Dashboard** — Balance overview, spending mini-chart, and top categories at a glance
- **Analytics Screen** — Income vs. expense trends, category donut chart, spending trends
- **Data Export** — Export transactions to CSV or PDF reports

### Security & Backup
- **PIN Lock** — Protect app access with a PIN code
- **Biometric Authentication** — Fingerprint/Face unlock support
- **Encrypted Backup** — Create and restore encrypted backups of all your data
- **Offline-First** — All data stored locally with WatermelonDB on SQLite

### User Experience
- **Onboarding Flow** — Guided setup for first-time users
- **Swipe-to-Delete** — Quick transaction management with gesture support
- **Animated UI** — Smooth transitions with React Native Reanimated
- **Multi-language** — English and Hindi support
- **INR Currency** — Built for Indian Rupee with proper formatting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.83 + Expo SDK 55 |
| Language | TypeScript |
| Database | WatermelonDB (SQLite) |
| State | Zustand + AsyncStorage |
| Navigation | React Navigation 7 (Bottom Tabs + Native Stack) |
| Styling | NativeWind (Tailwind CSS) |
| Charts | react-native-svg (custom) |
| Animations | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| Icons | Phosphor Icons |
| Fonts | Inter, Plus Jakarta Sans, DM Mono |
| i18n | i18next + react-i18next |
| Build | EAS Build (Expo Application Services) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go app on your phone (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/abhinay-hat/FinTrack.git
cd FinTrack

# Install dependencies
npm install --legacy-peer-deps

# Start the development server
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS) to run on your device.

### Build APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK (cloud)
eas build --profile preview --platform android
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── BalanceCard.tsx
│   ├── CategoryDonutChart.tsx
│   ├── IncomeExpenseChart.tsx
│   ├── SpendingMiniChart.tsx
│   ├── BudgetProgressRing.tsx
│   ├── SwipeToDelete.tsx
│   └── ...
├── db/                  # Database schema, migrations, setup
├── hooks/               # Custom React hooks
├── i18n/                # Internationalization (en, hi)
├── models/              # WatermelonDB models
│   ├── Account.ts
│   ├── Transaction.ts
│   ├── Category.ts
│   ├── Budget.ts
│   ├── Statement.ts
│   └── AIInsight.ts
├── navigation/          # React Navigation setup
├── screens/             # App screens
│   ├── HomeScreen.tsx
│   ├── TransactionsScreen.tsx
│   ├── AddTransactionScreen.tsx
│   ├── AnalyticsScreen.tsx
│   ├── BudgetScreen.tsx
│   ├── AccountsScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── BackupSettingsScreen.tsx
│   ├── ImportScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── LockScreen.tsx
│   └── ...
├── services/
│   ├── ai/              # AI categorization & insights
│   ├── backup/          # Encrypted backup & restore
│   ├── categorization/  # Rule-based merchant categorization
│   ├── export/          # CSV & PDF export
│   ├── import/          # Bank statement import pipeline
│   ├── ocr/             # PDF text extraction & parsing
│   └── upi/             # UPI transaction parser
├── stores/              # Zustand state stores
├── theme/               # Colors, typography, design tokens
└── utils/               # Currency formatting, date helpers
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `accounts` | Bank accounts, wallets, cash |
| `transactions` | All income/expense/transfer records |
| `categories` | Spending categories with keywords |
| `budgets` | Monthly budget limits per category |
| `statements` | Imported bank statement metadata |
| `ai_insights` | Generated spending insights |

## Supported Banks

Pre-built import templates for:
SBI, HDFC, ICICI, Axis, Kotak Mahindra, PNB, Bank of Baroda, Canara Bank, Union Bank, IndusInd, Yes Bank, IDFC First, Federal Bank, Bank of India, Indian Bank

## License

This project is private and not licensed for public distribution.

---

Built with React Native + Expo
