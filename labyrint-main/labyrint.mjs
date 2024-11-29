/* The teleportation is a bit unstable, i struggled a bit with changing player position in a reliable manner. (pro tip: spam upwards while under the teleport)

TASKS DONE:
** The starting level has an empty slot in the surrounding wall. This slot should function as a door into the level called "aSharpPlace." Implement the door functionality so that the player can proceed to the next level.  
** Create a new level (a third level) and link the unused door in "aSharpPlace" to exit into the new room.  
** In "aSharpPlace," implement teleport functionality for the "♨︎" symbols. Entering one should move the player to the other.  
** Ensure that when going back through a door, the player returns to the correct room.  
** Make the X NPC characters perform a simple patrol (+/-2 from their starting locations).  
** Create an animated splash screen (this was a group assignment from a previous week) using `splashScreen.mjs`.  

* Implemented the possibilty to pause the game.

*/
import ANSI from "./utils/ANSI.mjs";
import KeyBoardManager from "./utils/KeyBoardManager.mjs";
import { readMapFile, readRecordFile } from "./utils/fileHelpers.mjs";
import * as CONST from "./constants.mjs";

const startingLevel = CONST.START_LEVEL_ID;
const levels = loadLevelListings();
const levelHistory = [];
const DOOR_MAPPINGS = {
    "start": { 
        "D": { targetRoom: "aSharpPlace", targetDoor: "D" }
    },
    "aSharpPlace": { 
        "D": { targetRoom: "start", targetDoor: "D" },
        "C": { targetRoom: "thirdroom", targetDoor: "C"}
    },
    "thirdroom": {
        "C": { targetRoom: "aSharpPlace", targetDoor: "C" } 
    }
};

const EMPTY = " ";
const HERO = "H";
const LOOT = "$";

const THINGS = [LOOT, EMPTY];
const HP_MAX = 10;

const playerStats = {
    hp: 8,
    chash: 0
};

let isDirty = true;
let playerPos = { row: null, col: null };

function loadLevelListings(source = CONST.LEVEL_LISTING_FILE) {
    let data = readRecordFile(source);
    let levels = {};
    for (const item of data) {
        let keyValue = item.split(":");
        if (keyValue.length >= 2) {
            let key = keyValue[0];
            let value = keyValue[1];
            levels[key] = value;
        }
    }
    return levels;
}

class Labyrinth {
    constructor() {
        this.npcs = [];
        this.lastDoorSymbol = null;
        this.loadLevel(startingLevel);
    }

    loadLevel(levelID, fromDoor = null) {
        if (levels[levelID] == null) {
            console.error(`Level ${levelID} not found!`);
            return;
        }

        if (this.levelID) {
            const currentDoor = this.level[playerPos.row][playerPos.col];
            levelHistory.push({
                levelID: this.levelID,
                playerPos: { ...playerPos },
                lastDoor: currentDoor
            });
        }

        this.levelID = levelID;
        this.level = readMapFile(levels[levelID]);
        this.pauseScreen = readMapFile(levels["pauseScreen"]);
        
        if (levelID === "start") {
            this.npcs = [];
            const startingRow = 5;
            const startingCol = 4;
            this.level[startingRow][startingCol] = HERO;
            playerPos.row = startingRow;
            playerPos.col = startingCol;
            
            
        } else if (levelID === "aSharpPlace") {
            this.npcs = [
                {row: 9, col: 20, direction: 1, horizontal: true},
                {row: 10, col: 21, direction: 1, horizontal: true},
                {row: 11, col: 20, direction: 1, horizontal: true},
                {row: 2, col: 29, direction: 1, horizontal: false},
                {row: 5, col: 31, direction: -1, horizontal: false},

            ];
        } else if (levelID === "thirdroom") {
            this.npcs = [];
        }
        if (fromDoor) {
            const doorLocation = this.findSymbol(fromDoor);
            if (doorLocation) {
                this.level[doorLocation.row][doorLocation.col] = HERO;
                playerPos.row = doorLocation.row;
                playerPos.col = doorLocation.col;
            }
        } 
        isDirty = true;
    }


    findSecondTeleport(tRow, tCol) {
        for (let row = 0; row < this.level.length; row++) {
            for (let col = 0; col < this.level[row].length; col++) {
                if (this.level[row][col] === "\u2668" &&(row !== tRow && col !== tCol)) {
                    return { row: row, col: col };
                }
            }
        }
        return null;
    }

    update() {
        let drow = 0;
        let dcol = 0;
        let eventText = "";

        if (KeyBoardManager.isUpPressed()) drow = -1;
        else if (KeyBoardManager.isDownPressed()) drow = 1;

        if (KeyBoardManager.isLeftPressed()) dcol = -1;
        else if (KeyBoardManager.isRightPressed()) dcol = 1;

        let tRow = playerPos.row + drow;
        let tCol = playerPos.col + dcol;

        if (tRow < 0 || tCol < 0 || tRow >= this.level.length || tCol >= this.level[0].length) return;

        const targetCell = this.level[tRow][tCol];

        if (targetCell === EMPTY || THINGS.includes(targetCell)) {
            if (targetCell === LOOT) {
                let loot = Math.round(Math.random() * 7) + 3;
                playerStats.chash += loot;
                eventText = `Player gained ${loot}$`;
            }

            if (this.level[playerPos.row][playerPos.col] === HERO && this.lastDoorSymbol) {
                this.level[playerPos.row][playerPos.col] = this.lastDoorSymbol;
                this.lastDoorSymbol = null;
            } else {
                this.level[playerPos.row][playerPos.col] = EMPTY;
            }

            this.level[tRow][tCol] = HERO;
            playerPos.row = tRow;
            playerPos.col = tCol;

            isDirty = true;
        } else if (targetCell === "D" || targetCell === "C") {
            const currentRoom = this.levelID;
            const doorMapping = DOOR_MAPPINGS[currentRoom][targetCell];

            if (doorMapping) {
                this.lastDoorSymbol = targetCell;
                this.loadLevel(doorMapping.targetRoom, doorMapping.targetDoor);
            }
        } else if (targetCell === "\u2668") {
            this.level[playerPos.row][playerPos.col] = " ";
            const otherTeleport = this.findSecondTeleport(tRow, tCol);
            if (otherTeleport) {
                playerPos.row = otherTeleport.row;
                playerPos.col = otherTeleport.col;
                this.level[tRow][tCol] = "\u2668";
                eventText = "Teleported!";
            } else {
                this.level[playerPos.row][playerPos.col] = HERO;
            }
        }


        // NPC Patrol Logic
        this.npcs.forEach((npc) => {
            if (npc.horizontal) { 
                let nextCol = npc.col + npc.direction;
                if ( 
                    nextCol < 0 ||
                    nextCol >= this.level[0].length ||
                    this.level[npc.row][nextCol] !== EMPTY
                ) {
                    npc.direction *= -1;
                } else {
                this.level[npc.row][npc.col] = EMPTY;
                npc.col += npc.direction;
                this.level[npc.row][npc.col] = "X";
                
            } 
         } else { 
            let nextRow = npc.row + npc.direction;
        if (
            nextRow < 0 ||
            nextRow >= this.level.length ||
            this.level[nextRow][npc.col] !== EMPTY
        ) {
            npc.direction *= -1;
        } else {
            this.level[npc.row][npc.col] = EMPTY;
            npc.row += npc.direction;
            this.level[npc.row][npc.col] = "X";
            
        }}
    });

        isDirty = true;
    }

    draw(paused) {
        if (!isDirty) return;

        isDirty = false;

        console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME);

        let rendering = "";
        if (!paused) {
            rendering += this.renderHud();

            for (let row = 0; row < this.level.length; row++) {
                let rowRendering = "";
                for (let col = 0; col < this.level[row].length; col++) {
                    rowRendering += this.level[row][col];
                }
                rendering += rowRendering + "\n";
            } console.log(rendering);
        } else {
            rendering += this.renderHud();

            for (let row = 0; row < this.pauseScreen.length; row++) {
                let rowRendering = "";
                for (let col = 0; col < this.pauseScreen[row].length; col++) {
                    rowRendering += this.pauseScreen[row][col];
                }
                rendering += rowRendering + "\n";
            } console.log(rendering);
        }

        
    }

    renderHud() {
        let hpBar = `Life:[${"♥︎".repeat(playerStats.hp)}${" ".repeat(HP_MAX - playerStats.hp)}] `;
        let cash = `$:${playerStats.chash}`;
        return `${hpBar} ${cash}\n`;
    }

    findSymbol(symbol) {
        for (let row = 0; row < this.level.length; row++) {
            for (let col = 0; col < this.level[row].length; col++) {
                if (this.level[row][col] === symbol) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}

export default Labyrinth;
