Run full verification suite on the FinTrack codebase.

Execute these checks in order:
1. TypeScript type check: `npx tsc --noEmit`
2. ESLint: `npx eslint . --ext .ts,.tsx`
3. iOS bundle test: `npx expo export --platform ios` then clean `dist/`
4. Android bundle test: `npx expo export --platform android` then clean `dist/`

Report the status of each check. If any fail, provide details on what went wrong.
