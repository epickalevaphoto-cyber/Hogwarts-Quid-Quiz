// js/snitch.js

async function releaseSnitch() {
  const res = await apiRequest('update_score', {
    snitch_status: 'appeared',
    snitch_winner: ''
  });

  if (res.success) {
    alert('⚡ Снитч успешно выпущен на поле!');
  } else {
    alert('Ошибка при запуске Снитча');
  }
}

async function catchSnitch(teamName) {
  if (!teamName) {
    teamName = prompt('Укажите команду, поймавшую Снитч (team_1 или team_2):');
  }
  if (!teamName) return;

  // При ловле Снитча добавляем 150 очков команде
  const stateRes = await apiRequest('get_state');
  if (!stateRes.success) return;

  let currentA = Number(stateRes.state.team_a_score);
  let currentB = Number(stateRes.state.team_b_score);

  if (teamName === 'team_1' || teamName === 'a') {
    currentA += 150;
  } else {
    currentB += 150;
  }

  const res = await apiRequest('update_score', {
    team_a_score: currentA,
    team_b_score: currentB,
    snitch_status: 'caught',
    snitch_winner: teamName
  });

  if (res.success) {
    alert(`🏆 Снитч пойман! +150 очков зачислено команде ${teamName}!`);
  }
}

async function hideSnitch() {
  const res = await apiRequest('update_score', {
    snitch_status: 'hidden',
    snitch_winner: ''
  });

  if (res.success) {
    alert('Снитч убран с поля.');
  }
}
