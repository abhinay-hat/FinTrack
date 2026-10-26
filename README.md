# FinTrack

**Offline personal finance tracker for India, with an experimental on-device LLM path**

> **Status: paused, work in progress.** Active development stopped in March 2026. Many screens work, but several features are stubs or only half wired. The list below says exactly which. Bug reports and "this is broken" notes are welcome: see [Feedback](#feedback--report-a-bug).

FinTrack is a React Native + Expo app for tracking expenses, budgets and imported bank statements without an account or a server. Your data stays on the phone.

The AI idea: categorize transactions with rules first, and only on phones with enough RAM, fall back to a small LLM running on the device. The app reads total RAM (`src/utils/deviceTier.ts`) and picks a tier:

| Tier | Total RAM | Categorization |
|------|-----------|----------------|
| 1 | 4 GB or less | Rule-based only |
| 2 | 4 to 6 GB | Rules + SmolLM2 360M (planned) |
| 3 | More than 6 GB | Rules + SmolLM2 1.7B (planned) |

A runtime monitor drops to a lower tier if average inference time goes over 5 seconds. **The LLM part does not produce results yet.** See below.

## What works / what's stubbed

**Works (manual testing only, no automated tests)**

- Accounts (bank, cash, wallet, credit card) and adding income / expense transactions
- Monthly budgets per category with progress rings
- Home dashboard and Analytics screen (income vs expense, category donut, spending trend)
- CSV / Excel statement import with column auto-detection and 15 bank templates
- Rule-based categorization: 500+ Indian merchant keywords, plus UPI VPA parsing
- RAM-based device tier detection and per-tier animation settings
- PIN lock (hashed) and biometric unlock via `expo-local-authentication`
- Backup to a `.fintrack` file you can share anywhere, and restore from it
- Onboarding flow

**Partial**

- **On-device LLM.** `src/services/ai/llmService.ts` defines the interface and a stub that reports "not available"; categorization stays rule-based. A MediaPipe / `expo-llm-mediapipe` backend and model download path exist in unfinished local work, but **are not in this branch yet** (experimental, paused). Do not expect on-device inference from `origin/main`.
- **PDF statement import.** Text is pulled from digital PDFs with a simple regex over the raw file. Compressed PDFs (most bank statements) will usually come back empty. Scanned PDFs need OCR, which is a stub (`src/services/ocr/ocrEngine.ts`).
- **Hindi.** Translation files exist, but only the PIN, lock and settings screens use them. The rest of the UI is English.
- **Backup password protection.** The backup file is password-protected with a SHA-256-derived key and XOR (`obfuscate` / `deobfuscate` in `encryptionUtils.ts`). That is obfuscation, not real encryption. Do not rely on it for confidentiality.
- **Android SMS reading** (experimental, not in this branch yet): unfinished local work for parsing bank SMS locally. Not present under `src/services/sms/` on `origin/main`.

**Stubbed or not wired to the UI yet**

- AI insights: `insightsGenerator.ts` exists, but the Analytics screen shows a "coming soon" placeholder
- Database encryption (SQLCipher): stub, always returns "not available"
- OCR for scanned statements: stub
- CSV / PDF export: service code exists, no button calls it
- Weekly summary notifications: service code exists, never scheduled
- Recurring transactions: field exists in the model, no UI to set it
- Transfers between accounts: type exists, the toggle only offers income and expense
- Swipe-to-delete: component exists, not used on any screen
- Cloud backup: none. FinTrack has no server. You move the backup file yourself (Drive, email, USB).

**Persistence:** WatermelonDB uses the SQLite adapter with JSI (`src/db/setup.ts`), backed by the `expo-sqlite` dependency. A development / native build is required for SQLite JSI; Expo Go may not load it.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.83 + Expo SDK 55 (New Architecture) |
| Language | TypeScript |
| Database | WatermelonDB with the SQLite adapter (JSI) |
| State | Zustand + AsyncStorage |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Styling | NativeWind (Tailwind CSS) |
| Charts | react-native-svg (custom) |
| Animations | React Native Reanimated 4 |
| On-device LLM | Interface + stub only on this branch (experimental MediaPipe work not merged) |
| Icons | Phosphor Icons |
| Fonts | Inter, Plus Jakarta Sans, DM Mono |
| i18n | i18next + react-i18next |
| Build | EAS Build |

## Getting started

### Prerequisites

- Node.js 20.19.4 or newer (required by React Native 0.83)
- npm
- For a development build: Android Studio + JDK 17 (Android), or Xcode on macOS (iOS)

You do not need a global Expo CLI; `npx expo` is enough.

### Install

```bash
git clone https://github.com/abhinay-hat/FinTrack.git
cd FinTrack
npm install   # .npmrc already sets legacy-peer-deps
```

### Run

**Development build (recommended).** SQLite JSI and any future native modules (LLM, SMS) are not available in Expo Go, so use a dev build:

```bash
npm run android   # expo run:android, builds and installs on a device or emulator
npm run ios       # expo run:ios, macOS + Xcode only
```

**Expo Go (limited).** `npx expo start` and scanning the QR code may load some screens, but SQLite JSI and other native-only features will not work. Expo Go only runs projects on the SDK version it ships with, so you need an Expo Go build that supports SDK 55.

### Other scripts

```bash
npm run lint        # ESLint
npm run format      # Prettier on src/
npx tsc --noEmit    # type check
```

### Build an APK with EAS

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

The `preview` profile in `eas.json` uses `credentialsSource: "local"`, which expects a `credentials.json` and keystore that are not in this repo. Remove that line to let EAS manage signing for your own account.

## Project structure

```
src/
├── components/          # Reusable UI components
├── db/                  # WatermelonDB schema, migrations, setup
├── hooks/               # Custom React hooks
├── i18n/                # en, hi
├── models/              # WatermelonDB models
├── navigation/          # React Navigation setup
├── screens/             # App screens
├── services/
│   ├── ai/              # Rule categorization, LLM stub, insights (not shown in UI)
│   ├── backup/          # .fintrack backup/restore (password obfuscation, not encryption)
│   ├── categorization/  # Rule-based merchant map
│   ├── encryption/      # SQLCipher stub
│   ├── export/          # CSV and PDF export (not wired to UI)
│   ├── import/          # CSV / Excel import pipeline and bank templates
│   ├── normalizer/      # Transaction normalization
│   ├── ocr/             # PDF text extraction, OCR stub
│   └── upi/             # UPI description parser
├── stores/              # Zustand stores
├── theme/               # Colors, typography
└── utils/               # Currency, dates, device tier
```

`sms/` and `dedup/` exist in unfinished local work only; they are not in this branch yet.

## Database schema

| Table | Purpose |
|-------|---------|
| `accounts` | Bank accounts, wallets, cash |
| `transactions` | Income / expense records |
| `categories` | Spending categories with keywords |
| `budgets` | Monthly budget limits per category |
| `statements` | Imported bank statement metadata |
| `ai_insights` | Generated insights (not shown in UI yet) |

## Bank import templates

SBI, HDFC, ICICI, Axis, Kotak Mahindra, PNB, Bank of Baroda, Canara Bank, Union Bank, IndusInd, Federal Bank, Yes Bank, IDFC First, RBL Bank, AU Small Finance Bank.

These are column mappings for CSV / Excel exports. They have not been tested against current statement formats from every bank, so reports of a bank that fails to import are useful.

## Feedback / report a bug

Found a bug, a crash, a wrong category, or a missing feature? Please [open an issue](https://github.com/abhinay-hat/FinTrack/issues/new/choose). There are short templates for bugs and feature requests. Include your phone model, RAM and Android / iOS version if it is a bug.

Since the project is paused, fixes may be slow, but every issue gets read.

## License

No license has been chosen yet, so all rights are reserved by default. If you want to reuse part of the code, open an issue and ask.
