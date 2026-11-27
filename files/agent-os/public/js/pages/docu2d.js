/**
 * MACHINE DOCU PAPIER 2D — même ossature que Data Ranking : onglets Générer / Runs / Stock / Bestiaire / Paramètres,
 * fenêtre de run à étapes : Faits → Script → Voix → Storyboard → Plans → Rendu → Fini.
 * Mode semi : on valide le script, puis les plans (planche 1 image / 3 s) avant le rendu.
 */
AgentOS.register("docu2d", {
  title: "Docu Papier 2D",
  async render(el, params) {
    const { api, esc } = AgentOS;
    let cfg = await api("/api/machines/docu2d");
    const TABS = ["gen", "runs", "stock", "bestiary", "settings"];
    let tab = TABS.includes(localStorage.getItem("d2-tab")) ? localStorage.getItem("d2-tab") : "gen";
    if (params && TABS.includes(params.get("tab"))) tab = params.get("tab");
    let wizTimer = null;
    this.onLeave = () => clearTimeout(wizTimer);
    const media = (rel, ts) => `/media/${encodeURIComponent(rel)}${ts ? `?v=${ts}` : ""}`;
    const costOf = (run) => Object.values(run.cost || {}).reduce((a, b) => a + b, 0);
    const dur = (sec) => (sec ? `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, "0")} s` : "");
    const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    const FAMILIES = [["auto", "Auto (déduite du sujet)"], ["terrestre", "Animal terrestre"], ["rivière", "Animal de rivière"]];
    const SRC = { pexels: "Pexels", pixabay: "Pixabay", commons: "Wikimedia Commons", ai: "Image IA" };

    function shell() {
      el.innerHTML = `
        <div class="card">
          <h2><a href="#/machines" class="back-btn" style="margin-right:10px" title="Retour aux Machines">←</a>🦛 Docu Papier 2D
            <span class="h-actions"><span class="mini-seg" id="d2-tabs">
              ${[["gen", "⚙ Générer"], ["runs", "🎞 Runs"], ["stock", "📦 Stock"], ["bestiary", "🦛 Bestiaire"], ["settings", "🛠 Paramètres"]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}
            </span></span></h2>
          <div id="d2-body"></div>
        </div>`;
      el.querySelectorAll("#d2-tabs button").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.t; try { localStorage.setItem("d2-tab", tab); } catch {} shell(); }));
      ({ gen: renderGen, runs: renderRuns, stock: renderStock, bestiary: renderBestiary, settings: renderSettings })[tab]();
    }

    // ═══════════════════════════ Générer ═══════════════════════════
    async function renderGen() {
      const body = el.querySelector("#d2-body");
      const s = cfg.settings;
      let chans = []; try { chans = await api("/api/channels"); } catch {}
      let voices = cfg.voices; try { voices = await api("/api/machines/docu2d/voices"); } catch {}
      const noKey = !cfg.keys.pexels && !cfg.keys.pixabay;
      const seg2 = (id, on, title = "") => `<span class="mini-seg" id="${id}" title="${esc(title)}"><button data-v="0"${on ? "" : ' class="active"'}>Non</button><button data-v="1"${on ? ' class="active"' : ""}>Oui</button></span>`;
      body.innerHTML = `
        ${noKey ? `<div class="empty small" style="color:var(--err);margin:0 0 12px"><b>Aucune clé Pixabay ni Pexels</b> — cette machine en a besoin pour les plans réels libres. Ajoute-en une dans Paramètres → Coffre (Pixabay est gratuit).</div>` : ""}
        <label class="field"><span>Sujet de la vidéo — l'animal (💡 : 6 sujets tirés de la banque « Docu Animaux 2D »)</span></label>
        <div class="row mb" style="gap:6px;margin-top:-6px">
          <input id="g-subj" class="grow" placeholder="ex : le lion · l'hippopotame · le buffle d'Afrique">
          <button class="btn btn-sm" id="g-idea" title="Proposer des sujets d'après la banque de niche">💡</button>
        </div>
        <div id="g-ideas"></div>
        <div class="grid grid-4 mb" style="align-items:end;grid-template-columns:repeat(4,minmax(0,1fr))">
          <label class="field" style="margin:0" title="Le sujet dit QUOI ; la famille choisit le monde dessiné et les scènes (une espèce terrestre n'est jamais dans la rivière). Elle est déduite du sujet : ne la force que si la déduction se trompe."><span>Famille ⓘ</span>
            <select id="g-fam">${FAMILIES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
          <label class="field" style="margin:0"><span>Durée : <b id="g-dl">${s.durationMin}</b> min</span><input type="range" id="g-dur" min="1" max="20" step="1" value="${s.durationMin}" style="width:100%;height:36px;margin:0;display:block"></label>
          <label class="field" style="margin:0"><span>Langue</span><select id="g-lang">${Object.entries(cfg.langs).map(([k, l]) => `<option value="${k}"${k === s.lang ? " selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="field" style="margin:0"><span>Voix ElevenLabs</span><select id="g-voice">${voices.map((v) => `<option value="${esc(v.id)}"${v.id === s.voice ? " selected" : ""}>${esc(v.name)}</option>`).join("")}<option value="custom">✏ Autre voix (ID ElevenLabs)…</option></select></label>
        </div>
        <div id="g-vid-wrap" class="mb" style="display:none"><label class="field" style="margin:0"><span>ID de la voix ElevenLabs</span><input id="g-vid" placeholder="ex : 21m00Tcm4TlvDq8ikWAM"></label></div>
        <div class="fbar mb" style="padding:10px 12px;flex-wrap:wrap;gap:14px">
          <span class="fbar-item" title="Part du temps où l'écran est rempli par un plan réel libre ou une image IA (le reste : monde papier animé + infographies). La machine vise cette part, puis la MESURE : le chiffre obtenu est affiché à l'étape Plans."><span>Plein écran <b id="g-rl">${s.realPct}</b> % · motion design <b id="g-ml">${100 - s.realPct}</b> %</span>
            <input type="range" id="g-real" min="10" max="70" step="5" value="${s.realPct}" style="width:150px"></span>
          <span class="fbar-item" title="Images IA plein écran (GPT Image 2.5, 1K) pour ce qu'aucun plan libre ne montre : environ 1 plan plein écran sur 3."><span>Images IA</span>${seg2("g-aiimg", s.aiImages)}</span>
          <span class="fbar-item" title="Anime chaque image IA en 6 s (grok, 720p). Plus cher : à réserver aux vidéos importantes."><span>Vidéo IA</span>${seg2("g-aivid", s.aiVideo)}</span>
          <span class="fbar-item"><span>Plans réels</span>${["pexels", "pixabay", "commons"].map((k) => `<label class="fbar-check"><input type="checkbox" data-src="${k}"${(s.sources || []).includes(k) ? " checked" : ""}${(k === "pexels" && !cfg.keys.pexels) || (k === "pixabay" && !cfg.keys.pixabay) ? " disabled title=\"clé absente\"" : ""}>${SRC[k]}</label>`).join("")}</span>
        </div>
        <div class="fbar mb" style="padding:10px 12px;flex-wrap:wrap;gap:14px">
          <span class="fbar-item"><span>Musique</span>${seg2("g-music", s.music)}</span>
          <span class="fbar-item"><span>Mode</span><span class="mini-seg" id="g-mode"><button class="active" data-v="semi">Semi-manuel</button><button data-v="auto">100 % auto</button></span></span>
          <span class="fbar-item"><span>Publication auto</span>${seg2("g-pub", false)}</span>
          <span class="fbar-item" id="g-pubw" style="display:none"><select id="g-chan" style="min-width:170px"><option value="">— chaîne —</option>${chans.filter((c) => !c.error).map((c) => `<option value="${esc(c.channelId)}">${esc(c.title)}</option>`).join("")}</select>
            <select id="g-priv" style="width:150px"><option value="private" selected>🔒 Privée</option><option value="unlisted">🔗 Non répertoriée</option><option value="public">🌍 Publique</option></select></span>
          <span id="g-cost" style="margin-left:auto;font-weight:800;font-size:17px;color:#4ade80;background:rgba(74,222,128,.09);border:1px solid rgba(74,222,128,.35);border-radius:10px;padding:9px 16px;white-space:nowrap"></span>
          <button class="btn btn-accent" id="g-go" style="font-size:14px;padding:10px 22px"${noKey ? " disabled" : ""}>⚙ Générer</button>
        </div>
        <div class="small muted" id="g-costd" style="text-align:right;margin-bottom:4px"></div>
        <div class="small muted" style="text-align:right">Wikipédia (faits sourcés) → Script → Voix ElevenLabs → Storyboard vérifié → Plans réels libres + images IA → Remotion → Mix + contrôle d'écoute → Packaging (sources, fair use, miniature IA)</div>`;
      const $ = (q) => body.querySelector(q);
      const seg = (id, cb) => body.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { body.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle("active", x === b)); cb && cb(b.dataset.v); }));
      const val = (id) => body.querySelector(`#${id} button.active`).dataset.v;
      const on = (id) => val(id) === "1";
      const cost = async () => {
        $("#g-dl").textContent = $("#g-dur").value;
        try {
          const e = await api("/api/machines/docu2d/estimate", { method: "POST", body: { durationMin: +$("#g-dur").value, voice: $("#g-voice").value, realPct: +$("#g-real").value, aiImages: on("g-aiimg"), aiVideo: on("g-aivid"), music: on("g-music") } });
          const d = e.detail;
          $("#g-cost").textContent = `≈ ${e.usd.toFixed(2)} $`;
          $("#g-costd").innerHTML = `Devis : voix ${d.voice.toFixed(2)} $ (≈ ${e.chars} caractères ElevenLabs, inclus si tu as un forfait) · ${e.nAi ? `${e.nAi} images IA ${d.aiImages.toFixed(2)} $ · ` : ""}${d.aiVideo ? `${e.nAi} vidéos IA ${d.aiVideo.toFixed(2)} $ · ` : ""}${e.nFull - e.nAi} plans réels gratuits (contrôle vision ${d.vision.toFixed(2)} $) · musique ${d.music.toFixed(2)} $ · texte ${d.llm.toFixed(2)} $ · miniature IA ${d.thumb.toFixed(2)} $ — rendu ≈ ${e.renderMin} min sur ce PC`;
        } catch {}
      };
      $("#g-dur").addEventListener("input", cost);
      $("#g-real").addEventListener("input", (e) => { $("#g-rl").textContent = e.target.value; $("#g-ml").textContent = 100 - e.target.value; });
      $("#g-real").addEventListener("change", cost);
      $("#g-voice").addEventListener("change", () => { $("#g-vid-wrap").style.display = $("#g-voice").value === "custom" ? "" : "none"; cost(); });
      seg("g-aiimg", cost); seg("g-aivid", cost); seg("g-music", cost); seg("g-mode"); seg("g-pub", () => ($("#g-pubw").style.display = on("g-pub") ? "" : "none"));
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
        if (on("g-pub") && !$("#g-chan").value) return AgentOS.toast("Choisis la chaîne de publication", "err");
        const b = $("#g-go"); b.disabled = true; b.textContent = "⏳ Lancement…";
        try {
          const run = await api("/api/machines/docu2d/runs", { method: "POST", body: { subject, family: $("#g-fam").value, durationMin: +$("#g-dur").value, lang: $("#g-lang").value,
            voice: custom ? $("#g-vid").value.trim() : $("#g-voice").value, realPct: +$("#g-real").value, aiImages: on("g-aiimg"), aiVideo: on("g-aivid"),
            sources: [...body.querySelectorAll("[data-src]:checked")].map((x) => x.dataset.src), music: on("g-music"), mode: val("g-mode"),
            publishChannelId: on("g-pub") ? $("#g-chan").value : null, publishPrivacy: $("#g-priv").value } });
          AgentOS.toast("🚀 Run lancé", "ok"); openWizard(run.id);
        } catch (e) { AgentOS.toast(e.message, "err"); }
        b.disabled = false; b.textContent = "⚙ Générer";
      });
    }

    // ═══════════════════════════ Fenêtre de run ═══════════════════════════
    const STEPS = [{ key: "facts", icon: "📚", label: "Faits" }, { key: "script", icon: "📝", label: "Script" }, { key: "voice", icon: "🎙", label: "Voix" },
      { key: "storyboard", icon: "🧩", label: "Storyboard" }, { key: "broll", icon: "🎞", label: "Plans" }, { key: "render", icon: "🎬", label: "Rendu" }];
    const FINI = STEPS.length;
    const ORDER = ["facts", "script", "voice", "storyboard", "broll", "render", "mix", "package"];
    const stepIndex = (st) => { if (st === "done") return FINI; const k = String(st || "").replace(/_(running|done|ready)$/, ""); if (k === "mix") return 5; if (k === "package") return FINI; const i = STEPS.findIndex((x) => x.key === k); return i < 0 ? 0 : i; };
    const stepDone = (r, i) => [!!(r.facts && r.facts.length), !!r.script, !!r.timeline, !!r.storyboard, !!(r.check && !r.check.anomalies.length), !!(r.output && r.output.rel)][i];
    const pct = (r) => r.status === "done" ? 100 : Math.max(2, Math.round((100 * Math.max(0, ORDER.indexOf(String(r.status).replace(/_(running|done|ready)$/, "")))) / ORDER.length));
    const RUNMSG = { facts: "Lecture de Wikipédia (FR + EN), extraction des faits sourcés…", script: "Écriture du script + relecture des faits…", voice: "Voix ElevenLabs réplique par réplique, alignement mot à mot…",
      storyboard: "Storyboard ancré sur les mots, vérificateur, critique « ce qui est dit = ce qui est montré »…", broll: "Images IA + plans réels libres vérifiés par la vision, planche de relecture…",
      render: "Rendu Remotion…", mix: "Mix voix + musique, contrôle d'écoute…", package: "Titre, description, tags, miniature IA…" };

    function openWizard(runId) {
      const ov = document.createElement("div"); ov.className = "picker-overlay"; ov.innerHTML = `<div class="scrap-modal lg" id="wiz"><span class="spin"></span></div>`; document.body.appendChild(ov);
      const tick = async () => {
        let run; try { run = await api("/api/machines/docu2d/runs/" + runId); } catch (e) { ov.querySelector("#wiz").innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
        const box = ov.querySelector("#wiz");
        const key = [run.status, box.dataset.view || "", run.error ? 1 : 0, (run.log || []).length, run.pack ? run.pack.thumbTs || 1 : 0, run.published ? 1 : 0, run.running ? 1 : 0].join("|");
        if (box.dataset.k !== key) { box.dataset.k = key; draw(box, run, ov); }
        if ((run.running || /_running$/.test(run.status)) && document.body.contains(ov)) { clearTimeout(wizTimer); wizTimer = setTimeout(tick, 4000); }
      };
      tick();
    }
    function draw(box, run, ov) {
      const idx = stepIndex(run.status), running = !!run.running;
      const view = box.dataset.view !== undefined && box.dataset.view !== "" ? +box.dataset.view : Math.min(idx, FINI);
      const sc = box.querySelector(".wiz-scroll")?.scrollTop || 0;
      const k = String(run.status || "").replace(/_(running|done|ready)$/, "");
      const vlabel = { script_ready: "✓ Valider le script → Voix + storyboard + plans", broll_ready: "✓ Valider les plans → Rendu" }[run.status];
      box.classList.add("wiz-modal");
      box.innerHTML = `
        <div class="wiz-head">
          <div class="wiz-gbar" title="Progression : ${pct(run)} %"><div style="width:${pct(run)}%"></div></div>
          <div class="row between" style="margin:10px 0 4px"><h2 style="margin:0;font-size:15px">🦛 ${esc(run.pack?.title || run.script?.title || run.params.subject)}
            <span class="small muted mono" style="margin-left:8px">${run.id} · ${run.params.mode} · ${run.params.durationMin} min · ${esc(run.params.lang)} · ${costOf(run).toFixed(2)}$ · ${pct(run)}%</span></h2>
            <span class="row" style="gap:6px">${run.status !== "done" && !running ? `<button class="btn btn-sm" data-act="resume" title="⚡ Décharge : relance le run là où il s'est arrêté">⚡</button>` : ""}${running ? `<button class="btn btn-sm" data-act="cancel">🛑 Annuler</button>` : ""}<button class="btn btn-sm btn-ghost" data-close>✕</button></span></div>
          <div class="wiz-rail">${STEPS.map((s, i) => `<div class="wiz-step ${stepDone(run, i) ? "done" : i === idx ? "active" : ""}" data-view="${i}" style="cursor:pointer" title="${s.label}"><div class="wiz-dot" ${i === view ? 'style="outline:2px solid var(--accent);outline-offset:3px"' : ""}>${stepDone(run, i) ? "✓" : s.icon}</div><span>${s.label}</span></div>${i < STEPS.length - 1 ? `<div class="wiz-link ${stepDone(run, i) ? "done" : i === idx && running ? "active" : ""}"></div>` : ""}`).join("")}
            <div class="wiz-link ${run.status === "done" ? "done" : k === "package" ? "active" : ""}"></div><div class="wiz-step ${run.status === "done" ? "done" : ""}" data-view="${FINI}" style="cursor:pointer" title="Titre, description, tags, miniature, publication"><div class="wiz-dot" ${view === FINI ? 'style="outline:2px solid var(--accent);outline-offset:3px"' : ""}>🏁</div><span>Fini</span></div></div>
          ${run.error ? `<div class="empty small" style="color:var(--err);margin:0"><b>Échec</b> ${esc(run.error)} <button class="btn btn-sm" data-act="resume">↻ Reprendre où on s'est arrêté</button></div>` : ""}
          ${running ? `<div class="small muted"><span class="spin" style="width:12px;height:12px"></span> ${esc(RUNMSG[k] || "")} <span class="mono">— ${esc((run.log || []).slice(-1)[0]?.msg || "")}</span></div>` : ""}
        </div>
        <div class="wiz-scroll">${viewHTML(run, view)}</div>
        ${vlabel && !running ? `<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-accent" data-act="validate">${vlabel}</button></div>` : ""}`;
      box.querySelector("[data-close]").addEventListener("click", () => { clearTimeout(wizTimer); ov.remove(); });
      box.querySelectorAll(".wiz-step[data-view]").forEach((s) => s.addEventListener("click", () => { box.dataset.view = s.dataset.view; draw(box, run, ov); }));
      const reopen = () => { clearTimeout(wizTimer); ov.remove(); openWizard(run.id); };
      box.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => { b.disabled = true; try { await api(`/api/machines/docu2d/runs/${run.id}/${b.dataset.act}`, { method: "POST", body: {} }); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); b.disabled = false; } }));
      box.querySelectorAll("[data-from]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Refaire cette étape et les suivantes ?")) return; try { await api(`/api/machines/docu2d/runs/${run.id}/resume`, { method: "POST", body: { from: b.dataset.from } }); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); } }));
      box.querySelectorAll("[data-zoom]").forEach((im) => im.addEventListener("click", () => window.open(im.dataset.zoom, "_blank")));
      wireFini(box, run, reopen, view);
      const s2 = box.querySelector(".wiz-scroll"); if (s2) s2.scrollTop = sc;
    }
    function viewHTML(run, view) {
      const key = STEPS[view]?.key || "fini"; const idle = !run.running;
      const redo = (st, l) => idle && run.status !== "created" ? `<button class="mini-btn" data-from="${st}" title="Refaire cette étape (et les suivantes)">↻ ${l}</button>` : "";
      const wait = (msg) => `<div class="empty small"><span class="spin"></span> ${msg}</div>`;
      if (key === "facts") {
        if (!run.facts) return wait(RUNMSG.facts);
        return `<div class="row between mb"><span class="small muted">${run.facts.length} faits · espèce dessinée : <b>${esc(run.meta?.hero)}</b> · famille : ${esc(run.meta?.family)} · sources : ${(run.sources || []).map((x) => `<a href="${esc(x.url)}" target="_blank">${esc(x.title)}</a>`).join(", ")}</span>${redo("facts", "Refaire")}</div>
          ${run.story?.who ? `<div class="scrap-row small"><b>Histoire d'accroche</b>&nbsp;${esc(run.story.who)} — ${esc(run.story.when || "")}, ${esc(run.story.where || "")} : ${esc(run.story.what || "")}</div>` : ""}
          ${run.facts.map((f) => `<div class="scrap-row small" style="gap:10px"><span class="grow">${esc(f.claim)} ${f.uncertain ? '<span class="badge warn">incertain</span>' : ""}</span><b class="mono" style="flex:none">${esc(f.value || "")}</b>${f.src ? `<a href="${esc(f.src)}" target="_blank" style="flex:none">source</a>` : ""}</div>`).join("")}`;
      }
      if (key === "script") {
        if (!run.script) return wait(RUNMSG.script);
        return `<div class="row between mb"><span class="small muted">${run.script.lines.length} répliques · ${run.script.words} mots (cible ${run.script.target}) · titre : <b>${esc(run.script.title)}</b>${(run.factCheck || []).length ? ` · relecture des faits : ${run.factCheck.length} réplique(s) corrigée(s)` : ""}</span>${redo("script", "Réécrire")}</div>
          ${run.script.lines.map((l) => `<div class="scrap-row small" style="gap:10px;align-items:flex-start"><span class="badge" style="flex:none;width:58px;text-align:center">${esc(l.scene)}</span><span class="grow" style="line-height:1.5">${esc(l.text)}</span></div>`).join("")}`;
      }
      if (key === "voice") {
        if (!run.timeline) return wait(RUNMSG.voice);
        const rel = run.voiceRel || `agent-os/output/machines/${run.id}/vo-tight/l01.mp3`;
        return `<div class="row between mb"><span class="small">Voix complète : <b>${dur(run.timeline.total)}</b> · ${run.timeline.lines} répliques · débit mesuré <b>${run.timeline.wpm}</b> mots/min · pauses ×${run.timeline.pause}</span>${redo("voice", "Refaire la voix")}</div>
          <audio controls src="${media(rel)}" style="width:100%"></audio>${run.voiceRel ? "" : `<div class="small muted">Ancien run : seule la 1re réplique est disponible ici.</div>`}`;
      }
      if (key === "storyboard") {
        if (!run.storyboard) return wait(RUNMSG.storyboard);
        return `<div class="row between mb"><span class="small">${run.storyboard.beats} beats · ${run.storyboard.broll} plans plein écran prévus</span>${redo("storyboard", "Refaire le storyboard")}</div>
          ${(run.log || []).filter((l) => /Storyboard essai|Critique du storyboard|Réparation automatique|fautif/.test(l.msg)).map((l) => `<div class="small muted">${esc(l.msg)}</div>`).join("")}
          ${(run.storyWarnings || []).length ? `<div class="small" style="color:var(--warn);margin-top:6px">⚠ ${run.storyWarnings.map(esc).join(" · ")}</div>` : ""}`;
      }
      if (key === "broll") {
        if (!run.check) return wait(RUNMSG.broll);
        const c = run.check; const full = +(c.realPct + (c.aiPct || 0)).toFixed(1); const okc = full >= c.target - 3;
        const stills = (run.stills || []).map((rel) => ({ rel, t: parseFloat((/t([\d.]+)\.jpg$/.exec(rel) || [])[1] || 0) }));
        return `<div class="row between mb"><span class="small">Plein écran mesuré : <b style="color:${okc ? "var(--ok)" : "var(--warn)"}">${full} %</b> pour une cible de ${c.target} % (plans réels ${c.realPct} % · images IA ${c.aiPct || 0} %) · infographies ${Math.max(0, +(c.cardPct - full).toFixed(1))} % · anomalies : <b>${c.anomalies.length}</b></span>${redo("storyboard", "Refaire storyboard + plans")}</div>
          ${c.anomalies.map((i) => `<div class="small" style="color:var(--err)">✗ [${esc(i.rule)}] ${esc(i.msg)}</div>`).join("")}
          ${(run.media || []).length ? `<div class="small muted" style="margin:8px 0 4px">Plans plein écran (${run.media.length}) — source et ce que la vision y a vu :</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">${run.media.map((m) => `<div style="border:1px solid var(--border-soft);border-radius:8px;overflow:hidden;background:var(--bg-deep)">
            ${m.kind === "video" ? `<video src="${media(m.rel)}" muted loop playsinline preload="metadata" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block" onmouseenter="this.play()" onmouseleave="this.pause()"></video>` : `<img src="${media(m.rel)}" data-zoom="${media(m.rel)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;cursor:zoom-in">`}
            <div style="padding:6px 8px" class="small"><span class="badge ${m.src === "ai" ? "accent" : "ok"}">${esc(SRC[m.src] || m.src)}</span> <span class="mono muted">${esc(m.line || "")}</span><div class="muted" style="margin-top:3px;line-height:1.35">${esc((m.seen || m.prompt || "").slice(0, 140))}</div></div></div>`).join("")}</div>` : ""}
          ${stills.length ? `<div class="small muted" style="margin:12px 0 4px">Planche de relecture : 1 image toutes les ~3 s (clic = plein format)</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">${stills.map((x) => `<div style="position:relative"><img src="${media(x.rel)}" data-zoom="${media(x.rel)}" style="width:100%;border-radius:6px;display:block;cursor:zoom-in"><span class="mono" style="position:absolute;left:6px;top:6px;background:rgba(0,0,0,.65);color:#fff;font-size:11px;padding:1px 6px;border-radius:4px">${mmss(x.t)}</span></div>`).join("")}</div>`
          : (run.sheets || []).map((s) => `<img src="${media(s)}" data-zoom="${media(s)}" style="width:100%;border-radius:8px;margin:6px 0;cursor:zoom-in">`).join("") || `<div class="small muted">Planche de relecture indisponible.</div>`}`;
      }
      if (key === "render") {
        if (run.output) return `<video controls src="${media(run.output.rel, new Date(run.updatedAt).getTime())}" style="width:100%;max-height:460px;border-radius:12px;background:#000"></video>
          <div class="row between mt"><span class="small muted">${dur(run.output.seconds)} · rendu en ${run.render?.min || "?"} min · ${run.output.lufs} LUFS · contrôle d'écoute ${run.output.listen?.ok ? "✓ voix reconnue" : "—"}</span><span class="row" style="gap:6px">${redo("render", "Re-rendre")}<a class="btn btn-sm btn-accent" href="${media(run.output.rel)}" download>⬇ Télécharger</a></span></div>`;
        return wait(RUNMSG.render);
      }
      // ── Fini
      const pk = run.pack;
      if (!pk) return run.running && /package/.test(run.status) ? wait(RUNMSG.package) : `<div class="empty small">La vidéo n'est pas encore prête.</div>`;
      return `
        ${run.published?.url ? `<div class="empty small" style="margin:0 0 10px;color:#4ade80;border-color:rgba(74,222,128,.4)"><b>📤 Publiée (${esc(run.published.privacyStatus)})</b> <a href="${esc(run.published.url)}" target="_blank">▶ Voir sur YouTube</a></div>`
          : `<div class="small muted" style="margin-bottom:8px">📦 La vidéo attend dans le <b>Stock</b> — publie-la ci-dessous ou copie les textes.</div>`}
        <div class="row" style="gap:16px;align-items:flex-start">
          <div style="flex:none;width:300px">
            ${pk.thumbRel ? `<img src="${media(pk.thumbRel, pk.thumbTs)}" data-zoom="${media(pk.thumbRel, pk.thumbTs)}" style="width:300px;border-radius:10px;border:1px solid var(--border-soft);cursor:zoom-in">` : `<div class="empty small">Pas de miniature</div>`}
            <div class="small muted" style="text-align:center;margin-top:4px">Miniature IA au code de la niche (références : miniatures concurrentes les plus vues)</div>
            <div class="row" style="gap:5px;margin-top:6px"><input type="text" id="pk-ttext" value="${esc(pk.thumbText || "")}" placeholder="TEXTE (*mot* = rouge)" style="flex:1;font-size:11px;text-transform:uppercase"><button class="mini-btn" data-thumb="text" title="Reposer le texte (gratuit)">↻</button><button class="mini-btn" data-thumb="image" title="Nouvelle image IA (≈ 0,03 $)">🎨</button></div>
            ${run.finalRel ? `<a class="btn btn-sm btn-ghost" style="width:100%;margin-top:8px;text-align:center" href="${media(run.finalRel)}" download>⬇ Télécharger la vidéo</a>` : ""}
            ${pk.thumbRel ? `<a class="btn btn-sm btn-ghost" style="width:100%;margin-top:6px;text-align:center" href="${media(pk.thumbRel)}" download>⬇ Télécharger la miniature</a>` : ""}
          </div>
          <div class="grow" style="min-width:0">
            <div class="field" style="margin-bottom:10px"><div class="row between" style="font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:4px;gap:6px"><span>Titre</span><span class="row" style="gap:5px"><span class="small muted mono">${(pk.title || "").length}/100</span><button class="mini-btn" data-copy="pk-title">📋</button></span></div><input type="text" id="pk-title" value="${esc(pk.title || "")}"></div>
            ${(pk.titleAlt || []).length ? `<div class="small muted" style="margin:-4px 0 8px">Variantes : ${pk.titleAlt.map((t) => `<a href="#" data-alt="${esc(t)}">${esc(t)}</a>`).join(" · ")}</div>` : ""}
            <div class="field" style="margin-bottom:10px"><div class="row between" style="font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:4px;gap:6px"><span>Description <span class="muted small" style="font-weight:400">(chapitres, sources, fair use)</span></span><button class="mini-btn" data-copy="pk-desc">📋</button></div><textarea id="pk-desc" rows="11">${esc(pk.description || "")}</textarea></div>
            <div class="field" style="margin-bottom:10px"><div class="row between" style="font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:4px;gap:6px"><span>Tags</span><span class="row" style="gap:5px"><span class="small muted mono">${(pk.tags || []).join(", ").length}/500</span><button class="mini-btn" data-copy="pk-tags">📋</button></span></div><textarea id="pk-tags" rows="3">${esc((pk.tags || []).join(", "))}</textarea></div>
            <div class="row" style="gap:8px">
              <button class="btn btn-sm btn-ghost" data-save-texts>💾 Enregistrer</button>
              ${run.published ? "" : `<select id="pk-chan" style="flex:1"><option value="">— chaîne YouTube —</option></select>
              <select id="pk-priv" style="width:170px"><option value="private" selected>🔒 Privée</option><option value="unlisted">🔗 Non répertoriée</option><option value="public">🌍 Publique</option></select>
              <button class="btn btn-sm btn-accent" data-publish disabled>📤 Publier</button>`}
            </div>
          </div>
        </div>`;
    }
    function wireFini(box, run, reopen, view) {
      if (view !== FINI || !run.pack) return;
      const $ = (q) => box.querySelector(q);
      const texts = () => ({ title: $("#pk-title").value, description: $("#pk-desc").value, tags: $("#pk-tags").value.split(",").map((x) => x.trim()).filter(Boolean) });
      box.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => { navigator.clipboard.writeText($("#" + b.dataset.copy).value); AgentOS.toast("Copié", "ok"); }));
      box.querySelectorAll("[data-alt]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); $("#pk-title").value = a.dataset.alt; }));
      const sv = $("[data-save-texts]"); if (sv) sv.addEventListener("click", async () => { try { await api(`/api/machines/docu2d/runs/${run.id}/save-texts`, { method: "POST", body: texts() }); AgentOS.toast("Textes enregistrés", "ok"); } catch (e) { AgentOS.toast(e.message, "err"); } });
      box.querySelectorAll("[data-thumb]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true; const old = b.textContent; b.textContent = "⏳";
        try { await api(`/api/machines/docu2d/runs/${run.id}/thumbnail`, { method: "POST", body: { text: $("#pk-ttext").value, scene: b.dataset.thumb === "image" ? run.pack.thumbScene || " " : "" } }); AgentOS.toast("Miniature refaite", "ok"); reopen(); }
        catch (e) { AgentOS.toast(e.message, "err"); b.disabled = false; b.textContent = old; }
      }));
      const chan = $("#pk-chan"), pub = $("[data-publish]");
      if (chan) {
        api("/api/channels").then((cs) => { chan.innerHTML = `<option value="">— chaîne YouTube —</option>` + cs.filter((c) => !c.error).map((c) => `<option value="${esc(c.channelId)}">${esc(c.title)}</option>`).join(""); }).catch(() => {});
        chan.addEventListener("change", () => (pub.disabled = !chan.value));
        pub.addEventListener("click", async () => { pub.disabled = true; pub.textContent = "⏳ Envoi…"; try { const r = await api(`/api/machines/docu2d/runs/${run.id}/publish`, { method: "POST", body: { channelId: chan.value, privacyStatus: $("#pk-priv").value, ...texts() } }); AgentOS.toast("📤 Publiée : " + r.url, "ok"); reopen(); } catch (e) { AgentOS.toast(e.message, "err"); pub.disabled = false; pub.textContent = "📤 Publier"; } });
      }
    }

    // ═══════════════════════════ Runs ═══════════════════════════
    async function renderRuns() {
      const body = el.querySelector("#d2-body"); const runs = await api("/api/machines/docu2d/runs");
      body.innerHTML = runs.length ? runs.map((r) => `<div class="scrap-row" style="gap:10px;cursor:pointer" data-run="${r.id}">
          <b class="grow">${esc(r.title)}</b><span class="small muted">${esc(r.status)}${r.running ? " ⏳" : ""}</span><span class="small">${r.seconds ? dur(r.seconds) : r.durationMin + " min"}</span>
          <span class="small">${r.realPct != null ? r.realPct + " % plein écran" : ""}</span><span class="small mono">${r.cost.toFixed(2)}$</span>
          ${r.status !== "done" && !r.running ? `<button class="mini-btn" data-zap="${r.id}" title="⚡ Décharge : reprendre là où le run s'est arrêté">⚡</button>` : ""}</div>`).join("") : `<div class="empty">Aucun run.</div>`;
      body.querySelectorAll("[data-run]").forEach((x) => x.addEventListener("click", (e) => { if (e.target.closest("[data-zap]")) return; openWizard(x.dataset.run); }));
      body.querySelectorAll("[data-zap]").forEach((b) => b.addEventListener("click", async () => { b.disabled = true; try { await api(`/api/machines/docu2d/runs/${b.dataset.zap}/resume`, { method: "POST", body: {} }); AgentOS.toast("⚡ Reprise", "ok"); renderRuns(); } catch (e) { AgentOS.toast(e.message, "err"); b.disabled = false; } }));
    }

    // ═══════════════════════════ Stock ═══════════════════════════
    async function renderStock() {
      const body = el.querySelector("#d2-body"); const st = await api("/api/machines/docu2d/stock");
      const row = (v) => `<div class="scrap-row" style="gap:10px">${v.thumbRel ? `<img src="${media(v.thumbRel)}" style="width:128px;border-radius:6px">` : ""}<div class="grow" style="min-width:0"><b>${esc(v.title)}</b><div class="small muted">${dur(v.durationSec)}</div></div>
        <a class="btn btn-sm" href="${media(v.finalRel)}" target="_blank">▶</a><button class="btn btn-sm btn-ghost" data-open="${v.runId}">Ouvrir</button>
        <button class="mini-btn" data-posted="${v.id}" data-v="${v.posted ? 0 : 1}" title="Marquer ${v.posted ? "non publiée" : "publiée à la main"}">${v.posted ? "↩" : "✓ publiée"}</button>
        <button class="mini-btn" data-arch="${v.id}" data-v="${v.archived ? 0 : 1}">${v.archived ? "Désarchiver" : "Archiver"}</button>
        <span class="badge ${v.posted ? "mut" : "ok"}">${v.posted ? "postée" : "en stock"}</span></div>`;
      const live = st.filter((v) => !v.archived), arch = st.filter((v) => v.archived);
      body.innerHTML = (live.map(row).join("") || `<div class="empty">Stock vide.</div>`) + (arch.length ? `<details style="margin-top:12px"><summary class="small muted">Archives (${arch.length})</summary>${arch.map(row).join("")}</details>` : "");
      body.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openWizard(b.dataset.open)));
      const patch = async (id, p) => { try { await api(`/api/machines/docu2d/stock/${id}`, { method: "PATCH", body: p }); renderStock(); } catch (e) { AgentOS.toast(e.message, "err"); } };
      body.querySelectorAll("[data-posted]").forEach((b) => b.addEventListener("click", () => patch(b.dataset.posted, { posted: b.dataset.v === "1" })));
      body.querySelectorAll("[data-arch]").forEach((b) => b.addEventListener("click", () => patch(b.dataset.arch, { archived: b.dataset.v === "1" })));
    }

    // ═══════════════════════════ Bestiaire ═══════════════════════════
    async function renderBestiary() {
      const body = el.querySelector("#d2-body");
      const list = await api("/api/machines/docu2d/bestiary");
      body.innerHTML = `
        <div class="row between mb" style="gap:12px"><span class="small muted">Les animaux que la machine sait DESSINER dans le monde papier (gabarit en mètres : taille réelle, marche à pieds plantés, gueule, cornes, défenses). Une espèce terrestre n'est jamais posée dans la rivière. Les plans réels et les images IA, eux, montrent toujours le vrai animal.</span>
          <button class="btn btn-sm" id="b-render" style="flex:none">↻ Redessiner les planches</button></div>
        <div class="grid grid-2" style="gap:12px">${list.map((b) => `<div class="scrap-row" style="flex-direction:column;align-items:stretch;gap:6px">
          ${b.sheet ? `<img src="${media(b.sheet, b.ts)}" style="width:100%;border-radius:8px;background:#f3ecdc">` : `<div class="empty small">Planche pas encore dessinée — clique « Redessiner les planches ».</div>`}
          <div class="row between"><b>${esc(b.fr)}</b><span class="small muted">${b.h} m au garrot · ${b.l} m de long</span></div>
          <div class="row" style="gap:6px;flex-wrap:wrap"><span class="badge ${b.aquatic ? "accent" : "mut"}">${b.aquatic ? "aquatique" : "terrestre"}</span>${b.gape ? '<span class="badge warn">gueule ouverte (menace)</span>' : ""}<span class="small muted">${esc(b.note)}</span></div>
        </div>`).join("")}</div>`;
      body.querySelector("#b-render").addEventListener("click", async (e) => {
        const b = e.target; b.disabled = true; b.textContent = "⏳ Dessin des planches (1-2 min)…";
        try { await api("/api/machines/docu2d/bestiary/render", { method: "POST" }); renderBestiary(); } catch (err) { AgentOS.toast(err.message, "err"); b.disabled = false; b.textContent = "↻ Redessiner les planches"; }
      });
    }

    // ═══════════════════════════ Paramètres ═══════════════════════════
    async function renderSettings() {
      const body = el.querySelector("#d2-body"); const s = cfg.settings;
      body.innerHTML = `<div class="grid grid-2">
        <label class="field"><span>Marque (fin de description)</span><input id="s-brand" value="${esc(s.brand)}"></label>
        <label class="field"><span>Durée par défaut (min)</span><input id="s-dur" type="number" min="1" max="20" value="${s.durationMin}"></label>
        <label class="field"><span>Part plein écran par défaut (%)</span><input id="s-real" type="number" min="10" max="70" value="${s.realPct}"></label>
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
