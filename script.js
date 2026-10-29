
/*
 * SIMPLE JUMPING GAME
 * Roberto's part: Game Logic and Character Movement
 *
 * Responsibilities:
 * - Character movement
 * - Jumping with the spacebar
 * - Gravity and vertical movement
 * - Collision detection
 * - Game states: running and game over
 * - Restarting the game
 */

// ==========================================
// 1. HTML ELEMENTS
// ==========================================

const gameArea = document.getElementById("game-area");
const player = document.getElementById("player");
const gameOverElement = document.getElementById("game-over");
const restartButton = document.getElementById("restart-button");

// ==========================================
// 2. GAME SETTINGS
// ==========================================

const GROUND_HEIGHT = 35;
const GRAVITY = 1800;
const JUMP_FORCE = 650;

// ==========================================
// 3. GAME STATE
// ==========================================

let playerY = 0;
let velocityY = 0;
let isJumping = false;
let gameRunning = false;
let lastTimestamp = 0;

// ==========================================
// 4. EVENT LISTENERS
// ==========================================

window.addEventListener("load", startGame);

document.addEventListener("keydown", handleKeyDown);

restartButton.addEventListener("click", startGame);

// ==========================================
// 5. START OR RESTART THE GAME
// ==========================================

function startGame() {
    // Reset the player's movement.
    playerY = 0;
    velocityY = 0;
    isJumping = false;
    lastTimestamp = 0;

    // Reset the player's position.
    player.style.bottom = GROUND_HEIGHT + "px";

    // Hide the Game Over screen.
    gameOverElement.hidden = true;

    // Start the game.
    gameRunning = true;

    // Start the animation loop.
    requestAnimationFrame(gameLoop);
}

// ==========================================
// 6. KEYBOARD CONTROLS
// ==========================================

function handleKeyDown(event) {
    // Use the spacebar to jump.
    if (event.code !== "Space") {
        return;
    }

    // Prevent the browser from scrolling.
    event.preventDefault();

    if (gameRunning) {
        jump();
    }
}

// ==========================================
// 7. JUMPING
// ==========================================

function jump() {
    // The player can jump only when on the ground.
    if (isJumping) {
        return;
    }

    velocityY = JUMP_FORCE;
    isJumping = true;
}

// ==========================================
// 8. MAIN GAME LOOP
// ==========================================

function gameLoop(timestamp) {
    if (!gameRunning) {
        return;
    }

    // Calculate elapsed time in seconds.
    let deltaTime = lastTimestamp === 0
        ? 0
        : (timestamp - lastTimestamp) / 1000;

    // Avoid large position changes after a delayed frame.
    deltaTime = Math.min(deltaTime, 0.05);

    lastTimestamp = timestamp;

    // Update the player's movement.
    updatePlayer(deltaTime);

    // Check for collisions with obstacles.
    checkCollisions();

    // Continue while the game is running.
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// 9. GRAVITY AND VERTICAL MOVEMENT
// ==========================================

function updatePlayer(deltaTime) {
    if (!isJumping) {
        return;
    }

    // Gravity pulls the player back towards the ground.
    velocityY -= GRAVITY * deltaTime;

    // Update the vertical position.
    playerY += velocityY * deltaTime;

    // Stop the player when they land.
    if (playerY <= 0) {
        playerY = 0;
        velocityY = 0;
        isJumping = false;
    }

    // Apply the position to the HTML element.
    player.style.bottom =
        (GROUND_HEIGHT + playerY) + "px";
}

// ==========================================
// 10. COLLISION DETECTION
// ==========================================

function checkCollisions() {
    // Get all obstacles created by Jehosue's code.
    const obstacles = document.querySelectorAll(".obstacle");

    const playerRect = player.getBoundingClientRect();

    for (const obstacle of obstacles) {
        const obstacleRect = obstacle.getBoundingClientRect();

        // Check whether the player overlaps an obstacle.
        const collision =
            playerRect.left < obstacleRect.right &&
            playerRect.right > obstacleRect.left &&
            playerRect.top < obstacleRect.bottom &&
            playerRect.bottom > obstacleRect.top;

        if (collision) {
            endGame();
            return;
        }
    }
}

// ==========================================
// 11. GAME OVER
// ==========================================

function endGame() {
    // Stop the game loop.
    gameRunning = false;

    // Display the Game Over screen.
    gameOverElement.hidden = false;
}
