import { rpc } from "./supabase.js";

const STORAGE_KEY = "hogwarts_quid_session";

export function getSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function logout() {
  clearSession();
  location.href = "index.html";
}

export async function login(username, password, mode) {
  const fn = mode === "judge" ? "login_judge" : "login_player";
  const result = await rpc(fn, { p_username: username.trim(), p_password: password });
  if (!result?.ok) throw new Error(result?.message || "Неверный логин или пароль.");
  saveSession(result.session);
  return result.session.user;
}

export function requireRole(roles) {
  const session = getSession();
  if (!session?.token || !session.user) {
    location.href = "index.html";
    return null;
  }
  if (!roles.includes(session.user.role)) {
    alert("У вас нет доступа к этой странице.");
    location.href = "index.html";
    return null;
  }
  return session;
}

export async function secureRpc(name, args = {}) {
  const session = getSession();
  if (!session?.token) {
    clearSession();
    location.href = "index.html";
    throw new Error("Сессия истекла.");
  }
  return rpc(name, { ...args, p_session_token: session.token });
}
