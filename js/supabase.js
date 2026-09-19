const SUPABASE_URL = "https://cbtxvevwewfbgbzrjdch.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sC6OSRe0wCCP8Xb-1capzQ_3rrX1EeF";

export const supabaseConfig = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };

function assertConfigured() {
  if (SUPABASE_URL.includes("YOUR-PROJECT") || SUPABASE_ANON_KEY.includes("YOUR_PUBLISHABLE")) {
    throw new Error("Откройте js/supabase.js и укажите Project URL и Publishable/anon key из Supabase.");
  }
}

function headers(extra = {}) {
  assertConfigured();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers || {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.hint || data?.details || `Supabase HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function select(table, query = {}) {
  const params = new URLSearchParams();
  params.set("select", query.select || "*");
  for (const [key, value] of Object.entries(query.filters || {})) {
    if (value === null) params.set(key, "is.null");
    else params.set(key, `eq.${value}`);
  }
  if (query.order) params.set("order", query.order);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  return request(`${table}?${params.toString()}`);
}

export async function rpc(name, args = {}) {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(args)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || `RPC ${name} failed`);
  }
  return data;
}

export async function upload(bucket, path, file) {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers({
      "Content-Type": file.type,
      "x-upsert": "false"
    }),
    body: file
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || "Не удалось загрузить файл.");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export class Realtime {
  constructor() {
    this.socket = null;
    this.channels = new Map();
    this.ref = 0;
    this.timer = null;
  }

  connect() {
    assertConfigured();
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
    const wsUrl = SUPABASE_URL.replace(/^http/, "ws") +
      `/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}&vsn=1.0.0`;
    this.socket = new WebSocket(wsUrl);
    this.socket.onopen = () => {
      for (const channel of this.channels.values()) this.join(channel);
      clearInterval(this.timer);
      this.timer = setInterval(() => this.heartbeat(), 25000);
    };
    this.socket.onmessage = (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const channel = [...this.channels.values()].find(c => c.topic === message.topic);
      if (!channel) return;
      if (message.event === "postgres_changes") {
        channel.callback(message.payload?.data || message.payload);
      }
    };
    this.socket.onclose = () => {
      clearInterval(this.timer);
      this.timer = null;
      setTimeout(() => this.connect(), 3000);
    };
  }

  heartbeat() {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.send("phoenix", "heartbeat", {}, "phoenix");
  }

  send(topic, event, payload, refTopic = topic) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.ref += 1;
    this.socket.send(JSON.stringify({ topic, event, payload, ref: String(this.ref) }));
  }

  subscribe({ tables, callback }) {
    const id = crypto.randomUUID();
    const topic = `realtime:hogwarts-${id}`;
    const channel = { id, topic, tables, callback };
    this.channels.set(id, channel);
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) this.connect();
    else if (this.socket.readyState === WebSocket.OPEN) this.join(channel);
    return () => this.channels.delete(id);
  }

  join(channel) {
    const postgres_changes = channel.tables.map(table => ({
      event: "*", schema: "public", table
    }));
    this.send(channel.topic, "phx_join", {
      config: { postgres_changes, broadcast: { self: false }, presence: { key: "" } },
      access_token: SUPABASE_ANON_KEY
    });
  }
}

export const realtime = new Realtime();
