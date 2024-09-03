import { gameSettings } from './main.js';
import { sound_hit, sound_fire } from './sound.js';
import { makeBlood } from './effects.js';
import { incrementScore, addCurrency } from './bullet.js';
import { BossZombie } from './boss.js';
import { Boomer } from './zombie.js'; // Import Boomer class

export class Melee {
    constructor(player) {
        this.player = player;
        this.swingRange = 1.5; // Example range for melee hit detection
        this.swingDamage = 1; // Amount of damage per melee hit
        this.swingDuration = 1500; // Duration of a melee swing in milliseconds
        this.swingCooldown = 500; // Cooldown time in milliseconds between swings
        this.lastSwingTime = 0; // Timestamp of the last swing
        this.isSwinging = false; // Track if a melee swing is in progress
        this.swingDirection = 1; // Swing direction: 1 for right, -1 for left
    }

    // Method to initiate a melee attack
    attack() {
        const currentTime = performance.now();

        // Check if player can swing again based on cooldown
        if (currentTime - this.lastSwingTime < this.swingCooldown) return;

        this.lastSwingTime = currentTime; // Update last swing time
        this.isSwinging = true; // Set swinging state

        // Randomize swing direction
        this.swingDirection = Math.random() > 0.5 ? 1 : -1;



        // Set a timeout to end the swing after its duration
        setTimeout(() => {
            this.isSwinging = false;
        }, this.swingDuration);
    }


    // Getter to check if a melee swing is in progress
    getSwingState() {
        return this.isSwinging;
    }
}