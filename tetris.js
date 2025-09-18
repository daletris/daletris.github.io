/*WebSocket# */

const WS_URL = "wss://daletrisserver.onrender.com"; 

const loadingOverlay = document.getElementById('ws-loading');
const leaderboardList = document.getElementById('leaderboard-list');

let ws = null;
let wsConnected = false;

// ask player name
function getPlayerName() {
    let name = localStorage.getItem('daletrisPlayerName');
    if (name && name.trim()) return name;
    name = prompt("Enter a name for the leaderboard (this will be saved locally):", "Player");
    if (!name || !name.trim()) name = "Player";
    name = name.trim().slice(0, 30);
    localStorage.setItem('daletrisPlayerName', name);
    return name;
}

function changePlayerName() {
    let name = localStorage.getItem('daletrisPlayerName');
    name = prompt("Enter a new name for the leaderboard (this will be saved locally):", "Player");
    if (!name || !name.trim()) name = "Player";
    name = name.trim().slice(0, 30);
    localStorage.setItem('daletrisPlayerName', name);
    return name;
}

const playerName = getPlayerName();

function connectWS() {
    try {
        ws = new WebSocket(WS_URL);

        ws.addEventListener('open', () => {
            wsConnected = true;
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            ws.send(JSON.stringify({ type: "get_leaderboard" }));
            ws.send(JSON.stringify({ type: "join", name: playerName }));
        });

        ws.addEventListener('message', (evt) => {
            try {
                const msg = JSON.parse(evt.data);
                handleServerMessage(msg);
            } catch (err) {
                console.warn("Bad WS message", evt.data);
            }
        });

        ws.addEventListener('close', () => {
            wsConnected = false;
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
                loadingOverlay.innerText = 'Disconnected. Reconnecting...';
            }
            setTimeout(connectWS, 2000);
        });

        ws.addEventListener('error', (e) => {
            console.error("WebSocket error:", e);
        });
    } catch (err) {
        console.error("WS connect failed:", err);
        if (loadingOverlay) loadingOverlay.innerText = 'Connection failed.';
    }
}

function handleServerMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'leaderboard') {
        renderLeaderboard(msg.data || []);
    } else if (msg.type === 'player_update') {
        if (msg.data && Array.isArray(msg.data)) renderLeaderboard(msg.data);
    }
}

function renderLeaderboard(entries) {
    if (!leaderboardList) return;
    if (!entries || entries.length === 0) {
        leaderboardList.innerHTML = '<em>No players yet</em>';
        return;
    }
    entries.sort((a, b) => (b.highscore || 0) - (a.highscore || 0));
    leaderboardList.innerHTML = entries.map(e => {
        const display = escapeHtml(e.name || 'Player');
        const hs = e.highscore || 0;
        return `<div class="leaderboard-row"><strong>${display}</strong> — ${hs}</div>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function sendRowCleared() {
    if (!wsConnected) return;
    const payload = { type: "row_cleared", name: playerName, score: player.score };
    ws.send(JSON.stringify(payload));
}

function sendReset() {
    if (!wsConnected) return;
    const payload = { type: "reset", name: playerName, score: player.score };
    ws.send(JSON.stringify(payload));
}

/* Game */

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

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
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;

        sendRowCleared(); //leaderboard
        updateScore();
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
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function createPiece(type) {
    if (type === 'O') return [[1,1],[1,1]];
    else if (type === 'I') return [[0,2,0,0],[0,2,0,0],[0,2,0,0],[0,2,0,0]];
    else if (type === 'S') return [[0,0,0],[0,3,3],[3,3,0]];
    else if (type === 'Z') return [[0,0,0],[4,4,0],[0,4,4]];
    else if (type === 'L') return [[5,0,0],[5,0,0],[5,5,0]];
    else if (type === 'J') return [[0,6,0],[0,6,0],[6,6,0]];
    else if (type === 'T') return [[0,0,0],[0,7,0],[7,7,7]];
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const img = blockImages[value];
                if (img.complete) {
                    context.drawImage(img, x + offset.x, y + offset.y, 1, 1);
                } else {
                    img.onload = () => {
                        context.drawImage(img, x + offset.x, y + offset.y, 1, 1);
                    };
                }
                context.strokeStyle = "black";
                context.lineWidth = 0.05;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
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
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
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
    if (collide(arena, player)) player.pos.x -= offset;
}

function playerReset() {
    const pieces = 'OISZLJT';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        sendReset(); //leaderboard
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
    console.log(incSpeed)
    if ((player.score * 2) < 800) {
        incSpeed = player.score*2;
    } else {
        incSpeed = 800;
    }
    dropCounter += deltaTime;
    if (dropCounter+incSpeed > dropInterval) playerDrop();
    lastTime = time;
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    if (player.score > highScore) {
        highScore = player.score;
        localStorage.setItem("daletrisHighScore", highScore);
    }
    document.getElementById('highscore').innerText = "High Score: " + highScore;
}

//keyboard
document.addEventListener('keydown', event => {
    switch (event.code) {
        case "ArrowLeft": playerMove(-1); break;
        case "ArrowRight": playerMove(1); break;
        case "ArrowDown": playerDrop(); break;
        case "KeyQ": playerRotate(-1); break;
        case "KeyE": playerRotate(1); break;
    }
});

//touch controls
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
        if (dx > 30) playerMove(1);
        else if (dx < -30) playerMove(-1);
    } else if (Math.abs(dy) > 30) {
        if (dy > 30) playerDrop();
    } else {
        playerRotate(-1);
    }
    touchStartX = null;
    touchStartY = null;
});

//setup
const arena = createMatrix(12, 20);
const player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
let highScore = parseInt(localStorage.getItem("daletrisHighScore")) || 0;

document.getElementById('score').innerText = player.score;
document.getElementById('highscore').innerText = "High Score: " + highScore;

playerReset();
updateScore();
update();
connectWS(); //start websocket