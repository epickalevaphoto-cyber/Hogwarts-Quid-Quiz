// js/api.js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5UBDVt-uRDLVKzTA4lZhZSRwW0MjIgoJGQev1mCNIeuAvXaXhiPDR_7H0PnvxYsQ/exec';

async function apiRequest(action, payload = {}) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Обязательно text/plain для обхода CORS
      },
      body: JSON.stringify({ action, ...payload })
    });
    return await response.json();
  } catch (err) {
    console.error('Ошибка API:', err);
    return { success: false, message: 'Ошибка связи с бэкендом Google Script' };
  }
}
