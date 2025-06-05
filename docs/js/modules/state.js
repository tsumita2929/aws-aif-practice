// 状態管理モジュール
export const AppState = {
    currentView: 'practice',
    currentDomain: null,
    currentQuestionIndex: 0,
    selectedAnswers: [],
    flaggedQuestions: new Set(),
    answeredQuestions: new Map(),
    bookmarkedQuestions: new Set(),
    startTime: null,
    totalTime: 0,
    streak: 0,
    examMode: false,
    examQuestions: [],
    examAnswers: [],
    examStartTime: null,
    randomMode: false,
    randomQuestions: [],
    shuffleEnabled: false,
    shuffledOrder: {},
    originalQuestionIndex: null
};

// ローカルストレージのキー
export const STORAGE_KEYS = {
    PROGRESS: 'aws_aif_progress',
    THEME: 'aws_aif_theme',
    STREAK: 'aws_aif_streak',
    LAST_STUDY_DATE: 'aws_aif_last_study',
    SHUFFLE_ENABLED: 'aws_aif_shuffle_enabled',
    SHUFFLED_ORDER: 'aws_aif_shuffled_order'
};

// 進捗データの保存
export function saveProgress() {
    const progress = {
        answeredQuestions: Array.from(AppState.answeredQuestions.entries()),
        flaggedQuestions: Array.from(AppState.flaggedQuestions),
        totalTime: AppState.totalTime,
        lastStudyDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

// 進捗データの読み込み
export function loadProgress() {
    const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        AppState.answeredQuestions = new Map(progress.answeredQuestions);
        AppState.flaggedQuestions = new Set(progress.flaggedQuestions);
        AppState.totalTime = progress.totalTime || 0;
        return true;
    }
    return false;
}

// 状態のリセット
export function resetState() {
    AppState.currentDomain = null;
    AppState.currentQuestionIndex = 0;
    AppState.selectedAnswers = [];
    AppState.examMode = false;
    AppState.randomMode = false;
}

// 練習モードの初期化
export function initPracticeMode(domain) {
    resetState();
    AppState.currentDomain = domain;
    AppState.startTime = Date.now();
    
    // シャッフル設定の読み込み
    loadShuffleSettings();
    
    // シャッフルが有効な場合、問題順序を作成
    if (AppState.shuffleEnabled && !AppState.shuffledOrder[domain]) {
        createShuffledOrder(domain);
    }
}

// ランダムモードの初期化
export function initRandomMode(questions) {
    resetState();
    AppState.randomMode = true;
    AppState.randomQuestions = questions;
    AppState.startTime = Date.now();
}

// 試験モードの初期化
export function initExamMode(questions) {
    resetState();
    AppState.examMode = true;
    AppState.examQuestions = questions;
    AppState.examAnswers = new Array(65).fill(null);
    AppState.examStartTime = Date.now();
    AppState.flaggedQuestions.clear();
}

// シャッフル設定の読み込み
export function loadShuffleSettings() {
    const shuffleEnabled = localStorage.getItem(STORAGE_KEYS.SHUFFLE_ENABLED);
    if (shuffleEnabled !== null) {
        AppState.shuffleEnabled = shuffleEnabled === 'true';
    }
    
    const shuffledOrder = localStorage.getItem(STORAGE_KEYS.SHUFFLED_ORDER);
    if (shuffledOrder) {
        AppState.shuffledOrder = JSON.parse(shuffledOrder);
    }
}

// シャッフル設定の保存
export function saveShuffleSettings() {
    localStorage.setItem(STORAGE_KEYS.SHUFFLE_ENABLED, AppState.shuffleEnabled);
    localStorage.setItem(STORAGE_KEYS.SHUFFLED_ORDER, JSON.stringify(AppState.shuffledOrder));
}

// シャッフル順序の作成
export async function createShuffledOrder(domain) {
    const questions = await window.getQuestionsForDomain(domain);
    const indices = Array.from({ length: questions.length }, (_, i) => i);
    
    // Fisher-Yatesシャッフルアルゴリズム
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    AppState.shuffledOrder[domain] = indices;
    saveShuffleSettings();
}

// シャッフル順序のリセット
export function resetShuffledOrder(domain = null) {
    if (domain) {
        delete AppState.shuffledOrder[domain];
    } else {
        AppState.shuffledOrder = {};
    }
    saveShuffleSettings();
}

// シャッフルの切り替え
export function toggleShuffle() {
    AppState.shuffleEnabled = !AppState.shuffleEnabled;
    
    if (!AppState.shuffleEnabled) {
        // シャッフルを無効にした場合、順序をリセット
        resetShuffledOrder();
    }
    
    saveShuffleSettings();
    return AppState.shuffleEnabled;
}

// 実際の問題インデックスを取得
export function getActualQuestionIndex(domain, displayIndex) {
    if (AppState.shuffleEnabled && AppState.shuffledOrder[domain]) {
        return AppState.shuffledOrder[domain][displayIndex];
    }
    return displayIndex;
}

// 表示用の問題インデックスを取得
export function getDisplayQuestionIndex(domain, actualIndex) {
    if (AppState.shuffleEnabled && AppState.shuffledOrder[domain]) {
        return AppState.shuffledOrder[domain].indexOf(actualIndex);
    }
    return actualIndex;
}