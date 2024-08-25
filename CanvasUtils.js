//CanvasUtils.js
import { gameSettings } from './main.js'; 
import { } from './libs/littlejs.esm.min.js';
// Wrap biomeCanvas in an object
export const canvasState = {
    biomeCanvas: null
};

export function setupBiomeCanvas() {
    if (!canvasState.biomeCanvas) {
        // Initialize biomeCanvas if it hasn't been already
        canvasState.biomeCanvas = document.createElement('canvas'); // pseudo canvas
        canvasState.biomeCanvas.width = window.innerWidth;
        canvasState.biomeCanvas.height = window.innerHeight;
        canvasState.biomeCanvas.style.display = 'none';
        document.body.appendChild(canvasState.biomeCanvas);
    }
}

export function adjustCanvasSize() { // Stretch map texture across canvas
    const pixelRatio = window.devicePixelRatio || 1;
    gameSettings.mapCanvas.width = window.innerWidth;
    gameSettings.mapCanvas.height = window.innerHeight;
    
    console.log('Canvas size adjusted:', gameSettings.mapCanvas.width, gameSettings.mapCanvas.height);
}