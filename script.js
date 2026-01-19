"use strict";

// --- 1. State Management ---
let players = JSON.parse(localStorage.getItem('racquetPlayers')) || [];
let queue = [];
let timers = {};
let config = {
    count: 4,
    playersPerCourt: 2
};

// --- 2. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderDatabase();
    generateCourts();
    setupModalLogic();
    
    // Settings Apply Button
    document.getElementById('applySettings').addEventListener('click', () => {
        config.count = parseInt(document.getElementById('courtCount').value) || 4;
        config.playersPerCourt = parseInt(document.getElementById('playersPerCourt').value) || 2;
        
        // Stop all active timers before re-generating
        Object.keys(timers).forEach(id => stopTimer(id));
        generateCourts();
    });
});

// --- 3. Sidebar: Player Pool & Queue ---

function renderDatabase() {
    const container = document.getElementById('playerDatabase');
    container.innerHTML = '';
    
    players.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        // X button in top-left
        div.innerHTML = `<button class="delete-btn" onclick="deleteFromDb(event, ${index})">×</button>${name}`;
        
        // Clicking card adds to queue
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') addToQueue(name);
        };
        container.appendChild(div);
    });
}

function addToQueue(name) {
    queue.push({ name: name, id: Date.now() });
    renderQueue();
}

function renderQueue() {
    const container = document.getElementById('playerQueue');
    container.innerHTML = '';
    
    queue.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'player-card';
        div.draggable = true;
        div.innerHTML = `<button class="delete-btn" onclick="removeFromQueue(event, ${index})">×</button>${player.name}`;
        
        // Drag Setup
        div.ondragstart = (e) => {
            e.dataTransfer.setData("queueIndex", index);
        };
        
        container.appendChild(div);
    });
}

// --- 4. Court Grid Logic ---

function generateCourts() {
    const grid = document.getElementById('courtGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= config.count; i++) {
        const court = document.createElement('div');
        court.className = 'court';
        court.id = `court-box-${i}`;
        court.innerHTML = `
            <h3>Court ${i}</h3>
            <div class="slots-container" id="slots-${i}">
                <span class="free-label">Free</span>
            </div>
            <div class="timer-display" id="timer-${i}">00:00:00</div>
        `;

        // Click court to auto-allocate from queue or rotate players
        court.onclick = (e) => {
            if (!e.target.closest('.delete-btn')) handleCourtClick(i);
        };

        // Drag and Drop listeners
        court.ondragover = (e) => e.preventDefault();
        court.ondrop = (e) => handleDrop(e, i);

        grid.appendChild(court);
    }
}

function handleCourtClick(courtId) {
    const container = document.getElementById(`slots-${courtId}`);
    const occupiedCards = container.querySelectorAll('.player-card');

    // If court is occupied, move current players to back of queue
    if (occupiedCards.length > 0) {
        occupiedCards.forEach(p => {
            const name = p.innerText.replace('×', '').trim();
            queue.push({ name: name, id: Date.now() });
        });
    }

    // Pull next batch from queue based on "Players/Court" setting
    const nextPlayers = queue.splice(0, config.playersPerCourt);
    updateCourtDisplay(courtId, nextPlayers);
    renderQueue();
}

function updateCourtDisplay(courtId, playerArray) {
    const container = document.getElementById(`slots-${courtId}`);
    
    if (playerArray.length === 0) {
        container.innerHTML = '<span class="free-label">Free</span>';
        stopTimer(courtId);
    } else {
        container.innerHTML = '';
        playerArray.forEach(p => {
            const div = document.createElement('div');
            div.className = 'player-card';
            div.innerHTML = `<button class="delete-btn" onclick="removeSingleFromCourt(event, ${courtId}, this)">×</button>${p.name}`;
            container.appendChild(div);
        });
        startTimer(courtId);
    }
}

// --- 5. Drag & Drop Logic ---

function handleDrop(e, courtId) {
    e.preventDefault();
    const qIndex = e.dataTransfer.getData("queueIndex");
    if (qIndex === "") return;

    const player = queue.splice(qIndex, 1)[0];
    const container = document.getElementById(`slots-${courtId}`);
    
    // Clear "Free" label if it's the first player
    if (container.querySelector('.free-label')) {
        container.innerHTML = '';
        startTimer(courtId);
    }

    // Add player if court isn't full
    const currentCount = container.querySelectorAll('.player-card').length;
    if (currentCount < config.playersPerCourt) {
        const div = document.createElement('div');
        div.className = 'player-card';
        div.innerHTML = `<button class="delete-btn" onclick="removeSingleFromCourt(event, ${courtId}, this)">×</button>${player.name}`;
        container.appendChild(div);
    } else {
        // Return to queue if full
        queue.splice(qIndex, 0, player);
        alert("Court is full!");
    }
    renderQueue();
}

// --- 6. Timer Engine ---

function startTimer(courtId) {
    if (timers[courtId]) clearInterval(timers[courtId].interval);
    
    let seconds = 0;
    timers[courtId] = {
        interval: setInterval(() => {
            seconds++;
            const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            const display = document.getElementById(`timer-${courtId}`);
            if (display) display.innerText = `${h}:${m}:${s}`;
        }, 1000)
    };
}

function stopTimer(courtId) {
    if (timers[courtId]) {
        clearInterval(timers[courtId].interval);
        delete timers[courtId];
    }
    const display = document.getElementById(`timer-${courtId}`);
    if (display) display.innerText = "00:00:00";
}

// --- 7. Modal & Global Deletes ---

function setupModalLogic() {
    const modal = document.getElementById("playerModal");
    const openBtn = document.getElementById("openModalBtn");
    const saveBtn = document.getElementById("addPlayerBtn");
    const nameInput = document.getElementById("newPlayerName");

    openBtn.onclick = () => modal.style.display = "block";

    saveBtn.onclick = () => {
        const name = nameInput.value.trim();
        if (name) {
            players.push(name);
            localStorage.setItem('racquetPlayers', JSON.stringify(players));
            nameInput.value = '';
            modal.style.display = "none";
            renderDatabase();
        }
    };
}

window.deleteFromDb = (e, index) => {
    e.stopPropagation();
    if (confirm("Delete this player permanently?")) {
        players.splice(index, 1);
        localStorage.setItem('racquetPlayers', JSON.stringify(players));
        renderDatabase();
    }
};

window.removeFromQueue = (e, index) => {
    e.stopPropagation();
    queue.splice(index, 1);
    renderQueue();
};

window.removeSingleFromCourt = (e, courtId, element) => {
    e.stopPropagation();
    const container = element.parentElement;
    element.remove();
    
    // If court is now empty, reset to "Free"
    if (container.querySelectorAll('.player-card').length === 0) {
        updateCourtDisplay(courtId, []);
    }
};