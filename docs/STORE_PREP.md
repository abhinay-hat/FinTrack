# FinTrack - Store Submission Checklist

## App Information
- **App Name**: FinTrack - Smart Finance Tracker
- **Bundle ID (iOS)**: com.fintrack.app
- **Package Name (Android)**: com.fintrack.app
- **Category**: Finance
- **Content Rating**: Everyone

## Required Assets

### App Icons
- [ ] iOS: 1024x1024 (App Store)
- [ ] Android: 512x512 (Play Store), Adaptive icon (foreground + background layers)
- [ ] App icon with navy (#0A2463) background, white FinTrack logo

### Screenshots (per device type)
- [ ] iPhone 6.5" (1284x2778) - 5 screenshots minimum
- [ ] iPhone 5.5" (1242x2208) - 5 screenshots
- [ ] Android Phone (1080x1920) - 5 screenshots minimum
- [ ] Screenshots: Onboarding, Dashboard, Transaction Entry, Analytics, Budget

### Feature Graphic (Android)
- [ ] 1024x500 feature graphic for Play Store listing

## App Store Descriptions

### Short Description (80 chars)
Track expenses offline with AI. Import bank statements. Budget smartly.

### Full Description
FinTrack is a 100% offline, privacy-first personal finance tracker built for India.

**Your money, your device, your rules.**

Take full control of your finances without ever sending a single byte of data to the cloud. FinTrack runs entirely on your device -- no accounts, no servers, no tracking.

**Smart Categorization (On-Device AI)**
FinTrack uses on-device AI to automatically categorize your transactions. From UPI payments to credit card bills, every entry is tagged intelligently -- without any data leaving your phone.

**Import Bank Statements Instantly**
Drag and drop CSV, Excel, or PDF statements from 15+ Indian banks including SBI, HDFC, ICICI, Axis, Kotak, and more. FinTrack detects columns, parses amounts, and imports everything in seconds.

**Budget Tracking with Smart Alerts**
Set monthly budgets per category and track spending with visual progress rings. Get notified when you are approaching your limits -- before you overspend.

**Built for India**
- Full UPI transaction parsing
- Indian number formatting (1,00,000)
- INR currency with proper symbol placement
- Hindi language support
- Support for all major Indian banks

**Key Features**
- Track income, expenses, and transfers
- Interactive spending charts and analytics
- Recurring transaction support
- Encrypted local backups (.fintrack format)
- Biometric and PIN app lock
- Weekly spending summary notifications
- Dark mode support

**No Ads. No Subscriptions. No Data Collection.**
FinTrack is completely free with no hidden costs. Your financial data stays on your device, always.

## Privacy Policy
- [ ] Create privacy policy page (required by both stores)
- [ ] Key points: No data collection, no analytics, no cloud, fully offline
- [ ] Host at: [URL TBD]

## Technical Requirements

### iOS (App Store)
- [ ] Xcode 15+ build
- [ ] iOS 16.0 minimum deployment target
- [ ] App Transport Security compliance
- [ ] No private API usage
- [ ] Accessibility: VoiceOver labels on all interactive elements

### Android (Play Store)
- [ ] Target API 34 (Android 14)
- [ ] Android App Bundle (AAB) format
- [ ] 64-bit support
- [ ] Play Store data safety form: No data collected or shared
- [ ] ProGuard/R8 enabled for release build

## Pre-submission Testing
- [ ] Test on budget device (3-4GB RAM)
- [ ] Test on mid-range device (6GB RAM)
- [ ] Test on iOS 16+ device
- [ ] Verify all screens render correctly
- [ ] Test offline functionality (airplane mode)
- [ ] Test import flow with real bank statements
- [ ] Test biometric/PIN lock
- [ ] Verify Hindi translations

## EAS Build Configuration
- [ ] eas.json configured for production builds
- [ ] Environment variables set
- [ ] Signing keys generated (iOS + Android)
