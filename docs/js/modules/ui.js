// UI/ビュー管理モジュール
import { AppState, STORAGE_KEYS } from './state.js';
import { updateProgressView, filterReviewQuestions } from './progress.js';

// ビュー管理
export async function showView(viewName) {
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
            case 'practice':
                // 練習ビューに戻った時は進捗を更新
                const { updateProgressDisplay } = await import('./progress.js');
                await updateProgressDisplay();
                break;
            case 'progress':
                await updateProgressView();
                break;
            case 'review':
                await loadReviewQuestions();
                break;
        }
    } catch (error) {
        console.error('Error in showView:', error);
    }
}

// 復習問題の読み込み
async function loadReviewQuestions() {
    await filterReviewQuestions('all');
}

// テーマ切り替え
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeToggle(newTheme);
}

export function updateThemeToggle(theme) {
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

// 視覚的フィードバック
export function showFeedback(isCorrect) {
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
    const totalQuestions = 200; // デフォルト値
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

// 成果表示
export function showAchievement(title, description) {
    const toast = document.getElementById('achievement-toast');
    document.getElementById('achievement-title').textContent = title;
    document.getElementById('achievement-desc').textContent = description;
    
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// トースト通知
export function showToast(message) {
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

// スクリーンリーダー用の通知関数
export function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.left = '-9999px';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

// タイマー開始
export function startTimer() {
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

// ローディングメッセージ
export function showLoadingMessage(message) {
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

export function hideLoadingMessage() {
    const loading = document.getElementById('loading-message');
    if (loading) {
        loading.remove();
    }
}

// キーボードヘルプを表示
export function showKeyboardHelp() {
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