# API設計書

## 概要
RePage PDFシステムのREST API詳細設計です。
Phase2の外部インターフェース定義書を基に、各エンドポイントの詳細仕様を定義します。

## ステータス
- **フェーズ**: 詳細設計
- **作成日**: 2025-12-16
- **更新日**: 2025-12-16
- **作成者**: Claude (AIPM)
- **レビュー状況**: 未着手

---

## 内容

### API共通仕様

#### ベースURL
```
http://localhost:8018/api
```

#### 認証方式
- **方式**: Bearer Token (JWT)
- **ヘッダー**: `Authorization: Bearer {token}`
- **有効期限**: 24時間（1440分）

#### 共通レスポンス形式

**成功時:**
```json
{
  "success": true,
  "data": { ... },
  "message": "操作が完了しました"
}
```

**エラー時:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

#### 共通エラーコード

| HTTPステータス | エラーコード | 説明 |
|---------------|-------------|------|
| 400 | BAD_REQUEST | リクエスト不正 |
| 401 | UNAUTHORIZED | 認証エラー |
| 403 | FORBIDDEN | 権限エラー |
| 404 | NOT_FOUND | リソース不存在 |
| 422 | VALIDATION_ERROR | バリデーションエラー |
| 500 | INTERNAL_ERROR | サーバーエラー |

---

### API一覧

| API-ID | メソッド | エンドポイント | 概要 | 認証 |
|--------|----------|----------------|------|------|
| API-001 | POST | /auth/login | ログイン | 不要 |
| API-002 | POST | /auth/logout | ログアウト | 要 |
| API-003 | GET | /auth/me | 認証状態確認 | 要 |
| API-004 | GET | /templates | テンプレート一覧 | 要 |
| API-005 | POST | /templates | テンプレート作成 | 要 |
| API-006 | GET | /templates/{id} | テンプレート詳細 | 要 |
| API-007 | DELETE | /templates/{id} | テンプレート削除 | 要 |
| API-008 | POST | /templates/{id}/learn | URL学習実行 | 要 |
| API-009 | POST | /conversions/upload | PDFアップロード | 要 |
| API-010 | GET | /conversions/{id} | 変換結果取得 | 要 |
| API-011 | POST | /conversions/{id}/generate | HTML生成 | 要 |
| API-012 | PATCH | /conversions/{id} | HTML編集保存 | 要 |
| API-013 | POST | /conversions/{id}/approve | 承認 | 要 |
| API-014 | GET | /conversions/{id}/download | HTMLダウンロード | 要 |
| API-015 | GET | /conversions/{id}/images | 画像ZIP取得 | 要 |
| API-016 | GET | /settings/converters | コンバーター一覧 | 要 |
| API-017 | PUT | /settings/converters | コンバーター設定 | 要 |
| API-018 | PUT | /settings/api-keys | APIキー設定 | 要 |
| API-019 | GET | /settings/models | モデル一覧 | 要 |
| API-020 | PUT | /settings/models | モデル設定 | 要 |

---

### API詳細

#### API-001: ログイン

- **メソッド**: POST
- **エンドポイント**: `/auth/login`
- **認証**: 不要

**リクエスト**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| email | string | 必須 | メールアドレス |
| password | string | 必須 | パスワード |

**レスポンス（成功）**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "name": "管理者"
    }
  }
}
```

**エラーコード**

| コード | 説明 |
|--------|------|
| INVALID_CREDENTIALS | メールアドレスまたはパスワードが不正 |

---

#### API-003: 認証状態確認

- **メソッド**: GET
- **エンドポイント**: `/auth/me`
- **認証**: 要

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@example.com",
    "name": "管理者"
  }
}
```

---

#### API-004: テンプレート一覧

- **メソッド**: GET
- **エンドポイント**: `/templates`
- **認証**: 要

**クエリパラメータ**

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|-----|------|------------|------|
| status | string | - | - | ステータスフィルタ（pending/learning/ready/error） |
| page | int | - | 1 | ページ番号 |
| limit | int | - | 20 | 取得件数（最大100） |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "〇〇市公式サイト",
        "url1": "https://example.city.lg.jp/page1",
        "url2": "https://example.city.lg.jp/page2",
        "url3": null,
        "status": "ready",
        "created_at": "2025-12-16T10:00:00Z",
        "updated_at": "2025-12-16T10:05:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "has_next": false
  }
}
```

---

#### API-005: テンプレート作成

- **メソッド**: POST
- **エンドポイント**: `/templates`
- **認証**: 要

**リクエスト**
```json
{
  "name": "〇〇市公式サイト",
  "url1": "https://example.city.lg.jp/page1",
  "url2": "https://example.city.lg.jp/page2",
  "url3": "https://example.city.lg.jp/page3"
}
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | 必須 | テンプレート名（200文字以内） |
| url1 | string | 必須 | 学習用URL 1 |
| url2 | string | - | 学習用URL 2 |
| url3 | string | - | 学習用URL 3 |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "〇〇市公式サイト",
    "status": "pending",
    "created_at": "2025-12-16T10:00:00Z"
  },
  "message": "テンプレートを作成しました"
}
```

---

#### API-006: テンプレート詳細

- **メソッド**: GET
- **エンドポイント**: `/templates/{id}`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | テンプレートID |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "〇〇市公式サイト",
    "url1": "https://example.city.lg.jp/page1",
    "url2": "https://example.city.lg.jp/page2",
    "url3": null,
    "status": "ready",
    "learned_rules": { ... },
    "error_message": null,
    "created_at": "2025-12-16T10:00:00Z",
    "updated_at": "2025-12-16T10:05:00Z"
  }
}
```

---

#### API-007: テンプレート削除

- **メソッド**: DELETE
- **エンドポイント**: `/templates/{id}`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | テンプレートID |

**レスポンス**
```json
{
  "success": true,
  "message": "テンプレートを削除しました"
}
```

**エラーコード**

| コード | 説明 |
|--------|------|
| NOT_FOUND | テンプレートが存在しない |
| HAS_CONVERSIONS | 関連する変換データが存在（削除不可） |

---

#### API-008: URL学習実行

- **メソッド**: POST
- **エンドポイント**: `/templates/{id}/learn`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | テンプレートID |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "learning",
    "message": "学習処理を開始しました"
  }
}
```

**備考**: 学習処理は非同期で実行。完了はWebSocket/ポーリングで確認。

---

#### API-009: PDFアップロード

- **メソッド**: POST
- **エンドポイント**: `/conversions/upload`
- **認証**: 要
- **Content-Type**: multipart/form-data

**リクエスト**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| file | file | 必須 | PDFファイル（最大50MB） |
| template_id | int | 必須 | テンプレートID |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "original_filename": "report.pdf",
    "page_count": 10,
    "status": "uploaded",
    "created_at": "2025-12-16T10:00:00Z"
  },
  "message": "PDFをアップロードしました"
}
```

**エラーコード**

| コード | 説明 |
|--------|------|
| FILE_TOO_LARGE | ファイルサイズ超過（50MB） |
| INVALID_FILE_TYPE | PDF以外のファイル |
| TEMPLATE_NOT_READY | テンプレートが未学習 |

---

#### API-010: 変換結果取得

- **メソッド**: GET
- **エンドポイント**: `/conversions/{id}`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | 変換ID |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "original_filename": "report.pdf",
    "status": "converted",
    "page_count": 10,
    "converter_used": "pymupdf",
    "generated_html": "<article>...</article>",
    "template": {
      "id": 1,
      "name": "〇〇市公式サイト"
    },
    "images": [
      {
        "id": 1,
        "filename": "page1_0.png",
        "page_number": 1,
        "width": 800,
        "height": 600
      }
    ],
    "created_at": "2025-12-16T10:00:00Z",
    "updated_at": "2025-12-16T10:05:00Z"
  }
}
```

---

#### API-011: HTML生成

- **メソッド**: POST
- **エンドポイント**: `/conversions/{id}/generate`
- **認証**: 要

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "converting",
    "message": "HTML生成を開始しました"
  }
}
```

**備考**: 変換処理は非同期。完了後のステータスは`converted`。

---

#### API-012: HTML編集保存

- **メソッド**: PATCH
- **エンドポイント**: `/conversions/{id}`
- **認証**: 要

**リクエスト**
```json
{
  "generated_html": "<article>...</article>"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "updated_at": "2025-12-16T10:10:00Z"
  },
  "message": "HTMLを保存しました"
}
```

---

#### API-013: 承認

- **メソッド**: POST
- **エンドポイント**: `/conversions/{id}/approve`
- **認証**: 要

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "approved_at": "2025-12-16T10:15:00Z"
  },
  "message": "変換結果を承認しました"
}
```

---

#### API-014: HTMLダウンロード

- **メソッド**: GET
- **エンドポイント**: `/conversions/{id}/download`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | 変換ID |

**レスポンス**
- Content-Type: `text/html`
- Content-Disposition: `attachment; filename="output.html"`

HTMLファイルが直接ダウンロードされます。

---

#### API-015: 画像ZIP取得

- **メソッド**: GET
- **エンドポイント**: `/conversions/{id}/images`
- **認証**: 要

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | int | 変換ID |

**レスポンス**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="images.zip"`

変換時に抽出された画像がZIP形式でダウンロードされます。

---

#### API-016: コンバーター一覧

- **メソッド**: GET
- **エンドポイント**: `/settings/converters`
- **認証**: 要

**レスポンス**
```json
{
  "success": true,
  "data": {
    "available": [
      {"id": "pymupdf", "name": "PyMuPDF", "description": "高速・軽量"},
      {"id": "pdfplumber", "name": "pdfplumber", "description": "表抽出に強い"},
      {"id": "openai", "name": "OpenAI Vision", "description": "画像認識ベース"},
      {"id": "claude", "name": "Claude Vision", "description": "画像認識ベース"}
    ],
    "current": "pymupdf"
  }
}
```

---

#### API-017: コンバーター設定

- **メソッド**: PUT
- **エンドポイント**: `/settings/converters`
- **認証**: 要

**リクエスト**
```json
{
  "current_converter": "pymupdf"
}
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| current_converter | string | 必須 | pymupdf / pdfplumber / openai / claude |

---

#### API-018: APIキー設定

- **メソッド**: PUT
- **エンドポイント**: `/settings/api-keys`
- **認証**: 要

**リクエスト**
```json
{
  "openai_api_key": "sk-...",
  "anthropic_api_key": "sk-ant-..."
}
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| openai_api_key | string | - | OpenAI APIキー（空文字で削除） |
| anthropic_api_key | string | - | Anthropic APIキー（空文字で削除） |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "openai_api_key_set": true,
    "anthropic_api_key_set": true
  },
  "message": "APIキーを更新しました"
}
```

**備考**: セキュリティのため、APIキーは保存後に取得不可（設定有無のみ確認可能）

---

#### API-019: モデル一覧

- **メソッド**: GET
- **エンドポイント**: `/settings/models`
- **認証**: 要

**レスポンス**
```json
{
  "success": true,
  "data": {
    "openai_models": [
      {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "高速・低コスト"},
      {"id": "gpt-4o", "name": "GPT-4o", "description": "高精度"}
    ],
    "anthropic_models": [
      {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "description": "高速・低コスト"},
      {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "description": "高精度"}
    ],
    "current": {
      "openai_model": "gpt-4o-mini",
      "anthropic_model": "claude-3-haiku-20240307"
    }
  }
}
```

---

#### API-020: モデル設定

- **メソッド**: PUT
- **エンドポイント**: `/settings/models`
- **認証**: 要

**リクエスト**
```json
{
  "openai_model": "gpt-4o-mini",
  "anthropic_model": "claude-3-haiku-20240307"
}
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| openai_model | string | - | gpt-4o-mini / gpt-4o |
| anthropic_model | string | - | claude-3-haiku-20240307 / claude-3-5-sonnet-20241022 |

**レスポンス**
```json
{
  "success": true,
  "data": {
    "openai_model": "gpt-4o-mini",
    "anthropic_model": "claude-3-haiku-20240307"
  },
  "message": "モデル設定を更新しました"
}
```

---

## 変更履歴
| 日付 | 版 | 変更内容 | 変更者 |
|------|-----|----------|--------|
| 2025-12-16 | 1.0 | 初版作成 | Claude (AIPM) |

---

## AIレビュー結果

### レビュー実施日: 2025-12-16

### レビュー結果: 合格（修正済み）

### 検出項目と対応:

| # | 項目 | 重要度 | 内容 | 対応 |
|---|------|--------|------|------|
| 1 | API詳細仕様欠落 | 中 | API-003,006,007,010,014-016,018,019の詳細仕様がなかった | 全APIの詳細仕様を追加 |

### 確認事項:
- [x] 全20 APIエンドポイントの詳細仕様が定義されている
- [x] 共通レスポンス形式が定義されている
- [x] 認証方式（JWT）が明記されている
- [x] エラーコードが定義されている
- [x] リクエスト/レスポンスのJSONサンプルが記載されている
- [x] クラス設計書のサービス層と整合している
- [x] 画面設計書のAPI連携と整合している
