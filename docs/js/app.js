// メインアプリケーションファイル
import { AppState, STORAGE_KEYS, loadProgress, saveProgress, initPracticeMode, initRandomMode, toggleShuffle, loadShuffleSettings, resetShuffledOrder } from './modules/state.js';
import { displayQuestion, submitAnswer, nextQuestion, toggleFlag, selectChoice } from './modules/question.js';
import { updateProgressDisplay, updateStreak, updateAllDomainProgress, filterReviewQuestions } from './modules/progress.js';
import { startExam, reviewExamQuestions } from './modules/exam.js';
import { showView, toggleTheme, updateThemeToggle, startTimer, showLoadingMessage, hideLoadingMessage, showKeyboardHelp, showToast } from './modules/ui.js';
import { shuffleArray } from './modules/utils.js';

// グローバルに公開する関数
window.showView = showView;
window.reviewExamQuestions = reviewExamQuestions;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadProgress();
    setupEventListeners();
    setupKeyboardShortcuts();
    improveFocusManagement();
    updateStreak();
    
    // 初期進捗表示の更新
    setTimeout(async () => {
        await updateAllDomainProgress();
    }, 500);
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
    
    // シャッフルボタン
    document.getElementById('shuffle-btn').addEventListener('click', handleShuffleToggle);
    setupShuffleLongPress();
    
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

// 練習開始
async function startPractice(domain) {
    initPracticeMode(domain);
    
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
    await displayQuestion();
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
        randomQuestions = shuffleArray(allQuestions).slice(0, 5);
    }
    
    hideLoadingMessage();
    
    if (randomQuestions.length === 0) {
        alert('問題の読み込みに失敗しました。');
        return;
    }
    
    initRandomMode(randomQuestions);
    
    // 質問ビューを表示
    document.getElementById('practice-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
    // タイマー開始
    startTimer();
    
    // 最初の質問を表示
    await displayQuestion();
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
                        await nextQuestion();
                    } else if (submitBtn && !submitBtn.disabled) {
                        await submitAnswer();
                    }
                    break;
                    
                case 'ArrowRight':  // →キー
                    e.preventDefault();
                    const nextVisible = document.getElementById('next-question');
                    if (nextVisible && nextVisible.style.display !== 'none') {
                        await nextQuestion();
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
                        selectChoice(choiceIndex, isMultiple);
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
const originalUpdateProgressDisplay = updateProgressDisplay;
window.updateProgressDisplay = async function() {
    await originalUpdateProgressDisplay();
    await updateAllDomainProgress();
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
    
    const isEnabled = toggleShuffle();
    updateShuffleButton();
    
    if (isEnabled) {
        showToast('シャッフルを有効にしました');
        // 現在のドメインでシャッフル順序を作成
        if (AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            await resetShuffledOrder(AppState.currentDomain);
            await initPracticeMode(AppState.currentDomain);
            AppState.currentQuestionIndex = 0;
            await displayQuestion();
        }
    } else {
        showToast('シャッフルを無効にしました');
        // 現在の問題を維持しながらシャッフルを解除
        if (AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            AppState.currentQuestionIndex = AppState.originalQuestionIndex || 0;
            await displayQuestion();
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
    shuffleBtn.addEventListener('touchstart', handleShuffleLongPressStart);
    shuffleBtn.addEventListener('touchend', handleShuffleLongPressEnd);
    shuffleBtn.addEventListener('touchcancel', handleShuffleLongPressEnd);
}

function handleShuffleLongPressStart(e) {
    e.preventDefault();
    shuffleLongPressTimer = setTimeout(async () => {
        if (AppState.shuffleEnabled && AppState.currentDomain && !AppState.examMode && !AppState.randomMode) {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            showToast('シャッフルをリセットしました');
            await resetShuffledOrder(AppState.currentDomain);
            await initPracticeMode(AppState.currentDomain);
            AppState.currentQuestionIndex = 0;
            await displayQuestion();
        }
    }, 1000);
}

function handleShuffleLongPressEnd() {
    if (shuffleLongPressTimer) {
        clearTimeout(shuffleLongPressTimer);
        shuffleLongPressTimer = null;
    }
}

console.log('Modular app.js loaded successfully');