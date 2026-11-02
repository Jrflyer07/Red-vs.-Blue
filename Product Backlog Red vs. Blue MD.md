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

# Red vs Blue – Sprint 2 Backlog

Sprint 2 focuses on expanding gameplay with multiple capturable flags, adding a minigame, improving the live player experience, and introducing player profiles, leaderboards, and sound effects.

## Phase 1: Player Profiles

- UR-20: As a player, I want to choose a username so other players can recognize me.
- UR-21: As a returning player, I want my username to be remembered so I don't have to enter it every time.
- TR-22: Associate each username with the player's existing unique ID.
- TR-23: Store player usernames and IDs so they can be used in the leaderboard and recent activity feed.
- TR-24: Allow players to set or update their username without creating a traditional login system.

Assigned: Bryce , Will

## Phase 2: Multiple Flags

- UR-22: As a player, I want multiple flags to capture so my team has more opportunities to score.
- UR-23: As a player, I want to see which team currently controls each flag.
- TR-25: Add additional capturable buttons (flags) to the game interface.
- TR-26: Track the current holder and capture state of each flag independently.
- TR-27: Update the server logic to handle captures across multiple flags.

Assigned: Darryl

## Phase 3: Minigame

- UR-24: As a player, I want to participate in a minigame for an opportunity to earn a win for my team.
- UR-25: As a player, I want to see the result of the minigame so I know whether I won or lost.
- TR-28: Implement the minigame interaction and determine the winner.
- TR-29: Return the minigame result to the server for validation and recording.
- TR-30: Send the winning player's username and result to the recent activity feed.

Assigned: Darryl

## Phase 4: Live Updates and Player Counts

- UR-26: As a player, I want the game to respond quickly when I capture a flag.
- UR-27: As a player, I want to see how many players are currently online on each team.
- TR-31: Investigate and improve latency when processing captures and broadcasting state changes.
- TR-32: Track and display the number of connected players on each team.
- TR-33: Keep player counts synchronized as players connect and disconnect.

Assigned: Will

## Phase 5: Activity Feed and Leaderboard

- UR-28: As a player, I want to see recent flag captures and minigame wins in an activity feed.
- UR-29: As a player, I want to see a leaderboard showing player rankings and statistics.
- UR-30: As a player, I want usernames displayed in the activity feed and leaderboard.
- TR-34: Create an activity feed that displays recent flag captures and minigame wins.
- TR-35: Create a leaderboard using player data and recorded game events.
- TR-36: Connect the activity feed and leaderboard to the existing game state and player profiles.

Assigned: Peyton

## Phase 6: Sound and Music

- UR-31: As a player, I want audio feedback when I capture a flag or complete a minigame.
- UR-32: As a player, I want background music to make the game more engaging.
- UR-33: As a player, I want to mute or adjust game audio.
- TR-37: Implement sound effects for flag captures and minigame results.
- TR-38: Add background music with playback controls.
- TR-39: Ensure audio does not interfere with the game's responsiveness.

Assigned: Bryce

## Sprint 2 Responsibilities

- **Darryl:** Develop the minigame interaction, determine and return winners, integrate results into the activity feed, and implement additional capturable flags.
- **Will:** Investigate and resolve latency issues, implement online player counts, and assist with player profiles.
- **Peyton:** Develop the activity feed and leaderboard, including displaying flag captures, minigame wins, usernames, and player statistics.
- **Bryce:** Implement sound effects and background music, develop player profiles using the existing browser ID, and connect usernames to persistent player data.

## Sprint 2 Goal

Expand Red vs Blue beyond a single-button game by introducing multiple objectives, competitive minigames, player recognition, and improved live interaction while maintaining synchronized game state across connected players.
