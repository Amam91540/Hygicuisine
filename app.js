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
  if (name === "tracabilite") assurerMenuCharge().then(() => { if (jourIndexParVue.tracabilite === undefined || jourIndexParVue.tracabilite === -1) afficherJourAutoVue("tracabilite"); });
  if (name === "enr") {
    const p = assurerMenuCharge().then(() => { if (enrIndexActuel === undefined || enrIndexActuel === -1) return afficherENRAuto(); });
    if (nomSectionAScrollerApres) {
      const cible = nomSectionAScrollerApres;
      nomSectionAScrollerApres = null;
      p.then(() => setTimeout(() => {
        const el = document.getElementById(cible);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60));
    }
  }
}
let nomSectionAScrollerApres = null;

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => gotoSection(btn.dataset.section));
});
document.querySelectorAll(".quick-card").forEach(btn => {
  btn.addEventListener("click", () => {
    nomSectionAScrollerApres = btn.dataset.scroll || null;
    gotoSection(btn.dataset.goto);
  });
});

// ================= SEGMENTED CONTROLS =================
document.querySelectorAll(".segmented").forEach(seg => {
  seg.addEventListener("click", (e) => {
    if (!e.target.classList.contains("seg-btn")) return;
    seg.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
  });
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

// ================= PDF : BON DE LIVRAISON / ÉTAT DES STOCKS =================
document.getElementById("liv-pdf-btn").addEventListener("click", async () => {
  const resultEl = document.getElementById("stocks-result");
  const lignes = lireLignes("liv-lignes");
  if (lignes.length === 0) {
    resultEl.textContent = "Ajoute au moins un produit.";
    resultEl.className = "result-badge bad";
    return;
  }
  // Ouvre l'onglet tout de suite (au clic), sinon le navigateur bloque l'ouverture
  // comme un pop-up une fois qu'on est passé par un await.
  const nouvelOnglet = window.open("", "_blank");
  resultEl.textContent = "Génération du PDF…";
  resultEl.className = "result-badge";
  try {
    const data = await apiCall("genererPdfBonLivraison", {
      fournisseur: document.getElementById("liv-fournisseur").value,
      lignes,
      remarqueGenerale: document.getElementById("liv-remarque").value,
      personne: PRENOM
    });
    resultEl.textContent = "✓ PDF prêt.";
    resultEl.classList.add("ok");
    if (nouvelOnglet) nouvelOnglet.location.href = data.url;
    else window.open(data.url, "_blank");
  } catch (err) {
    if (nouvelOnglet) nouvelOnglet.close();
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

document.getElementById("etat-pdf-btn").addEventListener("click", async () => {
  const resultEl = document.getElementById("stocks-result");
  const lignes = lireLignes("etat-lignes");
  if (lignes.length === 0) {
    resultEl.textContent = "Ajoute au moins un produit.";
    resultEl.className = "result-badge bad";
    return;
  }
  const nouvelOnglet = window.open("", "_blank");
  resultEl.textContent = "Génération du PDF…";
  resultEl.className = "result-badge";
  try {
    const data = await apiCall("genererPdfEtatStocks", { lignes, personne: PRENOM });
    resultEl.textContent = "✓ PDF prêt.";
    resultEl.classList.add("ok");
    if (nouvelOnglet) nouvelOnglet.location.href = data.url;
    else window.open(data.url, "_blank");
  } catch (err) {
    if (nouvelOnglet) nouvelOnglet.close();
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
let menuDataChargeeUneFois = false;
const ORDRE_JOURS = ["Lundi", "Mardi", "Jeudi", "Vendredi"];
const ORDRE_CATEGORIES = ["Entrées", "Plat et accompagnement", "Laitages/Desserts", "Pain"];

async function chargerMenu() {
  const wrap = document.getElementById("menu-affichage");
  const tabs = document.getElementById("menu-semaine-tabs");
  try {
    const data = await apiCall("getMenu", {});
    menuParSemaine = {};
    ordreSemainesGlobal = [];
    if (data.lignes && data.lignes.length > 0) {
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
    } else {
      tabs.innerHTML = "";
      wrap.innerHTML = '<p class="table-empty">Aucun menu importé pour le moment.</p>';
    }

    construireJoursDisponibles();
    afficherJourAutoVue("menu");
    if (jourIndexParVue.tracabilite === undefined || jourIndexParVue.tracabilite === -1) afficherJourAutoVue("tracabilite");
    if (enrIndexActuel === undefined || enrIndexActuel === -1) afficherENRAuto();
    menuDataChargeeUneFois = true;
  } catch (err) {
    wrap.innerHTML = `<p class="table-empty">Erreur de chargement : ${err.message}</p>`;
  }
}

async function assurerMenuCharge() {
  if (!menuDataChargeeUneFois) await chargerMenu();
}

function afficherSemaine(semaine) {
  semaineAffichee = semaine;
  const wrap = document.getElementById("menu-affichage");
  const items = menuParSemaine[semaine] || [];
  const debutSemaine = parserDateDebutSemaine(semaine);

  let html = `<table><thead><tr><th>Catégorie</th>`;
  ORDRE_JOURS.forEach(j => {
    const d = calculerDateJour(semaine, j, debutSemaine);
    html += `<th>${j}${d ? " " + d.getDate() : ""}</th>`;
  });
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

// ---- Toggle Jour / Semaine (page Menu uniquement) ----
document.querySelectorAll('#section-menu .subtabs button[data-menuview]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#section-menu .subtabs button[data-menuview]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("menu-vue-jour").classList.toggle("active", btn.dataset.menuview === "jour");
    document.getElementById("menu-vue-semaine").classList.toggle("active", btn.dataset.menuview === "semaine");
  });
});

// ---- Vue "Jour" réutilisable (pages Menu, Plats, Traçabilité) ----
let joursDisponibles = []; // [{semaine, jour}], un par jour réellement présent dans le menu importé
const OFFSETS_JOURS = { Lundi: 0, Mardi: 1, Jeudi: 3, Vendredi: 4 };
const NOMS_JOURS_SEMAINE = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS_FR = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11
};

// Une "vue" = un jeu de boutons/zones (prev/next/nom/semaine/liste) affichant le menu du jour.
// La même liste de jours (joursDisponibles) est partagée ; chaque vue garde sa propre position.
const VUES_JOUR = {
  menu:        { prev: "jour-prev",        next: "jour-next",        nom: "jour-nom",        semaine: "jour-semaine",        liste: "jour-plats-liste" },
  tracabilite: { prev: "traca-jour-prev",  next: "traca-jour-next",  nom: "traca-jour-nom",  semaine: "traca-jour-semaine",  liste: "traca-jour-liste" }
};
let jourIndexParVue = {}; // { menu: <index ou -1>, tracabilite: ... } — undefined = jamais initialisée

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
// (ex. "Semaine 37 Du 7 septembre au 11 septembre 2026").
function parserDateDebutSemaine(semaineLabel) {
  const m = semaineLabel.match(/du\s+(\d{1,2})\s+([a-zàâéèêîôûç]+)\s+au\s+\d{1,2}\s+[a-zàâéèêîôûç]+\s*(\d{4})?/i);
  if (!m) return null;
  const moisIdx = MOIS_FR[m[2].toLowerCase()];
  if (moisIdx === undefined) return null;
  const annee = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  return new Date(annee, moisIdx, parseInt(m[1], 10));
}

function calculerDateJour(semaine, jour, debutSemaineDejaCalcule) {
  const debut = debutSemaineDejaCalcule !== undefined ? debutSemaineDejaCalcule : parserDateDebutSemaine(semaine);
  if (!debut) return null;
  const d = new Date(debut);
  d.setDate(d.getDate() + (OFFSETS_JOURS[jour] || 0));
  return d;
}

function trouverIndexDuJourLePlusProche() {
  if (joursDisponibles.length === 0) return 0;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  let meilleurIndex = 0;
  let meilleurEcart = Infinity;
  joursDisponibles.forEach((j, idx) => {
    const dateJour = calculerDateJour(j.semaine, j.jour);
    if (!dateJour) return;
    const ecart = Math.abs(dateJour - aujourdhui);
    if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleurIndex = idx; }
  });
  return meilleurIndex;
}

function trouverIndexExactAujourdhui() {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  for (let idx = 0; idx < joursDisponibles.length; idx++) {
    const dateJour = calculerDateJour(joursDisponibles[idx].semaine, joursDisponibles[idx].jour);
    if (dateJour && dateJour.getTime() === aujourdhui.getTime()) return idx;
  }
  return -1;
}

function afficherJourAutoVue(vue) {
  const ids = VUES_JOUR[vue];
  if (joursDisponibles.length === 0) {
    document.getElementById(ids.nom).textContent = "—";
    document.getElementById(ids.semaine).textContent = "";
    document.getElementById(ids.liste).innerHTML = '<p class="table-empty">Importe un menu pour commencer.</p>';
    jourIndexParVue[vue] = -1;
    return;
  }
  const idxExact = trouverIndexExactAujourdhui();
  if (idxExact !== -1) {
    afficherJourParIndexVue(vue, idxExact);
  } else {
    const aujourdhui = new Date();
    document.getElementById(ids.nom).textContent = `${NOMS_JOURS_SEMAINE[aujourdhui.getDay()]} ${aujourdhui.getDate()}`;
    document.getElementById(ids.semaine).textContent = "";
    document.getElementById(ids.liste).innerHTML = '<p class="table-empty">Pas de menu sélectionné pour aujourd\'hui.</p>';
    jourIndexParVue[vue] = -1;
  }
}

function afficherJourParIndexVue(vue, idx) {
  if (idx < 0 || idx >= joursDisponibles.length) return;
  const ids = VUES_JOUR[vue];
  jourIndexParVue[vue] = idx;
  const { semaine, jour } = joursDisponibles[idx];
  const dateJour = calculerDateJour(semaine, jour);
  document.getElementById(ids.nom).textContent = dateJour ? `${jour} ${dateJour.getDate()}` : jour;
  document.getElementById(ids.semaine).textContent = semaine;

  const items = (menuParSemaine[semaine] || []).filter(it => it.jour === jour);
  const liste = document.getElementById(ids.liste);
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

      if (vue === "tracabilite") {
        // Sur la page Traçabilité, un bouton photo à côté du plat permet de
        // prendre un cliché directement, sans passer par la fiche complète.
        const ligne = document.createElement("div");
        ligne.className = "plat-card-row";
        card.classList.add("plat-card-flex");
        ligne.appendChild(card);
        const btnPhoto = document.createElement("button");
        btnPhoto.type = "button";
        btnPhoto.className = "plat-photo-btn";
        btnPhoto.setAttribute("aria-label", `Photo pour ${it.plat}`);
        btnPhoto.textContent = "📷";
        btnPhoto.addEventListener("click", () => {
          tracaPhotoContext = { semaine, jour, plat: it.plat };
          document.getElementById("traca-photo-rapide").click();
        });
        ligne.appendChild(btnPhoto);
        liste.appendChild(ligne);
      } else {
        liste.appendChild(card);
      }
    });
  });
}

// -- Prise de photo rapide depuis la liste de la page Traçabilité --
let tracaPhotoContext = null;
document.getElementById("traca-photo-rapide").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !tracaPhotoContext) return;
  try {
    const base64 = await fileToBase64(file);
    await apiCall("addPhotoPlat", {
      semaine: tracaPhotoContext.semaine, jour: tracaPhotoContext.jour, plat: tracaPhotoContext.plat,
      photoBase64: base64, personne: PRENOM
    });
    toast(`Photo ajoutée — ${tracaPhotoContext.plat}`);
  } catch (err) {
    toast("Erreur photo : " + err.message, true);
  } finally {
    e.target.value = "";
    tracaPhotoContext = null;
  }
});

function jourPrecedentVue(vue) {
  if (joursDisponibles.length === 0) return;
  if (jourIndexParVue[vue] === -1 || jourIndexParVue[vue] === undefined) {
    afficherJourParIndexVue(vue, trouverIndexDuJourLePlusProche());
    return;
  }
  if (jourIndexParVue[vue] > 0) afficherJourParIndexVue(vue, jourIndexParVue[vue] - 1);
}
function jourSuivantVue(vue) {
  if (joursDisponibles.length === 0) return;
  if (jourIndexParVue[vue] === -1 || jourIndexParVue[vue] === undefined) {
    afficherJourParIndexVue(vue, trouverIndexDuJourLePlusProche());
    return;
  }
  if (jourIndexParVue[vue] < joursDisponibles.length - 1) afficherJourParIndexVue(vue, jourIndexParVue[vue] + 1);
}

document.getElementById("jour-prev").addEventListener("click", () => jourPrecedentVue("menu"));
document.getElementById("jour-next").addEventListener("click", () => jourSuivantVue("menu"));
document.getElementById("traca-jour-prev").addEventListener("click", () => jourPrecedentVue("tracabilite"));
document.getElementById("traca-jour-next").addEventListener("click", () => jourSuivantVue("tracabilite"));

// ---- Fiche détaillée d'un plat (températures par étape + photos) ----
const ETAPES_PAR_TYPE = {
  chaud: ["Réception", "Début de remise en température", "Fin de remise en température", "Distribution"],
  froid: ["Réception", "Début de préparation", "Fin de préparation", "Distribution"]
};
let modalContext = { semaine: null, jour: null, plat: null, type: "chaud" };

function typeParDefaut(categorie) {
  return categorie === "Plat et accompagnement" ? "chaud" : "froid";
}

async function ouvrirPlatModal(semaine, jour, plat, categorie) {
  modalContext = { semaine, jour, plat, categorie, type: typeParDefaut(categorie) };
  document.getElementById("plat-modal-titre").textContent = plat;
  document.getElementById("plat-modal-souscat").textContent = `${jour} — ${categorie}`;
  try {
    const data = await apiCall("getPlatType", { semaine, jour, plat });
    if (data.type) modalContext.type = data.type; // une correction manuelle déjà enregistrée prime sur la déduction
  } catch (e) { /* on garde la déduction automatique si la lecture échoue */ }
  document.querySelectorAll("#plat-modal-type .seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.val === modalContext.type));
  document.getElementById("plat-modal").classList.remove("hidden");
  await rafraichirEtapesModal();
  await rafraichirPhotosModal();
  await rafraichirUCPModal();
}

async function rafraichirUCPModal() {
  const case_ = document.getElementById("plat-modal-ucp");
  case_.checked = false;
  try {
    const data = await apiCall("getPreparationUCP", {
      semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat
    });
    case_.checked = !!data.ucp;
  } catch (e) { /* reste décoché si la lecture échoue */ }
}

document.getElementById("plat-modal-ucp").addEventListener("change", async (e) => {
  try {
    await apiCall("setPreparationUCP", {
      semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat,
      ucp: e.target.checked, personne: PRENOM
    });
    toast(e.target.checked ? "Marqué « préparé par l'UCP »" : "Marqué « non préparé par l'UCP »");
  } catch (err) {
    toast("Erreur : " + err.message, true);
    e.target.checked = !e.target.checked; // annule visuellement si l'enregistrement a échoué
  }
});

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
  apiCall("setPlatType", {
    semaine: modalContext.semaine, jour: modalContext.jour, plat: modalContext.plat,
    type: modalContext.type, personne: PRENOM
  }).catch(() => {}); // le classement reste utilisable même si l'enregistrement échoue
  if (typeof rafraichirBlocPlatENR === "function") rafraichirBlocPlatENR(modalContext.semaine, modalContext.jour, modalContext.plat);
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

// ================= FEUILLE ENR (rapport journalier consolidé) =================
// Mapping entre les enceintes réfrigérées suivies dans l'app et les libellés
// officiels du document PMS (CF = chambre froide).
const ENCEINTES_ENR = [
  { app: "Réception",         label: "CF réception" },
  { app: "Produits finis",    label: "CF produits finis" },
  { app: "Produits laitiers", label: "CF p.laitiers/desserts" },
  { app: "Frigo PAI",         label: "Frigo PAI" },
  { app: "Congélateur",       label: "Armoire négative" }
];

const DISTRIBUTION_ENCEINTES = [
  { nom: "Bain marie",                   type: "chaud" },
  { nom: "Vitrine Entrées",              type: "froid" },
  { nom: "Vitrine Fromages/Desserts",    type: "froid" }
];

let enrIndexActuel; // undefined = jamais initialisée, -1 = "aujourd'hui" virtuel, sinon index réel

function afficherENRAuto() {
  if (joursDisponibles.length === 0) {
    document.getElementById("enr-jour-nom").textContent = "—";
    document.getElementById("enr-contenu").innerHTML = '<p class="table-empty">Importe un menu pour commencer.</p>';
    enrIndexActuel = -1;
    return;
  }
  const idxExact = trouverIndexExactAujourdhui();
  if (idxExact !== -1) {
    afficherENRParIndex(idxExact);
  } else {
    const aujourdhui = new Date();
    document.getElementById("enr-jour-nom").textContent = `${NOMS_JOURS_SEMAINE[aujourdhui.getDay()]} ${aujourdhui.getDate()}`;
    document.getElementById("enr-contenu").innerHTML = '<p class="table-empty">Pas de menu sélectionné pour aujourd\'hui.</p>';
    enrIndexActuel = -1;
  }
}

function afficherENRParIndex(idx) {
  if (idx < 0 || idx >= joursDisponibles.length) return;
  enrIndexActuel = idx;
  const { semaine, jour } = joursDisponibles[idx];
  const dateJour = calculerDateJour(semaine, jour);
  document.getElementById("enr-jour-nom").textContent = dateJour ? `${jour} ${dateJour.getDate()}` : jour;
  construireFeuilleENR(semaine, jour, dateJour);
}

document.getElementById("enr-jour-prev").addEventListener("click", () => {
  if (joursDisponibles.length === 0) return;
  if (enrIndexActuel === -1 || enrIndexActuel === undefined) { afficherENRParIndex(trouverIndexDuJourLePlusProche()); return; }
  if (enrIndexActuel > 0) afficherENRParIndex(enrIndexActuel - 1);
});
document.getElementById("enr-jour-next").addEventListener("click", () => {
  if (joursDisponibles.length === 0) return;
  if (enrIndexActuel === -1 || enrIndexActuel === undefined) { afficherENRParIndex(trouverIndexDuJourLePlusProche()); return; }
  if (enrIndexActuel < joursDisponibles.length - 1) afficherENRParIndex(enrIndexActuel + 1);
});

async function construireFeuilleENR(semaine, jour, dateJour) {
  const cont = document.getElementById("enr-contenu");
  cont.innerHTML = '<p class="table-empty">Chargement…</p>';

  const dateStr = dateJour ? Utilities_formatDateFr(dateJour) : "";
  let data;
  try {
    data = await apiCall("getFeuilleENRComplete", { semaine, jour, date: dateStr });
  } catch (e) {
    cont.innerHTML = `<p class="table-empty">Erreur de chargement : ${e.message}</p>`;
    return;
  }
  const { releveEnceintes, releveDistribution, constat, reception, plats } = data;

  // -------- Construction du HTML --------
  let html = "";

  html += `<div id="enr-section-enceintes"><div class="enr-titre-section">Enceintes réfrigérées</div>
    <div class="enr-enceintes-liste">`;
  ENCEINTES_ENR.forEach(e => {
    const r = releveEnceintes[e.app] || {};
    html += `<div class="enr-enceinte-card">
      <div class="enr-enceinte-nom">${e.label}</div>
      <div class="enr-enceinte-champs">
        <div class="enr-enceinte-champ">
          <label>Matin</label>
          ${celluleEnceinteENR(e.app, "matin", r.matin)}
        </div>
        <div class="enr-enceinte-champ">
          <label>Soir</label>
          ${celluleEnceinteENR(e.app, "soir", r.soir)}
        </div>
      </div>
    </div>`;
  });
  html += `</div>

    <div class="enr-titre-section">Enceintes de distribution</div>
    <div class="enr-enceintes-liste">`;
  DISTRIBUTION_ENCEINTES.forEach(e => {
    const releve = dernierReleveDistribution(releveDistribution, e.nom);
    html += `<div class="enr-enceinte-card">
      <div class="enr-enceinte-nom">${e.nom} <span class="enr-enceinte-type">(${e.type === "chaud" ? "Chaud" : "Froid"})</span></div>
      <div class="enr-enceinte-champs enr-enceinte-champs-simple">
        <div class="enr-enceinte-champ">
          <label>Avant service</label>
          ${celluleDistributionENR(e.nom, e.type, releve)}
        </div>
      </div>
    </div>`;
  });
  html += `</div></div>`;

  html += `<div id="enr-section-plats">`;
  html += construireBlocReceptionENR(reception || {});
  html += construireTablePlatsENR("Suivi de préparation froide", plats.filter(p => p.type === "froid"), "froid");
  html += construireTablePlatsENR("Remise en température et distribution", plats.filter(p => p.type === "chaud"), "chaud");
  html += `</div>`;

  html += `<div class="enr-titre-section">Constatation / Analyse / Action(s)</div>
    <div class="enr-constat-grid">
      <label>Constatation
        <textarea id="enr-constatation">${constat.constatation || ""}</textarea>
      </label>
      <label>Analyse
        <textarea id="enr-analyse">${constat.analyse || ""}</textarea>
      </label>
      <label>Action(s)
        <textarea id="enr-actions">${constat.actions || ""}</textarea>
      </label>
      <button type="button" id="enr-constat-btn" class="btn-primary">Enregistrer</button>
    </div>`;

  cont.innerHTML = html;

  // -- Listeners enceintes réfrigérées --
  cont.querySelectorAll(".enr-mini-input[data-enceinte]").forEach(input => {
    input.addEventListener("change", () => enregistrerTempEnceinteENR(input, semaine, jour));
  });

  // -- Listeners enceintes de distribution --
  cont.querySelectorAll(".enr-mini-input[data-distribution]").forEach(input => {
    input.addEventListener("change", () => enregistrerTempDistributionENR(input, semaine, jour));
  });

  // -- Listeners températures des plats (tableau), sauvegarde immédiate --
  cont.querySelectorAll(".enr-plat-temp-input, .enr-plat-heure-input").forEach(input => {
    input.addEventListener("change", () => enregistrerTempPlatTableENR(input, semaine, jour));
    input.addEventListener("input", () => declencherSauvegardeDifferee(input, semaine, jour));
  });

  // -- Listeners bascule Chaud/Froid par plat --
  cont.querySelectorAll(".enr-plat-type-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await apiCall("setPlatType", { semaine, jour, plat: btn.dataset.plat, type: btn.dataset.nouveauType, personne: PRENOM });
        construireFeuilleENR(semaine, jour, dateJour); // ré-affiche avec le plat dans la bonne colonne
      } catch (err) { toast("Erreur : " + err.message, true); }
    });
  });

  // -- Listener réception marchandise --
  document.getElementById("enr-reception-btn").addEventListener("click", () => enregistrerReceptionMarchandiseENR(semaine, jour));
  document.getElementById("enr-reception-photo").addEventListener("change", () => {
    document.getElementById("enr-reception-photo-nom").textContent =
      document.getElementById("enr-reception-photo").files[0]?.name || "Aucune photo choisie";
  });

  // -- Listener constatations --
  document.getElementById("enr-constat-btn").addEventListener("click", () => enregistrerConstatationENR(semaine, jour));
}

function construireBlocReceptionENR(reception) {
  return `<div class="enr-titre-section">Réception de la marchandise</div>
    <div class="card-form enr-reception-form">
      <label>Date de réception
        <input type="date" id="enr-reception-date" value="${convertirDateFrEnIso(reception.dateReception)}">
      </label>
      <label>Heure de réception
        <input type="time" id="enr-reception-heure" value="${reception.heureReception || ""}">
      </label>
      <label>Photo de la fiche de réception
        <input type="file" id="enr-reception-photo" accept="image/*" capture="environment" class="hidden">
        <button type="button" id="enr-reception-photo-btn" class="btn-secondary"
          onclick="document.getElementById('enr-reception-photo').click()">📷 Prendre une photo</button>
        <span id="enr-reception-photo-nom" class="enr-reception-photo-nom">
          ${reception.lienPhoto ? `<a href="${reception.lienPhoto}" target="_blank" rel="noopener">Photo déjà enregistrée — Ouvrir</a>` : "Aucune photo choisie"}
        </span>
      </label>
      <button type="button" id="enr-reception-btn" class="btn-primary">Enregistrer la réception</button>
    </div>`;
}

async function enregistrerReceptionMarchandiseENR(semaine, jour) {
  const btn = document.getElementById("enr-reception-btn");
  const dateIso = document.getElementById("enr-reception-date").value;
  const heure = document.getElementById("enr-reception-heure").value;
  const fichier = document.getElementById("enr-reception-photo").files[0];
  btn.textContent = "Enregistrement…";
  try {
    let photoBase64 = null;
    if (fichier) photoBase64 = await fileToBase64(fichier);
    await apiCall("setReceptionMarchandise", {
      semaine, jour,
      dateReception: dateIso ? convertirDateIsoEnFr(dateIso) : "",
      heureReception: heure,
      photoBase64,
      personne: PRENOM
    });
    toast("Réception de la marchandise enregistrée");
  } catch (err) {
    toast("Erreur : " + err.message, true);
  } finally {
    btn.textContent = "Enregistrer la réception";
  }
}

function convertirDateFrEnIso(dateFr) {
  if (!dateFr) return "";
  const [j, m, a] = dateFr.split("/");
  if (!j || !m || !a) return "";
  return `${a}-${m.padStart(2, "0")}-${j.padStart(2, "0")}`;
}
function convertirDateIsoEnFr(dateIso) {
  const [a, m, j] = dateIso.split("-");
  return `${j}/${m}/${a}`;
}

// Construit un tableau plats × étapes dans le même esprit que le classeur Excel d'origine :
// Nom du produit | Réception | [étape 2] | [étape 3] | Distribution.
// Les 3 dernières étapes (tout sauf Réception) ont aussi un champ Heure à saisir manuellement.
function construireTablePlatsENR(titre, plats, type) {
  const etapes = ETAPES_PAR_TYPE[type]; // [Réception, ..., ..., Distribution]
  let html = `<div class="enr-titre-section">${titre}</div>`;
  if (plats.length === 0) {
    return html + '<p class="table-empty">Aucun plat identifié pour ce jour.</p>';
  }
  html += `<div class="table-wrap enr-plats-table-wrap"><table class="enr-plats-table"><thead><tr><th>Produit</th>`;
  etapes.forEach(e => html += `<th>${e}</th>`);
  html += `</tr></thead><tbody>`;
  plats.forEach(p => {
    html += `<tr>
      <td class="enr-plats-table-nom">
        ${p.plat}
        <button type="button" class="enr-plat-type-toggle" data-plat="${p.plat}" data-nouveau-type="${type === "chaud" ? "froid" : "chaud"}">
          → ${type === "chaud" ? "Froid" : "Chaud"}
        </button>
      </td>`;
    if (estPainLR(p.plat)) {
      etapes.forEach(() => html += `<td class="enr-plat-ta">T.A.</td>`);
    } else {
      etapes.forEach((e, i) => {
        html += `<td>${celluleEtapePlatENR(p.plat, type, e, p.etapes[e], i > 0)}</td>`;
      });
    }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// "Petits pains LR" : jamais mesurés, on affiche T.A. (température ambiante) partout.
function estPainLR(plat) {
  const n = (plat || "").toLowerCase();
  return n.includes("pain") && n.includes("lr");
}

function celluleEtapePlatENR(plat, type, etape, info, avecHeure) {
  const valeur = info ? info.temperature : "";
  const heureValeur = info ? info.heure : "";
  const horsNorme = info && String(info.conforme).includes("NON");
  const statut = info
    ? (horsNorme ? `⚠ enregistré` : `✓ enregistré`)
    : "";
  let html = `<input type="number" step="0.1" class="enr-mini-input enr-plat-temp-input${horsNorme ? " enr-alerte" : ""}"
    data-plat="${plat}" data-type="${type}" data-etape="${etape}" value="${valeur}" placeholder="°C">`;
  if (avecHeure) {
    html += `<input type="time" class="enr-mini-input enr-plat-heure-input"
      data-plat="${plat}" data-type="${type}" data-etape="${etape}" value="${heureValeur}">`;
  }
  html += `<div class="enr-mini-statut${info ? (horsNorme ? " cell-bad" : " cell-ok") : ""}">${statut}</div>`;
  return html;
}

let minuteriesSauvegarde = {};
// Sauvegarde automatiquement ~800ms après la dernière frappe, même sans quitter le champ
// (en plus de la sauvegarde au blur/"change") — pour que rien ne se perde en cas de
// changement d'onglet ou de rechargement pendant la saisie.
function declencherSauvegardeDifferee(input, semaine, jour) {
  const cle = input.dataset.plat + "|" + input.dataset.etape + "|" + input.className;
  clearTimeout(minuteriesSauvegarde[cle]);
  minuteriesSauvegarde[cle] = setTimeout(() => enregistrerTempPlatTableENR(input, semaine, jour), 800);
}

async function enregistrerTempPlatTableENR(input, semaine, jour) {
  const { plat, type, etape } = input.dataset;
  // Le champ heure et le champ température d'une même étape sont dans la même cellule.
  const cellule = input.closest("td");
  const inputTemp = cellule.querySelector(".enr-plat-temp-input");
  const inputHeure = cellule.querySelector(".enr-plat-heure-input");
  if (!inputTemp.value) return; // rien à enregistrer sans température

  // Remplit l'heure automatiquement dès qu'une température est saisie, mais seulement
  // si le champ est encore vide — une heure déjà modifiée à la main n'est jamais écrasée.
  if (inputHeure && !inputHeure.value) {
    const maintenant = new Date();
    inputHeure.value = `${String(maintenant.getHours()).padStart(2, "0")}:${String(maintenant.getMinutes()).padStart(2, "0")}`;
  }

  const statut = cellule.querySelector(".enr-mini-statut");
  try {
    const res = await apiCall("addTempPlatEtape", {
      semaine, jour, plat, type, etape,
      temperature: inputTemp.value,
      heure: inputHeure ? inputHeure.value : "",
      personne: PRENOM
    });
    if (statut) {
      statut.textContent = res.conforme ? "✓ enregistré" : "⚠ enregistré";
      statut.className = "enr-mini-statut " + (res.conforme ? "cell-ok" : "cell-bad");
    }
    inputTemp.classList.toggle("enr-alerte", !res.conforme);
  } catch (err) {
    if (statut) { statut.textContent = "⚠ non enregistré"; statut.className = "enr-mini-statut cell-bad"; }
    toast("Erreur : " + err.message, true);
  }
}

// Convertit une Date JS en chaîne dd/MM/yyyy (même format que celui stocké côté Apps Script).
function Utilities_formatDateFr(d) {
  const jj = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${jj}/${mm}/${d.getFullYear()}`;
}

function celluleEnceinteENR(enceinte, moment, releve) {
  const valeur = releve ? releve.temperature : "";
  const horsNorme = releve && String(releve.conforme).includes("NON");
  const statut = releve ? (horsNorme ? `⚠ ${releve.heure}` : `✓ ${releve.heure}`) : "";
  return `<input type="number" step="0.1" class="enr-mini-input${horsNorme ? " enr-alerte" : ""}" data-enceinte="${enceinte}" data-moment="${moment}" value="${valeur}" placeholder="0.0"><div class="enr-mini-statut${releve ? (horsNorme ? " cell-bad" : " cell-ok") : ""}">${statut}</div>`;
}

async function enregistrerTempEnceinteENR(input, semaine, jour) {
  if (!input.value) return;
  const enceinte = input.dataset.enceinte;
  const moment = input.dataset.moment;
  // Type positif/négatif déduit de l'enceinte (le Congélateur est la seule enceinte négative de la liste).
  const typeEnceinte = enceinte === "Congélateur" ? "negatif" : "positif";
  try {
    const res = await apiCall("addTempEnceinte", {
      enceinte, typeEnceinte, moment, temperature: input.value, semaine, jour, personne: PRENOM
    });
    toast(res.conforme ? `${enceinte} (${moment}) enregistrée` : `${enceinte} (${moment}) — hors norme, enregistrée quand même`, !res.conforme);
    input.classList.toggle("enr-alerte", !res.conforme);
    const statut = input.parentElement.querySelector(".enr-mini-statut");
    if (statut) {
      const heureLocale = new Date().toTimeString().slice(0, 5);
      statut.textContent = (res.conforme ? "✓ " : "⚠ ") + heureLocale;
      statut.className = "enr-mini-statut " + (res.conforme ? "cell-ok" : "cell-bad");
    }
  } catch (err) {
    toast("Erreur : " + err.message, true);
  }
}

// Dernier relevé connu pour une enceinte de distribution donnée (le tableau
// getTempsDistributionJour renvoie toutes les entrées du jour, la dernière fait foi).
function dernierReleveDistribution(releves, nom) {
  if (!releves) return null;
  const correspondants = releves.filter(r => r.nom === nom);
  return correspondants.length ? correspondants[correspondants.length - 1] : null;
}

function celluleDistributionENR(nom, type, releve) {
  const valeur = releve ? releve.temperature : "";
  const horsNorme = releve && String(releve.conforme).includes("NON");
  const statut = releve ? (horsNorme ? `⚠ ${releve.heure}` : `✓ ${releve.heure}`) : "";
  return `<input type="number" step="0.1" class="enr-mini-input${horsNorme ? " enr-alerte" : ""}" data-distribution="${nom}" data-type="${type}" value="${valeur}" placeholder="0.0"><div class="enr-mini-statut${releve ? (horsNorme ? " cell-bad" : " cell-ok") : ""}">${statut}</div>`;
}

async function enregistrerTempDistributionENR(input, semaine, jour) {
  if (!input.value) return;
  const nom = input.dataset.distribution;
  const type = input.dataset.type;
  try {
    const res = await apiCall("addTempDistribution", { semaine, jour, nom, type, temperature: input.value, personne: PRENOM });
    toast(res.conforme ? `${nom} enregistrée` : `${nom} — hors norme, enregistrée quand même`, !res.conforme);
    input.classList.toggle("enr-alerte", !res.conforme);
    const statut = input.parentElement.querySelector(".enr-mini-statut");
    if (statut) {
      const heureLocale = new Date().toTimeString().slice(0, 5);
      statut.textContent = (res.conforme ? "✓ " : "⚠ ") + heureLocale;
      statut.className = "enr-mini-statut " + (res.conforme ? "cell-ok" : "cell-bad");
    }
  } catch (err) {
    toast("Erreur : " + err.message, true);
  }
}

function celluleEtapePlatENR_placeholder(){} // (ancien bloc supprimé — remplacé par le tableau ci-dessus)

async function enregistrerConstatationENR(semaine, jour) {
  const btn = document.getElementById("enr-constat-btn");
  btn.textContent = "Enregistrement…";
  try {
    await apiCall("setConstatation", {
      semaine, jour,
      constatation: document.getElementById("enr-constatation").value,
      analyse: document.getElementById("enr-analyse").value,
      actions: document.getElementById("enr-actions").value,
      personne: PRENOM
    });
    toast("Constatations enregistrées");
  } catch (err) {
    toast("Erreur : " + err.message, true);
  } finally {
    btn.textContent = "Enregistrer";
  }
}

document.getElementById("enr-pdf-btn").addEventListener("click", async () => {
  const resultEl = document.getElementById("enr-pdf-result");
  if (enrIndexActuel === undefined || enrIndexActuel === -1) {
    resultEl.textContent = "Sélectionne d'abord un jour avec un menu.";
    resultEl.className = "result-badge bad";
    return;
  }
  const { semaine, jour } = joursDisponibles[enrIndexActuel];
  const dateJour = calculerDateJour(semaine, jour);
  const nouvelOnglet = window.open("", "_blank");
  resultEl.textContent = "Génération du PDF…";
  resultEl.className = "result-badge";
  try {
    const data = await apiCall("genererPdfENR", {
      semaine, jour, date: dateJour ? Utilities_formatDateFr(dateJour) : "", personne: PRENOM
    });
    resultEl.textContent = "✓ PDF prêt.";
    resultEl.classList.add("ok");
    if (nouvelOnglet) nouvelOnglet.location.href = data.url;
    else window.open(data.url, "_blank");
  } catch (err) {
    if (nouvelOnglet) nouvelOnglet.close();
    resultEl.textContent = "Erreur : " + err.message;
    resultEl.classList.add("bad");
  }
});

// ================= HISTORIQUE =================
let currentHistTab = "feuille_enr";

document.querySelectorAll('#hist-tabs .subtab-btn').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#hist-tabs .subtab-btn').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentHistTab = btn.dataset.hist;
    chargerHistorique(currentHistTab);
  });
});

// Colonnes à masquer par onglet (les données restent stockées, juste pas affichées).
const COLONNES_MASQUEES_HISTORIQUE = {
  feuille_enr: ["Date génération", "Heure génération", "Semaine"],
  temp_enceintes: ["Heure Matin", "Heure Soir", "Semaine", "Jour"]
};

async function chargerHistorique(onglet) {
  const wrap = document.getElementById("hist-table-wrap");
  wrap.innerHTML = '<p class="table-empty">Chargement…</p>';
  try {
    const data = await apiCall("getHistorique", { onglet, limite: 50 });
    if (!data.lignes || data.lignes.length === 0) {
      wrap.innerHTML = '<p class="table-empty">Aucune donnée pour le moment.</p>';
      return;
    }

    const colonnesAMasquer = COLONNES_MASQUEES_HISTORIQUE[onglet] || [];
    const indicesAffiches = data.entetes
      .map((h, i) => ({ h, i }))
      .filter(x => !colonnesAMasquer.includes(x.h))
      .map(x => x.i);
    const peutSupprimer = onglet === "temp_enceintes" || onglet === "feuille_enr";

    let html = "<table><thead><tr>";
    indicesAffiches.forEach(i => { html += `<th>${data.entetes[i]}</th>`; });
    if (peutSupprimer) html += `<th></th>`;
    html += "</tr></thead><tbody>";
    data.lignes.forEach((row, rowIdx) => {
      html += "<tr>";
      indicesAffiches.forEach(i => {
        const cell = row[i];
        const isConformeCol = data.entetes[i] === "Conforme";
        const cls = isConformeCol && String(cell).includes("NON") ? "cell-bad"
                  : isConformeCol ? "cell-ok" : "";
        const estLien = typeof cell === "string" && cell.startsWith("http");
        const contenu = estLien ? `<a href="${cell}" target="_blank" rel="noopener">Ouvrir</a>` : cell;
        html += `<td class="${cls}">${contenu}</td>`;
      });
      if (peutSupprimer) {
        html += `<td><button type="button" class="hist-supprimer-btn" data-row="${rowIdx}">🗑</button></td>`;
      }
      html += "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;

    if (peutSupprimer) {
      wrap.querySelectorAll(".hist-supprimer-btn").forEach(btn => {
        btn.addEventListener("click", () => supprimerLigneHistorique(onglet, data.lignes[parseInt(btn.dataset.row, 10)]));
      });
    }
  } catch (err) {
    wrap.innerHTML = `<p class="table-empty">Erreur de chargement : ${err.message}</p>`;
  }
}

async function supprimerLigneHistorique(onglet, ligne) {
  if (!confirm("Supprimer définitivement ce relevé ?")) return;
  try {
    const res = await apiCall("supprimerLigneHistorique", { onglet, ligne });
    if (res.ok) {
      toast("Relevé supprimé");
      chargerHistorique(onglet);
    } else {
      toast("Erreur : " + (res.error || "suppression impossible"), true);
    }
  } catch (err) {
    toast("Erreur : " + err.message, true);
  }
}
