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

    // 質問文にもキーワードハイライトを適用
    setTimeout(() => {
        highlightKeywords();
    }, 50);

    // 選択肢
    displayChoices(question, isMultiple);

    // フラグ状態
    updateFlagStatus();

    // ボタン状態
    resetQuestionButtons();

    // 選択状態をリセット
    AppState.selectedAnswers = [];

    // 前回の解答履歴を表示
    displayPreviousAttempt(question, currentDomain);

    // 難易度表示を更新
    updateDifficultyDisplay(question, currentDomain, actualIndex);

    // ジェスチャーとブックマークの設定
    setupQuestionGestures();

    // 戻るボタンのテキストを更新
    updateBackButtonText();

    // 問題の開始時刻を記録
    AppState.currentQuestionStartTime = Date.now();

    // 平均時間を表示
    displayAverageTime(question, currentDomain, actualIndex);

    // メモを表示・設定
    setupMemoFeature(question, currentDomain, actualIndex);
}

// 戻るボタンのテキストを更新
function updateBackButtonText() {
    const backButtonText = document.getElementById('back-button-text');
    if (backButtonText) {
        if (AppState.reviewMode) {
            backButtonText.textContent = '復習一覧に戻る';
        } else {
            backButtonText.textContent = 'ドメイン選択に戻る';
        }
    }
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

    // 進捗バーの更新
    updateProgressIndicator(totalQuestions);
}

// 進捗インジケーターの更新
function updateProgressIndicator(totalQuestions) {
    // 現在のドメインの完了問題数を計算
    let completedCount = 0;

    if (AppState.randomMode) {
        // ランダムモードの場合
        completedCount = AppState.currentQuestionIndex;
    } else if (AppState.examMode) {
        // 試験モードの場合
        completedCount = Object.keys(AppState.examAnswers).length;
    } else {
        // 通常モードの場合
        completedCount = Array.from(AppState.answeredQuestions.keys())
            .filter(key => key.startsWith(`d${AppState.currentDomain}_`)).length;
    }

    const percentage = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

    // 進捗バーの更新
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
    document.getElementById('progress-current').textContent = completedCount;
    document.getElementById('progress-total').textContent = totalQuestions;
    document.getElementById('progress-percentage').textContent = `(${percentage}%)`;

    // セグメントの作成（10問ごと、または試験モードは65問を10分割）
    const segmentsContainer = document.getElementById('progress-segments');
    segmentsContainer.innerHTML = '';

    const segmentCount = Math.min(10, totalQuestions);
    for (let i = 0; i < segmentCount; i++) {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        segmentsContainer.appendChild(segment);
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

    // 解答時間を計算
    const answerTime = Date.now() - AppState.currentQuestionStartTime;

    // 結果を保存
    AppState.answeredQuestions.set(questionId, {
        domain: AppState.currentDomain || question.domain,
        questionIndex: AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex,
        selectedAnswers: AppState.selectedAnswers,
        isCorrect: isCorrect,
        timestamp: Date.now(),
        answerTime: answerTime
    });

    // 解答時間を記録
    updateQuestionTime(questionId, answerTime);

    // 選択肢の状態更新
    updateChoicesAfterAnswer(question, isCorrect);

    // 視覚的フィードバックを表示
    showFeedback(isCorrect);

    // 解説を表示
    displayExplanation(question, isCorrect);

    // 解答時間の比較を表示
    const averageTime = getAverageTimeForQuestion(questionId);
    if (averageTime > 0) {
        showTimeComparison(answerTime, averageTime);
    }

    // 類似問題を推薦
    recommendSimilarQuestions(question);

    // ボタン状態更新
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'block';
    document.getElementById('next-question-bottom').style.display = 'block';

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

    // 解説を直接表示（段階的表示を廃止）
    const explanationContent = document.getElementById('explanation-content');
    explanationContent.innerHTML = question.explanation;
    explanationContent.style.display = 'block';

    // 段階的表示要素を非表示
    document.querySelectorAll('.explanation-step').forEach(step => {
        step.style.display = 'none';
    });

    // キーワードハイライトを適用
    setTimeout(() => {
        highlightKeywords();
    }, 100);

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

// 段階的解説の関数は削除（直接表示に変更）

// 次の質問へ
export async function nextQuestion() {
    if (AppState.examMode) {
        // 試験モードの場合
        AppState.examAnswers[AppState.currentQuestionIndex] = AppState.selectedAnswers;
    }

    AppState.currentQuestionIndex++;
    AppState.selectedAnswers = [];

    await displayQuestion();

    // 画面上部にスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const nextBtnBottom = document.getElementById('next-question-bottom');
    const explanationPanel = document.getElementById('explanation-panel');

    if (AppState.examMode) {
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        nextBtnBottom.style.display = 'block';
        nextBtn.textContent = AppState.currentQuestionIndex < 64 ? '次の問題' : '試験を終了';
        nextBtnBottom.textContent = AppState.currentQuestionIndex < 64 ? '次の問題' : '試験を終了';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        nextBtnBottom.style.display = 'none';
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

// 前回の解答履歴を表示
function displayPreviousAttempt(question, currentDomain) {
    let questionId;

    if (AppState.randomMode) {
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else if (AppState.examMode) {
        // 試験モードでは履歴を表示しない
        document.getElementById('previous-attempt').style.display = 'none';
        return;
    } else {
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        questionId = `d${currentDomain}_q${actualIndex}`;
    }

    const previousAnswer = AppState.answeredQuestions.get(questionId);
    const attemptDiv = document.getElementById('previous-attempt');
    const attemptText = document.getElementById('previous-attempt-text');

    if (previousAnswer) {
        attemptDiv.style.display = 'inline-flex';
        if (previousAnswer.isCorrect) {
            attemptDiv.className = 'previous-attempt correct';
            const choiceLabels = previousAnswer.selectedAnswers.map(i => question.choices[i].label).join(', ');
            attemptText.textContent = `前回: (正解)`;
        } else {
            // 前回不正解の場合のみ表示
            attemptDiv.style.display = 'inline-flex';
            attemptDiv.className = 'previous-attempt incorrect';
            const choiceLabels = previousAnswer.selectedAnswers.map(i => question.choices[i].label).join(', ');
            attemptText.textContent = `前回: ${choiceLabels} (不正解)`;
        }
    } else {
        attemptDiv.style.display = 'none';
    }
}


// 難易度表示の更新
function updateDifficultyDisplay(question, currentDomain, actualIndex) {
    let questionId;

    if (AppState.randomMode) {
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${currentDomain}_q${actualIndex}`;
    }

    // 難易度を計算（正答率ベース）
    let difficulty = AppState.questionDifficulties.get(questionId);

    if (!difficulty) {
        // まだ計算されていない場合は、グローバルな正答率から推定
        const totalAttempts = getTotalAttemptsForQuestion(questionId);
        const correctAttempts = getCorrectAttemptsForQuestion(questionId);

        if (totalAttempts > 0) {
            const correctRate = correctAttempts / totalAttempts;
            if (correctRate >= 0.8) {
                difficulty = 1; // 易しい
            } else if (correctRate >= 0.5) {
                difficulty = 2; // 中程度
            } else {
                difficulty = 3; // 難しい
            }
        } else {
            // デフォルトは中程度
            difficulty = 2;
        }

        AppState.questionDifficulties.set(questionId, difficulty);
    }

    // UIを更新
    const difficultyBadge = document.getElementById('difficulty-badge');
    const difficultyStars = document.getElementById('difficulty-stars');
    const difficultyText = document.getElementById('difficulty-text');

    // 星を生成
    let starsHTML = '';
    for (let i = 1; i <= 3; i++) {
        const filled = i <= difficulty ? 'filled' : '';
        starsHTML += `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="${filled}">
                <path d="M8 .5l1.9 3.8 4.1.6-3 2.9.7 4.2L8 10l-3.7 2 .7-4.2-3-2.9 4.1-.6L8 .5z"/>
            </svg>
        `;
    }
    difficultyStars.innerHTML = starsHTML;

    // テキストとクラスを設定
    if (difficulty === 1) {
        difficultyBadge.className = 'difficulty-badge easy';
        difficultyText.textContent = '易しい';
    } else if (difficulty === 2) {
        difficultyBadge.className = 'difficulty-badge medium';
        difficultyText.textContent = '標準';
    } else {
        difficultyBadge.className = 'difficulty-badge hard';
        difficultyText.textContent = '難しい';
    }
}

// 問題の総試行回数を取得（実際の実装では、サーバーサイドのデータを使用する想定）
function getTotalAttemptsForQuestion(questionId) {
    // 現在はローカルデータのみを使用
    return AppState.answeredQuestions.has(questionId) ? 1 : 0;
}

// 問題の正解回数を取得（実際の実装では、サーバーサイドのデータを使用する想定）
function getCorrectAttemptsForQuestion(questionId) {
    const answer = AppState.answeredQuestions.get(questionId);
    return answer && answer.isCorrect ? 1 : 0;
}

// キーワードハイライトの適用
function highlightKeywords() {
    // AWSサービス名
    const awsServices = [
        'Amazon SageMaker', 'SageMaker',
        'Amazon Rekognition', 'Rekognition',
        'Amazon Comprehend', 'Comprehend',
        'Amazon Polly', 'Polly',
        'Amazon Transcribe', 'Transcribe',
        'Amazon Translate', 'Translate',
        'Amazon Lex', 'Lex',
        'Amazon Personalize', 'Personalize',
        'Amazon Forecast', 'Forecast',
        'Amazon Textract', 'Textract',
        'Amazon Kendra', 'Kendra',
        'AWS DeepRacer', 'DeepRacer',
        'AWS DeepLens', 'DeepLens',
        'Amazon Bedrock', 'Bedrock',
        'Amazon Q', 'Amazon CodeWhisperer', 'CodeWhisperer',
        'AWS Lambda', 'Lambda',
        'Amazon S3', 'S3',
        'Amazon EC2', 'EC2',
        'Amazon RDS', 'RDS',
        'Amazon DynamoDB', 'DynamoDB',
        'Amazon CloudWatch', 'CloudWatch',
        'AWS IAM', 'IAM'
    ];

    // ML/AI関連用語
    const mlTerms = [
        '機械学習', 'Machine Learning', 'ML',
        '深層学習', 'Deep Learning', 'DL',
        'ニューラルネットワーク', 'Neural Network',
        '自然言語処理', 'Natural Language Processing', 'NLP',
        'コンピュータビジョン', 'Computer Vision', 'CV',
        '教師あり学習', 'Supervised Learning',
        '教師なし学習', 'Unsupervised Learning',
        '強化学習', 'Reinforcement Learning',
        'トランスフォーマー', 'Transformer',
        'LSTM', 'RNN', 'CNN',
        'GPT', 'BERT', 'LLM',
        '勾配降下法', 'Gradient Descent',
        '過学習', 'Overfitting',
        '正則化', 'Regularization',
        'バイアス', 'Bias',
        'ハイパーパラメータ', 'Hyperparameter'
    ];

    // 重要な概念
    const importantTerms = [
        '責任あるAI', 'Responsible AI',
        'プライバシー', 'Privacy',
        '倫理', 'Ethics',
        'セキュリティ', 'Security',
        'コンプライアンス', 'Compliance',
        'ガバナンス', 'Governance',
        '説明可能性', 'Explainability',
        '透明性', 'Transparency',
        '公平性', 'Fairness'
    ];

    // ハイライト対象の要素を取得（選択肢は除外）
    const containers = document.querySelectorAll('.explanation-content, .step-content, .question-text');

    containers.forEach(container => {
        // すでにハイライトされている場合はスキップ
        if (container.dataset.highlighted === 'true') return;

        let html = container.innerHTML;

        // コードブロック内はハイライトしない
        const codeBlocks = [];
        html = html.replace(/<pre[\s\S]*?<\/pre>/g, (match) => {
            codeBlocks.push(match);
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
        });

        // AWSサービスをハイライト
        awsServices.forEach(service => {
            const regex = new RegExp(`\\b(${escapeRegex(service)})\\b(?![^<]*>)`, 'g');
            html = html.replace(regex, '<span class="keyword-highlight aws-service">$1</span>');
        });

        // ML用語をハイライト
        mlTerms.forEach(term => {
            const regex = new RegExp(`\\b(${escapeRegex(term)})\\b(?![^<]*>)`, 'g');
            html = html.replace(regex, '<span class="keyword-highlight ml-term">$1</span>');
        });

        // 重要な概念をハイライト
        importantTerms.forEach(term => {
            const regex = new RegExp(`\\b(${escapeRegex(term)})\\b(?![^<]*>)`, 'g');
            html = html.replace(regex, '<span class="keyword-highlight important">$1</span>');
        });

        // コードブロックを復元
        codeBlocks.forEach((block, index) => {
            html = html.replace(`__CODE_BLOCK_${index}__`, block);
        });

        container.innerHTML = html;
        container.dataset.highlighted = 'true';
    });
}

// 正規表現エスケープ
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 平均時間の表示
function displayAverageTime(question, currentDomain, actualIndex) {
    let questionId;

    if (AppState.randomMode) {
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${currentDomain}_q${actualIndex}`;
    }

    const averageTime = getAverageTimeForQuestion(questionId);
    const averageTimeDiv = document.getElementById('average-time');
    const averageTimeText = document.getElementById('average-time-text');

    if (averageTime > 0) {
        averageTimeDiv.style.display = 'flex';
        const minutes = Math.floor(averageTime / 60000);
        const seconds = Math.floor((averageTime % 60000) / 1000);
        averageTimeText.textContent = `平均: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        averageTimeDiv.style.display = 'none';
    }
}

// 問題の平均解答時間を取得
function getAverageTimeForQuestion(questionId) {
    const times = AppState.questionTimes.get(questionId);
    if (!times || times.length === 0) {
        // グローバルデータから取得（実際の実装では、サーバーサイドのデータを使用）
        return 0;
    }

    const sum = times.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / times.length);
}

// 解答時間を記録
function updateQuestionTime(questionId, time) {
    if (!AppState.questionTimes.has(questionId)) {
        AppState.questionTimes.set(questionId, []);
    }

    const times = AppState.questionTimes.get(questionId);
    times.push(time);

    // 最新の10回分のみ保持
    if (times.length > 10) {
        times.shift();
    }
}

// 解答時間の比較表示
function showTimeComparison(answerTime, averageTime) {
    if (averageTime === 0) return;

    const diff = answerTime - averageTime;
    const diffSeconds = Math.abs(Math.floor(diff / 1000));

    // 差が0秒の場合は表示しない
    if (diffSeconds === 0) return;

    const comparisonDiv = document.createElement('div');
    comparisonDiv.className = 'time-comparison';

    if (diff < 0) {
        comparisonDiv.classList.add('faster');
        comparisonDiv.innerHTML = `
            <svg viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 8.5 3 10.5l.5-3.5L1 4.5 4.5 4 6 1z"/>
            </svg>
            平均より${diffSeconds}秒速い！
        `;
    } else {
        comparisonDiv.classList.add('slower');
        comparisonDiv.innerHTML = `
            <svg viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 0a6 6 0 100 12A6 6 0 006 0zM5.5 3v3.25l2.5 1.5-.5.86L4.5 6.75V3h1z"/>
            </svg>
            平均より${diffSeconds}秒遅い
        `;
    }

    // 正解表示の横に追加
    const correctAnswer = document.getElementById('correct-answer');
    correctAnswer.appendChild(comparisonDiv);
}

// 類似問題の推薦
async function recommendSimilarQuestions(currentQuestion) {
    // キーワードベースで類似問題を検索
    const keywords = extractKeywords(currentQuestion);
    const allQuestions = await getAllQuestionsWithMetadata();

    // 類似度を計算
    const similarQuestions = [];
    for (const [questionId, metadata] of allQuestions) {
        if (metadata.domain === currentQuestion.domain || metadata.domain === (AppState.currentDomain || currentQuestion.domain)) {
            const similarity = calculateSimilarity(keywords, metadata.keywords);
            if (similarity > 0.3 && questionId !== getCurrentQuestionId()) {
                similarQuestions.push({
                    questionId,
                    metadata,
                    similarity
                });
            }
        }
    }

    // 類似度でソートして上位3件を取得
    similarQuestions.sort((a, b) => b.similarity - a.similarity);
    const topSimilar = similarQuestions.slice(0, 3);

    if (topSimilar.length > 0) {
        displaySimilarQuestions(topSimilar);
    }
}

// 現在の問題IDを取得
function getCurrentQuestionId() {
    if (AppState.randomMode) {
        const question = AppState.randomQuestions[AppState.currentQuestionIndex];
        return `d${question.domain}_q${question.originalIndex}`;
    } else {
        const actualIndex = AppState.originalQuestionIndex !== null ? AppState.originalQuestionIndex : AppState.currentQuestionIndex;
        return `d${AppState.currentDomain}_q${actualIndex}`;
    }
}

// キーワード抽出
function extractKeywords(question) {
    const text = question.text + ' ' + question.choices.map(c => c.text).join(' ');
    const keywords = [];

    // AWSサービス名を抽出
    const awsServices = ['SageMaker', 'Rekognition', 'Comprehend', 'Polly', 'Transcribe', 'Translate', 'Lex', 'Personalize', 'Forecast', 'Textract', 'Kendra', 'Bedrock'];
    awsServices.forEach(service => {
        if (text.includes(service)) {
            keywords.push(service.toLowerCase());
        }
    });

    // ML関連用語を抽出
    const mlTerms = ['機械学習', '深層学習', 'ニューラルネットワーク', '自然言語処理', 'コンピュータビジョン', '教師あり', '教師なし', '強化学習'];
    mlTerms.forEach(term => {
        if (text.includes(term)) {
            keywords.push(term);
        }
    });

    return keywords;
}

// 全問題のメタデータを取得
async function getAllQuestionsWithMetadata() {
    const metadata = new Map();

    for (let domain = 1; domain <= 4; domain++) {
        const questions = await window.getQuestionsForDomain(domain);
        questions.forEach((question, index) => {
            const questionId = `d${domain}_q${index}`;
            metadata.set(questionId, {
                domain,
                index,
                text: question.text,
                keywords: extractKeywords(question),
                answered: AppState.answeredQuestions.has(questionId)
            });
        });
    }

    return metadata;
}

// 類似度計算（Jaccard係数）
function calculateSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
}

// 類似問題の表示
function displaySimilarQuestions(similarQuestions) {
    const container = document.getElementById('similar-questions');
    const list = document.getElementById('similar-questions-list');

    container.style.display = 'block';
    list.innerHTML = '';

    similarQuestions.forEach(({ questionId, metadata, similarity }) => {
        const item = document.createElement('div');
        item.className = 'similar-question-item';
        item.onclick = () => loadSimilarQuestion(metadata.domain, metadata.index);

        const statusClass = metadata.answered ? 'answered' : 'unanswered';
        const statusIcon = metadata.answered ? '✓' : '○';
        const statusText = metadata.answered ? '回答済み' : '未回答';

        item.innerHTML = `
            <div class="similar-question-info">
                <div class="similar-question-title">
                    ${metadata.text.substring(0, 80)}${metadata.text.length > 80 ? '...' : ''}
                </div>
                <div class="similar-question-meta">
                    <span>ドメイン${metadata.domain} 問題${metadata.index + 1}</span>
                    <span class="similar-question-status ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </div>
            </div>
            <div class="similarity-score">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM5.5 7.5a.5.5 0 111 0v3a.5.5 0 01-1 0v-3zm3.5-2a.5.5 0 00-.5.5v5a.5.5 0 001 0V6a.5.5 0 00-.5-.5zm2.5 1.5a.5.5 0 111 0v2a.5.5 0 01-1 0V7z"/>
                </svg>
                ${Math.round(similarity * 100)}%
            </div>
        `;

        list.appendChild(item);
    });
}

// 類似問題を読み込む
async function loadSimilarQuestion(domain, index) {
    // 現在の状態をリセット
    AppState.currentDomain = domain;
    AppState.currentQuestionIndex = index;
    AppState.originalQuestionIndex = null;
    AppState.randomMode = false;
    AppState.reviewMode = false;

    // 問題を表示
    await displayQuestion();

    // 画面上部にスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// メモ機能のセットアップ
function setupMemoFeature(question, currentDomain, actualIndex) {
    let questionId;

    if (AppState.randomMode) {
        questionId = `d${question.domain}_q${question.originalIndex}`;
    } else {
        questionId = `d${currentDomain}_q${actualIndex}`;
    }

    const memoBtn = document.getElementById('memo-btn');
    const memoContainer = document.getElementById('memo-container');
    const memoTextarea = document.getElementById('question-memo');
    const saveBtn = document.getElementById('save-memo');
    const cancelBtn = document.getElementById('cancel-memo');

    // 既存のメモがあるかチェック
    const existingMemo = AppState.questionMemos.get(questionId);
    if (existingMemo) {
        memoBtn.classList.add('has-memo');
        displaySavedMemo(existingMemo);
    } else {
        memoBtn.classList.remove('has-memo');
        removeSavedMemoDisplay();
    }

    // メモボタンのイベントリスナー
    memoBtn.onclick = () => {
        if (memoContainer.style.display === 'none') {
            memoContainer.style.display = 'block';
            memoTextarea.value = existingMemo || '';
            memoTextarea.focus();
        } else {
            memoContainer.style.display = 'none';
        }
    };

    // 保存ボタン
    saveBtn.onclick = () => {
        const memoText = memoTextarea.value.trim();
        if (memoText) {
            AppState.questionMemos.set(questionId, memoText);
            memoBtn.classList.add('has-memo');
            displaySavedMemo(memoText);
            showToast('メモを保存しました');
        } else {
            AppState.questionMemos.delete(questionId);
            memoBtn.classList.remove('has-memo');
            removeSavedMemoDisplay();
            showToast('メモを削除しました');
        }
        memoContainer.style.display = 'none';
        saveProgress();
    };

    // キャンセルボタン
    cancelBtn.onclick = () => {
        memoContainer.style.display = 'none';
    };
}

// 保存されたメモを表示
function displaySavedMemo(memoText) {
    removeSavedMemoDisplay(); // 既存の表示を削除

    const questionContent = document.querySelector('.question-content');
    const memoDiv = document.createElement('div');
    memoDiv.className = 'saved-memo';
    memoDiv.id = 'saved-memo-display';

    memoDiv.innerHTML = `
        <div class="saved-memo-header">
            <div class="saved-memo-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.5 1A1.5 1.5 0 001 2.5v11A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0013.5 1h-11zM3 3.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM3.5 6h9a.5.5 0 010 1h-9a.5.5 0 010-1zm0 3h9a.5.5 0 010 1h-9a.5.5 0 010-1zm0 3h5a.5.5 0 010 1h-5a.5.5 0 010-1z"/>
                </svg>
                あなたのメモ
            </div>
            <div class="saved-memo-actions">
                <button class="saved-memo-action" onclick="editMemo()">編集</button>
            </div>
        </div>
        <div class="saved-memo-content">${escapeHtml(memoText)}</div>
    `;

    questionContent.appendChild(memoDiv);
}

// 保存されたメモの表示を削除
function removeSavedMemoDisplay() {
    const existingMemo = document.getElementById('saved-memo-display');
    if (existingMemo) {
        existingMemo.remove();
    }
}

// メモ編集
window.editMemo = function () {
    document.getElementById('memo-btn').click();
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}