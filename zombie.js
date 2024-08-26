import { makeBlood, makeFire, makeExplosion } from './effects.js';
import { sound_explode } from './sound.js';
import { player } from './main.js';
import { EXPLOSION_RADIUS, gameSettings } from './main.js';
import { vec2, drawRect, hsl, Color, drawLine, PI} from './libs/littlejs.esm.min.js';
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
        this.deathTimer = 0;
        this.frozen = false;
        this.onFire = false;
        this.fireEmitter = null;
        this.fadeOutTimer = 4;
    }

    update() {
        if (gameState.gameOver) return;

        if (this.frozen) {
            this.speed = 0;
            setTimeout(() => { this.frozen = false; this.speed = gameSettings.zombieSpeed; }, 3000);
        }

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

        if (!this.isDead) {
            this.avoidCollisions();

            const direction = player.pos.subtract(this.pos).normalize();
            this.pos = this.pos.add(direction.scale(this.speed));

            if (this.pos.distance(player.pos) < 1) {
                setGameOver(true); // Use setGameOver() instead of direct assignment
            }
        } else {
            if (this.fadeOutTimer > 0) {
                this.fadeOutTimer -= 1 / 60;
                if (this.fadeOutTimer <= 0) {
                    this.deathTimer = 0;
                    if (this.fireEmitter) this.fireEmitter.emitRate = 0;
                }
            }
        }
    }

    startFadeOut() {
        this.fadeOutTimer = 4;
    }

    avoidCollisions() {
        gameSettings.zombies.forEach(otherZombie => {
            if (otherZombie !== this && !otherZombie.isDead && this.pos.distance(otherZombie.pos) < 1) {
                const avoidanceDirection = this.pos.subtract(otherZombie.pos).normalize();
                this.pos = this.pos.add(avoidanceDirection.scale(this.speed));
            }
        });
    }

    render() {
        let opacity = 1;
        if (this.fadeOutTimer > 0) {
            opacity = this.fadeOutTimer / 4;
        }

        if (this.isDead && this.onFire) {
            drawRect(this.pos, vec2(1, 1), hsl(0.1, 1, 0.5, opacity));
        } else if (this.isDead) {
            drawRect(this.pos, vec2(1, 1), hsl(0, 0, 0.2, opacity));
        } else if (this.frozen) {
            drawRect(this.pos, vec2(1, 1), hsl(0.6, 1, 1));
        } else {
            drawRect(this.pos, vec2(1, 1), hsl(0.3, 1, 0.5));
        }
    }
}

export class Boomer extends Zombie {
    constructor(pos) {
        super(pos);
        this.speed = gameSettings.zombieSpeed - 0.005;
        this.exploding = false;
        this.bloodEmitter = null;
        this.explosionEmitter = null;
    }

    update() {
        if (gameState.gameOver) return;

        if (!this.isDead) {
            super.update();
        } else {
            if (!this.exploding) {
                this.exploding = true;
                setTimeout(() => {
                    this.explode();
                }, 2000);
            }
            this.deathTimer -= 1 / 60;
            this.bombFlickerEffect();
        }
    }

    bombFlickerEffect() {
        if (this.exploding) {
            const flickerColor = Math.random() > 0.5 ? hsl(0.6, 1, 0.5) : hsl(0, 0, 0.2);
            drawRect(this.pos, vec2(1, 1), flickerColor);
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

    render() {
        if (this.isDead) {
            if (!this.exploding) {
                drawRect(this.pos, vec2(1, 1), hsl(0, 0, 0.2));
            } //else {
                // Draw explosion radius coodinate plane for debugging and testing
                //const explosionRadiusColor = new Color(0.6, 1, 0.5);
                //drawLine(this.pos, this.pos.add(vec2(EXPLOSION_RADIUS, 0)), 0.1, explosionRadiusColor);
                //drawLine(this.pos, this.pos.add(vec2(-EXPLOSION_RADIUS, 0)), 0.1, explosionRadiusColor);
                //drawLine(this.pos, this.pos.add(vec2(0, EXPLOSION_RADIUS)), 0.1, explosionRadiusColor);
                //drawLine(this.pos, this.pos.add(vec2(0, -EXPLOSION_RADIUS)), 0.1, explosionRadiusColor);
            //}
        } else {
            drawRect(this.pos, vec2(1, 1), hsl(0.6, 1, 0.5));
        }
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
