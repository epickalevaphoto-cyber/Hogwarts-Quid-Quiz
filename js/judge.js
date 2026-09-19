import { select, realtime } from "./supabase.js";
import { requireRole, secureRpc, logout } from "./auth.js";
import { renderChat, sendChat, subscribeChat } from "./chat.js";

const session = requireRole(["judge","admin"]);
if (!session) throw new Error("Нет сессии.");
const $ = id => document.getElementById(id);
let currentMatch = null;
let unsubscribeChat = null;

$("logout").addEventListener("click", logout);

async function loadMatches() {
  const rows = await select("matches", { order: "created_at.desc", limit: 30 });
  $("match-select").innerHTML = `<option value="">Выберите матч</option>` +
    rows.map(m => `<option value="${m.id}">${escapeHtml(m.title)} — ${statusLabel(m.status)}</option>`).join("");
  if (currentMatch) $("match-select").value = currentMatch.id;
}

async function loadMatch(id) {
  if (!id) {
    currentMatch = null;
    $("match-panel").hidden = true;
    return;
  }
  const result = await secureRpc("get_match_for_judge", { p_match_id: id });
  if (!result?.ok) throw new Error(result?.message || "Не удалось загрузить матч.");
  currentMatch = result;
  $("match-panel").hidden = false;
  render();
  await renderChat(id, $("chat"));
  if (unsubscribeChat) unsubscribeChat();
  unsubscribeChat = subscribeChat(id, $("chat"));
}

function render() {
  const m = currentMatch.match;
  $("match-title").textContent = m.title;
  $("status").textContent = statusLabel(m.status);
  $("stage").textContent = `Этап ${m.stage}`;
  $("team-a-name").textContent = currentMatch.teams[0]?.name || "Команда 1";
  $("team-b-name").textContent = currentMatch.teams[1]?.name || "Команда 2";
  $("team-a-score").textContent = currentMatch.teams[0]?.score ?? 0;
  $("team-b-score").textContent = currentMatch.teams[1]?.score ?? 0;
  $("player-team").innerHTML = currentMatch.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

  $("players").innerHTML = currentMatch.players.map(p => `
    <div class="roster-row">
      <span><b>${escapeHtml(p.display_name)}</b><small>${escapeHtml(p.username)}</small></span>
      <span>${positionLabel(p.position)}</span>
      <button class="danger small-btn" data-remove="${p.id}">Удалить</button>
    </div>
  `).join("") || `<div class="empty">Игроки ещё не назначены.</div>`;

  $("questions").innerHTML = currentMatch.questions.map(q => `
    <article class="question-card">
      <div><b>${escapeHtml(q.author_name || "Игрок")}</b> · ${escapeHtml(q.team_name)} · ${formatDate(q.created_at)}</div>
      <p>${escapeHtml(q.text)}</p>
      ${(q.answers || []).map(a => `
        <div class="answer">
          <b>${escapeHtml(a.author_name || "Ответ")}:</b> ${escapeHtml(a.text)}
          <span class="badge">${statusAnswer(a.status)}</span>
          ${a.status === "pending" ? `
            <button class="small-btn" data-answer="${a.id}" data-value="true">Правильно</button>
            <button class="small-btn danger" data-answer="${a.id}" data-value="false">Неправильно</button>` : ""}
        </div>`).join("")}
    </article>
  `).join("") || `<div class="empty">Вопросов пока нет.</div>`;

  $("catches").innerHTML = currentMatch.catches.map(c => `
    <article class="catch-card">
      <img src="${escapeAttr(c.image_url)}" alt="Фото снитча">
      <div><b>${escapeHtml(c.player_name)}</b><br>${escapeHtml(c.team_name)}<br>${formatDate(c.created_at)}
      <p><span class="badge">${c.status}</span></p></div>
      ${c.status === "pending" ? `<div class="actions"><button data-catch="${c.id}" data-action="approve">Подтвердить</button><button class="danger" data-catch="${c.id}" data-action="reject">Отклонить</button></div>` : ""}
    </article>
  `).join("") || `<div class="empty">Заявок нет.</div>`;
}

$("create-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const result = await secureRpc("create_match", {
      p_title: $("new-title").value.trim(),
      p_team1_name: $("new-team1").value.trim(),
      p_team2_name: $("new-team2").value.trim()
    });
    if (!result?.ok) throw new Error(result?.message || "Не удалось создать матч.");
    e.target.reset();
    await loadMatches();
    $("match-select").value = result.match.id;
    await loadMatch(result.match.id);
  } catch (err) { alert(err.message); }
});

$("match-select").addEventListener("change", () => loadMatch($("match-select").value).catch(err => alert(err.message)));

document.addEventListener("click", async e => {
  const stageButton = e.target.closest("[data-stage]");
  if (!stageButton || !currentMatch) return;
  try {
    await secureRpc("set_stage", {
      p_match_id: currentMatch.match.id,
      p_stage: Number(stageButton.dataset.stage)
    });
    await loadMatch(currentMatch.match.id);
  } catch (err) { alert(err.message); }
});

document.addEventListener("click", async e => {
  const start = e.target.closest("[data-status-action]");
  if (start && currentMatch) {
    try {
      await secureRpc(start.dataset.statusAction, { p_match_id: currentMatch.match.id });
      await loadMatch(currentMatch.match.id);
    } catch (err) { alert(err.message); }
  }

  const remove = e.target.closest("[data-remove]");
  if (remove && currentMatch) {
    if (!confirm("Удалить игрока из матча?")) return;
    try { await secureRpc("remove_match_player", { p_match_player_id: remove.dataset.remove }); await loadMatch(currentMatch.match.id); }
    catch (err) { alert(err.message); }
  }

  const answer = e.target.closest("[data-answer]");
  if (answer) {
    try { await secureRpc("judge_answer", { p_answer_id: answer.dataset.answer, p_is_correct: answer.dataset.value === "true" }); await loadMatch(currentMatch.match.id); }
    catch (err) { alert(err.message); }
  }

  const catchBtn = e.target.closest("[data-catch]");
  if (catchBtn) {
    try {
      const fn = catchBtn.dataset.action === "approve" ? "approve_snitch" : "reject_snitch";
      const result = await secureRpc(fn, { p_catch_id: catchBtn.dataset.catch });
      if (!result?.ok) throw new Error(result?.message || "Операция не выполнена.");
      await loadMatch(currentMatch.match.id);
    } catch (err) { alert(err.message); }
  }
});

$("add-player-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await secureRpc("add_match_player", {
      p_match_id: currentMatch.match.id,
      p_user_id: $("player-user").value,
      p_team_id: $("player-team").value,
      p_position: $("player-position").value
    });
    await loadMatch(currentMatch.match.id);
  } catch (err) { alert(err.message); }
});

$("chat-form").addEventListener("submit", async e => {
  e.preventDefault();
  try { await sendChat(currentMatch.match.id, $("chat-input").value); $("chat-input").value = ""; await renderChat(currentMatch.match.id, $("chat")); }
  catch (err) { alert(err.message); }
});

async function init() {
  $("judge-name").textContent = session.user.display_name;
  const users = await secureRpc("list_players");
  $("player-user").innerHTML = users.users.map(u => `<option value="${u.id}">${escapeHtml(u.display_name)} (@${escapeHtml(u.username)})</option>`).join("");
  await loadMatches();
}
init().catch(err => $("error").textContent = err.message);

realtime.subscribe({
  tables: ["matches","teams","match_players","questions","answers","snitch_catches","chat_messages"],
  callback: payload => {
    const id = payload.record?.match_id || payload.old_record?.match_id;
    if (currentMatch?.match?.id === id) loadMatch(id).catch(console.error);
    else loadMatches().catch(console.error);
  }
});

function positionLabel(p) { return ({keeper:"Вратарь",seeker:"Ловец",beater:"Загонщик",chaser:"Охотник"})[p] || p; }
function statusLabel(s) { return ({waiting:"Ожидание",stage_1:"Этап 1",stage_2:"Этап 2",stage_3:"Этап 3",paused:"Пауза",finished:"Завершён"})[s] || s; }
function statusAnswer(s) { return ({pending:"На проверке",correct:"Верно",incorrect:"Неверно"})[s] || s; }
function formatDate(v) { return new Date(v).toLocaleString("ru-RU"); }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function escapeAttr(v) { return escapeHtml(v).replace(/`/g,"&#096;"); }
