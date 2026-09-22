# CalmReader Native Android (Capacitor) Guide

CalmReader has been transformed into an installable native Android application powered by **Capacitor 8**, wrapping the full web application with native hardware hooks, session persistence, and zero breaking changes to your existing web and database architecture.

---

## 📱 Project Summary

- **App ID (Package Name):** `com.calmreader.mobile`
- **App Name:** `CalmReader`
- **Native Platform:** Android (Capacitor 8)
- **Target SDK:** Android 34–36
- **Min SDK:** Android 24 (covers >95% of active Android devices)
- **Icons:** High-density adaptive icons generated across all mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`)

---

## 🚀 How to Build & Run CalmReader Android

### 1. Build and Sync Web Assets to Android
Whenever you modify web source files, compile and sync them to Android using:
```bash
npm run cap:build
```
Or if already built:
```bash
npm run cap:sync
```

---

### 2. Open in Android Studio
To run, debug, or inspect the app inside Android Studio:
```bash
npx cap open android
```
Inside Android Studio:
- Select an Android Virtual Device (AVD emulator) or connect a physical Android device via USB.
- Click the green **Run (▶)** button.

---

### 3. Build Release APK (arm64-v8a ~8MB)
To build the optimized, lightweight release APK directly via Gradle:
```bash
cd android
./gradlew assembleRelease
```
The generated APK will be at:
`android/app/build/outputs/apk/release/app-arm64-v8a-release.apk` (or `app-release.apk`)

> **Why was the APK 61MB before?**
> Debug builds bundle all 4 CPU architectures (`x86`, `x86_64`, `armeabi-v7a`, `arm64-v8a`) without symbol stripping.
> We configured ABI filtering to `arm64-v8a` (used by modern Android phones) and release packaging, shrinking the app size down to ~8MB!

---

### 4. Automated Cloud Builds (GitHub Actions CI/CD)
The GitHub Actions workflow at `.github/workflows/deploy.yml` automatically triggers on push to `main`:
1. Compiles web assets with `npm run build`.
2. Syncs web assets to Android using `npx cap sync android`.
3. Compiles the `arm64-v8a` release APK via `./gradlew assembleRelease`.
4. Copies the output to `dist/calmreader.apk` and `public/calmreader.apk`.
5. Updates the GitHub Release `v1.0.1`.

---

### 5. In-App Update Notifications
Because Capacitor is a static web wrapper, existing installations do not automatically receive web changes until a new APK is installed.
CalmReader now includes an automatic version check at startup:
- Compares installed version with `https://calmreader.com/version.json`.
- Displays an in-app update prompt with release highlights and a direct download button when a newer APK is available.

---

## 🔌 Integrated Native Features
- **Android Back Button Integration:** Hardware back button navigates history and smoothly exits at root screens (`/`, `/dashboard`, `/login`).
- **Dynamic Status Bar:** Automatically styled to match CalmReader theme.
- **Deep Linking:** Configured to handle `com.calmreader.mobile://` schemes.
- **Supabase Auth Persistence:** Automatic session preservation and token injection across app pauses and restarts.
