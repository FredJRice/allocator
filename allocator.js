"use strict";

let player_pool = [
  "Riley Rice",
  "Jack Black",
  "Tim Allen",
  "Roger Rabbit",
  "Arnold Schwarzenegger",
  "Johnney Depp",
  "Kate Winslet",
  "Christian Bale",
  "Peter Kay",
  "Jim Carrey",
  "Morgan freeman",
  "Claire Danes",
  "Nicolas Cage",
  "Bruce Willis",
  "Roger Moore",
  "Catherine Zeta-Jones",
  "Clive Owen",
  "Jack Nicholson",
  "Cate Blanchett",
  "Fred Rice",
];

let pool = document.querySelector("#poolModal");
let main = document.querySelector("#mainContainer");
let queue = document.querySelector("#playerQueue");
let court1 = document.querySelector("#one");
let court2 = document.querySelector("#two");
let court3 = document.querySelector("#three");
let court4 = document.querySelector("#four");
let player_queue = [];

addPlayerToQueueButton.addEventListener("click", addPool);
// Adds players from the player_pool array to the poolModal
function addPool() {
  pool.style.display = "block";
  pool.innerHTML = "";
  player_pool.forEach((player, index) => {
    pool.innerHTML += `<button class="poolPlayer" id=${index}>${player}</button>`;
  });
  // Adds an event listener to each player button in the pool modal
  player_pool.forEach((player, index) => {
    let personInPool = document.getElementById(index.toString());
    if (personInPool) {
      personInPool.addEventListener("click", () => addFromPoolToQueue(player));
    }
  });
}

function addFromPoolToQueue(player) {
  player_queue.push(player); // Add to the data list
  renderQueue();             // Update the visual list
}

function renderQueue() {
  queue.innerHTML = "<h3>Player Queue</h3>";
  player_queue.forEach((name, index) => {
    queue.innerHTML += `
      <div class="player-card">
        <p class="draggable-player" 
           draggable="true" 
           ondragstart="drag(event)" 
           id="player-${index}">${name}</p>
        <button class="remove-btn-circ" onclick="removeFromQueue(${index})">×</button>
      </div>`;
  });
}

function removeFromQueue(index) {
  // Remove 1 element at the specified index
  player_queue.splice(index, 1);
  
  // Re-render so the IDs and list update immediately
  renderQueue();
}

/* Closes the window if clicked outside the pool modal*/
window.onclick = function (event) {
  if (event.target == main) {
    pool.style.display = "none";
  }
};

court1.addEventListener("click", () => allocatePlayers(court1, "Court 1"));
court2.addEventListener("click", () => allocatePlayers(court2, "Court 2"));
court3.addEventListener("click", () => allocatePlayers(court3, "Court 3"));
court4.addEventListener("click", () => allocatePlayers(court4, "Court 4"));

function allocatePlayers(courtElement, courtName) {
  const currentP1 = courtElement.getAttribute("data-p1");
  const currentP2 = courtElement.getAttribute("data-p2");

  if (currentP1 && currentP2) {
    player_queue.push(currentP1, currentP2);
  }

  if (player_queue.length >= 2) {
    let nextP1 = player_queue.shift();
    let nextP2 = player_queue.shift();

    courtElement.setAttribute("data-p1", nextP1);
    courtElement.setAttribute("data-p2", nextP2);

    // Injecting the cards into the court
    courtElement.innerHTML = `
      <strong>${courtName}</strong>
      <div class="court-matchup">
        ${createPlayerCard(nextP1, 0, false)}
        <div class="vs-text">vs</div>
        ${createPlayerCard(nextP2, 1, false)}
      </div>
    `;
  } else {
    courtElement.removeAttribute("data-p1");
    courtElement.removeAttribute("data-p2");
    courtElement.innerHTML = `<strong>${courtName}</strong><br><br>Empty`;
  }
  renderQueue();
}
// This runs when you start clicking and moving a name
function drag(event) {
  event.dataTransfer.setData("text", event.target.id);
  event.dataTransfer.setData("playerName", event.target.innerText);
}

// This allows the court to 'receive' the drop
function allowDrop(event) {
  event.preventDefault();
}

// This runs when you let go of the mouse over a court
function drop(event) {
  event.preventDefault();
  let playerID = event.dataTransfer.getData("text");
  let playerName = event.dataTransfer.getData("playerName");
  
  // Find which court was dropped on
  let targetCourt = event.target.closest('.court');
  
  if (targetCourt) {
    handleDropOnCourt(targetCourt, playerName, playerID);
  }
}
function handleDropOnCourt(courtElement, playerName, playerID) {
  // Check if the court already has 2 players
  let currentContent = courtElement.innerHTML;
  let playerCount = (currentContent.match(/<strong>/g) || []).length;

  if (playerCount < 2) {
    // Add the player to the court
    if (playerCount === 0) {
      courtElement.innerHTML += `<br><br><strong>${playerName}</strong>`;
    } else {
      courtElement.innerHTML += `<br><br>V.<br><br><strong>${playerName}</strong>`;
    }

    // Remove the player from the queue
    let indexToRemove = parseInt(playerID.split('-')[1]);
    player_queue.splice(indexToRemove, 1);
    renderQueue(); // Refresh the side list
  } else {
    alert("This court already has 2 players assigned!");
  }
}

function createPlayerCard(name, index, isQueue = true) {
  // If it's on a court, we might want a different ID or logic
  const id = isQueue ? `player-${index}` : `court-player-${index}`;
  
  return `
    <div class="player-card">
      <span class="draggable-player" 
            draggable="true" 
            ondragstart="drag(event)" 
            id="${id}">${name}</span>
      <button class="remove-btn-circ" onclick="removeAnywhere('${name}', ${isQueue}, ${index})">×</button>
    </div>`;
}
function removeAnywhere(name, isQueue, index) {
  if (isQueue) {
    player_queue.splice(index, 1);
    renderQueue();
  } else {
    // If removed from a court, we find which court they were on and clear it
    // This looks for the parent court element and resets it
    const playerCard = event.target.closest('.player-card');
    const courtElement = playerCard.closest('.court'); // Assumes your courts have class="court"
    
    courtElement.removeAttribute("data-p1");
    courtElement.removeAttribute("data-p2");
    courtElement.innerHTML = `<strong>Court</strong><br><br>Empty`;
  }
}