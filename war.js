// --- CONFIG ---
const WIDTH = 41;   // same logical width as your football game
const HEIGHT = 21;  // same logical height
const CELL_SIZE = 22; // visually smaller → grid feels "twice as small"

// --- DOM ---
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const formationSelect = document.getElementById("formationSelect");
const teamANameInput = document.getElementById("teamAName");
const teamAColorInput = document.getElementById("teamAColor");
const teamBNameInput = document.getElementById("teamBName");
const teamBColorInput = document.getElementById("teamBColor");
const teamAAICheck = document.getElementById("teamAAI");
const teamBAICheck = document.getElementById("teamBAI");
const restartBtn = document.getElementById("restartBtn");

// --- STATE ---
let board = [];
let pieces = null;
let currentTeam = "teamA";
let gameOver = false;
let selected = null; // { team, index }
let teamA = { name: "Red", color: "#cc0000" };
let teamB = { name: "Blue", color: "#0044cc" };
let warRollValue = null;


// --- TEMPLATES ---
const TEMPLATES = {

  classic: (w,h) => ({
    teamA: [
      { r: 2, c: 2 },
      { r: 4, c: 2 },
      { r: 6, c: 2 },
      { r: 8, c: 2 },
      { r: 10, c: 2 },
      { r: 12, c: 2 },
      { r: 14, c: 2 },
      { r: 16, c: 2 },
      { r: 18, c: 2 },
    ],
    teamB: [
      { r: 2, c: w - 3 },
      { r: 4, c: w - 3 },
      { r: 6, c: w - 3 },
      { r: 8, c: w - 3 },
      { r: 10, c: w - 3 },
      { r: 12, c: w - 3 },
      { r: 14, c: w - 3 },
      { r: 16, c: w - 3 },
      { r: 18, c: w - 3 },
    ]
  }),

  spread: (w,h) => ({
    teamA: [
      { r: 5, c: 2 },
      { r: 9, c: 2 },
      { r: 13, c: 2 },
      { r: 9, c: 4 },
    ],
    teamB: [
      { r: 5, c: w - 3 },
      { r: 9, c: w - 3 },
      { r: 13, c: w - 3 },
      { r: 9, c: w - 5 },
    ]
  }),

};

function createPieces(templateName = "classic") {
  if (templateName === "pyramid") {
    const template = createPyramidTemplate(9, WIDTH, HEIGHT);
    const hydrated = {
      teamA: template.teamA.map(p => ({ ...p, alive: true })),
      teamB: template.teamB.map(p => ({ ...p, alive: true }))
    };
    console.log("TeamA -", hydrated.teamA, "TeamB -", hydrated.teamB);
    return hydrated;
  } else {
    const tplfn = TEMPLATES[templateName] || TEMPLATES.classic;
    const template = tplfn(WIDTH, HEIGHT);
    const hydrated = {
      teamA: template.teamA.map(p => ({ ...p, alive: true })),
      teamB: template.teamB.map(p => ({ ...p, alive: true }))
    };
    console.log("TeamA -", hydrated.teamA, "TeamB -", hydrated.teamB);
    return hydrated;
  }
}

function createPyramidTemplate(base_size, width, height) {
  const center = (height - 1) / 2;

  const teamA = [];
  const teamB = [];

  // Pyramid grows upward and downward from the center
  // Example for base_size = 5:
  // row offsets: 0 → 2 → 4 → 2 → 0
  const half = Math.floor(base_size / 2);

  for (let i = 0; i < base_size; i++) {
    const rowOffset = i - half;          // -2, -1, 0, 1, 2
    const row = center + rowOffset;      // actual row index

    const layerWidth = base_size - Math.abs(rowOffset) * 2;
    // Example: 1, 3, 5, 3, 1

    // --- TEAM A (pyramid pointing right) ---
    // Place pieces starting from left side moving right
    const startA = 1; // left margin
    for (let j = 0; j < layerWidth; j++) {
      teamA.push({ r: row, c: startA + j });
    }

    // --- TEAM B (mirror pyramid pointing left) ---
    // Place pieces starting from right side moving left
    const startB = width - 2; // right margin
    for (let j = 0; j < layerWidth; j++) {
      teamB.push({ r: row, c: startB - j });
    }
  }

  return { teamA, teamB };
}


// --- INIT / RESTART ---
function initBoard() {
  board = [];
  for (let r = 0; r < HEIGHT; r++) {
    const row = [];
    for (let c = 0; c < WIDTH; c++) row.push(null);
    board.push(row);
  }

  for (const p of pieces.teamA) {
    if (p.alive) board[p.r][p.c] = "teamA";
  }
  for (const p of pieces.teamB) {
    if (p.alive) board[p.r][p.c] = "teamB";
  }
}

function restart() {
  gameOver = false;
  selected = null;
  currentTeam = "teamA";

  teamA = {
    name: teamANameInput.value || "Team A",
    color: teamAColorInput.value || "#cc0000"
  };
  teamB = {
    name: teamBNameInput.value || "Team B",
    color: teamBColorInput.value || "#0044cc"
  };

  pieces = createPieces(formationSelect.value);
  initBoard();
  render();
  statusEl.textContent = `${teamA.name} to move.`;
  maybeRunAI();
}

restartBtn.addEventListener("click", restart);

// --- RENDER ---
function render() {
  boardEl.style.gridTemplateColumns = `repeat(${WIDTH}, ${CELL_SIZE}px)`;
  boardEl.style.gridTemplateRows = `repeat(${HEIGHT}, ${CELL_SIZE}px)`;
  boardEl.innerHTML = "";

  for (let r = 0; r < HEIGHT; r++) {
    for (let c = 0; c < WIDTH; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;

      const occ = board[r][c];
      if (occ === "teamA") {
        cell.classList.add("teamA");
        cell.style.background = teamA.color;
      } else if (occ === "teamB") {
        cell.classList.add("teamB");
        cell.style.background = teamB.color;
      }

      if (selected) {
        const sp = pieces[selected.team][selected.index];
        if (sp.r === r && sp.c === c) {
          cell.classList.add("highlight");
        }
      }

      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

// --- INPUT / MOVES ---
function onCellClick(r, c) {
  if (gameOver) return;
  if (isAI(currentTeam)) return; // ignore clicks during AI turn

  const occ = board[r][c];

  // Select own piece
  if (!selected) {
    if (occ === currentTeam) {
      const idx = pieces[currentTeam].findIndex(
        p => p.r === r && p.c === c && p.alive
      );
      if (idx !== -1) {
        selected = { team: currentTeam, index: idx };
        render();
      }
    }
    return;
  }

  // If clicking same team piece, change selection
  if (occ === currentTeam) {
    const idx = pieces[currentTeam].findIndex(
      p => p.r === r && p.c === c && p.alive
    );
    if (idx !== -1) {
      selected = { team: currentTeam, index: idx };
      render();
    }
    return;
  }

  // Attempt move (1 step orthogonal)
  const moved = attemptMove(selected.team, selected.index, r, c);
  if (moved) {
    selected = null;
    render();
    checkWin();
    if (!gameOver) {
      switchTurn();
      maybeRunAI();
    }
  }
}

function attemptMove(team, index, r, c) {
  const piece = pieces[team][index];
  if (!piece.alive) return false;

  // Must move exactly warRollValue spaces in a straight line
  const dr = Math.abs(piece.r - r);
  const dc = Math.abs(piece.c - c);

  // Must be straight line
  if (dr !== 0 && dc !== 0) return false;

  // Must match roll
  if (dr + dc !== warRollValue) return false;

  const occ = board[r][c];

  // Cannot land on own team
  if (occ === team) return false;

  // Capture enemy if present
  if (occ && occ !== team) {
    const enemyTeam = occ;
    const enemyIndex = pieces[enemyTeam].findIndex(
      p => p.r === r && p.c === c && p.alive
    );
    if (enemyIndex !== -1) {
      pieces[enemyTeam][enemyIndex].alive = false;
    }
  }

  // Move
  board[piece.r][piece.c] = null;
  piece.r = r;
  piece.c = c;
  board[r][c] = team;

  return true;
}

// --- TURN / WIN ---
function switchTurn() {
  currentTeam = currentTeam === "teamA" ? "teamB" : "teamA";

  // Roll 1–6 for the new team
  warRollValue = Math.floor(Math.random() * 6) + 1;

  const name = currentTeam === "teamA" ? teamA.name : teamB.name;

  if (!isAI(currentTeam)) {
    statusEl.textContent = `${name} must move ${warRollValue} spaces.`;
  } else {
    statusEl.textContent = `${name} (AI) is moving ${warRollValue} spaces.`;
  }
}

function checkWin() {
  const aAlive = pieces.teamA.some(p => p.alive);
  const bAlive = pieces.teamB.some(p => p.alive);

  if (!aAlive || !bAlive) {
    gameOver = true;
    if (aAlive && !bAlive) {
      statusEl.textContent = `${teamA.name} wins!`;
    } else if (!aAlive && bAlive) {
      statusEl.textContent = `${teamB.name} wins!`;
    } else {
      statusEl.textContent = `Draw.`;
    }
  }
}

// --- AI ---
function isAI(team) {
  return team === "teamA" ? teamAAICheck.checked : teamBAICheck.checked;
}

function maybeRunAI() {
  if (gameOver) return;
  if (!isAI(currentTeam)) return;
  setTimeout(() => aiTurn(currentTeam), 200);
}

function aiTurn(team) {
  aiTurnSwarm(team, {
    aggression: 1.4,
    cohesion: 2.0,
    separation: 1.0,
    randomness: 0.2
  });

}

function aiTurnSimple(team) {
  if (gameOver) return;

  const enemyTeam = team === "teamA" ? "teamB" : "teamA";
  const myPieces = pieces[team]
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.alive);

  if (myPieces.length === 0) return;

 // Simple AI:
  // 1. If can capture adjacent enemy, do it.
  // 2. Else move 1 step toward nearest enemy.
  for (const { p, i } of myPieces) {
    const dirs = [
      [ warRollValue, 0],
      [-warRollValue, 0],
      [0,  warRollValue],
      [0, -warRollValue]
    ];

    for (const [dr, dc] of dirs) {
      const rr = p.r + dr;
      const cc = p.c + dc;
      if (rr < 0 || rr >= HEIGHT || cc < 0 || cc >= WIDTH) continue;

      const occ = board[rr][cc];
      if (occ === enemyTeam) {
        if (attemptMove(team, i, rr, cc)) {
          render();
          checkWin();
          if (!gameOver) {
            switchTurn();
            maybeRunAI();
          }
          return;
        }
      }
    }
  }

  // Otherwise move toward nearest enemy
  let best = null;
  let bestDist = Infinity;

  const enemyPieces = pieces[enemyTeam].filter(p => p.alive);

  for (const { p, i } of myPieces) {
    const dirs = [
      [ warRollValue, 0],
      [-warRollValue, 0],
      [0,  warRollValue],
      [0, -warRollValue]
    ];

    for (const [dr, dc] of dirs) {
      const rr = p.r + dr;
      const cc = p.c + dc;
      if (rr < 0 || rr >= HEIGHT || cc < 0 || cc >= WIDTH) continue;

      const occ = board[rr][cc];
      if (occ === team) continue;

      // Score: distance to nearest enemy
      let minDist = Infinity;
      for (const ep of enemyPieces) {
        const d = Math.abs(ep.r - rr) + Math.abs(ep.c - cc);
        if (d < minDist) minDist = d;
      }

      if (minDist < bestDist) {
        bestDist = minDist;
        best = { index: i, r: rr, c: cc };
      }
    }
  }

  if (best) {
    attemptMove(team, best.index, best.r, best.c);
    render();
    checkWin();
    if (!gameOver) {
      switchTurn();
      maybeRunAI();
    }
  } else {
    // No legal moves
    switchTurn();
    maybeRunAI();
  }
}

function aiTurnSwarm(team, {
  aggression = 1.2,   // pull toward enemies
  cohesion  = 0.8,    // pull toward allies
  separation = 1.0,   // push away from overcrowding
  randomness = 0.25,  // noise to avoid perfect symmetry
  captureBonus = 1000 // how much we value a capture
} = {}) {
  if (gameOver) return;

  const enemyTeam = team === "teamA" ? "teamB" : "teamA";

  const myPieces = pieces[team]
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.alive);

  const enemyPieces = pieces[enemyTeam].filter(p => p.alive);

  if (myPieces.length === 0 || enemyPieces.length === 0) {
    checkWin();
    return;
  }

  // Roll for this AI turn (1–6 straight-line move)
  warRollValue = Math.floor(Math.random() * 6) + 1;
  const teamName = team === "teamA" ? teamA.name : teamB.name;
  statusEl.textContent = `${teamName} (AI) must move ${warRollValue} spaces.`;

  // --- PRECOMPUTE CENTROIDS FOR SWARM BEHAVIOR ---
  function centroid(list) {
    let sx = 0, sy = 0;
    for (const p of list) {
      sx += p.c;
      sy += p.r;
    }
    return { cx: sx / list.length, cy: sy / list.length };
  }

  const allyCentroid  = centroid(myPieces.map(x => x.p));
  const enemyCentroid = centroid(enemyPieces);

  // --- EVALUATE ALL POSSIBLE MOVES, PICK ONE BEST ---
  let bestMove = null;
  let bestScore = -Infinity;

  for (const { p, i } of myPieces) {
    const dirs = [
      [ warRollValue, 0],
      [-warRollValue, 0],
      [0,  warRollValue],
      [0, -warRollValue]
    ];

    for (const [dr, dc] of dirs) {
      const rr = p.r + dr;
      const cc = p.c + dc;

      // Bounds
      if (rr < 0 || rr >= HEIGHT || cc < 0 || cc >= WIDTH) continue;

      const occ = board[rr][cc];
      if (occ === team) continue; // cannot land on own piece

      // --- SWARM SCORING MODEL ---

      let score = 0;

      // 1. Aggression: closer to enemy centroid is better
      const dEnemy = Math.abs(enemyCentroid.cy - rr) + Math.abs(enemyCentroid.cx - cc);
      score += aggression * (20 - dEnemy);

      // 2. Cohesion: closer to ally centroid is better
      const dAlly = Math.abs(allyCentroid.cy - rr) + Math.abs(allyCentroid.cx - cc);
      score += cohesion * (20 - dAlly);

      // 3. Separation: penalize being too close to allies
      for (const ap of myPieces.map(x => x.p)) {
        if (ap === p) continue;
        const d = Math.abs(ap.r - rr) + Math.abs(ap.c - cc);
        if (d < 3) {
          score -= separation * (3 - d) * 5;
        }
      }

      // 4. Captures are highly valuable
      if (occ === enemyTeam) {
        score += captureBonus;
      }

      // 5. Add a bit of randomness
      score += (Math.random() - 0.5) * randomness * 10;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { team, index: i, r: rr, c: cc };
      }
    }
  }

  // --- EXECUTE EXACTLY ONE MOVE OR PASS ---
  if (bestMove) {
    attemptMove(bestMove.team, bestMove.index, bestMove.r, bestMove.c);
    render();
    checkWin();
    if (!gameOver) {
      switchTurn();
      maybeRunAI();
    }
  } else {
    // No legal moves with this roll → pass turn
    switchTurn();
    maybeRunAI();
  }
}



// --- START ---
restart();
