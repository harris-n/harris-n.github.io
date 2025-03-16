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
};

// Clear all saved preferences and reset to defaults
const clearPreferences = () => {
    // Default values
    const defaults = {
        displaySize: '60',
        darkMode: false
    };

    // Clear all storage
    localStorage.clear();

    // Reset UI elements to defaults
    sizeSlider.value = defaults.displaySize;
    darkModeToggle.checked = defaults.darkMode;
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
const headerDiv = document.getElementById("header-div");
const puzzleModal = document.getElementById('puzzle-dialog');
const settingsDiv = document.getElementById('settings-div');
const settingsToggle = document.getElementById('settings-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Make clearPreferences available globally for console access
window.clearPreferences = clearPreferences;

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

const END_MODAL_CONTENT = (rowNum, colNum, time, seed, isRandomSeed) => `
    <div class="modal-content">
        Puzzle Complete!
        <div class="result-text">
            ${isRandomSeed ? 'Random' : 'Seeded'} ${rowNum} × ${colNum}<br>
            ${seed ? `Seed: ${seed}<br>` : ''}
            Time: ${time}
        </div>
        <div class="button-group">
            <button class="close-button">Close</button>
            <div class="copy-dropdown">
                <button class="copy-button">Copy Result</button>
                <div class="copy-options">
                    ${isRandomSeed ? '<button class="copy-option" data-include-seed="false">Without Seed</button>' : ''}
                    <button class="copy-option" data-include-seed="true">With Seed</button>
                </div>
            </div>
        </div>
    </div>`;

const RESULT_CONTENT = (rowNum, colNum, time, seed, isRandomSeed) => {
    const url = `${window.location.origin}${window.location.pathname}?rows=${rowNum}&cols=${colNum}${seed ? `&seed=${seed}` : ''}`;
    return `Pipes ${isRandomSeed ? 'Random' : 'Seeded'} ${rowNum} × ${colNum}
${seed ? `Seed = ${seed}\n` : ''}Time: ${time}
Play [here](${url})`;
};

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
    
    if (rowParam || colParam || seedParam) {
        // If URL parameters exist, create puzzle with those parameters
        const config = {
            rows: parseInt(rowParam) || 5,
            cols: parseInt(colParam) || 5,
            seed: parseInt(seedParam) || 0
        };
        
        // Initialize puzzle with URL parameters
        startPuzzleWithConfig(config);
    } else {
        // Show mode selection interface
        showModeSelection();
    }

    // Remove parameters from URL
    window.history.replaceState({}, '', window.location.pathname);
});

// User Input Events
sizeSlider.addEventListener("input", () => {
    adjustDivSize();
    localStorage.setItem('displaySize', sizeSlider.value);
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

// Reset button
resetButton.addEventListener("mouseup", () => {
    showModeSelection();
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
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.seed = seed;
        this.isRandomSeed = (seed === 0);  // Track if this is using a random seed
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
        this.seed = finalSeed;  // Store the final seed back in the puzzle object
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
        const incorrectTiles = this.gridTiles.flat().filter(tile => 
            tile.currentRotation !== tile.solRotation
        );

        if (incorrectTiles.length === 0) {
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
        // Remove the start puzzle handler to prevent accidental restarts
        this.puzzleModal.removeEventListener("mousedown", this.startPuzzleHandler);
        
        this.puzzleModal.showModal();
        this.finishTime = Date.now();
        this.timeTaken = this.finishTime - this.startTime;

        const minutes = Math.floor(this.timeTaken / (1000 * 60));
        const seconds = Math.floor((this.timeTaken % (1000 * 60)) / 1000);
        const milliseconds = Math.floor(this.timeTaken % 1000);
        
        const timeString = minutes > 0 
            ? `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
            : `${seconds}.${String(milliseconds).padStart(3, "0")}`;
        
        // Pass seed and isRandomSeed to the modal content
        this.puzzleModal.innerHTML = END_MODAL_CONTENT(this.rowNum, this.colNum, timeString, this.seed, this.isRandomSeed);
        
        const closeButton = this.puzzleModal.querySelector('.close-button');
        const copyButton = this.puzzleModal.querySelector('.copy-button');
        const copyOptions = this.puzzleModal.querySelector('.copy-options');
        const copyOptionButtons = this.puzzleModal.querySelectorAll('.copy-option');
        
        closeButton.addEventListener('click', () => {
            this.puzzleModal.close();
            // Re-add the start puzzle handler for the next puzzle
            this.puzzleModal.addEventListener("mousedown", this.startPuzzleHandler);
        });
        
        // Toggle dropdown
        copyButton.addEventListener('click', () => {
            copyOptions.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.copy-dropdown')) {
                copyOptions.classList.remove('show');
            }
        });

        // Handle copy options
        copyOptionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const includeSeed = button.dataset.includeSeed === 'true';
                const resultText = RESULT_CONTENT(
                    this.rowNum, 
                    this.colNum, 
                    timeString, 
                    includeSeed ? this.seed : null,
                    this.isRandomSeed
                );
                
                navigator.clipboard.writeText(resultText);
                copyOptions.classList.remove('show');
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy Result';
                }, 2000);
            });
        });
    }
}

// Add these template functions near the other templates
const MODE_SELECTION_CONTENT = () => `
    <div class="mode-selection">
        <div class="mode-content">
            <h2>Choose Your Puzzle</h2>
            <div class="mode-buttons">
                <button id="daily-mode" class="mode-button" data-mode="daily">
                    <span class="mode-title">Daily Puzzle</span>
                    <span class="mode-description">Play today's puzzle that everyone else is playing</span>
                </button>
                <button id="custom-mode" class="mode-button" data-mode="custom">
                    <span class="mode-title">Custom Puzzle</span>
                    <span class="mode-description">Create a puzzle with your own settings</span>
                </button>
            </div>
            <div id="custom-settings" class="custom-settings" style="display: none;">
                <div class="settings-group">
                    <label>Grid Size</label>
                    <div class="grid-inputs">
                        <input type="number" id="custom-rows" min="4" max="10" value="5" placeholder="Rows">
                        <span>×</span>
                        <input type="number" id="custom-cols" min="4" max="10" value="5" placeholder="Columns">
                    </div>
                </div>
                <div class="settings-group">
                    <label>Seed</label>
                    <input type="number" id="custom-seed" placeholder="Leave empty for random">
                </div>
            </div>
        </div>
        <button id="start-puzzle" class="start-button" disabled>Start Puzzle</button>
    </div>`;

// Add this function to generate daily seed
function getDailySeed() {
    const today = new Date();
    return (today.getFullYear() * 10000) + ((today.getMonth() + 1) * 100) + today.getDate();
}

// Add these new functions
function showModeSelection() {
    // Clear existing grid content
    while (gridDiv.firstChild) {
        gridDiv.removeChild(gridDiv.firstChild);
    }
    
    // Add mode selection content
    gridDiv.innerHTML = MODE_SELECTION_CONTENT();
    
    const modeButtons = document.querySelectorAll('.mode-button');
    const startButton = document.getElementById('start-puzzle');
    const customSettings = document.getElementById('custom-settings');
    const customRows = document.getElementById('custom-rows');
    const customCols = document.getElementById('custom-cols');
    const customSeed = document.getElementById('custom-seed');
    let selectedMode = null;
    
    // Add event listeners for mode buttons
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            modeButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Store selected mode
            selectedMode = button.dataset.mode;
            
            // Show/hide custom settings with animation
            if (selectedMode === 'custom') {
                // First set display to flex
                customSettings.style.display = 'flex';
                // Force a reflow
                customSettings.offsetHeight;
                // Reset the animation properties
                customSettings.style.opacity = '1';
                customSettings.style.transform = 'translateY(0)';
            } else {
                customSettings.style.opacity = '0';
                customSettings.style.transform = 'translateY(-10px)';
                customSettings.addEventListener('transitionend', function hidePanel() {
                    if (selectedMode !== 'custom') {
                        customSettings.style.display = 'none';
                    }
                    customSettings.removeEventListener('transitionend', hidePanel);
                });
            }
            
            // Enable start button
            startButton.disabled = false;
        });
    });

    // Add input validation for grid size
    [customRows, customCols].forEach(input => {
        input.addEventListener('input', () => {
            let value = parseInt(input.value);
            if (isNaN(value)) {
                input.value = 5;
            } else {
                if (value < 4) input.value = 4;
                if (value > 10) input.value = 10;
            }
        });

        // Also validate on blur to catch any invalid values
        input.addEventListener('blur', () => {
            let value = parseInt(input.value);
            if (isNaN(value) || value < 4 || value > 10) {
                input.value = 5;
            }
        });
    });

    // Add event listener for start button
    startButton.addEventListener('click', () => {
        let config = {
            rows: 5,
            cols: 5,
            seed: 0
        };
        
        if (selectedMode === 'daily') {
            config.seed = getDailySeed();
        } else if (selectedMode === 'custom') {
            // Ensure values are within valid range
            config.rows = Math.min(Math.max(parseInt(customRows.value) || 5, 4), 10);
            config.cols = Math.min(Math.max(parseInt(customCols.value) || 5, 4), 10);
            config.seed = customSeed.value ? parseInt(customSeed.value) : 0;
        }
        
        startPuzzleWithConfig(config);
    });
}

function startPuzzleWithConfig(config) {
    if (currentPuzzle !== null) {
        currentPuzzle.stopTimer();
        elapsedTime = 0;
    }

    // Clear existing grid content
    while (gridDiv.firstChild) {
        gridDiv.removeChild(gridDiv.firstChild);
    }

    currentPuzzle = new puzzle(config.rows, config.cols, config.seed);
    adjustDivSize();
    timerTextbox.textContent = "00:00";
    puzzleModal.innerHTML = START_MODAL_CONTENT();
    puzzleModal.showModal();
}