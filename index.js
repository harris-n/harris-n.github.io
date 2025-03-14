/* ##########################################################################################
UTILITY FUNCTIONS
########################################################################################## */

function adjustDivSize() {
    const scale = sizeSlider.value / 100;
    
    // Calculate the maximum size that fits in the viewport
    const maxHeight = window.innerHeight * scale;
    const maxWidth = window.innerWidth * scale;
    const size = Math.min(maxHeight, maxWidth);
    
    // Account for the outer border in the total size
    const totalSize = Math.floor(size);
    gridDiv.style.width = `${totalSize}px`;
    gridDiv.style.height = `${totalSize}px`;

    // Get the grid's position and update modal to match exactly
    const rect = gridDiv.getBoundingClientRect();
    puzzleModal.style.width = `${rect.width}px`;
    puzzleModal.style.height = `${rect.height}px`;
    puzzleModal.style.top = `${window.scrollY + rect.top}px`;
    puzzleModal.style.left = `${window.scrollX + rect.left}px`;
}

// Load saved preferences
const loadSavedPreferences = () => {
    // Load dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // Load display size preference
    const savedSize = localStorage.getItem('displaySize');
    if (savedSize) {
        sizeSlider.value = savedSize;
    } else {
        sizeSlider.value = '60'; // Default to 60% if no saved preference
        localStorage.setItem('displaySize', '60');
    }
    adjustDivSize(); // Apply the size immediately

    // Load grid dimensions
    const savedRows = localStorage.getItem('gridRows');
    const savedCols = localStorage.getItem('gridCols');
    if (savedRows) gridRowInput.value = savedRows;
    if (savedCols) gridColInput.value = savedCols;
};

// Clear all saved preferences and reset to defaults
const clearPreferences = () => {
    // Default values
    const defaults = {
        displaySize: '60',
        darkMode: false,
        gridRows: '5',
        gridCols: '5'
    };

    // Clear all storage
    localStorage.clear();

    // Reset UI elements to defaults
    sizeSlider.value = defaults.displaySize;
    darkModeToggle.checked = defaults.darkMode;
    gridRowInput.value = defaults.gridRows;
    gridColInput.value = defaults.gridCols;
    document.documentElement.classList.remove('dark-mode');

    // Apply the default display size
    adjustDivSize();

    // Regenerate the puzzle with default settings
    resetButton.click();

    console.log('All preferences have been reset to defaults');
    return true;
};

/* ##########################################################################################
DOM ELEMENTS AND CONSTANTS
########################################################################################## */

// DOM Elements
const gridDiv = document.getElementById('grid-div');
const resetButton = document.getElementById('reset-button');
const timerTextbox = document.getElementById("timer-textbox");
const sizeSlider = document.getElementById('size-input');
const sizeValue = document.getElementById('size-value');
const gridRowInput = document.getElementById('row-dim-input');
const gridColInput = document.getElementById('col-dim-input');
const seedInput = document.getElementById('seed-input');
const headerDiv = document.getElementById("header-div");
const puzzleModal = document.getElementById('puzzle-dialog');
const settingsDiv = document.getElementById('settings-div');
const settingsToggle = document.getElementById('settings-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Make clearPreferences available globally for console access
window.clearPreferences = clearPreferences;

// Create notification banner
const notificationBanner = document.createElement('div');
notificationBanner.id = 'notification-banner';
notificationBanner.innerHTML = `
    <div class="config-text"></div>
    <button class="close-notification">&times;</button>
`;
document.body.insertBefore(notificationBanner, document.body.firstChild);

// Game State
let currentPuzzle = null;
let intervalIds = [];
let elapsedTime = 0;

// Modal Content Templates
const START_MODAL_CONTENT = (config = null) => {
    if (config) {
        return `
    <div class="modal-content">
        Puzzle configuration detected!
        <div class="result-text">
            Grid Size: ${config.rows} × ${config.cols}${config.seed ? `<br>Seed: ${config.seed}` : ''}
        </div>
        Click anywhere to start the puzzle!
    </div>`;
    }
    return `
    <div class="modal-content">
        Click anywhere to start the puzzle!
    </div>`;
};

const END_MODAL_CONTENT = (rowNum, colNum, time, seed) => `
    <div class="modal-content">
        Puzzle Complete!
        <div class="result-text">
            Grid Size: ${rowNum} × ${colNum}<br>
            Time: ${time}${seed ? `<br>Seed: ${seed}` : ''}
        </div>
        <div class="button-group">
            <button class="close-button">Close</button>
            <button class="copy-button">Copy Result</button>
        </div>
    </div>`;

const RESULT_CONTENT = (rowNum, colNum, time, seed) => `Pipes Puzzle Result:
Grid Size: ${rowNum} × ${colNum}
Time: ${time}${seed ? `\nSeed: ${seed}` : ''}`;

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
window.addEventListener('scroll', adjustDivSize);

// Initialize game and handle URL parameters
window.addEventListener('load', () => {
    // Load saved preferences first
    loadSavedPreferences();
    
    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const rowParam = urlParams.get('rows');
    const colParam = urlParams.get('cols');
    
    let config = null;
    
    if (rowParam || colParam || seedParam) {
        config = {
            rows: parseInt(rowParam) || gridRowInput.value,
            cols: parseInt(colParam) || gridColInput.value,
            seed: parseInt(seedParam) || 0
        };
        
        if (!isNaN(config.rows) && config.rows > 0) {
            gridRowInput.value = config.rows;
            localStorage.setItem('gridRows', config.rows);
        }
        if (!isNaN(config.cols) && config.cols > 0) {
            gridColInput.value = config.cols;
            localStorage.setItem('gridCols', config.cols);
        }
        if (!isNaN(config.seed)) {
            seedInput.value = config.seed || '';
        }

        // Show notification
        const configText = `Puzzle configuration loaded: ${config.rows} × ${config.cols}${config.seed ? ` with seed ${config.seed}` : ''}`;
        notificationBanner.querySelector('.config-text').textContent = configText;
        notificationBanner.classList.add('show');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notificationBanner.classList.remove('show');
        }, 2500);
    }

    // Remove parameters from URL
    urlParams.delete('rows');
    urlParams.delete('cols');
    urlParams.delete('seed');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);

    // Initialize puzzle
    resetButton.click();
});

// Add notification close button handler
notificationBanner.querySelector('.close-notification').addEventListener('click', () => {
    notificationBanner.classList.remove('show');
});

// User Input Events
sizeSlider.addEventListener("input", () => {
    adjustDivSize();
    localStorage.setItem('displaySize', sizeSlider.value);
});

// Seed input handling
seedInput.addEventListener("keydown", (e) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 46, 9, 27, 13].includes(e.keyCode) ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.ctrlKey === true && [65, 67, 86, 88].includes(e.keyCode)) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
        return;
    }
    // Block 'e', '-', '.'
    if (['e', 'E', '-', '.'].includes(e.key)) {
        e.preventDefault();
        return;
    }
    // Block any non-number
    if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
    }
});

seedInput.addEventListener("input", () => {
    const seedValue = seedInput.value;
    if (seedValue === "") {
        resetButton.disabled = false;
    } else {
        const numValue = parseInt(seedValue);
        resetButton.disabled = isNaN(numValue);
    }
});

resetButton.addEventListener("mouseup", () => {
    if (resetButton.disabled) return;
    
    const rowDim = gridRowInput.value;
    const colDim = gridColInput.value;
    const seed = seedInput.value ? parseInt(seedInput.value) : 0;

    while (gridDiv.firstChild) {
        gridDiv.removeChild(gridDiv.firstChild);
    }
    
    if (currentPuzzle !== null) {
        currentPuzzle.stopTimer();
        elapsedTime = 0;
    }

    currentPuzzle = new puzzle(rowDim, colDim, seed);
    adjustDivSize();
    timerTextbox.textContent = "00:00";
    puzzleModal.innerHTML = START_MODAL_CONTENT();
    puzzleModal.showModal();
});

// Settings toggle
settingsToggle.addEventListener('click', () => {
    settingsDiv.classList.toggle('collapsed');
});

// Dark mode toggle
darkModeToggle.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

// Update grid dimension storage when changed
gridRowInput.addEventListener('change', () => {
    localStorage.setItem('gridRows', gridRowInput.value);
});

gridColInput.addEventListener('change', () => {
    localStorage.setItem('gridCols', gridColInput.value);
});

/* ##########################################################################################
GAME CLASSES
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
        this.currentRotation = tileType.rotation;

        div.style.backgroundImage = `url(sprite/${this.type}-pipe.png)`;

        // Add random rotation
        var rndNum = puzzle.rng.next();

        if (this.type !== 'straight') {
            this.addedRotation = rndNum % 4;  // Ensure in range 0-3
            this.currentRotation = (this.currentRotation + this.addedRotation) % 4;  // Keep in range 0-3
            puzzle.minMoves += (4 - this.addedRotation) % 4;
        } else {
            this.addedRotation = rndNum % 2;  // Ensure in range 0-1
            this.currentRotation = (this.currentRotation + this.addedRotation) % 2;  // Keep in range 0-1
            puzzle.minMoves += (2 - this.addedRotation) % 2;
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
            this.currentRotation = (this.currentRotation + 1) % 4;  // Keep in range 0-3
        } else {
            this.currentRotation = (this.currentRotation + 1) % 2;  // Keep in range 0-1
        }
        
        this.div.style.transform = `rotate(${this.currentRotation*90}deg)`;

        this.puzzle.checkGrid();
    }
}


class puzzle {
    constructor(rowNum, colNum, seed = 0) {
        this.rowNum = rowNum
        this.colNum = colNum
        this.seed = seed
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
        // Start from a random tile within grid bounds
        const startRow = this.rng.next() % this.rowNum;
        const startCol = this.rng.next() % this.colNum;
        let currentTile = this.gridTiles[startRow][startCol];
        const stackTiles = [];
        let pathLength = 0;
        const MAX_PATH_LENGTH = 5;  // Maximum steps before forcing a backtrack

        // DFS maze generation
        while (true) {
            currentTile.visited = true;
            const nextTile = currentTile.chooseNeighbour();

            // Check if we've created enough connections
            const unvisitedCount = this.gridTiles.flat().filter(tile => !tile.visited).length;
            if (unvisitedCount === 0) break;

            if (nextTile && pathLength < MAX_PATH_LENGTH) {
                nextTile.visited = true;
                stackTiles.push(currentTile);
                currentTile.addConnection(nextTile);
                currentTile = nextTile;
                pathLength++;
            } else {
                // Backtrack if path is too long or no unvisited neighbors
                while (stackTiles.length > 0 && this.checkFourway(stackTiles)) {
                    stackTiles.pop();
                }
                if (stackTiles.length === 0) break;
                currentTile = stackTiles.pop();
                pathLength = 0;  // Reset path length when backtracking
            }
        }

        // Ensure all tiles are connected
        const unconnectedTiles = this.gridTiles.flat().filter(tile => 
            tile.connections.every(conn => !conn)
        );

        // Connect any isolated tiles to their neighbors
        unconnectedTiles.forEach(tile => {
            const neighbors = this.getValidNeighbors(tile);
            if (neighbors.length > 0) {
                const randomNeighbor = neighbors[this.rng.next() % neighbors.length];
                tile.addConnection(randomNeighbor);
            }
        });
    }

    getValidNeighbors(tile) {
        const neighbors = [];
        const { rowNum, colNum } = tile;

        // Check all four directions
        if (rowNum > 0) neighbors.push(this.gridTiles[rowNum - 1][colNum]);
        if (colNum < this.colNum - 1) neighbors.push(this.gridTiles[rowNum][colNum + 1]);
        if (rowNum < this.rowNum - 1) neighbors.push(this.gridTiles[rowNum + 1][colNum]);
        if (colNum > 0) neighbors.push(this.gridTiles[rowNum][colNum - 1]);

        return neighbors.filter(n => n.connections.filter(conn => conn).length < 4);
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
        const incorrectTiles = this.gridTiles.flat().filter(tile => 
            tile.currentRotation !== tile.solRotation
        ).map(tile => ({
            position: `${tile.rowNum},${tile.colNum}`,
            type: tile.type,
            currentRotation: tile.currentRotation,
            solRotation: tile.solRotation,
            connections: tile.connections
        }));

        if (incorrectTiles.length > 0) {
            console.log('Incorrect tiles:', incorrectTiles);
        } else {
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
            ? `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
            : `${seconds}.${String(milliseconds).padStart(3, "0")}`;
        
        this.puzzleModal.innerHTML = END_MODAL_CONTENT(this.rowNum, this.colNum, timeString, this.seed);
        
        const closeButton = this.puzzleModal.querySelector('.close-button');
        const copyButton = this.puzzleModal.querySelector('.copy-button');
        
        closeButton.addEventListener('click', () => this.puzzleModal.close());
        copyButton.addEventListener('click', () => {
            const resultText = RESULT_CONTENT(this.rowNum, this.colNum, timeString, this.seed);
            navigator.clipboard.writeText(resultText);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy Result';
            }, 2000);
        });
    }
}