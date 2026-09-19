import { select, realtime } from "./supabase.js";

const $ = id => document.getElementById(id);
const matchId = new URLSearchParams(location.search).get("match");

async function refresh() {
  try {
    const matches = matchId
      ? await select("matches", { filters: { id: matchId }, limit: 1 })
      : await select("matches", { order: "created_at.desc", limit: 1 });
    const match = matches[0];
    if (!match) {
      $("waiting").hidden = false;
      $("content").hidden = true;
      return;
    }
    $("waiting").hidden = true;
    $("content").hidden = false;
    $("title").textContent = match.title;
    $("status").textContent = statusLabel(match.status);
    $("stage").textContent = `Этап ${match.stage}`;
    const teams = await select("teams", { filters: { match_id: match.id }, order: "slot.asc" });
    $("scores").innerHTML = teams.map(t => `<article><span>${escapeHtml(t.name)}</span><strong>${t.score}</strong></article>`).join("");
    const questions = await select("questions", { filters: { match_id: match.id }, order: "created_at.desc", limit: 1 });
    const question = questions[0];
    $("question").textContent = question?.text || "Вопрос появится здесь.";
    const answers = question ? await select("answers", { filters: { question_id: question.id }, order: "created_at.desc", limit: 1 }) : [];
    $("answer").textContent = answers[0]?.text || "Ответ появится после отправки.";
    const catches = await select("snitch_catches", { filters: { match_id: match.id, status: "approved" }, order: "approved_at.desc", limit: 1 });
    if (catches[0]) {
      const team = teams.find(t => t.id === catches[0].team_id);
      $("snitch-banner").hidden = false;
      $("winner").textContent = `Победитель: ${team?.name || "—"}`;
    } else {
      $("snitch-banner").hidden = true;
    }
    const chats = await select("chat_messages", { filters: { match_id: match.id }, order: "created_at.desc", limit: 5 });
    $("events").innerHTML = chats.reverse().map(c => `<div><b>${escapeHtml(c.display_name || c.username)}</b> ${escapeHtml(c.message)}</div>`).join("") || "<div>События появятся здесь.</div>";
  } catch (e) {
    $("waiting").textContent = e.message;
  }
}

realtime.subscribe({
  tables: ["matches","teams","questions","answers","chat_messages","snitch_catches"],
  callback: () => refresh().catch(console.error)
});
refresh();

function statusLabel(s) { return ({waiting:"Ожидание",stage_1:"Этап 1",stage_2:"Этап 2",stage_3:"Этап 3",paused:"Пауза",finished:"Завершён"})[s] || s; }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
