class SimplexNoise {
    constructor() {
        // Compress grad3 into a compact format
        this.grad3 = [0b110, 0b010, 0b100, 0b000, 0b101, 0b001, 0b111, 0b011, 0b110, 0b010, 0b100, 0b000];
        const p = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256));
        this.perm = Array.from({ length: 512 }, (_, i) => p[i & 255]);
    }

    // Decode compressed grad3 values into actual gradients
    decodeGrad3(val) {
        return [(val & 0b100) ? 1 : (val & 0b010) ? -1 : 0, (val & 0b001) ? 1 : (val & 0b010) ? -1 : 0, 0];
    }

    dot(g, x, y) {
        const grad = this.decodeGrad3(g);
        return grad[0] * x + grad[1] * y;
    }

    noise(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
        const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
        const t = (i + j) * G2, X0 = i - t, Y0 = j - t;
        const x0 = xin - X0, y0 = yin - Y0, i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i & 255, jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12, gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12, gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
        const t0 = 0.5 - x0 * x0 - y0 * y0, t1 = 0.5 - x1 * x1 - y1 * y1, t2 = 0.5 - x2 * x2 - y2 * y2;
        const n0 = t0 < 0 ? 0 : (t0 ** 4) * this.dot(gi0, x0, y0);
        const n1 = t1 < 0 ? 0 : (t1 ** 4) * this.dot(gi1, x1, y1);
        const n2 = t2 < 0 ? 0 : (t2 ** 4) * this.dot(gi2, x2, y2);
        return 70 * (n0 + n1 + n2);
    }
}

export function generateBiomeMap(canvas, thresholds) {
    const { desertThreshold, shallowTerrianThreshold, deepTerrianThreshold, mountainThreshold, snowThreshold, noiseScale } = thresholds;
    const { width, height } = canvas, context = canvas.getContext('2d');
    const simplex = new SimplexNoise(), imageData = context.createImageData(width, height), data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const elevation = simplex.noise((x / width) * noiseScale, (y / height) * noiseScale);
            let r, g, b;

            if (elevation < deepTerrianThreshold) {
                [r, g, b] = interpolateColor([101, 67, 33], [139, 69, 19], normalize(elevation, deepTerrianThreshold, shallowTerrianThreshold));
            } else if (elevation < shallowTerrianThreshold) {
                [r, g, b] = interpolateColor([139, 69, 19], [160, 82, 45], normalize(elevation, shallowTerrianThreshold, desertThreshold));
            }else if (elevation < snowThreshold) {
                [r, g, b] = interpolateColor([139, 69, 19], [160, 160, 160], normalize(elevation, mountainThreshold, snowThreshold));
            } else {
                [r, g, b] = interpolateColor([160, 160, 160], [255, 255, 255], normalize(elevation, snowThreshold, 1));
            }

            const idx = (x + y * width) * 4;
            [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]] = [r, g, b, 255];
        }
    }
    context.putImageData(imageData, 0, 0);
}

function interpolateColor(c1, c2, factor) {
    return c1.map((c, i) => Math.round(c + factor * (c2[i] - c)));
}

function normalize(value, min, max) {
    return (value - min) / (max - min);
}