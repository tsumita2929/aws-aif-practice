// 質問表示・回答処理モジュール
import { AppState, saveProgress, getActualQuestionIndex } from './state.js';
import { showFeedback, announceToScreenReader } from './ui.js';
import { checkAchievements } from './progress.js';

// 質問の表示
export async function displayQuestion() {
    let question;
    let totalQuestions;
    let currentDomain;
    let actualIndex;
    
    if (AppState.randomMode) {
        question = AppState.randomQuestions[AppState.currentQuestionIndex];
        totalQuestions = AppState.randomQuestions.length;
        currentDomain = question ? question.domain : null;
        actualIndex = AppState.currentQuestionIndex;
    } else if (AppState.examMode) {
        question = AppState.examQuestions[AppState.currentQuestionIndex];
        totalQuestions = AppState.examQuestions.length;
        currentDomain = question ? question.domain : null;
        actualIndex = AppState.currentQuestionIndex;
    } else {
        const questions = await window.getQuestionsForDomain(AppState.currentDomain);
        actualIndex = getActualQuestionIndex(AppState.currentDomain, AppState.currentQuestionIndex);
        question = questions[actualIndex];
        totalQuestions = questions.length;
        currentDomain = AppState.currentDomain;
        
        // 元のインデックスを保存（進捗保存用）
        AppState.originalQuestionIndex = actualIndex;
    }
    
    if (!question) {
        finishPractice();
        return;
    }
    
    // ヘッダー更新
    updateQuestionHeader(currentDomain, totalQuestions);
    
    // 質問タイプ
    const isMultiple = question.type === 'multiple';
    updateQuestionType(isMultiple);
    
    // 質問文
    document.getElementById('question-text').textContent = question.text;
    
    // 選択肢
    displayChoices(question, isMultiple);
    
    // フラグ状態
    updateFlagStatus();
    
    // ボタン状態
    resetQuestionButtons();
    
    // 選択状態をリセット
    AppState.selectedAnswers = [];
    
    // ジェスチャーとブックマークの設定
    setupQuestionGestures();
}

// 質問ヘッダーの更新
function updateQuestionHeader(currentDomain, totalQuestions) {
    if (AppState.randomMode) {
        document.getElementById('current-domain').textContent = `ランダム練習 (ドメイン${currentDomain})`;
    } else if (AppState.examMode) {
        document.getElementById('current-domain').textContent = `模擬試験`;
    } else {
        document.getElementById('current-domain').textContent = `ドメイン${currentDomain}`;
    }
    document.getElementById('question-number').textContent = `問題 ${AppState.currentQuestionIndex + 1}/${totalQuestions}`;
    
    // シャッフルインジケーターの更新
    const shuffleIndicator = document.getElementById('shuffle-indicator');
    const originalNumber = document.getElementById('original-number');
    
    if (AppState.shuffleEnabled && !AppState.randomMode && !AppState.examMode) {
        shuffleIndicator.style.display = 'inline-flex';
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        originalNumber.textContent = `(元: 問題${actualIndex + 1})`;
    } else {
        shuffleIndicator.style.display = 'none';
    }
}

// 質問タイプの更新
function updateQuestionType(isMultiple) {
    document.getElementById('question-type').textContent = isMultiple ? '複数選択（2つ選択）' : '単一選択';
    document.getElementById('question-type').className = `question-type-badge ${isMultiple ? 'multiple' : ''}`;
}

// 選択肢の表示
function displayChoices(question, isMultiple) {
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const choiceElement = createChoiceElement(choice, index, isMultiple);
        choicesContainer.appendChild(choiceElement);
    });
    
    // 試験モードで保存済みの回答を復元
    if (AppState.examMode && AppState.examAnswers[AppState.currentQuestionIndex]) {
        AppState.examAnswers[AppState.currentQuestionIndex].forEach(index => {
            selectChoice(index, isMultiple);
        });
    }
}

// 選択肢要素の作成
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

// 選択肢の選択
export function selectChoice(index, isMultiple) {
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

// 回答の送信
export async function submitAnswer() {
    let question;
    let questionId;
    
    if (AppState.randomMode) {
        question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        const questions = await window.getQuestionsForDomain(AppState.currentDomain);
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        question = questions[actualIndex];
        questionId = `d${AppState.currentDomain}_q${actualIndex}`;
    }
    
    // 正解判定
    const isCorrect = checkAnswer(question, AppState.selectedAnswers);
    
    // 結果を保存
    AppState.answeredQuestions.set(questionId, {
        domain: AppState.currentDomain || question.domain,
        questionIndex: AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex,
        selectedAnswers: AppState.selectedAnswers,
        isCorrect: isCorrect,
        timestamp: Date.now()
    });
    
    // 選択肢の状態更新
    updateChoicesAfterAnswer(question, isCorrect);
    
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
    await checkAchievements();
}

// 正解判定
export function checkAnswer(question, selectedAnswers) {
    if (question.type === 'multiple') {
        return question.correct.length === selectedAnswers.length &&
               question.correct.every(c => selectedAnswers.includes(c));
    } else {
        return question.correct[0] === selectedAnswers[0];
    }
}

// 回答後の選択肢更新
function updateChoicesAfterAnswer(question, isCorrect) {
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
}

// 解説の表示
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

// 次の質問へ
export async function nextQuestion() {
    if (AppState.examMode) {
        // 試験モードの場合
        AppState.examAnswers[AppState.currentQuestionIndex] = AppState.selectedAnswers;
    }
    
    AppState.currentQuestionIndex++;
    AppState.selectedAnswers = [];
    
    await displayQuestion();
}

// フラグの切り替え
export function toggleFlag() {
    let questionId;
    
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        questionId = `d${AppState.currentDomain}_q${actualIndex}`;
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

// フラグ状態の更新
function updateFlagStatus() {
    let questionId;
    
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        questionId = `d${AppState.currentDomain}_q${actualIndex}`;
    }
    
    const flagBtn = document.getElementById('flag-btn');
    if (AppState.flaggedQuestions.has(questionId)) {
        flagBtn.classList.add('flagged');
    } else {
        flagBtn.classList.remove('flagged');
    }
}

// ボタン状態のリセット
function resetQuestionButtons() {
    const submitBtn = document.getElementById('submit-answer');
    const nextBtn = document.getElementById('next-question');
    const explanationPanel = document.getElementById('explanation-panel');
    
    if (AppState.examMode) {
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        nextBtn.textContent = AppState.currentQuestionIndex < 64 ? '次の問題' : '試験を終了';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
    }
    
    explanationPanel.style.display = 'none';
}

// 練習終了
export async function finishPractice() {
    const elapsed = Date.now() - AppState.startTime;
    AppState.totalTime += elapsed;
    saveProgress();
    
    if (AppState.randomMode) {
        await showRandomPracticeResults();
    } else if (AppState.examMode) {
        await showExamResults();
    } else {
        await showPracticeResults();
    }
    
    // 練習画面に戻る際に進捗を更新
    const { showView } = await import('./ui.js');
    await showView('practice');
    
    // 進捗を更新
    const { updateProgressDisplay } = await import('./progress.js');
    await updateProgressDisplay();
}

// ランダム練習の結果表示
async function showRandomPracticeResults() {
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
}

// 通常練習の結果表示
async function showPracticeResults() {
    const domain = AppState.currentDomain;
    const questions = await window.getQuestionsForDomain(domain);
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

// 試験結果の表示（exam.jsに移動予定）
async function showExamResults() {
    // この関数は後でexam.jsに移動します
    const { finishExam } = await import('./exam.js');
    await finishExam();
}

// ジェスチャーの設定
function setupQuestionGestures() {
    // スワイプジェスチャーと長押しの設定
    setupSwipeGestures();
    setupLongPress();
    updateBookmarkUI();
}

// 以下のジェスチャー関連の関数は後でui.jsに移動する可能性があります
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
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) < swipeThreshold) return;
    
    if (swipeDistance < 0) {
        // 左スワイプ - 次の問題へ
        const nextBtn = document.getElementById('next-question');
        if (nextBtn && nextBtn.style.display !== 'none') {
            nextQuestion();
        }
    }
}

let longPressTimer = null;
const LONG_PRESS_DURATION = 500;

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
    if (e.target.closest('.choice')) return;
    
    longPressTimer = setTimeout(() => {
        toggleBookmark();
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
    
    const bookmarkIcon = document.getElementById('bookmark-icon');
    if (bookmarkIcon) {
        bookmarkIcon.classList.toggle('active', isBookmarked);
    }
}

async function showToast(message) {
    const { showToast: showUIToast } = await import('./ui.js');
    showUIToast(message);
}