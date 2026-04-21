// פופאפ פתיחה
const startOverlay = document.getElementById("startOverlay");
const startGameBtn = document.getElementById("startGameBtn");

// תאי הלוח
const cells = document.querySelectorAll(".cell");

// תצוגת תור
const turnBox = document.getElementById("turnBox");
const turnPlayer = document.getElementById("turnPlayer");

// טיימר
const timerBox = document.getElementById("timerBox");
const timerValue = document.getElementById("timerValue");

// ניקוד
const xScoreEl = document.getElementById("xScore");
const oScoreEl = document.getElementById("oScore");
const drawScoreEl = document.getElementById("drawScore");

// כפתורים
const resetBtn = document.getElementById("resetBtn");
const newGameBtn = document.getElementById("newGameBtn");
const exitBtn = document.getElementById("exitBtn");

// פופאפ ניצחון / תיקו
const winOverlay = document.getElementById("winOverlay");
const winPopup = document.getElementById("winPopup");
const winnerSymbol = document.getElementById("winnerSymbol");
const closeWinPopup = document.getElementById("closeWinPopup");
const popupNewGameBtn = document.getElementById("popupNewGameBtn");
const popupTitle = document.getElementById("popupTitle");

// פופאפ יציאה
const exitOverlay = document.getElementById("exitOverlay");
const backToGameBtn = document.getElementById("backToGameBtn");
const confirmExitBtn = document.getElementById("confirmExitBtn");

// קו ניצחון
const winningLine = document.getElementById("winningLine");

// מצב המשחק
let boardState = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = false;
let hasGameStarted = false;
let timeLeft = 15;
let timerInterval = null;

// ניקוד
let scores = {
  X: 0,
  O: 0,
  draw: 0
};

// קומבינציות ניצחון + קו
const winPatterns = [
  { combo: [0, 1, 2], line: { top: "16.66%", left: "50%", width: "80%", rotate: "0deg" } },
  { combo: [3, 4, 5], line: { top: "50%", left: "50%", width: "80%", rotate: "0deg" } },
  { combo: [6, 7, 8], line: { top: "83.33%", left: "50%", width: "80%", rotate: "0deg" } },

  { combo: [0, 3, 6], line: { top: "50%", left: "16.66%", width: "80%", rotate: "90deg" } },
  { combo: [1, 4, 7], line: { top: "50%", left: "50%", width: "80%", rotate: "90deg" } },
  { combo: [2, 5, 8], line: { top: "50%", left: "83.33%", width: "80%", rotate: "90deg" } },

  { combo: [0, 4, 8], line: { top: "50%", left: "50%", width: "110%", rotate: "45deg" } },
  { combo: [2, 4, 6], line: { top: "50%", left: "50%", width: "110%", rotate: "-45deg" } }
];

const STORAGE_KEY = "tic_tac_toe_scores";

// טוען ניקוד שמור
function loadScores() {
  const savedScores = localStorage.getItem(STORAGE_KEY);

  if (savedScores) {
    scores = JSON.parse(savedScores);
  }
}

// שומר ניקוד
function saveScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

// מתחיל את המשחק בפועל
function startGame() {
  startOverlay.classList.add("hidden");
  gameActive = true;
  hasGameStarted = true;
  currentPlayer = "X";
  updateTurnUI();
  startTurnTimer(true);
}

startGameBtn.addEventListener("click", () => {
  startGame();
});

// עדכון תצוגת תור
function updateTurnUI() {
  turnPlayer.textContent = currentPlayer;

  if (currentPlayer === "X") {
    turnBox.classList.remove("turn-o");
  } else {
    turnBox.classList.add("turn-o");
  }
}

// עדכון ניקוד
function updateScoreUI() {
  xScoreEl.textContent = scores.X;
  oScoreEl.textContent = scores.O;
  drawScoreEl.textContent = scores.draw;
}

// עדכון טיימר
function updateTimerUI() {
  timerValue.textContent = timeLeft;

  if (timeLeft <= 5) {
    timerBox.classList.add("warning-time");
  } else {
    timerBox.classList.remove("warning-time");
  }
}

// סאונדים
function playBeep(frequency = 440, duration = 120, type = "sine", volume = 0.03) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioCtx = new AudioContextClass();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioCtx.close();
  }, duration);
}

function playMoveSound() {
  playBeep(500, 80, "square", 0.02);
}

function playWinSound() {
  playBeep(700, 120, "triangle", 0.03);
  setTimeout(() => playBeep(900, 150, "triangle", 0.03), 120);
  setTimeout(() => playBeep(1100, 200, "triangle", 0.03), 240);
}

function playDrawSound() {
  playBeep(300, 150, "sawtooth", 0.02);
  setTimeout(() => playBeep(260, 180, "sawtooth", 0.02), 140);
}

function playTickSound() {
  playBeep(850, 90, "square", 0.025);
}

// טיימר
function startTurnTimer(newTurn = false) {
  clearInterval(timerInterval);

  if (newTurn) {
    timeLeft = 15;
  }

  updateTimerUI();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 5 && timeLeft > 0) {
      playTickSound();
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      switchPlayer();
    }
  }, 1000);
}

// עוצר טיימר
function stopTurnTimer() {
  clearInterval(timerInterval);
}

// לוגיקת משחק
function handleCellClick(event) {
  const cell = event.target;
  const index = cell.dataset.index;

  if (!gameActive || boardState[index] !== "") return;

  boardState[index] = currentPlayer;
  cell.textContent = currentPlayer;

  if (currentPlayer === "X") {
    cell.classList.add("x-mark");
  } else {
    cell.classList.add("o-mark");
  }

  playMoveSound();

  const winResult = checkWinner();

  // ניצחון
  if (winResult) {
    scores[winResult.winner]++;
    saveScores();
    updateScoreUI();

    gameActive = false;
    stopTurnTimer();

    showWinningLine(winResult.line);
    showWinPopup(winResult.winner);
    playWinSound();
    return;
  }

  // תיקו
  if (boardState.every((cellValue) => cellValue !== "")) {
    scores.draw++;
    saveScores();
    updateScoreUI();

    gameActive = false;
    stopTurnTimer();

    showDrawPopup();
    playDrawSound();
    return;
  }

  // אחרת ממשיכים לשחק
  switchPlayer();
}

// החלפת שחקן
function switchPlayer() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnUI();
  startTurnTimer(true);
}

// בדיקת ניצחון
function checkWinner() {
  for (let pattern of winPatterns) {
    const [a, b, c] = pattern.combo;

    if (
      boardState[a] &&
      boardState[a] === boardState[b] &&
      boardState[a] === boardState[c]
    ) {
      return {
        winner: boardState[a],
        line: pattern.line
      };
    }
  }

  return null;
}

// קו ניצחון
function showWinningLine(lineData) {
  winningLine.classList.remove("hidden");
  winningLine.style.top = lineData.top;
  winningLine.style.left = lineData.left;
  winningLine.style.width = lineData.width;
  winningLine.style.transform = `translate(-50%, -50%) rotate(${lineData.rotate})`;
}

function hideWinningLine() {
  winningLine.classList.add("hidden");
}

// איפוסים
function resetBoardOnly() {
  boardState = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameActive = true;

  cells.forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("x-mark", "o-mark");
  });

  hideWinningLine();
  closeWinPopupAndContinue();
  updateTurnUI();

  if (hasGameStarted) {
    startTurnTimer(true);
  }
}

function resetEverything() {
  scores = {
    X: 0,
    O: 0,
    draw: 0
  };

  saveScores();
  updateScoreUI();
  resetBoardOnly();
}

// Popups
function showWinPopup(winner) {
  winnerSymbol.textContent = winner;
  popupTitle.textContent = "You Won!";

  winPopup.classList.remove("pink-win", "green-win", "draw-popup");

  if (winner === "X") {
    winPopup.classList.add("pink-win");
  } else {
    winPopup.classList.add("green-win");
  }

  winOverlay.classList.remove("hidden");
  startConfetti();
}

function showDrawPopup() {
  winnerSymbol.textContent = "";
  popupTitle.textContent = "It's a Draw!";

  winPopup.classList.remove("pink-win", "green-win");
  winPopup.classList.add("draw-popup");

  winOverlay.classList.remove("hidden");
}

function closeWinPopupAndContinue() {
  winOverlay.classList.add("hidden");
  winPopup.classList.remove("pink-win", "green-win", "draw-popup");
  stopConfetti();
}

function showExitScreen() {
  exitOverlay.classList.remove("hidden");
  stopTurnTimer();
}

function hideExitScreen() {
  exitOverlay.classList.add("hidden");

  if (gameActive && hasGameStarted) {
    startTurnTimer(false);
  }
}

// Event Listeners
cells.forEach((cell) => {
  cell.addEventListener("click", handleCellClick);
});

newGameBtn.addEventListener("click", () => {
  resetBoardOnly();
});

popupNewGameBtn.addEventListener("click", () => {
  resetBoardOnly();
});

closeWinPopup.addEventListener("click", () => {
  closeWinPopupAndContinue();
});

resetBtn.addEventListener("click", () => {
  const confirmReset = confirm("This will reset the board and all points. Continue?");

  if (confirmReset) {
    resetEverything();
    hideExitScreen();
  }
});

exitBtn.addEventListener("click", () => {
  showExitScreen();
});

backToGameBtn.addEventListener("click", () => {
  hideExitScreen();
});

confirmExitBtn.addEventListener("click", () => {
  resetBoardOnly();
  hasGameStarted = false;
  gameActive = false;
  stopTurnTimer();
  startOverlay.classList.remove("hidden");
  hideExitScreen();
});

// Confetti
const canvas = document.getElementById("confettiCanvas");
const ctx = canvas.getContext("2d");

let confettiPieces = [];
let confettiAnimationId = null;
let confettiTimeout = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createConfettiPiece() {
  const colors = ["#cf70d5", "#9ef064", "#84d9ff", "#ffd166", "#ff6b6b", "#ffffff"];

  return {
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: Math.random() * 10 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: Math.random() * 3 + 2,
    speedX: Math.random() * 2 - 1,
    rotation: Math.random() * 360,
    rotationSpeed: Math.random() * 10 - 5
  };
}

function startConfetti() {
  resizeCanvas();
  confettiPieces = [];

  for (let i = 0; i < 180; i++) {
    confettiPieces.push(createConfettiPiece());
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();

  clearTimeout(confettiTimeout);
  confettiTimeout = setTimeout(() => {
    stopConfetti();
  }, 3000);
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces.forEach((piece) => {
    piece.y += piece.speedY;
    piece.x += piece.speedX;
    piece.rotation += piece.rotationSpeed;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate((piece.rotation * Math.PI) / 180);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
    ctx.restore();

    if (piece.y > canvas.height + 20) {
      piece.y = -20;
      piece.x = Math.random() * canvas.width;
    }
  });

  confettiAnimationId = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// אתחול ראשוני
loadScores();
updateScoreUI();
updateTurnUI();
updateTimerUI();