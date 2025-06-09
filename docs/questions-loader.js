// 問題を動的に読み込むローダー（改良版）
window.QuestionsLoader = {
    // キャッシュ
    cache: {
        domains: {},
        questions: {},
        groups: {}
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

    // 特定の問題を読み込む（グループファイルから）
    async loadQuestion(domainNumber, questionId) {
        const cacheKey = `${domainNumber}_${questionId}`;
        if (this.cache.questions[cacheKey]) {
            this.log(`Using cached question: ${questionId}`);
            return this.cache.questions[cacheKey];
        }

        try {
            // 問題IDから問題番号を抽出 (例: d1_q15 -> 15)
            const questionMatch = questionId.match(/d\d+_q(\d+)/);
            if (!questionMatch) {
                throw new Error(`Invalid question ID format: ${questionId}`);
            }
            
            const questionNumber = parseInt(questionMatch[1]);
            const groupNumber = Math.ceil(questionNumber / 10); // 1-10: group1, 11-20: group2, etc.
            const indexInGroup = (questionNumber - 1) % 10; // 0-9
            
            this.log(`Loading question ${questionId} from group ${groupNumber} (index ${indexInGroup})`);
            
            // グループを読み込む
            const group = await this.loadGroup(domainNumber, groupNumber);
            if (!group || !group.questions || !group.questions[indexInGroup]) {
                throw new Error(`Question not found in group: ${questionId}`);
            }
            
            const question = group.questions[indexInGroup];
            this.log(`Successfully loaded question ${questionId} from group`);
            
            this.cache.questions[cacheKey] = question;
            return question;
        } catch (error) {
            this.logError(`Failed to load question ${questionId}`, error);
            return null;
        }
    },

    // ドメインのすべての問題を読み込む（グループファイルから）
    async loadDomainQuestions(domainNumber) {
        this.log(`Loading all questions for domain ${domainNumber}`);
        
        const index = await this.loadDomainIndex(domainNumber);
        if (!index || !index.groups) {
            this.logError(`No groups found for domain ${domainNumber}`);
            return [];
        }

        this.log(`Found ${index.groups.length} groups in domain ${domainNumber}`);
        
        const questions = [];
        
        // 各グループから問題を読み込む
        let questionIndex = 0;
        for (const groupInfo of index.groups) {
            const group = await this.loadGroup(domainNumber, groupInfo.id);
            if (group && group.questions) {
                // 各問題にドメイン情報とインデックスを追加
                const groupQuestions = group.questions.map(q => ({
                    ...q,
                    domain: domainNumber,
                    originalIndex: questionIndex++
                }));
                questions.push(...groupQuestions);
                this.log(`Loaded ${groupQuestions.length} questions from group ${groupInfo.id}`);
            }
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

    // グループを読み込む（新機能）
    async loadGroup(domainNumber, groupNumber) {
        const cacheKey = `${domainNumber}_group${groupNumber}`;
        if (this.cache.groups[cacheKey]) {
            this.log(`Using cached group: domain${domainNumber}/group${groupNumber}`);
            return this.cache.groups[cacheKey];
        }

        try {
            const url = `questions/domain${domainNumber}/groups/group${groupNumber}.json`;
            this.log(`Loading group from: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const group = await response.json();
            this.log(`Successfully loaded group ${groupNumber} from domain ${domainNumber}`);
            
            this.cache.groups[cacheKey] = group;
            return group;
        } catch (error) {
            this.logError(`Failed to load group ${groupNumber} from domain ${domainNumber}`, error);
            return null;
        }
    },

    // ドメインのすべてのグループを読み込む
    async loadDomainGroups(domainNumber) {
        this.log(`Loading all groups for domain ${domainNumber}`);
        
        const index = await this.loadDomainIndex(domainNumber);
        if (!index || !index.groups) {
            this.logError(`No groups found for domain ${domainNumber}`);
            return [];
        }

        this.log(`Found ${index.groups.length} groups in domain ${domainNumber}`);
        
        const groups = [];
        
        // 並列でグループを読み込む
        const promises = index.groups.map(g => this.loadGroup(domainNumber, g.id));
        const results = await Promise.all(promises);
        groups.push(...results.filter(g => g !== null));

        this.log(`Successfully loaded ${groups.length} groups for domain ${domainNumber}`);
        return groups;
    },

    // 特定のグループから問題を取得
    async getQuestionsFromGroup(domainNumber, groupNumber) {
        const group = await this.loadGroup(domainNumber, groupNumber);
        if (!group) {
            return [];
        }
        
        return group.questions.map(q => ({
            ...q,
            domain: domainNumber,
            group: groupNumber
        }));
    },

    // ランダムな問題を取得（グループから）
    async getRandomQuestions(count = 5) {
        this.log(`Getting ${count} random questions`);
        const allQuestions = [];
        
        // 各ドメインから問題をランダムに選択
        for (let domain = 1; domain <= 4; domain++) {
            const domainQuestions = await this.loadDomainQuestions(domain);
            if (domainQuestions.length > 0) {
                // ランダムに問題を選択
                const shuffled = [...domainQuestions].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, Math.ceil(count / 4));
                
                selected.forEach(q => {
                    allQuestions.push({
                        ...q,
                        domain: domain
                    });
                });
            }
        }

        // 全体をシャッフルして指定数を返す
        const result = allQuestions.sort(() => Math.random() - 0.5).slice(0, count);
        this.log(`Returning ${result.length} random questions`);
        return result;
    },

    // 試験用の問題セットを生成（グループから）
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
            const domainQuestions = await this.loadDomainQuestions(domainNum);
            
            if (domainQuestions.length > 0) {
                // ランダムに必要数の問題を選択
                const shuffled = [...domainQuestions].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, count);
                
                selected.forEach(q => {
                    examQuestions.push({
                        ...q,
                        domain: domainNum
                    });
                });
                
                this.log(`Added ${selected.length} questions from domain ${domainNum}`);
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
            questions: {},
            groups: {}
        };
        this.log('Cache cleared');
    },

    // テスト関数：システムの動作確認
    async testLoader() {
        console.log('=== Testing Questions Loader (Group-based) ===');
        
        // ドメイン1のインデックスをテスト
        console.log('1. Testing domain index loading...');
        const index = await this.loadDomainIndex(1);
        if (index && index.groups) {
            console.log('✅ Domain index loaded successfully');
            console.log(`   - Groups count: ${index.groups.length}`);
            console.log(`   - Total questions: ${index.questionCount}`);
        } else {
            console.log('❌ Failed to load domain index');
            return;
        }
        
        // グループ1を読み込みテスト
        console.log('\n2. Testing group loading...');
        const group1 = await this.loadGroup(1, 1);
        if (group1) {
            console.log('✅ Group 1 loaded successfully');
            console.log(`   - Group title: ${group1.title}`);
            console.log(`   - Questions in group: ${group1.questionCount}`);
        } else {
            console.log('❌ Failed to load group');
        }
        
        // 個別問題の読み込みテスト（グループから）
        console.log('\n3. Testing single question loading from group...');
        const question = await this.loadQuestion(1, 'd1_q15');
        if (question) {
            console.log('✅ Question loaded successfully from group');
            console.log(`   - Question ID: ${question.id}`);
            console.log(`   - Question text: ${question.text.substring(0, 50)}...`);
            console.log(`   - Loaded from group: 2`);
        } else {
            console.log('❌ Failed to load question from group');
        }
        
        // ドメインの全問題読み込みテスト
        console.log('\n4. Testing domain questions loading...');
        const domainQuestions = await this.loadDomainQuestions(1);
        console.log(`✅ Loaded ${domainQuestions.length} questions from domain 1`);
        
        // ランダム問題テスト
        console.log('\n5. Testing random questions...');
        const randomQuestions = await this.getRandomQuestions(5);
        console.log(`✅ Generated ${randomQuestions.length} random questions`);
        
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

// 新しいグループ機能のラッパー関数
window.getQuestionsForGroup = async function(domain, group) {
    return await window.QuestionsLoader.getQuestionsFromGroup(domain, group);
};

window.getDomainGroups = async function(domain) {
    return await window.QuestionsLoader.loadDomainGroups(domain);
};

window.getGroupInfo = async function(domain, group) {
    return await window.QuestionsLoader.loadGroup(domain, group);
};

// ページ読み込み時の初期化（テストは実行しない）
document.addEventListener('DOMContentLoaded', () => {
    // console.log('Questions Loader initialized');
    // テストは必要に応じて手動で実行: window.QuestionsLoader.testLoader()
});