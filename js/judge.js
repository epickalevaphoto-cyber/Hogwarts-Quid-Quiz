// js/judge.js
let judgeState = {};
let isJudgeRequesting = false;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('judge');
  syncJudge();
  setInterval(syncJudge, 2500);
});

async function syncJudge() {
  if (isJudgeRequesting) return;
  isJudgeRequesting = true;

  const res = await apiRequest('get_state');
  isJudgeRequesting = false;
  if (!res.success) return;

  judgeState = res.state;

  document.getElementById('score-a').textContent = judgeState.team_a_score;
  document.getElementById('score-b').textContent = judgeState.team_b_score;
  document.getElementById('current-turn-display').textContent = judgeState.current_turn === 'team_1' ? 'Команда 1' : 'Команда 2';
  
  const timeLeft = Math.max(0, Math.round((judgeState.timer_end - Date.now()) / 1000));
  document.getElementById('timer-display').textContent = `${timeLeft} сек.`;

  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const div = document.createElement('div');
      div.style.marginBottom = '4px';
      div.innerHTML = `<small>[${msg.team_code}]</small> <strong>${msg.sender_name}:</strong> ${msg.message}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Запуск таймера: 60 сек (1 мин на вопрос) или 90 сек (1.5 мин на ответ)
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
  const next = judgeState.current_turn === 'team_1' ? 'team_2' : 'team_1';
  await apiRequest('update_state', { 
    current_turn: next,
    current_question: '', // Сброс вопроса для следующей пары
    timer_seconds: 60     // 1 минута новой паре на вопрос
  });
  syncJudge();
}
