/*
 * Name          : joy.js
 * @original-author : Roberto D'Amico (Bobboteck)
 * Last modified : 09.07.2024
 * Modified by   : Jakob Turner (https://github.com/JakeTurner616/js13k-2024)
 *
 * Description of Modifications:
 * - Added support for a second joystick (StickStatus2) to handle dual joystick functionality.
 * - Refactored the code to include only the necessary logic for joystick functionality.
 * - Removed support for cardinal direction and other features not needed for this version.
 *
 * The original MIT License applies to this file:
 * 
 * The MIT License (MIT)
 *
 * This file is part of the JoyStick Project (https://github.com/bobboteck/JoyStick).
 * Copyright (c) 2015 Roberto D'Amico (Bobboteck).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export let StickStatus = { x: 0, y: 0 };
export let StickStatus2 = { x: 0, y: 0 };
const color = "rgba(0, 170, 0, 0.5)";

export class JoyStick {
    constructor(container, params = {}, cb = () => {}) {
        this.title = params.title || "joystick";
        this.internalFillColor = params.internalFillColor || color;
        this.lineWidth = params.internalLineWidth || 2;
        this.strokeColor = params.externalStrokeColor || color;
        this.autoCenter = true;
        this.cb = cb;

        const objContainer = document.getElementById(container);
        objContainer.style.touchAction = "none";
        this.canvas = document.createElement("canvas");
        this.canvas.id = this.title;
        this.canvas.width = params.width || objContainer.clientWidth;
        this.canvas.height = params.height || objContainer.clientHeight;
        objContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.pressed = 0;
        this.internalRadius = (this.canvas.width / 2 - 10) / 2;
        this.maxMoveStick = this.internalRadius + 5;
        this.externalRadius = this.internalRadius + 30;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.movedX = this.centerX;
        this.movedY = this.centerY;

        const isTouch = "ontouchstart" in document.documentElement;
        if (isTouch) {
            this.canvas.addEventListener("touchstart", this.start.bind(this), false);
            document.addEventListener("touchmove", this.move.bind(this), false);
            document.addEventListener("touchend", this.end.bind(this), false);
        } else {
            document.addEventListener("mouseup", this.end.bind(this), false);
        }

        this.draw();
    }

    draw() {
        const { ctx, centerX, centerY, externalRadius, internalRadius, movedX, movedY, lineWidth, strokeColor, internalFillColor } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.lineWidth = lineWidth;

        // Draw external
        ctx.beginPath();
        ctx.arc(centerX, centerY, externalRadius, 0, Math.PI * 2, false);
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // Draw internal
        ctx.beginPath();
        ctx.arc(movedX, movedY, internalRadius, 0, Math.PI * 2, false);
        ctx.fillStyle = internalFillColor;
        ctx.fill();
    }

    start(e) {
        this.pressed = 1;
        this.touchId = e.targetTouches ? e.targetTouches[0].identifier : null;
    }

    move(e) {
        if (!this.pressed) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.targetTouches ? e.targetTouches[0].clientX : e.clientX;
        const y = e.targetTouches ? e.targetTouches[0].clientY : e.clientY;
        this.movedX = x - rect.left;
        this.movedY = y - rect.top;

        const deltaX = this.movedX - this.centerX;
        const deltaY = this.movedY - this.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.maxMoveStick) {
            const ratio = this.maxMoveStick / distance;
            this.movedX = this.centerX + deltaX * ratio;
            this.movedY = this.centerY + deltaY * ratio;
        }

        this.updateStatus();
    }

    end(e) {
        if (e.changedTouches && e.changedTouches[0].identifier !== this.touchId) return;
        this.pressed = 0;
        if (this.autoCenter) {
            this.movedX = this.centerX;
            this.movedY = this.centerY;
        }
        this.updateStatus();
    }

    updateStatus() {
        const { centerX, centerY, maxMoveStick, movedX, movedY, title } = this;
        const normalizedX = (movedX - centerX) / maxMoveStick;
        const normalizedY = -(movedY - centerY) / maxMoveStick;

        const status = title === "joystick2" ? StickStatus2 : StickStatus;
        status.x = normalizedX * 100;  // Range between -100 and 100
        status.y = normalizedY * 100;

        this.cb(status);
        this.draw();
    }
}