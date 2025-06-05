// 問題を動的に読み込むローダー（改良版）
window.QuestionsLoader = {
    // キャッシュ
    cache: {
        domains: {},
        questions: {}
    },

    // デバッグモードフラグ
    debugMode: false,

    // ログ出力ヘルパー
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[QuestionsLoader] ${message}`, data || '');
        }
    },

    // エラー出力ヘルパー
    logError(message, error = null) {
        console.error(`[QuestionsLoader ERROR] ${message}`, error || '');
    },

    // ドメインのインデックスを読み込む
    async loadDomainIndex(domainNumber) {
        const cacheKey = `domain${domainNumber}`;
        if (this.cache.domains[cacheKey]) {
            this.log(`Using cached index for domain ${domainNumber}`);
            return this.cache.domains[cacheKey];
        }

        try {
            const url = `questions/domain${domainNumber}/index.json`;
            this.log(`Loading domain index from: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const index = await response.json();
            this.log(`Successfully loaded domain ${domainNumber} index:`, index);
            
            this.cache.domains[cacheKey] = index;
            return index;
        } catch (error) {
            this.logError(`Failed to load domain ${domainNumber} index`, error);
            
            // CORSエラーの可能性を警告
            if (error.message.includes('Failed to fetch')) {
                console.warn(`
                    ⚠️ ファイルの読み込みに失敗しました。
                    ローカルファイルを直接開いている場合は、以下の方法をお試しください：
                    
                    1. ローカルサーバーを使用する:
                       - VSCodeの"Live Server"拡張機能
                       - Python: python -m http.server 8000
                       - Node.js: npx http-server
                    
                    2. ブラウザのセキュリティ設定を変更する（開発時のみ）
                `);
            }
            
            return null;
        }
    },

    // 特定の問題を読み込む
    async loadQuestion(domainNumber, questionId) {
        const cacheKey = `${domainNumber}_${questionId}`;
        if (this.cache.questions[cacheKey]) {
            this.log(`Using cached question: ${questionId}`);
            return this.cache.questions[cacheKey];
        }

        try {
            const url = `questions/domain${domainNumber}/${questionId}.json`;
            this.log(`Loading question from: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const question = await response.json();
            this.log(`Successfully loaded question ${questionId}`);
            
            this.cache.questions[cacheKey] = question;
            return question;
        } catch (error) {
            this.logError(`Failed to load question ${questionId}`, error);
            return null;
        }
    },

    // ドメインのすべての問題を読み込む
    async loadDomainQuestions(domainNumber) {
        this.log(`Loading all questions for domain ${domainNumber}`);
        
        const index = await this.loadDomainIndex(domainNumber);
        if (!index) {
            this.logError(`No index found for domain ${domainNumber}`);
            return [];
        }

        this.log(`Found ${index.questions.length} questions in domain ${domainNumber}`);
        
        const questions = [];
        
        // バッチ処理で効率化
        const batchSize = 5;
        for (let i = 0; i < index.questions.length; i += batchSize) {
            const batch = index.questions.slice(i, i + batchSize);
            const batchResults = await this.loadQuestionsParallel(domainNumber, batch);
            questions.push(...batchResults);
            
            // 進捗ログ
            this.log(`Loaded ${questions.length}/${index.questions.length} questions`);
        }

        this.log(`Successfully loaded ${questions.length} questions for domain ${domainNumber}`);
        return questions;
    },

    // 複数の問題を並列で読み込む（パフォーマンス向上）
    async loadQuestionsParallel(domainNumber, questionIds) {
        const promises = questionIds.map(id => this.loadQuestion(domainNumber, id));
        const results = await Promise.all(promises);
        return results.filter(q => q !== null);
    },

    // ランダムな問題を取得
    async getRandomQuestions(count = 5) {
        this.log(`Getting ${count} random questions`);
        const allQuestions = [];
        
        // 各ドメインから問題をランダムに選択
        for (let domain = 1; domain <= 4; domain++) {
            const index = await this.loadDomainIndex(domain);
            if (index) {
                // ランダムに問題IDを選択
                const shuffled = [...index.questions].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, Math.ceil(count / 4));
                
                // 選択した問題を読み込む
                const questions = await this.loadQuestionsParallel(domain, selected);
                questions.forEach(q => {
                    allQuestions.push({
                        ...q,
                        domain: domain,
                        originalIndex: index.questions.indexOf(q.id)
                    });
                });
            }
        }

        // 全体をシャッフルして指定数を返す
        const result = allQuestions.sort(() => Math.random() - 0.5).slice(0, count);
        this.log(`Returning ${result.length} random questions`);
        return result;
    },

    // 試験用の問題セットを生成
    async generateExamQuestions() {
        this.log('Generating exam questions');
        const distribution = {
            1: 16, // 25%
            2: 23, // 35%
            3: 13, // 20%
            4: 13  // 20%
        };

        const examQuestions = [];

        for (const [domain, count] of Object.entries(distribution)) {
            const domainNum = parseInt(domain);
            const index = await this.loadDomainIndex(domainNum);
            
            if (index) {
                // ランダムに必要数の問題を選択
                const shuffled = [...index.questions].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, count);
                
                // 選択した問題を読み込む
                const questions = await this.loadQuestionsParallel(domainNum, selected);
                questions.forEach(q => {
                    examQuestions.push({
                        ...q,
                        domain: domainNum
                    });
                });
                
                this.log(`Added ${questions.length} questions from domain ${domainNum}`);
            }
        }

        // 全体をシャッフル
        const result = examQuestions.sort(() => Math.random() - 0.5);
        this.log(`Generated ${result.length} exam questions`);
        return result;
    },

    // キャッシュをクリア
    clearCache() {
        this.cache = {
            domains: {},
            questions: {}
        };
        this.log('Cache cleared');
    },

    // テスト関数：システムの動作確認
    async testLoader() {
        console.log('=== Testing Questions Loader ===');
        
        // ドメイン1のインデックスをテスト
        console.log('1. Testing domain index loading...');
        const index = await this.loadDomainIndex(1);
        if (index) {
            console.log('✅ Domain index loaded successfully');
            console.log(`   - Questions count: ${index.questionCount}`);
            console.log(`   - First question ID: ${index.questions[0]}`);
        } else {
            console.log('❌ Failed to load domain index');
        }
        
        // 最初の問題を読み込みテスト
        if (index && index.questions.length > 0) {
            console.log('\n2. Testing single question loading...');
            const question = await this.loadQuestion(1, index.questions[0]);
            if (question) {
                console.log('✅ Question loaded successfully');
                console.log(`   - Question text: ${question.text.substring(0, 50)}...`);
                console.log(`   - Choices count: ${question.choices.length}`);
            } else {
                console.log('❌ Failed to load question');
            }
        }
        
        console.log('\n=== Test Complete ===');
    }
};

// 後方互換性のためのラッパー関数
window.getQuestionsForDomain = async function(domain) {
    return await window.QuestionsLoader.loadDomainQuestions(domain);
};

window.getTotalQuestionCount = async function() {
    let total = 0;
    for (let domain = 1; domain <= 4; domain++) {
        const index = await window.QuestionsLoader.loadDomainIndex(domain);
        if (index) {
            total += index.questionCount;
        }
    }
    return total;
};

// ページ読み込み時の初期化（テストは実行しない）
document.addEventListener('DOMContentLoaded', () => {
    // console.log('Questions Loader initialized');
    // テストは必要に応じて手動で実行: window.QuestionsLoader.testLoader()
});