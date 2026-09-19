// js/player.js

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth('player');
  if (!user) return;

  // Отображаем имя игрока и позицию в шапке
  const infoEl = document.getElementById('player-info');
  if (infoEl) {
    infoEl.textContent = `${user.username} (${user.position_name || 'Игрок'})`;
  }

  loadPlayerState();
  setInterval(loadPlayerState, 2000); // Обновление счёта каждые 2 секунды
});

async function loadPlayerState() {
  const res = await apiRequest('get_state');
  if (res.success && res.state) {
    const state = res.state;
    
    document.getElementById('score-a').textContent = state.team_a_score;
    document.getElementById('score-b').textContent = state.team_b_score;
    document.getElementById('current-step').textContent = state.current_step;
    
    const snitchEl = document.getElementById('snitch-status-text');
    if (snitchEl) {
      if (state.snitch_status === 'appeared') {
        snitchEl.textContent = '⚡ СНИТЧ НА ПОЛЕ!';
        snitchEl.style.color = '#ffd700';
      } else {
        snitchEl.textContent = 'Снитч спрятан';
        snitchEl.style.color = '#888';
      }
    }
  }
}
