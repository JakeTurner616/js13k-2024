
// main.js
import './libs/littlejs.esm.min.js';
import { generateBiomeMap } from './biomeGenerator.js';
import { Player } from './player.js';
import { Zombie, Boomer,  gameState } from './zombie.js';
import { setupBiomeCanvas, adjustCanvasSize, canvasState } from './CanvasUtils.js';
import { handleShopMouseClick, handleShopInput, drawShop, isInShop } from './shop.js';
import { getCurrency, getScore } from './bullet.js';
import { vec2, engineInit,  cameraScale, rand, hsl, mouseWasPressed, drawTextScreen, mousePos } from './libs/littlejs.esm.min.js';


export const gameSettings = {
    zombieSpeed: 0.02, // Initial speed of zombies
    spawnRate: 1400,
    zombies: [],
    bullets: [],
    mapCanvas: document.getElementById('mapCanvas'), // Export mapCanvas
    
    mapCanvasSize: vec2(mapCanvas.width, mapCanvas.height), // Export mapCanvasSize
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

    mapCanvas.addEventListener('mousedown', handleShopMouseClick);
    // Update mouse position on mouse move
   
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
    const context = mapCanvas.getContext('2d');

    context.drawImage(canvasState.biomeCanvas, 0, 0, mapCanvas.width, mapCanvas.height);

    context.save();
    context.scale(1 / cameraScale, 1 / cameraScale);

    player.render();
    gameSettings.zombies.forEach(zombie => zombie.render());
    gameSettings.bullets.forEach(bullet => bullet.render());

    context.restore();

    if (isInShop()) {
        drawShop();
    }

    if (gameState.gameOver) {
        
        console.log("camnvas scale:" + cameraScale);
    
        // Position the text in the middle of the screen
        drawTextScreen(
            'Game Over',
            vec2((gameSettings.mapCanvas.width / 2) , (gameSettings.mapCanvas.height / 2) ), // Center of the canvas
            50,         // Font size
            hsl(0, 0, 1), // Text color
            10,         // Outline thickness
            hsl(0, 0, 0)  // Outline color
        );
    }
}

function gameRenderPost() {
    if (!gameState.gameOver) {
        drawTextScreen('Score: ' + getScore() + '  Currency: ' + getCurrency(), // getCurrency() 
            vec2(gameSettings.mapCanvas.width / 2, 70), 40,
            hsl(0, 0, 1), 6, hsl(0, 0, 0));

        const textPos = vec2(150, 70);
        const textSize = vec2(200, 60);

        

        if (!isInShop()) {
            drawTextScreen('Enter Shop', textPos, 30, hsl(0, 0, 1), 4, hsl(0, 0, 0));
        } else {
            drawTextScreen('Exit Shop', textPos, 30, hsl(0, 0, 1), 4, hsl(0, 0, 0));
        }
    }
}

function spawnZombie() {
    if (isInShop()) {
        return;
    }

    const halfCanvasWidth = (gameSettings.mapCanvas.width / 2) / cameraScale;
    const halfCanvasHeight = (gameSettings.mapCanvas.height / 2) / cameraScale;

    const spawnMargin = 2; // Distance outside the visible area where zombies will spawn
    const edge = Math.floor(Math.random() * 4);
    let pos; // null

    switch (edge) {
        case 0: // Top edge
            pos = vec2(rand(-halfCanvasWidth, halfCanvasWidth), halfCanvasHeight + spawnMargin);
            break;
        case 1: // Right edge
            pos = vec2(halfCanvasWidth + spawnMargin, rand(-halfCanvasHeight, halfCanvasHeight));
            break;
        case 2: // Bottom edge
            pos = vec2(rand(-halfCanvasWidth, halfCanvasWidth), -halfCanvasHeight - spawnMargin);
            break;
        case 3: // Left edge
            pos = vec2(-halfCanvasWidth - spawnMargin, rand(-halfCanvasHeight, halfCanvasHeight));
            break;
    }

    if (rand() < 0.1) {
        gameSettings.zombies.push(new Boomer(pos));
    } else {
        gameSettings.zombies.push(new Zombie(pos));
    }
}

function gameUpdatePost() {}

startSpawningZombies();
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);