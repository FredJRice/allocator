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

addPlayerButton.addEventListener("click", addPool);
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
  queue.innerHTML += `<p>${player}</p>`;
  console.log(queue);
}

/* Closes the window if clicked outside the pool modal*/
window.onclick = function (event) {
  if (event.target == main) {
    pool.style.display = "none";
  }
};

court1.addEventListener("click", addPlayersCourt1);
court2.addEventListener("click", addPlayersCourt2);
court3.addEventListener("click", addPlayersCourt3);
court4.addEventListener("click", addPlayersCourt4);

function addPlayersCourt1(player) {
  court1.innerHTML =
    "Court 1" +
    "<br><br>" +
    "<strong>" +
    player +
    "</strong><br><br>" +
    "V." +
    "<br><br><strong>" +
    player +
    "</strong>";
  // console.log(player_pool)
}

function addPlayersCourt2() {
  court2.innerHTML =
    "Court 2" +
    "<br><br>" +
    "<strong>" +
    player_pool +
    "</strong><br><br>" +
    "V." +
    "<br><br><strong>" +
    player_pool +
    "</strong>";
  // console.log(player_pool)
}

function addPlayersCourt3() {
  court3.innerHTML =
    "Court 3" +
    "<br><br>" +
    "<strong>" +
    player_pool.pop() +
    "</strong><br><br>" +
    "V." +
    "<br><br><strong>" +
    player_pool +
    "</strong>";
  // console.log(player_pool)
}

function addPlayersCourt4() {
  court4.innerHTML =
    "Court 4" +
    "<br><br>" +
    "<strong>" +
    player_pool +
    "</strong><br><br>" +
    "V." +
    "<br><br><strong>" +
    player_pool +
    "</strong>";
  // console.log(player_pool)
}
