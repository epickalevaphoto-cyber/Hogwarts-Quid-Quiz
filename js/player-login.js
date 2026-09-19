import { login } from "./auth.js";

const form = document.querySelector("#player-login-form");
const error = document.querySelector("#login-error");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await login(
      document.querySelector("#username").value,
      document.querySelector("#password").value,
      "player"
    );
    location.href = "player.html";
  } catch (e) {
    error.textContent = e.message;
  } finally {
    button.disabled = false;
  }
});
