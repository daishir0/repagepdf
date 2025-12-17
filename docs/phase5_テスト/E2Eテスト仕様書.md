# E2Eテスト仕様書

## 概要
本ドキュメントは、インターネット経由でのE2E（End-to-End）テストの仕様を定義します。
Playwrightを使用し、実際のユーザー操作をシミュレートしてシステム全体の動作を検証します。

## ステータス
- **フェーズ**: テスト
- **作成日**: 2025-12-16
- **更新日**: 2025-12-16
- **作成者**: Claude (AIPM)
- **レビュー状況**: 完了

---

## テスト環境

### アクセス情報

| 項目 | 値 |
|------|-----|
| FQDN | repagepdf.path-finder.jp |
| プロトコル | HTTPS |
| フロントエンドURL | https://repagepdf.path-finder.jp/ |
| バックエンドAPI | https://repagepdf.path-finder.jp/api |
| フロントエンドポート（内部） | 3013 |
| バックエンドポート（内部） | 8018 |

### インフラ構成

```
Internet
    │
    ▼ HTTPS (443)
┌─────────────────┐
│ Apache          │  Port 80/443
│ (Reverse Proxy) │
│ + SSL (Let's    │
│   Encrypt)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Frontend│ │Backend│
│ :3013  │ │ :8018 │
│(Next.js)│(FastAPI)│
└───────┘ └───────┘
```

### 設定ファイル

| ファイル | パス |
|---------|------|
| Apache設定 | `/etc/httpd/conf.d/repagepdf.conf` |
| Frontendサービス | `/etc/systemd/system/repage-pdf-frontend.service` |
| Backendサービス | `/etc/systemd/system/repage-pdf-backend.service` |

---

## テストツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Playwright | ^1.41.0 | E2Eテスト実行 |
| Node.js | 18+ | 実行環境 |
| TypeScript | ^5.0.0 | テストコード記述 |

---

## テスト実行方法

### 1. セットアップ
```bash
cd tests/e2e
npm install
npx playwright install chromium
```

### 2. テスト実行
```bash
# 全テスト実行
E2E_BASE_URL=https://repagepdf.path-finder.jp npx playwright test

# 特定のテストファイル実行
E2E_BASE_URL=https://repagepdf.path-finder.jp npx playwright test auth.spec.ts

# ヘッドレスモード無効（ブラウザ表示）
E2E_BASE_URL=https://repagepdf.path-finder.jp npx playwright test --headed

# デバッグモード
E2E_BASE_URL=https://repagepdf.path-finder.jp npx playwright test --debug
```

### 3. レポート確認
```bash
npx playwright show-report
```

---

## テストファイル構成

```
tests/e2e/
├── playwright.config.ts    # Playwright設定
├── package.json            # 依存関係
├── tsconfig.json           # TypeScript設定
└── tests/
    ├── auth.spec.ts        # 認証テスト (FR-001, FR-002)
    ├── template.spec.ts    # テンプレートテスト (FR-003〜FR-006)
    ├── conversion.spec.ts  # 変換テスト (FR-007〜FR-017)
    └── settings.spec.ts    # 設定テスト (FR-018, FR-019)
```

---

## テストケース対応表

| テストファイル | 対応要件ID | テストケースID | 件数 |
|---------------|-----------|---------------|------|
| auth.spec.ts | FR-001, FR-002 | TC-001-01〜06, TC-002-01〜04 | 10件 |
| template.spec.ts | FR-003〜FR-006 | TC-003-01〜07, TC-004-01〜03, TC-005-01〜03, TC-006-01〜03 | 16件 |
| conversion.spec.ts | FR-007〜FR-017 | TC-007〜TC-017 | 34件 |
| settings.spec.ts | FR-018, FR-019 | TC-018-01〜03, TC-019-01〜04 | 7件 |

---

## テストデータ

### 認証情報

| 用途 | メールアドレス | パスワード | 備考 |
|------|--------------|-----------| -----|
| テスト用管理者 | admin@example.com | admin123 | 初回起動時に自動作成 |

### テスト用ファイル

| ファイル名 | サイズ | ページ数 | 用途 |
|-----------|-------|---------|------|
| test_simple.pdf | 100KB | 3ページ | 正常系テスト（テキストのみ） |
| test_images.pdf | 2MB | 5ページ | 画像抽出テスト |
| test_tables.pdf | 500KB | 4ページ | 表変換テスト |
| test_large.pdf | 45MB | 50ページ | 境界値テスト（大容量） |
| test_over_limit.pdf | 51MB | 60ページ | 境界値テスト（上限超過） |

---

## テスト環境構築手順

### 1. Apache設定

```bash
# 設定ファイル配置
sudo cp infrastructure/apache/repagepdf.conf /etc/httpd/conf.d/

# 設定確認
sudo apachectl configtest

# Apache再起動
sudo systemctl restart httpd
```

### 2. systemdサービス設定

```bash
# サービスファイル配置
sudo cp infrastructure/systemd/repage-pdf-backend.service /etc/systemd/system/
sudo cp infrastructure/systemd/repage-pdf-frontend.service /etc/systemd/system/

# デーモンリロード
sudo systemctl daemon-reload

# サービス有効化・起動
sudo systemctl enable repage-pdf-backend repage-pdf-frontend
sudo systemctl start repage-pdf-backend repage-pdf-frontend
```

### 3. 動作確認

```bash
# サービス状態確認
sudo systemctl status repage-pdf-backend repage-pdf-frontend

# ログ確認
sudo journalctl -u repage-pdf-backend -f
sudo journalctl -u repage-pdf-frontend -f

# アクセス確認
curl -I https://repagepdf.path-finder.jp/
curl https://repagepdf.path-finder.jp/api/health
```

---

## 成功基準

| 基準 | 目標値 |
|------|--------|
| テストPASS率 | 100%（優先度高のテストケース） |
| テスト実行時間 | 5分以内 |
| 不安定テスト（Flaky Test） | 0件 |

---

## 変更履歴

| 日付 | 版 | 変更内容 | 変更者 |
|------|-----|----------|--------|
| 2025-12-16 | 1.0 | 初版作成 | Claude (AIPM) |

---

## AIレビュー結果
- レビュー日: 2025-12-16
- レビュアー: Claude (AIPM)
- 結果: **適切**
- コメント: FQDN（repagepdf.path-finder.jp）を使用したE2Eテスト仕様。Apache/systemd設定手順も明記。Playwrightテストファイル構成も適切。
