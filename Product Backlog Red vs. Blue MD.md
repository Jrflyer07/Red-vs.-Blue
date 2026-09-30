# Red vs Blue - Product Backlog

Red vs Blue is a website with one big button. Every visitor gets put on a random team, red or blue. When you press the button it turns your team's color, and your team scores points for as long as the button stays that color. Everyone sees the same button and scores live, and the game state is saved so it keeps going even when nobody is on the site.

Requirements are listed in the order we plan to implement them, and the numbers follow that order. UR = user requirement, TR = technical requirement.

## Phase 1: Project Setup and Infrastructure

- TR-01: GitHub repo with GitHub Actions deploying to Azure Static Web Apps on push to main.
- TR-02: Connection strings and keys stored in Azure app settings, never committed to the repo.
- TR-03: Stay within Azure free tiers / student credits.
- TR-04: Static site (HTML/CSS/JavaScript) hosted on Azure Static Web Apps.
- TR-05: Azure Functions (HTTP triggers) for the API: get state, press button, negotiate realtime connection.
- TR-06: Azure Cosmos DB (free tier) stores the game state document (current holder, hold start time, team totals).

## Phase 2: Team Assignment

- TR-07: Client generates a unique player ID on first visit and stores it with the assigned team in localStorage/cookie.
- TR-08: Team assignment is done server-side so it can't be picked by editing the client.
- UR-01: As a new visitor, I want to be randomly assigned to red or blue so I can join the game right away.
- UR-02: As a returning visitor, I want to stay on the same team when I refresh or come back so I can't just switch sides.
- UR-03: As a player, I want to clearly see which team I'm on so I know what color I'm fighting for.

## Phase 3: The Button and Persistence

- UR-04: As a player, I want to press the button to change it to my team's color.
- UR-05: As a player, I want the button to show which team is holding it right now.
- TR-09: Two presses at the same time must not corrupt the state (use Cosmos DB ETag / optimistic concurrency and retry).
- UR-06: As a player, I want the button to be disabled (or do nothing) when my team already holds it so I don't waste presses.
- TR-10: Rate limit presses per player (ex. 1 press per second) to stop spam and bots.
- TR-11: Game state survives server restarts and redeploys.
- UR-07: As a player, I want the scores and button state to still be there when I come back later, even if everyone left.

## Phase 4: Scoring

- TR-12: The server is the authority on scoring. Score = saved total + (now - time the current team took the button).
- TR-13: When the button changes hands, the server adds the finished hold time to the old team's total before switching.
- UR-08: As a player, I want my team to earn points for every second we hold the button.
- UR-09: As a player, I want to see both teams' total scores.
- UR-10: As a player, I want to see how long the current team has been holding the button.
- UR-11: As a player, I want the score to keep counting for the holding team while nobody is on the site.

## Phase 5: Live Updates

- TR-14: Azure SignalR Service (serverless mode) broadcasts state changes to every connected client.
- UR-12: As a player, I want the button color to update right away when someone else presses it, without refreshing.
- TR-15: Score display counts up locally between server updates using the server's timestamps (no need for the server to send an update every second).
- UR-13: As a player, I want the scores to count up live while a team holds the button.
- TR-16: Client connects to the realtime service on load and re-syncs full game state if the connection drops and reconnects.
- TR-17: A press should show up on all clients within about 1 second.
- TR-18: Track connected player counts per team from SignalR connect/disconnect events.
- UR-14: As a player, I want to see how many players are online on each team.
- TR-19: Store a press log (player ID, team, timestamp) for the recent press feed and stats.
- UR-15: As a player, I want to see a feed of recent presses (ex. "Blue took the button!").

## Phase 6: Polish and Testing

- UR-16: As a player, I want some feedback when I press (animation or sound) so I know my press worked.
- TR-20: Responsive layout for desktop and mobile.
- TR-21: Basic load test to check live updates with many connected clients.

## Stretch Goals

- UR-17: As a player on my phone, I want the site to work well on a small screen.
- UR-18: As a player, I want to see my personal stats (how many times I pressed, how long I held it for my team).
- UR-19: As a player, I want the game to reset into rounds/seasons (ex. weekly) with a winner history.
