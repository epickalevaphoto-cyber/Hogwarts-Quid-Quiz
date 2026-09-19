import { select, realtime } from "./supabase.js";
import { requireRole, secureRpc, logout } from "./auth.js";
import { renderChat, sendChat, subscribeChat } from "./chat.js";
import { initSnitch } from "./snitch.js";

const session = requireRole(["player", "captain"]);
if (!session) throw new Error("Нет сессии.");

const $ = id => document.getElementById(id);
let state = { match: null, team: null, player: null, teams: [] }; let snitchInitialized = false;

$("logout").addEventListener("click", logout);

async function load() {
  const result = await secureRpc("get_my_match");
  if (!result?.ok || !result.match) {
    $("empty-state").hidden = false;
    $("app").hidden = true;
    return;
  }
  state = result;
  $("empty-state").hidden = true;
  $("app").hidden = false;
  render();
  await renderChat(state.match.id, $("chat"));
  if (state.player.position === "seeker") {
    $("snitch-panel").hidden = false;
    if (!snitchInitialized) {
      initSnitch({
        matchId: state.match.id,
        teamId: state.team.id,
        playerId: state.player.user_id
      });
      snitchInitialized = true;
    }
  } else {
    $("snitch-panel").hidden = true;
  }
}

function render() {
  const { match, team, player, teams } = state;
  const opponent = teams.find(t => t.id !== team.id);
  $("user-name").textContent = session.user.display_name;
  $("match-title").textContent = match.title;
  $("team-name").textContent = team.name;
  $("position").textContent = positionLabel(player.position);
  $("team-score").textContent = team.score;
  $("opponent-score").textContent = opponent?.score ?? "—";
  $("status").textContent = statusLabel(match.status);
  $("stage").textContent = `Этап ${match.stage}`;
  $("turn").textContent = match.current_turn === team.id ? "Сейчас ход вашей команды." : "Сейчас ход соперника.";
  $("answer-question").innerHTML = (state.questions || []).filter(q => q.status !== "correct" && q.status !== "incorrect" && q.team_id !== team.id).map(q => `<option value="${q.id}">${escapeHtml(q.text.slice(0, 80))}</option>`).join("") || `<option value="">Нет доступных вопросов</option>`;
  $("question-list").innerHTML = (state.questions || []).map(q => `
    <article class="question-card">
      <div><span class="badge">${statusQuestion(q.status)}</span> <small>${formatDate(q.created_at)}</small></div>
      <p>${escapeHtml(q.text)}</p>
      ${(q.answers || []).map(a => `<div class="answer"><b>Ответ:</b> ${escapeHtml(a.text)} <span class="badge">${statusAnswer(a.status)}</span></div>`).join("")}
    </article>
  `).join("") || `<div class="empty">Вопросов пока нет.</div>`;
}

$("question-form").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("question-text").value.trim();
  if (!text) return;
  try {
    await secureRpc("submit_question", { p_match_id: state.match.id, p_text: text });
    $("question-text").value = "";
    await load();
  } catch (err) { alert(err.message); }
});

$("answer-form").addEventListener("submit", async e => {
  e.preventDefault();
  const questionId = $("answer-question").value;
  const text = $("answer-text").value.trim();
  if (!questionId || !text) return;
  try {
    await secureRpc("submit_answer", { p_question_id: questionId, p_text: text });
    $("answer-text").value = "";
    await load();
  } catch (err) { alert(err.message); }
});

$("chat-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await sendChat(state.match.id, $("chat-input").value);
    $("chat-input").value = "";
    await renderChat(state.match.id, $("chat"));
  } catch (err) { alert(err.message); }
});

function subscribe() {
  realtime.subscribe({
    tables: ["matches","teams","questions","answers","snitch_catches"],
    callback: payload => {
      const ids = [payload.record?.match_id, payload.old_record?.match_id];
      if (ids.includes(state.match?.id)) load().catch(console.error);
    }
  });
  if (state.match) subscribeChat(state.match.id, $("chat"));
}
load().then(subscribe).catch(err => {
  $("error").textContent = err.message;
});

function positionLabel(p) {
  return ({keeper:"Вратарь", seeker:"Ловец", beater:"Загонщик", chaser:"Охотник"})[p] || p;
}
function statusLabel(s) {
  return ({waiting:"Ожидание",stage_1:"Этап 1",stage_2:"Этап 2",stage_3:"Этап 3",paused:"Пауза",finished:"Завершён"})[s] || s;
}
function statusQuestion(s) { return ({pending:"На проверке",answered:"Есть ответ",correct:"Верно",incorrect:"Неверно"})[s] || s; }
function statusAnswer(s) { return ({pending:"На проверке",correct:"Верно",incorrect:"Неверно"})[s] || s; }
function formatDate(v) { return new Date(v).toLocaleString("ru-RU"); }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
