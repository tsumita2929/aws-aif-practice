// グループベースの問題表示モジュール
export {
    loadGroupsForDomain,
    loadQuestionsFromGroup,
    renderGroupSelector,
    renderGroupQuestions,
    getGroupMetadata
};

// グループメタデータ
const GROUP_METADATA = {
    1: {
        name: "AI・ML基礎",
        groups: {
            1: { title: "基本概念", description: "教師あり学習、分類vs回帰、過学習防止、プロンプトエンジニアリング、深層学習vs従来ML、NLPタスク" },
            2: { title: "応用とモデル評価", description: "推薦システム、不均衡データの評価指標、CNN、特徴量エンジニアリング、転移学習、次元の呪い、SMOTE、勾配降下法、教師なし学習" },
            3: { title: "高度な手法", description: "誤差逆伝播、医療AI評価、アンサンブル学習、時系列分析、解釈性vs精度、協調フィルタリング、正則化、生成AI、強化学習、半教師あり学習" },
            4: { title: "プロジェクト実践", description: "MLライフサイクル、異常検知、バイアス分散トレードオフ、埋め込み、デバッグ技術、勾配消失問題、データリーク、交差検証、LSTM" },
            5: { title: "最新トピック", description: "モデルドリフト、モバイル転移学習、SGD、アテンション機構、プロジェクト失敗要因、LLMファインチューニング、RAG、AutoML" }
        }
    },
    2: {
        name: "AWSのAIサービス",
        groups: {
            1: { title: "基本サービス", description: "SageMaker、Rekognition、Bedrock、Textract、Comprehend、Personalize" },
            2: { title: "音声・NLP応用", description: "Polly/Transcribe、Lex+Comprehend、Forecast、Ground Truth、Comprehend Medical、Translate、Autopilot" },
            3: { title: "専門サービス", description: "Rekognition Custom Labels、Lookout for Equipment、Kendra、Data Wrangler、Fraud Detector、Transcribe Call Analytics、Neo、CodeGuru" },
            4: { title: "MLOps・統合", description: "Model Registry、A2I、Pipelines、Elastic Inference、Feature Store、DevOps Guru" },
            5: { title: "高度な実装", description: "Debugger、Monitron、Clarify、Location Service統合、Panorama" }
        }
    },
    3: {
        name: "責任あるAI",
        groups: {
            1: { title: "基本倫理", description: "バイアスの原因、説明可能AI、公平性、透明性、GDPR準拠、医療AI倫理" },
            2: { title: "実装手法", description: "SageMaker Clarify、HITL、顔認識バイアス、差分プライバシー、AIガバナンス" },
            3: { title: "社会的影響", description: "アルゴリズム説明責任、教育AIバイアス、インフォームドコンセント、多様性、環境影響、自動化バイアス" },
            4: { title: "規制・法務", description: "従業員監視、監査要件、著作権、COPPA準拠、文化的配慮、レッドライニング、異議申し立て" },
            5: { title: "先進トピック", description: "差別防止技術、ステークホルダー関与、合成データ倫理、ハルシネーション対策、法的リスク" }
        }
    },
    4: {
        name: "AI実装・運用",
        groups: {
            1: { title: "データ準備・最適化", description: "データ品質評価、コスト最適化、MLOps、データドリフト、モデル評価、リアルタイム推論" },
            2: { title: "本番環境", description: "デプロイ自動化、A/Bテスト、PoC重要性、オンライン学習、技術的負債、スタートアップ戦略" },
            3: { title: "高度な運用", description: "フィードバックループ、エッジコンピューティング、医療AI説明性、カナリーデプロイ、Feature Store、IoT統合" },
            4: { title: "ビジネス統合", description: "解釈性vsパフォーマンス、季節変動対応、マルチモーダルAI、ハイブリッドクラウド、連合学習、ROI測定" },
            5: { title: "最新課題", description: "CI/CD課題、自動ドリフト検知、LLM本番運用、レート制限、セキュリティ、エッジAI実装" }
        }
    }
};

// ドメインのグループ情報を読み込む
async function loadGroupsForDomain(domainNumber) {
    try {
        const index = await window.QuestionsLoader.loadDomainIndex(domainNumber);
        if (!index || !index.groups) {
            throw new Error(`No groups found for domain ${domainNumber}`);
        }
        
        // メタデータと結合
        return index.groups.map(group => ({
            ...group,
            ...GROUP_METADATA[domainNumber].groups[group.id]
        }));
    } catch (error) {
        console.error('Error loading groups:', error);
        return [];
    }
}

// 特定グループから問題を読み込む
async function loadQuestionsFromGroup(domainNumber, groupNumber) {
    try {
        const questions = await window.getQuestionsForGroup(domainNumber, groupNumber);
        return questions;
    } catch (error) {
        console.error('Error loading questions from group:', error);
        return [];
    }
}

// グループセレクターをレンダリング
function renderGroupSelector(domainNumber, targetElement, onGroupSelect) {
    loadGroupsForDomain(domainNumber).then(groups => {
        const html = `
            <div class="group-selector">
                <h3>${GROUP_METADATA[domainNumber].name} - グループ選択</h3>
                <div class="group-cards">
                    ${groups.map(group => `
                        <div class="group-card" data-group-id="${group.id}">
                            <h4>${group.title}</h4>
                            <p class="group-description">${group.description}</p>
                            <div class="group-info">
                                <span class="question-count">${group.questionCount} 問</span>
                                <button class="btn-select-group" data-domain="${domainNumber}" data-group="${group.id}">
                                    選択
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        targetElement.innerHTML = html;
        
        // イベントリスナー追加
        targetElement.querySelectorAll('.btn-select-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = parseInt(e.target.dataset.domain);
                const group = parseInt(e.target.dataset.group);
                if (onGroupSelect) {
                    onGroupSelect(domain, group);
                }
            });
        });
    });
}

// グループの問題をレンダリング
function renderGroupQuestions(domainNumber, groupNumber, targetElement, onQuestionSelect) {
    Promise.all([
        loadQuestionsFromGroup(domainNumber, groupNumber),
        getGroupMetadata(domainNumber, groupNumber)
    ]).then(([questions, metadata]) => {
        const html = `
            <div class="group-questions">
                <div class="group-header">
                    <h3>${metadata.title}</h3>
                    <p>${metadata.description}</p>
                    <span class="question-count">${questions.length} 問</span>
                </div>
                <div class="questions-list">
                    ${questions.map((question, index) => `
                        <div class="question-item" data-question-index="${index}">
                            <div class="question-number">${index + 1}</div>
                            <div class="question-content">
                                <p class="question-text">${question.text}</p>
                                <span class="question-id">${question.id}</span>
                            </div>
                            <button class="btn-start-question" data-index="${index}">
                                解答する
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        targetElement.innerHTML = html;
        
        // イベントリスナー追加
        targetElement.querySelectorAll('.btn-start-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (onQuestionSelect) {
                    onQuestionSelect(questions[index], index);
                }
            });
        });
    });
}

// グループのメタデータを取得
function getGroupMetadata(domainNumber, groupNumber) {
    const domainMeta = GROUP_METADATA[domainNumber];
    if (!domainMeta || !domainMeta.groups[groupNumber]) {
        return {
            title: `グループ ${groupNumber}`,
            description: ''
        };
    }
    return domainMeta.groups[groupNumber];
}

// スタイル定義（CSSファイルに追加することを推奨）
const groupStyles = `
<style>
.group-selector {
    padding: 20px;
}

.group-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.group-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    transition: box-shadow 0.3s;
}

.group-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-card h4 {
    margin: 0 0 10px 0;
    color: #333;
}

.group-description {
    font-size: 14px;
    color: #666;
    margin: 10px 0;
    line-height: 1.5;
}

.group-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
}

.question-count {
    background: #e3f2fd;
    color: #1976d2;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 14px;
}

.btn-select-group {
    background: #4caf50;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
}

.btn-select-group:hover {
    background: #45a049;
}

.group-questions {
    padding: 20px;
}

.group-header {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.questions-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.question-item {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: background 0.3s;
}

.question-item:hover {
    background: #f9f9f9;
}

.question-number {
    background: #e0e0e0;
    color: #666;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
}

.question-content {
    flex: 1;
}

.question-text {
    margin: 0 0 5px 0;
    color: #333;
}

.question-id {
    font-size: 12px;
    color: #999;
}

.btn-start-question {
    background: #2196f3;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
}

.btn-start-question:hover {
    background: #1976d2;
}
</style>
`;