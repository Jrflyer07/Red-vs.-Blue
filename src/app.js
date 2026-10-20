
const button = document.getElementById('captureButton');
const gameStatus = document.getElementById('gameStatus');

let playerTeam = null;
let currentTeam = null;
let stateLoaded = false;
let pressPending = false;

// Leave disabled until the capture API is secured and tested.
const CAPTURE_API_READY = true;

// Update the button's appearance from game state.
function updateDisplay() {
    button.style.backgroundColor = currentTeam || 'gray';
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
async function joinGame() {
    const teamText = document.getElementById('team');
    const savedId = localStorage.getItem('playerId');

    try {
        const response = await fetch('/api/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: savedId })
        });

        if (!response.ok) {
            throw new Error('Could not join game');
        }

        const data = await response.json();

        localStorage.setItem('playerId', data.playerId);

        playerTeam = data.team.toLowerCase();
        document.body.dataset.team = playerTeam;

        teamText.innerText =
            playerTeam === 'red'
                ? "You're on Red!"
                : "You're on Blue!";
                document.getElementById('gameArea').hidden = false;

        // Start getting game updates every 2.5 seconds.
        await pollState();
        setInterval(pollState, 2500);

    } catch (error) {
        console.log(error);
        teamText.innerText =
            'Could not join the game. Try refreshing.';
    }
}


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
                playerId: localStorage.getItem('playerId')
            })
        });

        if (!response.ok) {
            if (response.status === 409) {
                gameStatus.innerText =
                    'Your team already holds the button, or the game changed.';
            } else if (response.status === 429) {
                gameStatus.innerText =
                    'Please wait before pressing again.';
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

joinGame();
updateDisplay();
