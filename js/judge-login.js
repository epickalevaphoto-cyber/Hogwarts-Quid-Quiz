import { login } from "./auth.js";

const form = document.querySelector("#judge-login-form");
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
      "judge"
    );
    location.href = "judge.html";
  } catch (e) {
    error.textContent = e.message;
  } finally {
    button.disabled = false;
  }
});
