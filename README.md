# Red vs Blue

Red vs Blue is a website game. There is one big button. Players are on the red team or the blue team. If you press the button it turns your team's color. The longer your team holds the button, the more points it gets.

This is our project for CSC 4033.

**Team:** Will, Peyton, Darryl, Bryce

## How to play

1. Go to the website.
2. Type a username and click Join.
3. The game puts you on red or blue. You stay on that team.
4. Press the big button to take it for your team.
5. If the other team has the button, you can try to take it. You and the other player play rock paper scissors. The winner gets the button.
6. Watch the scoreboard to see which team is winning.

If you lose rock paper scissors you have to wait 30 seconds before you can try again.

## What is on the page

- The scoreboard with the red score and the blue score
- The big capture button
- A feed of what happened recently
- A leaderboard of players
- A timer that says when the scores reset

The scores reset every night at 11:59 PM Central time. The winner of each round is saved.

## What we used

- HTML, CSS and JavaScript for the website
- Azure Static Web Apps to host the website
- Azure Functions for the API (the code that runs on the server)
- Azure Cosmos DB to save the players and the game
- GitHub Actions to put the site on Azure when we push to main
- Jest for the tests

## Folders

- `src/` the website (index.html, app.js, style.css, scoreboard.js and more)
- `api/src/functions/` the API files, one for each endpoint
- `api/src/functions/shared/` helper code like scoring and usernames
- `api/tests/` the tests

## API

- `POST /api/join` lets you join with a username and get a team
- `GET /api/state` gets the scores and who has the button
- `POST /api/state` presses the button
- `POST /api/contest/move` sends your rock paper scissors choice
- `GET /api/leaderboard` gets the player rankings
- `GET /api/recent` gets the recent activity
- `POST /api/reset-day` resets the scores (needs a secret)

## How the score works

The server keeps track of the score so players can't cheat. When a team takes the button, the server adds up how long the other team held it and saves it. The score is the saved total plus the time the team has held the button so far.

## Run it on your computer

You need Node.js 22 and the Azure Functions tools.

1. Clone the repo.
2. Open a terminal in the `api` folder and run `npm install`.
3. Make a file called `api/local.settings.json` and add the Cosmos connection string. Ask a teammate for it. **Do not put it on GitHub.**
4. Go back to the main folder and run `swa start src --api-location api`.
5. Open http://localhost:4280 in your browser.

To run the tests, go to the `api` folder and run `npm test`.

## Things to know

- Never put the connection string or any secrets in the repo. They go in the Azure app settings and in `local.settings.json` (which is not uploaded).
- Only API files go in `api/src/functions/`. Helpers go in `api/src/functions/shared/` and tests go in `api/tests/`. If a bad file is in the functions folder the whole API can stop working.
- A green GitHub Action does not mean the API works. Check the site after you push.
- There are no passwords. A username is protected by a code that your browser saves, so if you clear your browser data you might not be able to get your name back.

## Not done yet

- Sound and music
- Showing how many players are online
- Personal stats for each player
- Making the site work better on phones
