// Make grid
const resetButton = document.getElementById('reset-button');
const gridDiv = document.getElementById('grid-div');

const timerTextbox = document.getElementById("timer-textbox");

// RNG seed thing

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
ADJUSTING SETTINGS
########################################################################################## */
const gridTiles = document.querySelectorAll('.grid-tile');
var totalMoves = 0;
var minMoves = 0;

gridTiles.forEach(gridTile => {
    gridTile.addEventListener('mousedown', () => {
        const coords = gridTile.id.split(/,/);
        var i = coords[0];
        var j = coords[1];
        document.getElementById(`${i},${j}`).style.transform = `rotate(${(grid[i][j].currentRotation+1)*90}deg)`;        
        if (grid[i][j].type !== 'straight') {
            grid[i][j].currentRotation = (grid[i][j].currentRotation + 1) % 4;
        } else {
            grid[i][j].currentRotation = (grid[i][j].currentRotation + 1) % 2;
        }

        totalMoves++;
        checkGrid();
    })
});

var completeTiles = 0;
var timeEnded;
var efficencyRate;
const overlayMessage = document.getElementById('overlay-message');

function checkGrid() {
    completeTiles = 0;
    grid.flat().forEach(tile => {
        if (tile.currentRotation == tile.solRotation) {
            completeTiles++;
        }
    });

    if (completeTiles == gridSize**2) {
        gameStart = false;
        timeEnded = Date.now();

        timeTaken = (timeEnded - timeStarted) / 1000;

        gridOverlay.style.display = 'block';

        efficencyRate = minMoves/totalMoves * 100
        efficencyRate = efficencyRate.toFixed(2);

        copyResultsButton.style.display = 'flex';
        overlayMessage.textContent = `Finished!
Time Taken: ${timeTaken}s
Moves Taken: ${totalMoves}/${minMoves}
Move Efficency: ${efficencyRate}%`;

        if (efficencyRate == 100){
            overlayMessage.textContent += " Perfect!";
        }
        // URGENT update personal best
        updatePersonalBest(timeTaken);
    }

}

/*
Finished!
Time Taken: ${timeTaken}
Moves Taken: ${totalMoves}${minMoves}
Move Efficency: ${efficencyRate}%
*/

const gridRowInput = document.getElementById('row-dim-input');
const gridColInput = document.getElementById('col-dim-input');
  
  
/* ##########################################################################################
CREATING THE PUZZLE
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
        div.addEventListener('mousedown', (event) => this.rotateTile(event));

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
        this.finishTime;
        this.timer;
        this.timeTaken = 0;
        this.puzzleModal = document.getElementById('puzzle-dialog');
        this.generatePuzzle();
        this.render();
    }

    generatePuzzle() {
        // DFS maze generation method
        var currentTile = this.gridTiles[this.rng.next()][this.rng.next()];
        var stackTiles = [];
        var finishGenerating = false; 

        while (!finishGenerating) {
            currentTile.visited = true;
            var nextTile = currentTile.chooseNeighbour();

            if (nextTile) {
                nextTile.visited = true;
                stackTiles.push(currentTile);
                currentTile.addConnection(nextTile);
                currentTile = nextTile;
            } else if (stackTiles.length > 0) {
                while (this.checkFourway(stackTiles)) {
                    stackTiles.pop();
                }
                currentTile = stackTiles.pop();
            } else {
                finishGenerating = true;
            }   
        }
    }

    checkFourway(stackTiles) {
        var trueCount = 0;
        var lastStackTile = stackTiles[stackTiles.length-1];
     
        for (let i = 0; i < 4; i++) {
            if (lastStackTile.connections[i] == true) {
                trueCount++;
            }
        }
        if (trueCount >= 3) {
            return true;
        } 
        return false;
    }

    generateRNG(seed) {
        if (seed == 0) {
            seed = Math.round(Math.random() * 10000000);
        }

        console.log(seed)
        let mt = new MersenneTwister(seed);
        return mt;
    }

    generateGrid(rowNum, colNum) {
        let grid = [];
        for (let i = 0; i < rowNum; i++) {
            let row = [];
            for (let j = 0; j < colNum; j++) {
                row.push(new tile(i,j, this));
            }
            grid.push(row);
        }
        return grid;
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


        this.puzzleModal.addEventListener("mousedown", () => {

            if (this.timeTaken == 0) {
                this.startTime = Date.now();
                this.startTimer()    
            }

            this.puzzleModal.close();
        });

    }

    checkGrid() {

        correctTiles = 0;

        this.gridTiles.forEach(element => {
            element.forEach((element) => {
                if (element.currentRotation == element.solRotation) {
                    correctTiles += 1;
                }
            })
          
        });

        if (correctTiles == (this.rowNum * this.colNum)) {
            console.log(this); 
        
            this.showResults();
        }
    }

    startTimer() {
        this.timer = setInterval(this.updateTime, 1);
    }

    updateTime() {

        if (this.startTime == null) {
            this.startTime = Date.now();
        }

        var currentTime = Date.now();
        timerTextbox.textContent = currentTime - this.startTime;

    }

    showResults() {
        this.puzzleModal.showModal();
        this.finishTime = Date.now();
        this.timeTaken = this.finishTime - this.startTime;
        clearInterval(this.timer);
    }

}

var correctTiles = 0;

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
};


const grid = [];
// Assign each gridTile to a node on the tree
for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++){
        // Make new node in the tree
        grid[i][j] = new tile(i, j);
    }
}

resetButton.addEventListener('click', generatePuzzle);
var timeTaken;


function generatePuzzle() {

    resetButton.textContent = 'Reset';

    // Reset Game
    totalMoves = 0;
    minMoves = 0
    timeTaken = 0
    grid.forEach(row => {
        row.forEach(tile => {
            tile.visited = false;
            tile.connections = [false, false, false, false];
            tile.type = undefined;
            tile.solRotation = undefined;       
            tile.currentRotation = undefined;       
            tile.addedRotation = undefined;       
        })
    })


    // Generate pipes
    var currentTile = grid[0][0];
    var stackTiles = [];   
    var finishDrawing = false;

    while (!finishDrawing) {
        currentTile.visited = true;
        var nextTile = currentTile.checkNeighbours();
    
        if (nextTile) {
            nextTile.visited = true;
            stackTiles.push(currentTile);
            addConnection(currentTile, nextTile);
            currentTile = nextTile;
        } else if (stackTiles.length > 0) {
            while (checkFourway(stackTiles)) {
                stackTiles.pop();
            }
            currentTile = stackTiles.pop();
        } else {
            finishDrawing = true;
        }        
    }

    grid.flat().forEach(tile => tile.setPipe());   

    overlayMessage.textContent =  `Click to start`;
    copyResultsButton.style.display = 'none';
    debug(`Minimum Moves: ${minMoves}`);
    gridOverlay.style.display = 'flex';
    gameStart = true;
}

var gameStart = false

function checkFourway(stackTiles) {
    var trueCount = 0;
    var lastStackTile = stackTiles[stackTiles.length-1];
 
    for (let i = 0; i < 4; i++) {
        if (lastStackTile.connections[i] == true) {
            trueCount++;
        }
    }
    if (trueCount >= 3) {
        return true;
    } 
    return false;
}

function addConnection(currentTile, nextTile) {
    const di = currentTile.rowNum - nextTile.rowNum;
    const dj = currentTile.colNum - nextTile.colNum;
    
    if (di == -1) {
        // current tile is above next tile
        currentTile.connections[2] = true;
        nextTile.connections[0] = true;
    } else if  (di == 1) {
        // current tile is below next tile
        currentTile.connections[0] = true;
        nextTile.connections[2] = true;
    } else if (dj == -1) {
        // current tile is left of the next tile
        currentTile.connections[1] = true;
        nextTile.connections[3] = true;
    } else if (dj == 1) {
        // current tile is right of the next tile
        currentTile.connections[3] = true;
        nextTile.connections[1] = true;
    }
    
}


/* ##########################################################################################
Puzzle Logic
########################################################################################## */


/* ##########################################################################################
ADJUSTING GRID SIZE RELATIVE TO WINDOW
########################################################################################## */

const sizeSlider = document.getElementById('size-input');

sizeSlider.addEventListener("input", () => {
    adjustDivSize();
});

window.addEventListener('resize', adjustDivSize);
window.addEventListener('load', () =>{
    gridDiv.style.width = '60vmin';
    gridDiv.style.height = '60vmin';
});

function adjustDivSize() {

    gridDiv.style.width = 'auto';
    gridDiv.style.height = 'auto';

    var rowDim = gridRowInput.value;
    var colDim = gridColInput.value;

    const winHeight = Math.round(window.innerHeight * (sizeSlider.value/100) / colDim);
    const winWidth = Math.round(window.innerWidth * (sizeSlider.value/100) / rowDim);

    const tileSize = Math.min(winWidth, winHeight);
    
    const gridTiles = document.querySelectorAll('div.grid-tile');

    gridTiles.forEach((gridTile) => {
        gridTile.style.height = `${tileSize}`;
        gridTile.style.window = `${tileSize}`;
    })

    PuzzleRect = gridDiv.getBoundingClientRect();

    puzzleModal.style.width = `${PuzzleRect.width}px`;
    puzzleModal.style.height = `${PuzzleRect.height}px`;
    puzzleModal.style.top = `${PuzzleRect.top}px`;
    puzzleModal.style.left = `${PuzzleRect.left}px`;
}

var currentPuzzle;
const puzzleModal = document.getElementById('puzzle-dialog');
var PuzzleRect;

resetButton.addEventListener("mouseup", () => {

    var rowDim = gridRowInput.value;
    var colDim = gridColInput.value;

    while (gridDiv.firstChild) {
        gridDiv.removeChild(gridDiv.firstChild);
    }

    currentPuzzle = new puzzle(rowDim, colDim, 10000000); // Creates a 4x4 grid
    adjustDivSize();

    PuzzleRect = gridDiv.getBoundingClientRect();

    puzzleModal.style.width = `${PuzzleRect.width}px`;
    puzzleModal.style.height = `${PuzzleRect.height}px`;
    puzzleModal.style.top = `${PuzzleRect.top}px`;
    puzzleModal.style.left = `${PuzzleRect.left}px`;
    
    puzzleModal.showModal();

    console.log(currentPuzzle);
});

