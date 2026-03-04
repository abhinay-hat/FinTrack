Start the FinTrack app on the Android emulator.

Run `npx expo start --android` in the project root. If the Metro bundler is already running, kill it first with `lsof -ti:8081 | xargs kill -9` before restarting. Use `--clear` flag if there are caching issues.
