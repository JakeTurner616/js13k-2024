import './libs/littlejs.esm.min.js';
import { generateBiomeMap } from './biomeGenerator.js';
import { Player } from './player.js';
import { Zombie, Boomer, gameState, DeadlyDangler } from './zombie.js';
import { setupBiomeCanvas, adjustCanvasSize, canvasState } from './CanvasUtils.js';
import { handleShopMouseClick, handleShopInput, drawShop, isInShop, items } from './shop.js';
import { getCurrency, getScore, setScore, setCurrency } from './bullet.js';
import { vec2, engineInit, cameraScale, rand, hsl, mouseWasPressed, drawTextScreen, mousePos, drawText, setPaused, keyWasPressed } from './libs/littlejs.esm.min.js';
import { sound_lvl_up, sound_combo } from './sound.js';
import { BossZombie } from './boss.js'; // Ensure to import the BossZombie class
let zombiesSpawned = 0; // Track how many zombies have been spawned
const DANGER_THRESHOLD = 6; // Number of zombies to spawn before allowing Deadly Danglers

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
    fadeTime: 2.5, // Duration in seconds for which the message stays on screen
};

// Initialize focus state based on the current document focus
isWindowFocused = document.hasFocus();
setPaused(!isWindowFocused); // Pause if not focused

// Event listener to resume game when the window gains focus
window.addEventListener('focus', () => {
    isWindowFocused = true;
    setPaused(false);
});

// Event listener to pause game when the window loses focus
window.addEventListener('blur', () => {
    isWindowFocused = false;
    setPaused(true);
});


export const gameSettings = {
    zombieSpeed: 0.025, // Starting speed
    spawnRate: 1400, // Initial spawn rate in milliseconds
    minSpawnRate: 500, // Minimum spawn rate cap
    spawnRateDecrement: 50, // Decrease spawn rate by 50ms every interval
    speedIncrement: 0.001, // Speed increase per zombie spawn or score threshold
    maxZombieSpeed: 0.1, // Maximum zombie speed cap
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



let beepedCurrencyLevels = []; // Array to track currency levels that triggered the beep
const beepThresholds = [10, 45, 75, 100];

function gameRenderPost() {
    if (!gameState.gameOver) {
        drawTextScreen(
            'Score: ' + getScore() + '  Currency: ' + getCurrency(),
            vec2(gameSettings.mapCanvas.width / 2, 70), 40,
            hsl(0, 0, 1), 6, hsl(0, 0, 0)
        );

        const textPos = vec2(150, 70);
        const currency = getCurrency();

        // Check if the current currency matches any threshold and hasn't beeped yet
        beepThresholds.forEach(threshold => {
            if (currency >= threshold && !beepedCurrencyLevels.includes(threshold)) {
                sound_lvl_up.play(); // Play the beep sound
                beepedCurrencyLevels.push(threshold); // Mark this threshold as triggered
            }
        });

        // Flash the `!` when the player can afford a new item
        if (!isInShop()) {
            drawTextScreen('Enter Shop', textPos, 30, hsl(0, 0, 1), 4, hsl(0, 0, 0));

            // Flash the `!` for affordable items
            const affordableItems = items.filter(item => currency >= item.cost && !item.purchased);
            const lowestAffordableItem = affordableItems.length > 0 ? affordableItems[0] : null;
            if (lowestAffordableItem && currency >= lowestAffordableItem.cost) {
                const flashPeriod = 1; // Time period for flashing in seconds
                const time = performance.now() / 1000;
                if (Math.floor(time / flashPeriod) % 2 === 0) {
                    drawTextScreen('!', vec2(textPos.x + 90, textPos.y), 40, hsl(0, 1, 0.5), 4, hsl(0, 0, 0));
                }
            }
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

    // Play combo hit sound when a combo is shown
    sound_combo.play();
}

function spawnBossZombie(position) {
    // Create a new BossZombie instance
    const bossZombie = new BossZombie(position);

    // Add the BossZombie to the zombies array in gameSettings
    gameSettings.zombies.push(bossZombie);

    //console.log('BossZombie spawned at position:', position);
}



function spawnZombie() {
    if (!isWindowFocused || isInShop() || gameState.gameOver) return;

    const halfCanvasWidth = (gameSettings.mapCanvas.width / 2) / cameraScale;
    const halfCanvasHeight = (gameSettings.mapCanvas.height / 2) / cameraScale;
    let spawnMargin = 2;
    const edge = Math.floor(Math.random() * 4);
    let pos;

    const randomValue = Math.random();
    let zombieType;

    // Set the spawn position based on the edge
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

    // If the player is no longer using the bat, introduce a 20% chance to spawn a boss zombie
    if (!player.usingBat && Math.random() < 0.2) {
        spawnBossZombie(pos);
        return; // Exit function after spawning boss to avoid spawning regular zombies
    }

    // Continue normal zombie spawning logic
    if (randomValue < 0.15) {
        zombieType = Boomer;
    } else if (randomValue < 0.2 && zombiesSpawned >= DANGER_THRESHOLD) {
        zombieType = DeadlyDangler;
        spawnMargin *= 2;
    } else {
        zombieType = Zombie;
    }

    // Adjust zombie speed and spawn rate dynamically
    if (zombiesSpawned % 10 === 0 && gameSettings.zombieSpeed < gameSettings.maxZombieSpeed) {
        gameSettings.zombieSpeed = Math.min(gameSettings.zombieSpeed + gameSettings.speedIncrement, gameSettings.maxZombieSpeed);
    }

    if (zombiesSpawned % 10 === 0 && gameSettings.spawnRate > gameSettings.minSpawnRate) {
        // Decrease spawn rate every 10 zombies, but cap at the minimum spawn rate
        gameSettings.spawnRate = Math.max(gameSettings.spawnRate - gameSettings.spawnRateDecrement, gameSettings.minSpawnRate);
        stopSpawningZombies(); // Stop the current interval
        startSpawningZombies(); // Restart with the new spawn rate
    }

    // Spawn the zombie and set its speed
    const newZombie = new zombieType(pos);
    newZombie.speed = gameSettings.zombieSpeed; // Apply updated speed to the new zombie
    gameSettings.zombies.push(newZombie);

    // Increment the zombie spawn count
    zombiesSpawned++;
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
    try {


        if (typeof window == 'undefined') {
            return;
        }
        const leaderboardKey = 'Evacu13tion';
        // Safely parse the leaderboard from localStorage or initialize an empty array if null
        let leaderboard = JSON.parse(window.localStorage.getItem(leaderboardKey)) || [];

        // Add new score and sort the leaderboard
        leaderboard.push({ username, score });
        leaderboard.sort((a, b) => b.score - a.score);

        // Store the updated leaderboard back into localStorage
        window.localStorage.setItem(leaderboardKey, JSON.stringify(leaderboard));
    } catch (e) {
        console.error("Failed to save score:", e);
        // Optionally handle the error further or alert the user
    }
}

// Function to draw the leaderboard
function drawLeaderboard() {
    try {
        if (typeof window == 'undefined') {
            return;

        }
        const leaderboardKey = 'Evacu13tion';
        // Safely parse the leaderboard from localStorage or use an empty array if null
        const leaderboard = JSON.parse(window.localStorage.getItem(leaderboardKey)) || [];

        let yOffset = gameSettings.mapCanvas.height / 2 - 60; // Starting Y position for leaderboard display

        drawTextScreen(
            'Leaderboard:',
            vec2(gameSettings.mapCanvas.width / 2, yOffset - 250),
            30, hsl(0, 0, 1), 10, hsl(0, 0, 0)
        );

        // Display top 3 leaderboard entries
        leaderboard.slice(0, 3).forEach((entry, index) => {
            yOffset += 40; // Increase Y offset for each entry
            drawTextScreen(
                `${index + 1}. ${entry.username} - ${entry.score}`,
                vec2(gameSettings.mapCanvas.width / 2, yOffset - 250),
                25, hsl(0, 0, 1), 10, hsl(0, 0, 0)
            );
        });
    } catch (e) {
    }
}

// Reset the game state
function resetGame() {
    gameState.gameOver = false;
    setScore(0); // Reset score
    setCurrency(0); // Reset currency
    gameSettings.zombies = [];
    gameSettings.bullets = [];
    gameSettings.zombieSpeed = 0.025;
    gameSettings.spawnRate = 1400;

    player = new Player(vec2(0, 0)); // Reset player position and state
    startSpawningZombies(); // Restart zombie spawning
    showLeaderboard = false; // Hide the leaderboard on reset
}

// Start the game
startSpawningZombies();
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);