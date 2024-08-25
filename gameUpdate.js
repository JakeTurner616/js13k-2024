
import { stopSpawningZombies, startSpawningZombies } from './zombie.js';
import { handleShopMouseClick, handleShopInput } from './shop.js';
import { printGameplayStats } from './utils.js';
import { gameSettings } from './main.js';

export function gameUpdate() {
    if (gameOver) return;

    // Handle shop interactions
    handleShopMouseClick();

    if (inShop) {
        handleShopInput(); // Handle shop keyboard input
        return;
    }

    // Handle shooting and other game actions if not in the shop
    if (mouseWasPressed(0)) {
        player.shoot(mousePos);
    }

    // Update player, zombies, and bullets
    player.update();
    zombies.forEach(zombie => zombie.update());
    bullets.forEach(bullet => bullet.update());

    // Remove off-screen bullets
    bullets = bullets.filter(bullet => bullet.isOnScreen());

    // Remove dead zombies after blood animation
    zombies = zombies.filter(zombie => !zombie.isDead || zombie.deathTimer > 0);

    // Adjust difficulty based on kill count
    if (killCount >= 10) {
        gameSettings.zombieSpeed += 0.005; // Increase zombie speed
        var spawnRate = Math.max(500, spawnRate - 50); 
        killCount = 0; // Reset kill count after increasing difficulty
        stopSpawningZombies();
        startSpawningZombies();
    }

    // Print gameplay stats
    printGameplayStats();
}

export function gameUpdatePost() {
    // Any post-update logic can go here
}