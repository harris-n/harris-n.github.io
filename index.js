/* ##########################################################################################
GLOBAL CONSTANTS AND VARIABLES
########################################################################################## */

// DOM Elements
const gridDiv = document.getElementById('grid-div');
const resetButton = document.getElementById('reset-button');
const timerTextbox = document.getElementById("timer-textbox");
const sizeSlider = document.getElementById('size-input');
const gridRowInput = document.getElementById('row-dim-input');
const gridColInput = document.getElementById('col-dim-input');
const headerDiv = document.getElementById("header-div");
const puzzleModal = document.getElementById('puzzle-dialog');

// Game State
let currentPuzzle = null;
let intervalIds = [];
let elapsedTime = 0;

// Modal Content
const START_MODAL_CONTENT = "Click anywhere to start the puzzle!";
const END_MODAL_CONTENT = (rowNum, colNum, time) => `
    <div class="modal-content">
        Grid Size: ${rowNum} x ${colNum}<br>Time: ${time}
        <button class="close-button">Close</button>
    </div>`;

// Tile Configuration
const tileDictionary = {
    'true,false,false,false':  {type: 'end',          rotation: 0},
    'false,true,false,false':  {type: 'end',          rotation: 1},
    'false,false,true,false':  {type: 'end',          rotation: 2},
    'false,false,false,true':  {type: 'end',          rotation: 3},
    'true,false,true,false':   {type: 'straight',     rotation: 0},
    'false,true,false,true':   {type: 'straight',     rotation: 1},
    'true,false,false,true':   {type: 'curved',       rotation: 0},
    'true,true,false,false':   {type: 'curved',       rotation: 1},
    'false,true,true,false':   {type: 'curved',       rotation: 2},
    'false,false,true,true':   {type: 'curved',       rotation: 3},
    'true,true,false,true':    {type: 'intersection', rotation: 0},
    'true,true,true,false':    {type: 'intersection', rotation: 1},
    'false,true,true,true':    {type: 'intersection', rotation: 2},
    'true,false,true,true':    {type: 'intersection', rotation: 3},
}

/* ##########################################################################################
EVENT LISTENERS
########################################################################################## */

// Window and UI Events
window.addEventListener('resize', adjustDivSize);
window.addEventListener('load', () => {
    gridDiv.style.width = '60vmin';
    gridDiv.style.height = '60vmin';
});

// User Input Events
sizeSlider.addEventListener("input", adjustDivSize);
resetButton.addEventListener("mouseup", () => {
    const rowDim = gridRowInput.value;
    const colDim = gridColInput.value;

    while (gridDiv.firstChild) {
        gridDiv.removeChild(gridDiv.firstChild);
    }
    
    if (currentPuzzle !== null) {
        currentPuzzle.stopTimer();
        elapsedTime = 0;
    }

    currentPuzzle = new puzzle(rowDim, colDim);
    adjustDivSize();
    timerTextbox.textContent = "00:00";
    puzzleModal.textContent = START_MODAL_CONTENT;
    puzzleModal.showModal();
});

/* ##########################################################################################
CLASS DEFINITIONS
########################################################################################## */

class MersenneTwister {
    constructor(seed) {
      this.state = new Array(624);
      this.index = 0;
      this.initialize(seed);
    }
  
    initialize(seed) {
      this.state[0] = seed >>> 0;
      for (let i = 1; i < 624; i++) {
        let s = this.state[i - 1] ^ (this.state[i - 1] >>> 30);
        this.state[i] = ((0x6c078965 * s) + i) >>> 0;
      }
    }
  
    twist() {
      for (let i = 0; i < 624; i++) {
        let y = (this.state[i] & 0x80000000) + (this.state[(i + 1) % 624] & 0x7fffffff);
        this.state[i] = this.state[(i + 397) % 624] ^ (y >>> 1);
        if (y % 2 !== 0) {
          this.state[i] ^= 0x9908b0df;
        }
      }
      this.index = 0;
    }
  
    extract() {
      if (this.index === 0) {
        this.twist();
      }
      let y = this.state[this.index];
      y ^= (y >>> 11);
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= (y >>> 18);
      this.index = (this.index + 1) % 624;
      return y >>> 0;
    }
  
    next() {
      return this.extract() % 4;
    }
}
  
/* ##########################################################################################
PUZZLE AND TILE LOGIC
########################################################################################## */

class tile {
    constructor(rowNum, colNum, puzzle) {
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.connections = [false, false, false, false];
        this.visited = false;
        this.type;
        this.solRotation = 0;
        this.addedRotation = 0;
        this.currentRotation = 0;
        this.timesClicked = 0;
        this.div;
        this.puzzle = puzzle;
    }

    render(puzzle) {
        const div = document.createElement('div');
        div.id = `${this.rowNum},${this.colNum}`;
        div.className = 'grid-tile';
        div.addEventListener('mousedown', () => this.rotateTile());

        // Find tile type
        let tileType = tileDictionary[this.connections.join(',')]
        this.type = tileType.type;
        this.solRotation = tileType.rotation;
        this.currentRotation += tileType.rotation;

        div.style.backgroundImage = `url(sprite/${this.type}-pipe.png)`;

        // Add random rotation
        var rndNum = puzzle.rng.next();

        if (this.type !== 'straight') {
            this.addedRotation = rndNum;
            this.currentRotation += rndNum; 
            puzzle.minMoves += (4 - rndNum) % 4;
        } else {
            this.addedRotation = rndNum % 2;
            this.currentRotation += rndNum % 2;
            puzzle.minMoves += (4 - rndNum) % 2;
        }

        div.style.transform = `rotate(${this.currentRotation*90}deg)`;
        this.div = div;

        return div;
    }

    chooseNeighbour() {
        let neighbours = [];

        let i = this.rowNum;
        let j = this.colNum;

        if (i - 1 > -1 && !this.puzzle.gridTiles[i-1][j].visited) {
            neighbours.push(this.puzzle.gridTiles[i-1][j]);
        }
        if (j + 1 < this.puzzle.colNum && !this.puzzle.gridTiles[i][j + 1].visited) {
            neighbours.push(this.puzzle.gridTiles[i][j + 1]);
        }
        if (i + 1 < this.puzzle.rowNum && !this.puzzle.gridTiles[i+1][j].visited) {
            neighbours.push(this.puzzle.gridTiles[i+1][j]);
        }
        if (j - 1 > -1 && !this.puzzle.gridTiles[i][j-1].visited) {
            neighbours.push(this.puzzle.gridTiles[i][j-1]);
        }


        if (neighbours.length > 0) {
            let rndNeighbour = this.puzzle.rng.next() % neighbours.length;
            return neighbours[rndNeighbour];
        } else {
            return undefined;
        }
    }

    addConnection(nextTile) {
        let di = this.rowNum - nextTile.rowNum;
        let dj = this.colNum - nextTile.colNum;
        
        if (di == -1) {
            // current tile is above next tile
            this.connections[2] = true;
            nextTile.connections[0] = true;
        } else if  (di == 1) {
            // current tile is below next tile
            this.connections[0] = true;
            nextTile.connections[2] = true;
        } else if (dj == -1) {
            // current tile is left of the next tile
            this.connections[1] = true;
            nextTile.connections[3] = true;
        } else if (dj == 1) {
            // current tile is right of the next tile
            this.connections[3] = true;
            nextTile.connections[1] = true;
        }
    }


    rotateTile(){

        if (this.puzzle.timeTaken > 0) {
            return
        }

        this.timesClicked += 1;

        if (this.type !== 'straight') {
            this.currentRotation = (this.currentRotation + 1) % 4;
        } else {
            this.currentRotation = (this.currentRotation + 1) % 2;
        }
        
        this.div.style.transform = `rotate(${this.currentRotation*90}deg)`;

        this.puzzle.checkGrid();
    }
}


class puzzle {
    constructor(rowNum, colNum, seed = 0) {
        this.rowNum = rowNum
        this.colNum = colNum
        this.gridTiles = this.generateGrid(rowNum, colNum);    
        this.rng = this.generateRNG(seed);
        this.minMoves = 0;
        this.startTime = null;
        this.finishTime = null;
        this.timer = null;
        this.timeTaken = 0;
        this.puzzleModal = document.getElementById('puzzle-dialog');
        this.startPuzzleHandler = this.startPuzzle.bind(this);
        
        this.generatePuzzle();
        this.puzzleDiv = this.render();
    }

    generatePuzzle() {
        // Start from a random tile
        const startRow = this.rng.next();
        const startCol = this.rng.next();
        let currentTile = this.gridTiles[startRow][startCol];
        const stackTiles = [];

        // DFS maze generation
        while (true) {
            currentTile.visited = true;
            const nextTile = currentTile.chooseNeighbour();

            if (nextTile) {
                nextTile.visited = true;
                stackTiles.push(currentTile);
                currentTile.addConnection(nextTile);
                currentTile = nextTile;
            } else if (stackTiles.length > 0) {
                // Backtrack until we find a tile with unvisited neighbors
                while (stackTiles.length > 0 && this.checkFourway(stackTiles)) {
                    stackTiles.pop();
                }
                if (stackTiles.length === 0) break;
                currentTile = stackTiles.pop();
            } else {
                break;
            }
        }
    }

    checkFourway(stackTiles) {
        if (!stackTiles.length) return false;
        
        const lastStackTile = stackTiles[stackTiles.length - 1];
        const trueCount = lastStackTile.connections.filter(conn => conn).length;
        return trueCount >= 3;
    }

    generateRNG(seed) {
        const finalSeed = seed === 0 ? Math.round(Math.random() * 10000000) : seed;
        console.log(`Using seed: ${finalSeed}`);
        return new MersenneTwister(finalSeed);
    }

    generateGrid(rowNum, colNum) {
        return Array.from({ length: rowNum }, (_, i) => 
            Array.from({ length: colNum }, (_, j) => new tile(i, j, this))
        );
    }

    render() {
        this.gridTiles.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';

            row.forEach(tile => {
                const tileDiv = tile.render(this);
                rowDiv.appendChild(tileDiv);
            });
            gridDiv.appendChild(rowDiv);
        });

        this.puzzleModal.removeEventListener("mousedown", this.startPuzzleHandler);
        this.puzzleModal.addEventListener("mousedown", this.startPuzzleHandler);

        return gridDiv;
    }

    startPuzzle() {
        if (this.timeTaken === 0) {
            this.startTime = Date.now();
            this.startTimer();
            this.puzzleModal.close();
        }
    }

    checkGrid() {
        const totalTiles = this.rowNum * this.colNum;
        const correctTiles = this.gridTiles.flat().filter(tile => 
            tile.currentRotation === tile.solRotation
        ).length;

        if (correctTiles === totalTiles) {
            this.stopTimer();
            this.showResults();
        }
    }

    startTimer() {
        this.stopTimer();
        
        timerTextbox.textContent = "00:00";
        elapsedTime = 0;
        
        this.timer = setInterval(() => this.updateTime(), 500);
        intervalIds.push(this.timer);
    }

    stopTimer() {
        intervalIds.forEach((id) => {
            clearInterval(id);
        });
        intervalIds = []; 
    }

    updateTime() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }

        const currentTime = Date.now();
        elapsedTime = currentTime - this.startTime;

        const minutes = Math.floor(elapsedTime / (1000 * 60));
        const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
        
        timerTextbox.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    showResults() {
        this.puzzleModal.showModal();
        this.finishTime = Date.now();
        this.timeTaken = this.finishTime - this.startTime;

        const minutes = Math.floor(this.timeTaken / (1000 * 60));
        const seconds = Math.floor((this.timeTaken % (1000 * 60)) / 1000);
        const milliseconds = Math.floor(this.timeTaken % 1000);
        
        const timeString = minutes > 0 
            ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
            : `${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
        
        this.puzzleModal.innerHTML = END_MODAL_CONTENT(this.rowNum, this.colNum, timeString);
        
        // Add event listener to the close button
        const closeButton = this.puzzleModal.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.puzzleModal.close());
    }
}

function adjustDivSize() {
    gridDiv.style.width = 'auto';
    gridDiv.style.height = 'auto';

    const rowDim = gridRowInput.value;
    const colDim = gridColInput.value;

    const winHeight = Math.round(window.innerHeight * (sizeSlider.value/100) / colDim);
    const winWidth = Math.round(window.innerWidth * (sizeSlider.value/100) / rowDim);

    const tileSize = Math.min(winWidth, winHeight);
    
    const gridTiles = document.querySelectorAll('div.grid-tile');

    gridTiles.forEach((gridTile) => {
        gridTile.style.height = `${tileSize}`;
        gridTile.style.window = `${tileSize}`;
    });

    const puzzleRect = gridDiv.getBoundingClientRect();

    puzzleModal.style.width = `${puzzleRect.width}px`;
    puzzleModal.style.height = `${puzzleRect.height}px`;
    puzzleModal.style.top = `${puzzleRect.top}px`;
    puzzleModal.style.left = `${puzzleRect.left}px`;
}