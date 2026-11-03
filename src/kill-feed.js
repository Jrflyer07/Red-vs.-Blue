
(function () {
    'use strict';

    const gamerLines = [
        ' absolutely REKT ',
        ' 360° NO-SCOPED ',
        ' obliterated ',
        ' sent ',
        ' destroyed ',
        ' completely CLAPPED ',
        ' outplayed ',
        ' quickscoped ',
        ' deleted ',
        ' dominated ',
        ' made look like a BOT: ',
        ' sent straight back to the lobby: ',
        ' hit with the MLG COMBO: ',
        ' got absolutely DUNKED on: '
    ];

    function update(entries) {
        const feed = document.getElementById('kill-feed-list');
        if (!feed) return;

        feed.replaceChildren();

        if (!Array.isArray(entries) || entries.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'kill-feed-empty';
            empty.textContent = 'No contests completed yet.';
            feed.appendChild(empty);
            return;
        }

        entries.slice(0, 10).forEach(entry => {
            const item = document.createElement('li');
            item.className = 'kill-feed-entry';

            const winnerTeam =
                String(entry.winnerTeam || '').toLowerCase();

            const loserTeam = winnerTeam === 'red' ? 'blue' : 'red';

            // Winner
            const winner = document.createElement('strong');
            winner.className =
                winnerTeam === 'red' ? 'kill-feed-red' : 'kill-feed-blue';
            winner.textContent = entry.winnerUsername || 'Unknown';

            // Random MLG gamer line
            const result = document.createElement('span');
            result.className = 'kill-feed-result';

            result.textContent =
                gamerLines[Math.floor(Math.random() * gamerLines.length)];

            // Loser
            const loser = document.createElement('strong');
            loser.className =
                loserTeam === 'red' ? 'kill-feed-red' : 'kill-feed-blue';
            loser.textContent = entry.loserUsername || 'Unknown';

            // Timestamp
            const time = document.createElement('time');
            time.className = 'kill-feed-time';

            if (Number.isFinite(Number(entry.endedAt))) {
                time.dateTime = new Date(Number(entry.endedAt)).toISOString();
                time.textContent = new Date(
                    Number(entry.endedAt)
                ).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit'
                });
            }

            item.append(winner, result, loser, time);
            feed.appendChild(item);
        });
    }

    window.KillFeed = { update };
})();
