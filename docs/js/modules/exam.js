// 試験モードモジュール
import { AppState, initExamMode } from './state.js';
import { checkAnswer } from './question.js';
import { shuffleArray } from './utils.js';

// 模擬試験開始
export async function startExam() {
    const examQuestions = await generateExamQuestions();
    initExamMode(examQuestions);
    
    // 試験画面を表示
    const examView = document.getElementById('exam-view');
    const questionView = document.getElementById('question-view');
    if (examView) {
        examView.style.display = 'none';
    }
    if (questionView) {
        questionView.style.display = 'block';
    }
    
    // 試験タイマー開始
    startExamTimer();
    
    // 最初の問題を表示
    const { displayQuestion } = await import('./question.js');
    await displayQuestion();
}

// 試験問題の生成（実際の配分に基づく）
export async function generateExamQuestions() {
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
        const domainQuestions = await window.getQuestionsForDomain(parseInt(domain));
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

// 試験タイマー
let examTimerInterval = null;

export function startExamTimer() {
    const examDuration = 90 * 60 * 1000; // 90分
    
    examTimerInterval = setInterval(() => {
        if (!AppState.examMode) {
            clearInterval(examTimerInterval);
            return;
        }
        
        const elapsed = Date.now() - AppState.examStartTime;
        const remaining = Math.max(0, examDuration - elapsed);
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = 
                `残り時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // 時間切れ
        if (remaining === 0) {
            clearInterval(examTimerInterval);
            finishExam();
        }
    }, 1000);
}

// 試験終了
export async function finishExam() {
    // タイマーを停止
    if (examTimerInterval) {
        clearInterval(examTimerInterval);
        examTimerInterval = null;
    }
    
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
    
    const score = Math.round((correct / AppState.examQuestions.length) * 100);
    const passed = score >= 70;
    
    // 結果画面を表示
    showExamResults(correct, answered, score, passed);
}

// 試験結果データを保存
let examResultData = null;

// 試験結果の表示
async function showExamResults(correct, answered, score, passed) {
    // 結果データを保存
    examResultData = { correct, answered, score, passed };
    
    const resultsHTML = `
        <div class="exam-results">
            <h2>模擬試験結果</h2>
            <div class="result-summary ${passed ? 'passed' : 'failed'}">
                <div class="score-display">
                    <div class="score-value">${score}%</div>
                    <div class="score-label">${passed ? '合格' : '不合格'}</div>
                </div>
                <div class="result-details">
                    <p>正解数: ${correct}/${AppState.examQuestions.length}</p>
                    <p>回答数: ${answered}/${AppState.examQuestions.length}</p>
                    <p>未回答: ${AppState.examQuestions.length - answered}問</p>
                    <p>合格ライン: 70%</p>
                </div>
            </div>
            <div class="domain-breakdown">
                <h3>ドメイン別結果</h3>
                ${generateDomainBreakdown()}
            </div>
            <div class="exam-actions">
                <button class="btn btn-primary" onclick="window.reviewExamQuestions()">問題を確認</button>
                <button class="btn btn-secondary" onclick="window.showView('exam')">試験選択に戻る</button>
            </div>
        </div>
    `;
    
    // 試験結果コンテナに表示
    const examResultContainer = document.getElementById('exam-result-container');
    if (examResultContainer) {
        examResultContainer.innerHTML = resultsHTML;
    }
    
    // 試験結果ビューを表示
    const { showView } = await import('./ui.js');
    await showView('exam-result');
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
export function reviewExamQuestions() {
    // 簡易的なレビュー表示
    let reviewHTML = '<div class="exam-review"><h2>試験結果レビュー</h2><div class="review-questions" style="max-height: 600px; overflow-y: auto; margin: 20px 0;">';
    
    AppState.examQuestions.forEach((question, index) => {
        const userAnswers = AppState.examAnswers[index];
        const isCorrect = userAnswers && userAnswers.length > 0 && checkAnswer(question, userAnswers);
        const status = userAnswers && userAnswers.length > 0 ? (isCorrect ? '✓ 正解' : '✗ 不正解') : '- 未回答';
        
        reviewHTML += `
            <div class="review-item" style="margin-bottom: 10px; padding: 15px; background: ${isCorrect ? '#e8f5e9' : userAnswers ? '#ffebee' : '#f5f5f5'}; border-radius: 8px; cursor: pointer;" onclick="window.reviewExamQuestion(${index})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>問題 ${index + 1}</strong> (ドメイン${question.domain})
                    <span style="font-weight: 600; color: ${isCorrect ? '#4caf50' : userAnswers ? '#f44336' : '#999'}">${status}</span>
                </div>
                <div style="margin-top: 8px; color: #666; font-size: 0.9rem;">${question.text.substring(0, 100)}${question.text.length > 100 ? '...' : ''}</div>
            </div>
        `;
    });
    
    reviewHTML += '</div><div style="text-align: center;"><button class="btn btn-secondary" onclick="window.showExamResultsAgain()" style="margin-top: 20px;">結果に戻る</button></div></div>';
    
    // 試験結果コンテナに表示
    const examResultContainer = document.getElementById('exam-result-container');
    if (examResultContainer) {
        examResultContainer.innerHTML = reviewHTML;
    }
}

// 試験結果を再表示
window.showExamResultsAgain = function() {
    if (examResultData) {
        const { correct, answered, score, passed } = examResultData;
        const resultsHTML = `
            <div class="exam-results">
                <h2>模擬試験結果</h2>
                <div class="result-summary ${passed ? 'passed' : 'failed'}">
                    <div class="score-display">
                        <div class="score-value">${score}%</div>
                        <div class="score-label">${passed ? '合格' : '不合格'}</div>
                    </div>
                    <div class="result-details">
                        <p>正解数: ${correct}/${AppState.examQuestions.length}</p>
                        <p>回答数: ${answered}/${AppState.examQuestions.length}</p>
                        <p>未回答: ${AppState.examQuestions.length - answered}問</p>
                        <p>合格ライン: 70%</p>
                    </div>
                </div>
                <div class="domain-breakdown">
                    <h3>ドメイン別結果</h3>
                    ${generateDomainBreakdown()}
                </div>
                <div class="exam-actions">
                    <button class="btn btn-primary" onclick="window.reviewExamQuestions()">問題を確認</button>
                    <button class="btn btn-secondary" onclick="window.showView('exam')">試験選択に戻る</button>
                </div>
            </div>
        `;
        
        const examResultContainer = document.getElementById('exam-result-container');
        if (examResultContainer) {
            examResultContainer.innerHTML = resultsHTML;
        }
    }
}

// 個別の試験問題をレビュー
window.reviewExamQuestion = function(index) {
    const question = AppState.examQuestions[index];
    const userAnswers = AppState.examAnswers[index] || [];
    const isCorrect = userAnswers.length > 0 && checkAnswer(question, userAnswers);
    
    let reviewHTML = `
        <div class="exam-question-review">
            <h3>問題 ${index + 1} / ${AppState.examQuestions.length}</h3>
            <div class="question-text" style="margin: 20px 0; padding: 20px; background: var(--bg-secondary); border-radius: 8px;">
                ${question.text}
            </div>
            <div class="choices" style="margin: 20px 0;">
    `;
    
    question.choices.forEach((choice, choiceIndex) => {
        const isSelected = userAnswers.includes(choiceIndex);
        const isCorrectChoice = question.correct.includes(choiceIndex);
        let choiceClass = '';
        let icon = '';
        
        if (isCorrectChoice) {
            choiceClass = 'style="background: #e8f5e9; border: 2px solid #4caf50;"';
            icon = '✓';
        } else if (isSelected) {
            choiceClass = 'style="background: #ffebee; border: 2px solid #f44336;"';
            icon = '✗';
        }
        
        reviewHTML += `
            <div class="choice" ${choiceClass} style="padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd;">
                <span style="font-weight: 600;">${choice.label})</span> ${choice.text}
                ${icon ? `<span style="float: right; font-weight: bold; color: ${isCorrectChoice ? '#4caf50' : '#f44336'}">${icon}</span>` : ''}
            </div>
        `;
    });
    
    reviewHTML += `
            </div>
            <div class="explanation" style="margin: 20px 0; padding: 20px; background: var(--bg-tertiary); border-radius: 8px;">
                <h4>解説</h4>
                ${question.explanation}
            </div>
            <div style="text-align: center; margin-top: 30px;">
                ${index > 0 ? `<button class="btn btn-secondary" onclick="window.reviewExamQuestion(${index - 1})">前の問題</button>` : ''}
                <button class="btn btn-secondary" onclick="window.reviewExamQuestions()" style="margin: 0 10px;">一覧に戻る</button>
                ${index < AppState.examQuestions.length - 1 ? `<button class="btn btn-secondary" onclick="window.reviewExamQuestion(${index + 1})">次の問題</button>` : ''}
            </div>
        </div>
    `;
    
    const examResultContainer = document.getElementById('exam-result-container');
    if (examResultContainer) {
        examResultContainer.innerHTML = reviewHTML;
    }
}