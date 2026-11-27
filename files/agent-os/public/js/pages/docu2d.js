/**
 * MACHINE DOCU PAPIER 2D — onglets : Générer / Runs / Stock / Paramètres. Wizard : Faits → Script → Voix →
 * Storyboard & plans (planche de relecture) → Rendu → Fini. Mode semi : validation du script puis du storyboard.
 */
AgentOS.register("docu2d", {
  title: "Docu Papier 2D",
  async render(el, params) {
    const { api, esc } = AgentOS;
    let cfg = await api("/api/machines/docu2d");
    const TABS = ["gen", "runs", "stock", "settings"];
    let tab = TABS.includes(localStorage.getItem("d2-tab")) ? localStorage.getItem("d2-tab") : "gen";
    if (params && TABS.includes(params.get("tab"))) tab = params.get("tab");
    let wizTimer = null;
    this.onLeave = () => clearTimeout(wizTimer);
    const media = (rel, ts) => `/media/${encodeURIComponent(rel)}${ts ? `?v=${ts}` : ""}`;
    const costOf = (run) => Object.values(run.cost || {}).reduce((a, b) => a + b, 0);
    const dur = (sec) => (sec ? `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, "0")} s` : "");
    const FAMILIES = [["auto", "Auto (déduite du sujet)"], ["terrestre", "Animal terrestre"], ["rivière", "Animal de rivière"], ["marin", "Animal marin (bientôt)"], ["insecte", "Insecte / araignée (bientôt)"], ["oiseau", "Oiseau (bientôt)"], ["phénomène", "Phénomène naturel (bientôt)"]];

    function shell() {
      el.innerHTML = `
        <div class="card">
          <h2><a href="#/machines" class="back-btn" style="margin-right:10px" title="Retour aux Machines">←</a>🦛 Docu Papier 2D
            <span class="h-actions"><span class="mini-seg" id="d2-tabs">
              ${[["gen", "⚙ Générer"], ["runs", "🎞 Runs"], ["stock", "📦 Stock"], ["settings", "🛠 Paramètres"]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}
            </span></span></h2>
          <div id="d2-body"></div>
        </div>`;
      el.querySelectorAll("#d2-tabs button").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.t; try { localStorage.setItem("d2-tab", tab); } catch {} shell(); }));
      ({ gen: renderGen, runs: renderRuns, stock: renderStock, settings: renderSettings })[tab]();
    }

    // ═══════════════════════════ Générer ═══════════════════════════
    async function renderGen() {
      const body = el.querySelector("#d2-body");
      const s = cfg.settings;
      let chans = []; try { chans = await api("/api/channels"); } catch {}
      let voices = cfg.voices; try { voices = await api("/api/machines/docu2d/voices"); } catch {}
      const noKey = !cfg.keys.pexels && !cfg.keys.pixabay;
      body.innerHTML = `
        ${noKey ? `<div class="empty small" style="color:var(--err);margin:0 0 12px"><b>Aucune clé Pixabay ni Pexels</b> — cette machine en a besoin pour les plans réels libres. Ajoute-en une dans Paramètres → Coffre (Pixabay est gratuit).</div>` : ""}
        <div class="grid grid-2 mb" style="align-items:end">
          <label class="field" style="margin:0"><span>Sujet <span class="muted">(l'animal — 💡 propose 6 sujets tirés de la banque « Docu Animaux 2D »)</span></span>
            <span class="row" style="gap:6px"><input id="g-subj" class="grow" placeholder="ex : l'hippopotame · le casoar · le buffle d'Afrique"><button class="btn btn-sm" id="g-idea" title="Trouver un sujet">💡</button></span></label>
          <label class="field" style="margin:0"><span>Famille <span class="muted" title="Deux champs distincts : le sujet dit QUOI, la famille choisit le monde dessiné et le bestiaire. Elle est déduite du sujet ; tu ne la forces que si la déduction se trompe.">(ⓘ déduite du sujet)</span></span>
            <select id="g-fam">${FAMILIES.map(([v, l]) => `<option value="${v}"${/bientôt/.test(l) ? " disabled" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        <div id="g-ideas"></div>
        <div class="grid grid-4 mb" style="align-items:end">
          <label class="field" style="margin:0"><span>Durée : <b id="g-dl">${s.durationMin}</b> min</span><input type="range" id="g-dur" min="3" max="30" step="1" value="${s.durationMin}" style="width:100%"></label>
          <label class="field" style="margin:0"><span>Langue</span><select id="g-lang">${Object.entries(cfg.langs).map(([k, l]) => `<option value="${k}"${k === s.lang ? " selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="field" style="margin:0"><span>Voix ElevenLabs</span><select id="g-voice">${voices.map((v) => `<option value="${esc(v.id)}"${v.id === s.voice ? " selected" : ""}>${esc(v.name)}</option>`).join("")}<option value="custom">✏ Voix personnalisée (ID)…</option></select></label>
          <label class="field" style="margin:0" id="g-vid-wrap" hidden><span>ID de la voix ElevenLabs</span><input id="g-vid" placeholder="ex : 21m00Tcm4TlvDq8ikWAM"></label>
        </div>
        <div class="fbar mb" style="padding:10px 12px;flex-wrap:wrap;gap:14px">
          <span class="fbar-item" style="min-width:330px"><span>Distribution : <b id="g-rl">${s.realPct}</b> % plans réels · <b id="g-ml">${100 - s.realPct}</b> % motion design</span>
            <input type="range" id="g-real" min="0" max="40" step="1" value="${s.realPct}" style="width:180px" title="Cible : la machine place assez de plans réels pour l'atteindre, puis MESURE la part obtenue (affichée à l'étape Storyboard). Si un plan libre est introuvable, il est retiré (ou remplacé par une image IA si autorisé) : la part peut alors être un peu en dessous."></span>
          <span class="fbar-item"><span>Images IA</span><span class="mini-seg" id="g-aiimg"><button data-v="0"${s.aiImages ? "" : ' class="active"'}>Non</button><button data-v="1"${s.aiImages ? ' class="active"' : ""}>Oui</button></span></span>
          <span class="fbar-item" title="v1 : zéro vidéo IA (recette de la niche). L'option existe pour la suite."><span>Vidéo IA</span><span class="mini-seg" id="g-aivid"><button data-v="0" class="active">Non</button><button data-v="1" disabled>Oui</button></span></span>
          <span class="fbar-item" title="Désactivé (décision du 27/11). S'il est un jour activé, la mention légale fair use est ajoutée automatiquement à la description."><span>Fair use</span><span class="mini-seg"><button class="active">Non</button><button disabled>Oui</button></span></span>
          <span class="fbar-item"><span>Sources</span>${["pexels", "pixabay", "commons"].map((k) => `<label class="small" style="margin-right:8px"><input type="checkbox" data-src="${k}"${(s.sources || []).includes(k) ? " checked" : ""}${(k === "pexels" && !cfg.keys.pexels) || (k === "pixabay" && !cfg.keys.pixabay) ? " disabled title=\"clé absente\"" : ""}> ${k[0].toUpperCase() + k.slice(1)}</label>`).join("")}</span>
        </div>
        <div class="fbar mb" style="padding:10px 12px;flex-wrap:wrap;gap:14px">
          <span class="fbar-item"><span>Musique</span><span class="mini-seg" id="g-music"><button data-v="0"${s.music ? "" : ' class="active"'}>Non</button><button data-v="1"${s.music ? ' class="active"' : ""}>Oui</button></span></span>
          <span class="fbar-item"><span>Mode</span><span class="mini-seg" id="g-mode"><button class="active" data-v="semi">Semi-manuel</button><button data-v="auto">100 % auto</button></span></span>
          <span class="fbar-item"><span>Publication auto</span><span class="mini-seg" id="g-pub"><button class="active" data-v="0">Non</button><button data-v="1">Oui</button></span></span>
          <span class="fbar-item" id="g-pubw" style="display:none"><select id="g-chan" style="min-width:170px"><option value="">— chaîne —</option>${chans.filter((c) => !c.error).map((c) => `<option value="${esc(c.channelId)}">${esc(c.title)}</option>`).join("")}</select>
            <select id="g-priv" style="width:150px"><option value="private" selected>🔒 Privée</option><option value="unlisted">🔗 Non répertoriée</option><option value="public">🌍 Publique</option></select></span>
          <span id="g-cost" style="margin-left:auto;font-weight:800;font-size:17px;color:#4ade80;background:rgba(74,222,128,.09);border:1px solid rgba(74,222,128,.35);border-radius:10px;padding:9px 16px;white-space:nowrap"></span>
          <button class="btn btn-accent" id="g-go" style="font-size:14px;padding:10px 22px"${noKey ? " disabled" : ""}>⚙ Générer</button>
        </div>
        <div class="small muted" style="text-align:right">Wikipédia (faits sourcés) → Script (5 questions) → Voix ElevenLabs → Storyboard vérifié (placement + physique) → Plans réels libres → Remotion Docu2D → Mix + contrôle d'écoute → Packaging SEO + sources</div>`;
      const $ = (q) => body.querySelector(q);
      const seg = (id, cb) => body.querySelectorAll(`#${id} button:not([disabled])`).forEach((b) => b.addEventListener("click", () => { body.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle("active", x === b)); cb && cb(b.dataset.v); }));
      const val = (id) => body.querySelector(`#${id} button.active`).dataset.v;
      const cost = async () => {
        $("#g-dl").textContent = $("#g-dur").value;
        try { const e = await api("/api/machines/docu2d/estimate", { method: "POST", body: { durationMin: +$("#g-dur").value, voice: $("#g-voice").value, aiImages: val("g-aiimg") === "1", music: val("g-music") === "1" } });
          $("#g-cost").textContent = `≈ ${e.usd.toFixed(2)} $`; $("#g-cost").title = `voix ElevenLabs ≈ ${e.chars} car. (${e.detail.voice}$ — inclus dans ton forfait si tu en as un) · musique ${e.detail.music}$ · texte ${e.detail.llm}$ · rendu ≈ ${e.renderMin} min`; } catch {}
      };
      $("#g-dur").addEventListener("input", cost);
      $("#g-real").addEventListener("input", (e) => { $("#g-rl").textContent = e.target.value; $("#g-ml").textContent = 100 - e.target.value; });
      $("#g-voice").addEventListener("change", () => { $("#g-vid-wrap").hidden = $("#g-voice").value !== "custom"; cost(); });
      seg("g-aiimg", cost); seg("g-music", cost); seg("g-mode"); seg("g-pub", () => ($("#g-pubw").style.display = val("g-pub") === "1" ? "" : "none"));
      cost();
      $("#g-idea").addEventListener("click", async () => {
        const btn = $("#g-idea"), input = $("#g-subj"); btn.disabled = true; btn.textContent = "⏳"; input.classList.add("ai-thinking");
        try { const { ideas } = await api("/api/machines/docu2d/idea", { method: "POST", body: { family: $("#g-fam").value } });
          if (ideas[0] && !input.value) input.value = ideas[0].subject;
          $("#g-ideas").innerHTML = `<div class="row mb" style="gap:6px;flex-wrap:wrap">${ideas.map((i) => `<button class="btn btn-sm btn-ghost" data-s="${esc(i.subject)}" title="${esc(i.title)} — ${esc(i.why)}">${esc(i.subject)} <span class="muted">· ${esc(i.title)}</span></button>`).join("")}</div>`;
          $("#g-ideas").querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => (input.value = b.dataset.s)));
        } catch (e) { AgentOS.toast(e.message, "err"); }
        btn.disabled = false; btn.textContent = "💡"; input.classList.remove("ai-thinking");
      });
      $("#g-go").addEventListener("click", async () => {
        const subject = $("#g-subj").value.trim(); if (!subject) return AgentOS.toast("Donne un sujet, ou clique 💡", "err");
        const custom = $("#g-voice").value === "custom"; if (custom && !$("#g-vid").value.trim()) return AgentOS.toast("Colle l'ID de la voix ElevenLabs", "err");
        if (val("g-pub") === "1" && !$("#g-chan").value) return AgentOS.toast("Choisis la chaîne de publication", "err");
        const b = $("#g-go"); b.disabled = true; b.textContent = "⏳ Lancement…";
        try {
          const run = await api("/api/machines/docu2d/runs", { method: "POST", body: { subject, family: $("#g-fam").value, durationMin: +$("#g-dur").value, lang: $("#g-lang").value,
            voice: custom ? $("#g-vid").value.trim() : $("#g-voice").value, realPct: +$("#g-real").value, aiImages: val("g-aiimg") === "1", aiVideo: false,
            sources: [...body.querySelectorAll("[data-src]:checked")].map((x) => x.dataset.src), music: val("g-music") === "1", mode: val("g-mode"),
            publishChannelId: val("g-pub") === "1" ? $("#g-chan").value : null, publishPrivacy: $("#g-priv").value } });
          AgentOS.toast("🚀 Run lancé", "ok"); openWizard(run.id);
        } catch (e) { AgentOS.toast(e.message, "err"); }
        b.disabled = false; b.textContent = "⚙ Générer";
      });
    }

    // ═══════════════════════════ Wizard ═══════════════════════════
    const STEPS = [{ key: "facts", icon: "📚", label: "Faits" }, { key: "script", icon: "📝", label: "Script" }, { key: "voice", icon: "🎙", label: "Voix" },
      { key: "broll", icon: "🧩", label: "Storyboard & plans" }, { key: "render", icon: "🎞", label: "Rendu" }];
    const FINI = STEPS.length;
    const stepIndex = (st) => { const k = String(st || "").replace(/_(running|done|ready)$/, ""); if (k === "storyboard") return 3; if (k === "mix" || k === "package") return 4; const i = STEPS.findIndex((x) => x.key === k); return i < 0 ? (st === "done" ? FINI : 0) : i; };
    const stepDone = (r, i) => [!!(r.facts && r.facts.length), !!r.script, !!r.timeline, !!(r.check && !r.check.anomalies.length), !!r.finalRel][i];
    const pct = (r) => r.status === "done" ? 100 : ({ facts: 4, script: 12, voice: 22, storyboard: 34, broll: 44, render: 56, mix: 88, package: 95 }[String(r.status).replace(/_(running|done|ready)$/, "")] ?? 2);
    function openWizard(runId) {
      const ov = document.createElement("div"); ov.className = "picker-overlay"; ov.innerHTML = `<div class="scrap-modal lg" id="wiz"><span class="spin"></span></div>`; document.body.appendChild(ov);
      const tick = async () => {
        let run; try { run = await api("/api/machines/docu2d/runs/" + runId); } catch (e) { ov.querySelector("#wiz").innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
        const box = ov.querySelector("#wiz");
        const key = [run.status, box.dataset.view || "", run.error ? 1 : 0, (run.log || []).length, run.pack ? run.pack.thumbTs || 1 : 0, run.published ? 1 : 0].join("|");
        if (box.dataset.k !== key) { box.dataset.k = key; draw(box, run, ov); }
        if ((run.running || /_running$/.test(run.status)) && document.body.contains(ov)) { clearTimeout(wizTimer); wizTimer = setTimeout(tick, 4000); }
      };
      tick();
    }
    function draw(box, run, ov) {
      const idx = stepIndex(run.status), running = !!run.running;
      const view = box.dataset.view ? +box.dataset.view : Math.min(idx, FINI);
      const sc = box.querySelector(".wiz-scroll")?.scrollTop || 0;
      const vlabel = { script_ready: "✓ Valider le script → Voix + storyboard", broll_ready: "✓ Valider le storyboard → Rendu" }[run.status];
      box.classList.add("wiz-modal");
      box.innerHTML = `
        <div class="wiz-head">
          <div class="wiz-gbar"><div style="width:${pct(run)}%"></div></div>
          <div class="row between" style="margin:10px 0 4px"><h2 style="margin:0;font-size:15px">🦛 ${esc(run.pack?.title || run.script?.title || run.params.subject)}
            <span class="small muted mono" style="margin-left:8px">${run.id} · ${run.params.mode} · ${run.params.durationMin} min · ${esc(run.params.lang)} · ${costOf(run).toFixed(2)}$</span></h2>
            <span class="row" style="gap:6px">${run.status !== "done" && !running ? `<button class="btn btn-sm" data-act="resume" title="Reprendre là où le run s'est arrêté">⚡</button>` : ""}${running ? `<button class="btn btn-sm" data-act="cancel">🛑 Annuler</button>` : ""}<button class="btn btn-sm btn-ghost" data-close>✕</button></span></div>
          <div class="wiz-rail">${STEPS.map((s, i) => `<div class="wiz-step ${stepDone(run, i) ? "done" : i === idx ? "active" : ""}" data-view="${i}" style="cursor:pointer"><div class="wiz-dot" ${i === view ? 'style="outline:2px solid var(--accent);outline-offset:3px"' : ""}>${stepDone(run, i) ? "✓" : s.icon}</div><span>${s.label}</span></div>${i < STEPS.length - 1 ? `<div class="wiz-link ${stepDone(run, i) ? "done" : ""}"></div>` : ""}`).join("")}
            <div class="wiz-link ${run.status === "done" ? "done" : ""}"></div><div class="wiz-step ${run.status === "done" ? "done" : ""}" data-view="${FINI}" style="cursor:pointer"><div class="wiz-dot" ${view === FINI ? 'style="outline:2px solid var(--accent);outline-offset:3px"' : ""}>🏁</div><span>Fini</span></div></div>
          ${run.error ? `<div class="empty small" style="color:var(--err);margin:0"><b>Échec</b> ${esc(run.error)} <button class="btn btn-sm" data-act="resume">↻ Reprendre</button></div>` : ""}
          ${running ? `<div class="small muted"><span class="spin" style="width:12px;height:12px"></span> ${esc((run.log || []).slice(-1)[0]?.msg || "")}</div>` : ""}
        </div>
        <div class="wiz-scroll">${viewHTML(run, view)}</div>
        ${vlabel && !running ? `<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-accent" data-act="validate">${vlabel}</button></div>` : ""}`;
      box.querySelector("[data-close]").addEventListener("click", () => { clearTimeout(wizTimer); ov.remove(); });
      box.querySelectorAll(".wiz-step[data-view]").forEach((s) => s.addEventListener("click", () => { box.dataset.view = s.dataset.view; draw(box, run, ov); }));
      const reopen = () => { clearTimeout(wizTimer); ov.remove(); openWizard(run.id); };
      box.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => { b.disabled = true; try { await api(`/api/machines/docu2d/runs/${run.id}/${b.dataset.act}`, { method: "POST", body: {} }); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); b.disabled = false; } }));
      box.querySelectorAll("[data-from]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Refaire cette étape et les suivantes ?")) return; try { await api(`/api/machines/docu2d/runs/${run.id}/resume`, { method: "POST", body: { from: b.dataset.from } }); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); } }));
      const save = box.querySelector("[data-save]"); if (save) save.addEventListener("click", async () => { try { await api(`/api/machines/docu2d/runs/${run.id}/save-texts`, { method: "POST", body: { title: box.querySelector("#f-title").value, description: box.querySelector("#f-desc").value, tags: box.querySelector("#f-tags").value.split(",").map((x) => x.trim()) } }); AgentOS.toast("Textes enregistrés", "ok"); } catch (e) { AgentOS.toast(e.message, "err"); } });
      const pub = box.querySelector("[data-publish]"); if (pub) pub.addEventListener("click", async () => { const ch = box.querySelector("#f-chan").value; if (!ch) return AgentOS.toast("Choisis la chaîne", "err"); pub.disabled = true; pub.textContent = "⏳ Envoi…"; try { const r = await api(`/api/machines/docu2d/runs/${run.id}/publish`, { method: "POST", body: { channelId: ch, privacyStatus: box.querySelector("#f-priv").value, title: box.querySelector("#f-title").value, description: box.querySelector("#f-desc").value, tags: box.querySelector("#f-tags").value.split(",").map((x) => x.trim()) } }); AgentOS.toast("📤 Publiée : " + r.url, "ok"); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); pub.disabled = false; pub.textContent = "📤 Publier"; } });
      if (view === FINI && box.querySelector("#f-chan")) api("/api/channels").then((cs) => { box.querySelector("#f-chan").innerHTML = `<option value="">— chaîne —</option>` + cs.filter((c) => !c.error).map((c) => `<option value="${esc(c.channelId)}">${esc(c.title)}</option>`).join(""); }).catch(() => {});
      const s2 = box.querySelector(".wiz-scroll"); if (s2) s2.scrollTop = sc;
    }
    function viewHTML(run, view) {
      const key = STEPS[view]?.key || "fini"; const idle = !run.running;
      const redo = (st, l) => idle && run.status !== "created" ? `<button class="mini-btn" data-from="${st}">↻ ${l}</button>` : "";
      if (key === "facts") {
        if (!run.facts) return `<div class="empty small"><span class="spin"></span> Lecture de Wikipédia (FR + EN) et extraction des faits sourcés…</div>`;
        return `<div class="row between mb"><span class="small muted">${run.facts.length} faits · espèce dessinée : <b>${esc(run.meta?.hero)}</b> · famille : ${esc(run.meta?.family)} · ${(run.sources || []).map((x) => `<a href="${esc(x.url)}" target="_blank">${esc(x.title)}</a>`).join(", ")}</span>${redo("facts", "Refaire")}</div>
          ${run.story?.who ? `<div class="scrap-row small"><b>Histoire d'accroche</b>&nbsp;${esc(run.story.who)} — ${esc(run.story.when || "")}, ${esc(run.story.where || "")} : ${esc(run.story.what || "")}</div>` : ""}
          ${run.facts.map((f) => `<div class="scrap-row small" style="gap:10px"><span class="grow">${esc(f.claim)} ${f.uncertain ? '<span class="badge warn">incertain</span>' : ""}</span><b class="mono" style="flex:none">${esc(f.value || "")}</b>${f.src ? `<a href="${esc(f.src)}" target="_blank" style="flex:none">source</a>` : ""}</div>`).join("")}`;
      }
      if (key === "script") {
        if (!run.script) return `<div class="empty small"><span class="spin"></span> Écriture du script (accroche « vous », 5 questions, CTA, fin en commentaire)…</div>`;
        return `<div class="row between mb"><span class="small muted">${run.script.lines.length} répliques · ${run.script.words} mots (cible ${run.script.target}) · titre : <b>${esc(run.script.title)}</b></span>${redo("script", "Réécrire")}</div>
          ${run.script.lines.map((l) => `<div class="scrap-row small" style="gap:10px;align-items:flex-start"><span class="badge" style="flex:none;width:58px;text-align:center">${esc(l.scene)}</span><span class="grow" style="line-height:1.5">${esc(l.text)}</span></div>`).join("")}`;
      }
      if (key === "voice") {
        if (!run.timeline) return `<div class="empty small"><span class="spin"></span> Voix ElevenLabs réplique par réplique, alignement mot à mot, resserrage…</div>`;
        return `<div class="small mb">Durée <b>${dur(run.timeline.total)}</b> · débit mesuré <b>${run.timeline.wpm}</b> mots/min · pauses ×${run.timeline.pause}</div><audio controls src="${media(`agent-os/output/machines/${run.id}/vo-tight/l01.mp3`)}" style="width:100%"></audio>${redo("voice", "Refaire la voix")}`;
      }
      if (key === "broll") {
        if (!run.check) return `<div class="empty small"><span class="spin"></span> Storyboard (beats ancrés sur les mots), vérification, plans réels libres…</div>`;
        const c = run.check;
        return `<div class="row between mb"><span class="small">Plans réels mesurés : <b style="color:${c.realPct >= c.target - 2 ? "var(--ok)" : "var(--warn)"}">${c.realPct} %</b> (cible ${c.target} %) · cartes ${c.cardPct} % · anomalies : <b>${c.anomalies.length}</b></span>${redo("storyboard", "Refaire le storyboard")}</div>
          ${c.anomalies.map((i) => `<div class="small" style="color:var(--err)">✗ [${esc(i.rule)}] ${esc(i.msg)}</div>`).join("")}
          ${(run.sheets || []).map((s) => `<img src="${media(s)}" style="width:100%;border-radius:8px;margin:6px 0">`).join("") || `<div class="small muted">Planche de relecture indisponible.</div>`}`;
      }
      if (key === "render") {
        if (run.output) return `<video controls src="${media(run.output.rel)}" style="width:100%;border-radius:8px"></video><div class="small muted">${run.output.lufs} LUFS · contrôle d'écoute ${run.output.listen?.ok ? "OK" : "—"}</div>`;
        return `<div class="empty small"><span class="spin"></span> ${esc((run.log || []).slice(-1)[0]?.msg || "Rendu…")}</div>`;
      }
      if (!run.pack) return `<div class="empty small">Pas encore fini.</div>`;
      return `<div class="grid grid-2" style="gap:14px">
          <div><video controls src="${media(run.finalRel)}" style="width:100%;border-radius:8px"></video>${run.pack.thumbRel ? `<img src="${media(run.pack.thumbRel, run.pack.thumbTs)}" style="width:100%;border-radius:8px;margin-top:8px">` : ""}</div>
          <div><label class="field"><span>Titre</span><input id="f-title" value="${esc(run.pack.title)}"></label>
            <label class="field"><span>Description (chapitres + sources)</span><textarea id="f-desc" rows="12" style="width:100%;font-size:12px">${esc(run.pack.description)}</textarea></label>
            <label class="field"><span>Tags</span><input id="f-tags" value="${esc(run.pack.tags.join(", "))}"></label>
            <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn btn-sm" data-save>💾 Enregistrer</button>
              ${run.published ? `<a class="btn btn-sm" href="${esc(run.published.url)}" target="_blank">✅ Publiée (${esc(run.published.privacyStatus)})</a>` : `<select id="f-chan" style="min-width:150px"></select><select id="f-priv"><option value="private">🔒 Privée</option><option value="unlisted">🔗 Non répertoriée</option><option value="public">🌍 Publique</option></select><button class="btn btn-sm btn-accent" data-publish>📤 Publier</button>`}</div></div></div>`;
    }

    // ═══════════════════════════ Runs / Stock / Paramètres ═══════════════════════════
    async function renderRuns() {
      const body = el.querySelector("#d2-body"); const runs = await api("/api/machines/docu2d/runs");
      body.innerHTML = runs.length ? runs.map((r) => `<div class="scrap-row" style="gap:10px;cursor:pointer" data-run="${r.id}"><b class="grow">${esc(r.title)}</b><span class="small muted">${esc(r.status)}${r.running ? " ⏳" : ""}</span><span class="small">${r.seconds ? dur(r.seconds) : r.durationMin + " min"}</span><span class="small">${r.realPct != null ? r.realPct + " % réel" : ""}</span><span class="small mono">${r.cost.toFixed(2)}$</span></div>`).join("") : `<div class="empty">Aucun run.</div>`;
      body.querySelectorAll("[data-run]").forEach((x) => x.addEventListener("click", () => openWizard(x.dataset.run)));
    }
    async function renderStock() {
      const body = el.querySelector("#d2-body"); const st = await api("/api/machines/docu2d/stock");
      body.innerHTML = st.filter((v) => !v.archived).map((v) => `<div class="scrap-row" style="gap:10px">${v.thumbRel ? `<img src="${media(v.thumbRel)}" style="width:120px;border-radius:6px">` : ""}<b class="grow">${esc(v.title)}</b><span class="small">${dur(v.durationSec)}</span><a class="btn btn-sm" href="${media(v.finalRel)}" target="_blank">▶</a><span class="badge ${v.posted ? "mut" : "ok"}">${v.posted ? "postée" : "en stock"}</span></div>`).join("") || `<div class="empty">Stock vide.</div>`;
    }
    async function renderSettings() {
      const body = el.querySelector("#d2-body"); const s = cfg.settings;
      body.innerHTML = `<div class="grid grid-2">
        <label class="field"><span>Marque (fin de description)</span><input id="s-brand" value="${esc(s.brand)}"></label>
        <label class="field"><span>Durée par défaut (min)</span><input id="s-dur" type="number" min="3" max="30" value="${s.durationMin}"></label>
        <label class="field"><span>Part de plans réels par défaut (%)</span><input id="s-real" type="number" min="0" max="40" value="${s.realPct}"></label>
        <label class="field"><span>Volume musique (0-1)</span><input id="s-mvol" type="number" step="0.01" min="0" max="0.5" value="${s.musicVolume}"></label>
        <label class="field" style="grid-column:1/-1"><span>Style musical Suno</span><input id="s-mstyle" value="${esc(s.musicStyle)}"></label>
        <div class="small muted" style="grid-column:1/-1">Débits de voix mesurés (mots/min de parole) : ${Object.entries(s.pace || {}).map(([k, v]) => `${esc(k)} ${v}`).join(" · ") || "aucun"}</div>
      </div><button class="btn btn-accent" id="s-save">💾 Enregistrer</button>`;
      body.querySelector("#s-save").addEventListener("click", async () => {
        cfg = { ...cfg, ...(await api("/api/machines/docu2d", { method: "PATCH", body: { settings: { brand: body.querySelector("#s-brand").value, durationMin: +body.querySelector("#s-dur").value, realPct: +body.querySelector("#s-real").value, musicVolume: +body.querySelector("#s-mvol").value, musicStyle: body.querySelector("#s-mstyle").value } } })) };
        AgentOS.toast("Paramètres enregistrés", "ok");
      });
    }
    shell();
  },
});
