import { gameSettings } from './main.js';
import { Bullet } from './bullet.js';
import { sound_shoot } from './sound.js';
import { setGameOver } from './zombie.js';
import { isInShop } from './shop.js';
import { keyIsDown, mouseIsDown, mousePos, vec2, drawRect, drawLine, hsl, cameraScale } from './libs/littlejs.esm.min.js';
import { canvasState } from './CanvasUtils.js';

export class Player {
    constructor(pos) {
        this.pos = pos;
        this.weapon = 'Pistol'; // Default weapon
        this.items = [];
        this.fireAbility = false;
        this.iceAbility = false;
        this.isAutomatic = false; // New property to indicate if bullets are fired automatically
        this.lastShootTime = 0; // Last time the player shot
        this.shootDelay = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    }

    addItem(itemName) {
        this.items.push(itemName);
        console.log(`Item added: ${itemName}`);
        
        // Handle special cases for different items
        if (itemName === 'Shotgun' || itemName === 'Machine Gun') {
            this.weapon = itemName;
        } else if (itemName === 'Fire Ability') {
            this.fireAbility = true;
        } else if (itemName === 'Ice Ability') {
            this.iceAbility = true;
        }
    }

    update() {
        // Use setGameOver to check if the game is over
        if (setGameOver(false) || isInShop()) return; // Don't update if the game is over or in shop

        // Player movement logic here
        const moveSpeed = 0.1;
        if (keyIsDown('ArrowLeft')) this.pos.x -= moveSpeed; // left arrow
        if (keyIsDown('ArrowRight')) this.pos.x += moveSpeed; // right arrow
        if (keyIsDown('ArrowUp')) this.pos.y += moveSpeed; // up arrow
        if (keyIsDown('ArrowDown')) this.pos.y -= moveSpeed; // down arrow

        // Constrain player within the window size
// Constrain player within the window size
const canvasWidth = gameSettings.mapCanvas.width;
const canvasHeight = gameSettings.mapCanvas.height;

// Calculate the half dimensions based on the canvas size and camera scale
const halfVisibleWidth = (canvasWidth / 2) / cameraScale;
const halfVisibleHeight = (canvasHeight / 2) / cameraScale;

// Constrain the player's position to stay within the visible area
this.pos.x = Math.max(-halfVisibleWidth, Math.min(this.pos.x, halfVisibleWidth));
this.pos.y = Math.max(-halfVisibleHeight, Math.min(this.pos.y, halfVisibleHeight));

console.log(`Constrained pos.x: ${this.pos.x}, pos.y: ${this.pos.y}`);


        // Check collision with zombies
        gameSettings.zombies.forEach(zombie => {
            if (!zombie.isDead && this.pos.distance(zombie.pos) < 1) {
                setGameOver(true);
            }
        });

        // Automatically shoot if the weapon is automatic
        if (this.isAutomatic && mouseIsDown(0)) {
            const currentTime = performance.now();
            if (currentTime - this.lastShootTime >= this.shootDelay) {
                this.shoot(mousePos);
                this.lastShootTime = currentTime;
            }
        }
    }

    shoot(targetPos) {
        if (isInShop()) return; // Don't shoot if the player is in the shop
    
        let numBullets = 1;
        let spread = 0.04; // Adjusted for clarity, assuming 0.4 was too high if meant as radians
        if (this.weapon === 'Shotgun') {
            numBullets = 5;
            spread = 0.2; // More realistic spread angle in radians
        }
    
        for (let i = 0; i < numBullets; i++) {
            // Calculate the direction vector from player to target
            const direction = targetPos.subtract(this.pos).normalize().rotate((Math.random() - 0.5) * spread);
            gameSettings.bullets.push(new Bullet(this.pos.add(direction.scale(1.5)), direction, this.fireAbility, this.iceAbility));
        }
    
        sound_shoot.play(this.pos);
    }

    render() {
        // Drawing logic for player including arms and gun based on mouse position
        const dx = mousePos.x - this.pos.x;
        const dy = mousePos.y - this.pos.y;
        const angle = Math.atan2(dy, dx); // Calculate angle between player and mouse

        const armLength = 0.1;
        const armWidth = 0.16;

        const leftArmStart = this.pos.add(vec2(Math.cos(angle - Math.PI / 2) * 0.7, Math.sin(angle - Math.PI / 2) * 0.7));
        const rightArmStart = this.pos.add(vec2(Math.cos(angle + Math.PI / 2) * 0.7, Math.sin(angle + Math.PI / 2) * 0.7));
        const armTip = this.pos.add(vec2(Math.cos(angle) * (1.5 + armLength), Math.sin(angle) * (1.5 + armLength)));

        drawRect(this.pos, vec2(1, 1), hsl(0.58, 0.8, 0.5)); // Player representation

        drawLine(leftArmStart, armTip, armWidth + 0.1, hsl(0, 0, 0));
        drawLine(rightArmStart, armTip, armWidth + 0.1, hsl(0, 0, 0));
        drawLine(leftArmStart, armTip, armWidth, hsl(0.58, 0.8, 0.5));
        drawLine(rightArmStart, armTip, armWidth, hsl(0.58, 0.8, 0.5));

        const gunLength = 0.6;
        const gunWidth = 0.18;
        const gunTip = armTip.add(vec2(Math.cos(angle) * gunLength, Math.sin(angle) * gunLength));
        drawLine(armTip, gunTip, gunWidth, hsl(0, 0, 0));
        drawLine(armTip, gunTip, gunWidth - 0.02, hsl(0.08, 0.6, 0.4)); // Representation of the gun
    }
}