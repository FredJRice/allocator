"use strict";

// 1. DATA & STATE
const defaultPlayers = ["Jahangir Khan", "Jansher Khan", "Geoff Hunt", "Heather McKay", "Nicol David", "Ramy Ashour", "Jonathon Power", "Amr Shabana", "Peter Nicol", "Susan Devoy"];

// Check for your existing 'racquetPlayers' list
let players = JSON.parse(localStorage.getItem('racquetPlayers')) || [];

// If the list is totally empty, inject the test squad
if (players.length === 0) {
    players = [...defaultPlayers];
    localStorage.setItem('racquetPlayers', JSON.stringify(players));
}

let queue = [];
let timers = {};
let config = { count: 4 };
let focusedCourtId = null;
let activeGhost = null;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    generateCourts();
    renderQueue();
    setupModals();
    renderDatabase(); // CRITICAL: This draws the players in the modal
});

    // --- FOOTER BUTTONS ---

    // 1. Settings (Replaces the old 'applySettings' logic)
    document.getElementById('openSettingsBtn').onclick = () => {
        const val = prompt("Enter number of courts:", config.count);
        if (val !== null) {
            config.count = parseInt(val) || 4;
            generateCourts();
        }
    };

    // 2. Info
    document.getElementById('openInfoBtn').onclick = () => {
        alert("Quick Help:\n- Drag players to courts\n- Tap a court to auto-fill\n- Add players from the Pool button");
    };

    // 3. Clear All
    document.getElementById('clearAllBtn').onclick = () => {
        if (confirm("Reset everything? This clears courts and the queue.")) {
            queue = [];
            Object.keys(timers).forEach(id => stopTimer(id));
            generateCourts();
            renderQueue();
            renderDatabase();
        }
    };

// --- UI Helpers ---

function createPlayerCard(name, courtId = null) {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.draggable = true;
    div.setAttribute('data-name', name);
    
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.innerText = '×';
    
    if (courtId) {
        btn.addEventListener('click', (e) => removeSingleFromCourt(e, courtId, div));
        div.ondragstart = (e) => {
            e.dataTransfer.setData("playerName", name);
            e.dataTransfer.setData("fromCourt", courtId);
        };
    } else {
        div.addEventListener('click', () => handleSidebarPlayerClick(name));
    }
    
    div.appendChild(btn);
    div.appendChild(document.createTextNode(name));
    return div;
}

// --- Court Logic ---

function generateCourts() {
    const grid = document.getElementById('courtGrid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= config.count; i++) {
        const court = document.createElement('div');
        court.className = 'court';
        court.id = `court-${i}`; 
        court.innerHTML = `
            <h3>Court ${i}</h3>
            <div class="slots-container" id="slots-${i}">
                <div class="status-box">
                    <span class="free-label">Free</span>
                    <div class="instruction-text">Tap here or drag to add players</div>
                </div>
            </div>
            <div class="timer-display" id="timer-${i}">00:00:00</div>
        `;
        
        court.addEventListener('click', (e) => { 
            if (!e.target.closest('.player-card') && !e.target.closest('.delete-btn')) {
                handleCourtClick(i); 
            }
        });
        
        court.ondragover = (e) => e.preventDefault();
        court.ondrop = (e) => handleDropToCourt(e, i);
        grid.appendChild(court);
    }
}

function updateCourtDisplay(courtId, playerArray) {
    const container = document.getElementById(`slots-${courtId}`);
    if (!container) return;
    container.innerHTML = '';
    
    if (!playerArray || playerArray.length === 0) {
        container.innerHTML = `
            <div class="status-box">
                <span class="free-label">Free</span>
                <div class="instruction-text">Click here to add players</div>
            </div>
        `;
        stopTimer(courtId);
    } else {
        const vsIndex = playerArray.length <= 2 ? 1 : 2;
        playerArray.forEach((p, index) => {
            if (index === vsIndex) {
                const vs = document.createElement('div');
                vs.className = 'vs-text';
                vs.innerText = 'vs';
                container.appendChild(vs);
            }
            container.appendChild(createPlayerCard(p.name, courtId));
        });
        startTimer(courtId);
    }
}

function handleCourtClick(courtId) {
    const container = document.getElementById(`slots-${courtId}`);
    const currentCards = container.querySelectorAll('.player-card');
    document.querySelectorAll('.court').forEach(c => c.classList.remove('focused'));

    if (currentCards.length > 0) {
        currentCards.forEach(card => {
            const name = card.getAttribute('data-name');
            if (name) queue.push({ name: name, id: Date.now() + Math.random() });
        });
        updateCourtDisplay(courtId, queue.splice(0, 2));
    } else {
        if (queue.length >= 2) {
            updateCourtDisplay(courtId, queue.splice(0, 2));
        } else {
            focusedCourtId = courtId;
            document.getElementById(`court-${courtId}`).classList.add('focused');
        }
    }
    renderQueue();
    renderDatabase();
}

function handleSidebarPlayerClick(name) {
    if (focusedCourtId !== null) {
        const container = document.getElementById(`slots-${focusedCourtId}`);
        const currentCards = container.querySelectorAll('.player-card');

        if (currentCards.length < 4) {
            const qIdx = queue.findIndex(p => p.name === name);
            if (qIdx > -1) {
                const player = queue.splice(qIdx, 1)[0];
                const currentList = Array.from(currentCards).map(c => ({ name: c.getAttribute('data-name') }));
                currentList.push(player);
                updateCourtDisplay(focusedCourtId, currentList);
                renderQueue();
                renderDatabase();
            }
        }
        
        if (container.querySelectorAll('.player-card').length >= 4) {
            focusedCourtId = null;
            document.querySelectorAll('.court').forEach(c => c.classList.remove('focused'));
        }
    }
}

// --- Universal Drag & Drop ---

function initTouchDrag(e, index, originalElement) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activeGhost = originalElement.cloneNode(true);
    activeGhost.classList.add('drag-ghost');
    activeGhost.style.position = 'fixed';
    activeGhost.style.pointerEvents = 'none';
    activeGhost.style.zIndex = '9999';
    document.body.appendChild(activeGhost);
    
    const moveAt = (x, y) => {
        if (!activeGhost) return;
        activeGhost.style.left = `${x - (activeGhost.offsetWidth / 2)}px`;
        activeGhost.style.top = `${y - (activeGhost.offsetHeight / 2)}px`;
        const hoverTarget = document.elementFromPoint(x, y)?.closest('.court');
        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        if (hoverTarget) hoverTarget.classList.add('court-drag-over');
    };

    moveAt(e.clientX, e.clientY);
    const onPointerMove = (ev) => moveAt(ev.clientX, ev.clientY);
    const onPointerUp = (ev) => {
        const dropTarget = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.court');
        if (dropTarget) handleDropToCourt(null, dropTarget.id.split('-')[1], index); 
        if (activeGhost) activeGhost.remove();
        activeGhost = null;
        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

function handleDropToCourt(e, courtId, manualIndex = null) {
    if (e) e.preventDefault();
    let qIndex = (e && e.dataTransfer) ? e.dataTransfer.getData("queueIndex") : manualIndex;
    if (qIndex === null || qIndex === "") return;

    const player = queue.splice(parseInt(qIndex), 1)[0];
    if (player) {
        const container = document.getElementById(`slots-${courtId}`);
        const currentCards = container.querySelectorAll('.player-card');
        if (currentCards.length >= 4) {
            alert("Maximum 4 players per court.");
            queue.unshift(player); 
            renderQueue();
            return;
        }
        const currentList = Array.from(currentCards).map(c => ({ name: c.getAttribute('data-name') }));
        currentList.push(player);
        updateCourtDisplay(courtId, currentList);
        renderQueue();
        renderDatabase();
    }
}

function removeSingleFromCourt(e, courtId, element) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const name = element.getAttribute('data-name');
    if (!name) return;
    queue.push({ name: name, id: Date.now() });
    const container = document.getElementById(`slots-${courtId}`);
    element.remove();
    const remainingData = Array.from(container.querySelectorAll('.player-card')).map(c => ({ name: c.getAttribute('data-name') }));
    updateCourtDisplay(courtId, remainingData);
    renderQueue();
    renderDatabase();
}

function renderQueue() {
    const container = document.getElementById('playerQueue');
    if (!container) return;
    container.innerHTML = '';

    if (queue.length === 0) {
        const label = document.createElement('div');
        label.className = 'instruction-text';
        label.style.margin = 'auto';
        label.innerText = 'Player Queue';
        container.appendChild(label);
    }

    queue.forEach((player, index) => {
        const div = createPlayerCard(player.name);
        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            queue.splice(index, 1);
            renderQueue();
            renderDatabase();
        });
        div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        div.addEventListener('pointerdown', (e) => initTouchDrag(e, index, div));
        container.appendChild(div);
    });
}

// --- Timers ---

function startTimer(courtId) {
    if (timers[courtId]) clearInterval(timers[courtId].interval);
    timers[courtId] = { seconds: 0, interval: null };
    const el = document.getElementById(`timer-${courtId}`);
    timers[courtId].interval = setInterval(() => {
        timers[courtId].seconds++;
        let sec = timers[courtId].seconds;
        const h = String(Math.floor(sec / 3600)).padStart(2, '0');
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        if (el) el.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer(courtId) {
    if (timers[courtId]) {
        clearInterval(timers[courtId].interval);
        delete timers[courtId];
    }
    const el = document.getElementById(`timer-${courtId}`);
    if (el) el.innerText = "00:00:00";
}

// --- Modals & Database ---

function setupModals() {
    const poolModal = document.getElementById("poolModal");
    const addModal = document.getElementById("addPlayerModal");
    const closePool = () => poolModal.style.display = "none";
    const closeAddPlayer = () => addModal.style.display = "none";

    const addAllBtn = document.getElementById('addAllToQueueBtn');
    if (addAllBtn) {
        addAllBtn.addEventListener('click', () => {
            players.filter(name => !isPlayerActive(name)).forEach(name => {
                queue.push({ name: name, id: Date.now() + Math.random() });
            });
            renderQueue();
            renderDatabase();
            // REMOVED: poolModal.style.display = "none"; (User wants manual close)
        });
    }

    document.getElementById('openPoolModalBtn').addEventListener('click', () => {
        poolModal.style.display = "block";
        renderDatabase();
    });

    document.getElementById('openAddPlayerModalBtn').addEventListener('click', () => {
        addModal.style.display = "block";
    });

    document.getElementById('closePoolModalBtn')?.addEventListener('click', closePool);
    document.getElementById('cancelAddPlayerBtn')?.addEventListener('click', closeAddPlayer);

    document.getElementById('saveToPoolBtn').addEventListener('click', () => {
        const input = document.getElementById('newPlayerName');
        const name = input.value.trim();
        if (name && !players.includes(name)) {
            players.push(name);
            localStorage.setItem('racquetPlayers', JSON.stringify(players));
            input.value = ''; 
            closeAddPlayer();
            renderDatabase();
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == poolModal) closePool();
        if (event.target == addModal) closeAddPlayer();
    });
}

function renderDatabase() {
    const container = document.getElementById('playerDatabase');
    if (!container) return;
    container.innerHTML = '';
    
    players.sort().forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        if (isPlayerActive(name)) div.classList.add('active-in-system');

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerText = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
                players.splice(index, 1);
                localStorage.setItem('racquetPlayers', JSON.stringify(players));
                renderDatabase();
        });

        div.appendChild(delBtn);
        div.appendChild(document.createTextNode(name));
        div.addEventListener('click', () => {
            if (!isPlayerActive(name)) {
                queue.push({ name: name, id: Date.now() + Math.random() });
                renderQueue();
                renderDatabase();
            }
        });
        container.appendChild(div);
    });
}

function isPlayerActive(name) {
    const inQueue = queue.some(p => p.name === name);
    const inCourt = Array.from(document.querySelectorAll('.court .player-card'))
                         .some(card => card.getAttribute('data-name') === name);
    return inQueue || inCourt;
}

document.addEventListener('dragend', function() {
    // Look for the specific class the polyfill uses for the ghost image
    const ghost = document.querySelector('.dnd-poly-drag-image');
    if (ghost) {
        ghost.remove();
    }
    
    // Also remove any custom ghost classes you might have
    const customGhosts = document.querySelectorAll('.drag-ghost');
    customGhosts.forEach(g => g.remove());
});