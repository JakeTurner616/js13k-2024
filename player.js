import { gameSettings } from './main.js';
import { Bullet } from './bullet.js';
import { sound_shoot, sound_reload } from './sound.js'; // Added sound_reload
import { setGameOver } from './zombie.js';
import { isInShop } from './shop.js';
import { keyIsDown, keyWasPressed, mouseIsDown, mousePos, vec2, drawRect, drawLine, hsl, cameraScale } from './libs/littlejs.esm.min.js';

export class Player {
    constructor(pos) {
        this.pos = pos;
        this.weapon = 'Pistol'; // Default weapon
        this.items = [];
        this.fireAbility = false;
        this.iceAbility = false;
        this.isAutomatic = false; // Indicates if bullets are fired automatically
        this.lastShootTime = 0; // Last time the player shot
        this.shootDelay = Math.floor(Math.random() * (200 - 100 + 1)) + 100;

        this.magazineSize = 13; // Magazine size set to 13 to fit the Triskaidekaphobia theme
        this.currentAmmo = this.magazineSize; // Start with a full magazine
        this.isReloading = false; // Track if the player is currently reloading
        this.reloadTime = 1000; // Reload time in milliseconds
        this.reloadProgress = 0; // Progress of reload animation
        this.reloadAnimationDuration = 1; // Duration of the reload animation in seconds

        // Clip drop properties
        this.clipDropped = false; // Indicates if a clip was dropped
        this.clipDropPos = null; // Position of the dropped clip
        this.clipDropTime = 0; // Time since the clip was dropped
        this.clipFadeDuration = 4000; // Duration for the clip to fade out in milliseconds
        this.clipRotation = 0; // Rotation angle for the dropped clip
    }

    addItem(itemName) {
        this.items.push(itemName);
        
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
        if (setGameOver(false) || isInShop()) return;

        // Player movement logic
        const moveSpeed = 0.1;
        if (keyIsDown('ArrowLeft')) this.pos.x -= moveSpeed; // left arrow
        if (keyIsDown('ArrowRight')) this.pos.x += moveSpeed; // right arrow
        if (keyIsDown('ArrowUp')) this.pos.y += moveSpeed; // up arrow
        if (keyIsDown('ArrowDown')) this.pos.y -= moveSpeed; // down arrow

        // Check for manual reload with 'R' key
        if (keyIsDown('KeyR') && !this.isReloading && this.currentAmmo < this.magazineSize) {
            this.reload();
        }

        // Constrain player within the window size
        const canvasWidth = gameSettings.mapCanvas.width;
        const canvasHeight = gameSettings.mapCanvas.height;
        const halfVisibleWidth = (canvasWidth / 2) / cameraScale;
        const halfVisibleHeight = (canvasHeight / 2) / cameraScale;
        this.pos.x = Math.max(-halfVisibleWidth, Math.min(this.pos.x, halfVisibleWidth));
        this.pos.y = Math.max(-halfVisibleHeight, Math.min(this.pos.y, halfVisibleHeight));

        // Check collision with zombies
        gameSettings.zombies.forEach(zombie => {
            if (!zombie.isDead && this.pos.distance(zombie.pos) < 1) {
                setGameOver(true);
            }
        });



        // Automatically shoot if the weapon is automatic
        if (this.isAutomatic && mouseIsDown(0) && !this.isReloading) {
            const currentTime = performance.now();
            if (currentTime - this.lastShootTime >= this.shootDelay) {
                this.shoot(mousePos);
                this.lastShootTime = currentTime;
            }
        }

        // Update reload animation progress
        if (this.isReloading) {
            this.reloadProgress += 1 / (this.reloadAnimationDuration * 60); // Update based on frame rate (60 FPS)
            if (this.reloadProgress >= 1) {
                this.reloadProgress = 0; // Reset progress
                this.isReloading = false; // End reloading
                this.currentAmmo = this.magazineSize; // Refill the magazine
            }
        }

        // Update the clip drop fade out
        if (this.clipDropped) {
            this.clipDropTime += 1000 / 60; // Assuming 60 FPS for consistency
            if (this.clipDropTime > this.clipFadeDuration) {
                this.clipDropped = false; // Clip has faded out completely
            }
        }
    }

    shoot(targetPos) {
        if (isInShop() || this.isReloading) return; // Don't shoot if reloading or in shop

        if (this.currentAmmo > 0) {
            let numBullets = 1;
            let spread = 0.04;

            if (this.weapon === 'Shotgun') {
                numBullets = 5;
                spread = 0.2;
            }

            for (let i = 0; i < numBullets; i++) {
                const direction = targetPos.subtract(this.pos).normalize().rotate((Math.random() - 0.5) * spread);
                gameSettings.bullets.push(new Bullet(this.pos.add(direction.scale(1.5)), direction, this.fireAbility, this.iceAbility));
            }

            this.currentAmmo--; // Decrease ammo count
            sound_shoot.play(this.pos);

            // Drop the clip immediately when the ammo reaches zero
            if (this.currentAmmo === 0) {
                this.dropClip();
                this.reload(); // Start reload after the last shot is fired
            }

        } else if (this.currentAmmo === 0) {
            // If no ammo left, simulate a dry fire and start reload
            this.reload(); // Start reloading immediately after dry fire
        }
    }

    reload() {
        this.isReloading = true;
        sound_reload.play(this.pos); // Play reload sound
        this.reloadProgress = 0; // Start reload animation
    }

    dropClip() {
        // Record the position to drop the clip at the player's current position
        this.clipDropped = true;
        this.clipDropPos = vec2(this.pos.x, this.pos.y); // Corrected: Create a new vec2 with the current position
        this.clipDropTime = 0; // Reset the drop timer

        // Assign a random rotation to the clip
        this.clipRotation = Math.random() * Math.PI * 2; // Random angle between 0 and 2*PI radians
    }

    render() {
        // Calculate angle between player and mouse for direction
        const dx = mousePos.x - this.pos.x;
        const dy = mousePos.y - this.pos.y;
        const angle = Math.atan2(dy, dx);
        
        // Arm length and positions
        const armTipLength = 1.5; // Normal distance from player to gun tip
        const gunLength = 0.6; // Length of the gun itself
    
        // Draw the dropped clip first to ensure it's below the player
        if (this.clipDropped) {
            const fadeProgress = 1 - (this.clipDropTime / this.clipFadeDuration); // Calculate fade-out progress
            const clipColor = hsl(0, 0, 0.5, fadeProgress); // Grey color (0, 0, 0.5) with fading opacity
            const clipBorderColor = hsl(0, 0, 0, fadeProgress); // Black border with fading opacity
    
            // Clip dimensions
            const clipWidth = gunLength * 0.95;
            const clipHeight = gunLength * 0.35;
    
            // Draw the outline with the same rotation
            drawRect(this.clipDropPos, vec2(clipWidth + 0.06, clipHeight + 0.06), clipBorderColor, this.clipRotation ); // Slightly larger for outline effect
            drawRect(this.clipDropPos, vec2(clipWidth * 0.95, clipHeight * 0.95), clipColor, this.clipRotation); // Clip body with fading effect
        }
    
        // Calculate the position of the right arm base (anchored at the player's shoulder)
        const armBaseOffset = vec2(Math.cos(angle + Math.PI / 2) * 0.7, Math.sin(angle + Math.PI / 2) * 0.7);
        const leftArmBase = this.pos.add(armBaseOffset);
        const rightArmBase = this.pos.subtract(armBaseOffset);
    
        // Position of the right arm tip (fixed to the gun)
        const rightArmTip = this.pos.add(vec2(Math.cos(angle) * armTipLength, Math.sin(angle) * armTipLength));
    
        // Calculate reload animation effect for the left arm (only the left arm moves during reload)
        let leftArmTip = rightArmTip; // Start at the same position as the gun tip
        let currentArmTipLength = armTipLength; // Default arm length
    
        if (this.isReloading) {
            const reloadAngleOffset = this.reloadProgress * Math.PI * 0.35; // Swing effect during reload
            
            // Calculate shortening effect: reduce length up to 30% during reload
            const minArmLengthFactor = 0.8; // 80% of the original length
            const reloadLengthFactor = minArmLengthFactor + (1 - minArmLengthFactor) * (1 - Math.abs(Math.sin(this.reloadProgress * Math.PI)));
            currentArmTipLength = armTipLength * reloadLengthFactor;
    
            // Update left arm tip position with the shortened length during reload
            leftArmTip = leftArmBase.add(vec2(
                Math.cos(angle - Math.PI / 2 + reloadAngleOffset) * currentArmTipLength,
                Math.sin(angle - Math.PI / 2 + reloadAngleOffset) * currentArmTipLength
            ));
        }
    
        // Draw the player
        drawRect(this.pos, vec2(1, 1), hsl(0.58, 0.8, 0.5)); // Player body representation
    
        // Draw the arms: Right arm remains fixed to the gun, left arm moves and shortens during reload
        drawLine(leftArmBase, leftArmTip, 0.18, hsl(0, 0, 0)); // Outline left arm
        drawLine(rightArmBase, rightArmTip, 0.18, hsl(0, 0, 0)); // Outline right arm
        drawLine(leftArmBase, leftArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Left arm with reload effect
        drawLine(rightArmBase, rightArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Right arm fixed
    
        // Draw the gun
        const gunTip = rightArmTip.add(vec2(Math.cos(angle) * gunLength, Math.sin(angle) * gunLength));
        drawLine(rightArmTip, gunTip, 0.18, hsl(0, 0, 0)); // Gun barrel
        drawLine(rightArmTip, gunTip, 0.16, hsl(0.08, 0.6, 0.4)); // Gun details
    }
}