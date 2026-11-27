    // ===== MACHINE DOCU PAPIER 2D ===== (documentaires animaliers papier, moteur Remotion Docu2D)
    if (p === "/api/machines/docu2d/stock" && req.method === "GET") return json(res, 200, docu2d.stock());
    m = /^\/api\/machines\/docu2d\/stock\/([\w-]+)$/.exec(p);
    if (m && req.method === "PATCH") { const b = await readBody(req); try { return json(res, 200, docu2d.patchStock(m[1], b)); } catch (e) { return json(res, 400, { error: e.message }); } }
    if (p === "/api/machines/docu2d" && req.method === "GET") {
      const c = docu2d.config();
      return json(res, 200, { ...c, langs: docu2d.LANGS, voices: docu2d.ELEVEN_VOICES, species: docu2d.SPECIES_OK, keys: docu2d.stockKeys() });
    }
    if (p === "/api/machines/docu2d" && req.method === "PATCH") { const b = await readBody(req); return json(res, 200, docu2d.patchConfig(b)); }
    if (p === "/api/machines/docu2d/voices" && req.method === "GET") { try { return json(res, 200, await docu2d.voices()); } catch (e) { return json(res, 200, docu2d.ELEVEN_VOICES); } }
    if (p === "/api/machines/docu2d/estimate" && req.method === "POST") { const b = await readBody(req); return json(res, 200, docu2d.estimate(b)); }
    if (p === "/api/machines/docu2d/idea" && req.method === "POST") {
      const b = await readBody(req).catch(() => ({}));
      try { return json(res, 200, { ideas: await docu2d.suggestTopics(6, b.family || "auto") }); } catch (e) { return json(res, 500, { error: e.message }); }
    }
    if (p === "/api/machines/docu2d/runs" && req.method === "GET") return json(res, 200, docu2d.listRuns().map(docu2d.summary));
    if (p === "/api/machines/docu2d/runs" && req.method === "POST") {
      const b = await readBody(req);
      try { const r = docu2d.createRun(b); return json(res, 200, docu2d.start(r.id)); } catch (e) { return json(res, 400, { error: e.message }); }
    }
    m = /^\/api\/machines\/docu2d\/runs\/([\w-]+)$/.exec(p);
    if (m && req.method === "GET") { const r = docu2d.getRun(m[1]); return r ? json(res, 200, { ...r, running: docu2d.isLive(r.id) }) : json(res, 404, { error: "run introuvable" }); }
    m = /^\/api\/machines\/docu2d\/runs\/([\w-]+)\/(resume|validate|cancel|publish|save-texts)$/.exec(p);
    if (m && req.method === "POST") {
      const b = await readBody(req).catch(() => ({}));
      try {
        const id = m[1];
        switch (m[2]) {
          case "resume": return json(res, 200, docu2d.start(id, b.from || null));
          case "validate": return json(res, 200, docu2d.validate(id));
          case "cancel": return json(res, 200, docu2d.cancelRun(id));
          case "publish": return json(res, 200, await docu2d.publishRun(id, b));
          case "save-texts": return json(res, 200, docu2d.saveTexts(id, b));
        }
      } catch (e) { return json(res, 400, { error: e.message }); }
    }
    // ===== FIN MACHINE DOCU PAPIER 2D =====
