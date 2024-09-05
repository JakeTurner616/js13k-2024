class SimplexNoise {
    constructor() {
        this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
        let p = new Array(256).fill(0).map(() => Math.floor(Math.random() * 256));
        this.perm = new Array(512).fill(0).map((_, i) => p[i & 255]);
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    noise(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0), G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        let s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
        let X0 = i - t, Y0 = j - t, x0 = xin - X0, y0 = yin - Y0;
        let i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
        let x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1.0 + 2.0 * G2, y2 = y0 - 1.0 + 2.0 * G2;
        let ii = i & 255, jj = j & 255;
        let gi0 = this.perm[ii + this.perm[jj]] % 12, gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12, gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
        let t0 = 0.5 - x0 * x0 - y0 * y0, n0 = t0 < 0 ? 0.0 : (t0 *= t0) * t0 * this.dot(this.grad3[gi0], x0, y0);
        let t1 = 0.5 - x1 * x1 - y1 * y1, n1 = t1 < 0 ? 0.0 : (t1 *= t1) * t1 * this.dot(this.grad3[gi1], x1, y1);
        let t2 = 0.5 - x2 * x2 - y2 * y2, n2 = t2 < 0 ? 0.0 : (t2 *= t2) * t2 * this.dot(this.grad3[gi2], x2, y2);
        return 70.0 * (n0 + n1 + n2);
    }
}

export function generateBiomeMap(canvas, { desertThreshold, shallowTerrianThreshold, deepTerrianThreshold, grassThreshold, mountainThreshold, snowThreshold, noiseScale }) {
    const { width, height } = canvas, context = canvas.getContext('2d'), simplex = new SimplexNoise(), imageData = context.createImageData(width, height), data = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const nx = x / width, ny = y / height, elevation = simplex.noise(nx * noiseScale, ny * noiseScale);
            let r, g, b;
            if (elevation < deepTerrianThreshold) [r, g, b] = interpolateColor([101, 67, 33], [139, 69, 19], (elevation - deepTerrianThreshold) / (shallowTerrianThreshold - deepTerrianThreshold));
            else if (elevation < shallowTerrianThreshold) [r, g, b] = interpolateColor([139, 69, 19], [160, 82, 45], (elevation - shallowTerrianThreshold) / (desertThreshold - shallowTerrianThreshold));
            else if (elevation < desertThreshold) [r, g, b] = interpolateColor([238, 214, 175], [245, 222, 179], (elevation - desertThreshold) / (grassThreshold - desertThreshold));
            else if (elevation < grassThreshold) {
                const midGrassThreshold = (grassThreshold + mountainThreshold) / 2;
                if (elevation < midGrassThreshold) [r, g, b] = interpolateColor([34, 139, 34], [50, 160, 50], (elevation - desertThreshold) / (midGrassThreshold - desertThreshold));
                else[r, g, b] = interpolateColor([50, 160, 50], [85, 170, 85], (elevation - midGrassThreshold) / (mountainThreshold - midGrassThreshold));
            } else if (elevation < mountainThreshold) [r, g, b] = interpolateColor([85, 170, 85], [139, 69, 19], (elevation - grassThreshold) / (mountainThreshold - grassThreshold));
            else if (elevation < snowThreshold) [r, g, b] = interpolateColor([139, 69, 19], [160, 160, 160], (elevation - mountainThreshold) / (snowThreshold - mountainThreshold));
            else[r, g, b] = interpolateColor([160, 160, 160], [255, 255, 255], (elevation - snowThreshold) / (1 - snowThreshold));
            const index = (x + y * width) * 4;
            data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
        }
    }
    context.putImageData(imageData, 0, 0);
}

function interpolateColor(c1, c2, f) {
    return c1.map((c, i) => Math.round(c + f * (c2[i] - c)));
}