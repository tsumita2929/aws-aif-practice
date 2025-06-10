// メインアプリケーションファイル
// 必須モジュールのみ初期読み込み
import { AppState, STORAGE_KEYS, loadProgress, loadShuffleSettings } from './modules/state.js';
import { showView, toggleTheme, updateThemeToggle, showToast } from './modules/ui.js';

// 遅延読み込み用の関数
const lazyModules = {
    question: null,
    progress: null,
    exam: null,
    utils: null,
    stateFull: null
};

// モジュールの遅延読み込み
async function loadQuestionModule() {
    if (!lazyModules.question) {
        lazyModules.question = await import('./modules/question.js');
    }
    return lazyModules.question;
}

async function loadProgressModule() {
    if (!lazyModules.progress) {
        lazyModules.progress = await import('./modules/progress.js');
    }
    return lazyModules.progress;
}

async function loadExamModule() {
    if (!lazyModules.exam) {
        lazyModules.exam = await import('./modules/exam.js');
    }
    return lazyModules.exam;
}

async function loadUtilsModule() {
    if (!lazyModules.utils) {
        lazyModules.utils = await import('./modules/utils.js');
    }
    return lazyModules.utils;
}

async function loadStateFullModule() {
    if (!lazyModules.stateFull) {
        lazyModules.stateFull = await import('./modules/state.js');
    }
    return lazyModules.stateFull;
}

// グローバルに公開する関数
window.showView = showView;
window.reviewExamQuestions = async (...args) => {
    const exam = await loadExamModule();
    return exam.reviewExamQuestions(...args);
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadProgress();
    setupEventListeners();
    setupKeyboardShortcuts();
    improveFocusManagement();
    setupMobileThemeToggle();
    // Streakとドメイン進捗の遅延読み込み
    requestIdleCallback(async () => {
        const progress = await loadProgressModule();
        await progress.updateStreak();
        await progress.updateAllDomainProgress();
    }, { timeout: 1000 });
});

function initializeApp() {
    // テーマ設定の復元
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
    
    // シャッフル設定の読み込み
    loadShuffleSettings();
    updateShuffleButton();
    
    // 初期ビューの表示
    showView('practice');
}

// イベントリスナーの設定
function setupEventListeners() {
    // ナビゲーション
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            if (view) {
                showView(view);
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
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // ドメイン選択
    document.querySelectorAll('.domain-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const domain = parseInt(e.currentTarget.dataset.domain);
            startPractice(domain);
        });
    });
    
    // ランダム5問練習
    const randomPracticeBtn = document.getElementById('random-practice');
    if (randomPracticeBtn) {
        randomPracticeBtn.addEventListener('click', startRandomPractice);
    }
    
    // 戻るボタン
    const backToDomainsBtn = document.getElementById('back-to-domains');
    if (backToDomainsBtn) {
        backToDomainsBtn.addEventListener('click', () => {
            if (AppState.reviewMode) {
                // 復習モードの場合は復習画面に戻る
                showView('review');
                AppState.reviewMode = false; // フラグをリセット
            } else {
                // 通常の練習モードの場合はドメイン選択に戻る
                showView('practice');
            }
        });
    }
    
    // 回答送信
    const submitBtn = document.getElementById('submit-answer');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.submitAnswer();
        });
    }
    
    const nextBtn = document.getElementById('next-question');
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.nextQuestion();
        });
    }
    
    const nextBtnBottom = document.getElementById('next-question-bottom');
    if (nextBtnBottom) {
        nextBtnBottom.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.nextQuestion();
        });
    }
    
    const prevBtn = document.getElementById('prev-question');
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.prevQuestion();
        });
    }
    
    const prevBtnBottom = document.getElementById('prev-question-bottom');
    if (prevBtnBottom) {
        prevBtnBottom.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.prevQuestion();
        });
    }
    
    // ナビゲーションバーのボタン
    const navPrevBtn = document.getElementById('nav-prev-question');
    if (navPrevBtn) {
        navPrevBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.prevQuestion();
        });
    }
    
    const navNextBtn = document.getElementById('nav-next-question');
    if (navNextBtn) {
        navNextBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.nextQuestion();
        });
    }
    
    // フラグボタン
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
        flagBtn.addEventListener('click', async () => {
            const question = await loadQuestionModule();
            return question.toggleFlag();
        });
    }
    
    // シャッフルボタン
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', handleShuffleToggle);
    }
    setupShuffleLongPress();
    
    // 模擬試験開始
    const startExamBtn = document.getElementById('start-exam');
    if (startExamBtn) {
        startExamBtn.addEventListener('click', async () => {
            const exam = await loadExamModule();
            return exam.startExam();
        });
    }
    
    // 復習フィルター
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            const progress = await loadProgressModule();
            await progress.filterReviewQuestions(e.target.dataset.filter);
        });
    });
}

// 練習開始
async function startPractice(domain) {
    // state.jsからinitPracticeModeをインポート
    const stateMod = await loadStateFullModule();
    stateMod.initPracticeMode(domain);
    
    // 問題を事前に読み込む
    showLoadingMessage('問題を読み込んでいます...');
    const questions = await window.getQuestionsForDomain(domain);
    hideLoadingMessage();
    
    if (!questions || questions.length === 0) {
        alert('問題の読み込みに失敗しました。');
        return;
    }
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    startTimer();
    
    // 最初の質問を表示
    const questionMod = await loadQuestionModule();
    await questionMod.displayQuestion();
}

// ランダム5問練習開始
async function startRandomPractice() {
    showLoadingMessage('ランダムな問題を選択しています...');
    
    // 新しいローダーがある場合は使用
    let randomQuestions;
    if (window.QuestionsLoader && window.QuestionsLoader.getRandomQuestions) {
        randomQuestions = await window.QuestionsLoader.getRandomQuestions(5);
    } else {
        // 従来の方法
        const allQuestions = [];
        for (let domain = 1; domain <= 4; domain++) {
            const domainQuestions = await window.getQuestionsForDomain(domain);
            domainQuestions.forEach((q, index) => {
                allQuestions.push({
                    ...q,
                    domain: domain,
                    originalIndex: index
                });
            });
        }
        // utilsモジュールからshuffleArrayを取得
        const utilsMod = await loadUtilsModule();
        randomQuestions = utilsMod.shuffleArray(allQuestions).slice(0, 5);
    }
    
    hideLoadingMessage();
    
    if (randomQuestions.length === 0) {
        alert('問題の読み込みに失敗しました。');
        return;
    }
    
    // state.jsからinitRandomModeをインポート
    const stateMod = await loadStateFullModule();
    stateMod.initRandomMode(randomQuestions);
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    startTimer();
    
    // 最初の質問を表示
    const questionMod = await loadQuestionModule();
    await questionMod.displayQuestion();
}

// キーボードショートカット
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
        // 練習モードでのショートカット
        if ((AppState.currentView === 'practice' || document.getElementById('question-view').style.display === 'block') 
            && (AppState.currentDomain || AppState.randomMode || AppState.examMode)) {
            switch(e.key) {
                case ' ':  // スペースキー
                    e.preventDefault();
                    const nextBtn = document.getElementById('next-question');
                    const submitBtn = document.getElementById('submit-answer');
                    
                    if (nextBtn && nextBtn.style.display !== 'none') {
                        const questionMod = await loadQuestionModule();
                        await questionMod.nextQuestion();
                    } else if (submitBtn && !submitBtn.disabled) {
                        const questionMod = await loadQuestionModule();
                        await questionMod.submitAnswer();
                    }
                    break;
                    
                case 'ArrowRight':  // →キー
                    e.preventDefault();
                    const nextVisible = document.getElementById('next-question');
                    if (nextVisible && nextVisible.style.display !== 'none') {
                        const questionMod = await loadQuestionModule();
                        await questionMod.nextQuestion();
                    }
                    break;
                    
                case 'ArrowLeft':  // ←キー
                    e.preventDefault();
                    const prevVisible = document.getElementById('prev-question');
                    if (prevVisible && prevVisible.style.display !== 'none') {
                        const questionMod = await loadQuestionModule();
                        await questionMod.prevQuestion();
                    }
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
                        const isMultiple = document.getElementById('question-type').textContent.includes('複数');
                        const questionMod = await loadQuestionModule();
                        questionMod.selectChoice(choiceIndex, isMultiple);
                        // フォーカスを該当の選択肢に移動
                        choices[choiceIndex].focus();
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

// モバイルでのテーマ切り替えジェスチャー
function setupMobileThemeToggle() {
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        handleThemeSwipe();
    }, { passive: true });
    
    function handleThemeSwipe() {
        const swipeThreshold = 100;
        const swipeDistance = touchStartY - touchEndY;
        
        // 上から下へのスワイプでテーマ切り替え（画面上部1/4のエリアから開始した場合のみ）
        if (swipeDistance < -swipeThreshold && touchStartY < window.innerHeight / 4) {
            toggleTheme();
            showToast('テーマを切り替えました');
        }
    }
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
}

// 練習終了時の進捗更新
window.updateProgressDisplay = async function() {
    const progressMod = await loadProgressModule();
    await progressMod.updateProgressDisplay();
    await progressMod.updateAllDomainProgress();
};

// シャッフルボタンの更新
function updateShuffleButton() {
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        if (AppState.shuffleEnabled) {
            shuffleBtn.classList.add('active');
        } else {
            shuffleBtn.classList.remove('active');
        }
    }
}

// シャッフルトグルの処理
async function handleShuffleToggle() {
    // 練習途中の場合は確認
    if (AppState.currentDomain && !AppState.examMode && !AppState.randomMode && AppState.currentQuestionIndex > 0) {
        const confirmed = confirm('シャッフル設定を変更すると最初の問題に戻ります。続けますか？');
        if (!confirmed) {
            return;
        }
    }
    
    const questionContent = document.querySelector('.question-content');
    
    // シャッフルアニメーション
    if (questionContent) {
        questionContent.classList.add('shuffle-animation');
        await new Promise(resolve => setTimeout(resolve, 600));
        questionContent.classList.remove('shuffle-animation');
    }
    
    const stateMod = await loadStateFullModule();
    const isEnabled = stateMod.toggleShuffle();
    updateShuffleButton();
    
    if (isEnabled) {
        showToast('シャッフルを有効にしました');
        // 現在のドメインでシャッフル順序を作成
        if (AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            await stateMod.resetShuffledOrder(AppState.currentDomain);
            await stateMod.initPracticeMode(AppState.currentDomain);
            AppState.currentQuestionIndex = 0;
            const questionMod = await loadQuestionModule();
            await questionMod.displayQuestion();
        }
    } else {
        showToast('シャッフルを無効にしました');
        // 現在の問題を維持しながらシャッフルを解除
        if (AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            AppState.currentQuestionIndex = AppState.originalQuestionIndex || 0;
            const questionMod = await loadQuestionModule();
            await questionMod.displayQuestion();
        }
    }
}

// シャッフルボタンの長押し処理
let shuffleLongPressTimer = null;

function setupShuffleLongPress() {
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (!shuffleBtn) return;
    
    shuffleBtn.addEventListener('mousedown', handleShuffleLongPressStart);
    shuffleBtn.addEventListener('mouseup', handleShuffleLongPressEnd);
    shuffleBtn.addEventListener('mouseleave', handleShuffleLongPressEnd);
    shuffleBtn.addEventListener('touchstart', handleShuffleLongPressStart, { passive: true });
    shuffleBtn.addEventListener('touchend', handleShuffleLongPressEnd, { passive: true });
    shuffleBtn.addEventListener('touchcancel', handleShuffleLongPressEnd, { passive: true });
}

function handleShuffleLongPressStart(e) {
    // タッチイベントの場合はpassiveなのでpreventDefaultを呼ばない
    if (e.type === 'mousedown') {
        e.preventDefault();
    }
    shuffleLongPressTimer = setTimeout(async () => {
        if (AppState.shuffleEnabled && AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            showToast('シャッフルをリセットしました');
            const stateMod = await loadStateFullModule();
            await stateMod.resetShuffledOrder(AppState.currentDomain);
            await stateMod.initPracticeMode(AppState.currentDomain);
            AppState.currentQuestionIndex = 0;
            const questionMod = await loadQuestionModule();
            await questionMod.displayQuestion();
        }
    }, 1000);
}

function handleShuffleLongPressEnd() {
    if (shuffleLongPressTimer) {
        clearTimeout(shuffleLongPressTimer);
        shuffleLongPressTimer = null;
    }
}

// ローディングメッセージの表示
function showLoadingMessage(message) {
    const loadingEl = document.getElementById('loading-message') || createLoadingElement();
    loadingEl.textContent = message;
    loadingEl.style.display = 'block';
}

// ローディングメッセージの非表示
function hideLoadingMessage() {
    const loadingEl = document.getElementById('loading-message');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// ローディング要素の作成
function createLoadingElement() {
    const loading = document.createElement('div');
    loading.id = 'loading-message';
    loading.className = 'loading-message';
    loading.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
    `;
    document.body.appendChild(loading);
    return loading;
}

// タイマーの開始
function startTimer() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    
    let startTime = Date.now();
    
    // 既存のタイマーをクリア
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
    }
    
    // タイマーを更新
    window.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// キーボードヘルプの表示
function showKeyboardHelp() {
    alert(`キーボードショートカット:
    
スペースキー: 回答の送信 / 次の問題へ
→キー: 次の問題へ
←キー: 前の問題へ
1-5キー: 選択肢を選択
Ctrl/Cmd + F: フラグの切り替え
Shift + /: このヘルプを表示
Escape: モーダルを閉じる`);
}

// console.log('Modular app.js loaded successfully');