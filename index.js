const gridSize = 5;
const resetButton = document.getElementById('reset-button');
const gridDiv = document.getElementById('grid-div');

for (let rowNum = 0; rowNum < gridSize; rowNum++) {
    const newGridRow = document.createElement('div');
    newGridRow.id = `${rowNum}`;
    newGridRow.classList.toggle('grid-row');

    for (let colNum = 0; colNum < gridSize; colNum++) {
        const newGridTile = document.createElement('div');
        newGridTile.classList.toggle('grid-tile');
        newGridTile.id = `${rowNum},${colNum}`;
        newGridRow.append(newGridTile);
    }

    gridDiv.append(newGridRow);    
}

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
        overlayMessage.textContent = `done in ${totalMoves}/${minMoves} moves and ${timeTaken}sec.`;

        updatePersonalBest(timeTaken);

    }

}


class tile {
    constructor(rowNum, colNum) {
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.connections = [false, false, false, false];
        this.visited = false;
        this.type;
        this.solRotation;
        this.currentRotation;
        this.addedRotation;
    }

    checkNeighbours() {
        const neighbours = [];

        const i = this.rowNum;
        const j = this.colNum;

        if (i - 1 > -1 && grid[i-1][j].visited == false) {
            neighbours.push(grid[i-1][j]);
        }
        if (j + 1 < gridSize && grid[i][j + 1].visited == false) {
            neighbours.push(grid[i][j + 1]);
        }
        if (i + 1 < gridSize && grid[i+1][j].visited == false) {
            neighbours.push(grid[i+1][j]);
        }
        if (j - 1 > -1 && grid[i][j-1].visited == false) {
            neighbours.push(grid[i][j-1]);
        }

        if (neighbours.length > 0) {
            let rndNeighbour = Math.floor(Math.random() * neighbours.length);
            return neighbours[rndNeighbour];
        } else {
            return undefined;
        }
        
    }

    setPipe() {
        var key = this.connections.join(',');
        var thisTileInfo = tileDictionary[key];
        this.solRotation = thisTileInfo.rotation;
        this.type = thisTileInfo.type;

        var i = this.rowNum;
        var j = this.colNum;
        document.getElementById(`${i},${j}`).style.backgroundImage = `url(sprite/${spriteTheme}/${this.type}-pipe.png)`;
        var rndNum = Math.floor(Math.random() * 4);
        // for fun, rotates the tiles to its actual orientation
        // document.getElementById(`${i},${j}`).style.transform = `rotate(${this.solRotation*90}deg)`;
        this.addedRotation = rndNum;

        if (this.type !== 'straight') {
            this.currentRotation = this.solRotation + rndNum;
            // document.getElementById(`${i},${j}`).textContent = (4 - rndNum) % 4;
            minMoves += (4 - rndNum) % 4;
        } else {
            this.currentRotation = this.solRotation + rndNum % 2;
            // document.getElementById(`${i},${j}`).textContent = rndNum % 2;
            minMoves += (4 - rndNum) % 2;
        }

        document.getElementById(`${i},${j}`).style.transform = `rotate(${this.currentRotation*90}deg)`;

    }
}

var spriteTheme = 'pink'

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

    overlayMessage.textContent =  `Click to start ${minMoves}`;
    gridOverlay.style.display = 'flex';
    const personalBestTime = getPersonalBest();
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



window.addEventListener('resize', adjustDivSize);
window.addEventListener('load', startup);

function adjustDivSize() {
    const targetSize = (sizeSlider.value/100) * Math.min(window.innerHeight, window.innerWidth);
    const gridDimension = Math.round(targetSize / gridSize) * gridSize;

    gridDiv.style.height = `${gridDimension}px`;
    gridDiv.style.width = `${gridDimension}px`;

    gridOverlay.style.height = gridDiv.style.height;
    gridOverlay.style.width = gridDiv.style.width;
    gridOverlay.style.display = 'none';
}

function startup() {
    adjustDivSize();
    displayPersonalBest();
}

const gridOverlay = document.getElementById('grid-overlay');
const pipeHeader = document.getElementById('pipe-title');
var timeStarted;

gridOverlay.addEventListener('mousedown', () => {
    if (gameStart) {
        gridOverlay.style.display = 'none';
        timeStarted = Date.now();
        console.log(timeStarted);
    }
})



pipeHeader.style.backgroundImage = 'url(sprite/pipes-header-rainbow.png)';

function getAspectRatio(src, callback) {
    var img = new Image();
    img.onload = function() {
        var aspectRatio = img.naturalWidth / img.naturalHeight;
        callback(aspectRatio);
    };
    img.src = src;
}

getAspectRatio('sprite/pipes-header-rainbow.png', function(aspectRatio) {
    var pipeHeader = document.getElementById('pipe-title');
    var newHeight = 0.1 * Math.min(window.innerHeight, window.innerWidth);
    pipeHeader.style.height = newHeight + "px";
    pipeHeader.style.width = (newHeight * aspectRatio) + "px";
});


var sizeSlider = document.getElementById('size-range');

sizeSlider.addEventListener("input", () => {
    adjustDivSize();

    if (sizeSlider.value == 90) {
        spriteTheme = 'cat';
    } else if (sizeSlider.value == 10) {
        spriteTheme = 'frog';
    } else if (sizeSlider.value == 69) {
        spriteTheme = 'rabbit';
    }
})

var loadButton = document.getElementById('load-button');


function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function setPersonalBest(time) {
    setCookie('personalBest', time, 365);
}

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) == 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

function getPersonalBest() {
    return getCookie('personalBest');
}

// Example usage
const personalBestTime = getPersonalBest();

function updatePersonalBest(newTime) {
    const currentBest = getPersonalBest();
    if (!currentBest || newTime < currentBest) {
        setPersonalBest(newTime);

        overlayMessage.textContent += ` New Personal Best!`;
    }
}

// Create a function to delete a cookie
function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
}

// Function to display the personal best time in the textbox
function displayPersonalBest() {
    const personalBest = getCookie('personalBest');
    const textbox = document.getElementById('stats-textbox');
    if (personalBest) {
        seed.value = "Personal best: " + personalBest + "s";
    } else {
        seed.value = 'No personal best time set';
    }
}
