Product Requirements Document

Racquets Court Player Allocator


User Story:

As a user I want to be able to quickly allocate players to a court as they arrive to play.  I want to be able to choose the number of courts I need up to a maximum of 20 and the number of players allowed per court up to 12. The defaults should be squash, 4 courts and 2 people per court. I want to be able to have a simple database of regular players so that I don’t need to type out their names every time and I also want to be able to add new players.  The players first need to be added to a queue so that I can then allocate them on a first come first served basis to a court.  This should be done by either clicking on a court to automatically add the two players at the top of the queue or by dragging and dropping the players from the queue.  If two players are already on the court then they will be automatically removed from the court and returned to the bottom of the queue.  Each player name should have a delete X in the top left corner of their name box so that they can be deleted from the queue or directly from the court.  If a court is empty it should display the word ‘Free’ in the court box.  In addition I would like a court timer at the bottom of each court to show elapsed time in hours, minutes and seconds.


Software Requirements:

- This should be a web based app written in JS with a separate file for HTML, CSS and JS.  Do NOT combine them.
- The app needs to be useable on a smart phone such as an iPhone.
- The player names must be stored locally.  I don’t want to set up a database.
- The app does not need to access any data over the internet but displaying the time and date might be nice.
- Eventually I would like to make an iPhone app out of it but not straight away.
- It would be nice if the racquet club's name could be displayed at the top.

Responsiveness
- 

Nice to haves:

- Court renaming
- Advanced timers - Change colour after 10 minutes, alarm, etc...
- Export/import database
- 