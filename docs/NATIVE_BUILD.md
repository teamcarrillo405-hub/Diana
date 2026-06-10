# Diana Native Builds (Capacitor)

The iOS/Android apps are Capacitor shells around the hosted production app
(`server.url` mode — Diana is server-rendered, so the shell loads the
deployed site and layers native capabilities on top). Haptics are wired
(lib/native/haptics.ts, the Respond verb); APNs push, share-sheet, and the
home-screen widget come in later native passes.

## Build today (no developer accounts needed)

GitHub → Actions → **Native builds** → Run workflow. Artifacts:
- `diana-android-debug` — an installable debug APK (sideload onto any
  Android device with "install unknown apps" enabled).
- `diana-ios-simulator` — an unsigned simulator build (drag onto an Xcode
  simulator on any Mac).

Local Android builds also work on Windows with Android Studio:
`npx cap sync android && npx cap open android`. iOS always requires macOS —
that's why the workflow uses a `macos-14` runner.

## Before anything ships to a store

1. **App ID** — `com.teamcarrillo.diana` is a placeholder. It becomes
   permanent at first publish; change it in `capacitor.config.ts` (and
   regenerate platforms) if you want something else.
2. **Production URL** — `server.url` points at the Vercel production app.
   Deployment Protection must be OFF or the shell opens onto a login wall.
   If you add a custom domain later, update `server.url`.
3. **Accounts** — Apple Developer ($99/yr) and Google Play ($25 one-time).
4. **Release signing** — add these repo secrets, then extend the workflow's
   release jobs: Android `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`; iOS
   `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`,
   `IOS_PROVISIONING_PROFILE_BASE64`, plus an App Store Connect API key for
   upload. Ask Diana's agent to wire the release lanes once the secrets exist.
5. **App Review readiness** — the shell ships native haptics and (next pass)
   push; pure web wrappers get rejected under guideline 4.2, so keep adding
   native value before submission. The offline fallback page lives in
   `native-shell/`.

## Day-to-day

- `npx cap sync` after changing `capacitor.config.ts` or native plugins.
- The `android/` and `ios/` directories are committed (standard Capacitor
  practice); their build outputs are gitignored by their own .gitignore files.
