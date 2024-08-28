import { makeBlood, makeFire, makeExplosion } from './effects.js';
import { sound_explode } from './sound.js';
import { player } from './main.js';
import { EXPLOSION_RADIUS, gameSettings } from './main.js';
import { vec2, drawRect, hsl, drawLine, PI } from './libs/littlejs.esm.min.js';
export const gameState = {
    gameOver: false
};

export function setGameOver(value) {
    gameState.gameOver = value; // Modify the property, not the object itself
    return gameState.gameOver;
}


export class Zombie {
    constructor(pos) {
        this.pos = pos;
        this.speed = gameSettings.zombieSpeed;
        this.isDead = false;
        this.frozen = false;
        this.onFire = false;
        this.fireEmitter = null;
        this.fadeOutTimer = 3; // Timer for fade-out, starts after contagious period or upon death
        this.fireSpreadTimer = 2; // Timer for controlling fire spread duration (2 seconds by default)

        // Arm properties for zombie-like movement
        this.armLength = 1.2 + (Math.random() * 0.4); // Total length of each arm with random variation
        this.armThickness = 0.1; // Thickness of the arms
        this.armOscillationSpeed = 0.016 + (Math.random() * 0.02); // Speed of arm movement
        this.time = (Math.random() * 0.4); // Time to control animation

        // Randomized arm movement limits for each zombie
        this.minArmAngle = (Math.random() * Math.PI / 16) + Math.PI / 12; // Randomized minimum angle for arm swing
        this.maxArmAngle = this.minArmAngle + (Math.random() * Math.PI / 18) + Math.PI / 18;  // Reduced maximum angle to make sway more subtle

        // Randomized delay for arm movement to prevent synchronization
        this.armDelay = Math.random() * Math.PI; // Random delay to stagger arm movement
        this.frameDelay = Math.floor(Math.random() * 20) + 10; // Random frame delay between 10 to 30 frames

        // Frozen arm positions upon death
        this.frozenLeftArm = null;
        this.frozenRightArm = null;
    }

    update() {
        if (gameState.gameOver) return;

        if (this.frozen) {
            this.speed = 0;
            setTimeout(() => {
                this.frozen = false;
                this.speed = gameSettings.zombieSpeed;
            }, 3000);
        }

        if (this.isDead) {
            this.handleDeathFadeOut(); // Handle fading out when zombie is dead
        } else if (this.onFire) {
            this.handleFireState(); // Handle fire spreading and eventually fading out
        } else {
            this.checkFireSpread(); // Check if this zombie should catch fire from another onFire zombie
            this.moveTowardsPlayer(); // Move towards the player if not on fire or dead
        }
    }

    handleDeathFadeOut() {
        // Handle the fade-out process when the zombie is dead
        if (this.fadeOutTimer > 0) {
            this.fadeOutTimer -= 1 / 60;  // Decrement the fade-out timer each frame
            if (this.fadeOutTimer <= 0) {
                // Fully fade out and remove zombie
                this.isDead = true; // Zombie is considered fully dead when fade-out completes
                if (this.fireEmitter) {
                    this.fireEmitter.emitRate = 0; // Stop fire effects if present
                }
            }
        } else if (this.fadeOutTimer === 0) {
            this.startFadeOut(); // Start fade-out if it's not started yet
        }
    }

    handleFireState() {
        // If the zombie is on fire, manage the fire spreading and eventually start fading out
        if (this.fireSpreadTimer > 0) {
            this.spreadFire();  // Spread fire if the fire spread timer is active
            this.fireSpreadTimer -= 1 / 60;  // Decrement the fire spread timer each frame
        } else {
            // Start fade out after the fire spreading period ends without a flash
            if (this.fadeOutTimer > 0) {
                this.fadeOutTimer -= 1 / 60;  // Decrement the fade-out timer each frame
                if (this.fadeOutTimer <= 0) {
                    this.isDead = true; // Zombie is dead after fade-out completes
                    if (this.fireEmitter) {
                        this.fireEmitter.emitRate = 0; // Stop fire effects when zombie is fully dead
                    }
                }
            } else if (this.fadeOutTimer === 0) {
                this.startFadeOut(); // Start fade-out if it's not started yet
            }
        }
    }

    checkFireSpread() {
        // Check if this zombie should catch fire from another onFire zombie
        gameSettings.zombies.forEach(otherZombie => {
            if (otherZombie !== this && otherZombie.onFire && !this.onFire && !this.isDead) {
                if (this.pos.distance(otherZombie.pos) < 1) {
                    this.catchFire(); // Zombie catches fire when colliding with a burning zombie
                }
            }
        });
    }

    catchFire() {
        if (!this.onFire) { // Ensure we only trigger this once
            this.onFire = true;
            this.fireEmitter = makeFire(this.pos);  // Start the fire effect
            this.fireSpreadTimer = 2;  // Fire spread timer set for 2 seconds
            this.speed = 0; // Stop the zombie from moving when it's on fire
        }
    }

    spreadFire() {
        // Spread fire to nearby zombies if they are close enough to this burning zombie
        gameSettings.zombies.forEach(otherZombie => {
            if (otherZombie !== this && !otherZombie.isDead && !otherZombie.onFire) {
                if (this.pos.distance(otherZombie.pos) == this.pos) { // Check if the 2 zombies are close enough to make contact
                    otherZombie.catchFire();  // Trigger the catchFire method for the nearby zombie
                }
            }
        });
    }

    moveTowardsPlayer() {
        // If the zombie is not dead or on fire, it moves towards the player
        if (!this.isDead && !this.onFire) {
            if (this.frameDelay > 0) {
                this.frameDelay--;
            } else {
                this.time += this.armOscillationSpeed; // Update time for arm animation after delay
            }

            this.avoidCollisions();

            const direction = player.pos.subtract(this.pos).normalize();
            this.pos = this.pos.add(direction.scale(this.speed));

            if (this.pos.distance(player.pos) < 1) {
                setGameOver(true); // Trigger game over when zombie reaches the player
            }
        }
    }

    avoidCollisions() { // Poor mans pathfinding
        gameSettings.zombies.forEach(otherZombie => {
            if (otherZombie !== this && !otherZombie.isDead && this.pos.distance(otherZombie.pos) < 1) {
                const avoidanceDirection = this.pos.subtract(otherZombie.pos).normalize();
                this.pos = this.pos.add(avoidanceDirection.scale(this.speed));
            }
        });
    }

    render() {
        let opacity = 1;
        if (this.isDead) {
            // Start fading only after contagious period or upon normal death
            opacity = this.fadeOutTimer / 4;
        } else if (this.onFire && this.fireSpreadTimer <= 0) {
            // Start fading only after contagious period is over
            opacity = this.fadeOutTimer / 4;
        }

        if (this.isDead) {
            drawRect(this.pos, vec2(1, 1), hsl(0, 0, 0.2, opacity));
        } else if (this.onFire) {
            drawRect(this.pos, vec2(1, 1), hsl(0.1, 1, 0.5, opacity)); // Draw burning zombie
        } else if (this.frozen) {
            drawRect(this.pos, vec2(1, 1), hsl(0.6, 1, 1));
        } else {
            drawRect(this.pos, vec2(1, 1), hsl(0.3, 1, 0.5));
        }

        // Draw arms with zombie-like movement
        this.renderArms(opacity);
    }

    renderArms(opacity) {
        if (this.isDead) {
            // If zombie is dead, use frozen arm positions
            this.drawFrozenArm(this.frozenLeftArm, opacity);
            this.drawFrozenArm(this.frozenRightArm, opacity);
            
        } else {
            // If zombie is alive, animate arms
            this.drawArm(1, opacity);  // Right arm
            this.drawArm(-1, opacity); // Left arm
        }
    }

    drawFrozenArm(arm, opacity) {
        if (arm) {
            drawLine(arm.upperStart, arm.upperEnd, this.armThickness, hsl(0, 0, 0.2, opacity)); // Grey color for dead zombie arms
            drawLine(arm.upperEnd, arm.foreEnd, this.armThickness, hsl(0, 0, 0.2, opacity));
        }
    }

    drawArm(side, opacity) {
        // Calculate direction to player
        const directionToPlayer = player.pos.subtract(this.pos).normalize();
        const angleToPlayer = Math.atan2(directionToPlayer.y, directionToPlayer.x);

        // Adjust the base position for the arms to track the player
        const armBaseOffset = vec2(Math.cos(angleToPlayer + Math.PI / 2 * side), Math.sin(angleToPlayer + Math.PI / 2 * side)).scale(0.5);
        const basePos = this.pos.add(armBaseOffset);

        // Lengths of each arm segment
        const upperArmLength = this.armLength * 0.5;
        const forearmLength = this.armLength * 0.5;

        // Oscillate arm angles to create a zombie-like staggered effect
        const upperArmAngle = angleToPlayer + Math.sin(this.time + this.armDelay) * (this.maxArmAngle - this.minArmAngle);
        const forearmAngle = upperArmAngle + Math.sin(this.time + this.armDelay + Math.PI / 4) * (this.maxArmAngle - this.minArmAngle);

        // Calculate end position of the upper arm
        const upperArmEnd = basePos.add(vec2(Math.cos(upperArmAngle), Math.sin(upperArmAngle)).scale(upperArmLength));
        drawLine(basePos, upperArmEnd, this.armThickness, hsl(0.3, 1, 0.5, opacity)); // Draw upper arm in green

        // Calculate end position of the forearm
        const forearmEnd = upperArmEnd.add(vec2(Math.cos(forearmAngle), Math.sin(forearmAngle)).scale(forearmLength));
        drawLine(upperArmEnd, forearmEnd, this.armThickness, hsl(0.3, 1, 0.5, opacity)); // Draw forearm in green

        // Save arm positions for freezing upon death
        if (side === 1) {
            this.frozenRightArm = { upperStart: basePos, upperEnd: upperArmEnd, foreEnd: forearmEnd };
        } else {
            this.frozenLeftArm = { upperStart: basePos, upperEnd: upperArmEnd, foreEnd: forearmEnd };
        }
    }

    startFadeOut() {
        // Start the fade-out process
        this.fadeOutTimer = 4; // Set the fade-out timer to 4 seconds after death
    }
}







export class Boomer extends Zombie {
    constructor(pos) {
        super(pos);
        this.speed = gameSettings.zombieSpeed - 0.005;
        this.exploding = false;
        this.bloodEmitter = null;
        this.explosionEmitter = null;

        // Arm properties for Boomer-like movement
        this.armLength = 1.2 + (Math.random() * 0.4); // Total length of each arm with random variation
        this.armThickness = 0.1; // Thickness of the arms
        this.armOscillationSpeed = 0.016 + (Math.random() * 0.02); // Speed of arm movement
        this.time = (Math.random() * 0.4); // Time to control animation

        // Ensure min and max arm angles have a meaningful difference
        this.minArmAngle = (Math.random() * PI / 16) + PI / 12; // Randomized minimum angle for arm swing
        this.maxArmAngle = this.minArmAngle + (Math.random() * PI / 18) + PI / 18;  // Reduced maximum angle to make sway more subtle

        // Randomized delay for arm movement to prevent synchronization
        this.armDelay = Math.random() * PI; // Random delay to stagger arm movement
        this.frameDelay = Math.floor(Math.random() * 20) + 10; // Random frame delay between 10 to 30 frames

        // Frozen arm positions upon death
        this.frozenLeftArm = null;
        this.frozenRightArm = null;
    }

    update() {
        if (gameState.gameOver) return;

        if (!this.isDead) {
            // Decrement the frame delay counter before starting the animation
            if (this.frameDelay > 0) {
                this.frameDelay--;
            } else {
                this.time += this.armOscillationSpeed; // Update time for arm animation after delay
            }

            super.update();
        } else {
            if (!this.exploding) {
                this.exploding = true;
                this.freezeArms(); // Freeze arms when Boomer starts exploding
                setTimeout(() => {
                    this.explode();
                }, 2000); // Explosion delay after death
            }
        }
    }

    handleFireState() {
        // If the Boomer is on fire, manage the fire spreading and explosion
        if (this.fireSpreadTimer > 0) {
            this.spreadFire();  // Spread fire if the fire spread timer is active
            this.fireSpreadTimer -= 1 / 60;  // Decrement the fire spread timer each frame
        } else if (!this.isDead && this.onFire) {
            // After contagious period, Boomer should explode if it's on fire
            this.isDead = true;
            this.explode();
        }
    }

    explode() {
        this.bloodEmitter = makeBlood(this.pos, 10);
        this.explosionEmitter = makeExplosion(this.pos, 200);
        sound_explode.play(this.pos);

        // Affect all zombies within the explosion radius
        gameSettings.zombies.forEach(zombie => {
            if (this.pos.distance(zombie.pos) < EXPLOSION_RADIUS) {
                if (zombie !== this && !zombie.isDead) {
                    zombie.catchFire(); // Set nearby zombies on fire instead of killing them
                }
            }
        });

        if (this.pos.distance(player.pos) < EXPLOSION_RADIUS) {
            setGameOver(true); // End game if player is within explosion radius
        }

        setTimeout(() => {
            if (this.bloodEmitter) this.bloodEmitter.emitRate = 0;
            if (this.explosionEmitter) this.explosionEmitter.emitRate = 0;
        }, 1000);

        this.deathTimer = 0;
    }

    freezeArms() {
        // Freeze the current positions of the arms when Boomer is shot and starts to explode
        this.frozenLeftArm = this.getCurrentArmPosition(-1);
        this.frozenRightArm = this.getCurrentArmPosition(1);
    }

    getCurrentArmPosition(side) {
        // Calculate direction to player
        const directionToPlayer = player.pos.subtract(this.pos).normalize();
        const angleToPlayer = Math.atan2(directionToPlayer.y, directionToPlayer.x);

        // Adjust the base position for the arms to track the player
        const armBaseOffset = vec2(Math.cos(angleToPlayer + PI / 2 * side), Math.sin(angleToPlayer + PI / 2 * side)).scale(0.5);
        const basePos = this.pos.add(armBaseOffset);

        // Lengths of each arm segment
        const upperArmLength = this.armLength * 0.5;
        const forearmLength = this.armLength * 0.5;

        // Oscillate arm angles to create a zombie-like staggered effect
        const upperArmAngle = angleToPlayer + Math.sin(this.time + this.armDelay) * (this.maxArmAngle - this.minArmAngle);
        const forearmAngle = upperArmAngle + Math.sin(this.time + this.armDelay + PI / 4) * (this.maxArmAngle - this.minArmAngle);

        // Calculate end position of the upper arm
        const upperArmEnd = basePos.add(vec2(Math.cos(upperArmAngle), Math.sin(upperArmAngle)).scale(upperArmLength));
        const forearmEnd = upperArmEnd.add(vec2(Math.cos(forearmAngle), Math.sin(forearmAngle)).scale(forearmLength));

        return { upperStart: basePos, upperEnd: upperArmEnd, foreEnd: forearmEnd };
    }

    render() {
        let color;
        if (this.isDead) {
            if (this.exploding) {
                this.bombFlickerEffect(); // Flicker effect during explosion
                return;
            } else {
                color = hsl(0, 0, 0.2); // Grey color when dead and not yet exploded
            }
        } else if (this.onFire) {
            color = hsl(0.1, 1, 0.5); // Burning color
        } else {
            color = hsl(0.6, 1, 0.5); // Normal Boomer color
        }

        drawRect(this.pos, vec2(1, 1), color);
        this.renderArms(color); // Render arms with appropriate color
    }

    renderArms(color) {
        if (this.isDead && this.exploding) {
            // Flash arms with the body
            this.drawFrozenArm(this.frozenLeftArm, color);
            this.drawFrozenArm(this.frozenRightArm, color);
        } else if (this.isDead) {
            // If Boomer is dead but not exploded yet, use frozen arm positions
            this.drawFrozenArm(this.frozenLeftArm, color);
            this.drawFrozenArm(this.frozenRightArm, color);
        } else {
            // If Boomer is alive, animate arms
            this.drawArm(1, color);  // Right arm
            this.drawArm(-1, color); // Left arm
        }
    }

    drawFrozenArm(arm, color) {
        if (arm) {
            drawLine(arm.upperStart, arm.upperEnd, this.armThickness, color); // Use the color for the frozen arm
            drawLine(arm.upperEnd, arm.foreEnd, this.armThickness, color);
        }
    }

    drawArm(side, color) {
        // Calculate direction to player
        const directionToPlayer = player.pos.subtract(this.pos).normalize();
        const angleToPlayer = Math.atan2(directionToPlayer.y, directionToPlayer.x);

        // Adjust the base position for the arms to track the player
        const armBaseOffset = vec2(Math.cos(angleToPlayer + PI / 2 * side), Math.sin(angleToPlayer + PI / 2 * side)).scale(0.5);
        const basePos = this.pos.add(armBaseOffset);

        // Lengths of each arm segment
        const upperArmLength = this.armLength * 0.5;
        const forearmLength = this.armLength * 0.5;

        // Oscillate arm angles to create a boomer-like staggered effect
        const upperArmAngle = angleToPlayer + Math.sin(this.time + this.armDelay) * (this.maxArmAngle - this.minArmAngle);
        const forearmAngle = upperArmAngle + Math.sin(this.time + this.armDelay + PI / 4) * (this.maxArmAngle - this.minArmAngle);

        // Calculate end position of the upper arm
        const upperArmEnd = basePos.add(vec2(Math.cos(upperArmAngle), Math.sin(upperArmAngle)).scale(upperArmLength));
        drawLine(basePos, upperArmEnd, this.armThickness, color); // Draw upper arm

        // Calculate end position of the forearm
        const forearmEnd = upperArmEnd.add(vec2(Math.cos(forearmAngle), Math.sin(forearmAngle)).scale(forearmLength));
        drawLine(upperArmEnd, forearmEnd, this.armThickness, color); // Draw forearm

        // Save arm positions for freezing upon death
        if (side === 1) {
            this.frozenRightArm = { upperStart: basePos, upperEnd: upperArmEnd, foreEnd: forearmEnd };
        } else {
            this.frozenLeftArm = { upperStart: basePos, upperEnd: upperArmEnd, foreEnd: forearmEnd };
        }
    }

    bombFlickerEffect() {
        if (this.exploding) {
            const flickerColor = Math.random() > 0.5 ? hsl(0.6, 1, 0.5) : hsl(0, 0, 0.2);
            drawRect(this.pos, vec2(1, 1), flickerColor);
            // Flash the frozen arms with the body
            this.drawFrozenArm(this.frozenLeftArm, flickerColor);
            this.drawFrozenArm(this.frozenRightArm, flickerColor);
        }
    }

    explode() {
        this.bloodEmitter = makeBlood(this.pos, 10);
        this.explosionEmitter = makeExplosion(this.pos, 200);
        sound_explode.play(this.pos);

        gameSettings.zombies.forEach(zombie => {
            if (this.pos.distance(zombie.pos) < EXPLOSION_RADIUS) {
                zombie.isDead = true;
                zombie.deathTimer = 3;
                zombie.startFadeOut();
            }
        });

        if (this.pos.distance(player.pos) < EXPLOSION_RADIUS) {
            setGameOver(true); // Use setGameOver() instead of direct assignment
        }

        setTimeout(() => {
            if (this.bloodEmitter) this.bloodEmitter.emitRate = 0;
            if (this.explosionEmitter) this.explosionEmitter.emitRate = 0;
        }, 1000);

        this.deathTimer = 0;
    }
}
export class DeadlyDangler extends Zombie {
    constructor(pos) {
        super(pos); // Call the parent class constructor first

        // Initialize unique properties for DeadlyDangler
        this.tendrilLength = 2.5; // Length of the deadly tendrils
        this.legLength = 1.5; // Base length scale for tendrils
        this.legThickness = 0.1; // Thickness of the tendrils
        this.numLegsPerSide = 3; // Three tendrils per side
        this.animationSpeed = 0.1; // Speed of tendril movement
        this.legOffset = PI / 3; // Phase offset for tendril movement
        this.time = 0; // Time to control animation
        this.rotationSpeed = 0.05; // Speed of rotation toward the target direction
        this.movementSpeed = 0.02; // Speed of movement toward the player
        this.randomFactors = this.generateRandomFactors(); // Random factors for each tendril
    }

    generateRandomFactors() {
        // Generate random factors for each tendril's oscillation
        const randomFactors = [];
        for (let i = 0; i < this.numLegsPerSide * 2; i++) {
            randomFactors.push({
                phaseShift: Math.random() * 2 * PI, // Random phase shift between 0 and 2*PI
                amplitudeVariation: Math.random() * 0.2 + 0.9 // Random amplitude variation between 0.9 and 1.1
            });
        }
        return randomFactors;
    }

    update() {
        if (gameState.gameOver) return;

        if (this.frozen) {
            this.speed = 0;
            setTimeout(() => {
                this.frozen = false;
                this.speed = gameSettings.zombieSpeed;
            }, 3000);
        }

        // Fire handling for DeadlyDangler
        if (this.onFire && !this.isDead) {
            this.isDead = true;
            this.fireEmitter = makeFire(this.pos);

            gameSettings.zombies.forEach(otherZombie => {
                if (!otherZombie.isDead && this.pos.distance(otherZombie.pos) < 1 && !otherZombie.onFire) {
                    otherZombie.onFire = true;
                }
            });

            this.startFadeOut();
        }

        // If not dead, update movement and tendrils
        if (!this.isDead) {
            this.time += this.animationSpeed; // Update time for animation

            // Move towards the player
            const direction = player.pos.subtract(this.pos).normalize();
            this.pos = this.pos.add(direction.scale(this.movementSpeed));

            // Check for collision with tendrils
            if (this.checkTendrilCollision(player.pos)) {
                setGameOver(true); // Player is caught by the deadly tendrils
            }
        } else {
            // Handle fade-out if dead
            if (this.fadeOutTimer > 0) {
                this.fadeOutTimer -= 1 / 60;
                if (this.fadeOutTimer <= 0) {
                    this.deathTimer = 0;
                    if (this.fireEmitter) this.fireEmitter.emitRate = 0;
                }
            }
        }
    }

    checkTendrilCollision(playerPos) {
        // Check each tendril segment for collision with the player
        for (let side = -1; side <= 1; side += 2) { // -1 for left side, 1 for right side
            for (let i = 0; i < this.numLegsPerSide; i++) {
                if (this.checkTendrilSegmentCollision(side, i, playerPos)) {
                    return true; // Collision detected
                }
            }
        }
        return false; // No collision detected
    }

    checkTendrilSegmentCollision(side, index, playerPos) {
        // Adjust base position to start from left or right edge of the body
        const baseOffsetX = (1 / 2 + this.legThickness / 2) * side; // Move to left or right edge
        const baseOffsetY = (index - (this.numLegsPerSide - 1) / 2) * (1 / this.numLegsPerSide);
        const basePos = this.pos.add(vec2(baseOffsetX, baseOffsetY));

        // Define lengths for each tendril segment
        const lengths = {
            coxa: this.legLength * 0.3,
            trochanter: this.legLength * 0.2,
            femur: this.legLength * 0.6,
            patella: this.legLength * 0.4,
            tibia: this.legLength * 0.5,
            metatarsus: this.legLength * 0.4,
            tarsus: this.legLength * 0.2,
            claws: this.legLength * 0.1,
        };

        // Retrieve random factors for this tendril
        const legIndex = index + (side === 1 ? this.numLegsPerSide : 0);
        const { phaseShift, amplitudeVariation } = this.randomFactors[legIndex];

        // Calculate direction towards the player
        const directionToPlayer = player.pos.subtract(this.pos).normalize();
        const targetAngle = Math.atan2(directionToPlayer.y, directionToPlayer.x);

        // Base angle movement for trailing tendril effect with added randomness
        const t = (this.time + index * this.legOffset + phaseShift) % (2 * PI);

        // Angles for each segment, adjusted to point towards the player
        const angles = {
            coxa: targetAngle + Math.sin(t) * PI / 12 * side * amplitudeVariation,
            trochanter: targetAngle + Math.sin(t + PI / 8) * PI / 16 * side * amplitudeVariation,
            femur: targetAngle + Math.sin(t + PI / 4) * PI / 10 * side * amplitudeVariation,
            patella: targetAngle + Math.sin(t + PI / 3) * PI / 8 * side * amplitudeVariation,
            tibia: targetAngle + Math.sin(t + PI / 2) * PI / 6 * side * amplitudeVariation,
            metatarsus: targetAngle + Math.sin(t + (3 * PI) / 4) * PI / 8 * side * amplitudeVariation,
            tarsus: targetAngle + Math.sin(t + PI) * PI / 12 * side * amplitudeVariation,
            claws: targetAngle + Math.sin(t + (5 * PI) / 4) * PI / 16 * side * amplitudeVariation,
        };

        // Calculate positions for each segment's end point and check for collision
        let currentPos = basePos;
        for (const [key, length] of Object.entries(lengths)) {
            const angle = angles[key];
            const nextPos = currentPos.add(vec2(Math.cos(angle), Math.sin(angle)).scale(length));

            // Check if the player is close to the current segment of the tendril
            if (this.isPointNearSegment(playerPos, currentPos, nextPos, this.legThickness)) {
                return true; // Collision detected
            }

            currentPos = nextPos; // Move to the next position
        }

        return false; // No collision detected with any segment
    }

    isPointNearSegment(point, start, end, radius) {
        // Calculate the distance from the point to the line segment
        const lineVec = end.subtract(start);
        const pointVec = point.subtract(start);
        const lineLength = lineVec.length();
        const lineDirection = lineVec.normalize();
        const projectionLength = pointVec.dot(lineDirection);

        // Clamp projection length to be within the segment
        const clampedProjection = Math.max(0, Math.min(projectionLength, lineLength));
        const closestPoint = start.add(lineDirection.scale(clampedProjection));
        const distanceToPoint = closestPoint.subtract(point).length();

        // Check if the distance to the closest point on the line segment is within the radius
        return distanceToPoint <= radius;
    }

    render() {
        // Calculate the opacity for fading out effect
        let opacity = 1;
        if (this.fadeOutTimer > 0) {
            opacity = this.fadeOutTimer / 4; // Adjust opacity based on the fade-out timer
        }

        // Determine the body color based on whether the DeadlyDangler is dead
        const color = this.isDead ? hsl(0, 0, 0.2, opacity) : hsl(0.3, 1, 0.5, opacity); // Grey when dead, green otherwise

        // Render the zombie base with fading effect
        drawRect(this.pos, vec2(1, 1), color);

        // Render the tendrils with the same fading effect
        for (let side = -1; side <= 1; side += 2) { // -1 for left side, 1 for right side
            for (let i = 0; i < this.numLegsPerSide; i++) {
                this.drawTendril(side, i, opacity);
            }
        }
    }

    drawTendril(side, index, opacity) {
        // Adjust base position to start from left or right edge of the body
        const baseOffsetX = (1 / 2 + this.legThickness / 2) * side; // Move to left or right edge
        const baseOffsetY = (index - (this.numLegsPerSide - 1) / 2) * (1 / this.numLegsPerSide);
        const basePos = this.pos.add(vec2(baseOffsetX, baseOffsetY));

        // Define lengths for each tendril segment based on anatomical parts
        const lengths = {
            coxa: this.legLength * 0.3,
            trochanter: this.legLength * 0.2,
            femur: this.legLength * 0.6,
            patella: this.legLength * 0.4,
            tibia: this.legLength * 0.5,
            metatarsus: this.legLength * 0.4,
            tarsus: this.legLength * 0.2,
            claws: this.legLength * 0.1,
        };

        // Retrieve random factors for this tendril
        const legIndex = index + (side === 1 ? this.numLegsPerSide : 0);
        const { phaseShift, amplitudeVariation } = this.randomFactors[legIndex];

        // Freeze direction towards the player upon death
        let targetAngle;
        if (!this.isDead) {
            // Calculate direction towards the player
            const directionToPlayer = player.pos.subtract(this.pos).normalize();
            targetAngle = Math.atan2(directionToPlayer.y, directionToPlayer.x);
        } else {
            // Maintain the last target angle before dying
            targetAngle = this.lastTargetAngle || 0;
        }

        // Base angle movement for trailing tendril effect with added randomness
        const t = (this.time + index * this.legOffset + phaseShift) % (2 * PI);

        // Angles for each segment, adjusted to point towards the player
        const angles = {
            coxa: targetAngle + Math.sin(t) * PI / 12 * side * amplitudeVariation,
            trochanter: targetAngle + Math.sin(t + PI / 8) * PI / 16 * side * amplitudeVariation,
            femur: targetAngle + Math.sin(t + PI / 4) * PI / 10 * side * amplitudeVariation,
            patella: targetAngle + Math.sin(t + PI / 3) * PI / 8 * side * amplitudeVariation,
            tibia: targetAngle + Math.sin(t + PI / 2) * PI / 6 * side * amplitudeVariation,
            metatarsus: targetAngle + Math.sin(t + (3 * PI) / 4) * PI / 8 * side * amplitudeVariation,
            tarsus: targetAngle + Math.sin(t + PI) * PI / 12 * side * amplitudeVariation,
            claws: targetAngle + Math.sin(t + (5 * PI) / 4) * PI / 16 * side * amplitudeVariation,
        };

        // Determine the tendril color based on whether the DeadlyDangler is dead
        const color = this.isDead ? hsl(0, 0, 0.2, opacity) : hsl(0, 1, 0.5, opacity); // Grey when dead, red otherwise

        // Calculate positions for each segment's end point and draw them with fading effect
        let currentPos = basePos;
        for (const [key, length] of Object.entries(lengths)) {
            const angle = angles[key];
            const nextPos = currentPos.add(vec2(Math.cos(angle), Math.sin(angle)).scale(length));
            drawLine(currentPos, nextPos, this.legThickness, color); // Use the color variable with fading effect
            currentPos = nextPos; // Move to the next position
        }

        // Store the last angle before death to maintain it after dying
        if (!this.isDead) {
            this.lastTargetAngle = targetAngle;
        }
    }
}
