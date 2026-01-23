"use strict";

let players = JSON.parse(localStorage.getItem('racquetPlayers')) || [];
let queue = [];
let timers = {};
let config = { count: 4, playersPerCourt: 2 };
let focusedCourtId = null; 

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
    btn.innerText = 'x';
    
    if (courtId) {
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
    grid.innerHTML = '';
    for (let i = 1; i <= config.count; i++) {
        const court = document.createElement('div');
        court.className = 'court';
        court.id = `court-${i}`; 
        // Inside your generateCourts loop
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
        
        court.onclick = (e) => { 
            if (!e.target.closest('.player-card')) handleCourtClick(i); 
        };
        
        court.ondragover = (e) => e.preventDefault();
        court.ondrop = (e) => handleDropToCourt(e, i);
        court.onclick = (e) => { 
            if (!e.target.closest('.player-card')) handleCourtClick(i); 
        };
        grid.appendChild(court);
    }
}

function updateCourtDisplay(courtId, playerArray) {
    const container = document.getElementById(`slots-${courtId}`);
    if (!container) return;
    
    // This clears EVERYTHING inside the slots div (labels, text, cards)
    container.innerHTML = '';
    
    if (!playerArray || playerArray.length === 0) {
        // Only put the labels back if the court is empty
        container.innerHTML = `
            <div class="status-box">
                <span class="free-label">Free</span>
                <div class="instruction-text">Click here to add players</div>
            </div>
        `;
        stopTimer(courtId);
    } else {
        // Logic for adding player cards...
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
    
    // Clear any previous focus highlights
    document.querySelectorAll('.court').forEach(c => c.classList.remove('focused'));

    if (currentCards.length > 0) {
        // --- SWAP LOGIC ---
        // Move current players back to the end of the queue
        currentCards.forEach(card => {
            const name = card.getAttribute('data-name');
            if (name) queue.push({ name: name, id: Date.now() + Math.random() });
        });

        // Fill immediately with the next players from the queue
        const nextPlayers = queue.splice(0, config.playersPerCourt);
        updateCourtDisplay(courtId, nextPlayers);
        renderQueue();
    } else {
        // --- AUTO-FILL LOGIC ---
        if (queue.length >= 1) {
            // Grab up to the 'playersPerCourt' amount (usually 2)
            const nextPlayers = queue.splice(0, config.playersPerCourt);
            updateCourtDisplay(courtId, nextPlayers);
            renderQueue();
        } else {
            // Nothing in queue? Fall back to focus mode so you can add someone manually
            focusedCourtId = courtId;
            document.getElementById(`court-${courtId}`).classList.add('focused');
        }
    }
    
    // Refresh the player pool display to update 'active-in-system' status
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
            alert("Court is full!");
            focusedCourtId = null;
            document.querySelectorAll('.court').forEach(c => c.classList.remove('focused'));
        }
    }
}

// --- Drag & Drop ---

function handleDropToCourt(e, courtId) {
    e.preventDefault();
    const qIndex = e.dataTransfer.getData("queueIndex");
    if (qIndex === "") return;

    const container = document.getElementById(`slots-${courtId}`);
    const currentCards = container.querySelectorAll('.player-card');

    if (currentCards.length >= config.playersPerCourt) {
        alert("Court is full!");
        return;
    }

    const player = queue.splice(qIndex, 1)[0];
    const currentList = Array.from(currentCards).map(c => ({ name: c.getAttribute('data-name') }));
    currentList.push(player);
    
    updateCourtDisplay(courtId, currentList);
    renderQueue();
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
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const name = element.getAttribute('data-name');
    if (!name) return;

    queue.push({ name: name, id: Date.now() });
    element.remove();
    
    const container = document.getElementById(`slots-${courtId}`);
    const remainingCards = container.querySelectorAll('.player-card');
    const remainingData = Array.from(remainingCards).map(c => ({ name: c.getAttribute('data-name') }));
    
    updateCourtDisplay(courtId, remainingData);
    renderQueue();
    renderDatabase();
};

function renderQueue() {
    const container = document.getElementById('playerQueue');
    container.innerHTML = '';
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => handleDropToQueue(e);

    queue.forEach((player, index) => {
        const div = createPlayerCard(player.name);
        div.onclick = () => handleSidebarPlayerClick(index);
        
        div.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            removeFromQueue(e, index);
        };
        div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        container.appendChild(div);
    });
}

// --- Modals, Database, Timers ---

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
    container.innerHTML = '';
    players.sort().forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        if (isPlayerActive(name)) {
            div.classList.add('active-in-system');
        }
        div.innerHTML = `<button class="delete-btn" onclick="deleteFromDb(event, ${index})">×</button>${name}`;
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && !div.classList.contains('active-in-system')) {
                queue.push({ name: name, id: Date.now() });
                renderQueue(); renderDatabase();
            }
        };
        container.appendChild(div);
    });
}

// Ensure timers stores the interval ID AND the seconds count for each court

function startTimer(courtId) {
    // 1. If a timer is already running for this court, kill it first
    if (timers[courtId]) {
        clearInterval(timers[courtId].interval);
    }

    // 2. Initialize or reset the court's data
    timers[courtId] = {
        seconds: 0,
        interval: null
    };

    const el = document.getElementById(`timer-${courtId}`);
    
    // 3. Start a fresh interval
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
    const inCourt = Array.from(allCourtCards).some(card => {
        return card.getAttribute('data-name') === name;
    });
    return inQueue || inCourt;
}