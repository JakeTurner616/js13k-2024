import { player, stopSpawningZombies, startSpawningZombies } from './main.js';
import { getCurrency,  setCurrency } from './bullet.js';
import { mouseWasPressed, keyWasPressed, mousePosScreen, drawRect, drawTextScreen, hsl, vec2, mainCanvas } from './libs/littlejs.esm.min.js';

let inShop = false; // Private variable
let selectedItem = 0; // Private variable

export function isInShop() {
    return inShop;
}
const items = [
    { name: 'Shotgun', cost: 10 },
    { name: 'Machine Gun', cost: 10 },
    { name: 'Fire Ability', cost: 5 },
    { name: 'Ice Ability', cost: 5 }
];
export function setInShop(status) {
    inShop = status;
    if (status) {
        stopSpawningZombies();
    } else {
        startSpawningZombies();
    }
}

// Getter for selectedItem
export function getSelectedItem() {
    return selectedItem;
}

// Setter for selectedItem
export function setSelectedItem(index) {
    selectedItem = index;
}

export function handleShopMouseClick() {
    if (!mouseWasPressed(0)) {
        return;
    }

    const screenMousePos = mousePosScreen;

    const textPos = vec2(50, 50);
    const textSize = vec2(200, 50);

    if (screenMousePos.x >= textPos.x && screenMousePos.x <= textPos.x + textSize.x &&
        screenMousePos.y >= textPos.y && screenMousePos.y <= textPos.y + textSize.y) {

        if (!isInShop()) {
            //console.log('Entering shop...');
            enterShop();
        } else {
            //console.log('Exiting shop...');
            exitShop();
        }
    }
}

export function handleShopInput() {

    if (keyWasPressed('ArrowUp')) {
        setSelectedItem((getSelectedItem() - 1 + items.length) % items.length);
    }
    if (keyWasPressed('ArrowDown')) {
        setSelectedItem((getSelectedItem() + 1) % items.length);
    }
    if (keyWasPressed('Enter')) {
        buyItem(items[getSelectedItem()]);
    }
    if (keyWasPressed('Escape')) {
        exitShop();
    }
}

export function drawShop() {


    drawRect(vec2(mainCanvas.width / 2, mainCanvas.height / 2), vec2(300, 400), hsl(0, 0, .2), 10, hsl(0, 0, .5));

    items.forEach((item, index) => {
        const affordable = getCurrency() >= item.cost; // Use getCurrency() to get the current currency
        const textColor = affordable ? (index === getSelectedItem() ? hsl(0, 0, 1) : hsl(0, 0, 0.7)) : hsl(0, 0, 0.3);
        drawTextScreen(item.name + ' - ' + item.cost + ' currency', vec2(mainCanvas.width / 2, mainCanvas.height / 2 - 100 + index * 50), 30, textColor, 2, hsl(0, 0, 0));
    });

    drawTextScreen('Press Enter to buy, Esc to exit', vec2(mainCanvas.width / 2, mainCanvas.height / 2 + 150), 20, hsl(0, 0, 1), 2, hsl(0, 0, 0));
}

export function enterShop() {
    setInShop(true);
    handleShopInput();
}

export function exitShop() {
    //console.log('Exiting shop...');
    setInShop(false);
}

function buyItem(item) {
    if (getCurrency() >= item.cost) { // Use getCurrency() to get the current currency
        setCurrency(getCurrency() - item.cost); // Deduct the item cost from the currency
        player.addItem(item.name);
        exitShop();
    }
}