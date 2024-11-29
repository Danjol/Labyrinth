import Labyrinth from "./labyrint.mjs"
import ANSI from "./utils/ANSI.mjs";
import SplashScreen from "./splashScreen.mjs";
import KeyBoardManager from "./utils/KeyBoardManager.mjs";

const REFRESH_RATE = 250;

console.log(ANSI.RESET, ANSI.CLEAR_SCREEN, ANSI.HIDE_CURSOR);

let intervalID = null;
let isBlocked = false;
let state = null;
let paused = false;

function init() {
    const splash = new SplashScreen();
    splash.animate(() => {
        state = new Labyrinth();
        intervalID = setInterval(update, REFRESH_RATE);
    });
}

function update() {

    if (isBlocked) { return; }
    isBlocked = true;
    //#region core game loop
    if (KeyBoardManager.isPausePressed()) {
        
        if (paused) paused = false;
        else paused = true;
    }
    if (!paused) {
        state.update();
        state.draw(paused);
    } else {
        state.draw(paused);
    }
    //#endregion
    isBlocked = false;
}

init();