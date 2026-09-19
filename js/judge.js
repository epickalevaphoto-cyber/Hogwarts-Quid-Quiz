// js/judge.js

let currentGameState = {
  team_a_score: 0,
  team_b_score: 0,
  current_step: 1,
  status: 'waiting',
  snitch_status: 'hidden',
  snitch_winner: ''
};

// Проверяем права судьи
document.addEventListener('DOMContentLoaded', () => {
  requireAuth('judge');
  syncGameState();
  setInterval(syncGameState, 2000); // Синхронизация каждые 2 секунды
});

async function syncGameState() {
  const res = await apiRequest('get_state');
  if (res.success && res.state) {
    currentGameState = res.state;
    updateUI();
  }
}

function updateUI() {
  document.getElementById('score-a').textContent = currentGameState.team_a_score;
  document.getElementById('score-b').textContent = currentGameState.team_b_score;
  document.getElementById('current-step').textContent = currentGameState.current_step;
  
  const statusEl = document.getElementById('match-status');
  if (statusEl) {
    statusEl.textContent = currentGameState.status === 'in_progress' ? 'Идет матч' : 'Ожидание';
  }
}

async function changeScore(team, delta) {
  if (team === 'a') {
    currentGameState.team_a_score = Math.max(0, Number(currentGameState.team_a_score) + delta);
  } else {
    currentGameState.team_b_score = Math.max(0, Number(currentGameState.team_b_score) + delta);
  }
  
  updateUI();
  await apiRequest('update_score', {
    team_a_score: currentGameState.team_a_score,
    team_b_score: currentGameState.team_b_score
  });
}

async function nextStep() {
  currentGameState.current_step = Number(currentGameState.current_step) + 1;
  currentGameState.status = 'in_progress';
  
  updateUI();
  await apiRequest('update_score', {
    current_step: currentGameState.current_step,
    status: currentGameState.status
  });
}

async function toggleSnitch(snitchStatus) {
  currentGameState.snitch_status = snitchStatus;
  await apiRequest('update_score', {
    snitch_status: snitchStatus
  });
  alert(snitchStatus === 'appeared' ? 'Снитч запущен!' : 'Снитч скрыт.');
}
