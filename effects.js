//effects.js
import { ParticleEmitter, Color, PI } from './libs/littlejs.esm.min.js';
export function makeBlood(pos, amount = 100) {
    const emitter = new ParticleEmitter(
        pos, 0, 0.5, 0.5, amount, PI,
        undefined,
        new Color(1, 0, 0), new Color(0.5, 0, 0),
        new Color(1, 0, 0, 0), new Color(0.5, 0, 0, 0),
        2, 0.2, 0.5, 0.3, 0.05,
        0.9, 0.9, 0.3, PI, 0.1,
        0.5, true, false, true, 0, false
    );

    emitter.elasticity = 0.8;
    emitter.trailScale = .8;
    emitter.fadeRate = 0.05;

    return emitter;
}

export function makeFire(pos, amount = 80) {
    const emitter = new ParticleEmitter(
        pos, 0, 0.1, 1, amount, PI / 2,
        undefined,
        new Color(1, 0.5, 0), new Color(1, 0.25, 0),
        new Color(1, 0, 0, 0), new Color(1, 0, 0, 0),
        2, 0.2, 0.5, 0.3, 0.05,
        0.9, 0.9, 0.3, PI, 0.1,
        1.5, true, false, true, 0, false
    );

    emitter.elasticity = 0.1;
    emitter.trailScale = 0.1;
    emitter.fadeRate = 0.1;

    return emitter;
}
export function makeMuzzleSmoke(pos, amount = 10, direction) {
    const emitter = new ParticleEmitter(
        pos, 0, 0.3, 0.2, amount, direction, // Use direction for the emission angle
        undefined,
        new Color(.1, .1, .1), new Color(0, 0, 0), // Bright yellow to orange color
        new Color(0.5, 0.5, 0.5, 0), new Color(0.5, 0.5, 0.5, 0), // Fade out to grey and transparent
        3, 0.5, 0.7, 0.2, 0.1, // Larger initial scale, fades out quickly
        0.5, 0.2, 0.5, Math.PI / 4, 0.2, // Small spread, rapid dissipation
        1.5, true, false, true, 0, false // Trail effect
    );

    emitter.elasticity = 0.05;
    emitter.trailScale = 0.01;
    emitter.fadeRate = 0.8; // Fade faster to make the effect shorter-lived

    return emitter;
}
export function makeExplosion(pos, amount = 10) {
    const emitter = new ParticleEmitter(
        pos, 0, 0.5, 0, amount, 2 * PI,
        undefined,
        new Color(1, 0.8, 0), new Color(1, 0.5, 0),
        new Color(1, 0, 0, 0), new Color(1, 0.5, 0, 0),
        0.5, 0.2, 1, 0.5, 0.2,
        0.9, 0.9, 0.5, 2 * PI, 0.05,
        0.3, false, true, 0
    );

    emitter.elasticity = 0.5;
    emitter.trailScale = 0.2;
    emitter.fadeRate = 0.05;


    return emitter;
}

export function makeWalkingDust(pos, amount = 1) {
    const emitter = new ParticleEmitter(
        pos, 0.3, 0.2, 0.35, amount, PI, // Small spread for walking effect
        undefined,
        new Color(0.5, 0.4, 0.3), new Color(0.6, 0.5, 0.4), // Dust colors
        new Color(0.5, 0.4, 0.3, 0), new Color(0.6, 0.5, 0.4, 0), // Fade-out colors
        0.2, 0.1, 0.5, 0.1, 0.02, // Particle life and size
        0.8, 0.7, 0.1, PI, 0.05, // Gravity and speed
        0.3, true, false, true, 0, false
    );

    emitter.elasticity = 0;
    emitter.trailScale = 3;
    emitter.fadeRate = 0.85;

    return emitter;
}
