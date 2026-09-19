// js/judge.js
let judgeState = {};
let isJudgeRequesting = false;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('judge');
  syncJudge();
  setInterval(syncJudge, 2000);

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (text) {
        await apiRequest('send_chat', {
          sender_name: 'СУДЬЯ',
          message: text,
          team_code: 'global'
        });
        input.value = '';
        syncJudge();
      }
    });
  }
});

async function syncJudge() {
  if (isJudgeRequesting) return;
  isJudgeRequesting = true;

  const res = await apiRequest('get_state');
  isJudgeRequesting = false;
  if (!res.success) return;

  judgeState = res.state;

  // Отрисовка счета и очередности
  document.getElementById('score-a').textContent = judgeState.team_a_score;
  document.getElementById('score-b').textContent = judgeState.team_b_score;
  document.getElementById('current-turn-display').textContent = 
    judgeState.current_turn === 'team_1' ? 'Команда А (team_1)' : 'Команда Б (team_2)';

  // Форматирование таймера в ММ:СС
  const now = Date.now();
  const timerEnd = Number(judgeState.timer_end) || 0;
  const secondsLeft = Math.max(0, Math.floor((timerEnd - now) / 1000));
  
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${mins}:${secs}`;

  // Чат
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const div = document.createElement('div');
      div.style.marginBottom = '6px';
      div.innerHTML = `<span style="color: #888;">[${msg.team_code}]</span> <strong style="color: #f1c40f;">${msg.sender_name}:</strong> ${msg.message}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

async function startTimerSec(seconds) {
  await apiRequest('update_state', { timer_seconds: seconds });
  syncJudge();
}

async function addScoreStrict(team, delta) {
  let a = Number(judgeState.team_a_score) || 0;
  let b = Number(judgeState.team_b_score) || 0;

  if (team === 'a') a = Math.max(0, a + delta);
  if (team === 'b') b = Math.max(0, b + delta);

  await apiRequest('update_state', { team_a_score: a, team_b_score: b });
  syncJudge();
}

async function passTurn() {
  const nextTurn = judgeState.current_turn === 'team_1' ? 'team_2' : 'team_1';
  await apiRequest('update_state', { current_turn: nextTurn });
  syncJudge();
}
