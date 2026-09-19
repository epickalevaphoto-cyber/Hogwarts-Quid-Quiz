// js/player.js
let user = null;
let currentChatTab = 'team'; // 'team' или 'global'
let isRequesting = false;

document.addEventListener('DOMContentLoaded', () => {
  user = requireAuth('player');
  if (!user) return;

  document.getElementById('player-info').textContent = `${user.username} (${user.team_code === 'team_1' ? 'Команда 1' : 'Команда 2'})`;

  // Форма ответа / вопроса
  const actionForm = document.getElementById('answer-form');
  if (actionForm) {
    actionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('answer-input');
      const val = input.value.trim();
      if (!val) return;

      // Если сейчас нет вопроса и ход нашей команды — это Задание вопроса (60 сек)
      const qBox = document.getElementById('question-box').dataset.rawQuestion;
      if (!qBox) {
        await apiRequest('update_state', { 
          current_question: `${user.username}: ${val}`,
          timer_seconds: 90 // Даем 1.5 минуты на ответ соперникам
        });
      } else {
        // Иначе это Отправка ответа в общий чат
        await apiRequest('send_chat', {
          sender_name: `${user.username} (ОТВЕТ)`,
          message: val,
          team_code: 'global'
        });
      }
      input.value = '';
      syncPlayer();
    });
  }

  // Форма чата
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const val = input.value.trim();
      if (!val) return;

      await apiRequest('send_chat', {
        sender_name: user.username,
        message: val,
        team_code: currentChatTab === 'team' ? user.team_code : 'global'
      });
      input.value = '';
      syncPlayer();
    });
  }

  syncPlayer();
  setInterval(syncPlayer, 2500); // Опрос без перегрузки сети
});

async function syncPlayer() {
  if (isRequesting) return;
  isRequesting = true;

  const res = await apiRequest('get_state');
  isRequesting = false;
  if (!res.success) return;

  const state = res.state;

  // 1. Таймер (1 мин / 1.5 мин)
  const timeLeft = Math.max(0, Math.round((state.timer_end - Date.now()) / 1000));
  document.getElementById('timer-box').textContent = `${timeLeft} сек.`;

  // 2. Вопрос
  const qEl = document.getElementById('question-box');
  qEl.dataset.rawQuestion = state.current_question;
  qEl.textContent = state.current_question || 'Ожидание вопроса от атакующей пары...';

  // 3. Очередь
  const isMyTurn = state.current_turn === user.team_code;
  const turnEl = document.getElementById('turn-box');
  turnEl.textContent = isMyTurn ? 'ВАШ ХОД (Задайте вопрос или отвечайте)' : 'Ход соперников';
  turnEl.style.color = isMyTurn ? '#4cd137' : '#e74c3c';

  // 4. Фильтрация чата (Раздельный командный / общий)
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const showInTeam = (currentChatTab === 'team' && msg.team_code === user.team_code);
      const showInGlobal = (currentChatTab === 'global' && msg.team_code === 'global');

      if (showInTeam || showInGlobal) {
        const div = document.createElement('div');
        div.style.marginBottom = '6px';
        div.innerHTML = `<strong style="color: #f1c40f;">${msg.sender_name}:</strong> ${msg.message}`;
        chatBox.appendChild(div);
      }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

function switchTab(tab) {
  currentChatTab = tab;
  document.getElementById('tab-team').style.opacity = tab === 'team' ? '1' : '0.5';
  document.getElementById('tab-global').style.opacity = tab === 'global' ? '1' : '0.5';
  syncPlayer();
}
