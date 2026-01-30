# [Live Demo: Try CourtQueue Here](https://fredjrice.github.io/court-queue)

![CourtQueue App Screenshot](screenshot.png)

---

CourtQueue: Squash Club Rotation Manager
A lightweight, digital alternative to the traditional "wooden peg and wheel" rotation systems used in squash and racket clubs. Designed for "Club Nights" to ensure fair, transparent, and automated player rotation.

🚀 The Problem
Many squash clubs previously relied on physical boards with clothes pegs to manage player queues. When these boards are removed during refurbishments, clubs often struggle to maintain a fair "first-come, first-served" flow without manual intervention.

✨ The Solution
CourtQueue digitizes this experience. It is a Progressive Web App (PWA) designed to be used on a wall-mounted tablet or a mobile phone.

Key Features:
Simple Queueing: Players add their names to a digital list as they arrive.

One-Tap Rotation: When a match ends, players tap their court on the screen.

Automated Pairing: The app automatically pulls the next two available players from the queue and assigns them to the vacant court.

PWA Ready: Can be "Added to Home Screen" on iOS and Android to function like a native app without an app store download.

🛠️ Tech Stack
Frontend: HTML5, CSS3, JavaScript (ES6+)

Deployment: GitHub Pages

App Logic: Managed via local state to ensure fast, responsive performance on-site.

📱 How to Use
Join: Click "Add Player", enter your name in the input field and click "Close."

Play: The first players in the queue click on a free court and the timer starts.

Rotate: Upon finishing your game, tap the Court Card. The app will clear your names and automatically load the next pair from the queue.

Portfolio Highlights for Recruiters
State Management: Implements logic to handle shifting arrays (queue) into specific objects (courts).

UX/UI Design: Focused on a high-contrast, "touch-first" interface suitable for a sports environment.

Automation: Developed a trigger-based system to minimize the need for a dedicated "event organiser."