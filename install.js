#!/usr/bin/env node
/**
 * Installe la machine « Docu Papier 2D » (documentaires animaliers en papier découpé) dans un Agent OS existant.
 *
 *   node install.js [chemin/vers/ton-agent-os]     # défaut : le dossier parent de ce dépôt
 *   node install.js ../mon-os --dry                # simulation : dit ce qu'il ferait, n'écrit rien
 *   node install.js ../mon-os --npm                # installe aussi les paquets npm manquants côté Remotion
 *   node install.js ../mon-os --with-kit           # + le kit Three.js / Blender / motion design (dépôt voisin)
 *
 * Le script copie les fichiers de la machine puis pose lui-même les branchements dans `agent-os/server.js`,
 * `agent-os/public/index.html`, `agent-os/public/js/core.js`, `agent-os/public/js/pages/machines.js` et
 * `agent-os/lib/vault.js` (champs « pixabay » et « elevenlabs » du coffre). Remotion : la machine a sa propre entrée
 * (`remotion/src/docu2d.tsx`), ton `Root.tsx` n'est pas modifié.
 *
 * IDEMPOTENT : relancé, il ne duplique rien (chaque insertion est détectée avant d'être faite).
 * Une sauvegarde `.bak-docu2d` est écrite à côté de chaque fichier modifié, la première fois seulement.
 * Fins de ligne : tout texte inséré prend celles du fichier cible (CRLF ou LF).
 * Si une ancre est introuvable (Agent OS très différent), le script ne devine pas : il affiche l'instruction manuelle
 * correspondante (voir INSTALL-LLM.md, section 5) et continue.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const HERE = __dirname;
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const WITH_KIT = argv.includes("--with-kit");
const NPM = argv.includes("--npm");
const target = path.resolve(argv.find((a) => !a.startsWith("--")) || path.join(HERE, ".."));
const KIT_URL = "https://github.com/Alex-sia99/threejs-quality-kit";

const C = { g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };
const ok = (m) => console.log(`${C.g}✓${C.x} ${m}`);
const skip = (m) => console.log(`${C.d}·${C.x} ${m}`);
const warn = (m) => console.log(`${C.y}⚠${C.x} ${m}`);
const die = (m) => { console.error(`${C.r}✗${C.x} ${m}`); process.exit(1); };
const manual = [];
const todo = [];

// ---------------------------------------------------------------- vérifications
console.log(`\n${C.b}Machine Docu Papier 2D → ${target}${C.x}${DRY ? `  ${C.y}(simulation)${C.x}` : ""}\n`);
const must = ["agent-os/server.js", "agent-os/public/index.html", "agent-os/public/js/core.js", "agent-os/public/js/pages/machines.js", "agent-os/lib/vault.js", "remotion/package.json"];
for (const rel of must) if (!fs.existsSync(path.join(target, rel))) die(`« ${rel} » introuvable : ${target} n'a pas l'air d'être une racine d'Agent OS (le dossier qui contient agent-os/ et remotion/).`);
// Modules du socle utilisés par la machine (fournis par tout Agent OS ; llm.js et pexels.js sont dans if-missing/).
const SOCLE = ["store", "vault", "spend", "tasks", "claude", "google"];
const socleManquant = SOCLE.filter((m) => !fs.existsSync(path.join(target, "agent-os/lib", m + ".js")));
if (socleManquant.length) {
  warn(`socle incomplet : ${socleManquant.map((m) => "lib/" + m + ".js").join(", ")}`);
  warn("la machine ne démarrera pas sans ces modules — ce sont ceux d'un Agent OS standard, ce dépôt ne les duplique pas");
}

function read(rel) { return fs.readFileSync(path.join(target, rel), "utf8"); }
const eolOf = (s) => (s.includes("\r\n") ? "\r\n" : "\n");
const withEol = (text, s) => text.replace(/\r?\n/g, eolOf(s));
function write(rel, content) {
  if (DRY) return;
  const abs = path.join(target, rel);
  const bak = abs + ".bak-docu2d";
  if (fs.existsSync(abs) && !fs.existsSync(bak)) fs.copyFileSync(abs, bak);
  fs.writeFileSync(abs, content, "utf8");
}
const lastMatch = (s, rx) => { const all = [...s.matchAll(rx)]; return all.length ? all[all.length - 1] : null; };
const insertAfter = (s, m, text) => s.slice(0, m.index + m[0].length) + text + s.slice(m.index + m[0].length);

// ---------------------------------------------------------------- 1) fichiers
/** Identiques, ou identiques aux fins de ligne près pour un fichier texte (un dépôt cloné en LF vs un Agent OS en CRLF). */
function sameContent(a, b, name) {
  if (a.equals(b)) return true;
  if (/\.(png|jpe?g|gif|webp|mp3|mp4|wav|ico|woff2?)$/i.test(name)) return false;
  return a.toString("utf8").replace(/\r\n/g, "\n") === b.toString("utf8").replace(/\r\n/g, "\n");
}
function copyTree(dir, { onlyIfMissing = false } = {}, rel = "") {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    if (fs.statSync(abs).isDirectory()) { copyTree(abs, { onlyIfMissing }, r); continue; }
    const dest = path.join(target, r);
    const exists = fs.existsSync(dest);
    if (exists && onlyIfMissing) { skip(`${r} (déjà présent dans ton Agent OS, conservé)`); continue; }
    if (exists && sameContent(fs.readFileSync(dest), fs.readFileSync(abs), name)) { skip(`${r} (identique)`); continue; }
    if (!DRY) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (exists && !fs.existsSync(dest + ".bak-docu2d")) fs.copyFileSync(dest, dest + ".bak-docu2d");
      fs.copyFileSync(abs, dest);
    }
    ok(`${r}${exists ? " (remplacé, ancienne version en .bak-docu2d)" : ""}`);
  }
}
console.log(`${C.b}Fichiers${C.x}`);
copyTree(path.join(HERE, "files"));
copyTree(path.join(HERE, "if-missing"), { onlyIfMissing: true });

// ---------------------------------------------------------------- 2) server.js
console.log(`\n${C.b}agent-os/server.js${C.x}`);
{
  let s = read("agent-os/server.js");
  const before = s;
  const E = eolOf(s);

  // require : après le dernier require d'une machine, sinon après tasks
  if (s.includes('require("./lib/machines/docu2d")')) skip("require docu2d (déjà présent)");
  else {
    const anchor = lastMatch(s, /const \w+ = require\("\.\/lib\/machines\/[\w-]+"\);[^\r\n]*\r?\n/g) || lastMatch(s, /const tasks = require\("\.\/lib\/tasks"\);[^\r\n]*\r?\n/g);
    if (anchor) { s = insertAfter(s, anchor, 'const docu2d = require("./lib/machines/docu2d");' + E); ok("require docu2d"); }
    else { warn("require : ancre introuvable"); manual.push('ajouter `const docu2d = require("./lib/machines/docu2d");` en haut de server.js'); }
  }

  // table des machines
  if (/const MACHINES = \{[^}]*\bdocu2d\b/.test(s)) skip("MACHINES (déjà présent)");
  else if (/const MACHINES = \{([^}]*)\}/.test(s)) {
    s = s.replace(/const MACHINES = \{([^}]*)\}/, (m, inner) => `const MACHINES = {${inner.trimEnd().replace(/,\s*$/, "")}, docu2d }`);
    ok("MACHINES += docu2d");
  } else { warn("MACHINES : introuvable"); manual.push("ajouter `docu2d` à la table `const MACHINES = { … }` de server.js"); }

  // carte du hub (/api/machines)
  if (/card\(docu2d\)/.test(s)) skip("GET /api/machines (déjà présent)");
  else if (/return json\(res, 200, \[(card\([^\]]*)\]\);/.test(s)) {
    s = s.replace(/return json\(res, 200, \[(card\([^\]]*)\]\);/, (m, inner) => `return json(res, 200, [${inner}, card(docu2d)]);`);
    ok("GET /api/machines += card(docu2d)");
  } else { warn("GET /api/machines : introuvable"); manual.push("ajouter `card(docu2d)` à la liste renvoyée par GET /api/machines"); }

  // routes génériques (stock / publication depuis le stock / order-info / idées) : listes « (timetravel|…) »
  let rx = 0;
  // (on saute les listes suivies d'un aiguillage codé en dur du type `m[1] === "timetravel" ? tt : ling`)
  s = s.replace(/\(timetravel\|[a-z0-9|]+\)/g, (m, off, all) => {
    if (/\|docu2d[|)]/.test(m) || /=== "timetravel"/.test(all.slice(off, off + 400))) return m;
    rx++; return m.slice(0, -1) + "|docu2d)";
  });
  if (rx) ok(`routes génériques (stock / restock / idées) : ${rx} liste(s) de machines étendue(s)`);
  else skip("routes génériques (déjà étendues ou absentes — le bloc de la machine a sa propre route de stock)");

  // bloc de routes de la machine : avant le dernier bloc « // ===== MACHINE … » du routeur, sinon avant « // ===== MACHINES ===== »
  if (s.includes("// ===== MACHINE DOCU PAPIER 2D =====")) skip("bloc de routes (déjà présent)");
  else {
    const snippet = withEol(fs.readFileSync(path.join(HERE, "server-routes.snippet.js"), "utf8").replace(/\s*$/, "\n"), s);
    const hdr = lastMatch(s, /^ {4}\/\/ ===== MACHINE [^\r\n]*$/gm);
    const at = hdr ? hdr.index : s.indexOf("    // ===== MACHINES =====");
    if (at >= 0) { s = s.slice(0, at) + snippet + s.slice(at); ok("bloc de routes Docu Papier 2D"); }
    else { warn("bloc de routes : aucune ancre trouvée"); manual.push("coller server-routes.snippet.js dans le routeur de server.js (à côté des routes des autres machines)"); }
  }

  // boot : sweepRuns + cron de sauvetage (facultatifs)
  if (s.includes("docu2d.sweepRuns()")) skip("sweepRuns au boot (déjà présent)");
  else if (/const stale = ([^;]*);/.test(s)) { s = s.replace(/const stale = ([^;]*);/, (m, inner) => `const stale = ${inner} + (docu2d.sweepRuns() || 0);`); ok("sweepRuns au boot"); }
  else skip("sweepRuns : pas de ligne `const stale = …` (facultatif)");
  if (s.includes("docu2d.strandedRuns()")) skip("strandedRuns (déjà présent)");
  else {
    const last = lastMatch(s, /strandedRuns\(\)\]/g);
    if (last) { s = s.slice(0, last.index) + "strandedRuns(), ...docu2d.strandedRuns()]" + s.slice(last.index + last[0].length); ok("strandedRuns (cron de sauvetage)"); }
    else skip("strandedRuns : pas de cron de sauvetage (facultatif)");
  }

  // manifeste des agents (liste « machines: [ { id, name, api }, … ] »)
  if (s.includes('{ id: "docu2d", name: "Docu Papier 2D"')) skip("manifeste agents (déjà présent)");
  else {
    const m = /machines: \[\r?\n(?:(\s*)\{ id: "[\w-]+", name: "[^"]+", api: "[^"]+" \},\r?\n)+/.exec(s);
    if (m) { s = s.slice(0, m.index + m[0].length) + `${m[1]}{ id: "docu2d", name: "Docu Papier 2D", api: "/api/machines/docu2d" },${E}` + s.slice(m.index + m[0].length); ok("manifeste agents"); }
    else skip("manifeste agents : liste absente (facultatif)");
  }

  if (s !== before) write("agent-os/server.js", s);
}

// ---------------------------------------------------------------- 3) frontend
console.log(`\n${C.b}Frontend${C.x}`);
{
  let s = read("agent-os/public/index.html");
  if (s.includes("js/pages/docu2d.js")) skip("index.html (déjà présent)");
  else {
    const m = /\r?\n([ \t]*)<script src="js\/pages\/machines\.js"><\/script>/.exec(s);
    if (m) {
      s = s.slice(0, m.index) + `${eolOf(s)}${m[1]}<script src="js/pages/docu2d.js"></script>` + s.slice(m.index);
      write("agent-os/public/index.html", s);
      ok("index.html : <script> de la page");
    } else { warn("index.html : ancre introuvable"); manual.push('ajouter <script src="js/pages/docu2d.js"></script> dans agent-os/public/index.html, avant js/pages/machines.js'); }
  }
}
{
  let s = read("agent-os/public/js/core.js");
  if (/\[[^\]]*"docu2d"[^\]]*\]\.includes\(name\)/.test(s)) skip("core.js (déjà présent)");
  else if (/\[([^\]]*"timetravel"[^\]]*)\]\.includes\(name\)/.test(s)) {
    s = s.replace(/\[([^\]]*"timetravel"[^\]]*)\]\.includes\(name\)/, (m, inner) => `[${inner}, "docu2d"].includes(name)`);
    write("agent-os/public/js/core.js", s);
    ok("core.js : surlignage de la nav « Machines »");
  } else { warn("core.js : ancre introuvable"); manual.push('ajouter "docu2d" au tableau de core.js qui renvoie le surlignage vers « machines »'); }
}
{
  let s = read("agent-os/public/js/pages/machines.js");
  const before = s;
  const E = eolOf(s);
  if (s.includes('href="#/docu2d"')) skip("machines.js : carte (déjà présente)");
  else {
    // badges (runs en cours, stock) : seulement si le hub charge les données des machines comme le starter
    const decl = lastMatch(s, /^([ \t]*)let \w+Cfg = null, \w+Runs = \[\], \w+Stock = \[\];[^\r\n]*\r?\n/gm);
    const destr = /\[([\w\s,]+)\] = await Promise\.all\(\[/.exec(s);
    const apiLine = lastMatch(s, /^([ \t]*)api\("\/api\/machines\/[\w-]+"\), api\("\/api\/machines\/[\w-]+\/runs"\), api\("\/api\/machines\/[\w-]+\/stock"\),[^\r\n]*\r?\n/gm);
    const wired = !!(decl && destr && apiLine && /const badges = /.test(s));
    const card = `        <a class="bank-folder" href="#/docu2d" style="text-decoration:none;color:inherit">
          <div style="font-size:34px">🦛</div>
          <b>Docu Papier 2D</b>
          <div class="small muted" style="margin-top:4px">Documentaires animaliers en papier découpé — Wikipédia (faits sourcés) → script → voix ElevenLabs → storyboard vérifié (physique, placement) → plans réels LIBRES (Pexels / Pixabay / Commons) → Remotion Docu2D → mix + contrôle d'écoute</div>
${wired ? '          ${badges(null, d2Runs, d2Stock, "")}\n' : ""}        </a>
`;
    const placeholder = /(\r?\n[ \t]*<div class="bank-folder" style="opacity:\.55;cursor:default">)/;
    const lastCard = /(\r?\n\s*<\/a>\r?\n)(?![\s\S]*<a class="bank-folder")/;
    let placed = false;
    if (placeholder.test(s)) { s = s.replace(placeholder, (m) => E + withEol(card, s).replace(/\r?\n$/, "") + m); placed = true; }
    else if (lastCard.test(s)) { s = s.replace(lastCard, (m) => m + withEol(card, s)); placed = true; }
    if (placed) {
      ok(`machines.js : carte du hub${wired ? " (avec badges stock / en cours)" : " (sans badges : le hub ne charge pas les données des machines)"}`);
      if (wired) {
        // l'ordre compte : on insère de la fin vers le début pour ne pas décaler les index
        const d2 = lastMatch(s, /^([ \t]*)api\("\/api\/machines\/[\w-]+"\), api\("\/api\/machines\/[\w-]+\/runs"\), api\("\/api\/machines\/[\w-]+\/stock"\),[^\r\n]*\r?\n/gm);
        s = insertAfter(s, d2, `${d2[1]}api("/api/machines/docu2d"), api("/api/machines/docu2d/runs"), api("/api/machines/docu2d/stock"),${E}`);
        s = s.replace(/\[([\w\s,]+)\] = await Promise\.all\(\[/, (m, inner) => `[${inner.trimEnd()}, d2Cfg, d2Runs, d2Stock] = await Promise.all([`);
        const dc = lastMatch(s, /^([ \t]*)let \w+Cfg = null, \w+Runs = \[\], \w+Stock = \[\];[^\r\n]*\r?\n/gm);
        s = insertAfter(s, dc, `${dc[1]}let d2Cfg = null, d2Runs = [], d2Stock = [];${E}`);
        ok("machines.js : chargement des runs et du stock pour les badges");
      }
    } else { warn("machines.js : ancre introuvable"); manual.push("ajouter une carte Docu Papier 2D (href #/docu2d) au hub des machines (voir INSTALL-LLM.md)"); }
  }
  if (/const TAB_KEYS = \{[^}]*"#\/docu2d"/.test(s)) skip("machines.js : TAB_KEYS (déjà présent)");
  else if (/const TAB_KEYS = \{([^}]*)\}/.test(s)) { s = s.replace(/const TAB_KEYS = \{([^}]*)\}/, (m, inner) => `const TAB_KEYS = {${inner.trimEnd().replace(/,\s*$/, "")}, "#/docu2d": "d2-tab" }`); ok("machines.js : TAB_KEYS (le hub ouvre l'onglet ⚙ Générer)"); }
  else skip("machines.js : pas d'objet TAB_KEYS (facultatif)");
  if (s !== before) write("agent-os/public/js/pages/machines.js", s);
}

// ---------------------------------------------------------------- 4) coffre : champs pixabay + elevenlabs
console.log(`\n${C.b}agent-os/lib/vault.js${C.x}`);
{
  let s = read("agent-os/lib/vault.js");
  const before = s;
  const E = eolOf(s);
  const ADD = [["pixabay", "Pixabay (b-roll libre)"], ["elevenlabs", "ElevenLabs (voix)"]];
  const fm = /const FIELDS = \{([\s\S]*?)\r?\n\};/.exec(s);
  if (!fm) { warn("vault.js : objet FIELDS introuvable"); manual.push('ajouter `pixabay: "Pixabay (b-roll libre)",` et `elevenlabs: "ElevenLabs (voix)",` à l\'objet FIELDS de agent-os/lib/vault.js'); }
  else {
    const missing = ADD.filter(([k]) => !new RegExp(`(^|[\\s{,])${k}\\s*:`).test(fm[1]));
    for (const [k] of ADD) if (!missing.find((x) => x[0] === k)) skip(`champ « ${k} » (déjà présent)`);
    if (missing.length) {
      const indent = (/\r?\n([ \t]+)\w+\s*:/.exec(fm[1]) || [null, "  "])[1];
      const lines = missing.map(([k, l]) => `${indent}${k}: "${l}",`).join(E);
      const pex = /\r?\n[ \t]+pexels\s*:[^\r\n]*,/.exec(fm[1]);
      const bodyStart = fm.index + fm[0].indexOf(fm[1]);
      if (pex) { const at = bodyStart + pex.index + pex[0].length; s = s.slice(0, at) + E + lines + s.slice(at); }
      else {
        const at = bodyStart + fm[1].length; // juste avant la fin de ligne qui précède « }; »
        const body = fm[1].replace(/\s*$/, "");
        s = s.slice(0, bodyStart) + body + (body.endsWith(",") || body.trim() === "" ? "" : ",") + E + lines + s.slice(at);
      }
      missing.forEach(([k]) => ok(`champ « ${k} » ajouté au coffre (Paramètres → Coffre)`));
      write("agent-os/lib/vault.js", s);
    }
  }
  void before;
}

// ---------------------------------------------------------------- 5) .gitignore : artefacts de runs Remotion
{
  const rel = ".gitignore";
  if (fs.existsSync(path.join(target, rel))) {
    let s = read(rel);
    const want = ["remotion/public-d2/d2*/", "remotion/build-d2-*/"].filter((l) => !s.split(/\r?\n/).includes(l));
    if (want.length) {
      const E = eolOf(s);
      s = s.replace(/\s*$/, "") + E + E + "# Machine Docu Papier 2D : plans et bundles de chaque run (régénérés)" + E + want.join(E) + E;
      write(rel, s);
      ok(".gitignore : artefacts des runs (public-d2/d2*, build-d2-*)");
    } else skip(".gitignore (déjà présent)");
  }
}

// ---------------------------------------------------------------- 6) Remotion : paquets npm
console.log(`\n${C.b}Remotion${C.x}`);
{
  const R = path.join(target, "remotion");
  const pkg = JSON.parse(fs.readFileSync(path.join(R, "package.json"), "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const ver = String(deps.remotion || "").replace(/^[\^~]/, "");
  const has = (name) => fs.existsSync(path.join(R, "node_modules", ...name.split("/"), "package.json"));
  if (!ver) warn("remotion/package.json ne déclare pas « remotion » : le moteur de rendu n'est pas installé");
  if (!fs.existsSync(path.join(R, "node_modules", "remotion"))) { warn("remotion/node_modules absent"); todo.push("cd remotion && npm install"); }
  if (!fs.existsSync(path.join(R, "src", "index.css"))) warn("remotion/src/index.css absent : src/docu2d.tsx l'importe (crée un fichier vide si besoin)");
  const cmds = [];
  if (!deps["@remotion/google-fonts"] || !has("@remotion/google-fonts")) cmds.push(["install", "--save-exact", `@remotion/google-fonts@${ver || "latest"}`]);
  else skip(`@remotion/google-fonts (${deps["@remotion/google-fonts"]})`);
  if (!deps.tsx && !has("tsx")) cmds.push(["install", "-D", "tsx"]);
  else skip("tsx (vérificateur du storyboard)");
  if (has("@remotion/renderer")) skip("@remotion/renderer (planches de relecture)");
  else if (fs.existsSync(path.join(R, "node_modules", "remotion"))) warn("@remotion/renderer absent de remotion/node_modules (normalement installé avec @remotion/cli)");
  for (const c of cmds) {
    const line = `npm ${c.join(" ")}`;
    if (NPM && !DRY) {
      console.log(`${C.d}  (cd remotion && ${line})${C.x}`);
      const r = spawnSync("npm", c, { cwd: R, stdio: "inherit", shell: process.platform === "win32" });
      if (r.status === 0) ok(line); else { warn(`${line} a échoué`); todo.push(`cd remotion && ${line}`); }
    } else { warn(`paquet manquant → ${line}${DRY ? "" : " (relance avec --npm pour le faire)"}`); todo.push(`cd remotion && ${line}`); }
  }
}

// ---------------------------------------------------------------- 7) prérequis système (rien n'est installé ici)
console.log(`\n${C.b}Prérequis${C.x}`);
{
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 18) skip(`node ${process.versions.node}`); else warn(`node ${process.versions.node} : il faut Node 18 ou plus (fetch intégré)`);
  const run = (cmd, args) => { try { const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true }); return r.status === 0; } catch { return false; } };
  for (const t of ["ffmpeg", "ffprobe"]) if (run(t, ["-version"])) skip(`${t} dans le PATH`); else { warn(`${t} introuvable dans le PATH`); todo.push(`installer ffmpeg (avec ffprobe) et l'ajouter au PATH`); }
  if (run("python", ["-c", "import faster_whisper"])) skip("python + faster-whisper (contrôle d'écoute)");
  else { warn("python + faster-whisper introuvable : le contrôle d'écoute (étape mix) échouera"); todo.push("pip install faster-whisper   (la machine appelle « python » : il doit être dans le PATH sous ce nom)"); }
}

// ---------------------------------------------------------------- 8) --with-kit : connaissances Three.js / Blender / motion design
if (WITH_KIT) {
  console.log(`\n${C.b}Kit Three.js / Blender / motion design (${KIT_URL})${C.x}`);
  const kitDir = path.resolve(HERE, "..", "threejs-quality-kit");
  if (fs.existsSync(path.join(kitDir, "install.js"))) skip(`${kitDir} (déjà cloné — « git -C <dossier> pull » pour le mettre à jour)`);
  else if (DRY) ok(`clonerait ${KIT_URL} dans ${kitDir}`);
  else {
    const r = spawnSync("git", ["clone", "--depth", "1", KIT_URL, kitDir], { stdio: "inherit" });
    if (r.status !== 0) { warn("git clone a échoué (git installé ? réseau ?)"); todo.push(`git clone ${KIT_URL} "${kitDir}" && node "${kitDir}/install.js" --project "${target}"`); }
  }
  if (fs.existsSync(path.join(kitDir, "install.js"))) {
    const r = spawnSync(process.execPath, [path.join(kitDir, "install.js"), "--project", target, ...(DRY ? ["--dry-run"] : [])], { stdio: "inherit" });
    if (r.status === 0) ok(DRY ? "kit : simulation terminée (rien d'écrit)" : "kit installé (skills dans .claude/skills, scripts dans scripts/kit)"); else { warn("l'installateur du kit a échoué"); todo.push(`node "${kitDir}/install.js" --project "${target}"`); }
  } else if (DRY) ok(`lancerait : node threejs-quality-kit/install.js --project "${target}"`);
}

// ---------------------------------------------------------------- récapitulatif
console.log(`\n${C.b}Terminé.${C.x}${DRY ? ` ${C.y}Rien n'a été écrit (--dry).${C.x}` : ""}`);
if (manual.length) {
  console.log(`\n${C.y}À faire à la main (ancres non trouvées) — voir INSTALL-LLM.md, section 5 :${C.x}`);
  manual.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
}
if (todo.length) {
  console.log(`\n${C.y}À installer sur la machine :${C.x}`);
  [...new Set(todo)].forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
}
console.log(`\n${C.b}Avant le premier run${C.x}
  1. Coffre d'Agent OS (Paramètres → Coffre) : ${C.b}pixabay${C.x} ou ${C.b}pexels${C.x} (OBLIGATOIRE : plans réels libres),
     ${C.b}elevenlabs${C.x} (voix off), ${C.b}openrouter${C.x} (textes ; sinon repli sur Claude CLI), ${C.b}kie${C.x} (musique Suno, conseillé).
  2. Redémarrer Agent OS (jamais pendant qu'un run tourne), ouvrir ${C.b}Machines → 🦛 Docu Papier 2D${C.x}.
  3. Premier essai : un animal du bestiaire (hippopotame, lion, éléphant, buffle, rhinocéros, crocodile), 3 min, Semi-manuel.

Recette de la niche : ${C.b}agent-os/docs/RECETTE-NICHE-ANIMAUX.md${C.x} · feuille de route : ${C.b}agent-os/docs/FEUILLE-DE-ROUTE-MACHINE-DOCU2D.md${C.x}
`);
