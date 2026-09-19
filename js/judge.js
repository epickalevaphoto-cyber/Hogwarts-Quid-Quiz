let localState = {};

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('judge');
  syncJudge();
  setInterval(syncJudge, 2000);

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      if (input.value.trim()) {
        await apiRequest('send_chat', {
          sender_name: 'СУДЬЯ',
          message: input.value.trim(),
          team_code: 'global'
        });
        input.value = '';
        syncJudge();
      }
    });
  }
});

async function syncJudge() {
  const res = await apiRequest('get_state');
  if (!res.success) return;

  localState = res.state;

  document.getElementById('score-a').textContent = localState.team_a_score;
  document.getElementById('score-b').textContent = localState.team_b_score;
  document.getElementById('current-turn-display').textContent = localState.current_turn === 'team_1' ? 'Команда 1 (А)' : 'Команда 2 (Б)';
  document.getElementById('timer-display').textContent = localState.timer_seconds;
  document.getElementById('active-question').textContent = localState.current_question || '—';

  // Отрисовка сообщений
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const div = document.createElement('div');
      div.style.marginBottom = '5px';
      div.innerHTML = `<small>[${msg.team_code}]</small> <strong>${msg.sender_name}:</strong> ${msg.message}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Строгое математическое сложение чисел для исправления ошибок со счетом
async function addScore(team, delta) {
  let scoreA = Number(localState.team_a_score) || 0;
  let scoreB = Number(localState.team_b_score) || 0;

  if (team === 'a') scoreA = Math.max(0, scoreA + delta);
  if (team === 'b') scoreB = Math.max(0, scoreB + delta);

  await apiRequest('update_score', { team_a_score: scoreA, team_b_score: scoreB });
  syncJudge();
}

async function switchTurn() {
  const nextTurn = localState.current_turn === 'team_1' ? 'team_2' : 'team_1';
  await apiRequest('update_score', { current_turn: nextTurn });
  syncJudge();
}

async function startTimer(seconds) {
  await apiRequest('update_score', { timer_seconds: seconds });
  syncJudge();
}

async function sendQuestion() {
  const q = document.getElementById('question-input').value.trim();
  if (q) {
    await apiRequest('update_score', { current_question: q, timer_seconds: 30 });
    document.getElementById('question-input').value = '';
    syncJudge();
  }
}
