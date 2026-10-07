async function joinGame() {
  const teamText = document.getElementById('team');

  // get the id saved from last time (null if this is the first visit)
  const savedId = localStorage.getItem('playerId');

  try {
    const response = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: savedId }),
    });

    const data = await response.json();

    // save the id so we stay on the same team next time
    localStorage.setItem('playerId', data.playerId);

    document.body.dataset.team = data.team;
    if (data.team === 'red') {
      teamText.textContent = "You're on Red!";
    } else {
      teamText.textContent = "You're on Blue!";
    }
  } catch (error) {
    console.log(error);
    teamText.textContent = 'Could not join the game. Try refreshing.';
  }
}

joinGame();
