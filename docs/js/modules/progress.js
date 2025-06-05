// 進捗管理モジュール
import { AppState, STORAGE_KEYS, saveProgress, initPracticeMode } from './state.js';
import { showAchievement } from './ui.js';

// 進捗表示の更新
export async function updateProgressDisplay() {
    // ドメインカードの進捗更新
    const domainCards = document.querySelectorAll('.domain-card');
    
    for (const card of domainCards) {
        const domain = parseInt(card.dataset.domain);
        const questions = await window.getQuestionsForDomain(domain);
        const answered = Array.from(AppState.answeredQuestions.keys())
            .filter(key => key.startsWith(`d${domain}_`)).length;
        
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        
        if (questions && questions.length > 0) {
            const percentage = (answered / questions.length) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${answered}/${questions.length} 完了`;
            
            // ARIA属性を追加
            const progressBar = progressFill.parentElement;
            if (progressBar) {
                progressBar.setAttribute('role', 'progressbar');
                progressBar.setAttribute('aria-valuenow', Math.round(percentage));
                progressBar.setAttribute('aria-valuemin', '0');
                progressBar.setAttribute('aria-valuemax', '100');
                progressBar.setAttribute('aria-label', `ドメイン${domain}の進捗: ${Math.round(percentage)}%`);
            }
        }
    }
}

// 進捗ビューの更新
export async function updateProgressView() {
    // 総合進捗
    const totalQuestions = await window.getTotalQuestionCount();
    const totalAnswered = AppState.answeredQuestions.size;
    const percentage = Math.round((totalAnswered / totalQuestions) * 100);
    
    const circularProgress = document.querySelector('.circular-progress');
    const progressValue = circularProgress.querySelector('.progress-value');
    const progressCircle = circularProgress.querySelector('circle:last-child');
    
    progressValue.textContent = `${percentage}%`;
    const circumference = 2 * Math.PI * 54;
    progressCircle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    // 正答率
    const correctAnswers = Array.from(AppState.answeredQuestions.values())
        .filter(a => a.isCorrect).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-value').textContent = `${accuracy}%`;
    document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-detail').textContent = 
        `${correctAnswers}/${totalAnswered} 問正解`;
    
    // 学習時間
    const totalMinutes = Math.floor(AppState.totalTime / 60000);
    document.querySelector('.stats-grid .stat-card:nth-child(3) .stat-value').textContent = `${totalMinutes}分`;
    
    // ドメイン別統計
    await updateDomainStats();
}

// ドメイン別統計の更新
export async function updateDomainStats() {
    const container = document.getElementById('domain-stats');
    container.innerHTML = '';
    
    for (let domain = 1; domain <= 4; domain++) {
        const questions = await window.getQuestionsForDomain(domain);
        const domainAnswers = Array.from(AppState.answeredQuestions.entries())
            .filter(([key]) => key.startsWith(`d${domain}_`));
        
        const answered = domainAnswers.length;
        const correct = domainAnswers.filter(([, value]) => value.isCorrect).length;
        const percentage = (answered / questions.length) * 100;
        
        const item = document.createElement('div');
        item.className = 'domain-stat-item';
        item.innerHTML = `
            <div class="domain-name">ドメイン${domain}</div>
            <div class="domain-stat-progress">
                <div class="domain-stat-bar">
                    <div class="domain-stat-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="domain-stat-text">${answered}/${questions.length}</span>
            </div>
        `;
        container.appendChild(item);
    }
}

// 連続学習日数の更新
export function updateStreak() {
    const lastStudyDate = localStorage.getItem(STORAGE_KEYS.LAST_STUDY_DATE);
    const today = new Date().toDateString();
    const savedStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0');
    
    if (lastStudyDate) {
        const lastDate = new Date(lastStudyDate).toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastDate === today) {
            AppState.streak = savedStreak;
        } else if (lastDate === yesterday) {
            AppState.streak = savedStreak + 1;
            localStorage.setItem(STORAGE_KEYS.STREAK, AppState.streak.toString());
        } else {
            AppState.streak = 1;
            localStorage.setItem(STORAGE_KEYS.STREAK, '1');
        }
    } else {
        AppState.streak = 1;
        localStorage.setItem(STORAGE_KEYS.STREAK, '1');
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today);
    document.getElementById('streak-count').textContent = AppState.streak;
}

// 成果チェック
export async function checkAchievements() {
    const totalAnswered = AppState.answeredQuestions.size;
    const totalQuestions = await window.getTotalQuestionCount();
    
    // 成果の定義
    const achievements = [
        { count: 1, title: '初めの一歩', desc: '最初の問題を解きました！' },
        { count: 10, title: '順調なスタート', desc: '10問解答しました！' },
        { count: 50, title: 'ハーフウェイ', desc: '50問解答しました！' },
        { count: 100, title: 'センチュリー', desc: '100問解答しました！' },
        { count: totalQuestions, title: 'コンプリート', desc: 'すべての問題を解答しました！' }
    ];
    
    const achievement = achievements.find(a => a.count === totalAnswered);
    if (achievement) {
        showAchievement(achievement.title, achievement.desc);
    }
}

// すべてのドメインの進捗を更新（新しい非同期対応）
export async function updateAllDomainProgress() {
    for (let domain = 1; domain <= 4; domain++) {
        await updateDomainProgress(domain);
    }
}

// 特定のドメインの進捗を更新
export async function updateDomainProgress(domain) {
    const card = document.querySelector(`[data-domain="${domain}"]`);
    if (!card) return;
    
    const progressText = card.querySelector('.progress-text');
    const progressFill = card.querySelector('.progress-fill');
    
    try {
        // 問題数を取得
        let totalQuestions = 0;
        
        // 新しいローダーを使用
        if (window.QuestionsLoader && window.QuestionsLoader.loadDomainIndex) {
            const index = await window.QuestionsLoader.loadDomainIndex(domain);
            if (index) {
                totalQuestions = index.questionCount;
            }
        } else if (window.getQuestionsForDomain) {
            // 従来の方法
            const questions = await window.getQuestionsForDomain(domain);
            totalQuestions = questions.length;
        }
        
        // 回答済み問題数を取得
        let answeredCount = 0;
        if (window.AppState && window.AppState.answeredQuestions) {
            answeredCount = Array.from(AppState.answeredQuestions.keys())
                .filter(key => key.startsWith(`d${domain}_`)).length;
        }
        
        // 進捗率を計算
        const percentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        
        // UIを更新
        if (progressText) {
            progressText.textContent = `${answeredCount}/${totalQuestions} 完了`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // ARIA属性も更新
        const progressBar = progressFill?.parentElement;
        if (progressBar) {
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuenow', Math.round(percentage));
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
            progressBar.setAttribute('aria-label', `ドメイン${domain}の進捗: ${Math.round(percentage)}%`);
        }
        
    } catch (error) {
        console.error(`Error updating progress for domain ${domain}:`, error);
        // エラー時は0/0として表示
        if (progressText) {
            progressText.textContent = '0/0 完了';
        }
    }
}

// 復習用の問題をフィルタリング
export async function filterReviewQuestions(filter) {
    const container = document.getElementById('review-list');
    container.innerHTML = '<div style="text-align: center; padding: 20px;">読み込み中...</div>';
    
    let questions = [];
    
    try {
        // フィルターに応じて効率的に問題を収集
        if (filter === 'incorrect' || filter === 'flagged') {
            // 間違えた問題やフラグ付き問題は既に記録されているものだけを読み込む
            const relevantQuestionIds = new Set();
            
            if (filter === 'incorrect') {
                AppState.answeredQuestions.forEach((answer, questionId) => {
                    if (!answer.isCorrect) {
                        relevantQuestionIds.add(questionId);
                    }
                });
            } else if (filter === 'flagged') {
                AppState.flaggedQuestions.forEach(questionId => {
                    relevantQuestionIds.add(questionId);
                });
            }
            
            // 該当する問題のみを読み込む
            for (const questionId of relevantQuestionIds) {
                const match = questionId.match(/d(\d+)_q(\d+)/);
                if (match) {
                    const domain = parseInt(match[1]);
                    const index = parseInt(match[2]);
                    
                    // インデックスから問題IDを取得
                    const domainIndex = await window.QuestionsLoader.loadDomainIndex(domain);
                    if (domainIndex && domainIndex.questions[index]) {
                        const question = await window.QuestionsLoader.loadQuestion(domain, domainIndex.questions[index]);
                        if (question) {
                            questions.push({
                                ...question,
                                domain,
                                index,
                                questionId
                            });
                        }
                    }
                }
            }
        } else {
            // 'all'または'unseen'の場合は全ドメインのインデックスを確認
            for (let domain = 1; domain <= 4; domain++) {
                const domainIndex = await window.QuestionsLoader.loadDomainIndex(domain);
                if (domainIndex) {
                    // 各問題について必要に応じて読み込む
                    for (let index = 0; index < domainIndex.questions.length; index++) {
                        const questionId = `d${domain}_q${index}`;
                        const answered = AppState.answeredQuestions.get(questionId);
                        
                        let include = false;
                        if (filter === 'all') {
                            include = true;
                        } else if (filter === 'unseen') {
                            include = !answered;
                        }
                        
                        if (include) {
                            const question = await window.QuestionsLoader.loadQuestion(domain, domainIndex.questions[index]);
                            if (question) {
                                questions.push({
                                    ...question,
                                    domain,
                                    index,
                                    questionId
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // コンテナをクリア
        container.innerHTML = '';
        
        // 質問を表示
        if (questions.length > 0) {
            questions.forEach((questionData) => {
                const answered = AppState.answeredQuestions.get(questionData.questionId);
                const item = createReviewItem(questionData.domain, questionData.index, questionData, answered, questionData.questionId);
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">該当する問題がありません</div>';
        }
    } catch (error) {
        console.error('Error loading review questions:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc3545;">問題の読み込みに失敗しました</div>';
    }
}

// 復習アイテムの作成
function createReviewItem(domain, index, question, answered, questionId) {
    const item = document.createElement('div');
    item.className = 'review-item';
    
    let statusIcon = '';
    let statusClass = 'unseen';
    
    if (answered) {
        if (answered.isCorrect) {
            statusIcon = '✓';
            statusClass = 'correct';
        } else {
            statusIcon = '✗';
            statusClass = 'incorrect';
        }
    }
    
    const isFlagged = AppState.flaggedQuestions.has(questionId);
    
    item.innerHTML = `
        <div class="review-item-header">
            <div class="review-item-info">
                <span class="domain-badge">ドメイン${domain}</span>
                <span class="question-number">問題 ${index + 1}</span>
            </div>
            <div class="review-item-status">
                ${isFlagged ? '<span class="flag-icon">🚩</span>' : ''}
                <span class="status-icon ${statusClass}">${statusIcon}</span>
            </div>
        </div>
        <div class="review-item-question">${question.text}</div>
    `;
    
    item.addEventListener('click', async () => {
        // 練習開始
        initPracticeMode(domain);
        AppState.currentQuestionIndex = index;
        
        // ビューを切り替え
        document.getElementById('review-view').style.display = 'none';
        document.getElementById('question-view').style.display = 'block';
        
        // 質問を表示
        const { displayQuestion } = await import('./question.js');
        await displayQuestion();
    });
    
    return item;
}