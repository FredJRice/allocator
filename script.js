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
    
    // START FIX: Only queue cards should act as "draggable=false" for our custom touch logic to work
    // Court cards are currently locked (cannot be dragged between courts yet) to prevent confusion.
    div.draggable = false; 
    
    if (!courtId) {
        div.style.touchAction = "pan-y"; 
    } 
    // END FIX

    div.setAttribute('data-name', name);
    
    // Prevent context menu (copy/paste/select) on long press
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Prevent text selection start (additional layer for iOS highlight)
    div.addEventListener('selectstart', (e) => {
        e.preventDefault();
        return false;
    });

    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.innerText = '×';
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    
    if (courtId) {
        btn.addEventListener('click', (e) => removeSingleFromCourt(e, courtId, div));
        // Drag logic from court not currently implemented
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
            if (!e.target.closest('.player-card') && !e.target.closest('.delete-btn') && !e.target.closest('.court-name')) {
                handleCourtClick(i); 
            }
        });
        
        court.ondragover = (e) => e.preventDefault();
        court.ondrop = (e) => handleDropToCourt(e, i);
        grid.appendChild(court);

        // Add rename functionality
        const h3 = court.querySelector('.court-name');
        
        const setupRename = (element) => {
            element.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const currentText = element.textContent;
                const input = document.createElement('input');
                input.value = currentText;
                input.style.width = '100%';
                input.style.fontSize = '1.2em';
                input.style.border = 'none';
                input.style.background = 'transparent';
                
                element.replaceWith(input);
                input.focus();
                input.select();
                
                const restore = (name) => {
                    const newH3 = document.createElement('h3');
                    newH3.className = 'court-name';
                    newH3.setAttribute('data-court', i);
                    newH3.textContent = name;
                    setupRename(newH3);
                    if (input.parentNode) input.replaceWith(newH3);
                };

                input.addEventListener('blur', () => {
                    const newName = input.value.trim() || `Court ${i}`;
                    courtNames[i-1] = newName;
                    localStorage.setItem('courtNames', JSON.stringify(courtNames));
                    restore(newName);
                });
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur(); // Triggers blur which saves
                    if (e.key === 'Escape') {
                        // Prevent blur from saving if escape is pressed (need to manage state or just overwrite)
                        // Actually, blur handles save. Escape should cancel.
                        // We need to remove the blur listener OR handle it.
                        // Easiest: Let's make restore handle everything and prevent double restore.
                        // But standard pattern:
                        input.value = currentText; // Reset value so blur saves original
                        input.blur();
                    }
                });
            });
        };
        
        setupRename(h3);
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
    // FIX: preventDefault on pointerdown often needed for touch actions to prevent scroll/native behaviors
    // But we need to be careful not to block clicking. 
    // We handle that by only preventing if we actually start dragging (after delay or movement).
    // However, for immediate capture, sometimes we need setPointerCapture.
    
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isDraggingGlobal) return;

    // IMPORTANT: Storing the ID for cleaning up properly later
    const pointerId = e.pointerId;

    const startX = e.clientX;
    const startY = e.clientY;
    
    let dragTimer = null;
    let localIsDragging = false;
    let localHasMoved = false; // Track if movement occurred to differentiate click vs drag attempt
    let activeGhost = null;
    let placeholder = null;

    // START FIX: 300ms delay for touch, 0ms for mouse ? 
    // Actually, making it 150ms feels snappier, but let's stick to 300 for safety against scroll.
    const isTouch = (e.pointerType === 'touch');
    const dragDelay = isTouch ? 250 : 50;  // Reduced slightly for better feel, added small delay for mouse to prevent accidental drags on click

    if (isTouch) {
        // Visual feedback immediately on touch press
        originalElement.style.transform = "scale(0.95)";
        originalElement.style.transition = "transform 0.1s";
    }

    const startDrag = () => {
        localIsDragging = true;
        isDraggingGlobal = true;
        
        // Capture pointer to ensure we get events even if user moves finger fast off the element or over other elements (like iframes/courts)
        if (originalElement.setPointerCapture) {
            try {
                originalElement.setPointerCapture(pointerId);
            } catch (err) {
                console.log("Pointer capture failed", err);
            }
        }
        
        if (isTouch && navigator.vibrate) navigator.vibrate(50);
        
        // 1. Setup Placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'queue-placeholder';
        
        // Calculate dims
        const rect = originalElement.getBoundingClientRect();
        placeholder.style.width = `${rect.width}px`;
        placeholder.style.height = `${rect.height}px`;

        if (originalElement.parentNode) {
            originalElement.parentNode.insertBefore(placeholder, originalElement);
        }

        // 2. Hide Original 
        originalElement.style.display = 'none';

        // 3. Create Ghost
        activeGhost = originalElement.cloneNode(true);
        activeGhost.style.display = 'block'; 
        activeGhost.classList.add('drag-ghost');
        activeGhost.style.width = `${rect.width}px`;
        activeGhost.style.height = `${rect.height}px`;

        // Reset styles on ghost
        activeGhost.style.transform = "scale(1.05)";
        activeGhost.style.opacity = "0.9";
        activeGhost.style.position = 'fixed';
        activeGhost.style.zIndex = '9999';
        activeGhost.style.pointerEvents = 'none';
        
        document.body.appendChild(activeGhost);
        
        // Initial position
        updateGhostPosition(startX, startY);
    };

    const updateGhostPosition = (x, y) => {
        if (!activeGhost) return;
        
        // Move Ghost
        activeGhost.style.left = `${x - (activeGhost.offsetWidth / 2)}px`;
        activeGhost.style.top = `${y - (activeGhost.offsetHeight / 2)}px`;
        
        // Check for Court hover
        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        
        // Temporarily hide ghost to see what's under it? No, pointer-events:none handles that.
        const hoverElement = document.elementFromPoint(x, y);
        const court = hoverElement?.closest('.court');
        
        if (court) {
             court.classList.add('court-drag-over');
        } else {
            // Check for Queue Reordering
            const queueContainer = document.getElementById('playerQueue');
            // We only care if we are hovering the queue container or its children
            if (queueContainer && (queueContainer.contains(hoverElement) || hoverElement === queueContainer)) {
                updatePlaceholderPosition(x, y, queueContainer);
            }
        }
    };

    const updatePlaceholderPosition = (x, y, container) => {
        if (!placeholder) return;

        // Get all cards EXCEPT the placeholder and the hidden original
        // (Original is hidden, text nodes etc ignored by using .children and class check)
        const siblings = Array.from(container.children).filter(
            c => c !== placeholder && c !== originalElement && c.classList.contains('player-card')
        );

        // Find closest sibling
        let closest = null;
        let minDistance = Infinity;

        siblings.forEach(child => {
            const rect = child.getBoundingClientRect();
            // Distance to center of card
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dist = Math.hypot(x - cx, y - cy);
            
            if (dist < minDistance) {
                minDistance = dist;
                closest = child;
            }
        });

        if (closest) {
            container.insertBefore(placeholder, closest);
        } else {
            // No siblings (empty queue) or too far?
            if (siblings.length === 0) {
                 container.appendChild(placeholder);
            } else {
                // If dragging to the very end
                 container.appendChild(placeholder);
            }
        }
    };

    const onPointerMove = (ev) => {
        if (ev.pointerId !== pointerId) return;

        // Determine if we have moved enough to consider it a drag attempt (vs a shaky tap)
        const moveX = Math.abs(ev.clientX - startX);
        const moveY = Math.abs(ev.clientY - startY);
        
        if (!localIsDragging) {
             if (moveX > 10 || moveY > 10) {
                 localHasMoved = true;
                 if (!isTouch) {
                     // Mouse: start strictly after movement + delay done (handled by timer, but if moved a lot cancel timer?)
                     // Actually logic is: timer starts drag. movement cancels timer IF we want strict "hold" logic.
                     // But for "drag immediately" on mouse, we just start.
                     // For touch, we want HOLD.
                     if (isTouch) {
                          // If moved too much before timer fires, cancel drag (it's a scroll)
                          clearTimeout(dragTimer);
                          cleanupListeners();
                     }
                 }
             }
        } else {
            if (ev.cancelable) ev.preventDefault(); 
            updateGhostPosition(ev.clientX, ev.clientY);
        }
    };

    const onPointerUp = (ev) => {
        if (ev.pointerId !== pointerId) return;
        clearTimeout(dragTimer);
        
        if (localIsDragging) {
            processDrop(ev.clientX, ev.clientY);
        } else {
            // Click logic - Only if we haven't moved significantly or started dragging
            // Also need to ensure we didn't just cancel a long press
            if (!localHasMoved) {
                 const name = originalElement.getAttribute('data-name');
                 if (name && !ev.target.closest('.delete-btn')) {
                     handleSidebarPlayerClick(name);
                 }
            }
            // Reset styles if it was just a press
            originalElement.style.transform = "";
        }
        
        cleanupListeners();
    };
    
    const onPointerCancel = (ev) => {
        if (ev.pointerId !== pointerId) return;
        clearTimeout(dragTimer);
        cleanupListeners();
    };

    const cleanupListeners = () => {
        isDraggingGlobal = false;
        
        // Release capture if we had it
        if (originalElement.hasPointerCapture && originalElement.hasPointerCapture(pointerId)) {
             try {
                originalElement.releasePointerCapture(pointerId);
             } catch(e) {}
        }
        
        // Remove Ghost
        if (activeGhost) activeGhost.remove();
        activeGhost = null;
        
        // Cleanup Placeholder & Restore Original if Drop failed (implied if placeholder still exists)
        if (placeholder && placeholder.isConnected) {
            originalElement.style.display = '';
            placeholder.remove();
        } else if (originalElement && originalElement.isConnected) {
             originalElement.style.display = '';
             originalElement.style.transform = "";
             originalElement.style.opacity = "";
             originalElement.style.transition = "";
        }

        document.querySelectorAll('.court').forEach(c => c.classList.remove('court-drag-over'));
        
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
    };

    const processDrop = (x, y) => {
        const pointElement = document.elementFromPoint(x, y);
        const dropCourt = pointElement?.closest('.court');
        const queueContainer = document.getElementById('playerQueue');
        
        // FIX: Ensure we handle touch drops correctly for custom DnD
        if (dropCourt) {
            // Dropped on Court
            const courtId = dropCourt.id.split('-')[1];
            // Passing the current index from the initTouchDrag closure
            handleDropToCourt(null, courtId, index); 
        } else {
            // Dropped elsewhere - assume reorder if placeholder exists
            if (placeholder && placeholder.parentNode === queueContainer) {
                // Calculate new index based on placeholder position
                // We want the index in the list of "Real Players"
                
                // Get all children that act as valid slots (excluding hidden original)
                const children = Array.from(queueContainer.children);
                // The original is still in the list but hidden. The placeholder is in the list.
                // We want to know: "If I strip the original out, where is the placeholder?"
                
                const filtered = children.filter(c => c !== originalElement);
                const newIndex = filtered.indexOf(placeholder);
                
                if (newIndex !== -1) {
                    let targetIndex = newIndex;
                    // If moving down the list, we need to account for the shift
                    if (newIndex >= index) targetIndex++; 
                    reorderQueue(index, targetIndex);
                }
            }
        }
    };

    dragTimer = setTimeout(startDrag, dragDelay);

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
    };// START FIX: Remove native dragstart listener for queue items
        // div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        
        // Attach Pointer Events (Custom DnD)

    queue.forEach((player, index) => {
        const div = createPlayerCard(player.name);
        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            queue.splice(index, 1);
            renderQueue();
            renderDatabase();
        });
        
        // FIX: Mobile/Touch Logic vs Desktop logic collision
        // We do NOT want native dragstart on touch devices because we are using pointer events.
        // We only enable native dragstart if we are strictly on desktop mouse? 
        // Actually, let's keep native 'dragstart' for desktop compatibility but ensure it doesn't fire for touch.
        // However, we set draggable="false" in createPlayerCard, so ondragstart shouldn't fire natively effectively?
        // Wait, creating player card sets draggable=false. So ondragstart is useless?
        // Correct. If draggable is false, native drag won't start.
        // But our initTouchDrag handles both mouse and touch via pointer events.
        
        // Remove this line to avoid confusion since draggable is false anyway
        // div.ondragstart = (e) => e.dataTransfer.setData("queueIndex", index);
        
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
    const helpModal = document.getElementById("helpModal");

    const closePool = () => poolModal.style.display = "none";
    const closeAddPlayer = () => addModal.style.display = "none";
    const closeHelp = () => helpModal.style.display = "none";

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

    // Info Button Logic Moved Here
    const infoBtn = document.getElementById('openInfoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
            helpModal.style.display = "block";
        });
    }

    document.getElementById('closePoolModalBtn')?.addEventListener('click', closePool);
    document.getElementById('cancelAddPlayerBtn')?.addEventListener('click', closeAddPlayer);
    document.getElementById('closeHelpModalBtn')?.addEventListener('click', closeHelp);

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
        if (event.target == helpModal) closeHelp();
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