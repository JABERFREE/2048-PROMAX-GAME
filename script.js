let board = [];
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let history = [];
let isMuted = false;
let currentLang = localStorage.getItem('lang') || 'ar';

// متغيّرات معزز التبديل (Swap Power-Up)
let isSwapMode = false;
let firstSelectedCell = null;
let currentGameMode = 'standard'; // standard أو classic أو tutorial

// القاموس اللغوي الشامل
const translations = {
    ar: {
        score: "النتيجة",
        bestScore: "أعلى نتيجة",
        newGame: "لعبة جديدة",
        undo: "تراجع (إعلان)",
        swap: "تبديل (معزز)",
        tagline: "اجمع الارقام ووصل الى المربع 2048 !",
        gameOver: "انتهت اللعبة!",
        tryAgain: "حاول مجدداً",
        langBtn: "EN"
    },
    en: {
        score: "Score",
        bestScore: "Best",
        newGame: "New Game",
        undo: "Undo (Ad)",
        swap: "Swap (Boost)",
        tagline: "Join the numbers and get to the 2048 tile!",
        gameOver: "Game Over!",
        tryAgain: "Try Again",
        langBtn: "عربي"
    }
};

const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('best-score');
const tileContainer = document.getElementById('tile-container');
const gameMessage = document.getElementById('game-message');
const messageText = document.getElementById('message-text');

// تطبيق الترجمة على الواجهة
function updateTexts() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.textContent = translations[currentLang].langBtn;
    }
}

// تبديل اللغة عند النقر
const langBtnEl = document.getElementById('lang-btn');
if (langBtnEl) {
    langBtnEl.addEventListener('click', () => {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('lang', currentLang);
        updateTexts();
    });
}

// مولد أصوات رقمي داخلي
function playBeep(frequency, duration) {
    if (isMuted) return;
    try {
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// ربط الأزرار الأساسية
const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        restartGame();
    });
}

const retryBtn = document.getElementById('retry-btn');
if (retryBtn) {
    retryBtn.addEventListener('click', () => {
        restartGame();
    });
}

// زر التراجع المرتبط بإعلانات AdMob
const undoBtn = document.getElementById('undo-btn');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        onUndoButtonClicked();
    });
}

// دوال إعلانات AdMob لإرسال مكافأة التراجع
function onUndoButtonClicked() {
    if (typeof admob !== 'undefined' && admob.rewardedvideo) {
        admob.rewardedvideo.config({
            id: 'ca-app-pub-8326203252240169/2205956852',
            isTesting: false
        });
        
        admob.rewardedvideo.prepare()
            .then(() => admob.rewardedvideo.show())
            .catch(e => {
                console.error('AdMob Error: ', e);
                executeUndoAction(); // تراجع مباشر في حال فشل تحميل الإعلان
            });
    } else {
        // قيد التشغيل على متصفح الكمبيوتر أو الـ Live Server
        executeUndoAction();
    }
}

document.addEventListener('admob.rewardedvideo.reward', () => {
    grantUndoReward();
}, false);

function executeUndoAction() {
    if (history.length > 0) {
        let previousState = history.pop();
        board = previousState.board;
        score = previousState.score;
        if (gameMessage) gameMessage.classList.remove('active');
        updateView();
        playBeep(200, 0.05);
    }
}

function grantUndoReward() {
    executeUndoAction();
    console.log('Undo reward granted via AdMob!');
}

// زر معزز التبديل
const swapBtn = document.getElementById('swap-btn');
if (swapBtn) {
    swapBtn.addEventListener('click', () => {
        activateSwapMode();
    });
}

function activateSwapMode() {
    isSwapMode = true;
    firstSelectedCell = null;
    if (gameMessage && messageText) {
        messageText.textContent = currentLang === 'ar' ? 'اختر البلاطة الأولى للتبديل' : 'Select first tile to swap';
        gameMessage.classList.add('active');
    } else {
        alert(currentLang === 'ar' ? 'وضع التبديل مفعل: اختر البلاطة الأولى' : 'Swap mode active: Choose first tile');
    }
}

function handleCellClick(r, c) {
    if (!isSwapMode) return;

    if (board[r][c] === 0) {
        alert(currentLang === 'ar' ? 'لا توجد بلاطة هنا!' : 'No tile here!');
        return;
    }

    if (!firstSelectedCell) {
        firstSelectedCell = { r, c };
        if (messageText) {
            messageText.textContent = currentLang === 'ar' ? 'اختر البلاطة الثانية للتبديل' : 'Select second tile';
        }
        updateView();
    } else {
        let temp = board[firstSelectedCell.r][firstSelectedCell.c];
        board[firstSelectedCell.r][firstSelectedCell.c] = board[r][c];
        board[r][c] = temp;

        isSwapMode = false;
        firstSelectedCell = null;
        if (gameMessage) gameMessage.classList.remove('active');
        
        updateView();
        playBeep(500, 0.1);
    }
}

function initGame() {
    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    score = 0;
    history = [];
    isSwapMode = false;
    firstSelectedCell = null;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    if (gameMessage) gameMessage.classList.remove('active');

    addNewTile();
    addNewTile();
    updateView();
}

function restartGame() {
    initGame();
}

function addNewTile() {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === 0) {
                emptyCells.push({r, c});
            }
        }
    }
    if (emptyCells.length > 0) {
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    }
}

function updateView() {
    if (!tileContainer) return;
    tileContainer.innerHTML = '';
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] !== 0) {
                const tile = document.createElement('div');
                tile.classList.add('tile', `tile-${board[r][c]}`);
                tile.textContent = board[r][c];
                
                tile.style.top = `${r * 25}%`;
                tile.style.left = `${c * 25}%`;
                
                if (isSwapMode && firstSelectedCell && firstSelectedCell.r === r && firstSelectedCell.c === c) {
                    tile.style.border = '4px solid #f1c40f';
                    tile.style.transform = 'scale(0.92)';
                }
                
                tileContainer.appendChild(tile);
            }
        }
    }

    const gridRows = document.querySelectorAll('.grid-row');
    gridRows.forEach((row, r) => {
        const cells = row.querySelectorAll('.grid-cell');
        cells.forEach((cell, c) => {
            cell.onclick = () => {
                handleCellClick(r, c);
            };
        });
    });

    if (scoreDisplay) scoreDisplay.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    }
}

function handleMove(direction) {
    let preMoveBoard = JSON.parse(JSON.stringify(board));
    let preMoveScore = score;

    let moved = false;
    if (direction === 'left') moved = moveLeft();
    else if (direction === 'right') moved = moveRight();
    else if (direction === 'up') moved = moveUp();
    else if (direction === 'down') moved = moveDown();

    if (moved) {
        history.push({ board: preMoveBoard, score: preMoveScore });
        if (history.length > 10) history.shift();
        
        playBeep(300, 0.05);
        addNewTile();
        updateView();
        if (checkGameOver()) {
            if (messageText) messageText.textContent = translations[currentLang].gameOver;
            if (gameMessage) gameMessage.classList.add('active');
        }
    }
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') handleMove('left');
    else if (e.key === 'ArrowRight') handleMove('right');
    else if (e.key === 'ArrowUp') handleMove('up');
    else if (e.key === 'ArrowDown') handleMove('down');
});

let startX, startY;
const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
    gridContainer.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    gridContainer.addEventListener('touchend', e => {
        if (!startX || !startY) return;
        let endX = e.changedTouches[0].clientX;
        let endY = e.changedTouches[0].clientY;
        processSwipe(startX, startY, endX, endY);
        startX = null;
        startY = null;
    }, { passive: true });

    gridContainer.addEventListener('mousedown', e => {
        startX = e.clientX;
        startY = e.clientY;
    });

    gridContainer.addEventListener('mouseup', e => {
        if (!startX || !startY) return;
        let endX = e.clientX;
        let endY = e.clientY;
        processSwipe(startX, startY, endX, endY);
        startX = null;
        startY = null;
    });
}

function processSwipe(x1, y1, x2, y2) {
    let diffX = x2 - x1;
    let diffY = y2 - y1;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 30) handleMove('right');
        else if (diffX < -30) handleMove('left');
    } else {
        if (diffY > 30) handleMove('down');
        else if (diffY < -30) handleMove('up');
    }
}

function slide(row) {
    let arr = row.filter(val => val);
    let merged = false;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            score += arr[i];
            arr[i + 1] = 0;
            merged = true;
        }
    }
    arr = arr.filter(val => val);
    while (arr.length < 4) {
        arr.push(0);
    }
    
    if (merged) {
        playBeep(600, 0.08);
    }
    return arr;
}

function moveLeft() {
    let oldBoard = JSON.stringify(board);
    for (let r = 0; r < 4; r++) {
        board[r] = slide(board[r]);
    }
    return JSON.stringify(board) !== oldBoard;
}

function moveRight() {
    let oldBoard = JSON.stringify(board);
    for (let r = 0; r < 4; r++) {
        board[r].reverse();
        board[r] = slide(board[r]);
        board[r].reverse();
    }
    return JSON.stringify(board) !== oldBoard;
}

function moveUp() {
    let oldBoard = JSON.stringify(board);
    for (let c = 0; c < 4; c++) {
        let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        col = slide(col);
        for (let r = 0; r < 4; r++) {
            board[r][c] = col[r];
        }
    }
    return JSON.stringify(board) !== oldBoard;
}

function moveDown() {
    let oldBoard = JSON.stringify(board);
    for (let c = 0; c < 4; c++) {
        let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        col.reverse();
        col = slide(col);
        col.reverse();
        for (let r = 0; r < 4; r++) {
            board[r][c] = col[r];
        }
    }
    return JSON.stringify(board) !== oldBoard;
}

function checkGameOver() {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === 0) return false;
            if (c < 3 && board[r][c] === board[r][c + 1]) return false;
            if (r < 3 && board[r][c] === board[r + 1][c]) return false;
        }
    }
    return true;
}

// تفاعلات القائمة الجانبية والأنماط
const menuBtn = document.getElementById('menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const sideMenu = document.getElementById('side-menu');
const undoBtnElement = document.getElementById('undo-btn');
const swapBtnElement = document.getElementById('swap-btn');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.add('active');
    });
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', () => {
        sideMenu.classList.remove('active');
    });
}

function setGameMode(mode) {
    currentGameMode = mode;
    sideMenu.classList.remove('active');

    if (mode === 'classic') {
        if (undoBtnElement) undoBtnElement.style.display = 'none';
        if (swapBtnElement) swapBtnElement.style.display = 'none';
        alert('تم التبديل إلى النمط الكلاسيكي: لا رجعة ولا معززات!');
    } else if (mode === 'tutorial') {
        alert('برنامج تعليمي: تعلم كيفية دمج الأرقام للوصول إلى 2048');
    } else {
        if (undoBtnElement) undoBtnElement.style.display = 'inline-block';
        if (swapBtnElement) swapBtnElement.style.display = 'inline-block';
        alert('تم التبديل إلى النمط القياسي مع معززات الطاقة!');
    }
    restartGame();
}

// بدء التشغيل التلقائي وتحديث النصوص
updateTexts();
initGame();
