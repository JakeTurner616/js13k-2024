import { gameSettings, startSpawningZombies, stopSpawningZombies } from './main.js';
import { sound_hit, sound_fire, sound_ice } from './sound.js';
import { makeBlood } from './effects.js';
import { setGameOver } from './zombie.js';
import { vec2, mainCanvas, drawRect, hsl, cameraScale } from './libs/littlejs.esm.min.js';

let killCount = 0;
let _scorecnt = 0; // Private variable for score

// Getter for score
export function getScore() {
    return _scorecnt;
}

// Setter for score
export function setScore(value) {
    _scorecnt = value;
    // Additional logic can be added here, such as updating the UI
}

// Function to increment score
export function incrementScore() {
    setScore(getScore() + 1);
}

let currency = 0; // Use a private variable to store the currency

export function getCurrency() {
    return currency;
}

export function setCurrency(value) {
    currency = value;
    // Add any additional logic here, such as updating the UI, if needed
}

// Increment currency
export function addCurrency(amount) {
    setCurrency(getCurrency() + amount);
}

export class Bullet {
    constructor(pos, direction, fireAbility, iceAbility) {
        this.pos = pos;
        this.direction = direction.normalize(); // Normalize the direction to ensure it's a unit vector
        this.speed = 0.5;
        this.fireAbility = fireAbility;
        this.iceAbility = iceAbility;
    }

    update() {
        if (setGameOver(false)) return; // Assuming setGameOver() also returns the current gameOver state

        if (killCount >= 10) {
            gameSettings.zombieSpeed += 0.005;
            gameSettings.spawnRate = Math.max(500, gameSettings.spawnRate - 50);
            killCount = 0;
            stopSpawningZombies();
            startSpawningZombies();
        }

        // Move bullet in the calculated direction
        this.pos = this.pos.add(this.direction.scale(this.speed));

        // Check collision with zombies
        for (let i = 0; i < gameSettings.zombies.length; i++) {
            const zombie = gameSettings.zombies[i];

            // Skip hit detection if the zombie is on fire
            if (zombie.onFire) {
                continue;
            }

            if (!zombie.isDead && this.pos.distance(zombie.pos) < 1) {
                if (this.fireAbility) {
                    zombie.onFire = true;
                    sound_fire.play(this.pos);
                } else if (this.iceAbility) {
                    zombie.frozen = true;
                    sound_ice.play(this.pos);
                } else {
                    zombie.isDead = true;
                }
                zombie.deathTimer = 3; // Set death timer to 4 seconds for fire ability
                incrementScore(); // Increment the score using the function
                addCurrency(1); // Increase currency using the setter

                killCount++; // Increase kill count

                // Play hit sound
                sound_hit.play(this.pos);

                // Create blood effect
                const bloodEmitter = makeBlood(this.pos);

                // Stop blood animation after 3 seconds
                setTimeout(() => {
                    bloodEmitter.emitRate = 0;
                }, 3000);

                // Remove bullet
                gameSettings.bullets.splice(gameSettings.bullets.indexOf(this), 1);
                return;
            }
        }

        // Remove bullet if it goes off-screen
        if (!this.isOnScreen()) {
            gameSettings.bullets.splice(gameSettings.bullets.indexOf(this), 1);
        }
    }

    isOnScreen() {
        const halfCanvasWidth = (mainCanvas.width / 2) / cameraScale;
        const halfCanvasHeight = (mainCanvas.height / 2) / cameraScale;

        return this.pos.x >= -halfCanvasWidth && this.pos.x <= halfCanvasWidth &&
               this.pos.y >= -halfCanvasHeight && this.pos.y <= halfCanvasHeight;
    }

    render() {
        drawRect(this.pos, vec2(0.5, 0.5), hsl(0.1, 1, 0.5));
    }
}