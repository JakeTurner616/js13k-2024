import { makeBlood, makeFire, makeExplosion } from './effects.js';
import { sound_explode } from './sound.js';
import { player } from './main.js';
import { EXPLOSION_RADIUS, gameSettings } from './main.js';
import { vec2, drawRect, hsl, Color, drawLine} from './libs/littlejs.esm.min.js';
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
            } else {
                const explosionRadiusColor = new Color(0.6, 1, 0.5);
                drawLine(this.pos, this.pos.add(vec2(EXPLOSION_RADIUS, 0)), 0.1, explosionRadiusColor);
                drawLine(this.pos, this.pos.add(vec2(-EXPLOSION_RADIUS, 0)), 0.1, explosionRadiusColor);
                drawLine(this.pos, this.pos.add(vec2(0, EXPLOSION_RADIUS)), 0.1, explosionRadiusColor);
                drawLine(this.pos, this.pos.add(vec2(0, -EXPLOSION_RADIUS)), 0.1, explosionRadiusColor);
            }
        } else {
            drawRect(this.pos, vec2(1, 1), hsl(0.6, 1, 0.5));
        }
    }
}