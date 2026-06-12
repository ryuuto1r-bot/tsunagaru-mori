# App Store Release Notes

## Current iOS App Setup

- App name: つながる森
- Bundle ID: `com.ryuuto1r.tsunagarumori`
- Native wrapper: Capacitor iOS
- Xcode project: `ios/App/App.xcodeproj`
- Web assets directory: `dist`
- iOS app assets:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  - `ios/App/App/Assets.xcassets/Splash.imageset/`

## Local Commands

```bash
npm install
npm run ios:prepare
npm run ios:open
```

`npm run ios:prepare` runs:

1. Generate iOS app icon and splash assets.
2. Build the Vite app with relative asset paths for Capacitor.
3. Sync the web build into the iOS project.

## What Still Requires Apple/Xcode

This repository is ready to open as an iOS app project, but App Store submission still requires:

- Full Xcode installed from the Mac App Store.
- Apple Developer Program membership.
- An App Store Connect app record using the same Bundle ID.
- Signing team selected in Xcode.
- Archive upload from Xcode.
- TestFlight or App Review submission in App Store Connect.

## Apple Official Flow

Apple's official flow is:

1. Join the Apple Developer Program.
   - Official page: https://developer.apple.com/programs/
2. Create or manage the app in App Store Connect.
   - Official page: https://developer.apple.com/app-store-connect/
3. Upload a build from Xcode.
4. Test with TestFlight.
   - Official page: https://developer.apple.com/testflight/
5. Submit the version for App Review.
   - Official page: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/

Apple currently lists the Apple Developer Program at 99 USD per membership year.

## Recommended App Store Metadata Draft

- Name: つながる森
- Subtitle: todoが実になる育成型タスク管理
- Category: Productivity
- Description draft:

```text
つながる森は、タスクを完了するたびに木が育つ育成型タスク管理アプリです。
親todoを幹、小todoを実として整理でき、毎日の完了が森として残ります。
今日やること、履歴、森ビュー、ダークモードに対応し、習慣化を静かに支えます。
```

- Keywords draft:

```text
タスク, todo, 習慣, 生産性, 目標, 育成, 森, 集中
```

## Before Submission Checklist

- Replace placeholder screenshots with App Store screenshots.
- Confirm privacy details in App Store Connect.
  - This app currently stores task data locally with `localStorage`.
  - No external analytics, login, or server sync is implemented.
- Confirm the app works on a real iPhone.
- Confirm iPad behavior or restrict supported devices/orientations if needed.
- Confirm the app icon looks good at small sizes.
- Increment version/build number before every upload.
