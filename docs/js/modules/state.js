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
    randomQuestions: []
};

// ローカルストレージのキー
export const STORAGE_KEYS = {
    PROGRESS: 'aws_aif_progress',
    THEME: 'aws_aif_theme',
    STREAK: 'aws_aif_streak',
    LAST_STUDY_DATE: 'aws_aif_last_study'
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