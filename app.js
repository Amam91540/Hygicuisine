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
    reader.readAsDataURL(file);
  });
}

// ================= CONNEXION =================
document.getElementById("btn-entrer").addEventListener("click", async () => {
  const code = document.getElementById("code-acces").value.trim();
  const prenom = document.getElementById("prenom-utilisateur").value.trim();
  const errEl = document.getElementById("lock-error");
  errEl.textContent = "";

  if (!code || !prenom) {
    errEl.textContent = "Merci de remplir le code et ton prénom.";
    return;
  }
  CODE_ACCES = code;
  PRENOM = prenom;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getSeuils", code })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Code d'accès invalide");

    localStorage.setItem("hygicuisine_code", code);
    localStorage.setItem("hygicuisine_prenom", prenom);
    document.getElementById("user-name-display").textContent = prenom;
    document.getElementById("lock-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  } catch (e) {
    errEl.textContent = "Connexion impossible : " + e.message;
  }
});

// Auto-connexion si déjà enregistré sur cet appareil
window.addEventListener("DOMContentLoaded", () => {
  const savedCode = localStorage.getItem("hygicuisine_code");
  const savedPrenom = localStorage.getItem("hygicuisine_prenom");
  if (savedCode && savedPrenom) {
    document.getElementById("code-acces").value = savedCode;
    document.getElementById("prenom-utilisateur").value = savedPrenom;
  }
});

// ================= NAVIGATION =================
function gotoSection(name) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("section-" + name).classList.add("active");
  document.querySelector(`.tab-btn[data-section="${name}"]`).classList.add("active");
  if (name === "historique") chargerHistorique(currentHistTab);
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => gotoSection(btn.dataset.section));
});
document.querySelectorAll(".quick-card").forEach(btn => {
  btn.addEventListener("click", () => gotoSection(btn.dataset.goto));
});

// ================= SEGMENTED CONTROLS =================
document.querySelectorAll(".segmented").forEach(seg => {
  seg.addEventListener("click", (e) => {
    if (!e.target.classList.contains("seg-btn")) return;
    seg.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
  });
});
document.querySelector('#form-plat .segmented').addEventListener("click", (e) => {
  if (!e.target.classList.contains("seg-btn")) return;
  document.getElementById("plat-type").value = e.target.dataset.val;
});
document.querySelector('#form-enceinte .segmented').addEventListener("click", (e) => {
  if (!e.target.classList.contains("seg-btn")) return;
  document.getElementById("enceinte-type").value = e.target.dataset.val;
});

// ================= FORM : PLAT =================
document.getElementById("form-plat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("plat-result");
  resultEl.textContent = "Envoi…";
  resultEl.className = "result-badge";
  try {
    const data = await apiCall("addTempPlat", {
      plat: document.getElementById("plat-nom").value,
      type: document.getElementById("plat-type").value,
      temperature: document.getElementById("plat-temp").value,
      remarque: document.getElementById("plat-remarque").value,
      personne: PRENOM
    });
    if (data.conforme) {
      resultEl.textContent = "✓ Relevé conforme, enregistré.";
      resultEl.classList.add("ok");
    } else {
      resultEl.textContent = "⚠ Hors norme — relevé enregistré quand même.";
      resultEl.classList.add("bad");
    }
    e.target.reset();
    document.querySelectorAll('#form-plat .seg-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector('#form-plat .seg-btn[data-val="chaud"]').classList.add('active');
    document.getElementById("plat-type").value = "chaud";
    toast("Température plat enregistrée");
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= FORM : ENCEINTE =================
document.getElementById("form-enceinte").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("enceinte-result");
  resultEl.textContent = "Envoi…";
  resultEl.className = "result-badge";
  try {
    const data = await apiCall("addTempEnceinte", {
      enceinte: document.getElementById("enceinte-nom").value,
      typeEnceinte: document.getElementById("enceinte-type").value,
      temperature: document.getElementById("enceinte-temp").value,
      remarque: document.getElementById("enceinte-remarque").value,
      personne: PRENOM
    });
    if (data.conforme) {
      resultEl.textContent = "✓ Relevé conforme, enregistré.";
      resultEl.classList.add("ok");
    } else {
      resultEl.textContent = "⚠ Hors norme — relevé enregistré quand même.";
      resultEl.classList.add("bad");
    }
    e.target.reset();
    document.querySelectorAll('#form-enceinte .seg-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector('#form-enceinte .seg-btn[data-val="positif"]').classList.add('active');
    document.getElementById("enceinte-type").value = "positif";
    toast("Température enceinte enregistrée");
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= FORM : PHOTO TRAÇABILITÉ =================
document.getElementById("photo-fichier").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById("photo-preview");
  if (!file) { preview.classList.add("hidden"); return; }
  preview.src = await fileToBase64(file);
  preview.classList.remove("hidden");
});

document.getElementById("form-photo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("photo-result");
  const file = document.getElementById("photo-fichier").files[0];
  if (!file) return;
  resultEl.textContent = "Envoi de la photo…";
  resultEl.className = "result-badge";
  try {
    const base64 = await fileToBase64(file);
    await apiCall("addPhotoTracabilite", {
      produit: document.getElementById("photo-produit").value,
      fournisseur: document.getElementById("photo-fournisseur").value,
      lot: document.getElementById("photo-lot").value,
      dlc: document.getElementById("photo-dlc").value,
      photoBase64: base64,
      personne: PRENOM
    });
    resultEl.textContent = "✓ Traçabilité enregistrée (conservation 1 an).";
    resultEl.classList.add("ok");
    e.target.reset();
    document.getElementById("photo-preview").classList.add("hidden");
    toast("Photo de traçabilité enregistrée");
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= SOUS-ONGLETS STOCKS =================
document.querySelectorAll('#section-stocks .subtab-btn').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#section-stocks .subtab-btn').forEach(b => b.classList.remove("active"));
    document.querySelectorAll('#section-stocks .subpanel').forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("sub-" + btn.dataset.sub).classList.add("active");
  });
});

// ================= LIGNES PRODUITS DYNAMIQUES =================
function creerLigneProduit() {
  const div = document.createElement("div");
  div.className = "ligne-produit";
  div.innerHTML = `
    <input type="text" placeholder="Produit" class="ligne-produit-nom">
    <input type="text" placeholder="Qté" class="ligne-produit-qte">
    <input type="text" placeholder="Unité" class="ligne-produit-unite">`;
  return div;
}
document.getElementById("liv-ajouter-ligne").addEventListener("click", () => {
  document.getElementById("liv-lignes").appendChild(creerLigneProduit());
});
document.getElementById("etat-ajouter-ligne").addEventListener("click", () => {
  document.getElementById("etat-lignes").appendChild(creerLigneProduit());
});
// une ligne par défaut au chargement
document.getElementById("liv-lignes").appendChild(creerLigneProduit());
document.getElementById("etat-lignes").appendChild(creerLigneProduit());

function lireLignes(containerId) {
  const container = document.getElementById(containerId);
  const lignes = [];
  container.querySelectorAll(".ligne-produit").forEach(div => {
    const produit = div.querySelector(".ligne-produit-nom").value.trim();
    const quantite = div.querySelector(".ligne-produit-qte").value.trim();
    const unite = div.querySelector(".ligne-produit-unite").value.trim();
    if (produit) lignes.push({ produit, quantite, unite });
  });
  return lignes;
}

// ================= FORM : BON DE LIVRAISON =================
document.getElementById("form-livraison").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("stocks-result");
  const lignes = lireLignes("liv-lignes");
  if (lignes.length === 0) {
    resultEl.textContent = "Ajoute au moins un produit.";
    resultEl.className = "result-badge bad";
    return;
  }
  resultEl.textContent = "Envoi du bon de livraison…";
  resultEl.className = "result-badge";
  try {
    let photoBase64 = null;
    const photoFile = document.getElementById("liv-photo").files[0];
    if (photoFile) photoBase64 = await fileToBase64(photoFile);

    // on enregistre aussi chaque ligne comme mouvement de stock
    for (const l of lignes) {
      await apiCall("addStock", { produit: l.produit, quantite: l.quantite, unite: l.unite, personne: PRENOM });
    }

    await apiCall("sendBonLivraison", {
      fournisseur: document.getElementById("liv-fournisseur").value,
      lignes,
      remarqueGenerale: document.getElementById("liv-remarque").value,
      destinataire: document.getElementById("liv-email").value,
      photoBase64,
      personne: PRENOM
    });
    resultEl.textContent = "✓ Bon de livraison envoyé par e-mail.";
    resultEl.classList.add("ok");
    e.target.reset();
    document.getElementById("liv-lignes").innerHTML = "";
    document.getElementById("liv-lignes").appendChild(creerLigneProduit());
    toast("Bon de livraison envoyé");
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= FORM : ÉTAT DES STOCKS =================
document.getElementById("form-etat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("stocks-result");
  const lignes = lireLignes("etat-lignes");
  if (lignes.length === 0) {
    resultEl.textContent = "Ajoute au moins un produit.";
    resultEl.className = "result-badge bad";
    return;
  }
  resultEl.textContent = "Envoi de l'état des stocks…";
  resultEl.className = "result-badge";
  try {
    await apiCall("sendEtatStocks", {
      lignes,
      destinataire: document.getElementById("etat-email").value,
      personne: PRENOM
    });
    resultEl.textContent = "✓ État des stocks envoyé par e-mail.";
    resultEl.classList.add("ok");
    e.target.reset();
    document.getElementById("etat-lignes").innerHTML = "";
    document.getElementById("etat-lignes").appendChild(creerLigneProduit());
    toast("État des stocks envoyé");
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= HISTORIQUE =================
let currentHistTab = "temp_plats";

document.querySelectorAll('#hist-tabs .subtab-btn').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#hist-tabs .subtab-btn').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentHistTab = btn.dataset.hist;
    chargerHistorique(currentHistTab);
  });
});

async function chargerHistorique(onglet) {
  const wrap = document.getElementById("hist-table-wrap");
  wrap.innerHTML = '<p class="table-empty">Chargement…</p>';
  try {
    const data = await apiCall("getHistorique", { onglet, limite: 50 });
    if (!data.lignes || data.lignes.length === 0) {
      wrap.innerHTML = '<p class="table-empty">Aucune donnée pour le moment.</p>';
      return;
    }
    let html = "<table><thead><tr>";
    data.entetes.forEach(h => { html += `<th>${h}</th>`; });
    html += "</tr></thead><tbody>";
    data.lignes.forEach(row => {
      html += "<tr>";
      row.forEach((cell, i) => {
        const isConformeCol = data.entetes[i] === "Conforme";
        const cls = isConformeCol && String(cell).includes("NON") ? "cell-bad"
                  : isConformeCol ? "cell-ok" : "";
        html += `<td class="${cls}">${cell}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = `<p class="table-empty">Erreur de chargement : ${err.message}</p>`;
  }
}
