
const button = document.getElementById('captureButton');
const gameStatus = document.getElementById('gameStatus');
const usernameForm = document.getElementById('usernameForm');
const usernameInput = document.getElementById('usernameInput');
const usernameSubmit = document.getElementById('usernameSubmit');
const usernameError = document.getElementById('usernameError');
const SESSION_STORAGE_KEY = 'redvsblue.playerSession.v1';

function readSavedSession() {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : null;
        return typeof saved?.username === 'string' &&
            typeof saved?.sessionToken === 'string' ? saved : null;
    } catch {
        return null;
    }
}

function saveSession(username, sessionToken) {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ username, sessionToken }));
    } catch {
        // The session will work until refresh if browser storage is disabled.
        console.warn('Browser storage unavailable; session cannot persist.');
    }
}

function forgetSession() {
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
}

// The secret token is stored locally and verified by the backend.
let playerSessionToken = null;
let pollingInterval = null;
let playerUsername = null;
let playerTeam = null;
let currentTeam = null;
let stateLoaded = false;
let pressPending = false;

// Leave disabled until the capture API is secured and tested.
const CAPTURE_API_READY = true;

// Update the button's appearance from game state.
function updateDisplay() {
    button.dataset.holder = currentTeam || 'none';
    button.innerText = currentTeam
        ? currentTeam.toUpperCase()
        : 'CAPTURE';

    button.disabled =
        !playerTeam ||
        !stateLoaded ||
        currentTeam === playerTeam ||
        pressPending ||
        !CAPTURE_API_READY;
}

// Read the current game state from Azure.
async function pollState() {
    try {
        const response = await fetch('/api/state');

        if (!response.ok) {
            throw new Error('Could not load game state');
        }

        const state = await response.json();

        // Scoreboard needs the calculated score response.
        if (state.redScore === undefined ||
            state.blueScore === undefined ||
            !state.serverNow) {
            throw new Error('API score format is not ready');
        }

        currentTeam = state.holder
            ? state.holder.toLowerCase()
            : null;

        stateLoaded = true;

        Scoreboard.update({
            ...state,
            holder: currentTeam
        });

        gameStatus.innerText = '';
        updateDisplay();

    } catch (error) {
        console.log(error);
        stateLoaded = false;
        gameStatus.innerText = 'Game state unavailable.';
        updateDisplay();
    }
}

// Will's existing join function, with a few additions.
async function joinGame(username, existingToken = null) {
    const teamText = document.getElementById('team');

    usernameError.innerText = '';
    usernameSubmit.disabled = true;

    try {
        const response = await fetch('/api/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                ...(existingToken ? { sessionToken: existingToken } : {})
            })
        });

        // An existing username cannot be taken over without its token.
        if ([400, 401, 409].includes(response.status)) {
            usernameError.innerText = await response.text();
            if (existingToken) forgetSession();
            return;
        }

        if (!response.ok) {
            throw new Error('Could not join game');
        }

        const data = await response.json();
        if (typeof data.sessionToken !== 'string') {
            throw new Error('Join response missing session token');
        }

        playerUsername = data.username;
        playerSessionToken = data.sessionToken;
        saveSession(data.username, data.sessionToken);
        usernameForm.hidden = true;

        playerTeam = data.team.toLowerCase();
        document.body.dataset.team = playerTeam;

        teamText.innerText =
            playerTeam === 'red'
                ? "You're on Red!"
                : "You're on Blue!";
                document.getElementById('gameArea').hidden = false;

        // Start getting game updates every 2.5 seconds.
        await pollState();
        if (!pollingInterval) pollingInterval = setInterval(pollState, 2500);

    } catch (error) {
        console.log(error);
        usernameError.innerText =
            'Could not join the game. Try again.';

    } finally {
        usernameSubmit.disabled = false;
    }
}

usernameForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const saved = readSavedSession();
    const token = saved && saved.username.toLowerCase() === username.toLowerCase()
        ? saved.sessionToken : null;
    joinGame(username, token);
});

button.addEventListener('click', async function() {
    if (button.disabled || pressPending) {
        return;
    }

    pressPending = true;
    updateDisplay();

    try {
        const response = await fetch('/api/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: playerUsername,
                sessionToken: playerSessionToken
            })
        });

        if (!response.ok) {
            if (response.status === 409) {
                gameStatus.innerText =
                    'Your team already holds the button, or the game changed.';
            } else if (response.status === 429) {
                gameStatus.innerText =
                    'Please wait before pressing again.';
            } else if (response.status === 401) {
                // Stop allowing actions with a missing or revoked session.
                forgetSession();
                playerUsername = null;
                playerTeam = null;
                playerSessionToken = null;
                usernameForm.hidden = false;
                document.getElementById('gameArea').hidden = true;
                usernameError.innerText = 'Session expired or invalid. Join with a new name or recover your account.';
            } else {
                throw new Error('Capture failed');
            }

            return;
        }

        await pollState();

    } catch (error) {
        console.log(error);
        gameStatus.innerText = 'Could not capture the button.';

    } finally {
        pressPending = false;
        updateDisplay();
    }
});

updateDisplay();

// Automatically resume the same player on this browser after a refresh.
const savedSession = readSavedSession();
if (savedSession) {
    usernameInput.value = savedSession.username;
    joinGame(savedSession.username, savedSession.sessionToken);
}
