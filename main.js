import './libs/littlejs.esm.min.js';
import { generateBiomeMap } from './biomeGenerator.js';
import { Player } from './player.js';
import { Zombie, Boomer, gameState, DeadlyDangler } from './zombie.js';
import { setupBiomeCanvas, adjustCanvasSize, canvasState } from './CanvasUtils.js';
import { handleShopMouseClick, handleShopInput, drawShop, isInShop } from './shop.js';
import { getCurrency, getScore, setScore, setCurrency } from './bullet.js';
import { vec2, engineInit, cameraScale, rand, hsl, mouseWasPressed, drawTextScreen, mousePos, drawText, setPaused, keyWasPressed, keyIsDown } from './libs/littlejs.esm.min.js';
import { BossZombie } from './boss.js'; // Ensure to import the BossZombie class

let isWindowFocused = true; // Flag to check if window is focused
let isEnteringUsername = false; // Flag to track if we're in the username input state
let username = ''; // Store the inputted username
let showLeaderboard = false; // Flag to show the leaderboard

// Combo message state
let comboMessage = {
    active: false,
    text: '',
    position: vec2(0, 0),
    displayTime: 0,
    fadeTime: 1.5, // Duration in seconds for which the message stays on screen
};

// Event listeners for focus management
window.addEventListener('focus', () => {
    isWindowFocused = true;
    setPaused(false);
    startSpawningZombies();
});
document.onvisibilitychange = function() {
    if (document.visibilityState === 'hidden') {
        isWindowFocused = false;
        stopSpawningZombies();
        setPaused(true);
    }
    else {
        isWindowFocused = true;
        setPaused(false);
    }
};

export const gameSettings = {
    zombieSpeed: 0.02,
    spawnRate: 1400,
    zombies: [],
    bullets: [],
    mapCanvas: document.getElementById('mapCanvas'),
    mapCanvasSize: vec2(mapCanvas.width, mapCanvas.height),
    mapCanvasWidth: mapCanvas.width,
    mapCanvasHeight: mapCanvas.height
};

export let player;
export let spawnInterval;
export let EXPLOSION_RADIUS = 4.3; // Explosion kill radius

function gameInit() {
    // Setup biome canvas and generate texture
    setupBiomeCanvas();

    generateBiomeMap(canvasState.biomeCanvas, {
        desertThreshold: -1,
        shallowTerrianThreshold: 0.2,
        deepTerrianThreshold: -0.2,
        grassThreshold: -.6,
        mountainThreshold: -0.75,
        snowThreshold: 1.9,
        noiseScale: 8
    });

    player = new Player(vec2(0, 0));
    startSpawningZombies();

    adjustCanvasSize();
    window.addEventListener('resize', adjustCanvasSize);

    gameSettings.mapCanvas.addEventListener('mousedown', handleShopMouseClick);
}

export function startSpawningZombies() {
    spawnInterval = setInterval(spawnZombie, gameSettings.spawnRate);
}

export function stopSpawningZombies() {
    clearInterval(spawnInterval);
}

function gameUpdate() {
    if (gameState.gameOver) {
        if (!isEnteringUsername && !showLeaderboard) {
            // Prompt for username immediately after game over
            promptForUsername();
        } else if (isEnteringUsername) {
            handleUsernameInput(); // Handle username input
        } else if (showLeaderboard && keyWasPressed('KeyR')) {
            resetGame(); // Reset game on 'R' key press
        }
        return;
    }

    handleShopMouseClick();

    if (isInShop()) {
        handleShopInput();
        return;
    }

    if (mouseWasPressed(0)) {
        player.shoot(mousePos);
    }

    player.update();
    gameSettings.zombies.forEach(zombie => zombie.update());
    gameSettings.bullets.forEach(bullet => bullet.update());

    gameSettings.bullets = gameSettings.bullets.filter(bullet => bullet.isOnScreen());
    gameSettings.zombies = gameSettings.zombies.filter(zombie => !zombie.isDead || zombie.deathTimer > 0);
}

function gameRender() {
    const context = gameSettings.mapCanvas.getContext('2d');
    context.drawImage(canvasState.biomeCanvas, 0, 0, gameSettings.mapCanvas.width, gameSettings.mapCanvas.height);

    context.save();
    context.scale(1 / cameraScale, 1 / cameraScale);

    gameSettings.zombies.forEach(zombie => zombie.render());
    gameSettings.bullets.forEach(bullet => bullet.render());

    player.render();
    context.restore();

    if (isInShop()) {
        drawShop();
    }

    if (gameState.gameOver) {
        drawTextScreen(
            'Game Over',
            vec2(gameSettings.mapCanvas.width / 2, gameSettings.mapCanvas.height / 2),
            50, hsl(0, 0, 1), 10, hsl(0, 0, 0)
        );

        drawTextScreen(
            `Final Score: ${getScore()}`,
            vec2(gameSettings.mapCanvas.width / 2, gameSettings.mapCanvas.height / 2 + 60),
            40, hsl(0, 0, 1), 10, hsl(0, 0, 0)
        );

        if (isEnteringUsername) {
            drawTextScreen(
                `Enter Name: ${username}_`,
                vec2(gameSettings.mapCanvas.width / 2, gameSettings.mapCanvas.height / 2 + 120),
                30, hsl(0, 0, 1), 10, hsl(0, 0, 0)
            );
        } else if (showLeaderboard) {
            drawLeaderboard();
            drawTextScreen(
                'Press R to Restart',
                vec2(gameSettings.mapCanvas.width / 2, gameSettings.mapCanvas.height / 2 + 180),
                30, hsl(0, 0, 1), 10, hsl(0, 0, 0)
            );
        }
    }
}

function gameRenderPost() {
    if (!gameState.gameOver) {
        drawTextScreen(
            'Score: ' + getScore() + '  Currency: ' + getCurrency(),
            vec2(gameSettings.mapCanvas.width / 2, 70), 40,
            hsl(0, 0, 1), 6, hsl(0, 0, 0)
        );
        const textPos = vec2(150, 70);
        if (!isInShop()) {
            drawTextScreen('Enter Shop', textPos, 30, hsl(0, 0, 1), 4, hsl(0, 0, 0));
        } else {
            drawTextScreen('Exit Shop', textPos, 30, hsl(0, 0, 1), 4, hsl(0, 0, 0));
        }
    }

    // Handle combo message rendering and fading out
    if (comboMessage.active) {
        const alpha = Math.max(0, comboMessage.displayTime / comboMessage.fadeTime); // Calculate alpha based on remaining time
        drawText(
            comboMessage.text,
            comboMessage.position,
            1,
            hsl(0.1, 1, 0.5, alpha),
        );

        comboMessage.displayTime -= 1 / 60; // Assuming 60 FPS, reduce display time
        if (comboMessage.displayTime <= 0) {
            comboMessage.active = false; // Deactivate message when time runs out
        }
    }
}

// Function to show combo messages at specific positions
export function showComboMessage(comboCount, position) {
    const positionVec = position instanceof vec2 ? position : new vec2(Math.floor(position.x), Math.floor(position.y));
    
    console.log('Drawing combo message from main.js: ' + comboCount + ' at ', positionVec);

    comboMessage.text = `Combo x${comboCount}!`;
    comboMessage.position = positionVec;
    comboMessage.displayTime = comboMessage.fadeTime; // Reset display time
    comboMessage.active = true; // Set combo message active
}

function spawnBossZombie(position) {
    // Create a new BossZombie instance
    const bossZombie = new BossZombie(position);
    
    // Add the BossZombie to the zombies array in gameSettings
    gameSettings.zombies.push(bossZombie);
    
    console.log('BossZombie spawned at position:', position);
}

let lastBossCurrencyThreshold = 0; // Tracks the last currency threshold at which a boss was spawned

function spawnZombie() {
    if (!isWindowFocused) return;
    if (isInShop() || gameState.gameOver) return;

    const halfCanvasWidth = (gameSettings.mapCanvas.width / 2) / cameraScale;
    const halfCanvasHeight = (gameSettings.mapCanvas.height / 2) / cameraScale;
    const spawnMargin = 2;
    const edge = Math.floor(Math.random() * 4);
    let pos;

    switch (edge) {
        case 0:
            pos = vec2(rand(-halfCanvasWidth, halfCanvasWidth), halfCanvasHeight + spawnMargin);
            break;
        case 1:
            pos = vec2(halfCanvasWidth + spawnMargin, rand(-halfCanvasHeight, halfCanvasHeight));
            break;
        case 2:
            pos = vec2(rand(-halfCanvasWidth, halfCanvasWidth), -halfCanvasHeight - spawnMargin);
            break;
        case 3:
            pos = vec2(-halfCanvasWidth - spawnMargin, rand(-halfCanvasHeight, halfCanvasHeight));
            break;
    }

    // Check if it's time to spawn a boss zombie based on currency
    const currency = getCurrency();
    if (currency >= 10 && currency % 10 === 0 && currency !== lastBossCurrencyThreshold) {
        spawnBossZombie(pos);
        lastBossCurrencyThreshold = currency; // Update the last currency threshold
        return; // Exit the function to avoid spawning a regular zombie
    }

    const randomValue = Math.random();
    if (randomValue < 0.1) {
        gameSettings.zombies.push(new Boomer(pos));
    } else if (randomValue < 0.2) {
        gameSettings.zombies.push(new DeadlyDangler(pos));
    } else {
        gameSettings.zombies.push(new Zombie(pos));
    }
}
function gameUpdatePost() {
    // If needed for any post-update operations
}

// Function to prompt the user for a username and update the leaderboard
function promptForUsername() {
    isEnteringUsername = true;
    username = '';
}

function handleUsernameInput() {
    if (keyWasPressed('Enter') && username.length > 0) {
        saveScore(username, getScore());
        isEnteringUsername = false;
        showLeaderboard = true;
    } else if (keyWasPressed('Backspace') && username.length > 0) {
        username = username.slice(0, -1);
    } else if (username.length < 3) {
        // Check for A-Z key presses
        for (let i = 0; i < 26; i++) {
            const keyCode = `Key${String.fromCharCode(65 + i)}`; // 'KeyA' to 'KeyZ'
            if (keyWasPressed(keyCode)) {
                username += String.fromCharCode(65 + i); // Append the character to the username
                break;
            }
        }
    }
}

// Function to save the score to the local storage leaderboard with custom namespace
function saveScore(username, score) {
    const leaderboardKey = 'Evacu13tion_leaderboard';
    let leaderboard = JSON.parse(localStorage.getItem(leaderboardKey)) || [];

    leaderboard.push({ username, score });
    leaderboard.sort((a, b) => b.score - a.score);

    localStorage.setItem(leaderboardKey, JSON.stringify(leaderboard));
}

// Function to draw the leaderboard
function drawLeaderboard() {
    const leaderboardKey = 'Evacu13tion_leaderboard';
    const leaderboard = JSON.parse(localStorage.getItem(leaderboardKey)) || [];

    let yOffset = gameSettings.mapCanvas.height / 2 - 60; // Starting Y position for leaderboard display

    drawTextScreen(
        'Leaderboard:',
        vec2(gameSettings.mapCanvas.width / 2 , yOffset - 250),
        30, hsl(0, 0, 1), 10, hsl(0, 0, 0)
    );

    leaderboard.slice(0, 5).forEach((entry, index) => {
        yOffset += 40; // Increase Y offset for each entry
        drawTextScreen(
            `${index + 1}. ${entry.username} - ${entry.score}`,
            vec2(gameSettings.mapCanvas.width / 2 , yOffset - 250),
            25, hsl(0, 0, 1), 10, hsl(0, 0, 0)
        );
       
    });
}

// Reset the game state
function resetGame() {
    gameState.gameOver = false;
    setScore(0); // Reset score
    setCurrency(0); // Reset currency
    gameSettings.zombies = [];
    gameSettings.bullets = [];
    gameSettings.zombieSpeed = 0.02;
    gameSettings.spawnRate = 1400;

    player = new Player(vec2(0, 0)); // Reset player position and state
    startSpawningZombies(); // Restart zombie spawning
    showLeaderboard = false; // Hide the leaderboard on reset
}

// Start the game
startSpawningZombies();
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);