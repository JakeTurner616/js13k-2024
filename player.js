import { keyIsDown, mouseIsDown, mousePos, vec2, drawRect, drawLine, hsl, cameraScale } from './libs/littlejs.esm.min.js';
import { gameSettings } from './main.js';
import { Bullet } from './bullet.js';
import { sound_shoot, sound_reload, sound_swing } from './sound.js';
import { setGameOver, Boomer, gameState } from './zombie.js';
import { isInShop } from './shop.js';
import { makeWalkingDust, makeMuzzleSmoke } from './effects.js';
import { Melee } from './melee.js'; // Import Melee class for melee handling

export class Player {
    constructor(pos) {
        this.pos = pos;
        this.weapon = 'Bat'; // Default weapon set to Baseball Bat
        this.items = ['Bat']; // Initialize with default item
        this.usingBat = true; // Track whether the player is using the bat
        this.fireAbility = false;

        this.isAutomatic = false; // No automatic fire for melee weapon
        this.lastShootTime = 0; // Last time the player shot
        this.shootDelay = 100;
        this.pistolChamberDelay = 200; // 200ms delay between shots for Pistol
        this.shotgunChamberDelay = 500; // 500ms delay between shots for Shotgun (adjust as needed)
        this.canShoot = true; // Flag to check if the player can shoot again
        this.wasMouseDown = false; // Track if the mouse was down in the previous frame
        this.machineGunShootDelay = 200; // Machine Gun specific shoot delay

        this.magazineSize = 7; // Magazine size for Pistol and Machine Gun
        this.currentAmmo = this.magazineSize;
        this.isReloading = false; // Track if the player is currently reloading
        this.reloadTime = 1000; // Total reload time in milliseconds
        this.reloadProgress = 0; // Progress of reload animation (0 to 1)
        this.reloadAnimationDuration = 1; // Duration of the reload animation in seconds

        this.isMoving = false;
        this.isSwinging = false; // Track melee swing
        this.swingDuration = 1000; // Duration of a melee swing in milliseconds
        this.lastSwingTime = 0; // Last time the player performed a swing
        this.swingProgress = 0; // Progress of the current swing
        this.swingDirection = 1; // Swing direction: 1 for right, -1 for left

        // Initialize Melee instance
        this.melee = new Melee(this);

        // Clip drop properties (for other weapons)
        this.clipDropped = false;
        this.clipDropPos = null;
        this.clipDropTime = 0;
        this.clipFadeDuration = 4000;
        this.clipRotation = 0;
        this.lastAngle = 0; // Store the last angle
    }
    update() {
        if (setGameOver(false) || isInShop()) return;

        const currentTime = performance.now();

        // Player movement logic
        const moveSpeed = 0.1;
        let moved = false;

        if (keyIsDown('ArrowLeft')) {
            this.pos.x -= moveSpeed;
            moved = true;
        }
        if (keyIsDown('ArrowRight')) {
            this.pos.x += moveSpeed;
            moved = true;
        }
        if (keyIsDown('ArrowUp')) {
            this.pos.y += moveSpeed;
            moved = true;
        }
        if (keyIsDown('ArrowDown')) {
            this.pos.y -= moveSpeed;
            moved = true;
        }

        this.isMoving = moved;

        // Handle melee attack
        if (mouseIsDown(0) && this.weapon === 'Bat' && !this.isSwinging) {
            this.meleeAttack();
            setTimeout(() => { sound_swing.play(this.pos); }, 700);
        }

        // Handle swinging state and duration
        if (this.isSwinging) {
            this.swingProgress = (currentTime - this.lastSwingTime) / this.swingDuration;
            if (this.swingProgress >= 1) {
                this.isSwinging = false;
                this.swingProgress = 0;
            }
        }

        if (!this.isSwinging) {
            // Handle reload logic
            if (keyIsDown('KeyR') && !this.isReloading && this.currentAmmo < this.magazineSize) {
                this.reload();
            }

            if (this.isReloading) {
                this.reloadProgress += 1000 / 60 / this.reloadTime;
                if (this.reloadProgress >= 1) {
                    this.reloadProgress = 0;
                    this.isReloading = false;
                    this.currentAmmo = this.magazineSize;
                }
            }

            // Automatic fire for Machine Gun
            if (this.weapon === 'Machine Gun' && mouseIsDown(0) && !this.isReloading) {
                if (currentTime - this.lastShootTime >= this.machineGunShootDelay) {
                    this.shoot(mousePos); // Fire continuously while mouse is held down
                    this.lastShootTime = currentTime;
                }
            }

            // Semi-auto fire for Shotgun
            else if (this.weapon === 'Shotgun' && !this.isReloading) {
                if (mouseIsDown(0) && !this.wasMouseDown && this.canShoot && currentTime - this.lastShootTime >= this.shotgunChamberDelay) {
                    this.shoot(mousePos); // Fire once when mouse is first pressed
                    this.canShoot = false; // Disable shooting until mouse is released
                    this.lastShootTime = currentTime;
                }
            }

            // Semi-auto fire for Pistol
            else if (this.weapon === 'Pistol' && !this.isReloading) {
                if (mouseIsDown(0) && !this.wasMouseDown && this.canShoot && currentTime - this.lastShootTime >= this.pistolChamberDelay) {
                    this.shoot(mousePos); // Fire once when mouse is first pressed
                    this.canShoot = false; // Disable shooting until mouse is released
                    this.lastShootTime = currentTime;
                }
            }

            // Reset shooting flag when the mouse is released
            if (!mouseIsDown(0)) {
                this.canShoot = true; // Reset shooting state when mouse is released
            }

            // Track whether the mouse was down in the last frame
            this.wasMouseDown = mouseIsDown(0);
        }

        // Constrain player within the window size
        const canvasWidth = gameSettings.mapCanvas.width;
        const canvasHeight = gameSettings.mapCanvas.height;
        const halfVisibleWidth = (canvasWidth / 2) / cameraScale;
        const halfVisibleHeight = (canvasHeight / 2) / cameraScale;
        this.pos.x = Math.max(-halfVisibleWidth, Math.min(this.pos.x, halfVisibleWidth));
        this.pos.y = Math.max(-halfVisibleHeight, Math.min(this.pos.y, halfVisibleHeight));

        // Collision detection with zombies
        if (!this.isSwinging) {
            gameSettings.zombies.forEach(zombie => {
                if (!zombie.isDead && this.pos.distance(zombie.pos) < 1) {
                    if (!zombie.onFire || (zombie.onFire && zombie.fireSpreadTimer > 0)) {
                        this.isMoving = false;
                        setGameOver(true);
                    }
                }
            });
        }

        const moveDirection = vec2(0, 0); // Initialize the move direction
        if (this.isMoving) {
            const offsetDistance = 0.4; // Distance to offset the particles behind the player
            const normalizedDirection = moveDirection.normalize().scale(-offsetDistance); // Calculate the offset position behind the player
            const particlePos = this.pos.add(normalizedDirection); // Calculate the position to emit particles
            setTimeout(() => {
                makeWalkingDust(particlePos); // Emit particles at the calculated position
            }, 100);

            this.lastMoveDirection = moveDirection; // Update last move direction
        }
    }



    meleeAttack() {
        this.isSwinging = true;
        this.lastSwingTime = performance.now();
        this.swingDirection = Math.random() > 0.5 ? 1 : -1; // Randomly choose swing direction

        // Check for zombies within range
        gameSettings.zombies.forEach(zombie => {
            const distanceToZombie = this.pos.distance(zombie.pos);
            if (distanceToZombie < this.melee.swingRange) { // Use swingRange from Melee class
                if (zombie instanceof Boomer) {
                    //console.log("Boomer hit by melee!"); // Debug message
                } else {
                    //console.log("Zombie hit by melee!"); // Debug message
                    zombie.kill(); // Generic kill for other zombie types
                }
            }
        });

    }


    shoot(targetPos) {
        if (isInShop() || this.isReloading) return;
        if (!this.hasGun()) return;

        const currentTime = performance.now();

        // Set appropriate delay based on the weapon type
        let weaponDelay = this.shootDelay; // Default delay for automatic weapons like Machine Gun

        if (this.weapon === 'Pistol') {
            weaponDelay = this.pistolChamberDelay; // Use Pistol's delay between shots
        } else if (this.weapon === 'Shotgun') {
            weaponDelay = this.shotgunChamberDelay; // Use Shotgun's delay between shots
        }

        // Ensure the delay between shots is respected
        if (currentTime - this.lastShootTime < weaponDelay) return;

        if (this.currentAmmo > 0) {
            let numBullets = 1;
            let spread = 0.04;

            // Calculate the direction and barrel tip position
            const direction = targetPos.subtract(this.pos).normalize();
            const barrelTip = this.pos.add(direction.scale(1.2)); // Position of the barrel tip (1.2 units away)
            const barrelPadding = direction.scale(0.3); // Padding beyond the barrel tip (0.3 units further)

            // Final position for the muzzle effects
            const muzzlePos = barrelTip.add(barrelPadding);

            // Adjust the number of bullets and spread for the Shotgun
            if (this.weapon === 'Shotgun') {
                numBullets = 5;
                spread = 0.2;

                // Create muzzle smoke and flash effects at the muzzle position
                makeMuzzleSmoke(muzzlePos, 8, this.lastAngle);
            }

            // Fire the bullets based on the weapon
            for (let i = 0; i < numBullets; i++) {
                const spreadDirection = direction.rotate((Math.random() - 0.5) * spread);
                // Spawn the bullets closer to the barrel tip
                gameSettings.bullets.push(new Bullet(barrelTip, spreadDirection, this.fireAbility));
            }

            // Handle weapon effects
            this.currentAmmo--;
            sound_shoot.play(this.pos);

            if (this.currentAmmo === 0 && this.weapon !== 'Shotgun') {
                this.dropClip();
                this.reload();
            } else if (this.currentAmmo === 0) {
                this.reload();
            }

            // Record the time of the last shot
            this.lastShootTime = currentTime;
        } else if (this.currentAmmo === 0) {
            this.reload();
        }
    }

    reload() {
        this.isReloading = true;
        sound_reload.play(this.pos);
        this.reloadProgress = 0;
    }

    dropClip() {
        if (this.weapon === 'Shotgun') return;

        this.clipDropped = true;
        this.clipDropPos = vec2(this.pos.x, this.pos.y);
        this.clipDropTime = 0;
        this.clipRotation = Math.random() * Math.PI * 2;
    }

    render() {
        // Calculate angle between player and mouse for direction
        let angle;
        let angleDifference = 0; // Initialize angleDifference
        if (!gameState.gameOver) {
            // If the game is not over, calculate the angle towards the mouse cursor
            const dx = mousePos.x - this.pos.x;
            const dy = mousePos.y - this.pos.y;
            angle = Math.atan2(dy, dx);

            // Calculate the angle difference to adjust the swing dynamically
            angleDifference = angle - this.lastAngle;
            angleDifference = ((angleDifference + Math.PI) % (2 * Math.PI)) - Math.PI; // Normalize angle difference

            // Store the calculated angle as the last angle
            this.lastAngle = angle;
        } else {
            // If the game is over, keep the arms in their last position
            angle = this.lastAngle; // Use the stored angle
        }

        // Arm length and positions
        const armTipLength = 1.5; // Normal distance from player to gun tip
        let weaponLength, weaponColor;

        // Determine weapon length and color based on the current weapon
        if (this.weapon === 'Pistol') {
            weaponLength = 0.6;
            weaponColor = hsl(0, 0, 0.5); // Grey color for Pistol
        } else if (this.weapon === 'Shotgun') {
            weaponLength = 0.8;
            weaponColor = hsl(0.08, 0.6, 0.4); // Brown color for Shotgun
            this.renderShotgunPump(angle); // Use the fancy shotgun pump logic
            return; // Return early since shotgun rendering is handled separately
        } else if (this.weapon === 'Machine Gun') {
            weaponLength = 1.0;
            weaponColor = hsl(0, 0, 0); // Black color for Machine Gun
        } else if (this.weapon === 'Bat') {
            this.renderBaseballBat(angle, angleDifference);
            return; // Return early since baseball bat rendering is separate
        }

        // Draw the dropped clip first to ensure it's below the player
        if (this.clipDropped) {
            const fadeProgress = 1 - (this.clipDropTime / this.clipFadeDuration); // Calculate fade-out progress
            const clipColor = hsl(0, 0, 0.5, fadeProgress); // Grey color (0, 0, 0.5) with fading opacity
            const clipBorderColor = hsl(0, 0, 0, fadeProgress); // Black border with fading opacity

            // Clip dimensions
            const clipWidth = weaponLength * 0.95;
            const clipHeight = weaponLength * 0.35;

            // Draw the outline with the same rotation
            drawRect(this.clipDropPos, vec2(clipWidth + 0.06, clipHeight + 0.06), clipBorderColor, this.clipRotation); // Slightly larger for outline effect
            drawRect(this.clipDropPos, vec2(clipWidth * 0.95, clipHeight * 0.95), clipColor, this.clipRotation); // Clip body with fading effect
        }

        // Calculate the position of the right arm base (anchored at the player's shoulder)
        const armBaseOffset = vec2(Math.cos(angle + Math.PI / 2) * 0.7, Math.sin(angle + Math.PI / 2) * 0.7);
        const leftArmBase = this.pos.add(armBaseOffset);
        const rightArmBase = this.pos.subtract(armBaseOffset);

        // Position of the right arm tip (fixed to the weapon)
        const rightArmTip = this.pos.add(vec2(Math.cos(angle) * armTipLength, Math.sin(angle) * armTipLength));

        // Calculate reload animation effect for the left arm (only the left arm moves during reload)
        let leftArmTip = rightArmTip; // Start at the same position as the weapon tip
        let currentArmTipLength = armTipLength; // Default arm length

        if (this.isReloading) {
            const reloadAngleOffset = this.reloadProgress * Math.PI * 0.35; // Swing effect during reload

            // Calculate shortening effect: reduce length up to 30% during reload
            const minArmLengthFactor = 0.8; // 80% of the original length
            const reloadLengthFactor = minArmLengthFactor + (1 - minArmLengthFactor) * (1 - Math.min(1, Math.sin(this.reloadProgress * Math.PI)));
            currentArmTipLength = armTipLength * reloadLengthFactor;

            // Update left arm tip position with the shortened length during reload
            leftArmTip = leftArmBase.add(vec2(
                Math.cos(angle - Math.PI / 2 + reloadAngleOffset) * currentArmTipLength,
                Math.sin(angle - Math.PI / 2 + reloadAngleOffset) * currentArmTipLength
            ));
        }

        // Draw the player
        drawRect(this.pos, vec2(1, 1), hsl(0.58, 0.8, 0.5)); // Player body representation

        // Draw the arms: Right arm remains fixed to the weapon, left arm moves and shortens during reload
        drawLine(leftArmBase, leftArmTip, 0.18, hsl(0, 0, 0)); // Outline left arm
        drawLine(rightArmBase, rightArmTip, 0.18, hsl(0, 0, 0)); // Outline right arm
        drawLine(leftArmBase, leftArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Left arm with reload effect
        drawLine(rightArmBase, rightArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Right arm fixed

        // Draw the weapon
        const weaponTip = rightArmTip.add(vec2(Math.cos(angle) * weaponLength, Math.sin(angle) * weaponLength));
        drawLine(rightArmTip, weaponTip, 0.18, hsl(0, 0, 0)); // Weapon outline
        drawLine(rightArmTip, weaponTip, 0.16, weaponColor); // Weapon details
    }


    renderShotgunPump(playerAngle) {
        const armLength = 1.4; // Length of the arm
        const shotgunLength = 1.1; // Total length of the shotgun
        const pumpHandleOffset = shotgunLength * 0.25; // The pump handle is 1/4 of the way down the shotgun
        const pumpDuration = 500; // Duration of the pump action in milliseconds
        let pumpProgress = (performance.now() - this.lastShootTime) / pumpDuration;

        // Apply pump effect: Move the left arm outward and down, then back up
        let pumpOffset = 0;
        if (pumpProgress < 1) {
            pumpOffset = Math.sin(pumpProgress * Math.PI) * (shotgunLength * 0.45); // Move along 45% of the shotgun length
        }

        // Calculate arm base positions based on player angle (to simulate shoulder position)
        const armBaseOffset = vec2(Math.cos(playerAngle + Math.PI / 2) * 0.5, Math.sin(playerAngle + Math.PI / 2) * 0.5);
        const leftArmBase = this.pos.add(armBaseOffset); // Left arm base position (from shoulder)
        const rightArmBase = this.pos.subtract(armBaseOffset); // Right arm base position (from shoulder)

        // Adjust the right arm to angle inward slightly (for a more natural hold)
        const rightArmTip = rightArmBase.add(vec2(
            Math.cos(playerAngle + Math.PI / 10) * (armLength * 0.5), // Adjust for inward bend (positive angle)
            Math.sin(playerAngle + Math.PI / 10) * (armLength * 0.5)
        ));

        // Calculate left arm tip starting at the pump handle, then moving backward for the pump action
        const leftArmTip = rightArmTip.add(vec2(
            Math.cos(playerAngle) * (pumpHandleOffset - pumpOffset + 0.5), // Moving the pump handle
            Math.sin(playerAngle) * (pumpHandleOffset - pumpOffset + 0.5)
        ));

        // Shotgun points straight from the right arm tip position
        const shotgunTip = rightArmTip.add(vec2(Math.cos(playerAngle) * shotgunLength, Math.sin(playerAngle) * shotgunLength));
        const shotgunOutlineTip = rightArmTip.add(vec2(Math.cos(playerAngle) * (shotgunLength + 0.03), Math.sin(playerAngle) * (shotgunLength + 0.03)));

        // Draw the player
        drawRect(this.pos, vec2(1, 1), hsl(0.58, 0.8, 0.5)); // Player body representation

        // Draw the arms with the pump handle offset for the left arm
        drawLine(leftArmBase, leftArmTip, 0.18, hsl(0, 0, 0)); // Outline left arm
        drawLine(rightArmBase, rightArmTip, 0.18, hsl(0, 0, 0)); // Outline right arm
        drawLine(leftArmBase, leftArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Left arm
        drawLine(rightArmBase, rightArmTip, 0.13, hsl(0.58, 0.8, 0.5)); // Right arm

        // Draw the shotgun
        drawLine(leftArmTip, shotgunTip, 0.12, hsl(0.58, 0.8, 0.5)); // Pump handle connection
        drawLine(rightArmTip, shotgunOutlineTip, 0.20, hsl(0, 0, 0)); // Shotgun outline
        drawLine(rightArmTip, shotgunTip, 0.14, hsl(0.08, 1, 0.3)); // Shotgun body
    }



    renderBaseballBat(playerAngle, angleDifference) {
        const armLength = 1.4; // Length of the arm
        const batLength = 0.9; // Total length of the bat
        const batGripOffsetLeft = 0.5; // Offset for left arm grip position on the bat
        const batGripOffsetRight = 0.8; // Offset for right arm grip position on the bat (further out)
        const batColor = hsl(0.1, 1, 0.3); // Wooden color for the bat
        const gripColor = hsl(0, 0, 0.7); // Light grey color for the grip

        // Calculate the swing phase
        const windUpDuration = 0.3; // Proportion of the total swing duration spent on winding up
        let swingAngle = 0; // Angle for bat swinging
        let windUpAngle = this.swingDirection * Math.PI / 7; // Wind up angle before swing (bat pulled back)
        const overshootAmount = Math.PI / 14; // How much to overshoot the center

        // Determine the swing phase (wind-up, actual swing, or overshoot)
        if (this.isSwinging) {
            if (this.swingProgress < windUpDuration) {
                // Wind up phase
                swingAngle = windUpAngle * (this.swingProgress / windUpDuration);
            } else {
                // Swing phase
                const swingProgress = (this.swingProgress - windUpDuration) / (1 - windUpDuration);
                if (swingProgress < 0.5) {
                    // First half of swing: move towards the center
                    swingAngle = windUpAngle - Math.sin(swingProgress * Math.PI) * (Math.PI / 3) * this.swingDirection;
                } else {
                    this.detectHits(playerAngle + swingAngle);
                    //console.log('hit detection fired');
                    // Second half of swing: overshoot and return to center
                    const overshootProgress = (swingProgress - 0.5) * 2; // Normalize to [0, 1] range
                    swingAngle = (Math.PI / 3 + overshootAmount) * Math.sin(overshootProgress * Math.PI) - overshootAmount;
                    swingAngle *= this.swingDirection; // Adjust for swing direction
                }
            }

            // Adjust swing based on player's rotation
            swingAngle += angleDifference; // Adjust for character rotation
        }

        // Calculate the position of the right arm base (anchored at the player's shoulder)
        const armBaseOffset = vec2(Math.cos(playerAngle + Math.PI / 2) * 0.5, Math.sin(playerAngle + Math.PI / 2) * 0.5);
        const leftArmBase = this.pos.add(armBaseOffset);
        const rightArmBase = this.pos.subtract(armBaseOffset);

        // Calculate separate grip positions for each arm on the bat
        const leftArmGripPos = this.pos.add(vec2(Math.cos(playerAngle + swingAngle) * armLength * batGripOffsetLeft, Math.sin(playerAngle + swingAngle) * armLength * batGripOffsetLeft));
        const rightArmGripPos = this.pos.add(vec2(Math.cos(playerAngle + swingAngle) * armLength * batGripOffsetRight, Math.sin(playerAngle + swingAngle) * armLength * batGripOffsetRight));

        // Calculate bat tip position (extend from the right arm grip position)
        const batTip = rightArmGripPos.add(vec2(Math.cos(playerAngle + swingAngle) * batLength, Math.sin(playerAngle + swingAngle) * batLength));
        const batOutlineTip = rightArmGripPos.add(vec2(Math.cos(playerAngle + swingAngle) * (batLength + 0.03), Math.sin(playerAngle + swingAngle) * (batLength + 0.03)));

        // Draw the player
        drawRect(this.pos, vec2(1, 1), hsl(0.58, 0.8, 0.5)); // Player body representation

        // Draw the arms with different grip positions
        drawLine(leftArmBase, leftArmGripPos, 0.18, hsl(0, 0, 0)); // Outline left arm
        drawLine(rightArmBase, rightArmGripPos, 0.18, hsl(0, 0, 0)); // Outline right arm
        drawLine(leftArmBase, leftArmGripPos, 0.13, hsl(0.58, 0.8, 0.5)); // Left arm
        drawLine(rightArmBase, rightArmGripPos, 0.13, hsl(0.58, 0.8, 0.5)); // Right arm

        // Draw the bat swinging
        drawLine(leftArmGripPos, batTip, 0.12, gripColor); // Grip
        drawLine(rightArmGripPos, batOutlineTip, 0.20, hsl(0, 0, 0)); // Bat outline
        drawLine(rightArmGripPos, batTip, 0.14, batColor); // Bat body
    }

    detectHits(swingAngle) {
        const batTip = this.pos.add(vec2(Math.cos(swingAngle) * 1.4, Math.sin(swingAngle) * 1.4)); // Calculate bat tip position
        const hitRadius = 0.84; // Radius within which a hit is detected much large than actual bat radius

        // Draw a debug rectangle to visualize the hitbox
        //rawRect(batTip, vec2(hitRadius * 2, hitRadius * 2), hsl(0, 1, 0.5, 0.5)); 


        // Check for zombies within range of the bat's tip
        gameSettings.zombies.forEach(zombie => {
            if (!zombie.isDead) {
                const distanceToZombie = batTip.distance(zombie.pos);
                if (distanceToZombie < hitRadius) {
                    // Check if the zombie is a Boomer
                    if (zombie instanceof Boomer) {
                        zombie.boomerHitByBat();// Boomer-specific reaction to being hit
                    } else {
                        zombie.kill(); // Generic kill for other zombie types
                    }
                }
            }
        });
    }

    addItem(itemName) {
        if (!this.items.includes(itemName)) {
            this.items.push(itemName);
        }

        if (itemName === 'Pistol') {
            this.weapon = itemName; // Switch to Pistol
            this.magazineSize = 7; // Default Pistol magazine size
            this.currentAmmo = this.magazineSize; // Reset current ammo to magazine 
            this.usingBat = false; // No longer using the bat
        }
        else if (itemName === 'Shotgun') {
            this.weapon = itemName; // Switch to Shotgun
            this.magazineSize = 6; // Example Shotgun magazine size
            this.currentAmmo = this.magazineSize; // Reset current ammo to magazine size
            this.usingBat = false; // No longer using the bat
        }
        else if (itemName === 'Machine Gun') {
            this.weapon = itemName; // Switch to Machine Gun
            this.magazineSize = 13; // Set ammo size to 13 for Machine Gun
            this.currentAmmo = this.magazineSize; // Reset current ammo to full magazine
            this.usingBat = false; // No longer using the bat
        }
    }

    hasGun() {
        return this.items.includes('Shotgun') || this.items.includes('Machine Gun') || this.items.includes('Pistol');
    }
}