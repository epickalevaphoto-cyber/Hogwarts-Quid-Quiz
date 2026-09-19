import { select, realtime } from "./supabase.js";
import { secureRpc, getSession } from "./auth.js";

export async function renderChat(matchId, element) {
  const rows = await select("chat_messages", {
    filters: { match_id: matchId },
    order: "created_at.asc",
    limit: 100
  });
  element.innerHTML = rows.map(row => `
    <div class="chat-message">
      <strong>${escapeHtml(row.display_name || row.username)}</strong>
      <span>${escapeHtml(row.message)}</span>
      <time>${formatTime(row.created_at)}</time>
    </div>
  `).join("") || `<div class="empty">Сообщений пока нет.</div>`;
  element.scrollTop = element.scrollHeight;
}

export async function sendChat(matchId, message) {
  const session = getSession();
  if (!session?.user) throw new Error("Нет активной сессии.");
  const clean = message.trim();
  if (!clean) return;
  await secureRpc("send_chat", { p_match_id: matchId, p_message: clean });
}

export function subscribeChat(matchId, element) {
  return realtime.subscribe({
    tables: ["chat_messages"],
    callback: payload => {
      if (payload.record?.match_id === matchId || payload.old_record?.match_id === matchId) {
        renderChat(matchId, element).catch(console.error);
      }
    }
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
