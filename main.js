//main.js
import './libs/littlejs.esm.min.js';
import { generateBiomeMap } from './biomeGenerator.js';
import { Player } from './player.js';
import { Zombie, Boomer, gameState, DeadlyDangler } from './zombie.js';
import { setupBiomeCanvas, adjustCanvasSize, canvasState } from './CanvasUtils.js';
import { handleShopMouseClick, handleShopInput, drawShop, isInShop } from './shop.js';
import { getCurrency, getScore } from './bullet.js';
import { vec2, engineInit, cameraScale, rand, hsl, mouseWasPressed, drawTextScreen, mousePos, drawText, setPaused } from './libs/littlejs.esm.min.js';

let isWindowFocused = true; // Flag to check if window is focused

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
});
document.onvisibilitychange = function() {
    if (document.visibilityState === 'hidden') {
        isWindowFocused = false;
        setPaused(true);
    }
    else {
        isWindowFocused = true;
        setPaused(false);
    }
  };
  
window.addEventListener('blur', () => {
    isWindowFocused = false;
    setPaused(true);
});

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
    if (gameState.gameOver) return;

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

// Start the game
startSpawningZombies();
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
