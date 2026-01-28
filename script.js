"use strict";

// 1. DATA & STATE
const defaultPlayers = ["Jahangir Khan", "Jansher Khan", "Geoff Hunt", "Heather McKay", "Nicol David", "Nick Matthew", "Jonathon Power", "Amr Shabana", "Peter Nicol", "Susan Devoy"];

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
let courtNames = JSON.parse(localStorage.getItem('courtNames')) || [];
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
        alert(`How to use Court Queue:
          1. Click on 'Add Players'
          2. Tap on a player to add them or select 'Add all'
          3. Click a court to auto add or drag player to the court
          
          Copyright © 2026 Court Queue - Fred Rice
          Version 1.0.0 | Updated January 2026`);
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
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    
    if (courtId) {
        btn.addEventListener('click', (e) => removeSingleFromCourt(e, courtId, div));
        div.ondragstart = (e) => {
            e.dataTransfer.setData("playerName", name);
            e.dataTransfer.setData("fromCourt", courtId);
        };
    } else {
        // div.addEventListener('click', () => handleSidebarPlayerClick(name)); REMOVED to prevent double fire
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
            <h3 class="court-name" data-court="${i}">${courtNames[i-1] || `Court ${i}`}</h3>
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

        // Add rename functionality
        const h3 = court.querySelector('.court-name');
        h3.addEventListener('click', () => {
            const input = document.createElement('input');
            input.value = h3.textContent;
            input.style.width = '100%';
            input.style.fontSize = '1.2em';
            input.style.border = 'none';
            input.style.background = 'transparent';
            h3.replaceWith(input);
            input.focus();
            input.select();
            input.addEventListener('blur', () => {
                const newName = input.value.trim() || `Court ${i}`;
                courtNames[i-1] = newName;
                localStorage.setItem('courtNames', JSON.stringify(courtNames));
                const newH3 = document.createElement('h3');
                newH3.className = 'court-name';
                newH3.setAttribute('data-court', i);
                newH3.textContent = newName;
                input.replaceWith(newH3);
                // Re-add listener
                newH3.addEventListener('click', arguments.callee);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') {
                    const newH3 = document.createElement('h3');
                    newH3.className = 'court-name';
                    newH3.setAttribute('data-court', i);
                    newH3.textContent = h3.textContent;
                    input.replaceWith(newH3);
                    newH3.addEventListener('click', arguments.callee);
                }
            });
        });
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

function reorderQueue(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= queue.length) return;
    
    // Remove the item from its old position
    const [movedItem] = queue.splice(fromIndex, 1);
    
    // If we're dropping *after* the original position, the indices shifted down by 1.
    // However, splice handles "insert at X" logic cleanly if we account for that shift
    // or if we just want "insert before X".
    
    // Generally for drag and drop:
    // If I drag item 0 to item 2 (which becomes index 1 after removal), I want it at index 1? NO.
    // [A, B, C] -> Drag A to C.
    // Remove A -> [B, C]. C is at 1.
    // Insert at 1 -> [B, A, C].
    // Wait, usually drag to C means insert BEFORE C.
    
    // If dragging DOWN (0 -> 2), target is C (index 2 originally).
    // Remove A (0). [B, C]. C is at index 1.
    // Target index was 2. Now 1.
    // Queue.splice(1, 0, A) -> [B, A, C]. Correct.
    
    // If dragging UP (2 -> 0). Target A (index 0).
    // Remove C (2). [A, B].
    // Target A is still at index 0.
    // Queue.splice(0, 0, C) -> [C, A, B]. Correct.
    
    // So if from < to, we insert at (to - 1).
    // If from > to, we insert at (to).
    
    let insertAt = toIndex;
    if (fromIndex < toIndex) {
        insertAt = toIndex - 1;
    }
    
    // Safety check just in case
    if (insertAt < 0) insertAt = 0;
    if (insertAt > queue.length) insertAt = queue.length;

    queue.splice(insertAt, 0, movedItem);
    renderQueue();
}

let isDraggingGlobal = false;

function initTouchDrag(e, index, originalElement) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isDraggingGlobal) return;

    const startX = e.clientX;
    const startY = e.clientY;
    
    let dragTimer = null;
    let localIsDragging = false;
    let activeGhost = null;

    // Feedback: User has touched
    originalElement.style.transform = "scale(0.98)";
    originalElement.style.transition = "transform 0.1s";

    const startDrag = () => {
        localIsDragging = true;
        isDraggingGlobal = true;
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
        
        // Visuals
        originalElement.style.transform = "scale(1)";
        originalElement.style.opacity = "0.4";
        
        // Create Ghost
        activeGhost = originalElement.cloneNode(true);
        activeGhost.classList.add('drag-ghost');
        // Reset styles on ghost that might have been copied
        activeGhost.style.transform = "scale(1.05)";
        activeGhost.style.opacity = "0.9";
        activeGhost.style.position = 'fixed';
        activeGhost.style.zIndex = '9999';
        activeGhost.style.pointerEvents = 'none';
        activeGhost.style.width = `${originalElement.offsetWidth}px`;
        
        document.body.appendChild(activeGhost);
        
        // Initial position
        updateGhostPosition(startX, startY);
    };

    const updateGhostPosition = (x, y) => {
        if (!activeGhost) return;
        activeGhost.style.left = `${x - (originalElement.offsetWidth / 2)}px`;
        activeGhost.style.top = `${y - (originalElement.offsetHeight / 2)}px`;
        
        // Highlight logic
        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        const hoverElement = document.elementFromPoint(x, y);
        const court = hoverElement?.closest('.court');
        if (court) court.classList.add('court-drag-over');
    };

    const onPointerMove = (ev) => {
        if (!localIsDragging) {
            // Check for movement threshold to CANCEL drag timer (assumed scroll)
            const moveX = Math.abs(ev.clientX - startX);
            const moveY = Math.abs(ev.clientY - startY);
            if (moveX > 10 || moveY > 10) {
                clearTimeout(dragTimer);
                cleanupListeners();
            }
        } else {
            if (ev.cancelable) ev.preventDefault(); // Prevent scrolling
            updateGhostPosition(ev.clientX, ev.clientY);
        }
    };

    const onPointerUp = (ev) => {
        clearTimeout(dragTimer);
        
        if (localIsDragging) {
            processDrop(ev.clientX, ev.clientY);
        } else {
            // It was a click/tap
            if (Math.abs(ev.clientX - startX) < 10 && Math.abs(ev.clientY - startY) < 10) {
                // Manually trigger click if we prevented default? 
                // We didn't prevent default on pointerdown, so native click should fire.
                // But just in case we need to trigger the card click logic:
                 const name = originalElement.getAttribute('data-name');
                 if (name && !ev.target.closest('.delete-btn')) {
                     handleSidebarPlayerClick(name);
                 }
            }
        }
        
        cleanupListeners();
    };
    
    const onPointerCancel = () => {
        clearTimeout(dragTimer);
        cleanupListeners();
    };

    const cleanupListeners = () => {
        isDraggingGlobal = false;
        if (activeGhost) activeGhost.remove();
        activeGhost = null;
        
        // Reset Original
        originalElement.style.transform = "";
        originalElement.style.opacity = "";
        originalElement.style.transition = "";

        // Remove Hover classes
        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
    };

    const processDrop = (x, y) => {
        const pointElement = document.elementFromPoint(x, y);
        const dropCourt = pointElement?.closest('.court');
        const dropCard = pointElement?.closest('.queue-container .player-card');
        const dropQueue = pointElement?.closest('.queue-container');
        
        if (dropCourt) {
            const courtId = dropCourt.id.split('-')[1];
            handleDropToCourt(null, courtId, index); 
        } else if (dropCard) {
            const targetName = dropCard.getAttribute('data-name');
            const targetIndex = queue.findIndex(p => p.name === targetName);
            if (targetIndex !== -1) {
                reorderQueue(index, targetIndex);
            }
        } else if (dropQueue) {
            reorderQueue(index, queue.length);
        }
    };

    // START TIMER: 300ms hold to pick up
    dragTimer = setTimeout(startDrag, 300);

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
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

    // Enable Reordering via Native Drag & Drop (Desktop)
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => {
        e.preventDefault();
        const srcIdxVal = e.dataTransfer.getData("queueIndex");
        if (srcIdxVal) {
            const srcIdx = parseInt(srcIdxVal);
            const targetCard = e.target.closest('.player-card');
            
            // Insert before the dropped-on card, or at end if dropped in empty space
            let targetIdx = queue.length; 
            if (targetCard) {
                const name = targetCard.getAttribute('data-name');
                const idx = queue.findIndex(p => p.name === name);
                if (idx !== -1) targetIdx = idx;
            }
            
            reorderQueue(srcIdx, targetIdx);
        }
    };

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