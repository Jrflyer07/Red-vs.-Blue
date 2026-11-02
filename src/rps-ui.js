// UI for a single Red vs. Blue flag contest. The server owns all moves,
// deadlines, results, and scores; the browser only presents public state.
(function (root) {
    'use strict';

    const MOVES = ['rock', 'paper', 'scissors'];
    const RESULT_VISIBLE_MS = 20000;

    function contestantRole(contest, username) {
        if (!contest || typeof username !== 'string') return null;
        const name = username.toLowerCase();
        if (name === String(contest.defenderUsername || '').toLowerCase()) return 'defender';
        if (name === String(contest.challengerUsername || '').toLowerCase()) return 'challenger';
        return null;
    }

    function alreadyPlayed(contest, role) {
        return role === 'defender' ? Boolean(contest?.defenderSubmitted)
            : role === 'challenger' ? Boolean(contest?.challengerSubmitted) : false;
    }

    function contestMessage(contest, username) {
        if (!contest || contest.status !== 'active') return '';
        const role = contestantRole(contest, username);
        if (!role) return `${contest.defenderUsername} and ${contest.challengerUsername} are contesting the flag.`;
        return alreadyPlayed(contest, role) ? 'Move submitted. Waiting for the opponent.'
            : 'Choose Rock, Paper, or Scissors to defend or capture the flag.';
    }

    function contestResult(result, username) {
        if (!result || !username) return null;
        const name = username.toLowerCase();
        const won = String(result.winnerUsername || '').toLowerCase() === name;
        const lost = String(result.loserUsername || '').toLowerCase() === name;
        if (!won && !lost) return null;
        return {
            won,
            title: won ? 'You won the flag!' : 'You lost the contest',
            message: won ? 'Your team controls the flag. Nice play!'
                : 'You have a 30-second cooldown before challenging again.',
            reason: result.reason === 'timeout' ? 'Decided by timeout.' : 'Decided by Rock, Paper, Scissors.'
        };
    }

    function secondsLeft(expiresAt, serverNowMs) {
        if (!Number.isFinite(expiresAt) || !Number.isFinite(serverNowMs)) return 0;
        return Math.max(0, Math.ceil((expiresAt - serverNowMs) / 1000));
    }

    function create({ getUsername, submitMove, onState }) {
        const overlay = document.getElementById('rpsOverlay');
        const title = document.getElementById('rpsTitle');
        const opponent = document.getElementById('rpsOpponent');
        const clock = document.getElementById('rpsClock');
        const feedback = document.getElementById('rpsFeedback');
        const choices = document.getElementById('rpsChoices');
        const dismiss = document.getElementById('rpsDismiss');
        const buttons = Array.from(choices.querySelectorAll('[data-rps-move]'));

        let state = null;
        let clockOffset = 0;
        let pending = false;
        let errorMessage = '';
        let renderedRound = '';
        let dismissedResultId = null;

        function serverNow() { return Date.now() + clockOffset; }

        function activeContest() {
            return state?.contest?.status === 'active' ? state.contest : null;
        }

        function renderClock() {
            const contest = activeContest();
            if (!contest || overlay.hidden) return;
            const remaining = secondsLeft(Number(contest.expiresAt), serverNow());
            clock.textContent = `${remaining}s left`;
            const role = contestantRole(contest, getUsername());
            const disabled = pending || !role || alreadyPlayed(contest, role) || remaining === 0;
            for (const button of buttons) button.disabled = disabled;
            if (remaining === 0) feedback.textContent = 'Time is up. Waiting for the server to settle the flag.';
        }

        function render() {
            const contest = activeContest();
            const username = getUsername();
            const role = contestantRole(contest, username);
            const roundId = contest && `${contest.id}:${contest.round}`;

            if (contest && role) {
                if (roundId !== renderedRound) {
                    renderedRound = roundId;
                    errorMessage = '';
                }
                overlay.hidden = false;
                choices.hidden = false;
                dismiss.hidden = true;
                title.textContent = `Rock • Paper • Scissors — Round ${contest.round}`;
                opponent.textContent = role === 'defender'
                    ? `Defend your flag against ${contest.challengerUsername}`
                    : `Challenge ${contest.defenderUsername} for the flag`;
                feedback.textContent = errorMessage || (pending ? 'Sending your move…'
                    : alreadyPlayed(contest, role) ? 'Move locked in. Waiting for the opponent.'
                        : 'Choose your move before the timer runs out.');
                renderClock();
                return;
            }

            renderedRound = '';
            const last = state?.lastContest;
            const result = contest ? null : contestResult(last, username);
            const recentlyFinished = result && last.id !== dismissedResultId &&
                serverNow() >= Number(last.endedAt) &&
                serverNow() - Number(last.endedAt) < RESULT_VISIBLE_MS;

            if (recentlyFinished) {
                overlay.hidden = false;
                choices.hidden = true;
                dismiss.hidden = false;
                title.textContent = result.title;
                opponent.textContent = result.message;
                feedback.textContent = result.reason;
                clock.textContent = '';
            } else {
                overlay.hidden = true;
            }
        }

        function sync(nextState) {
            state = nextState;
            const serverTimestamp = Date.parse(nextState?.serverNow);
            if (Number.isFinite(serverTimestamp)) clockOffset = serverTimestamp - Date.now();
            render();
        }

        async function choose(move) {
            const contest = activeContest();
            const role = contestantRole(contest, getUsername());
            if (!MOVES.includes(move) || !role || pending ||
                alreadyPlayed(contest, role) || secondsLeft(Number(contest.expiresAt), serverNow()) === 0) return;

            pending = true;
            errorMessage = '';
            const { id: contestId, round } = contest;
            render();
            try {
                const next = await submitMove({ contestId, round, move });
                if (next) onState(next);
            } catch (error) {
                errorMessage = error.message || 'Could not send move. Please try again.';
            } finally {
                pending = false;
                render();
            }
        }

        for (const button of buttons) {
            button.addEventListener('click', () => choose(button.dataset.rpsMove));
        }
        dismiss.addEventListener('click', () => {
            dismissedResultId = state?.lastContest?.id || null;
            render();
        });
        // Countdown is local display only. Timeout decisions happen on the server.
        setInterval(renderClock, 250);

        return {
            sync,
            refresh: render,
            isContested: () => Boolean(activeContest()),
            notice: () => contestMessage(activeContest(), getUsername())
        };
    }

    const api = { create, contestantRole, alreadyPlayed, contestMessage, contestResult, secondsLeft };
    root.RpsUI = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
