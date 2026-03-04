# FinTrack - Project Guidelines

AI-powered, fully offline personal finance tracker for iOS & Android, built for the Indian market.

## Tech Stack

- **Framework**: React Native 0.83+ / Expo SDK 55 (managed workflow, New Architecture)
- **Language**: TypeScript (strict mode)
- **Styling**: NativeWind v4 (Tailwind CSS, zero runtime)
- **UI Components**: Gluestack-UI v3 (copy-paste, accessible)
- **Icons**: Phosphor Icons (`phosphor-react-native`) — primary. 6 weights: Thin, Light, Regular, Bold, Fill, Duotone.
- **Navigation**: React Navigation v7 (bottom tabs + stack)
- **State**: Zustand (global app state)
- **Database**: WatermelonDB (offline-first, SQLite-backed)
- **Charts**: Victory Native + react-native-svg
- **Animations**: Reanimated 3 + Moti (declarative)
- **Bottom Sheets**: @gorhom/bottom-sheet
- **Fonts**: Inter (body), Plus Jakarta Sans (headings), DM Mono (amounts)
- **i18n**: react-i18next (English + Hindi)

## Design Philosophy

1. **Clarity First** — Financial data must be instantly readable at a glance
2. **Trust Through Design** — Blue-teal palette conveys stability and confidence
3. **Performance-Conscious** — Every choice considers budget devices (₹8K-₹20K)
4. **Offline-Native** — Never show loading spinners for local data. No cloud dependency
5. **Indian Context** — Rupee-first formatting (₹1,23,456.78), Hindi ready, UPI-aware

## Color System

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| Navy Primary | `#0A2463` | Headers, nav bar, primary buttons, main CTAs |
| Blue Accent | `#1E88E5` | Links, active states, toggles, progress indicators |
| Teal Success | `#00897B` | Income amounts, positive changes, success toasts |
| Amber Warning | `#F57C00` | Budget limits approaching, pending, caution |
| Red Danger | `#D32F2F` | Expenses, over-budget, error states, delete |
| Purple Accent | `#7B1FA2` | Shopping category, AI insights badge |
| Text Primary | `#1A1A2E` | Body text, headings, transaction amounts |
| Text Secondary | `#6B7280` | Labels, timestamps, placeholders |
| Background | `#F0F4F8` | Screen background |
| Surface White | `#FFFFFF` | Cards, inputs, bottom sheets, modals |
| Divider | `#E2E8F0` | List separators, card borders |

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#121212` | Main bg (Material dark surface) |
| Surface L1 | `#1E293B` | Cards, bottom sheets (slate-800) |
| Surface L2 | `#334155` | Elevated cards, hover (slate-700) |
| Surface L3 | `#475569` | Tertiary surfaces (slate-600) |
| Text Primary | `#F1F5F9` | Main text (slate-100) |
| Text Secondary | `#94A3B8` | Labels, hints (slate-400) |
| Blue Accent | `#42A5F5` | Lighter blue for contrast |
| Teal Success | `#4DB6AC` | Lighter teal for readability |
| Red Danger | `#EF5350` | Lighter red for visibility |

### Category Colors
| Category | Hex | Icon (Phosphor Duotone) |
|----------|-----|------------------------|
| Food & Dining | `#F57C00` | ForkKnife |
| Transport | `#1E88E5` | Car |
| Shopping | `#8E24AA` | ShoppingCart |
| Bills & Utilities | `#D32F2F` | Lightning |
| Entertainment | `#E91E63` | FilmStrip |
| Health | `#00897B` | Heartbeat |
| Education | `#1565C0` | GraduationCap |
| Salary/Income | `#2E7D32` | CurrencyInr (Fill) |
| Investments | `#00695C` | TrendUp |
| Rent/EMI | `#5D4037` | House |
| Groceries | `#689F38` | Basket |
| Others | `#78909C` | DotsThree |

### Gradients
- **Balance Card**: Linear 135° `#0A2463` → `#1E88E5`
- **Income Highlight**: Linear 90° `#00897B` → `#4DB6AC`
- **Budget Progress**: Linear 90° `#2E7D32` → `#F57C00` → `#D32F2F`

## Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Display XL | 36dp | 700 | Plus Jakarta Sans |
| Display L | 28dp | 700 | Plus Jakarta Sans |
| Heading | 22dp | 600 | Plus Jakarta Sans |
| Subheading | 17dp | 600 | Inter |
| Body | 15dp | 400 | Inter |
| Body Small | 13dp | 400 | Inter |
| Caption | 12dp | 500 | Inter |
| Amount | 17dp | 500 | DM Mono |
| Badge | 10dp | 600 | Inter |

## Spacing & Radius Tokens

| Token | Value | Tailwind |
|-------|-------|----------|
| space-xs | 4dp | `gap-1` |
| space-sm | 8dp | `gap-2`, `p-2` |
| space-md | 16dp | `gap-4`, `p-4` |
| space-lg | 24dp | `gap-6`, `p-6` |
| space-xl | 32dp | `gap-8`, `p-8` |
| radius-sm | 8dp | `rounded-lg` |
| radius-md | 12dp | `rounded-xl` |
| radius-lg | 16dp | `rounded-2xl` |
| radius-xl | 24dp | `rounded-3xl` |
| radius-full | 9999dp | `rounded-full` |

## Navigation Tabs (Phosphor Icons)

| Tab | Inactive | Active | Color |
|-----|----------|--------|-------|
| Home | House (Regular) | House (Fill) | Gray → `#0A2463` |
| Transactions | ArrowsLeftRight (Regular) | ArrowsLeftRight (Fill) | Gray → `#0A2463` |
| Import | ChartPie (Regular) | ChartPie (Fill) | Gray → `#0A2463` |
| Budget | Target (Regular) | Target (Fill) | Gray → `#0A2463` |
| Settings | GearSix (Regular) | GearSix (Fill) | Gray → `#0A2463` |

## Key UI Patterns

- **Cards**: `rounded-2xl` (16dp), white bg, subtle shadow
- **Bottom Sheets**: @gorhom/bottom-sheet with snap points at 25%, 50%, 90%
- **Transaction Entry**: Bottom sheet from FAB. Amount (DM Mono) → Type toggle → Category grid (3×4 duotone icons) → Date → Notes
- **Touch Targets**: Minimum 44×44dp for all interactive elements
- **Currency Format**: Indian numbering `₹1,23,456.78` via `Intl.NumberFormat("en-IN")`
- **Empty States**: unDraw SVG illustrations with CTA buttons
- **Swipe Actions**: Swipe-left to delete (80dp threshold, haptic feedback)

## Micro-Interactions

- **Transaction Tap**: Scale 1.0 → 0.97 on press, spring back (damping: 15, stiffness: 150)
- **Balance Counter**: Animate 0 → amount on load (withTiming, 1200ms)
- **Donut Chart**: Arc draws 0° → full over 800ms, staggered 50ms per segment
- **Tab Switch**: Icon morphs Regular → Fill with spring (200ms)
- **Budget devices (₹8-12K)**: "Reduce Animations" toggle — keep haptics, disable decorative animations

## Device Tiers

| Tier | RAM | AI Mode | Animations |
|------|-----|---------|------------|
| Budget (₹8-12K) | 3-4 GB | Rule-based only | Minimal |
| Mid (₹12-18K) | 4-6 GB | Gemma 1B Q4 | Standard |
| Premium (₹18-25K) | 6-8 GB | Qwen3-1.5B Q4 | Full |

## Accessibility

- WCAG 2.1 AA: 4.5:1 contrast for text, 3:1 for large text
- Screen reader labels for all amounts: "Balance: Rupees twelve thousand five hundred"
- `maxFontSizeMultiplier={1.5}` to prevent layout breaks
- Respect `prefers-reduced-motion`

## Project Structure

```
src/
  screens/        # Screen components
  components/     # Reusable UI components
  navigation/     # Navigation configuration
  hooks/          # Custom React hooks
  utils/          # Utility functions
  models/         # Data models (WatermelonDB)
  services/       # Business logic services
  theme/          # Color tokens, typography, design tokens
  assets/         # Images, fonts, SVG illustrations
  i18n/           # Internationalization (en, hi)
```

## Code Conventions

- Use NativeWind `className` for styling (not StyleSheet)
- Use `dark:` prefix for dark mode variants
- Use Phosphor icons with Duotone weight for categories, Regular/Fill for navigation
- Format currency with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`
- All financial amounts use DM Mono font
- Path aliases: `@/*` maps to `src/*`
