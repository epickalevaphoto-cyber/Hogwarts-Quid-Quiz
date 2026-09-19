// js/judge.js
let judgeState = {};
let isRequesting = false;

const STAGES = [
  "1. Первые Охотники (Охотники 1)",
  "2. Вторые Охотники (Охотники 2)",
  "3. Третьи Охотники (Охотники 3)",
  "4. Первые Загонщики (Загонщики 1)",
  "5. Вторые Загонщики (Загонщики 2)",
  "6. Третьи Загонщики (Загонщики 3)",
  "7. Первые Ловцы (Ловцы 1)",
  "8. Вторые Ловцы (Ловцы 2)",
  "9. Вратари"
];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth('judge');
  syncJudge();
  setInterval(syncJudge, 1500);

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const val = input.value.trim();
      if (!val) return;
      await apiRequest('send_chat', { sender_name: 'СУДЬЯ', message: val, team_code: 'global' });
      input.value = '';
      syncJudge();
    });
  }
});

async function syncJudge() {
  if (isRequesting) return;
  isRequesting = true;

  const res = await apiRequest('get_state');
  isRequesting = false;
  if (!res || !res.success) return;

  judgeState = res.state;

  // Безопасное обновление элементов (с проверкой на null)
  const stepIdx = judgeState.current_step || 0;
  
  const elStage = document.getElementById('stage-display');
  if (elStage) elStage.textContent = STAGES[stepIdx] || "Финал";

  const elTurn = document.getElementById('turn-display');
  if (elTurn) elTurn.textContent = judgeState.current_turn === 'team_1' ? 'Команда А' : 'Команда Б';

  const elScoreA = document.getElementById('score-a');
  if (elScoreA) elScoreA.textContent = judgeState.team_a_score;

  const elScoreB = document.getElementById('score-b');
  if (elScoreB) elScoreB.textContent = judgeState.team_b_score;

  // Безопасный таймер
  const now = Date.now();
  const timerEnd = Number(judgeState.timer_end) || 0;
  const secondsLeft = Math.max(0, Math.ceil((timerEnd - now) / 1000));

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  
  const elTimer = document.getElementById('timer-display');
  if (elTimer) elTimer.textContent = `${mins}:${secs}`;

  // Отрисовка чата
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      let text = msg.message;
      if (text.startsWith('[IMAGE]')) {
        const imgData = text.replace('[IMAGE]', '');
        text = `<br><img src="${imgData}" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid #f1c40f; margin-top: 5px;">`;
      }
      const div = document.createElement('div');
      div.style.marginBottom = '6px';
      div.innerHTML = `<small style="color:#777;">[${msg.team_code}]</small> <strong style="color:#f1c40f;">${msg.sender_name}:</strong> ${text}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

async function startTimer(seconds) {
  await apiRequest('update_state', { timer_seconds: seconds });
  syncJudge();
}

async function passTurn() {
  let nextTurn = judgeState.current_turn === 'team_1' ? 'team_2' : 'team_1';
  let nextStep = judgeState.current_step || 0;

  if (judgeState.current_turn === 'team_2') {
    nextStep = (nextStep + 1) % STAGES.length;
  }

  await apiRequest('update_state', {
    current_turn: nextTurn,
    current_step: nextStep,
    timer_seconds: 60
  });
  syncJudge();
}

async function addScore(team, delta) {
  let a = judgeState.team_a_score || 0;
  let b = judgeState.team_b_score || 0;
  if (team === 'a') a = Math.max(0, a + delta);
  if (team === 'b') b = Math.max(0, b + delta);
  await apiRequest('update_state', { team_a_score: a, team_b_score: b });
  syncJudge();
}
