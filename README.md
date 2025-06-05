# AWS AIF Practice - AWS AI Fundamentals 認定試験練習アプリ

## 🎯 概要

AWS AI Fundamentals (AIF-C01) 認定試験の学習をサポートする、インタラクティブなWebアプリケーションです。200問以上の練習問題と詳細な解説で、効率的な学習を実現します。

🔗 **公開サイト**: [https://tsumita2929.github.io/aws-aif-practice](https://tsumita2929.github.io/aws-aif-practice)

## ✨ 特徴

### 学習モード

- 📚 **練習モード**: 4つのドメインから選択して学習（各ドメイン50問）
- 🎲 **ランダム練習**: 全ドメインからランダムに5問を出題
- 📝 **模擬試験**: 実際の試験形式で65問を90分で挑戦
- 🔄 **復習機能**: 間違えた問題やフラグ付き問題を効率的に復習
- 📊 **進捗管理**: 学習状況を視覚的に把握

### UI/UX

- 📱 レスポンシブデザイン（PC/タブレット/スマホ対応）
- 🌙 ダークモード対応
- 🎨 AWS公式カラーを採用した美しいデザイン
- 🏆 成果バッジシステム
- 🔥 連続学習日数トラッカー
- ⚡ スワイプジェスチャー対応（モバイル）
- ⌨️ キーボードショートカット対応

## 🚀 利用方法

### オンライン版（推奨）

1. ブラウザで [https://tsumita2929.github.io/aws-aif-practice](https://tsumita2929.github.io/aws-aif-practice) にアクセス
2. すぐに学習を開始できます！

### ローカル版

このリポジトリをクローンして自分の環境で実行：

```bash
# クローン
git clone https://github.com/tsumita2929/aws-aif-practice.git
cd aws-aif-practice

# ローカルサーバー起動
cd docs

# Python の場合（推奨）
python3 start-server.py
# または
python3 -m http.server 8000

# Node.js の場合
node server.js
# または
npx http-server -p 8000

# ブラウザで http://localhost:8000 にアクセス
```

## 📚 学習コンテンツ

### ドメイン構成と出題比率

1. **ドメイン1: AI/機械学習の基礎概念** (25% - 16問)
   - 機械学習の基本概念
   - 教師あり/教師なし学習
   - ディープラーニングの基礎
   - データの前処理と特徴量エンジニアリング

2. **ドメイン2: AWSのAI/MLサービス** (35% - 23問)
   - Amazon SageMaker
   - Amazon Rekognition, Comprehend, Textract
   - Amazon Polly, Transcribe, Translate
   - Amazon Personalize, Forecast

3. **ドメイン3: 責任あるAIと倫理** (20% - 13問)
   - AIの倫理的考慮事項
   - バイアスと公平性
   - プライバシーとセキュリティ
   - 説明可能性と透明性

4. **ドメイン4: AI実装のベストプラクティス** (20% - 13問)
   - MLOpsとモデルライフサイクル
   - コスト最適化
   - スケーラビリティとパフォーマンス
   - 監視とデバッグ

### 問題形式

- **単一選択問題**: 4つの選択肢から1つを選択
- **複数選択問題**: 4つの選択肢から2つを選択
- **シナリオベース問題**: 実務的な状況での判断力を問う

## 🤝 コントリビューション

### 問題の追加・改善

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/new-questions`)
3. 問題ファイルを編集（`docs/questions/domain*/` 内のJSONファイル）
4. コミット (`git commit -m 'Add new questions for Domain X'`)
5. プッシュ (`git push origin feature/new-questions`)
6. Pull Requestを作成

### バグ報告・機能提案

[Issues](https://github.com/tsumita2929/aws-aif-practice/issues)から報告してください。

## 📜 ライセンス

MIT License - 自由に使用・改変・配布可能です。

## ⚠️ 免責事項

このアプリケーションは非公式の学習ツールです。実際のAWS認定試験とは異なる場合があります。
最新の試験情報は[AWS公式サイト](https://aws.amazon.com/certification/certified-ai-practitioner/)をご確認ください。

---

⭐ もしこのプロジェクトが役立ったら、スターをお願いします！
