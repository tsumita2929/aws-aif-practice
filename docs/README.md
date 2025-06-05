# AWS AIF 練習問題 Webアプリケーション

## 概要

AWS AI Fundamentals (AIF) 認定試験の練習問題を学習できる、最高のUI/UXを追求したWebアプリケーションです。

## 機能

### 📚 学習機能

- **練習モード**: ドメイン別に問題を解く
- **模擬試験**: 本番形式の65問を90分で解く
- **復習機能**: 間違えた問題、フラグ付き問題、未回答問題の絞り込み
- **進捗管理**: 学習状況の可視化、正答率、学習時間の記録

### 🎨 UI/UX特徴

- **レスポンシブデザイン**: PC、タブレット、スマートフォンに対応
- **ダークモード**: 目に優しい暗いテーマ
- **アニメーション**: スムーズな画面遷移
- **成果バッジ**: 学習のモチベーション向上
- **連続学習日数**: ゲーミフィケーション要素

### 💾 データ管理

- **ローカルストレージ**: 進捗の自動保存
- **問題データの分離**: `questions-data.js`で一元管理
- **拡張性**: 問題の追加・編集が容易

## ファイル構成

```
web-app/
├── index.html          # メインHTML
├── styles.css          # スタイルシート
├── app.js             # アプリケーションロジック
├── questions-data.js   # 問題データ
└── README.md          # このファイル
```

## 使い方

### 1. 起動方法

⚠️ **重要**: ローカルファイルを直接開くとCORSエラーで問題が読み込めません。必ずローカルサーバーを使用してください。

#### 🐍 方法1: Python（推奨）
```bash
# 付属のスクリプトを使用（自動でブラウザが開きます）
./start-server.py

# または標準コマンド
python -m http.server 8000
```

#### 🟢 方法2: Node.js
```bash
# Expressサーバー（server.jsを使用）
node server.js

# またはhttp-server
npx http-server -p 8000
```

#### 💻 方法3: VSCode
VSCodeの「Live Server」拡張機能をインストールし、`index.html`を右クリック→「Open with Live Server」

#### 🌐 アクセス
ブラウザで `http://localhost:8000` を開く

### 2. 学習の流れ

1. **ドメイン選択**: 4つのドメインから選択
2. **問題回答**: 単一選択または複数選択
3. **解説確認**: 詳細な解説と関連リソース
4. **進捗確認**: ダッシュボードで学習状況を把握

## 問題データの形式

```javascript
{
    id: "d1_q1",
    type: "single", // または "multiple"
    text: "問題文",
    choices: [
        { label: "A", text: "選択肢1" },
        { label: "B", text: "選択肢2" },
        // ...
    ],
    correct: [0], // 正解のインデックス（複数可）
    explanation: "HTML形式の解説",
    resources: [
        { title: "リソース名", url: "URL" }
    ]
}
```

## カスタマイズ

### 問題の追加

`questions-data.js`の該当ドメインに問題オブジェクトを追加：

```javascript
window.questionsData.domain1.push({
  id: "d1_q6",
  type: "single",
  text: "新しい問題",
  // ...
});
```

### カラーテーマの変更

`styles.css`の`:root`セクションでカラー変数を調整：

```css
:root {
  --aws-orange: #ff9900;
  --aws-blue: #232f3e;
  /* 他のカラー変数 */
}
```

## 技術スタック

- **HTML5**: セマンティックマークアップ
- **CSS3**: カスタムプロパティ、Grid、Flexbox
- **JavaScript (ES6+)**: モジュール化されたコード
- **LocalStorage API**: データ永続化
- **Web Fonts**: Inter フォント

## ブラウザ対応

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 今後の拡張案

- 問題のシャッフル機能
- 学習履歴のエクスポート/インポート
- オフライン対応（Service Worker）
- 音声読み上げ機能
- 問題の検索機能
- ソーシャル共有機能
