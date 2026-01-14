"use strict";

let player_pool = [
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
    // We add 'draggable=true' and a 'data-index' to track who is who
    queue.innerHTML += `
      <p class="draggable-player" 
         draggable="true" 
         ondragstart="drag(event)" 
         id="player-${index}">${name}</p>`;
  });
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
  // 1. Check if there are players currently on this court to remove
  const currentP1 = courtElement.getAttribute("data-p1");
  const currentP2 = courtElement.getAttribute("data-p2");

  if (currentP1 && currentP2) {
    // Add the old players back to the end of the queue array
    player_queue.push(currentP1, currentP2);
  }

  // 2. Check if we have enough new players to fill the court
  if (player_queue.length >= 2) {
    let nextP1 = player_queue.shift();
    let nextP2 = player_queue.shift();

    // 3. Update the court UI and store the names in data attributes
    courtElement.setAttribute("data-p1", nextP1);
    courtElement.setAttribute("data-p2", nextP2);

    courtElement.innerHTML = `
      <strong>${courtName}</strong><br><br>
      <span class="player-name">${nextP1}</span><br>
      vs<br>
      <span class="player-name">${nextP2}</span>
    `;
  } else {
    // If queue is empty or only 1 person, just clear the court
    courtElement.removeAttribute("data-p1");
    courtElement.removeAttribute("data-p2");
    courtElement.innerHTML = `<strong>${courtName}</strong><br><br>Empty`;
    alert("Not enough players in queue to start a new match.");
  }

  // 4. Refresh the visual queue
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