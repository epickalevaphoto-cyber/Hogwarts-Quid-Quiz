// js/chat.js

let chatInterval = null;

async function loadChatMessages() {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  const res = await apiRequest('get_state');
  if (res.success && res.chat) {
    chatContainer.innerHTML = '';
    res.chat.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-message';
      msgDiv.innerHTML = `<strong>${msg.sender_name}:</strong> ${msg.message}`;
      chatContainer.appendChild(msgDiv);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

async function sendChatMessage(message) {
  const user = getCurrentUser();
  if (!user || !message.trim()) return;

  const res = await apiRequest('send_chat', {
    sender_name: `${user.username} (${user.position_name || user.role})`,
    message: message.trim()
  });

  if (res.success) {
    loadChatMessages();
  } else {
    alert('Не удалось отправить сообщение.');
  }
}

function initChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  if (form && input) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value;
      if (text) {
        await sendChatMessage(text);
        input.value = '';
      }
    });
  }

  loadChatMessages();
  // Опрос сервера каждые 2 секунды вместо Realtime
  if (!chatInterval) {
    chatInterval = setInterval(loadChatMessages, 2000);
  }
}

document.addEventListener('DOMContentLoaded', initChat);
