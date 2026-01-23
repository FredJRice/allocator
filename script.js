"use strict";

// --- State Management ---
let players = JSON.parse(localStorage.getItem('racquetPlayers')) || [];
let queue = [];
let timers = {};
let config = { count: 4, playersPerCourt: 2 };
let focusedCourtId = null;
let draggedPlayerIndex = null; // Bridge for iPhone touch-dragging

document.addEventListener('DOMContentLoaded', () => {
    generateCourts();
    renderQueue();
    setupModals();

    document.getElementById('applySettings').addEventListener('click', () => {
        config.count = parseInt(document.getElementById('courtCount').value) || 4;
        config.playersPerCourt = parseInt(document.getElementById('playersPerCourt').value) || 2;
        Object.keys(timers).forEach(id => stopTimer(id));
        generateCourts();
    });
});

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
        // If on a court, clicking 'x' removes them back to queue
        btn.onclick = (e) => window.removeSingleFromCourt(e, courtId, div);
        div.ondragstart = (e) => {
            e.dataTransfer.setData("playerName", name);
            e.dataTransfer.setData("fromCourt", courtId);
        };
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
                    <div class="instruction-text">Click here to add players</div>
                </div>
            </div>
            <div class="timer-display" id="timer-${i}">00:00:00</div>
        `;
        
        // Single Click Logic: Auto-fill or Swap
        court.onclick = (e) => { 
            if (!e.target.closest('.player-card') && !e.target.closest('.delete-btn')) {
                handleCourtClick(i); 
            }
        };
        
        // Drag and Drop Listeners
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
        playerArray.forEach((p, index) => {
            if (index > 0) {
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
        // SWAP: Current players to back of queue, fill with new ones
        currentCards.forEach(card => {
            const name = card.getAttribute('data-name');
            if (name) queue.push({ name: name, id: Date.now() + Math.random() });
        });

        const nextPlayers = queue.splice(0, config.playersPerCourt);
        updateCourtDisplay(courtId, nextPlayers);
    } else {
        // AUTO-FILL: If empty, grab top players from queue
        if (queue.length >= 1) {
            const nextPlayers = queue.splice(0, config.playersPerCourt);
            updateCourtDisplay(courtId, nextPlayers);
        } else {
            // Manual Focus fallback
            focusedCourtId = courtId;
            document.getElementById(`court-${courtId}`).classList.add('focused');
        }
    }
    renderQueue();
    renderDatabase();
}

function handleSidebarPlayerClick(index) {
    if (focusedCourtId !== null) {
        const container = document.getElementById(`slots-${focusedCourtId}`);
        const currentCards = container.querySelectorAll('.player-card');

        if (currentCards.length < config.playersPerCourt) {
            const player = queue.splice(index, 1)[0];
            const currentList = Array.from(currentCards).map(c => ({ name: c.getAttribute('data-name') }));
            currentList.push(player);
            
            updateCourtDisplay(focusedCourtId, currentList);
            renderQueue();
            renderDatabase();
        } else {
            focusedCourtId = null;
            document.querySelectorAll('.court').forEach(c => c.classList.remove('focused'));
        }
    }
}

// --- Drag & Drop ---

function handleDropToCourt(e, courtId) {
    e.preventDefault();
    
    // Check Desktop DataTransfer first, fall back to Mobile bridge
    let qIndex = e.dataTransfer.getData("queueIndex");
    if (qIndex === "" && draggedPlayerIndex !== null) {
        qIndex = draggedPlayerIndex;
    }

    if (qIndex === "" || qIndex === null) return;

    const container = document.getElementById(`slots-${courtId}`);
    const currentCards = container.querySelectorAll('.player-card');

    if (currentCards.length >= config.playersPerCourt) {
        alert("Court is full!");
        draggedPlayerIndex = null;
        return;
    }

    const player = queue.splice(parseInt(qIndex), 1)[0];
    draggedPlayerIndex = null;

    if (player) {
        const currentList = Array.from(currentCards).map(c => ({ name: c.getAttribute('data-name') }));
        currentList.push(player);
        updateCourtDisplay(courtId, currentList);
        renderQueue();
        renderDatabase();
    }
}

function handleDropToQueue(e) {
    e.preventDefault();
    const fromCourt = e.dataTransfer.getData("fromCourt");
    const pName = e.dataTransfer.getData("playerName");

    if (fromCourt) {
        const container = document.getElementById(`slots-${fromCourt}`);
        const cards = Array.from(container.querySelectorAll('.player-card'));
        const cardToMove = cards.find(c => c.getAttribute('data-name') === pName);
        if (cardToMove) window.removeSingleFromCourt(e, fromCourt, cardToMove);
    }
}

// --- Global Functions ---

window.removeSingleFromCourt = (e, courtId, element) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const name = element.getAttribute('data-name');
    if (!name) return;

    queue.push({ name: name, id: Date.now() });
    
    const container = document.getElementById(`slots-${courtId}`);
    element.remove();
    
    const remainingCards = container.querySelectorAll('.player-card');
    const remainingData = Array.from(remainingCards).map(c => ({ name: c.getAttribute('data-name') }));
    
    updateCourtDisplay(courtId, remainingData);
    renderQueue();
    renderDatabase();
};

function renderQueue() {
    const container = document.getElementById('playerQueue');
    if (!container) return;
    container.innerHTML = '';
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => handleDropToQueue(e);

    queue.forEach((player, index) => {
        const div = createPlayerCard(player.name);
        div.onclick = () => handleSidebarPlayerClick(index);
        
        // Delete from queue button
        div.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            removeFromQueue(e, index);
        };

        // Desktop and Mobile Drag Setup
        div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        div.ontouchstart = () => { draggedPlayerIndex = index; };

        container.appendChild(div);
    });
}

// --- Timers ---

function startTimer(courtId) {
    if (timers[courtId]) {
        clearInterval(timers[courtId].interval);
    }

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
    
    document.getElementById('openPoolModalBtn').onclick = () => { poolModal.style.display = "block"; renderDatabase(); };
    document.getElementById('openAddPlayerModalBtn').onclick = () => { addModal.style.display = "block"; };
    
    window.onclick = (event) => {
        if (event.target == poolModal) closePool();
        if (event.target == addModal) closeAddPlayer();
    };

    document.getElementById('saveNewPlayerBtn').onclick = () => {
        const input = document.getElementById('newPlayerName');
        const name = input.value.trim();
        if (name && !players.includes(name)) {
            players.push(name);
            localStorage.setItem('racquetPlayers', JSON.stringify(players));
            input.value = ''; addModal.style.display = "none"; renderDatabase();
        }
    };
}

window.closePool = () => document.getElementById('poolModal').style.display = 'none';
window.closeAddPlayer = () => document.getElementById('addPlayerModal').style.display = 'none';

function renderDatabase() {
    const container = document.getElementById('playerDatabase');
    if (!container) return;
    container.innerHTML = '';
    players.sort().forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        if (isPlayerActive(name)) div.classList.add('active-in-system');

        div.innerHTML = `<button class="delete-btn" onclick="deleteFromDb(event, ${index})">×</button>${name}`;
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && !div.classList.contains('active-in-system')) {
                queue.push({ name: name, id: Date.now() + Math.random() });
                renderQueue(); renderDatabase();
            }
        };
        container.appendChild(div);
    });
}

window.addAllToQueue = function() {
    const availablePlayers = players.filter(name => !isPlayerActive(name));
    if (availablePlayers.length === 0) return;
    availablePlayers.forEach(name => {
        queue.push({ name: name, id: Date.now() + Math.random() });
    });
    renderQueue();
    renderDatabase();
};

window.deleteFromDb = (e, index) => { 
    e.stopPropagation(); 
    if (confirm("Delete player from pool?")) { 
        players.splice(index, 1); 
        localStorage.setItem('racquetPlayers', JSON.stringify(players)); 
        renderDatabase(); 
    } 
};

function removeFromQueue(e, index) { 
    e.stopPropagation(); 
    queue.splice(index, 1); 
    renderQueue(); 
    renderDatabase();
}

function isPlayerActive(name) {
    const inQueue = queue.some(p => p.name === name);
    const allCourtCards = document.querySelectorAll('.court .player-card');
    const inCourt = Array.from(allCourtCards).some(card => card.getAttribute('data-name') === name);
    return inQueue || inCourt;
}