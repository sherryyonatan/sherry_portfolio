// ========================= //
// Pac-Man Game Script //
// ========================= //

// Screens //
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const winScreen = document.getElementById("winScreen");

// Inputs & Buttons //
const playerNameInput = document.getElementById("playerName");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const exitBtnGame = document.getElementById("exitBtnGame");
const newGameBtn = document.getElementById("newGameBtn");
const exitBtnOver = document.getElementById("exitBtnOver");
const playAgainBtn = document.getElementById("playAgainBtn");
const exitBtnWin = document.getElementById("exitBtnWin");

// HUD //
const currentPlayerEl = document.getElementById("currentPlayer");
const livesEl = document.getElementById("lives");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const bestTimeEl = document.getElementById("bestTime");
const powerStatusEl = document.getElementById("powerStatus");

// Board & Overlays //
const boardEl = document.getElementById("board");
const pauseOverlay = document.getElementById("pauseOverlay");
const winTextEl = document.getElementById("winText");
const recordBannerEl = document.getElementById("recordBanner");
const confettiCanvas = document.getElementById("confettiCanvas");
const ghostRain = document.getElementById("ghostRain");
const hitOverlay = document.getElementById("hitOverlay");

// Tile Types //
const WALL = 1;
const DOT = 0;
const EMPTY = 2;
const POWER = 3;

// Board Size //
const rows = 15;
const cols = 19;

// Timing Constants //
const GHOST_MOVE_INTERVAL = 420;
const POWER_DURATION_MS = 20000;
const POWER_INTERVAL_MS = 1000;
const HIT_RESET_DELAY_MS = 700;
const HIT_OVERLAY_DURATION_MS = 850;

// Audio //
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Original Board //
const originalBoard = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,3,1],
  [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,0,2,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,2,2,2,1,1,0,1,1,1,0,1],
  [0,0,1,2,2,0,1,2,2,2,2,2,1,0,2,2,1,0,0],
  [1,1,1,2,1,0,1,2,1,1,1,2,1,0,1,2,1,1,1],
  [1,0,0,0,1,0,0,2,2,2,2,2,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,0,1,1,2,1,1,0,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,2,2,2,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,3,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,3,1],
  [1,1,1,0,1,0,1,1,1,2,1,1,1,0,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Game State //
let board = [];
let playerName = "";
let score = 0;
let lives = 3;
let timeSeconds = 0;
let isPaused = false;
let gameRunning = false;
let powerMode = false;
let powerSecondsLeft = 0;

// Intervals & Animation //
let timerInterval = null;
let ghostInterval = null;
let powerTimeout = null;
let powerInterval = null;
let confettiAnimationId = null;

// Characters //
let pacman = { row: 5, col: 0 };
let ghosts = [];
let pacmanDirection = "right";

// Helpers //
function cloneBoard() {
  return originalBoard.map((row) => [...row]);
}

function showScreen(screen) {
  [startScreen, gameScreen, gameOverScreen, winScreen].forEach((s) => {
    s.classList.remove("active");
  });
  screen.classList.add("active");
}

function clearAllGameTimers() {
  clearInterval(timerInterval);
  clearInterval(ghostInterval);
  clearTimeout(powerTimeout);
  clearInterval(powerInterval);
}

// Sound //
function playTone(freq, duration, type = "sine", volume = 0.04) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();

  setTimeout(() => {
    osc.stop();
  }, duration);
}

function playEatSound() {
  playTone(620, 55, "square", 0.03);
}

function playLoseSound() {
  playTone(260, 180, "sawtooth", 0.05);
  setTimeout(() => playTone(190, 220, "sawtooth", 0.05), 140);
  setTimeout(() => playTone(130, 260, "sawtooth", 0.05), 300);
}

function playWinSound() {
  const notes = [523, 659, 784, 988];

  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 180, "triangle", 0.05), i * 140);
  });
}

function playClapSound() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playTone(180 + Math.random() * 140, 45, "square", 0.03);
    }, i * 85);
  }
}

function playHitSound() {
  playTone(320, 90, "sawtooth", 0.05);
  setTimeout(() => playTone(220, 120, "sawtooth", 0.05), 70);
}

function showHitOverlay() {
  hitOverlay.classList.remove("hidden");

  setTimeout(() => {
    hitOverlay.classList.add("hidden");
  }, HIT_OVERLAY_DURATION_MS);
}

// Best Time //
function getBestKey(name) {
  return `pacman_best_${name.toLowerCase()}`;
}

function getBestTime(name) {
  const saved = localStorage.getItem(getBestKey(name));
  return saved ? Number(saved) : null;
}

function saveBestTime(name, seconds) {
  const best = getBestTime(name);

  if (best === null || seconds < best) {
    localStorage.setItem(getBestKey(name), String(seconds));
    return true;
  }

  return false;
}

// HUD //
function updateHUD() {
  currentPlayerEl.textContent = `Current Player: ${playerName}`;
  livesEl.textContent = "❤️ ".repeat(lives).trim();
  scoreEl.textContent = `Score: ${score}`;
  timerEl.textContent = `Time: ${timeSeconds}s`;

  const best = getBestTime(playerName);
  bestTimeEl.textContent = best !== null ? `Best Time: ${best}s` : "Best Time: --";
}

// Game Setup //
function resetGame() {
  board = cloneBoard();
  score = 0;
  lives = 3;
  timeSeconds = 0;
  isPaused = false;
  gameRunning = true;
  powerMode = false;
  powerSecondsLeft = 0;

  pacman = { row: 5, col: 0 };

  ghosts = [
    { row: 5, col: 9, startRow: 5, startCol: 9 },
    { row: 5, col: 10, startRow: 5, startCol: 10 },
    { row: 5, col: 8, startRow: 5, startCol: 8 }
  ];

  clearAllGameTimers();
  stopConfetti();

  pauseOverlay.classList.add("hidden");
  recordBannerEl.classList.add("hidden");
  powerStatusEl.textContent = "";

  pauseBtn.textContent = "Pause";
  pauseBtn.classList.remove("active");

  updateHUD();
  renderBoard();
}

function restartGame() {
  resetGame();
  showScreen(gameScreen);
  startTimer();
  startGhosts();
}

function startGame() {
  const enteredName = playerNameInput.value.trim();

  if (!enteredName) {
    alert("Please enter your name");
    return;
  }

  initAudio();

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  playerName = enteredName;
  restartGame();
}

// Timer //
function startTimer() {
  timerInterval = setInterval(() => {
    if (!gameRunning || isPaused) return;

    timeSeconds++;
    timerEl.textContent = `Time: ${timeSeconds}s`;
  }, 1000);
}

// Ghosts //
function startGhosts() {
  ghostInterval = setInterval(moveGhosts, GHOST_MOVE_INTERVAL);
}

// Power Mode //
function activatePowerMode() {
  powerMode = true;
  powerSecondsLeft = POWER_DURATION_MS / 1000;
  powerStatusEl.textContent = `Power Mode: ${powerSecondsLeft}s`;

  clearTimeout(powerTimeout);
  clearInterval(powerInterval);

  powerInterval = setInterval(() => {
    if (!gameRunning || isPaused) return;

    powerSecondsLeft--;
    powerStatusEl.textContent = powerSecondsLeft > 0 ? `Power Mode: ${powerSecondsLeft}s` : "";
  }, POWER_INTERVAL_MS);

  powerTimeout = setTimeout(() => {
    powerMode = false;
    powerSecondsLeft = 0;
    powerStatusEl.textContent = "";
    clearInterval(powerInterval);
    renderBoard();
  }, POWER_DURATION_MS);

  renderBoard();
}

// Board Helpers //
function getPowerEmoji(row, col) {
  const arr = ["🍦", "🍬", "🍭"];
  return arr[(row + col) % arr.length];
}

function isInside(row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function isWalkable(row, col) {
  return isInside(row, col) && board[row][col] !== WALL;
}

function countRemaining() {
  let total = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === DOT || board[r][c] === POWER) total++;
    }
  }

  return total;
}

function getWallClasses(row, col) {
  if (board[row][col] !== WALL) return "";

  let cls = "wall";

  const topOpen = row === 0 || board[row - 1][col] !== WALL;
  const rightOpen = col === cols - 1 || board[row][col + 1] !== WALL;
  const bottomOpen = row === rows - 1 || board[row + 1][col] !== WALL;
  const leftOpen = col === 0 || board[row][col - 1] !== WALL;

  if (topOpen) cls += " wall-top";
  if (rightOpen) cls += " wall-right";
  if (bottomOpen) cls += " wall-bottom";
  if (leftOpen) cls += " wall-left";

  return cls;
}

// Render Board //
function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (board[row][col] === WALL) {
        cell.className = `cell ${getWallClasses(row, col)}`;

        if (row === 0 && col === 0) {
          cell.classList.add("outer-top-left");
        }

        if (row === 0 && col === cols - 1) {
          cell.classList.add("outer-top-right");
        }

        if (row === rows - 1 && col === 0) {
          cell.classList.add("outer-bottom-left");
        }

        if (row === rows - 1 && col === cols - 1) {
          cell.classList.add("outer-bottom-right");
        }
      }

      if (board[row][col] === DOT) {
        const dot = document.createElement("span");
        dot.className = "dot";
        cell.appendChild(dot);
      }

      if (board[row][col] === POWER) {
        const power = document.createElement("span");
        power.className = "power";
        power.textContent = getPowerEmoji(row, col);
        cell.appendChild(power);
      }

      const ghostHere = ghosts.find((g) => g.row === row && g.col === col);

      if (ghostHere) {
        const ghost = document.createElement("div");
        ghost.className = `ghost${powerMode ? " frightened" : ""}`;

        const ghostIcon = document.createElement("span");
        ghostIcon.className = "ghost-icon";
        ghostIcon.textContent = "👻";

        ghost.appendChild(ghostIcon);
        cell.appendChild(ghost);
      }

      if (pacman.row === row && pacman.col === col) {
        const pac = document.createElement("div");
        pac.className = `pacman dir-${pacmanDirection}${powerMode ? " power" : ""}`;
        cell.appendChild(pac);
      }

      boardEl.appendChild(cell);
    }
  }
}

// Movement //
function handleMovement(event) {
  if (!gameRunning || isPaused || !gameScreen.classList.contains("active")) return;

  let nextRow = pacman.row;
  let nextCol = pacman.col;

  if (event.key === "ArrowUp") {
    nextRow--;
    pacmanDirection = "up";
  } else if (event.key === "ArrowDown") {
    nextRow++;
    pacmanDirection = "down";
  } else if (event.key === "ArrowLeft") {
    nextCol--;
    pacmanDirection = "left";
  } else if (event.key === "ArrowRight") {
    nextCol++;
    pacmanDirection = "right";
  } else {
    return;
  }

  event.preventDefault();

  if (nextCol < 0) nextCol = cols - 1;
  if (nextCol >= cols) nextCol = 0;

  if (!isWalkable(nextRow, nextCol)) return;

  pacman.row = nextRow;
  pacman.col = nextCol;

  const tile = board[nextRow][nextCol];

  if (tile === DOT) {
    board[nextRow][nextCol] = EMPTY;
    score += 10;
    playEatSound();
  } else if (tile === POWER) {
    board[nextRow][nextCol] = EMPTY;
    score += 50;
    playEatSound();
    activatePowerMode();
  }

  const ghostIndex = ghosts.findIndex((g) => g.row === pacman.row && g.col === pacman.col);

  if (ghostIndex !== -1) {
    if (powerMode) {
      score += 200;
      ghosts[ghostIndex].row = ghosts[ghostIndex].startRow;
      ghosts[ghostIndex].col = ghosts[ghostIndex].startCol;
    } else {
      loseLife();
      return;
    }
  }

  updateHUD();
  renderBoard();
  checkWin();
}

// Ghost Movement //
function moveGhosts() {
  if (!gameRunning || isPaused) return;

  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];

  ghosts.forEach((ghost) => {
    const options = [];

    directions.forEach((dir) => {
      let nr = ghost.row + dir.row;
      let nc = ghost.col + dir.col;

      if (nc < 0) nc = cols - 1;
      if (nc >= cols) nc = 0;

      if (isWalkable(nr, nc)) {
        options.push({ row: nr, col: nc });
      }
    });

    if (options.length > 0) {
      const move = options[Math.floor(Math.random() * options.length)];
      ghost.row = move.row;
      ghost.col = move.col;
    }
  });

  const ghostIndex = ghosts.findIndex((g) => g.row === pacman.row && g.col === pacman.col);

  if (ghostIndex !== -1) {
    if (powerMode) {
      score += 200;
      ghosts[ghostIndex].row = ghosts[ghostIndex].startRow;
      ghosts[ghostIndex].col = ghosts[ghostIndex].startCol;
      updateHUD();
    } else {
      loseLife();
      return;
    }
  }

  renderBoard();
}

// Position Reset //
function resetPositions() {
  pacman = { row: 5, col: 0 };

  ghosts.forEach((g) => {
    g.row = g.startRow;
    g.col = g.startCol;
  });

  renderBoard();
}

// Life Loss //
function loseLife() {
  lives--;
  updateHUD();

  if (lives <= 0) {
    gameOver();
    return;
  }

  playHitSound();
  showHitOverlay();

  gameRunning = false;
  clearInterval(ghostInterval);

  setTimeout(() => {
    resetPositions();
    gameRunning = true;
    startGhosts();
  }, HIT_RESET_DELAY_MS);
}

// Game Over //
function gameOver() {
  gameRunning = false;
  clearAllGameTimers();
  powerMode = false;
  powerStatusEl.textContent = "";

  playLoseSound();
  buildGhostRain();
  showScreen(gameOverScreen);
}

// Win Check //
function checkWin() {
  if (countRemaining() > 0) return;

  gameRunning = false;
  clearAllGameTimers();
  powerMode = false;
  powerStatusEl.textContent = "";

  const isNewRecord = saveBestTime(playerName, timeSeconds);
  updateHUD();

  winTextEl.textContent = `${playerName}, you cleared the board in ${timeSeconds}s!`;

  if (isNewRecord) {
    recordBannerEl.classList.remove("hidden");
  } else {
    recordBannerEl.classList.add("hidden");
  }

  showScreen(winScreen);

  requestAnimationFrame(() => {
    startConfetti();
  });

  playWinSound();
  playClapSound();
}

// Pause //
function togglePause() {
  if (!gameScreen.classList.contains("active")) return;

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  pauseOverlay.classList.toggle("hidden", !isPaused);
  pauseBtn.classList.toggle("active", isPaused);
}

// Exit //
function exitToStart() {
  gameRunning = false;
  isPaused = false;

  clearAllGameTimers();
  stopConfetti();

  pauseOverlay.classList.add("hidden");
  pauseBtn.textContent = "Pause";
  pauseBtn.classList.remove("active");

  showScreen(startScreen);
}

// Ghost Rain //
function buildGhostRain() {
  ghostRain.innerHTML = "";

  for (let i = 0; i < 26; i++) {
    const ghost = document.createElement("div");
    ghost.className = "falling-ghost";
    ghost.textContent = "👻";
    ghost.style.left = `${Math.random() * 100}%`;
    ghost.style.animationDuration = `${3 + Math.random() * 4}s`;
    ghost.style.animationDelay = `${Math.random() * 2}s`;
    ghostRain.appendChild(ghost);
  }
}

// Confetti //
function startConfetti() {
  if (!confettiCanvas) return;

  const ctx = confettiCanvas.getContext("2d");
  if (!ctx) return;

  const width = confettiCanvas.width = confettiCanvas.offsetWidth;
  const height = confettiCanvas.height = confettiCanvas.offsetHeight;

  const colors = ["#ffd43b", "#9cff57", "#9cdcfe", "#ff5db1", "#ff7a00", "#ffffff"];

  const pieces = Array.from({ length: 220 }, () => ({
    x: Math.random() * width,
    y: Math.random() * -height,
    w: 6 + Math.random() * 6,
    h: 10 + Math.random() * 8,
    dx: -1.5 + Math.random() * 3,
    dy: 2 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI,
    dr: -0.15 + Math.random() * 0.3
  }));

  function draw() {
    ctx.clearRect(0, 0, width, height);

    pieces.forEach((piece) => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();

      piece.x += piece.dx;
      piece.y += piece.dy;
      piece.rotation += piece.dr;

      if (piece.y > height + 20) {
        piece.y = -20;
        piece.x = Math.random() * width;
      }
    });

    confettiAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }

  if (!confettiCanvas) return;

  const ctx = confettiCanvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// Events //
startBtn.addEventListener("click", startGame);

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startGame();
});

pauseBtn.addEventListener("click", togglePause);

exitBtnGame.addEventListener("click", exitToStart);
exitBtnOver.addEventListener("click", exitToStart);
exitBtnWin.addEventListener("click", exitToStart);

newGameBtn.addEventListener("click", restartGame);
playAgainBtn.addEventListener("click", restartGame);

document.addEventListener("keydown", handleMovement);

// Init //
showScreen(startScreen);