'use strict';

let player_pool =["Jack Black","Tim Allen","Roger Rabbit",
    "Arnold Schwarzenegger","Johnney Depp","Kate Winslet",
    "Christian Bale","Peter Kay","Jim Carrey",
    "Morgan freeman","Claire Danes","Nicolas Cage",
    "Bruce Willis", "Roger Moore", "Catherine Zeta_jones",
    "Clive Owen", "Jack Nicholson", "Cate Blanchett"];

let player_queue =[];

let court1 = document.querySelector('#one');

court1.innerHTML = "Court 1" +"<br><br>"+"<strong>"+ player_pool[4]+"</strong><br><br>"+"V."+"<br><br><strong>"+player_pool[1]+"</strong>";

// function addPlayer{

// }

