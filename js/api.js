// js/api.js
const API_URL = "https://script.google.com/macros/s/AKfycbxq6lOF_irGUvdNueov9VQocn5bxgULi-v7LCOUOlc78NwEjPHdBNaOlg4IkYzjPkg/exec";

/**
 * Универсальная функция запросов к Google Apps Script
 * Использует 'text/plain;charset=utf-8' для обхода ограничений CORS
 */
async function apiRequest(action, data = {}) {
  try {
    const payload = JSON.stringify({ action, ...data });
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/plain;charset=utf-8' 
      },
      body: payload
    });

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Ошибка при вызове API:", error);
    return { success: false, error: error.message };
  }
}
