"use strict";

let players = JSON.parse(localStorage.getItem('racquetPlayers')) || [];
let queue = [];
let timers = {};
let config = { count: 4, playersPerCourt: 2 };

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
    
    // Create the button element programmatically for better reliability
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.innerText = '×';
    
    if (courtId) {
        // COURT BUTTON: Calls removeSingleFromCourt
        btn.onclick = (e) => window.removeSingleFromCourt(e, courtId, div);
        div.ondragstart = (e) => {
            e.dataTransfer.setData("playerName", name);
            e.dataTransfer.setData("fromCourt", courtId);
        };
    } else {
        // QUEUE BUTTON: Logic added in renderQueue (via index)
    }
    
    div.appendChild(btn);
    // Append the name as a text node so it doesn't get confused with the button
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
        court.innerHTML = `
            <h3>Court ${i}</h3>
            <div class="slots-container" id="slots-${i}"><span class="free-label">Free</span></div>
            <div class="timer-display" id="timer-${i}">00:00:00</div>
        `;
        court.onclick = (e) => { if (!e.target.closest('.player-card')) handleCourtClick(i); };
        court.ondragover = (e) => e.preventDefault();
        court.ondrop = (e) => handleDropToCourt(e, i);
        grid.appendChild(court);
    }
}

function updateCourtDisplay(courtId, playerArray) {
    const container = document.getElementById(`slots-${courtId}`);
    container.innerHTML = '';
    
    if (playerArray.length === 0) {
        container.innerHTML = '<span class="free-label">Free</span>';
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

    // Add back to queue
    queue.push({ name: name, id: Date.now() });
    
    // Get the container and remove the element
    const container = document.getElementById(`slots-${courtId}`);
    element.remove();
    
    // Recalculate remaining players based on data-name attributes
    const remainingCards = container.querySelectorAll('.player-card');
    const remainingData = Array.from(remainingCards).map(c => ({ 
        name: c.getAttribute('data-name') 
    }));
    
    // Refresh the specific court display
    updateCourtDisplay(courtId, remainingData);
    
    // Refresh the sidebar
    renderQueue();
};

function renderQueue() {
    const container = document.getElementById('playerQueue');
    container.innerHTML = '';
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => handleDropToQueue(e);

    queue.forEach((player, index) => {
        const div = createPlayerCard(player.name);
        div.querySelector('.delete-btn').onclick = (e) => removeFromQueue(e, index);
        div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        container.appendChild(div);
    });
}

function handleCourtClick(courtId) {
    const container = document.getElementById(`slots-${courtId}`);
    const currentCards = container.querySelectorAll('.player-card');
    
    // 1. If there are players on the court, move them back to the end of the queue
    if (currentCards.length > 0) {
        currentCards.forEach(card => {
            const name = card.getAttribute('data-name');
            if (name) {
                queue.push({ name: name, id: Date.now() });
            }
        });
    }

    // 2. Check if we have enough players in the queue to fill the court
    if (queue.length === 0) {
        // If queue is empty after eviction, just clear the court
        updateCourtDisplay(courtId, []);
        renderQueue();
        return;
    }

    // 3. Take the NEXT players from the TOP of the queue
    // .splice(0, count) takes from the beginning of the array
    const nextPlayers = queue.splice(0, config.playersPerCourt);
    
    // 4. Update the court and refresh the sidebar
    updateCourtDisplay(courtId, nextPlayers);
    renderQueue();
}

// --- Modals, Database, Timers (Remaining Code) ---

function setupModals() {
    const poolModal = document.getElementById("poolModal");
    const addModal = document.getElementById("addPlayerModal");
    document.getElementById('openPoolModalBtn').onclick = () => { poolModal.style.display = "block"; renderDatabase(); };
    document.getElementById('openAddPlayerModalBtn').onclick = () => { addModal.style.display = "block"; };
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
    players.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        if (queue.some(p => p.name === name) || Array.from(document.querySelectorAll('.court .player-card')).some(c => c.getAttribute('data-name') === name)) {
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

function startTimer(courtId) {
    if (timers[courtId]) return;
    let sec = 0;
    timers[courtId] = setInterval(() => {
        sec++;
        const h = String(Math.floor(sec / 3600)).padStart(2, '0');
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        document.getElementById(`timer-${courtId}`).innerText = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer(courtId) {
    clearInterval(timers[courtId]);
    delete timers[courtId];
    const el = document.getElementById(`timer-${courtId}`);
    if (el) el.innerText = "00:00:00";
}

window.deleteFromDb = (e, index) => { e.stopPropagation(); if (confirm("Delete?")) { players.splice(index, 1); localStorage.setItem('racquetPlayers', JSON.stringify(players)); renderDatabase(); } };
function removeFromQueue(e, index) { e.stopPropagation(); queue.splice(index, 1); renderQueue(); }