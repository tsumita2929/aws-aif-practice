// アプリケーションの状態管理
const AppState = {
    currentView: 'practice',
    currentDomain: null,
    currentQuestionIndex: 0,
    selectedAnswers: [],
    flaggedQuestions: new Set(),
    answeredQuestions: new Map(),
    bookmarkedQuestions: new Set(), // ブックマーク機能用
    startTime: null,
    totalTime: 0,
    streak: 0,
    examMode: false,
    examQuestions: [],
    examAnswers: [],
    examStartTime: null,
    randomMode: false,
    randomQuestions: []
};

// ローカルストレージのキー
const STORAGE_KEYS = {
    PROGRESS: 'aws_aif_progress',
    THEME: 'aws_aif_theme',
    STREAK: 'aws_aif_streak',
    LAST_STUDY_DATE: 'aws_aif_last_study'
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadProgress();
    setupEventListeners();
    setupKeyboardShortcuts();
    improveFocusManagement();
    updateStreak();
});

function initializeApp() {
    // テーマ設定の復元
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
    
    // 初期ビューの表示
    showView('practice');
}

function loadProgress() {
    const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        AppState.answeredQuestions = new Map(progress.answeredQuestions);
        AppState.flaggedQuestions = new Set(progress.flaggedQuestions);
        AppState.totalTime = progress.totalTime || 0;
        updateProgressDisplay();
    }
}

function saveProgress() {
    const progress = {
        answeredQuestions: Array.from(AppState.answeredQuestions.entries()),
        flaggedQuestions: Array.from(AppState.flaggedQuestions),
        totalTime: AppState.totalTime,
        lastStudyDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

// イベントリスナーの設定
function setupEventListeners() {
    // ナビゲーション
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            console.log('Navigation clicked:', view);
            if (view) {
                showView(view);
            } else {
                console.error('No view data attribute found');
            }
        });
    });
    
    // モバイルナビゲーション
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            if (view) {
                showView(view);
                // アクティブ状態を更新
                document.querySelectorAll('.mobile-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            }
        });
    });
    
    // テーマ切り替え
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // ドメイン選択
    document.querySelectorAll('.domain-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const domain = parseInt(e.currentTarget.dataset.domain);
            startPractice(domain);
        });
    });
    
    // ランダム5問練習
    document.getElementById('random-practice').addEventListener('click', startRandomPractice);
    
    // 戻るボタン
    document.getElementById('back-to-domains').addEventListener('click', () => {
        showView('practice');
    });
    
    // 回答送信
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    
    // フラグボタン
    document.getElementById('flag-btn').addEventListener('click', toggleFlag);
    
    // 模擬試験開始
    document.getElementById('start-exam').addEventListener('click', startExam);
    
    // 復習フィルター
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            await filterReviewQuestions(e.target.dataset.filter);
        });
    });
}

// ビュー管理
window.showView = function(viewName) {
    try {
        // すべてのビューを非表示
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none';
        });
        
        // ナビゲーションボタンの状態更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // モバイルナビゲーションボタンの状態更新
        document.querySelectorAll('.mobile-nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 選択されたビューを表示
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
        } else {
            console.error(`View not found: ${viewName}-view`);
            return;
        }
        
        // デスクトップナビゲーションのアクティブ状態を設定
        const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
        }
        
        // モバイルナビゲーションのアクティブ状態を設定
        const mobileNavItem = document.querySelector(`.mobile-nav-item[data-view="${viewName}"]`);
        if (mobileNavItem) {
            mobileNavItem.classList.add('active');
        }
        
        AppState.currentView = viewName;
        
        // ビュー固有の初期化
        switch (viewName) {
            case 'progress':
                updateProgressView();
                break;
            case 'review':
                loadReviewQuestions();
                break;
        }
    } catch (error) {
        console.error('Error in showView:', error);
    }
}

// テーマ切り替え
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// 練習開始
function startPractice(domain) {
    AppState.currentDomain = domain;
    AppState.currentQuestionIndex = 0;
    AppState.selectedAnswers = [];
    AppState.examMode = false;
    AppState.randomMode = false;
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    AppState.startTime = Date.now();
    startTimer();
    
    // 最初の質問を表示
    displayQuestion();
}

// ランダム5問練習開始
function startRandomPractice() {
    AppState.currentDomain = null;
    AppState.currentQuestionIndex = 0;
    AppState.selectedAnswers = [];
    AppState.examMode = false;
    AppState.randomMode = true;
    
    // ランダムに5問選択
    const allQuestions = [];
    for (let domain = 1; domain <= 4; domain++) {
        const domainQuestions = getQuestionsForDomain(domain);
        domainQuestions.forEach((q, index) => {
            allQuestions.push({
                ...q,
                domain: domain,
                originalIndex: index
            });
        });
    }
    
    // シャッフルして5問選択
    AppState.randomQuestions = shuffleArray(allQuestions).slice(0, 5);
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    AppState.startTime = Date.now();
    startTimer();
    
    // 最初の質問を表示
    displayQuestion();
}

// 質問表示
function displayQuestion() {
    let question;
    let totalQuestions;
    let currentDomain;
    
    if (AppState.randomMode) {
        question = AppState.randomQuestions[AppState.currentQuestionIndex];
        totalQuestions = AppState.randomQuestions.length;
        currentDomain = question ? question.domain : null;
    } else {
        const questions = getQuestionsForDomain(AppState.currentDomain);
        question = questions[AppState.currentQuestionIndex];
        totalQuestions = questions.length;
        currentDomain = AppState.currentDomain;
    }
    
    if (!question) {
        finishPractice();
        return;
    }
    
    // ヘッダー更新
    if (AppState.randomMode) {
        document.getElementById('current-domain').textContent = `ランダム練習 (ドメイン${currentDomain})`;
    } else {
        document.getElementById('current-domain').textContent = `ドメイン${currentDomain}`;
    }
    document.getElementById('question-number').textContent = `問題 ${AppState.currentQuestionIndex + 1}/${totalQuestions}`;
    
    // 質問タイプ
    const isMultiple = question.type === 'multiple';
    document.getElementById('question-type').textContent = isMultiple ? '複数選択（2つ選択）' : '単一選択';
    document.getElementById('question-type').className = `question-type-badge ${isMultiple ? 'multiple' : ''}`;
    
    // 質問文
    document.getElementById('question-text').textContent = question.text;
    
    // 選択肢
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const choiceElement = createChoiceElement(choice, index, isMultiple);
        choicesContainer.appendChild(choiceElement);
    });
    
    // フラグ状態
    const questionId = AppState.randomMode 
        ? `d${currentDomain}_q${question.originalIndex}` 
        : `d${AppState.currentDomain}_q${AppState.currentQuestionIndex}`;
    const flagBtn = document.getElementById('flag-btn');
    if (AppState.flaggedQuestions.has(questionId)) {
        flagBtn.classList.add('flagged');
    } else {
        flagBtn.classList.remove('flagged');
    }
    
    // ボタン状態
    document.getElementById('submit-answer').disabled = true;
    document.getElementById('submit-answer').style.display = 'block';
    document.getElementById('next-question').style.display = 'none';
    document.getElementById('explanation-panel').style.display = 'none';
    
    // 選択状態をリセット
    AppState.selectedAnswers = [];
}

function createChoiceElement(choice, index, isMultiple) {
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'choice';
    choiceDiv.dataset.index = index;
    
    const selector = document.createElement('div');
    selector.className = isMultiple ? 'choice-checkbox' : 'choice-radio';
    
    const content = document.createElement('div');
    content.className = 'choice-content';
    
    const label = document.createElement('span');
    label.className = 'choice-label';
    label.textContent = choice.label + ')';
    
    const text = document.createElement('span');
    text.className = 'choice-text';
    text.textContent = choice.text;
    
    content.appendChild(label);
    content.appendChild(text);
    choiceDiv.appendChild(selector);
    choiceDiv.appendChild(content);
    
    choiceDiv.addEventListener('click', () => selectChoice(index, isMultiple));
    
    return choiceDiv;
}

function selectChoice(index, isMultiple) {
    const choices = document.querySelectorAll('.choice');
    
    if (isMultiple) {
        // 複数選択
        const choice = choices[index];
        if (choice.classList.contains('selected')) {
            choice.classList.remove('selected');
            AppState.selectedAnswers = AppState.selectedAnswers.filter(i => i !== index);
        } else {
            if (AppState.selectedAnswers.length < 2) {
                choice.classList.add('selected');
                AppState.selectedAnswers.push(index);
            }
        }
    } else {
        // 単一選択
        choices.forEach(c => c.classList.remove('selected'));
        choices[index].classList.add('selected');
        AppState.selectedAnswers = [index];
    }
    
    // 回答ボタンの有効化（試験モードでは常に次へ進める）
    if (!AppState.examMode) {
        document.getElementById('submit-answer').disabled = AppState.selectedAnswers.length === 0;
    }
}

// displayQuestion関数の最後でスワイプジェスチャーと長押しを設定
const originalDisplayQuestionForGestures = displayQuestion;
displayQuestion = function() {
    originalDisplayQuestionForGestures.apply(this, arguments);
    setupSwipeGestures();
    setupLongPress();
    updateBookmarkUI();
}

function submitAnswer() {
    let question;
    let questionId;
    
    if (AppState.randomMode) {
        question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        const questions = getQuestionsForDomain(AppState.currentDomain);
        question = questions[AppState.currentQuestionIndex];
        questionId = `d${AppState.currentDomain}_q${AppState.currentQuestionIndex}`;
    }
    
    // 正解判定
    const isCorrect = checkAnswer(question, AppState.selectedAnswers);
    
    // 結果を保存
    AppState.answeredQuestions.set(questionId, {
        domain: AppState.currentDomain,
        questionIndex: AppState.currentQuestionIndex,
        selectedAnswers: AppState.selectedAnswers,
        isCorrect: isCorrect,
        timestamp: Date.now()
    });
    
    // 選択肢の状態更新
    const choices = document.querySelectorAll('.choice');
    choices.forEach((choice, index) => {
        choice.classList.add('disabled');
        choice.style.pointerEvents = 'none';
        
        if (question.correct.includes(index)) {
            choice.classList.add('correct');
        } else if (AppState.selectedAnswers.includes(index)) {
            choice.classList.add('incorrect');
        }
    });
    
    // 視覚的フィードバックを表示
    showFeedback(isCorrect);
    
    // 解説を表示
    displayExplanation(question, isCorrect);
    
    // ボタン状態更新
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'block';
    
    // 進捗を保存
    saveProgress();
    
    // 成果チェック
    checkAchievements();
}

function checkAnswer(question, selectedAnswers) {
    if (question.type === 'multiple') {
        return question.correct.length === selectedAnswers.length &&
               question.correct.every(c => selectedAnswers.includes(c));
    } else {
        return question.correct[0] === selectedAnswers[0];
    }
}

function displayExplanation(question, isCorrect) {
    const panel = document.getElementById('explanation-panel');
    panel.style.display = 'block';
    
    // 正解表示
    const correctAnswer = document.getElementById('correct-answer');
    const correctLabels = question.correct.map(i => question.choices[i].label).join(', ');
    correctAnswer.textContent = `正解: ${correctLabels}`;
    correctAnswer.className = isCorrect ? 'correct-answer' : 'correct-answer incorrect';
    
    // 解説
    const explanationContent = document.getElementById('explanation-content');
    explanationContent.innerHTML = question.explanation;
    
    // 関連リソース
    const resourcesContainer = document.getElementById('related-resources');
    if (question.resources && question.resources.length > 0) {
        resourcesContainer.innerHTML = `
            <h5>関連リソース</h5>
            <ul>
                ${question.resources.map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a></li>`).join('')}
            </ul>
        `;
    } else {
        resourcesContainer.innerHTML = '';
    }
}

function nextQuestion() {
    AppState.currentQuestionIndex++;
    displayQuestion();
}

function toggleFlag() {
    let questionId;
    
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${AppState.currentDomain}_q${AppState.currentQuestionIndex}`;
    }
    
    const flagBtn = document.getElementById('flag-btn');
    
    if (AppState.flaggedQuestions.has(questionId)) {
        AppState.flaggedQuestions.delete(questionId);
        flagBtn.classList.remove('flagged');
    } else {
        AppState.flaggedQuestions.add(questionId);
        flagBtn.classList.add('flagged');
    }
    
    saveProgress();
}

// タイマー管理
function startTimer() {
    const timerInterval = setInterval(() => {
        if (AppState.currentView !== 'practice' && !AppState.examMode) {
            clearInterval(timerInterval);
            return;
        }
        
        const elapsed = Math.floor((Date.now() - AppState.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// 練習終了
function finishPractice() {
    const elapsed = Date.now() - AppState.startTime;
    AppState.totalTime += elapsed;
    saveProgress();
    
    if (AppState.randomMode) {
        // ランダム練習の結果表示
        let correctCount = 0;
        AppState.randomQuestions.forEach((q, index) => {
            if (index < AppState.currentQuestionIndex) {
                const questionId = `d${q.domain}_q${q.originalIndex}`;
                const answer = AppState.answeredQuestions.get(questionId);
                if (answer && answer.isCorrect) correctCount++;
            }
        });
        
        const answeredCount = Math.min(AppState.currentQuestionIndex, 5);
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        alert(`ランダム練習が完了しました！\n\n` +
              `回答数: ${answeredCount}/5問\n` +
              `正解数: ${correctCount}問\n` +
              `正答率: ${accuracy}%\n\n` +
              `お疲れ様でした！`);
    } else {
        // 通常練習の結果表示
        const domain = AppState.currentDomain;
        const questions = getQuestionsForDomain(domain);
        const answeredCount = Array.from(AppState.answeredQuestions.keys())
            .filter(key => key.startsWith(`d${domain}_`)).length;
        const correctCount = Array.from(AppState.answeredQuestions.entries())
            .filter(([key, value]) => key.startsWith(`d${domain}_`) && value.isCorrect).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        alert(`ドメイン${domain}の練習が完了しました！\n\n` +
              `回答数: ${answeredCount}/${questions.length}問\n` +
              `正解数: ${correctCount}問\n` +
              `正答率: ${accuracy}%\n\n` +
              `お疲れ様でした！`);
    }
    
    showView('practice');
    updateProgressDisplay();
}

// 進捗表示の更新
function updateProgressDisplay() {
    // ドメインカードの進捗更新
    document.querySelectorAll('.domain-card').forEach(card => {
        const domain = parseInt(card.dataset.domain);
        const questions = getQuestionsForDomain(domain);
        const answered = Array.from(AppState.answeredQuestions.keys())
            .filter(key => key.startsWith(`d${domain}_`)).length;
        
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        
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
    });
}

// 進捗ビューの更新
function updateProgressView() {
    // 総合進捗
    const totalQuestions = window.getTotalQuestionCount(); // 全問題数を動的に取得
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
    updateDomainStats();
}

function updateDomainStats() {
    const container = document.getElementById('domain-stats');
    container.innerHTML = '';
    
    for (let domain = 1; domain <= 4; domain++) {
        const questions = getQuestionsForDomain(domain);
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
function updateStreak() {
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
function checkAchievements() {
    const totalAnswered = AppState.answeredQuestions.size;
    
    // 成果の定義
    const achievements = [
        { count: 1, title: '初めの一歩', desc: '最初の問題を解きました！' },
        { count: 10, title: '順調なスタート', desc: '10問解答しました！' },
        { count: 50, title: 'ハーフウェイ', desc: '50問解答しました！' },
        { count: 100, title: 'センチュリー', desc: '100問解答しました！' },
        { count: 160, title: 'コンプリート', desc: 'すべての問題を解答しました！' }
    ];
    
    const achievement = achievements.find(a => a.count === totalAnswered);
    if (achievement) {
        showAchievement(achievement.title, achievement.desc);
    }
}

function showAchievement(title, description) {
    const toast = document.getElementById('achievement-toast');
    document.getElementById('achievement-title').textContent = title;
    document.getElementById('achievement-desc').textContent = description;
    
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// 復習機能
async function loadReviewQuestions() {
    await filterReviewQuestions('all');
}

async function filterReviewQuestions(filter) {
    const container = document.getElementById('review-list');
    container.innerHTML = '<div style="text-align: center; padding: 20px;">読み込み中...</div>';
    
    let questions = [];
    
    try {
        // すべての質問を収集
        for (let domain = 1; domain <= 4; domain++) {
            const domainQuestions = await getQuestionsForDomainAsync(domain);
            if (domainQuestions && domainQuestions.length > 0) {
                domainQuestions.forEach((q, index) => {
                    const questionId = `d${domain}_q${index}`;
                    const answered = AppState.answeredQuestions.get(questionId);
                    
                    let include = false;
                    switch (filter) {
                        case 'all':
                            include = true;
                            break;
                        case 'incorrect':
                            include = answered && !answered.isCorrect;
                            break;
                        case 'flagged':
                            include = AppState.flaggedQuestions.has(questionId);
                            break;
                        case 'unseen':
                            include = !answered;
                            break;
                    }
                    
                    if (include) {
                        questions.push({
                            domain,
                            index,
                            question: q,
                            answered,
                            questionId
                        });
                    }
                });
            }
        }
        
        // コンテナをクリア
        container.innerHTML = '';
        
        // 質問を表示
        if (questions.length > 0) {
            questions.forEach(({ domain, index, question, answered, questionId }) => {
                const item = createReviewItem(domain, index, question, answered, questionId);
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
    
    item.addEventListener('click', () => {
        AppState.currentDomain = domain;
        AppState.currentQuestionIndex = index;
        startPractice(domain);
    });
    
    return item;
}

// 質問データの取得（モジュラー構造に対応）
function getQuestionsForDomain(domain) {
    // window.questionsData が利用可能な場合はそれを使用（後方互換性）
    if (window.questionsData) {
        return window.questionsData[`domain${domain}`] || [];
    }
    // フォールバック：空の配列
    return [];
}

// 総問題数を取得
window.getTotalQuestionCount = function() {
    let total = 0;
    for (let domain = 1; domain <= 4; domain++) {
        total += getQuestionsForDomain(domain).length;
    }
    return total;
}

// 模擬試験開始
function startExam() {
    AppState.examMode = true;
    AppState.examQuestions = generateExamQuestions();
    AppState.examAnswers = new Array(65).fill(null);
    AppState.currentQuestionIndex = 0;
    AppState.examStartTime = Date.now();
    AppState.flaggedQuestions.clear(); // 試験中のフラグをクリア
    
    // 試験画面を表示
    document.getElementById('exam-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // 試験タイマー開始
    startExamTimer();
    
    // 最初の問題を表示
    displayExamQuestion();
}

// 試験問題の生成（実際の配分に基づく）
function generateExamQuestions() {
    const examQuestions = [];
    
    // ドメイン別の問題数
    const domainDistribution = {
        1: 16, // 25%
        2: 23, // 35%
        3: 13, // 20%
        4: 13  // 20%
    };
    
    // 各ドメインから問題をランダムに選択
    for (const [domain, count] of Object.entries(domainDistribution)) {
        const domainQuestions = getQuestionsForDomain(parseInt(domain));
        let selected = [];
        
        if (domainQuestions.length >= count) {
            // 十分な問題がある場合
            const shuffled = shuffleArray([...domainQuestions]);
            selected = shuffled.slice(0, count);
        } else {
            // 問題が不足している場合は、繰り返し使用
            selected = [...domainQuestions];
            while (selected.length < count) {
                const shuffled = shuffleArray([...domainQuestions]);
                const needed = count - selected.length;
                selected.push(...shuffled.slice(0, Math.min(needed, domainQuestions.length)));
            }
        }
        
        selected.forEach(q => {
            examQuestions.push({
                ...q,
                domain: parseInt(domain)
            });
        });
    }
    
    // 全体をシャッフル
    return shuffleArray(examQuestions);
}

// 配列のシャッフル（Fisher-Yates）
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 試験タイマー
function startExamTimer() {
    const examDuration = 90 * 60 * 1000; // 90分
    
    const timerInterval = setInterval(() => {
        if (!AppState.examMode) {
            clearInterval(timerInterval);
            return;
        }
        
        const elapsed = Date.now() - AppState.examStartTime;
        const remaining = Math.max(0, examDuration - elapsed);
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        document.getElementById('timer').textContent = 
            `残り時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 時間切れ
        if (remaining === 0) {
            clearInterval(timerInterval);
            finishExam();
        }
    }, 1000);
}

// 試験問題の表示
function displayExamQuestion() {
    const question = AppState.examQuestions[AppState.currentQuestionIndex];
    
    if (!question) {
        finishExam();
        return;
    }
    
    // ヘッダー更新
    document.getElementById('current-domain').textContent = `模擬試験`;
    document.getElementById('question-number').textContent = 
        `問題 ${AppState.currentQuestionIndex + 1}/65`;
    
    // 問題表示（通常の表示関数を再利用）
    const isMultiple = question.type === 'multiple';
    document.getElementById('question-type').textContent = 
        isMultiple ? '複数選択（2つ選択）' : '単一選択';
    document.getElementById('question-type').className = 
        `question-type-badge ${isMultiple ? 'multiple' : ''}`;
    
    document.getElementById('question-text').textContent = question.text;
    
    // 選択肢
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const choiceElement = createChoiceElement(choice, index, isMultiple);
        choicesContainer.appendChild(choiceElement);
    });
    
    // 保存済みの回答を復元
    if (AppState.examAnswers[AppState.currentQuestionIndex]) {
        AppState.examAnswers[AppState.currentQuestionIndex].forEach(index => {
            selectChoice(index, isMultiple);
        });
    }
    
    // ボタン状態（試験モードでは解説を表示しない）
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'block';
    document.getElementById('next-question').textContent = 
        AppState.currentQuestionIndex < 64 ? '次の問題' : '試験を終了';
    document.getElementById('explanation-panel').style.display = 'none';
    
    // フラグボタンを表示
    document.getElementById('flag-btn').style.display = 'block';
}

// 試験モードでの次の問題
function nextExamQuestion() {
    // 現在の回答を保存
    AppState.examAnswers[AppState.currentQuestionIndex] = AppState.selectedAnswers;
    
    AppState.currentQuestionIndex++;
    AppState.selectedAnswers = [];
    
    if (AppState.currentQuestionIndex < AppState.examQuestions.length) {
        displayExamQuestion();
    } else {
        finishExam();
    }
}

// 試験終了
function finishExam() {
    AppState.examMode = false;
    
    // 結果を計算
    let correct = 0;
    let answered = 0;
    
    AppState.examQuestions.forEach((question, index) => {
        const userAnswers = AppState.examAnswers[index];
        if (userAnswers && userAnswers.length > 0) {
            answered++;
            if (checkAnswer(question, userAnswers)) {
                correct++;
            }
        }
    });
    
    const score = Math.round((correct / 65) * 100);
    const passed = score >= 70;
    
    // 結果画面を表示
    showExamResults(correct, answered, score, passed);
}

// 試験結果の表示
function showExamResults(correct, answered, score, passed) {
    const resultsHTML = `
        <div class="exam-results">
            <h2>模擬試験結果</h2>
            <div class="result-summary ${passed ? 'passed' : 'failed'}">
                <div class="score-display">
                    <div class="score-value">${score}%</div>
                    <div class="score-label">${passed ? '合格' : '不合格'}</div>
                </div>
                <div class="result-details">
                    <p>正解数: ${correct}/65</p>
                    <p>回答数: ${answered}/65</p>
                    <p>未回答: ${65 - answered}問</p>
                    <p>合格ライン: 70%</p>
                </div>
            </div>
            <div class="domain-breakdown">
                <h3>ドメイン別結果</h3>
                ${generateDomainBreakdown()}
            </div>
            <div class="exam-actions">
                <button class="btn btn-primary" onclick="reviewExamQuestions()">問題を確認</button>
                <button class="btn btn-secondary" onclick="window.showView('exam')">試験選択に戻る</button>
            </div>
        </div>
    `;
    
    document.getElementById('question-view').innerHTML = resultsHTML;
}

// ドメイン別の結果を生成
function generateDomainBreakdown() {
    const domainResults = {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 }
    };
    
    AppState.examQuestions.forEach((question, index) => {
        const domain = question.domain;
        domainResults[domain].total++;
        
        const userAnswers = AppState.examAnswers[index];
        if (userAnswers && checkAnswer(question, userAnswers)) {
            domainResults[domain].correct++;
        }
    });
    
    let html = '<div class="domain-results">';
    for (const [domain, result] of Object.entries(domainResults)) {
        const percentage = Math.round((result.correct / result.total) * 100);
        html += `
            <div class="domain-result-item">
                <span>ドメイン${domain}</span>
                <span>${result.correct}/${result.total} (${percentage}%)</span>
            </div>
        `;
    }
    html += '</div>';
    
    return html;
}

// 試験問題のレビュー
window.reviewExamQuestions = function() {
    // 簡易的なレビュー表示
    let reviewHTML = '<h2>試験結果レビュー</h2><div style="max-height: 400px; overflow-y: auto;">';
    
    AppState.examQuestions.forEach((question, index) => {
        const userAnswers = AppState.examAnswers[index];
        const isCorrect = userAnswers && userAnswers.length > 0 && checkAnswer(question, userAnswers);
        const status = userAnswers && userAnswers.length > 0 ? (isCorrect ? '✓ 正解' : '✗ 不正解') : '- 未回答';
        
        reviewHTML += `
            <div style="margin-bottom: 10px; padding: 10px; background: ${isCorrect ? '#e8f5e9' : userAnswers ? '#ffebee' : '#f5f5f5'}; border-radius: 4px;">
                <strong>問題 ${index + 1}</strong> (ドメイン${question.domain}): ${status}
            </div>
        `;
    });
    
    reviewHTML += '</div><button onclick="window.showView(\'exam\')" style="margin-top: 20px; padding: 10px 20px; background: #FF9900; color: white; border: none; border-radius: 4px; cursor: pointer;">閉じる</button>';
    
    document.getElementById('question-view').innerHTML = reviewHTML;
}

// nextQuestion関数を修正して試験モードに対応
const originalNextQuestion = nextQuestion;
nextQuestion = function() {
    if (AppState.examMode) {
        nextExamQuestion();
    } else {
        originalNextQuestion();
    }
};

// 視覚的フィードバック機能
function showFeedback(isCorrect) {
    const feedbackIcon = document.getElementById('feedback-icon');
    
    // アイコンの設定
    feedbackIcon.innerHTML = isCorrect ? '✓' : '✗';
    feedbackIcon.className = `feedback-icon show ${isCorrect ? 'correct' : 'incorrect'}`;
    
    // アニメーション後に非表示
    setTimeout(() => {
        feedbackIcon.classList.remove('show');
    }, 800);
    
    // 達成時の紙吹雪エフェクト
    if (isCorrect && shouldShowConfetti()) {
        showConfetti();
    }
}

// 紙吹雪を表示する条件
function shouldShowConfetti() {
    const totalQuestions = window.getTotalQuestionCount ? window.getTotalQuestionCount() : 200;
    const correctCount = Array.from(AppState.answeredQuestions.values())
        .filter(a => a.isCorrect).length;
    
    // 10問ごと、25%、50%、75%、100%達成時
    return correctCount > 0 && (
        correctCount % 10 === 0 || 
        correctCount === Math.floor(totalQuestions * 0.25) ||
        correctCount === Math.floor(totalQuestions * 0.50) ||
        correctCount === Math.floor(totalQuestions * 0.75) ||
        correctCount === totalQuestions
    );
}

// 紙吹雪エフェクト
function showConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    
    const confetti = [];
    const colors = ['#FF9900', '#28a745', '#17a2b8', '#ffc107', '#dc3545'];
    
    // 紙吹雪の作成
    for (let i = 0; i < 100; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 6 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: Math.random() * 0.2 - 0.1
        });
    }
    
    // アニメーション
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            
            // 画面外に出たら削除
            if (p.y > canvas.height) {
                confetti.splice(index, 1);
            }
        });
        
        if (confetti.length > 0) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none';
        }
    }
    
    animate();
}

// スワイプ機能の実装
let touchStartX = 0;
let touchEndX = 0;

function setupSwipeGestures() {
    const questionContent = document.getElementById('question-content');
    if (!questionContent) return;
    
    questionContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    questionContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50; // 最小スワイプ距離
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) < swipeThreshold) return;
    
    if (swipeDistance < 0) {
        // 左スワイプ - 次の問題へ
        const nextBtn = document.getElementById('next-question');
        if (nextBtn && nextBtn.style.display !== 'none') {
            nextQuestion();
        }
    } else {
        // 右スワイプ - 前の問題へ（実装する場合）
        // previousQuestion();
    }
}

// 長押しでブックマーク機能
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // 500msで長押し判定

function setupLongPress() {
    const questionCard = document.querySelector('.question-card');
    if (!questionCard) return;
    
    // タッチイベント
    questionCard.addEventListener('touchstart', handleLongPressStart, { passive: true });
    questionCard.addEventListener('touchend', handleLongPressEnd, { passive: true });
    questionCard.addEventListener('touchcancel', handleLongPressEnd, { passive: true });
    
    // マウスイベント（デスクトップ対応）
    questionCard.addEventListener('mousedown', handleLongPressStart);
    questionCard.addEventListener('mouseup', handleLongPressEnd);
    questionCard.addEventListener('mouseleave', handleLongPressEnd);
}

function handleLongPressStart(e) {
    // 選択肢をクリックした場合は長押しを無視
    if (e.target.closest('.choice')) return;
    
    longPressTimer = setTimeout(() => {
        toggleBookmark();
        // 振動フィードバック（対応デバイスのみ）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, LONG_PRESS_DURATION);
}

function handleLongPressEnd() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function toggleBookmark() {
    let questionId;
    
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${AppState.currentDomain}_q${AppState.currentQuestionIndex}`;
    }
    
    if (AppState.bookmarkedQuestions.has(questionId)) {
        AppState.bookmarkedQuestions.delete(questionId);
        showToast('ブックマークを解除しました');
    } else {
        AppState.bookmarkedQuestions.add(questionId);
        showToast('ブックマークに追加しました');
    }
    
    updateBookmarkUI();
    saveProgress();
}

function updateBookmarkUI() {
    let questionId;
    
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${AppState.currentDomain}_q${AppState.currentQuestionIndex}`;
    }
    
    const isBookmarked = AppState.bookmarkedQuestions.has(questionId);
    
    // ブックマークアイコンの更新（UIに追加する場合）
    const bookmarkIcon = document.getElementById('bookmark-icon');
    if (bookmarkIcon) {
        bookmarkIcon.classList.toggle('active', isBookmarked);
    }
}

// トースト通知
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 24px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// キーボードショートカット
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 練習モードでのショートカット
        if (AppState.currentView === 'practice' && AppState.currentDomain) {
            switch(e.key) {
                case ' ':  // スペースキー
                    e.preventDefault();
                    const nextBtn = document.getElementById('next-question');
                    const submitBtn = document.getElementById('submit-answer');
                    
                    if (nextBtn && nextBtn.style.display !== 'none') {
                        nextQuestion();
                    } else if (submitBtn && !submitBtn.disabled) {
                        submitAnswer();
                    }
                    break;
                    
                case 'ArrowRight':  // →キー
                    e.preventDefault();
                    const nextVisible = document.getElementById('next-question');
                    if (nextVisible && nextVisible.style.display !== 'none') {
                        nextQuestion();
                    }
                    break;
                    
                case 'ArrowLeft':  // ←キー（将来的に前の問題機能を実装する場合）
                    e.preventDefault();
                    // previousQuestion();
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    // 数字キーで選択肢を選択
                    const choiceIndex = parseInt(e.key) - 1;
                    const choices = document.querySelectorAll('.choice');
                    if (choices[choiceIndex]) {
                        selectChoice(choiceIndex, false);
                        // フォーカスを該当の選択肢に移動
                        choices[choiceIndex].focus();
                    }
                    break;
                    
                case 'b':  // ブックマーク
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleBookmark();
                    }
                    break;
                    
                case 'f':  // フラグ
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const flagBtn = document.getElementById('flag-btn');
                        if (flagBtn) flagBtn.click();
                    }
                    break;
                    
                case '?':  // ヘルプ（Shift + /）
                    if (e.shiftKey) {
                        e.preventDefault();
                        showKeyboardHelp();
                    }
                    break;
            }
        }
        
        // グローバルショートカット
        switch(e.key) {
            case 'Escape':
                // モーダルを閉じる
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                });
                break;
        }
    });
}

// キーボードヘルプを表示
function showKeyboardHelp() {
    const helpText = `
キーボードショートカット：
━━━━━━━━━━━━━━━━━━
スペース     : 次へ進む / 回答送信
→           : 次の問題へ
1-5         : 選択肢を選択
Ctrl/Cmd+B  : ブックマーク切替
Ctrl/Cmd+F  : フラグ切替
Shift+?     : このヘルプを表示
Esc         : ダイアログを閉じる
━━━━━━━━━━━━━━━━━━
    `;
    alert(helpText);
}

// フォーカス管理の改善
function improveFocusManagement() {
    // フォーカス可能な要素にtabindexを設定
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    // モーダルが開いている時のフォーカストラップ
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const activeModal = document.querySelector('.modal[style*="block"]');
            if (activeModal) {
                const focusableElements = activeModal.querySelectorAll(focusableSelectors);
                const firstFocusable = focusableElements[0];
                const lastFocusable = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });
    
    // ビュー切り替え時のフォーカス管理
    const originalShowView = showView;
    window.showView = function(viewName) {
        originalShowView(viewName);
        
        // 新しいビューの最初のインタラクティブ要素にフォーカス
        setTimeout(() => {
            const view = document.querySelector(`#${viewName}-view`);
            if (view) {
                const firstInteractive = view.querySelector(focusableSelectors);
                if (firstInteractive) {
                    firstInteractive.focus();
                }
            }
        }, 100);
    };
}

// スクリーンリーダー用の通知関数
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.left = '-9999px';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

// ========== 非同期対応と進捗表示の拡張 ==========

// ========== async-patch.jsの内容 ==========

// getQuestionsForDomainを非同期化
window.getQuestionsForDomainAsync = async function(domain) {
    // 既存のquestionsDataがある場合
    if (window.questionsData) {
        return window.questionsData[`domain${domain}`] || [];
    }
    // 新しいローダーを使用
    return await window.QuestionsLoader.loadDomainQuestions(domain);
};

// startPracticeを非同期化（オーバーライド）
const originalStartPractice = window.startPractice;
window.startPractice = async function(domain) {
    AppState.currentDomain = domain;
    AppState.currentQuestionIndex = 0;
    AppState.selectedAnswers = [];
    AppState.examMode = false;
    AppState.randomMode = false;
    
    // 問題を事前に読み込む
    showLoadingMessage('問題を読み込んでいます...');
    const questions = await getQuestionsForDomainAsync(domain);
    hideLoadingMessage();
    
    if (!questions || questions.length === 0) {
        alert('問題の読み込みに失敗しました。');
        return;
    }
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    AppState.startTime = Date.now();
    startTimer();
    
    // 最初の質問を表示
    displayQuestion();
};

// startRandomPracticeを非同期化（オーバーライド）
const originalStartRandomPractice = window.startRandomPractice;
window.startRandomPractice = async function() {
    AppState.currentDomain = null;
    AppState.currentQuestionIndex = 0;
    AppState.selectedAnswers = [];
    AppState.examMode = false;
    AppState.randomMode = true;
    
    showLoadingMessage('ランダムな問題を選択しています...');
    
    // 新しいローダーがある場合は使用
    if (window.QuestionsLoader && window.QuestionsLoader.getRandomQuestions) {
        AppState.randomQuestions = await window.QuestionsLoader.getRandomQuestions(5);
    } else {
        // 従来の方法
        const allQuestions = [];
        for (let domain = 1; domain <= 4; domain++) {
            const domainQuestions = await getQuestionsForDomainAsync(domain);
            domainQuestions.forEach((q, index) => {
                allQuestions.push({
                    ...q,
                    domain: domain,
                    originalIndex: index
                });
            });
        }
        AppState.randomQuestions = shuffleArray(allQuestions).slice(0, 5);
    }
    
    hideLoadingMessage();
    
    if (AppState.randomQuestions.length === 0) {
        alert('問題の読み込みに失敗しました。');
        return;
    }
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    AppState.startTime = Date.now();
    startTimer();
    
    // 最初の質問を表示
    displayQuestion();
};

// displayQuestionを非同期対応（オーバーライド）
const originalDisplayQuestionAsync = window.displayQuestion;
window.displayQuestion = async function() {
    let question;
    let totalQuestions;
    let currentDomain;
    
    if (AppState.randomMode) {
        question = AppState.randomQuestions[AppState.currentQuestionIndex];
        totalQuestions = AppState.randomQuestions.length;
        currentDomain = question ? question.domain : null;
    } else if (AppState.examMode) {
        question = AppState.examQuestions[AppState.currentQuestionIndex];
        totalQuestions = AppState.examQuestions.length;
        currentDomain = question ? question.domain : null;
    } else {
        const questions = await getQuestionsForDomainAsync(AppState.currentDomain);
        question = questions[AppState.currentQuestionIndex];
        totalQuestions = questions.length;
        currentDomain = AppState.currentDomain;
    }
    
    if (!question) {
        finishPractice();
        return;
    }
    
    // 一時的に質問データを設定
    if (!AppState.examMode && !AppState.randomMode) {
        const questions = await getQuestionsForDomainAsync(AppState.currentDomain);
        window.tempQuestions = questions;
        window.getQuestionsForDomain = function() { return window.tempQuestions; };
    }
    
    originalDisplayQuestionAsync.call(this);
    
    // クリーンアップ
    delete window.tempQuestions;
};

// startExamを非同期化（オーバーライド）
const originalStartExam = window.startExam;
window.startExam = async function() {
    AppState.examMode = true;
    
    showLoadingMessage('試験問題を準備しています...');
    
    if (window.QuestionsLoader && window.QuestionsLoader.generateExamQuestions) {
        AppState.examQuestions = await window.QuestionsLoader.generateExamQuestions();
    } else {
        AppState.examQuestions = await generateExamQuestionsAsync();
    }
    
    hideLoadingMessage();
    
    AppState.examAnswers = new Array(65).fill(null);
    AppState.currentQuestionIndex = 0;
    AppState.examStartTime = Date.now();
    AppState.flaggedQuestions.clear();
    
    // 試験画面を表示
    document.getElementById('exam-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    startExamTimer();
    
    // 最初の問題を表示
    displayExamQuestion();
};

// generateExamQuestionsを非同期化
async function generateExamQuestionsAsync() {
    const examQuestions = [];
    
    const domainDistribution = {
        1: 16, // 25%
        2: 23, // 35%
        3: 13, // 20%
        4: 13  // 20%
    };
    
    for (const [domain, count] of Object.entries(domainDistribution)) {
        const domainQuestions = await getQuestionsForDomainAsync(parseInt(domain));
        let selected = [];
        
        if (domainQuestions.length >= count) {
            const shuffled = shuffleArray([...domainQuestions]);
            selected = shuffled.slice(0, count);
        } else {
            selected = [...domainQuestions];
            while (selected.length < count) {
                const shuffled = shuffleArray([...domainQuestions]);
                const needed = count - selected.length;
                selected.push(...shuffled.slice(0, Math.min(needed, domainQuestions.length)));
            }
        }
        
        selected.forEach(q => {
            examQuestions.push({
                ...q,
                domain: parseInt(domain)
            });
        });
    }
    
    return shuffleArray(examQuestions);
}

// getTotalQuestionCountを非同期化（オーバーライド）
const originalGetTotalQuestionCount = window.getTotalQuestionCount;
window.getTotalQuestionCount = async function() {
    if (window.questionsData) {
        // 従来の同期的な方法
        let total = 0;
        for (let domain = 1; domain <= 4; domain++) {
            const questions = window.questionsData[`domain${domain}`] || [];
            total += questions.length;
        }
        return total;
    } else {
        // 新しい非同期的な方法
        let total = 0;
        for (let domain = 1; domain <= 4; domain++) {
            const index = await window.QuestionsLoader.loadDomainIndex(domain);
            if (index) {
                total += index.questionCount;
            }
        }
        return total;
    }
};

// updateProgressViewを非同期化（オーバーライド）
const originalUpdateProgressView = window.updateProgressView;
window.updateProgressView = async function() {
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
};

// updateDomainStatsを非同期化（オーバーライド）
const originalUpdateDomainStats = window.updateDomainStats;
window.updateDomainStats = async function() {
    const container = document.getElementById('domain-stats');
    container.innerHTML = '';
    
    for (let domain = 1; domain <= 4; domain++) {
        const questions = await getQuestionsForDomainAsync(domain);
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
};

// ローディングメッセージ
function showLoadingMessage(message) {
    const loading = document.createElement('div');
    loading.id = 'loading-message';
    loading.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary);
        padding: 20px 40px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    loading.innerHTML = `
        <div class="loading" style="width: 20px; height: 20px;"></div>
        <span>${message}</span>
    `;
    document.body.appendChild(loading);
}

function hideLoadingMessage() {
    const loading = document.getElementById('loading-message');
    if (loading) {
        loading.remove();
    }
}

// ========== update-progress-display.jsの内容 ==========

// ページ読み込み時に進捗を更新
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - Starting progress update');
    // 少し遅延させてapp.jsの初期化後に実行
    setTimeout(async () => {
        console.log('Updating all domain progress...');
        await updateAllDomainProgress();
    }, 500);
});

// すべてのドメインの進捗を更新
async function updateAllDomainProgress() {
    for (let domain = 1; domain <= 4; domain++) {
        await updateDomainProgress(domain);
    }
}

// 特定のドメインの進捗を更新
async function updateDomainProgress(domain) {
    const card = document.querySelector(`[data-domain="${domain}"]`);
    if (!card) return;
    
    const progressText = card.querySelector('.progress-text');
    const progressFill = card.querySelector('.progress-fill');
    
    try {
        // 問題数を取得
        let totalQuestions = 0;
        
        console.log(`Updating domain ${domain} progress...`);
        
        // 新しいローダーを使用
        if (window.QuestionsLoader && window.QuestionsLoader.loadDomainIndex) {
            console.log('Using QuestionsLoader');
            const index = await window.QuestionsLoader.loadDomainIndex(domain);
            if (index) {
                totalQuestions = index.questionCount;
                console.log(`Domain ${domain}: ${totalQuestions} questions`);
            }
        } else if (window.getQuestionsForDomain) {
            // 従来の方法
            console.log('Using getQuestionsForDomain');
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

// 元のupdateProgressDisplay関数を拡張
const originalUpdateProgressDisplay2 = window.updateProgressDisplay;
window.updateProgressDisplay = async function() {
    // 元の関数があれば実行
    if (originalUpdateProgressDisplay2) {
        await originalUpdateProgressDisplay2.call(this);
    }
    
    // 非同期で進捗を更新
    await updateAllDomainProgress();
};

// showView関数を拡張
const originalShowView2 = window.showView;
window.showView = async function(viewName) {
    // 元の関数を実行
    if (originalShowView2) {
        await originalShowView2.call(this, viewName);
    }
    
    // practiceビューの場合は進捗を更新
    if (viewName === 'practice') {
        await updateAllDomainProgress();
    }
};

// 練習終了時も進捗を更新
const originalFinishPractice = window.finishPractice;
window.finishPractice = function() {
    // 元の関数を実行
    if (originalFinishPractice) {
        originalFinishPractice.call(this);
    }
    
    // 非同期で進捗を更新
    setTimeout(async () => {
        await updateAllDomainProgress();
    }, 100);
};

console.log('Integrated app.js loaded successfully');