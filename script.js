


const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const coinCountElement = document.getElementById("coin-count");
const overlay = document.getElementById("game-overlay");
const overlayKicker = document.getElementById("overlay-kicker");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startButton = document.getElementById("start-button");
const soundButton = document.getElementById("sound-button");



const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_HEIGHT = 64;
const GROUND_Y = HEIGHT - GROUND_HEIGHT;
const GRAVITY = 1850;
const JUMP_FORCE = 690;
const START_SPEED = 330;
const MAX_SPEED = 650;
const PLAYER_WIDTH = 42;
const PLAYER_HEIGHT = 52;
const STORAGE_KEY = "superJumpAdventureBest";



let player;
let obstacles = [];
let coins = [];
let particles = [];
let score = 0;
let coinCount = 0;
let gameSpeed = START_SPEED;
let obstacleTimer = 0;
let nextObstacleIn = 1.25;
let coinTimer = 0;
let lastTimestamp = 0;
let animationId = null;
let gameState = "ready";
let soundEnabled = true;
let audioContext = null;
let worldOffset = 0;
let gameOverTimestamp = 0;

function getStoredBestScore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return Number(stored) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (err) {
    // Ignore storage restrictions
  }
}

let bestScore = getStoredBestScore();

bestScoreElement.textContent = formatScore(bestScore);



function createPlayer() {
  return {
    x: 112,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    onGround: true,
    invulnerable: false
  };
}

function handleOverlayAction() {
  if (gameState === "paused") {
    togglePause();
  } else {
    startGame();
  }
}

startButton.addEventListener("click", handleOverlayAction);
soundButton.addEventListener("click", toggleSound);

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    if (gameState === "paused") {
      togglePause();
    } else {
      handleJumpInput();
    }
  }

  if (event.code === "KeyP") {
    togglePause();
  }

  if (event.code === "Enter") {
    if (gameState === "paused") {
      togglePause();
    } else if (gameState === "ready" || gameState === "gameover") {
      if (gameState === "gameover" && Date.now() - gameOverTimestamp < 250) {
        return;
      }
      startGame();
    }
  }
});

const gameFrame = document.querySelector(".game-frame");
if (gameFrame) {
  gameFrame.addEventListener("pointerdown", (event) => {
    if (event.target === startButton || event.target.closest("#start-button")) return;
    if (gameState === "running") {
      event.preventDefault();
      handleJumpInput();
    }
  });
} else {
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handleJumpInput();
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && gameState === "running") {
    togglePause();
  }
});


function startGame() {

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  player = createPlayer();
  obstacles = [];
  coins = [];
  particles = [];
  score = 0;
  coinCount = 0;
  gameSpeed = START_SPEED;
  obstacleTimer = 0;
  nextObstacleIn = 1.1;
  coinTimer = 0;
  worldOffset = 0;
  lastTimestamp = 0;
  gameState = "running";

  updateScoreboard();
  hideOverlay();
  playSound("start");

  animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (gameState === "running") {
    gameState = "paused";
    showOverlay("PAUSED", "TAKE A BREATHER!", "Press P, Space, or click Resume to continue.", "RESUME");
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if (gameState === "paused") {
    gameState = "running";
    hideOverlay();
    lastTimestamp = 0;
    animationId = requestAnimationFrame(gameLoop);
  }
}

function endGame() {
  if (gameState !== "running") return;

  gameState = "gameover";
  gameOverTimestamp = Date.now();
  playSound("hit");

  const finalScore = Math.floor(score);
  const isNewBest = finalScore > bestScore;
  if (isNewBest) {
    bestScore = finalScore;
    saveBestScore(bestScore);
  }

  bestScoreElement.textContent = formatScore(bestScore);
  showOverlay(
    "GAME OVER",
    isNewBest && finalScore > 0 ? "NEW BEST SCORE! ★" : "OH NO! YOU GOT HIT!",
    `You scored ${finalScore} points and collected ${coinCount} coins. Try again!`,
    "PLAY AGAIN"
  );
}



function handleJumpInput() {
  if (gameState === "ready") {
    startGame();
    return;
  }

  if (gameState === "gameover") {
    if (Date.now() - gameOverTimestamp < 250) return;
    startGame();
    return;
  }

  if (gameState !== "running") return;


  if (player.onGround) {
    player.velocityY = -JUMP_FORCE;
    player.onGround = false;
    playSound("jump");
    createDust(player.x + 10, GROUND_Y - 3);
  }
}



function gameLoop(timestamp) {
  if (gameState !== "running") return;


  let deltaTime = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000;

  
  deltaTime = Math.min(deltaTime, 0.035);
  lastTimestamp = timestamp;

  updateGame(deltaTime);
  drawGame();

  if (gameState === "running") {
    animationId = requestAnimationFrame(gameLoop);
  } else {
    animationId = null;
  }
}



function updateGame(deltaTime) {

  gameSpeed = Math.min(MAX_SPEED, START_SPEED + score * 1.7);
  worldOffset += gameSpeed * deltaTime;

  updatePlayer(deltaTime);
  updateObstacles(deltaTime);
  updateCoins(deltaTime);
  updateParticles(deltaTime);


  score += deltaTime * 10;
  updateScoreboard();

  checkCollisions();
}

function updatePlayer(deltaTime) {
  if (!player) return;


  player.velocityY += GRAVITY * deltaTime;
  player.y += player.velocityY * deltaTime;


  if (player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.onGround = true;
  }
}



function updateObstacles(deltaTime) {
  obstacleTimer += deltaTime;

  if (obstacleTimer >= nextObstacleIn) {
    spawnObstacle();
    obstacleTimer = 0;


    nextObstacleIn = randomBetween(1.0, 1.75) * (START_SPEED / gameSpeed);
    nextObstacleIn = Math.max(0.82, nextObstacleIn);
  }

  for (const obstacle of obstacles) {
    obstacle.x -= gameSpeed * deltaTime;
  }

  
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);
}

function spawnObstacle() {
  const useEnemy = Math.random() < 0.42;

  if (useEnemy) {
    obstacles.push({
      type: "enemy",
      x: WIDTH + 20,
      y: GROUND_Y - 34,
      width: 34,
      height: 34
    });
  } else {
    const tall = Math.random() < 0.28;
    obstacles.push({
      type: "pipe",
      x: WIDTH + 20,
      y: GROUND_Y - (tall ? 76 : 54),
      width: tall ? 48 : 42,
      height: tall ? 76 : 54
    });
  }
}



function updateCoins(deltaTime) {
  coinTimer += deltaTime;

  if (coinTimer >= 1.65) {
    spawnCoin();
    coinTimer = 0;
  }

  for (const coin of coins) {
    coin.x -= gameSpeed * deltaTime;
    coin.phase += deltaTime * 6;
  }

  coins = coins.filter((coin) => coin.x > -30 && !coin.collected);
}

function spawnCoin() {

  const heightOptions = [GROUND_Y - 78, GROUND_Y - 112, GROUND_Y - 145];
  const y = heightOptions[Math.floor(Math.random() * heightOptions.length)];

  coins.push({
    x: WIDTH + 20,
    y,
    radius: 11,
    phase: 0,
    collected: false
  });
}



function rectanglesOverlap(a, b) {
  
  const insetA = 5;
  const insetB = 4;

  return (
    a.x + insetA < b.x + b.width - insetB &&
    a.x + a.width - insetA > b.x + insetB &&
    a.y + insetA < b.y + b.height - insetB &&
    a.y + a.height - insetA > b.y + insetB
  );
}

function checkCollisions() {
  const playerHitbox = {
    x: player.x,
    y: player.y + 3,
    width: player.width,
    height: player.height - 3
  };


  for (const obstacle of obstacles) {
    if (rectanglesOverlap(playerHitbox, obstacle)) {
      endGame();
      return;
    }
  }


  for (const coin of coins) {
    const bob = Math.sin(coin.phase) * 4;
    const coinBox = {
      x: coin.x - coin.radius,
      y: coin.y + bob - coin.radius,
      width: coin.radius * 2,
      height: coin.radius * 2
    };

    if (!coin.collected && rectanglesOverlap(playerHitbox, coinBox)) {
      coin.collected = true;
      coinCount += 1;
      score += 50;
      updateScoreboard();
      playSound("coin");
      createCoinParticles(coin.x, coin.y + bob);
    }
  }
}



function drawGame() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawClouds();
  drawHills();
  drawGround();

  for (const coin of coins) drawCoin(coin);
  for (const obstacle of obstacles) drawObstacle(obstacle);
  drawPlayer();
  drawParticles();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#70cafa");
  sky.addColorStop(1, "#d2f4ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawClouds() {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const cloudPositions = [
    { x: 120, y: 75, scale: 1 },
    { x: 410, y: 112, scale: 0.75 },
    { x: 760, y: 65, scale: 1.15 }
  ];

  for (const cloud of cloudPositions) {
    const drift = (worldOffset * 0.12) % (WIDTH + 180);
    let x = (cloud.x - drift + WIDTH + 180) % (WIDTH + 180) - 80;
    drawCloud(x, cloud.y, cloud.scale);
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillRect(0, 15, 90, 24);
  ctx.fillRect(15, 0, 30, 28);
  ctx.fillRect(38, 7, 34, 23);
  ctx.fillRect(65, 17, 18, 18);
  ctx.restore();
}

function drawHills() {
  
  const shift = (worldOffset * 0.22) % 420;
  ctx.fillStyle = "#8ed47b";

  for (let i = -1; i < 4; i++) {
    const x = i * 420 - shift;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 130, GROUND_Y - 95);
    ctx.lineTo(x + 270, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#64bd68";
  for (let i = -1; i < 5; i++) {
    const x = i * 310 - ((worldOffset * 0.35) % 310);
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 95, GROUND_Y - 54);
    ctx.lineTo(x + 205, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = "#9a5b36";
  ctx.fillRect(0, GROUND_Y, WIDTH, GROUND_HEIGHT);

  ctx.fillStyle = "#55b94e";
  ctx.fillRect(0, GROUND_Y, WIDTH, 12);

  ctx.fillStyle = "#318d43";
  ctx.fillRect(0, GROUND_Y + 10, WIDTH, 5);

  const tileSize = 42;
  const offset = worldOffset % tileSize;
  ctx.fillStyle = "#c17a49";
  ctx.strokeStyle = "#7b442f";
  ctx.lineWidth = 2;

  for (let x = -tileSize; x < WIDTH + tileSize; x += tileSize) {
    const tileX = x - offset;
    ctx.strokeRect(tileX, GROUND_Y + 17, tileSize, 24);
    ctx.fillRect(tileX + 8, GROUND_Y + 24, 5, 4);
  }
}

function drawPlayer() {
  if (!player) return;

  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const runningFrame = Math.floor(worldOffset / 18) % 2;


  ctx.save();


  ctx.fillStyle = "#c93435";
  ctx.fillRect(x + 7, y + 1, 27, 9);
  ctx.fillRect(x + 2, y + 8, 34, 7);
  ctx.fillStyle = "#f4c18a";
  ctx.fillRect(x + 10, y + 15, 24, 15);
  ctx.fillStyle = "#6a382b";
  ctx.fillRect(x + 7, y + 13, 6, 13);
  ctx.fillRect(x + 29, y + 17, 5, 7);


  ctx.fillStyle = "#20243a";
  ctx.fillRect(x + 27, y + 18, 3, 4);
  ctx.fillRect(x + 20, y + 25, 12, 4);


  ctx.fillStyle = "#e64a43";
  ctx.fillRect(x + 8, y + 29, 27, 12);
  ctx.fillStyle = "#2457a7";
  ctx.fillRect(x + 10, y + 36, 24, 11);
  ctx.fillRect(x + 7, y + 31, 7, 11);
  ctx.fillStyle = "#ffd34e";
  ctx.fillRect(x + 15, y + 35, 3, 3);
  ctx.fillRect(x + 27, y + 35, 3, 3);


  ctx.fillStyle = "#f4c18a";
  ctx.fillRect(x + 2, y + 31, 7, 9);
  ctx.fillRect(x + 34, y + 30, 6, 9);


  ctx.fillStyle = "#4c342e";
  if (player.onGround && runningFrame === 0) {
    ctx.fillRect(x + 10, y + 46, 9, 5);
    ctx.fillRect(x + 27, y + 46, 9, 5);
  } else {
    ctx.fillRect(x + 8, y + 45, 10, 6);
    ctx.fillRect(x + 25, y + 43, 10, 6);
  }

  ctx.restore();
}

function drawObstacle(obstacle) {
  if (obstacle.type === "pipe") {

    ctx.fillStyle = "#14783d";
    ctx.fillRect(obstacle.x + 5, obstacle.y + 8, obstacle.width - 10, obstacle.height - 8);
    ctx.fillStyle = "#20a94e";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 14);
    ctx.fillStyle = "#72dc70";
    ctx.fillRect(obstacle.x + 5, obstacle.y + 3, 7, 7);
    ctx.fillStyle = "#105b35";
    ctx.fillRect(obstacle.x + obstacle.width - 10, obstacle.y + 13, 5, obstacle.height - 13);
    ctx.strokeStyle = "#145b37";
    ctx.lineWidth = 3;
    ctx.strokeRect(obstacle.x + 1, obstacle.y + 1, obstacle.width - 2, obstacle.height - 2);
  } else {

    const x = obstacle.x;
    const y = obstacle.y;
    ctx.fillStyle = "#7b3c2d";
    ctx.fillRect(x + 5, y + 13, 25, 18);
    ctx.fillStyle = "#c9473e";
    ctx.fillRect(x + 3, y + 5, 28, 11);
    ctx.fillRect(x + 9, y, 16, 7);
    ctx.fillStyle = "#fff2d2";
    ctx.fillRect(x + 9, y + 17, 5, 7);
    ctx.fillRect(x + 23, y + 17, 5, 7);
    ctx.fillStyle = "#2c2635";
    ctx.fillRect(x + 10, y + 19, 3, 4);
    ctx.fillRect(x + 24, y + 19, 3, 4);
    ctx.fillStyle = "#f2d6a4";
    ctx.fillRect(x + 8, y + 29, 8, 5);
    ctx.fillRect(x + 22, y + 29, 8, 5);
  }
}

function drawCoin(coin) {
  const bob = Math.sin(coin.phase) * 4;
  const y = coin.y + bob;

  ctx.fillStyle = "#d78d12";
  ctx.beginPath();
  ctx.ellipse(coin.x, y, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffdf50";
  ctx.beginPath();
  ctx.ellipse(coin.x - 2, y - 1, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff3a6";
  ctx.fillRect(coin.x - 3, y - 7, 3, 5);
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}


function createDust(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + randomBetween(-5, 8),
      y: y + randomBetween(-2, 2),
      vx: randomBetween(-45, 20),
      vy: randomBetween(-55, -15),
      size: randomBetween(3, 6),
      color: "#f4e2ad",
      life: 0.35,
      maxLife: 0.35
    });
  }
}

function createCoinParticles(x, y) {
  for (let i = 0; i < 9; i++) {
    const angle = (Math.PI * 2 * i) / 9;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * 75,
      vy: Math.sin(angle) * 75,
      size: 4,
      color: "#ffdc4e",
      life: 0.45,
      maxLife: 0.45
    });
  }
}

function updateParticles(deltaTime) {
  for (const particle of particles) {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vy += 180 * deltaTime;
    particle.life -= deltaTime;
  }

  particles = particles.filter((particle) => particle.life > 0);
}



function updateScoreboard() {
  scoreElement.textContent = formatScore(Math.floor(score));
  coinCountElement.textContent = String(coinCount);
}

function formatScore(value) {
  return String(value).padStart(5, "0");
}

function showOverlay(kicker, title, message, buttonText) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  startButton.innerHTML = `${buttonText} <span>▶</span>`;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}



function toggleSound() {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "♫ SOUND: ON" : "♫ SOUND: OFF";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

function playSound(type) {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.type = "square";

  let startFrequency = 440;
  let endFrequency = 660;
  let duration = 0.12;

  if (type === "jump") {
    startFrequency = 280;
    endFrequency = 620;
    duration = 0.16;
  } else if (type === "coin") {
    startFrequency = 760;
    endFrequency = 1180;
    duration = 0.12;
  } else if (type === "hit") {
    startFrequency = 220;
    endFrequency = 75;
    duration = 0.32;
  } else if (type === "start") {
    startFrequency = 420;
    endFrequency = 720;
    duration = 0.18;
  }

  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  } catch (err) {
    // Silently continue if Web Audio is restricted
  }
}



function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}


player = createPlayer();
drawGame();
