// 試験モードモジュール
import { AppState, initExamMode } from './state.js';
import { checkAnswer } from './question.js';
import { shuffleArray } from './utils.js';

// 模擬試験開始
export async function startExam() {
    const examQuestions = await generateExamQuestions();
    initExamMode(examQuestions);
    
    // 試験画面を表示
    document.getElementById('exam-view').style.display = 'none';
    document.getElementById('question-view').style.display = 'block';
    
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
        
        document.getElementById('timer').textContent = 
            `残り時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 時間切れ
        if (remaining === 0) {
            clearInterval(examTimerInterval);
            finishExam();
        }
    }, 1000);
}

// 試験終了
export async function finishExam() {
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
export function reviewExamQuestions() {
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