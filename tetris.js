const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

context.scale(20, 20);

// Load images for blocks
const blockImages = [
    null,
    loadImage("dale1.jpg"),
    loadImage("dale2.jpg"),
    loadImage("dale3.jpg"),
    loadImage("dale4.jpg"),
    loadImage("dale5.jpg"),
    loadImage("dale6.jpg"),
    loadImage("dale7.jpg"),
    loadImage("dale8.jpg"),
];

function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function clearRow() {
    let rowCount = 1;
    outer: for (let y = arena.length -1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [2, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 3],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 5],
            [5, 0, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 0, 0],
            [0, 6, 0, 0],
            [6, 6, 0, 0],
            [0, 6, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0, 0],
            [0, 7, 0, 0],
            [0, 7, 7, 0],
            [0, 7, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const img = blockImages[value];
                if (img.complete) {
                    context.drawImage(img, 
                        (x + offset.x), 
                        (y + offset.y), 
                        1, 1
                    );
                } else {
                    img.onload = () => {
                        context.drawImage(img, 
                            (x + offset.x), 
                            (y + offset.y), 
                            1, 1
                        );
                    };
                }
                context.strokeStyle = "black";
                context.lineWidth   = 0.05;
                context.strokeRect(x + offset.x,y + offset.y, 1,1);
            }
        });
    });
}

function draw() {
    context.fillStyle = 'rgba(20,20,20,.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        clearRow();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

function playerReset() {
    const pieces = 'TJLOSZI';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let incSpeed = 0;

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    if((player.score*2)<800) {
        incSpeed = player.score;
    }
    else{
        incSpeed = 800;
    }
    dropCounter += deltaTime;
    if ((dropCounter+incSpeed) > dropInterval) {
        playerDrop();
    }

    lastTime = time;

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;

    // Check for new high score
    if (player.score > highScore) {
        highScore = player.score;
        localStorage.setItem("daletrisHighScore", highScore);
        document.getElementById('highscore').innerText = highScore;
    }
}

// Modern keyboard event handling
document.addEventListener('keydown', event => {
    switch (event.code) {
        case "ArrowLeft":
            playerMove(-1);
            break;
        case "ArrowRight":
            playerMove(1);
            break;
        case "ArrowDown":
            playerDrop();
            break;
        case "Space":
            playerRotate(-1);
            break;
    }
});

// Touch controls (swipe + tap)
let touchStartX = null;
let touchStartY = null;

canvas.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchend', e => {
    if (touchStartX === null || touchStartY === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 30) {
            playerMove(1); // swipe right
        } else if (dx < -30) {
            playerMove(-1); // swipe left
        }
    } else if (Math.abs(dy) > 30) {
        // Vertical swipe
        if (dy > 30) {
            playerDrop(); // swipe down
        }
    } else {
        // Tap
        playerRotate(-1);
    }

    touchStartX = null;
    touchStartY = null;
});

// Arena & Player setup
const arena = createMatrix(12, 20);

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
};

// Load high score from localStorage
let highScore = parseInt(localStorage.getItem("daletrisHighScore")) || 0;

// Display scores
document.getElementById('score').innerText = player.score;
if (!document.getElementById('highscore')) {
    const hsDiv = document.createElement("div");
    hsDiv.innerHTML = `High Score: <span id="highscore">${highScore}</span>`;
    document.body.appendChild(hsDiv);
} else {
    document.getElementById('highscore').innerText = "High Score: "+ highScore;
}

playerReset();
updateScore();
update();