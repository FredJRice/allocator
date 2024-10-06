'use strict';

let player_pool =["Jack Black","Tim Allen","Roger Rabbit",
    "Arnold Schwarzenegger","Johnney Depp","Kate Winslet",
    "Christian Bale","Peter Kay","Jim Carrey",
    "Morgan freeman","Claire Danes","Nicolas Cage",
    "Bruce Willis", "Roger Moore", "Catherine Zeta_jones",
    "Clive Owen", "Jack Nicholson", "Cate Blanchett"];

let player_queue =[];

let court1 = document.querySelector('#one');
let court2 = document.querySelector('#two');
let court3 = document.querySelector('#three');
let court4 = document.querySelector('#four');

court1.innerHTML = "Court 1" +"<br><br>"+"<strong>"+ player_pool[4]+"</strong><br><br>"+"V."+"<br><br><strong>"+player_pool[1]+"</strong>";
court2.innerHTML = "Court 2" +"<br><br>"+"<strong>"+ player_pool[6]+"</strong><br><br>"+"V."+"<br><br><strong>"+player_pool[9]+"</strong>";
court3.innerHTML = "Court 3" +"<br><br>"+"<strong>"+ player_pool[7]+"</strong><br><br>"+"V."+"<br><br><strong>"+player_pool[10]+"</strong>";
court4.innerHTML = "Court 4" +"<br><br>"+"<strong>"+ player_pool[14]+"</strong><br><br>"+"V."+"<br><br><strong>"+player_pool[3]+"</strong>";


// function addPlayer{

// }

