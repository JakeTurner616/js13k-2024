import { Zombie, gameState } from './zombie.js'; // Assuming zombie.js is the file containing the base Zombie class
import { vec2, drawRect, drawLine, hsl, PI } from './libs/littlejs.esm.min.js';
import { player } from './main.js';

export class BossZombie extends Zombie {
    constructor(pos) {
        super(pos);
        this.numLegs = 6;
        this.legLength = 1.5;
        this.legs = [];
        this.legSpeed = 0.09;
        this.bodySize = 1.2;
        this.speed = 0.009;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.healthBarWidth = 1.5;
        this.healthBarHeight = 0.3;
        this.fadeOutTimer = 4;
        this.isFadingOut = false;
        this.initializeLegs();
    }
    // Override method to handle explosion damage
    takeExplosionDamage() {
        this.takeHit(20); // Instead of dying, the BossZombie takes damage
    }
    initializeLegs() {
        const angleToPlayer = Math.atan2(player.pos.y - this.pos.y, player.pos.x - this.pos.x);
        const totalSpreadAngle = PI; // Total spread angle for all legs around the body (180 degrees)
        const angleBetweenLegs = totalSpreadAngle / (this.numLegs - 1); // Angle between each leg

        for (let i = 0; i < this.numLegs; i++) {
            // Calculate angle for each leg: evenly distributed around the angle to the player
            const legAngle = angleToPlayer - totalSpreadAngle / 2 + i * angleBetweenLegs;

            this.legs.push({
                baseAngle: legAngle, // Start angle for symmetry
                angle: legAngle,
                targetX: this.pos.x + Math.cos(legAngle) * this.legLength,
                targetY: this.pos.y + Math.sin(legAngle) * this.legLength,
                currentLength: this.legLength,
                speed: 0.05, // Random speed for natural movement
                stepProgress: 0,
                stepping: false,
            });
        }
    }

    update() {
        super.update();
        if (this.isDead || gameState.gameOver) return;

        // Update body position toward the player
        const direction = player.pos.subtract(this.pos).normalize();
        this.pos = this.pos.add(direction.scale(this.speed));

        // Update leg positions for realistic gait
        this.updateLegs();
    }

    takeHit(damage) {
        // Reduce health by the damage amount
        this.health -= damage;

        // Ensure health does not go below zero
        if (this.health < 0) {
            this.health = 0;
        }

        // Check if health falls to zero and handle death logic
        if (this.health === 0 && !this.isDead) {
            this.onDeath(); // Trigger death logic
        } else {
            // Logic for when the boss takes damage but is not dead yet
            console.log(`BossZombie took ${damage} damage, current health: ${this.health}`);
        }
    }

    onDeath() {
        // Set the state to dead and trigger any death animations or effects
        this.isDead = true;
        this.isFadingOut = true;
        console.log("BossZombie is dead!");

        // Freeze legs positions
        this.legs.forEach(leg => {
            leg.stepping = false; // Stop legs from stepping
        });
    }

    updateLegs() {
        if (this.isDead) return; // Stop updating legs if dead

        const angleToPlayer = Math.atan2(player.pos.y - this.pos.y, player.pos.x - this.pos.x);
        const totalSpreadAngle = PI; // Total spread angle for all legs around the body (180 degrees)
        const angleBetweenLegs = totalSpreadAngle / (this.numLegs - 1); // Angle between each leg

        this.legs.forEach((leg, index) => {
            // Update base angle to remain symmetric around the player direction
            leg.baseAngle = angleToPlayer - totalSpreadAngle / 2 + index * angleBetweenLegs;

            // Check if the leg needs to step
            if (!leg.stepping) {
                const dx = leg.targetX - (this.pos.x + Math.cos(leg.angle) * leg.currentLength);
                const dy = leg.targetY - (this.pos.y + Math.sin(leg.angle) * leg.currentLength);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // If the leg is too far from its target, initiate a step
                if (distance > this.legLength / 2) {
                    leg.stepping = true;
                    leg.stepProgress = 0;
                }
            }

            // Leg stepping motion
            if (leg.stepping) {
                leg.stepProgress += 0.1;
                if (leg.stepProgress > 1) {
                    leg.stepProgress = 1;
                    leg.stepping = false;
                }

                const stepHeight = 0.2; // Height of the leg step
                const stepX = this.pos.x + Math.cos(leg.baseAngle) * this.legLength;
                const stepY = this.pos.y + Math.sin(leg.baseAngle) * this.legLength;
                leg.targetX = this.lerp(leg.targetX, stepX, leg.stepProgress);
                leg.targetY = this.lerp(leg.targetY, stepY - Math.sin(leg.stepProgress * PI) * stepHeight, leg.stepProgress);
            }

            // IK calculations: move the target point and adjust leg length
            const dx = leg.targetX - this.pos.x;
            const dy = leg.targetY - this.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            leg.currentLength = Math.min(this.legLength, distance);
            leg.angle = Math.atan2(dy, dx);
        });
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    render() {
        if (this.isDead && this.fadeOutTimer <= 0) {
            return; // Stop rendering if the zombie is dead and fully faded out
        }
        let bodyColor = hsl(0.6, 1, 0.5); // Normal color when alive
        let legColor = hsl(0.6, 1, 0.5); // Normal leg color
        let opacity = 1;

        if (this.isDead) {
            // Adjust color to grey and manage fading out
            bodyColor = hsl(0, 0, 0.5, opacity);
            legColor = hsl(0, 0, 0.5, opacity);

            if (this.isFadingOut) {
                // Fade out effect over 4 seconds
                opacity = this.fadeOutTimer / 4;
                bodyColor = hsl(0, 0, 0.5, opacity); // Apply opacity to the body color
                legColor = hsl(0, 0, 0.5, opacity); // Apply opacity to the legs
                this.fadeOutTimer -= 1 / 60; // Assuming the game updates at 60 FPS

                if (this.fadeOutTimer <= 0) {
                    opacity = 0; // Fully faded out
                    this.isFadingOut = false;
                }
            }
        }

        // Draw the body with the appropriate color and opacity
        drawRect(this.pos, vec2(this.bodySize), bodyColor);

        // Draw the health bar above the boss if not dead
        if (!this.isDead) {
            this.renderHealthBar();
        }

        // Draw each leg with the appropriate color and opacity
        this.legs.forEach(leg => {
            const endX = this.pos.x + Math.cos(leg.angle) * leg.currentLength;
            const endY = this.pos.y + Math.sin(leg.angle) * leg.currentLength;
            drawLine(this.pos, vec2(endX, endY), 0.1, legColor); // Legs are drawn from the body to the leg end
        });
    }

    renderHealthBar() {
        // Calculate the position of the health bar and the percentage of health remaining
        const healthBarPos = this.pos.add(vec2(-this.healthBarWidth / 2 + .72, this.bodySize));
        const healthPercent = this.health / this.maxHealth;
        
        // Draw the lost health portion of the health bar (red), filling the entire bar first
        drawRect(
            healthBarPos, 
            vec2(this.healthBarWidth, this.healthBarHeight), 
            hsl(0, 1, 0.5) // Red color for lost health
        );
        
        // Calculate the width of the green part based on the health percentage
        const greenWidth = this.healthBarWidth * healthPercent;

        // Calculate the position of the green part relative to the red part
        const greenPos = healthBarPos.add(vec2(greenWidth / 2 - this.healthBarWidth / 2, 0));

        // Draw the current health portion of the health bar (green), left-aligned
        drawRect(
            greenPos, 
            vec2(greenWidth, this.healthBarHeight), 
            hsl(0.3, 1, 0.5) // Green color for current health
        );
    }
}