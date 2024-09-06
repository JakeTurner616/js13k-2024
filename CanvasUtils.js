import { gameSettings } from './main.js'; 

export const canvasState = { biomeCanvas: null };

export function setupBiomeCanvas() {
    if (!canvasState.biomeCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        canvasState.biomeCanvas = canvas;
    }
}

export function adjustCanvasSize() {
    const { mapCanvas } = gameSettings;
    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
}