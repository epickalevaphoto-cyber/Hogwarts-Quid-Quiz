// js/player.js
let user = null;
let currentChatTab = 'team'; // 'team' или 'global'
let isPlayerRequesting = false;

document.addEventListener('DOMContentLoaded', () => {
  user = requireAuth('player');
  if (!user) return;

  const teamName = user.team_code === 'team_1' ? 'Команда А' : 'Команда Б';
  document.getElementById('player-info').textContent = `${user.username} [${teamName}]`;

  // Отправка сообщений
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;

      await apiRequest('send_chat', {
        sender_name: `${user.username} (${user.position_name || 'Игрок'})`,
        message: text,
        team_code: currentChatTab === 'team' ? user.team_code : 'global'
      });
      input.value = '';
      syncPlayer();
    });
  }

  syncPlayer();
  setInterval(syncPlayer, 2000);
});

function switchTab(tab) {
  currentChatTab = tab;
  document.getElementById('tab-team').style.opacity = tab === 'team' ? '1' : '0.6';
  document.getElementById('tab-global').style.opacity = tab === 'global' ? '1' : '0.6';
  syncPlayer();
}

async function syncPlayer() {
  if (isPlayerRequesting) return;
  isPlayerRequesting = true;

  const res = await apiRequest('get_state');
  isPlayerRequesting = false;
  if (!res.success) return;

  const state = res.state;

  // 1. Таймер ММ:СС
  const now = Date.now();
  const timerEnd = Number(state.timer_end) || 0;
  const secondsLeft = Math.max(0, Math.floor((timerEnd - now) / 1000));
  
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById('timer-box').textContent = `${mins}:${secs}`;

  // 2. Ход
  const isMyTurn = state.current_turn === user.team_code;
  const turnBox = document.getElementById('turn-box');
  turnBox.textContent = isMyTurn ? 'ВАША КОМАНДА ХОДИТ!' : 'Ходят соперники';
  turnBox.style.color = isMyTurn ? '#2ecc71' : '#e74c3c';

  // 3. Сообщения
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const isTeamMsg = (currentChatTab === 'team' && msg.team_code === user.team_code);
      const isGlobalMsg = (currentChatTab === 'global' && msg.team_code === 'global');

      if (isTeamMsg || isGlobalMsg) {
        const div = document.createElement('div');
        div.style.marginBottom = '6px';
        div.innerHTML = `<strong style="color: #f1c40f;">${msg.sender_name}:</strong> ${msg.message}`;
        chatBox.appendChild(div);
      }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
