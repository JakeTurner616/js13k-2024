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

export function makeIce(pos, amount = 20) {
    const emitter = new ParticleEmitter(
        pos, 0, 0.5, 0, amount, 2 * PI,
        undefined,
        new Color(0, 0.5, 1), new Color(0, 0.25, 1),
        new Color(0, 0, 1, 0), new Color(0, 0, 1, 0),
        2, 0.2, 0.5, 0.3, 0.05,
        0.9, 0.9, 0.3, PI, 0.1,
        1.5, false, true, 0
    );

    emitter.elasticity = 0.5;
    emitter.trailScale = 0.2;
    emitter.fadeRate = 0.05;

    return emitter;
}
