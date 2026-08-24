// ================= ÉTAT =================
let CODE_ACCES = "";
let PRENOM = "";

// ================= OUTILS =================
function toast(msg, bad = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("bad");
  if (bad) t.classList.add("bad");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
}

async function apiCall(action, payload = {}) {
  const body = JSON.stringify({ action, code: CODE_ACCES, ...payload });
  const res = await fetch(API_URL, { method: "POST", body });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erreur inconnue");
  return data;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
