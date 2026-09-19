// js/player.js
let user = null;
let currentChatTab = 'team';
let isPlayerRequesting = false;

const STAGES = [
  "1. Первые Охотники",
  "2. Вторые Охотники",
  "3. Загонщики",
  "4. Ловцы",
  "5. Вратари"
];

document.addEventListener('DOMContentLoaded', () => {
  user = requireAuth('player');
  if (!user) return;

  document.getElementById('player-info').textContent = `${user.username} [${user.position_name || 'Игрок'}]`;

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const val = input.value.trim();
      if (!val) return;

      await apiRequest('send_chat', {
        sender_name: `${user.username} (${user.position_name || 'Игрок'})`,
        message: val,
        team_code: currentChatTab === 'team' ? user.team_code : 'global'
      });
      input.value = '';
      syncPlayer();
    });
  }

  syncPlayer();
  setInterval(syncPlayer, 1500);
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

  // 1. Текущий этап дуэлей
  const stepIdx = state.current_step || 0;
  document.getElementById('current-stage').textContent = `Этап: ${STAGES[stepIdx] || 'Финал'}`;

  // 2. Проверка очереди хода
  const isMyTeamTurn = state.current_turn === user.team_code;
  const turnBox = document.getElementById('turn-box');
  
  if (isMyTeamTurn) {
    turnBox.textContent = 'ВАША КОМАНДА АТАКУЕТ / ОТВЕЧАЕТ!';
    turnBox.style.color = '#2ecc71';
  } else {
    turnBox.textContent = 'Ход соперников';
    turnBox.style.color = '#e74c3c';
  }

  // 3. Обратный отсчет таймера
  const now = Date.now();
  const timerEnd = Number(state.timer_end) || 0;
  const secondsLeft = Math.max(0, Math.ceil((timerEnd - now) / 1000));

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById('timer-box').textContent = `${mins}:${secs}`;

  // 4. Сообщения чата + КАРТИНКИ
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const showInTeam = (currentChatTab === 'team' && msg.team_code === user.team_code);
      const showInGlobal = (currentChatTab === 'global' && msg.team_code === 'global');

      if (showInTeam || showInGlobal) {
        let content = msg.message;
        if (content.startsWith('[IMAGE]')) {
          const imgData = content.replace('[IMAGE]', '');
          content = `<br><img src="${imgData}" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid #f1c40f; margin-top: 5px;">`;
        }

        const div = document.createElement('div');
        div.style.marginBottom = '6px';
        div.innerHTML = `<strong style="color: #f1c40f;">${msg.sender_name}:</strong> ${content}`;
        chatBox.appendChild(div);
      }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Загрузка и легкое сжатие изображения
async function uploadImage() {
  const fileInput = document.getElementById('image-file-input');
  const file = fileInput.files[0];

  if (!file) {
    alert('Выберите файл с изображением!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = async function() {
      // Сжимаем изображение, чтобы не перегружать скрипт
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxWidth = 500;
      const scale = maxWidth / img.width;

      canvas.width = img.width > maxWidth ? maxWidth : img.width;
      canvas.height = img.width > maxWidth ? img.height * scale : img.height;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      await apiRequest('send_chat', {
        sender_name: `${user.username} (${user.position_name || 'Игрок'})`,
        message: `[IMAGE]${base64}`,
        team_code: currentChatTab === 'team' ? user.team_code : 'global'
      });

      fileInput.value = '';
      syncPlayer();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
