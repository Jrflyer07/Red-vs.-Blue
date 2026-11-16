
(function () {
    'use strict';

    const gamerLines = [
        ' absolutely REKT ',
        ' 360 NO-SCOPED ',
        ' obliterated ',
        ' DESTROYED ',
        ' completely OBLITERATED ',
        ' sent packing ',
        ' quickscoped ',
        ' dunked on ',
        ' deleted ',
        ' dominated ',
        ' outplayed ',
        ' sent straight to the lobby ',
        ' hit with the MLG COMBO ',
        ' absolutely SMOKED ',
        ' annihilated ',
        ' destroyed with a SKILL ISSUE ',
        ' sent to the shadow realm: '
    ];

    const assignedMessages = new Map();

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

        const latestEntries = [...entries]
            .sort((a, b) => Number(b.endedAt) - Number(a.endedAt))
            .slice(0, 5);

        latestEntries.forEach(entry => {
            const item = document.createElement('li');
            item.className = 'kill-feed-entry';

            const winnerTeam =
                String(entry.winnerTeam || '').toLowerCase();

            const loserTeam = winnerTeam === 'red' ? 'blue' : 'red';

            const messageKey = String(
                entry.id ||
                `${entry.endedAt}-${entry.winnerUsername}-${entry.loserUsername}`
            );

            if (!assignedMessages.has(messageKey)) {
                const randomIndex = Math.floor(
                    Math.random() * gamerLines.length
                );

                assignedMessages.set(
                    messageKey,
                    gamerLines[randomIndex]
                );
            }

            const winner = document.createElement('strong');
            winner.className =
                winnerTeam === 'red' ? 'kill-feed-red' : 'kill-feed-blue';
            winner.textContent = entry.winnerUsername || 'Unknown';

            const result = document.createElement('span');
            result.className = 'kill-feed-result';
            result.textContent = assignedMessages.get(messageKey);

            const loser = document.createElement('strong');
            loser.className =
                loserTeam === 'red' ? 'kill-feed-red' : 'kill-feed-blue';
            loser.textContent = entry.loserUsername || 'Unknown';

            const time = document.createElement('time');
            time.className = 'kill-feed-time';

            if (Number.isFinite(Number(entry.endedAt))) {
                time.dateTime = new Date(
                    Number(entry.endedAt)
                ).toISOString();

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

        if (assignedMessages.size > 50) {
            const activeKeys = new Set(
                latestEntries.map(entry => String(
                    entry.id ||
                    `${entry.endedAt}-${entry.winnerUsername}-${entry.loserUsername}`
                ))
            );

            for (const key of assignedMessages.keys()) {
                if (!activeKeys.has(key)) {
                    assignedMessages.delete(key);
                }
            }
        }
    }

    window.KillFeed = { update };
})();
