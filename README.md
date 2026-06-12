# つながる森

タスクを完了するたびに木が育つ、育成型のタスク管理アプリです。

## Features

- タスク追加、完了、削除
- 種同士を点線でつなぐ森キャンバス
- 左サイドバーで種の検索とグループ確認
- 難易度ごとの成長量
- 種、芽、苗木、若木、大樹、花が咲いた木の成長段階
- 今日の完了数、連続日数、成長率
- 日別の木が並ぶ今月の森
- 直近10日の成長リズム
- 未完了タスク、完了済みタスク、履歴、設定
- Zustand + localStorage による保存
- スマホ対応

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui style components
- Lucide React
- Motion
- Zustand
- Capacitor iOS

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Free iPhone Install as PWA

App Storeを使わず、iPhoneのホーム画面にアプリのように追加できます。

```bash
npm run pwa:prepare
```

公開URLをiPhoneのSafariで開きます。

```text
https://ryuuto1r-bot.github.io/tsunagaru-mori/
```

Safariの共有ボタンから「ホーム画面に追加」を選ぶと、`つながる森` のアイコン付きで起動できます。

PWA対応内容:

- Web App Manifest
- iPhone用 apple-touch-icon
- theme color / standalone mode
- Service Worker による基本オフラインキャッシュ

## iOS App

ReactアプリをCapacitorでiOSアプリ化しています。

```bash
npm run ios:prepare
npm run ios:open
```

`ios:prepare` はiOS用アイコン/スプラッシュ生成、Viteビルド、Capacitor同期まで実行します。
`ios:open` はXcodeがインストール済みのMacで `ios/App/App.xcodeproj` を開きます。

App Store提出の流れは [APP_STORE_RELEASE.md](./APP_STORE_RELEASE.md) を見てください。
