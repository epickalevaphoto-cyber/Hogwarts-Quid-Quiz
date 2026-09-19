import { upload } from "./supabase.js";
import { secureRpc } from "./auth.js";

export function initSnitch({ matchId, teamId, playerId }) {
  const panel = document.querySelector("#snitch-panel");
  if (!panel) return;

  const file = panel.querySelector("#snitch-file");
  const preview = panel.querySelector("#snitch-preview");
  const button = panel.querySelector("#snitch-submit");
  const status = panel.querySelector("#snitch-status");
  let selected = null;

  file.addEventListener("change", () => {
    selected = file.files?.[0] || null;
    if (!selected) return;
    if (!["image/jpeg","image/png","image/webp"].includes(selected.type)) {
      status.textContent = "Разрешены только JPG, JPEG, PNG и WEBP.";
      file.value = "";
      selected = null;
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      status.textContent = "Максимальный размер файла — 10 МБ.";
      file.value = "";
      selected = null;
      return;
    }
    preview.src = URL.createObjectURL(selected);
    preview.hidden = false;
    status.textContent = "Фото готово к отправке.";
  });

  button.addEventListener("click", async () => {
    if (!selected) {
      status.textContent = "Сначала выберите фотографию.";
      return;
    }
    button.disabled = true;
    status.textContent = "Загрузка фотографии…";
    try {
      const extension = selected.type === "image/png" ? "png" : selected.type === "image/webp" ? "webp" : "jpg";
      const path = `${matchId}/${teamId}/${playerId}-${Date.now()}.${extension}`;
      const imageUrl = await upload("snitch-catches", path, selected);
      await secureRpc("submit_snitch", {
        p_match_id: matchId,
        p_team_id: teamId,
        p_player_id: playerId,
        p_image_url: imageUrl
      });
      status.textContent = "Заявка на поимку снитча отправлена судье.";
      button.disabled = true;
      file.disabled = true;
    } catch (e) {
      status.textContent = e.message;
      button.disabled = false;
    }
  });
}
