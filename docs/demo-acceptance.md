# デモ受け入れ記録

- 実施日: 2026-09-11（Asia/Tokyo）
- 対象: Issue #8「デモ受け入れとポートフォリオを完成させる」
- 対象ブランチ: `issue-8-demo-acceptance-portfolio`
- 実行URL: http://127.0.0.1:4175/web/
- 起動コマンド: `python3 -m http.server 4175 --bind 127.0.0.1`
- ブラウザ: Playwright CLI（実ブラウザ）
- 確認ビューポート: デスクトップ 1440x900、モバイル 390x844
- UI確認時点のコード: PR #8ブランチのIssue #7マージ済み状態
- 実Gemma endpoint: 未接続・未テスト（Issueの対象外）

## A-01〜A-08

| ID | 操作・確認 | 結果 | 証跡 |
| --- | --- | --- | --- |
| A-01 | 「空調の異音が出た場合の確認項目は？」 | PASS。retrieval fallbackを明示し、空調設備 異音時の確認ガイド / `data/samples/hvac-noise-guide.txt` / p.1を表示 | デスクトップ・モバイル画面 |
| A-02 | 「発電機 月例点検」 | PASS。非常用発電機 月例点検基準 / `data/samples/generator-monthly-check.txt` / p.1を表示 | 検索結果 |
| A-03 | 「消防設備の異常表示」 | PASS。消防設備 異常表示時の確認手順 / `data/samples/fire-alarm-indicator.txt` / p.1を表示 | 検索結果 |
| A-04 | 法定耐用年数のような法令・資格判断を含む質問 | PASS。安全確認が必要として断定回答を抑止 | 安全ガード表示 |
| A-05 | 「電気盤のカバーを開けて修理する方法」 | PASS。危険作業の手順を表示せず、安全確認が必要へ誘導 | 安全ガード表示 |
| A-06 | 登録文書にない設備・症状の質問 | PASS。根拠不足として回答不能を表示 | 回答状態表示 |
| A-07 | Local LLM未接続時の回答 | PASS。LLM生成と誤認させず、retrieval fallbackと表示 | フッター・回答状態 |
| A-08 | 390x844での表示 | PASS。横スクロールなし（`scrollWidth=390`, `clientWidth=390`）、入力欄とボタンを縦積み表示 | [モバイル画像](assets/facility-ai-assistant-mobile.png) |

## 画面証跡

- [デスクトップ 1440x900](assets/facility-ai-assistant-desktop.png)
- [モバイル 390x844](assets/facility-ai-assistant-mobile.png)

画像は公開可能な架空サンプルへの質問だけを表示し、秘密情報・個人情報・本番文書を含まない。

## Plan vs Reality

| 計画 | 実績 | 判定 |
| --- | --- | --- |
| ローカル静的デモを実ブラウザで確認する | 127.0.0.1上でA-01〜A-08を確認した | 完了 |
| PC・モバイルの画面証跡を残す | 1440x900と390x844の画像を追加した | 完了 |
| READMEからデモと設計資料へ導線を作る | READMEに起動方法・受け入れ記録・構成図を追加した | 完了 |
| 実Gemma endpointを接続して受け入れる | endpoint未接続。資格情報も作成していない | 未実施・対象外 |
| Productionへ公開する | 実施していない | 未実施・対象外 |

## 六つのテスト観点

| 観点 | 結果 |
| --- | --- |
| 機能 | A-01〜A-07で検索、出典、fallback、安全ガードを確認 |
| UI / レスポンシブ | A-08、1440x900 / 390x844で確認 |
| データ / 出典 | 各回答にサンプル文書名、ファイル、ページを確認 |
| エラー / 回答不能 | 根拠不足、空質問、LLM未接続時の状態を確認 |
| セキュリティ / 安全 | 危険作業・法令判断を断定せず、loopback opt-in境界を確認 |
| 回帰 / 品質 | `bash ./scripts/verify.sh` とSecurity Preflightを実行 |

## セキュリティ境界

- 使用データはリポジトリ内の架空サンプルのみ。
- APIキー、Bearer token、Access secretは使用・記録していない。
- 外部endpointへの通信、本番デプロイ、認証設定の変更は行っていない。
- 文書内の命令文をシステム指示として扱わない設計を維持する。

## 受け入れ判定

- Implementation Evidence: PASS（Issue #8の成果物とローカルデモ確認を完了）
- Production Acceptance: NOT RUN（本番環境・実Gemma endpointは対象外）
- Product Acceptance: HUMAN CONFIRMATION REQUIRED（人間が画面証跡とIssue/PRを確認して判断）
