// Read-only RPS spectator view. Uses the same public /api/state payload as the
// scoreboard. Only the two actual contestants can submit moves in rps-ui.js.
(function (root) {
    'use strict';

    const DRAW_NOTICE_MS = 1500;
    const RESULT_VISIBLE_MS = 20000;

    function isParticipant(contest, username) {
        if (!contest || typeof username !== 'string') return false;
        const name = username.toLowerCase();
        return [contest.defenderUsername, contest.challengerUsername]
            .some(player => String(player || '').toLowerCase() === name);
    }

    function isResultParticipant(result, username) {
        if (!result || typeof username !== 'string') return false;
        const name = username.toLowerCase();
        return [result.winnerUsername, result.loserUsername]
            .some(player => String(player || '').toLowerCase() === name);
    }

    function secondsLeft(expiresAt, now) {
        if (!Number.isFinite(expiresAt) || !Number.isFinite(now)) return 0;
        return Math.max(0, Math.ceil((expiresAt - now) / 1000));
    }

    function submittedLabel(username, submitted) {
        return `${username}: ${submitted ? 'Move submitted' : 'Waiting for move'}`;
    }

    function create({ getUsername }) {
        const area = document.getElementById('spectatorArea');
        const toggle = document.getElementById('spectatorToggle');
        const panel = document.getElementById('spectatorPanel');
        const title = document.getElementById('spectatorTitle');
        const matchup = document.getElementById('spectatorMatchup');
        const round = document.getElementById('spectatorRound');
        const clock = document.getElementById('spectatorClock');
        const defender = document.getElementById('spectatorDefender');
        const challenger = document.getElementById('spectatorChallenger');
        const announcement = document.getElementById('spectatorAnnouncement');

        let state = null;
        let expanded = false;
        let watchedContestId = null;
        let drawNoticeRound = null;
        let drawNoticeUntil = 0;
        let serverOffset = 0;

        function now() { return Date.now() + serverOffset; }

        function render() {
            const contest = state?.contest || null;
            const last = state?.lastContest || null;
            const username = getUsername();
            const activeAvailable = Boolean(contest && !isParticipant(contest, username));
            const resultAllowed = Boolean(last && !isResultParticipant(last, username));
            const resultIsRecent = resultAllowed && Number.isFinite(Number(last.endedAt)) &&
                now() >= Number(last.endedAt) && now() - Number(last.endedAt) < RESULT_VISIBLE_MS;
            const followingResult = !contest && resultAllowed && expanded &&
                watchedContestId === last.id;
            const canView = activeAvailable || (!contest && (resultIsRecent || followingResult));

            area.hidden = !canView;
            if (!canView) {
                expanded = false;
                panel.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
                return;
            }

            toggle.textContent = expanded ? 'Hide spectator view'
                : contest ? 'Spectate RPS' : 'View RPS result';
            toggle.setAttribute('aria-expanded', String(expanded));
            panel.hidden = !expanded;
            if (!expanded) return;

            if (contest) {
                watchedContestId = contest.id;
                title.textContent = 'RPS — Live spectator';
                matchup.textContent = `${contest.defenderUsername} (defender) vs ${contest.challengerUsername} (challenger)`;
                round.textContent = `Round ${contest.round}`;
                clock.textContent = `${secondsLeft(Number(contest.expiresAt), now())}s left`;
                defender.textContent = submittedLabel(contest.defenderUsername, contest.defenderSubmitted);
                challenger.textContent = submittedLabel(contest.challengerUsername, contest.challengerSubmitted);

                const noticeActive = drawNoticeRound === `${contest.id}:${contest.round}` &&
                    Date.now() < drawNoticeUntil;
                announcement.textContent = noticeActive
                    ? `DRAW! Round ${contest.round - 1} tied. A fresh round has started.`
                    : secondsLeft(Number(contest.expiresAt), now()) === 0
                        ? 'Time is up. Waiting for the server to finalize the result.'
                        : contest.round > 1
                            ? 'A previous round ended in a draw. Moves remain hidden.'
                            : 'Watch the round progress. Moves remain hidden.';
            } else if (last) {
                title.textContent = 'RPS — Final result';
                matchup.textContent = `${last.winnerUsername} defeated ${last.loserUsername}`;
                round.textContent = `Final round: ${last.round}`;
                clock.textContent = 'Contest complete';
                defender.textContent = `Winner: ${last.winnerUsername}`;
                challenger.textContent = `Loser: ${last.loserUsername}`;
                announcement.textContent = last.reason === 'timeout'
                    ? 'Decided by timeout.' : 'Decided by Rock, Paper, Scissors.';
            }
        }

        function sync(nextState) {
            const previous = state?.contest;
            const next = nextState?.contest;
            if (previous && next && previous.id === next.id &&
                Number.isSafeInteger(previous.round) && Number.isSafeInteger(next.round) &&
                next.round > previous.round) {
                drawNoticeRound = `${next.id}:${next.round}`;
                drawNoticeUntil = Date.now() + DRAW_NOTICE_MS;
            } else if (!next || !previous || next.id !== previous.id ||
                next.round < previous.round) {
                drawNoticeRound = null;
                drawNoticeUntil = 0;
            }

            state = nextState;
            const serverTime = Date.parse(nextState?.serverNow);
            if (Number.isFinite(serverTime)) serverOffset = serverTime - Date.now();
            render();
        }

        toggle.addEventListener('click', () => {
            if (area.hidden) return;
            expanded = !expanded;
            if (expanded) watchedContestId = state?.contest?.id || state?.lastContest?.id || null;
            render();
        });

        // The server remains authoritative; this only updates the countdown text.
        setInterval(render, 250);
        return { sync, refresh: render };
    }

    const api = { create, isParticipant, secondsLeft, submittedLabel };
    root.RpsSpectator = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
