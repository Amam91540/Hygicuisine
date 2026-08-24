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
  if (name === "menu") chargerMenu();
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
document.querySelector('#enceinte-type-seg').addEventListener("click", (e) => {
  if (!e.target.classList.contains("seg-btn")) return;
  document.querySelectorAll('#enceinte-type-seg .seg-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add("active");
  document.getElementById("enceinte-type").value = e.target.dataset.val;
});
document.querySelector('#enceinte-moment-seg').addEventListener("click", (e) => {
  if (!e.target.classList.contains("seg-btn")) return;
  document.querySelectorAll('#enceinte-moment-seg .seg-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add("active");
  document.getElementById("enceinte-moment").value = e.target.dataset.val;
});

// Présélectionne le type (positif/négatif) selon l'enceinte choisie — modifiable ensuite.
const TYPE_PAR_DEFAUT_ENCEINTE = { "Congélateur": "negatif" }; // toutes les autres sont "positif" par défaut
document.getElementById("enceinte-nom").addEventListener("change", (e) => {
  const typeDefaut = TYPE_PAR_DEFAUT_ENCEINTE[e.target.value] || "positif";
  document.querySelectorAll('#enceinte-type-seg .seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.val === typeDefaut));
  document.getElementById("enceinte-type").value = typeDefaut;
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
      moment: document.getElementById("enceinte-moment").value,
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
    document.querySelectorAll('#enceinte-type-seg .seg-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector('#enceinte-type-seg .seg-btn[data-val="positif"]').classList.add('active');
    document.getElementById("enceinte-type").value = "positif";
    document.querySelectorAll('#enceinte-moment-seg .seg-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector('#enceinte-moment-seg .seg-btn[data-val="matin"]').classList.add('active');
    document.getElementById("enceinte-moment").value = "matin";
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

// ================= MENU =================
const JOURS_COLONNES = { 1: "Lundi", 3: "Mardi", 5: "Jeudi", 7: "Vendredi" }; // index 0-based dans la feuille

function parserFichierMenu(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const resultats = [];
  let semaineActuelle = null;
  let categorieActuelle = null;

  rows.forEach(row => {
    const colA = (row[0] || "").toString().trim();
    const colB = (row[1] || "").toString().trim();

    if (colB.startsWith("Semaine")) {
      semaineActuelle = colB;
      categorieActuelle = null;
      return;
    }
    if (colB.includes("Total DP")) return;
    if (colA.toLowerCase().startsWith("merci de renseigner")) return;
    if (!semaineActuelle) return;

    if (colA) categorieActuelle = colA;
    if (!categorieActuelle) return;

    Object.entries(JOURS_COLONNES).forEach(([idx, jour]) => {
      const val = (row[idx] || "").toString().trim();
      if (val) {
        resultats.push({ semaine: semaineActuelle, jour, categorie: categorieActuelle, plat: val });
      }
    });
  });
  return resultats;
}

document.getElementById("btn-importer-menu").addEventListener("click", async () => {
  const resultEl = document.getElementById("menu-import-result");
  const file = document.getElementById("menu-fichier").files[0];
  if (!file) {
    resultEl.textContent = "Choisis d'abord un fichier .xlsx.";
    resultEl.className = "result-badge bad";
    return;
  }
  resultEl.textContent = "Lecture du fichier…";
  resultEl.className = "result-badge";
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const feuille = workbook.Sheets["Feuille de commande"] || workbook.Sheets[workbook.SheetNames[0]];
    const lignes = parserFichierMenu(feuille);
    if (lignes.length === 0) {
      resultEl.textContent = "Aucune donnée reconnue dans ce fichier — vérifie le format.";
      resultEl.classList.add("bad");
      return;
    }
    resultEl.textContent = "Envoi du menu…";
    await apiCall("importMenu", { lignes });
    resultEl.textContent = `✓ Menu importé (${lignes.length} plats).`;
    resultEl.classList.add("ok");
    toast("Menu importé");
    chargerMenu();
  } catch (err) {
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

let menuParSemaine = {};
let ordreSemainesGlobal = [];
let semaineAffichee = null;
const ORDRE_JOURS = ["Lundi", "Mardi", "Jeudi", "Vendredi"];
const ORDRE_CATEGORIES = ["Entrées", "Plat et accompagnement", "Laitages/Desserts", "Pain"];

async function chargerMenu() {
  const wrap = document.getElementById("menu-affichage");
  const tabs = document.getElementById("menu-semaine-tabs");
  try {
    const data = await apiCall("getMenu", {});
    if (!data.lignes || data.lignes.length === 0) {
      tabs.innerHTML = "";
      wrap.innerHTML = '<p class="table-empty">Aucun menu importé pour le moment.</p>';
      construireJoursDisponibles();
      afficherJourAuto();
      return;
    }
    menuParSemaine = {};
    ordreSemainesGlobal = [];
    data.lignes.forEach(([semaine, jour, categorie, plat]) => {
      if (!menuParSemaine[semaine]) { menuParSemaine[semaine] = []; ordreSemainesGlobal.push(semaine); }
      menuParSemaine[semaine].push({ jour, categorie, plat });
    });

    tabs.innerHTML = "";
    ordreSemainesGlobal.forEach((semaine, i) => {
      const btn = document.createElement("button");
      btn.className = "subtab-btn" + (i === 0 ? " active" : "");
      btn.textContent = semaine.replace(/^Semaine\s*/i, "S. ");
      btn.title = semaine;
      btn.addEventListener("click", () => {
        document.querySelectorAll("#menu-semaine-tabs .subtab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        afficherSemaine(semaine);
      });
      tabs.appendChild(btn);
    });
    afficherSemaine(ordreSemainesGlobal[0]);

    construireJoursDisponibles();
    afficherJourAuto();
  } catch (err) {
    wrap.innerHTML = `<p class="table-empty">Erreur de chargement : ${err.message}</p>`;
  }
}

function afficherSemaine(semaine) {
  semaineAffichee = semaine;
  const wrap = document.getElementById("menu-affichage");
  const items = menuParSemaine[semaine] || [];

  let html = `<table><thead><tr><th>Catégorie</th>`;
  ORDRE_JOURS.forEach(j => { html += `<th>${j}</th>`; });
  html += `</tr></thead><tbody>`;

  ORDRE_CATEGORIES.forEach(cat => {
    const itemsCat = items.filter(it => it.categorie === cat);
    if (itemsCat.length === 0) return;
    const maxLignes = Math.max(...ORDRE_JOURS.map(j => itemsCat.filter(it => it.jour === j).length), 1);
    for (let ligne = 0; ligne < maxLignes; ligne++) {
      html += "<tr>";
      html += ligne === 0 ? `<td><b>${cat}</b></td>` : `<td></td>`;
      ORDRE_JOURS.forEach(j => {
        const platsJour = itemsCat.filter(it => it.jour === j);
        html += `<td>${platsJour[ligne] ? platsJour[ligne].plat : ""}</td>`;
      });
      html += "</tr>";
    }
  });
  html += "</tbody></table>";
  wrap.innerHTML = html;
}

// ---- Toggle Jour / Semaine ----
document.querySelectorAll('#section-menu .subtabs button[data-menuview]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#section-menu .subtabs button[data-menuview]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("menu-vue-jour").classList.toggle("active", btn.dataset.menuview === "jour");
    document.getElementById("menu-vue-semaine").classList.toggle("active", btn.dataset.menuview === "semaine");
  });
});

// ---- Vue "Jour" avec navigation par flèches ----
let joursDisponibles = []; // [{semaine, jour}], un par jour réellement présent dans le menu importé
let jourIndexActuel = 0;
const OFFSETS_JOURS = { Lundi: 0, Mardi: 1, Jeudi: 3, Vendredi: 4 };
const MOIS_FR = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11
};

function construireJoursDisponibles() {
  joursDisponibles = [];
  ordreSemainesGlobal.forEach(semaine => {
    ORDRE_JOURS.forEach(jour => {
      const items = (menuParSemaine[semaine] || []).filter(it => it.jour === jour);
      if (items.length > 0) joursDisponibles.push({ semaine, jour });
    });
  });
}

// Tente d'extraire la date du lundi de la semaine à partir de son intitulé
// (ex. "Semaine 37 Du 7 septembre au 11 septembre 2026"), pour proposer par
// défaut le jour du menu le plus proche d'aujourd'hui.
function parserDateDebutSemaine(semaineLabel) {
  const m = semaineLabel.match(/du\s+(\d{1,2})\s+([a-zàâéèêîôûç]+)\s+au\s+\d{1,2}\s+[a-zàâéèêîôûç]+\s*(\d{4})?/i);
  if (!m) return null;
  const moisIdx = MOIS_FR[m[2].toLowerCase()];
  if (moisIdx === undefined) return null;
  const annee = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  return new Date(annee, moisIdx, parseInt(m[1], 10));
}

function trouverIndexDuJour() {
  if (joursDisponibles.length === 0) return 0;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  let meilleurIndex = 0;
  let meilleurEcart = Infinity;
  joursDisponibles.forEach((j, idx) => {
    const debut = parserDateDebutSemaine(j.semaine);
    if (!debut) return;
    const dateJour = new Date(debut);
    dateJour.setDate(dateJour.getDate() + (OFFSETS_JOURS[j.jour] || 0));
    const ecart = Math.abs(dateJour - aujourdhui);
    if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleurIndex = idx; }
  });
  return meilleurIndex;
}

function afficherJourAuto() {
  if (joursDisponibles.length === 0) {
    document.getElementById("jour-nom").textContent = "—";
    document.getElementById("jour-semaine").textContent = "—";
    document.getElementById("jour-plats-liste").innerHTML = '<p class="table-empty">Importe un menu pour commencer.</p>';
    return;
  }
  afficherJourParIndex(trouverIndexDuJour());
}

function afficherJourParIndex(idx) {
  if (idx < 0 || idx >= joursDisponibles.length) return;
  jourIndexActuel = idx;
  const { semaine, jour } = joursDisponibles[idx];
  document.getElementById("jour-nom").textContent = jour;
  document.getElementById("jour-semaine").textContent = semaine;

  const items = (menuParSemaine[semaine] || []).filter(it => it.jour === jour);
  const liste = document.getElementById("jour-plats-liste");
  liste.innerHTML = "";
  ORDRE_CATEGORIES.forEach(cat => {
    const itemsCat = items.filter(it => it.categorie === cat);
    if (itemsCat.length === 0) return;
    const titre = document.createElement("div");
    titre.className = "plats-categorie-titre";
    titre.textContent = cat;
    liste.appendChild(titre);
    itemsCat.forEach(it => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "plat-card";
      card.textContent = it.plat;
      card.addEventListener("click", () => ouvrirPlatModal(semaine, jour, it.plat, cat));
      liste.appendChild(card);
    });
  });
}

document.getElementById("jour-prev").addEventListener("click", () => {
  if (jourIndexActuel > 0) afficherJourParIndex(jourIndexActuel - 1);
});
document.getElementById("jour-next").addEventListener("click", () => {
  if (jourIndexActuel < joursDisponibles.length - 1) afficherJourParIndex(jourIndexActuel + 1);
});

// ---- Fiche détaillée d'un plat (températures par étape + photos) ----
const ETAPES_PAR_TYPE = {
  chaud: ["Réception", "Avant réchauffage", "Après réchauffage", "Service"],
  froid: ["Réception", "Début de préparation", "Fin de préparation", "Service"]
};
let modalContext = { semaine: null, jour: null, plat: null, type: "chaud" };

function typeParDefaut(categorie) {
  return categorie === "Plat et accompagnement" ? "chaud" : "froid";
}

async function ouvrirPlatModal(semaine, jour, plat, categorie) {
  modalContext = { semaine, jour, plat, type: typeParDefaut(categorie) };
  document.getElementById("plat-modal-titre").textContent = plat;
  document.getElementById("plat-modal-souscat").textContent = `${jour} — ${categorie}`;
  document.querySelectorAll("#plat-modal-type .seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.val === modalContext.type));
  document.getElementById("plat-modal").classList.remove("hidden");
  await rafraichirEtapesModal();
  await rafraichirPhotosModal();
}

document.getElementById("plat-modal-close").addEventListener("click", () => {
  document.getElementById("plat-modal").classList.add("hidden");
});
document.getElementById("plat-modal").addEventListener("click", (e) => {
  if (e.target.id === "plat-modal") document.getElementById("plat-modal").classList.add("hidden");
});

document.getElementById("plat-modal-type").addEventListener("click", (e) => {
  if (!e.target.classList.contains("seg-btn")) return;
  document.querySelectorAll("#plat-modal-type .seg-btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  modalContext.type = e.target.dataset.val;
  rafraichirEtapesModal();
});

async function rafraichirEtapesModal() {
  const cont = document.getElementById("plat-modal-etapes");
  cont.innerHTML = '<p class="table-empty">Chargement…</p>';
  let dejaSaisi = {};
  try {
    const data = await apiCall("getTempsPlatJour", {
      semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat
    });
    dejaSaisi = data.etapes || {};
  } catch (e) { /* le formulaire reste utilisable même si la lecture échoue */ }

  cont.innerHTML = "";
  ETAPES_PAR_TYPE[modalContext.type].forEach(etape => {
    const info = dejaSaisi[etape];
    const row = document.createElement("div");
    row.className = "etape-row";
    row.innerHTML = `
      <div class="etape-nom">${etape}${info ? ` <span class="etape-deja ${String(info.conforme).includes("NON") ? "cell-bad" : "cell-ok"}">(dernier : ${info.temperature}°C à ${info.heure})</span>` : ""}</div>
      <div class="etape-champs">
        <input type="number" step="0.1" class="etape-temp" placeholder="0.0">
        <button type="button" class="btn-secondary etape-btn">Enregistrer</button>
      </div>
      <div class="etape-statut result-badge"></div>`;
    const btn = row.querySelector(".etape-btn");
    const input = row.querySelector(".etape-temp");
    const statut = row.querySelector(".etape-statut");
    btn.addEventListener("click", async () => {
      if (!input.value) {
        statut.textContent = "Indique une température.";
        statut.className = "etape-statut result-badge bad";
        return;
      }
      statut.textContent = "Envoi…";
      statut.className = "etape-statut result-badge";
      try {
        const res = await apiCall("addTempPlatEtape", {
          semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat,
          type: modalContext.type, etape, temperature: input.value, personne: PRENOM
        });
        statut.textContent = res.conforme ? "✓ Enregistré, conforme." : "⚠ Enregistré, hors norme.";
        statut.className = "etape-statut result-badge " + (res.conforme ? "ok" : "bad");
        toast(`${etape} enregistrée`);
      } catch (err) {
        statut.textContent = "Erreur : " + err.message;
        statut.className = "etape-statut result-badge bad";
      }
    });
    cont.appendChild(row);
  });
}

async function rafraichirPhotosModal() {
  const galerie = document.getElementById("plat-modal-photos");
  galerie.innerHTML = '<p class="table-empty">Chargement…</p>';
  try {
    const data = await apiCall("getPhotosPlat", {
      semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat
    });
    const photos = data.photos || [];
    if (photos.length === 0) {
      galerie.innerHTML = '<p class="table-empty">Aucune photo pour ce plat pour le moment.</p>';
      return;
    }
    galerie.innerHTML = "";
    photos.forEach(p => {
      const a = document.createElement("a");
      a.href = p.lien;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "photo-vignette";
      a.textContent = `📷 ${p.heure} — ${p.personne || ""}`;
      galerie.appendChild(a);
    });
  } catch (err) {
    galerie.innerHTML = `<p class="table-empty">Erreur : ${err.message}</p>`;
  }
}

document.getElementById("plat-modal-photo").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const base64 = await fileToBase64(file);
    await apiCall("addPhotoPlat", {
      semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat,
      photoBase64: base64, personne: PRENOM
    });
    toast("Photo ajoutée");
    e.target.value = "";
    rafraichirPhotosModal();
  } catch (err) {
    toast("Erreur photo : " + err.message, true);
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
