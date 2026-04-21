// Memory Game Full JS //

// Screens //
const modeScreen = document.getElementById("modeScreen");
const namesScreen = document.getElementById("namesScreen");
const topicScreen = document.getElementById("topicScreen");
const gameScreen = document.getElementById("gameScreen");
const winnerScreen = document.getElementById("winnerScreen");

// Mode Screen //
const modeButtons = document.querySelectorAll(".mode-btn");

// Names Screen //
const namesForm = document.getElementById("namesForm");
const namesInputs = document.getElementById("namesInputs");
const backToModeBtn = document.getElementById("backToModeBtn");

// Topic Screen //
const topicButtons = document.querySelectorAll(".topic-btn");
const backToNamesBtn = document.getElementById("backToNamesBtn");

// Game Screen //
const timerEl = document.getElementById("timer");
const gameBoard = document.getElementById("gameBoard");

const player1Box = document.getElementById("player1");
const player2Box = document.getElementById("player2");
const player3Box = document.getElementById("player3");
const player4Box = document.getElementById("player4");

const topicControlButtons = document.querySelectorAll(".topic-control-btn");

const shuffleBtn = document.getElementById("shuffleBtn");
const newGameBtn = document.getElementById("newGameBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");
const exitBtn = document.getElementById("exitBtn");

// Winner Screen //
const winnerMessage = document.getElementById("winnerMessage");
const winnerScore = document.getElementById("winnerScore");
const playAgainBtn = document.getElementById("playAgainBtn");
const homeBtn = document.getElementById("homeBtn");
const winnerConfetti = document.getElementById("winnerConfetti");

// Categories //
const categories = {
  flowers: ["🌹", "🌷", "🌻", "🌼", "🪻", "🌸", "💐", "🥀", "🌺", "🪷", "🌿", "🍀"],
  space: ["🌍", "🌙", "⭐", "☀️", "🪐", "🚀", "👨‍🚀", "🌌", "☄️", "🛸", "🔭", "🌠"],
  weather: ["☀️", "🌤️", "⛅", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "🌪️", "🌈", "💨", "☂️"],
  desserts: ["🍰", "🧁", "🍩", "🍪", "🍫", "🍬", "🍭", "🍦", "🍨", "🥧", "🍮", "🍓"]
};

// Sound System //
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(frequency, duration = 0.12, type = "sine", volume = 0.03) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playFlipSound() {
  playTone(520, 0.05, "square", 0.025);
  setTimeout(() => playTone(680, 0.04, "square", 0.02), 35);
}

function playWrongSound() {
  playTone(220, 0.14, "sawtooth", 0.035);
  setTimeout(() => playTone(180, 0.16, "sawtooth", 0.03), 100);
}

function playWinSound() {
  const notes = [523, 659, 784, 1046, 1318];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.18, "triangle", 0.04);
    }, index * 140);
  });
}

function playLoseSound() {
  const notes = [392, 330, 262, 196];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.22, "sawtooth", 0.04);
    }, index * 170);
  });
}

// State //
let gameMode = "";
let players = [];
let selectedCategory = "";
let currentPlayerIndex = 0;

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;

const turnTime = 20;
let timeLeft = turnTime;
let timerInterval = null;

let isGameActive = false;
let isComputerTurnRunning = false;

let computerMemory = {};

// Init //
attachEvents();

// Event Listeners //
function attachEvents() {
  document.addEventListener("click", initAudio, { once: true });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      gameMode = button.dataset.mode;
      buildNameInputs();
      showScreen(namesScreen);
    });
  });

  backToModeBtn.addEventListener("click", () => {
    showScreen(modeScreen);
  });

  namesForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const success = savePlayersFromInputs();
    if (!success) return;

    showScreen(topicScreen);
  });

  backToNamesBtn.addEventListener("click", () => {
    showScreen(namesScreen);
  });

  topicButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.topic;
      startNewRound();
      updateActiveTopicUI();
      showScreen(gameScreen);
    });
  });

  topicControlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!isGameActive) return;
      handleTopicChange(button.dataset.topic);
    });
  });

  shuffleBtn.addEventListener("click", handleShuffle);
  newGameBtn.addEventListener("click", handleNewGame);
  resetScoreBtn.addEventListener("click", handleResetScores);
  exitBtn.addEventListener("click", handleExit);

  playAgainBtn.addEventListener("click", () => {
    clearWinnerConfetti();
    startNewRound();
    updateActiveTopicUI();
    showScreen(gameScreen);
  });

  homeBtn.addEventListener("click", () => {
    resetAllState();
    showScreen(modeScreen);
  });
}

// Screen Helpers //
function showScreen(screenToShow) {
  [modeScreen, namesScreen, topicScreen, gameScreen, winnerScreen].forEach((screen) => {
    screen.classList.remove("active-screen");
    screen.classList.add("hidden-screen");
  });

  screenToShow.classList.remove("hidden-screen");
  screenToShow.classList.add("active-screen");
}

// Names Screen //
function buildNameInputs() {
  namesInputs.innerHTML = "";

  if (gameMode === "computer") {
    namesInputs.appendChild(createNameInput("Player Name"));
    return;
  }

  const count = Number(gameMode);

  for (let i = 1; i <= count; i += 1) {
    namesInputs.appendChild(createNameInput(`Player ${i} Name`));
  }
}

function createNameInput(placeholderText) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "name-input";
  input.placeholder = placeholderText;

  input.addEventListener("input", () => {
    input.classList.remove("input-error");
  });

  return input;
}

function savePlayersFromInputs() {
  const inputs = [...document.querySelectorAll(".name-input")];
  const newPlayers = [];
  let isValid = true;

  inputs.forEach((input) => {
    input.classList.remove("input-error");

    if (input.value.trim() === "") {
      isValid = false;
      input.classList.add("input-error");
    }
  });

  if (!isValid) {
    alert("Please enter all player names before continuing.");
    return false;
  }

  if (gameMode === "computer") {
    newPlayers.push({
      name: inputs[0].value.trim(),
      score: 0,
      isComputer: false
    });

    newPlayers.push({
      name: "Computer",
      score: 0,
      isComputer: true
    });

    players = newPlayers;
    return true;
  }

  inputs.forEach((input) => {
    newPlayers.push({
      name: input.value.trim(),
      score: 0,
      isComputer: false
    });
  });

  players = newPlayers;
  return true;
}

// Game Setup //
function startNewRound(keepScores = false) {
  clearTimer();

  if (!keepScores) {
    players.forEach((player) => {
      player.score = 0;
    });
  }

  currentPlayerIndex = 0;
  matchedPairs = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  isGameActive = true;
  isComputerTurnRunning = false;
  computerMemory = {};

  updatePlayerBoxes();
  updateActivePlayerUI();
  createBoard();
  startTurnTimer();

  if (isCurrentPlayerComputer()) {
    runComputerTurn();
  }
}

function createBoard() {
  gameBoard.innerHTML = "";

  const symbols = [...categories[selectedCategory], ...categories[selectedCategory]];
  const shuffled = shuffleArray(symbols);

  shuffled.forEach((symbol, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.index = String(index);
    cardEl.dataset.symbol = symbol;

    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-front"></div>
        <div class="card-back">${symbol}</div>
      </div>
    `;

    cardEl.addEventListener("click", handleCardClick);
    gameBoard.appendChild(cardEl);
  });
}

function shuffleArray(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]];
  }

  return arr;
}

// Card Memory Helpers //
function rememberCard(cardEl) {
  const symbol = cardEl.dataset.symbol;
  const index = cardEl.dataset.index;

  if (!computerMemory[symbol]) {
    computerMemory[symbol] = [];
  }

  if (!computerMemory[symbol].includes(index)) {
    computerMemory[symbol].push(index);
  }
}

function forgetMatchedCards(symbol) {
  delete computerMemory[symbol];
}

function getKnownPair() {
  for (const symbol in computerMemory) {
    const indexes = computerMemory[symbol];

    const validCards = indexes
      .map((index) => document.querySelector(`.card[data-index="${index}"]`))
      .filter((card) => {
        return (
          card &&
          !card.classList.contains("matched") &&
          !card.classList.contains("flipped")
        );
      });

    if (validCards.length >= 2) {
      return [validCards[0], validCards[1]];
    }
  }

  return null;
}

function getKnownMatchForCard(cardEl) {
  const symbol = cardEl.dataset.symbol;
  const currentIndex = cardEl.dataset.index;

  if (!computerMemory[symbol]) return null;

  const matchCard = computerMemory[symbol]
    .filter((index) => index !== currentIndex)
    .map((index) => document.querySelector(`.card[data-index="${index}"]`))
    .find((card) => {
      return (
        card &&
        !card.classList.contains("matched") &&
        !card.classList.contains("flipped")
      );
    });

  return matchCard || null;
}

// Card Logic //
function handleCardClick(event) {
  if (!isGameActive) return;
  if (isCurrentPlayerComputer()) return;
  if (isComputerTurnRunning) return;

  const clickedCard = event.currentTarget;

  if (lockBoard) return;
  if (clickedCard.classList.contains("flipped")) return;
  if (clickedCard.classList.contains("matched")) return;

  flipCard(clickedCard);

  if (!firstCard) {
    firstCard = clickedCard;
    return;
  }

  secondCard = clickedCard;
  lockBoard = true;
  checkForMatch();
}

function flipCard(cardEl) {
  cardEl.classList.add("flipped");
  rememberCard(cardEl);
  playFlipSound();
}

function unflipCards(cardA, cardB) {
  cardA.classList.remove("flipped");
  cardB.classList.remove("flipped");
}

function markCardsAsMatched(cardA, cardB) {
  cardA.classList.remove("flipped");
  cardB.classList.remove("flipped");
  cardA.classList.add("matched");
  cardB.classList.add("matched");
}

function checkForMatch() {
  if (!firstCard || !secondCard) return;

  const isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;

  if (isMatch) {
    handleMatch();
  } else {
    handleMismatch();
  }
}

function handleMatch() {
  const savedFirst = firstCard;
  const savedSecond = secondCard;

  markCardsAsMatched(savedFirst, savedSecond);

  players[currentPlayerIndex].score += 1;
  matchedPairs += 1;

  forgetMatchedCards(savedFirst.dataset.symbol);
  updatePlayerBoxes();

  setTimeout(() => {
    resetSelection();
    lockBoard = false;

    if (matchedPairs === 12) {
      endGame();
      return;
    }

    restartTurnTimer();
    updateActivePlayerUI();

    if (isCurrentPlayerComputer()) {
      runComputerTurn();
    }
  }, 500);
}

function handleMismatch() {
  const savedFirst = firstCard;
  const savedSecond = secondCard;

  playWrongSound();

  setTimeout(() => {
    unflipCards(savedFirst, savedSecond);
    resetSelection();
    lockBoard = false;
    goToNextPlayer();
  }, 1000);
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
}

// Players UI //
function updatePlayerBoxes() {
  const boxes = [player1Box, player2Box, player3Box, player4Box];

  boxes.forEach((box, index) => {
    if (players[index]) {
      box.classList.remove("hidden");
      box.innerHTML = `${players[index].name}: <span>${players[index].score}</span>`;
    } else {
      box.classList.add("hidden");
      box.innerHTML = `Player ${index + 1}: <span>0</span>`;
    }
  });

  updateActivePlayerUI();
}

function updateActivePlayerUI() {
  const boxes = [player1Box, player2Box, player3Box, player4Box];

  boxes.forEach((box, index) => {
    box.classList.remove("active");

    if (players[index] && index === currentPlayerIndex) {
      box.classList.add("active");
    }
  });
}

function updateActiveTopicUI() {
  topicControlButtons.forEach((button) => {
    button.classList.remove("active-topic");

    if (button.dataset.topic === selectedCategory) {
      button.classList.add("active-topic");
    }
  });
}

// Turn Logic //
function goToNextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateActivePlayerUI();
  restartTurnTimer();

  if (isCurrentPlayerComputer()) {
    runComputerTurn();
  }
}

function isCurrentPlayerComputer() {
  return !!players[currentPlayerIndex]?.isComputer;
}

// Timer //
function startTurnTimer() {
  clearTimer();
  timeLeft = turnTime;
  renderTimer();

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    renderTimer();

    if (timeLeft <= 0) {
      clearTimer();
      handleTimeOut();
    }
  }, 1000);
}

function restartTurnTimer() {
  startTurnTimer();
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function renderTimer() {
  const seconds = String(timeLeft).padStart(2, "0");
  timerEl.textContent = `00:${seconds}`;

  if (timeLeft <= 5) {
    timerEl.classList.add("danger");
  } else {
    timerEl.classList.remove("danger");
  }
}

function handleTimeOut() {
  if (!isGameActive) return;

  if (firstCard && !secondCard) {
    firstCard.classList.remove("flipped");
    firstCard = null;
  }

  if (firstCard && secondCard) {
    firstCard.classList.remove("flipped");
    secondCard.classList.remove("flipped");
    resetSelection();
  }

  lockBoard = false;
  goToNextPlayer();
}

// Computer Logic //
function runComputerTurn() {
  if (!isGameActive) return;
  if (!isCurrentPlayerComputer()) return;
  if (isComputerTurnRunning) return;

  isComputerTurnRunning = true;

  const availableCards = getAvailableCards();

  if (availableCards.length < 2) {
    isComputerTurnRunning = false;
    return;
  }

  const knownPair = getKnownPair();

  if (knownPair) {
    playComputerPair(knownPair[0], knownPair[1]);
    return;
  }

  const firstChoice = availableCards[Math.floor(Math.random() * availableCards.length)];

  setTimeout(() => {
    if (!isGameActive || !firstChoice || firstChoice.classList.contains("matched")) {
      isComputerTurnRunning = false;
      return;
    }

    flipCard(firstChoice);
    firstCard = firstChoice;

    const knownMatch = getKnownMatchForCard(firstChoice);
    let secondChoice;

    if (knownMatch) {
      secondChoice = knownMatch;
    } else {
      const remainingCards = getAvailableCards().filter((card) => card !== firstChoice);

      if (remainingCards.length === 0) {
        isComputerTurnRunning = false;
        return;
      }

      secondChoice = remainingCards[Math.floor(Math.random() * remainingCards.length)];
    }

    setTimeout(() => {
      if (!isGameActive || !secondChoice || secondChoice.classList.contains("matched")) {
        isComputerTurnRunning = false;
        return;
      }

      flipCard(secondChoice);
      secondCard = secondChoice;
      lockBoard = true;
      isComputerTurnRunning = false;

      checkForMatch();
    }, 700);
  }, 700);
}

function playComputerPair(firstChoice, secondChoice) {
  setTimeout(() => {
    if (!isGameActive || !firstChoice || !secondChoice) {
      isComputerTurnRunning = false;
      return;
    }

    flipCard(firstChoice);
    firstCard = firstChoice;

    setTimeout(() => {
      if (!isGameActive || secondChoice.classList.contains("matched")) {
        isComputerTurnRunning = false;
        return;
      }

      flipCard(secondChoice);
      secondCard = secondChoice;
      lockBoard = true;
      isComputerTurnRunning = false;

      checkForMatch();
    }, 700);
  }, 700);
}

function getAvailableCards() {
  return [...document.querySelectorAll(".card")].filter((card) => {
    return !card.classList.contains("matched") && !card.classList.contains("flipped");
  });
}

// Topic Change In Game //
function handleTopicChange(newTopic) {
  if (newTopic === selectedCategory) return;

  const confirmed = confirm(
    "Changing topic will start a new game round and reset the scores. Continue?"
  );

  if (!confirmed) return;

  selectedCategory = newTopic;
  startNewRound();
  updateActiveTopicUI();
}

// Buttons //
function handleShuffle() {
  if (!isGameActive) return;

  const confirmed = confirm(
    "Shuffle the cards and restart this round?\nScores will stay the same."
  );

  if (!confirmed) return;

  clearTimer();

  matchedPairs = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  isComputerTurnRunning = false;
  currentPlayerIndex = 0;
  computerMemory = {};

  updatePlayerBoxes();
  updateActivePlayerUI();
  createBoard();
  startTurnTimer();

  if (isCurrentPlayerComputer()) {
    runComputerTurn();
  }
}

function handleNewGame() {
  clearTimer();
  resetBoardOnly();
  showScreen(topicScreen);
}

function handleResetScores() {
  const confirmed = confirm("Reset all points to 0?");
  if (!confirmed) return;

  players.forEach((player) => {
    player.score = 0;
  });

  updatePlayerBoxes();
}

function handleExit() {
  const confirmed = confirm("Exit to home screen?");
  if (!confirmed) return;

  resetAllState();
  showScreen(modeScreen);
}

// Winner //
function endGame() {
  isGameActive = false;
  clearTimer();
  timerEl.classList.remove("danger");

  const winners = getWinners();

  const isVsComputer =
    players.length === 2 &&
    players.some((player) => player.isComputer);

  const computerWon =
    isVsComputer &&
    winners.length === 1 &&
    winners[0].isComputer;

  clearWinnerConfetti();

  if (computerWon) {
    playLoseSound();
  } else {
    playWinSound();
    launchWinnerConfetti();
  }

  if (winners.length === 1) {
    winnerMessage.textContent = `Winner: ${winners[0].name}`;
    winnerScore.textContent = `Score: ${winners[0].score}`;
  } else {
    const names = winners.map((player) => player.name).join(", ");
    winnerMessage.textContent = "It's a Tie!";
    winnerScore.textContent = `${names} | Score: ${winners[0].score}`;
  }

  showScreen(winnerScreen);
}

function getWinners() {
  const maxScore = Math.max(...players.map((player) => player.score));
  return players.filter((player) => player.score === maxScore);
}

function getCategoryConfettiIcons() {
  return categories[selectedCategory] || ["🎉"];
}

function launchWinnerConfetti() {
  if (!winnerConfetti) return;

  winnerConfetti.innerHTML = "";

  const icons = getCategoryConfettiIcons();
  const piecesCount = 28;

  for (let i = 0; i < piecesCount; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.textContent = icons[Math.floor(Math.random() * icons.length)];

    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2.8 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.fontSize = `${24 + Math.random() * 18}px`;

    winnerConfetti.appendChild(piece);
  }

  setTimeout(() => {
    winnerConfetti.innerHTML = "";
  }, 5000);
}

function clearWinnerConfetti() {
  if (winnerConfetti) {
    winnerConfetti.innerHTML = "";
  }
}

// Reset Helpers //
function resetBoardOnly() {
  isGameActive = false;
  clearTimer();

  gameBoard.innerHTML = "";
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  isComputerTurnRunning = false;
  computerMemory = {};

  timerEl.classList.remove("danger");
}

function resetAllState() {
  clearTimer();
  clearWinnerConfetti();

  gameMode = "";
  players = [];
  selectedCategory = "";
  currentPlayerIndex = 0;

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;

  timeLeft = turnTime;
  isGameActive = false;
  isComputerTurnRunning = false;
  computerMemory = {};

  gameBoard.innerHTML = "";
  namesInputs.innerHTML = "";

  timerEl.textContent = "00:20";
  timerEl.classList.remove("danger");

  [player1Box, player2Box, player3Box, player4Box].forEach((box, index) => {
    box.classList.remove("active");

    if (index < 2) {
      box.classList.remove("hidden");
      box.innerHTML = `Player ${index + 1}: <span>0</span>`;
    } else {
      box.classList.add("hidden");
      box.innerHTML = `Player ${index + 1}: <span>0</span>`;
    }
  });

  topicControlButtons.forEach((button) => {
    button.classList.remove("active-topic");
  });
}