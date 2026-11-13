"use strict";
(() => {
  // src/api.ts
  var currentUserName = "Lead Organizational Analyst";
  var currentUserRole = "Admin";
  function setAuthContext(name, role) {
    currentUserName = name;
    currentUserRole = role;
  }
  function getAuthContext() {
    return { name: currentUserName, role: currentUserRole };
  }
  async function request(path, options = {}) {
    const headers = {
      "X-User-Name": currentUserName,
      "X-User-Role": currentUserRole,
      ...options.headers || {}
    };
    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }
  var api = {
    getCompanies: () => request("/api/companies"),
    createCompany: (data) => request("/api/companies", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    updateCompany: (id, data) => request(`/api/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    getAssessments: (companyId) => request(
      companyId ? `/api/assessments?company_id=${companyId}` : "/api/assessments"
    ),
    createAssessment: (data) => request("/api/assessments", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    getAssessmentSummary: (id) => request(`/api/assessments/${id}`),
    runAnalysis: (id) => request(`/api/assessments/${id}/run-analysis`, { method: "POST" }),
    recalculateScores: (id) => request(`/api/assessments/${id}/recalculate-scores`, {
      method: "POST"
    }),
    compareAssessments: (baseId, targetId) => request(`/api/assessments/compare?base_id=${baseId}&target_id=${targetId}`),
    getDocuments: (assessmentPeriodId) => request(
      `/api/documents?assessment_period_id=${assessmentPeriodId}`
    ),
    uploadDocumentsForm: (formData) => request("/api/documents/upload", {
      method: "POST",
      body: formData
    }),
    getDocumentDetails: (docId) => request(`/api/documents/${docId}`),
    retryDocument: (docId) => request(`/api/documents/${docId}/retry`, { method: "POST" }),
    archiveDocument: (docId) => request(`/api/documents/${docId}`, { method: "DELETE" }),
    searchChunks: (query, companyId, assessmentPeriodId, category, financialYear) => {
      const params = new URLSearchParams({
        query,
        company_id: String(companyId),
        assessment_period_id: String(assessmentPeriodId)
      });
      if (category) params.set("document_category", category);
      if (financialYear) params.set("financial_year", financialYear);
      return request(`/api/documents/search/chunks?${params.toString()}`);
    },
    getStakeholders: (assessmentPeriodId) => request(
      `/api/stakeholders?assessment_period_id=${assessmentPeriodId}`
    ),
    updateStakeholderWeight: (stakeholderId, importanceWeight, influenceLevel, dependenceLevel, justification) => request(`/api/stakeholders/${stakeholderId}/weight`, {
      method: "PUT",
      body: JSON.stringify({
        importance_weight: importanceWeight,
        influence_level: influenceLevel,
        dependence_level: dependenceLevel,
        justification: justification || "Adjusted stakeholder importance weight"
      })
    }),
    updateExpectationWeight: (expectationId, requirementWeight, justification) => request(`/api/stakeholders/expectations/${expectationId}/weight`, {
      method: "PUT",
      body: JSON.stringify({
        requirement_weight: requirementWeight,
        justification: justification || "Adjusted requirement weight"
      })
    }),
    getStructureAnalysis: (assessmentPeriodId) => request(`/api/analysis/${assessmentPeriodId}/structure`),
    getAlignmentMatrix: (assessmentPeriodId) => request(`/api/analysis/${assessmentPeriodId}/alignment-matrix`),
    overrideAlignment: (alignmentId, newClassification, justification) => request(`/api/analysis/alignments/${alignmentId}/override`, {
      method: "POST",
      body: JSON.stringify({
        new_classification: newClassification,
        justification,
        evaluator_name: currentUserName,
        evaluator_role: currentUserRole
      })
    }),
    getConflicts: (assessmentPeriodId) => request(
      `/api/analysis/${assessmentPeriodId}/conflicts`
    ),
    getRecommendations: (assessmentPeriodId) => request(
      `/api/analysis/${assessmentPeriodId}/recommendations`
    ),
    updateRecommendationStatus: (recId, status) => request(
      `/api/analysis/recommendations/${recId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status, actor: currentUserName })
      }
    ),
    getEvidence: (assessmentPeriodId, classification) => {
      const params = new URLSearchParams({
        assessment_period_id: String(assessmentPeriodId)
      });
      if (classification) params.set("evidence_classification", classification);
      return request(`/api/evidence?${params.toString()}`);
    },
    getAuditLogs: (assessmentPeriodId) => request(`/api/analysis/${assessmentPeriodId}/audit-logs`),
    getPrompts: () => request("/api/analysis/prompts"),
    getLlmConfig: () => request("/api/analysis/llm-config"),
    updateLlmConfig: (data) => request("/api/analysis/llm-config", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    runAiSynthesis: (assessmentPeriodId, question) => request(`/api/analysis/${assessmentPeriodId}/ai-synthesize`, {
      method: "POST",
      body: JSON.stringify({ question })
    }),
    triggerBackup: () => request("/api/analysis/backup", {
      method: "POST"
    }),
    getReport: (assessmentPeriodId) => request(`/api/reports/${assessmentPeriodId}`)
  };

  // src/lib/react-lite.ts
  function Fragment(props) {
    return props.children || [];
  }
  if (typeof window !== "undefined") {
    window.Fragment = Fragment;
    window.h = h;
  }
  function h(tag, props, ...children) {
    const flatChildren = [];
    const flatten = (arr) => {
      for (const item of arr) {
        if (Array.isArray(item)) {
          flatten(item);
        } else {
          flatChildren.push(item);
        }
      }
    };
    flatten(children);
    return {
      tag,
      props: props || {},
      children: flatChildren
    };
  }
  var stateStore = [];
  var stateCursor = 0;
  var effectStore = [];
  var effectCursor = 0;
  var pendingEffects = [];
  var rootComponent = null;
  var rootContainer = null;
  var renderScheduled = false;
  function useState(initialValue) {
    const idx = stateCursor++;
    if (stateStore.length <= idx) {
      stateStore[idx] = initialValue;
    }
    const setState = (next) => {
      const prev = stateStore[idx];
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved !== prev) {
        stateStore[idx] = resolved;
        scheduleRender();
      }
    };
    return [stateStore[idx], setState];
  }
  function useEffect(callback, deps) {
    const idx = effectCursor++;
    const prev = effectStore[idx];
    let changed = true;
    if (prev && deps && prev.deps) {
      changed = deps.length !== prev.deps.length || deps.some((d, i) => d !== prev.deps[i]);
    }
    if (changed) {
      pendingEffects.push(() => {
        if (prev && typeof prev.cleanup === "function") {
          prev.cleanup();
        }
        const cleanup = callback();
        effectStore[idx] = {
          deps,
          cleanup: typeof cleanup === "function" ? cleanup : void 0
        };
      });
    }
  }
  var SVG_TAGS = /* @__PURE__ */ new Set([
    "svg",
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "g",
    "text",
    "defs",
    "marker",
    "linearGradient",
    "stop"
  ]);
  function createDomNode(node, isSvg = false) {
    if (node === null || node === void 0 || typeof node === "boolean") {
      return document.createTextNode("");
    }
    if (typeof node === "string" || typeof node === "number") {
      return document.createTextNode(String(node));
    }
    if (Array.isArray(node)) {
      const frag = document.createDocumentFragment();
      for (const c of node) {
        frag.appendChild(createDomNode(c, isSvg));
      }
      return frag;
    }
    if (typeof node.tag === "function") {
      const res = node.tag({ ...node.props, children: node.children });
      return createDomNode(res, isSvg);
    }
    const nextIsSvg = isSvg || SVG_TAGS.has(node.tag);
    const el = nextIsSvg ? document.createElementNS("http://www.w3.org/2000/svg", node.tag) : document.createElement(node.tag);
    for (const child of node.children) {
      el.appendChild(createDomNode(child, nextIsSvg));
    }
    for (const [k, v] of Object.entries(node.props || {})) {
      if (k === "children" || k === "key" || v === void 0 || v === null || v === false) {
        continue;
      }
      if (k === "className") {
        if (nextIsSvg) {
          el.setAttribute("class", String(v));
        } else {
          el.className = String(v);
        }
      } else if (k === "style" && typeof v === "object") {
        Object.assign(el.style, v);
      } else if (k.startsWith("on") && typeof v === "function") {
        const eventName = k.slice(2).toLowerCase();
        el.addEventListener(eventName, v);
      } else if (k === "checked" || k === "value" || k === "disabled" || k === "selected") {
        el[k] = v;
        if (v === true && k !== "value") {
          el.setAttribute(k, "");
        }
      } else if (k === "colSpan") {
        el.setAttribute("colspan", String(v));
      } else if (k === "rowSpan") {
        el.setAttribute("rowspan", String(v));
      } else if (k === "htmlFor") {
        el.setAttribute("for", String(v));
      } else {
        el.setAttribute(k, String(v));
      }
    }
    return el;
  }
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    Promise.resolve().then(() => {
      renderScheduled = false;
      performRender();
    });
  }
  function performRender() {
    if (!rootComponent || !rootContainer) return;
    const activeEl = document.activeElement;
    let focusInfo = null;
    if (activeEl && rootContainer.contains(activeEl) && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      focusInfo = {
        tag: activeEl.tagName,
        placeholder: activeEl.getAttribute("placeholder") || "",
        type: activeEl.getAttribute("type") || "",
        selStart: activeEl.selectionStart,
        selEnd: activeEl.selectionEnd
      };
    }
    stateCursor = 0;
    effectCursor = 0;
    pendingEffects = [];
    try {
      const vnode = rootComponent();
      rootContainer.innerHTML = "";
      rootContainer.appendChild(createDomNode(vnode));
    } catch (renderErr) {
      console.error("UI Render Error:", renderErr);
      rootContainer.innerHTML = `
      <div style="min-h-screen; display:flex; align-items:center; justify-content:center; padding:40px; background:#0a0e1a; color:#f8fafc; font-family:sans-serif; text-align:center;">
        <div style="background:#111827; border:1px solid #374151; border-radius:16px; padding:32px; max-width:540px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="font-size:36px; margin-bottom:12px;">\u26A1</div>
          <h2 style="font-size:18px; font-weight:800; margin-bottom:8px; color:#ffffff;">Diagnostic Workspace Recovered</h2>
          <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">${renderErr && renderErr.message ? renderErr.message : "An unexpected rendering event occurred."}</p>
          <button onclick="window.location.reload()" style="padding:10px 20px; background:#4f46e5; color:#ffffff; font-weight:700; border-radius:8px; cursor:pointer; border:none; font-size:13px;">
            Reload Workspace
          </button>
        </div>
      </div>
    `;
      return;
    }
    if (focusInfo) {
      const candidates = rootContainer.querySelectorAll(focusInfo.tag);
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if ((c.getAttribute("placeholder") || "") === focusInfo.placeholder && (c.getAttribute("type") || "") === focusInfo.type) {
          c.focus();
          try {
            if (focusInfo.selStart !== null && focusInfo.selEnd !== null) {
              c.setSelectionRange(focusInfo.selStart, focusInfo.selEnd);
            }
          } catch {
          }
          break;
        }
      }
    }
    const effectsToRun = [...pendingEffects];
    pendingEffects = [];
    for (const eff of effectsToRun) {
      eff();
    }
  }
  function mountApp(component, container) {
    rootComponent = component;
    rootContainer = container;
    performRender();
  }

  // src/components/badges.tsx
  function classificationBadge(status) {
    const map = {
      "Strong Alignment": {
        bg: "bg-emerald-950/80 border-emerald-500/60",
        text: "text-emerald-200 font-bold",
        dot: "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse"
      },
      "Partial Alignment": {
        bg: "bg-amber-950/80 border-amber-500/60",
        text: "text-amber-200 font-bold",
        dot: "bg-amber-400 shadow-sm shadow-amber-400/80"
      },
      "Potential Misalignment": {
        bg: "bg-rose-950/80 border-rose-500/60",
        text: "text-rose-200 font-bold",
        dot: "bg-rose-400 shadow-sm shadow-rose-400/80 animate-pulse"
      },
      "Insufficient Evidence": {
        bg: "bg-slate-900 border-slate-700",
        text: "text-slate-300 font-medium",
        dot: "bg-slate-500"
      },
      "Not Applicable": {
        bg: "bg-slate-900/60 border-slate-800",
        text: "text-slate-400 font-medium",
        dot: "bg-slate-600"
      }
    };
    const style = map[status] || map["Insufficient Evidence"];
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${style.bg} ${style.text} shadow-sm`
      },
      /* @__PURE__ */ h("span", { className: `w-1.5 h-1.5 rounded-full ${style.dot}` }),
      status
    );
  }
  function evidenceClassBadge(evType) {
    const styles = {
      FACT: "bg-blue-950/90 text-blue-200 border-blue-500/70 shadow-sm shadow-blue-500/20 font-bold",
      COMPANY_CLAIM: "bg-purple-950/90 text-purple-200 border-purple-500/70 shadow-sm shadow-purple-500/20 font-bold",
      THIRD_PARTY_CLAIM: "bg-teal-950/90 text-teal-200 border-teal-500/70 shadow-sm shadow-teal-500/20 font-bold",
      INFERENCE: "bg-orange-950/90 text-orange-200 border-orange-500/70 shadow-sm shadow-orange-500/20 font-bold"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-block px-2.5 py-0.5 rounded text-xs border font-mono tracking-wide ${styles[evType] || "bg-slate-800 text-slate-200 border-slate-700"}`
      },
      evType.replace(/_/g, " ")
    );
  }
  function priorityBadge(priority) {
    const styles = {
      Critical: "bg-rose-600 text-white shadow-md shadow-rose-500/40 font-black",
      High: "bg-orange-500 text-white shadow-md shadow-orange-500/40 font-black",
      Medium: "bg-amber-500 text-slate-950 font-black",
      Low: "bg-slate-700 text-slate-200 font-semibold"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-block px-2.5 py-0.5 rounded text-xs uppercase tracking-wider ${styles[priority] || styles.Medium}`
      },
      priority
    );
  }
  function RadialScoreGauge(props) {
    const pct = props.value !== null && props.value !== void 0 ? Math.max(0, Math.min(100, props.value)) : 0;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - pct / 100 * circumference;
    return /* @__PURE__ */ h("div", { className: "flex items-center gap-4 bg-gradient-to-br from-[#0c162c] to-[#070e1c] p-5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden card-hover group" }, /* @__PURE__ */ h(
      "div",
      {
        className: "absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20",
        style: { backgroundColor: props.colorHex }
      }
    ), /* @__PURE__ */ h("div", { className: "relative w-24 h-24 flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(
      "svg",
      {
        className: "w-24 h-24 -rotate-90",
        viewBox: "0 0 120 120",
        style: { filter: `drop-shadow(0 0 8px ${props.colorHex}66)` }
      },
      /* @__PURE__ */ h(
        "circle",
        {
          cx: "60",
          cy: "60",
          r: radius,
          stroke: "#162238",
          "stroke-width": "10",
          fill: "none"
        }
      ),
      /* @__PURE__ */ h(
        "circle",
        {
          cx: "60",
          cy: "60",
          r: radius,
          stroke: props.colorHex,
          "stroke-width": "10",
          "stroke-dasharray": String(circumference),
          "stroke-dashoffset": String(dashOffset),
          "stroke-linecap": "round",
          fill: "none",
          className: "transition-all duration-1000 ease-out"
        }
      )
    ), /* @__PURE__ */ h("div", { className: "absolute inset-0 flex flex-col items-center justify-center" }, /* @__PURE__ */ h(
      "span",
      {
        className: "text-xl font-black tracking-tight",
        style: { color: props.colorHex }
      },
      props.value !== null && props.value !== void 0 ? `${props.value}%` : "N/A"
    ))), /* @__PURE__ */ h("div", { className: "relative z-10" }, /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-white tracking-tight group-hover:text-emerald-300 transition-colors" }, props.label), /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1 leading-relaxed font-normal" }, props.sublabel)));
  }

  // src/components/ComparisonView.tsx
  function ComparisonView(props) {
    const { companies, allPeriods, currentPeriodId } = props;
    const [baseId, setBaseId] = useState(allPeriods[0]?.id || 1);
    const [targetId, setTargetId] = useState(
      allPeriods.length > 1 ? allPeriods[1].id : currentPeriodId
    );
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const compMap = /* @__PURE__ */ new Map();
    for (const c of companies) compMap.set(c.id, c.name);
    const runComparison = async (bId, tId) => {
      setLoading(true);
      try {
        const data = await api.compareAssessments(bId, tId);
        setComparison(data);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      if (baseId && targetId) {
        runComparison(baseId, targetId);
      }
    }, [baseId, targetId]);
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Periodic Historical & Cross-Company Alignment Comparison Engine")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-bold text-slate-300 mb-1" }, "Baseline Assessment Period (A)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(baseId),
        onChange: (e) => setBaseId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white font-semibold focus:outline-none"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-bold text-slate-300 mb-1" }, "Target Assessment Period (B)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(targetId),
        onChange: (e) => setTargetId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white font-semibold focus:outline-none"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => runComparison(baseId, targetId),
        disabled: loading,
        className: "w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition"
      },
      loading ? "Comparing Assessments..." : "Compare Assessments"
    )))), comparison ? /* @__PURE__ */ h("div", { className: "space-y-6" }, (comparison.date_difference_warnings || []).length > 0 ? /* @__PURE__ */ h("div", { className: "glass-card bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-1 text-xs text-amber-200" }, /* @__PURE__ */ h("div", { className: "font-bold uppercase tracking-wider text-amber-300" }, "Assessment Period & Document Date Advisories"), comparison.date_difference_warnings.map((w, i) => /* @__PURE__ */ h("div", { key: i }, "\u2022 ", w))) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider" }, "Baseline (Period A)"), /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-white mt-1" }, comparison.baseline.company_name, " \u2014 ", comparison.baseline.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-extrabold text-cyan-300 font-mono" }, comparison.baseline.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400 ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-violet-400 font-mono" }, comparison.baseline.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400 ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider" }, "Target (Period B)"), /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-white mt-1" }, comparison.target.company_name, " \u2014 ", comparison.target.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-extrabold text-cyan-300 font-mono" }, comparison.target.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400 ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-violet-400 font-mono" }, comparison.target.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400 ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-950 p-5 rounded-xl border border-violet-800/80 shadow-2xl" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-violet-300 uppercase tracking-wider" }, "Net Alignment & Coverage Shift"), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-6" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "div",
      {
        className: `text-2xl font-extrabold font-mono ${(comparison.overall_alignment_delta || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`
      },
      comparison.overall_alignment_delta !== null ? `${comparison.overall_alignment_delta >= 0 ? "+" : ""}${comparison.overall_alignment_delta}%` : "N/A"
    ), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400" }, "Alignment Delta")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xl font-bold text-cyan-300 font-mono" }, comparison.overall_coverage_delta >= 0 ? "+" : "", comparison.overall_coverage_delta, "%"), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400" }, "Coverage Delta"))))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Stakeholder Alignment Score Comparison (Baseline vs. Target)"), /* @__PURE__ */ h("div", { className: "space-y-3" }, (comparison.stakeholder_comparisons || []).map((sc) => /* @__PURE__ */ h("div", { key: sc.slug, className: "space-y-1 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-200" }, sc.stakeholder_name, " (", sc.category, ")"), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-slate-400 font-mono" }, "Base: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, sc.base_alignment_score ?? "N/A", "%")), /* @__PURE__ */ h("span", { className: "text-slate-400 font-mono" }, "Target:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, sc.target_alignment_score ?? "N/A", "%")), sc.alignment_delta !== null ? /* @__PURE__ */ h(
      "span",
      {
        className: `px-2 py-0.5 rounded font-mono font-bold ${sc.alignment_delta > 0 ? "bg-emerald-950/70 text-emerald-300 border border-emerald-600/50" : sc.alignment_delta < 0 ? "bg-rose-950/70 text-rose-300 border border-rose-600/50" : "bg-slate-800 text-slate-400 border border-slate-700"}`
      },
      sc.alignment_delta > 0 ? "+" : "",
      sc.alignment_delta,
      "%"
    ) : null)), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ h("div", { className: "w-full h-2 bg-slate-800 rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-slate-500 h-full",
        style: { width: `${sc.base_alignment_score || 0}%` }
      }
    )), /* @__PURE__ */ h("div", { className: "w-full h-2 bg-slate-800 rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-cyan-500 h-full",
        style: { width: `${sc.target_alignment_score || 0}%` }
      }
    ))))))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-white" }, "Alignment Improvements & New Capabilities"), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-300" }, "Improvements in Alignment:"), (comparison.alignment_improvements || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-emerald-400 italic" }, "No positive score shifts recorded.") : comparison.alignment_improvements.map(
      (imp, i) => /* @__PURE__ */ h("div", { key: i, className: "text-emerald-200" }, "\u2713 ", imp)
    )), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-violet-300" }, "Newly Disclosed Capabilities & Units:"), (comparison.new_capabilities_and_units || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-violet-400 italic" }, "No new organizational units added between periods.") : comparison.new_capabilities_and_units.map(
      (u, i) => /* @__PURE__ */ h("div", { key: i, className: "text-violet-200" }, "+ ", u)
    ))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-white" }, "Deteriorations & Structural Dimension Changes"), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-300" }, "Deteriorations in Alignment:"), (comparison.alignment_deteriorations || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-rose-400 italic" }, "No alignment score declines recorded.") : comparison.alignment_deteriorations.map(
      (det, i) => /* @__PURE__ */ h("div", { key: i, className: "text-rose-200" }, "\u2193 ", det)
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-slate-800/80" }, (comparison.dimension_comparisons || []).map((dc) => /* @__PURE__ */ h(
      "div",
      {
        key: dc.dimension_code,
        className: "py-2.5 flex items-center justify-between"
      },
      /* @__PURE__ */ h("span", { className: "font-semibold text-slate-200" }, dc.dimension_name),
      /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, classificationBadge(dc.base_classification), /* @__PURE__ */ h("span", { className: "text-slate-500" }, "\u2192"), classificationBadge(dc.target_classification))
    )))))) : null);
  }

  // src/components/ConflictsView.tsx
  function ConflictsView(props) {
    const { conflicts, evidenceList } = props;
    const [selectedConflictId, setSelectedConflictId] = useState(
      conflicts[0]?.id || null
    );
    const activeConflict = conflicts.find((c) => c.id === selectedConflictId) || conflicts[0] || null;
    const evMap = /* @__PURE__ */ new Map();
    for (const e of evidenceList) evMap.set(e.id, e);
    const nodeNames = Array.from(
      new Set(
        conflicts.flatMap((c) => [c.stakeholder_a_name, c.stakeholder_b_name])
      )
    );
    const cx = 360;
    const cy = 155;
    const rx = 240;
    const ry = 105;
    const nodeCoords = {};
    nodeNames.forEach((name, idx) => {
      const angle = 2 * Math.PI * idx / Math.max(1, nodeNames.length) - Math.PI / 2;
      nodeCoords[name] = {
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle))
      };
    });
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Stakeholder Conflict Network & Governance Mediation Analysis")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Competing stakeholder expectations do not automatically imply poor alignment\u2014this diagnostic evaluates whether the organization has effective cross-functional mechanisms to mediate competing interests.")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6" }, /* @__PURE__ */ h("div", { className: "lg:col-span-7 glass-card bg-slate-950/90 rounded-xl p-5 text-white border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden" }, /* @__PURE__ */ h("div", { className: "absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3 relative z-10" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-violet-300" }, "Interactive Stakeholder Tension Network Graph"), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-400" }, "Click any tension edge or conflict card to inspect organizational mediation mechanisms")), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded bg-slate-800 text-xs text-rose-300 border border-slate-700 font-mono" }, conflicts.length, " Tensions")), /* @__PURE__ */ h("div", { className: "w-full overflow-x-auto relative z-10" }, /* @__PURE__ */ h("svg", { viewBox: "0 0 720 310", className: "w-full h-72" }, conflicts.map((c) => {
      const pA = nodeCoords[c.stakeholder_a_name] || { x: 100, y: 100 };
      const pB = nodeCoords[c.stakeholder_b_name] || { x: 400, y: 200 };
      const isSelected = activeConflict && activeConflict.id === c.id;
      const midX = (pA.x + pB.x) / 2;
      const midY = (pA.y + pB.y) / 2;
      return /* @__PURE__ */ h(
        "g",
        {
          key: c.id,
          onClick: () => setSelectedConflictId(c.id),
          className: "cursor-pointer"
        },
        /* @__PURE__ */ h(
          "line",
          {
            x1: pA.x,
            y1: pA.y,
            x2: pB.x,
            y2: pB.y,
            stroke: isSelected ? "#f43f5e" : c.severity === "Critical" ? "#fb7185" : "#8b5cf6",
            "stroke-width": isSelected ? "4" : "2",
            "stroke-dasharray": isSelected ? "none" : "6,4"
          }
        ),
        /* @__PURE__ */ h(
          "rect",
          {
            x: midX - 44,
            y: midY - 11,
            width: "88",
            height: "22",
            rx: "6",
            fill: isSelected ? "#e11d48" : "#0f172a",
            stroke: isSelected ? "#fb7185" : "#334155"
          }
        ),
        /* @__PURE__ */ h(
          "text",
          {
            x: midX,
            y: midY + 4,
            "text-anchor": "middle",
            fill: "#ffffff",
            "font-size": "10",
            "font-weight": "bold"
          },
          c.severity,
          " Tension"
        )
      );
    }), nodeNames.map((name) => {
      const pt = nodeCoords[name];
      const isInvolved = activeConflict && (activeConflict.stakeholder_a_name === name || activeConflict.stakeholder_b_name === name);
      return /* @__PURE__ */ h("g", { key: name }, /* @__PURE__ */ h(
        "circle",
        {
          cx: pt.x,
          cy: pt.y,
          r: isInvolved ? "24" : "20",
          fill: isInvolved ? "#8b5cf6" : "#1e293b",
          stroke: isInvolved ? "#c4b5fd" : "#475569",
          "stroke-width": "3"
        }
      ), /* @__PURE__ */ h(
        "text",
        {
          x: pt.x,
          y: pt.y + 38,
          "text-anchor": "middle",
          fill: "#f1f5f9",
          "font-size": "11",
          "font-weight": "bold"
        },
        name
      ));
    })))), /* @__PURE__ */ h("div", { className: "lg:col-span-5 space-y-3" }, conflicts.map((c) => {
      const isSel = activeConflict && activeConflict.id === c.id;
      return /* @__PURE__ */ h(
        "div",
        {
          key: c.id,
          onClick: () => setSelectedConflictId(c.id),
          className: `cursor-pointer p-4 rounded-xl border transition-all duration-200 shadow-sm ${isSel ? "bg-slate-800/95 border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/20" : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-extrabold text-slate-100" }, c.stakeholder_a_name, " ", /* @__PURE__ */ h("span", { className: "text-rose-400" }, "\u26A1 vs."), " ", c.stakeholder_b_name), priorityBadge(c.severity)),
        /* @__PURE__ */ h("p", { className: "text-xs font-semibold text-violet-300 mt-1.5" }, c.conflicting_expectations),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1.5 mt-2" }, (c.organizational_units_involved || []).map((u, i) => /* @__PURE__ */ h(
          "span",
          {
            key: i,
            className: "px-2 py-0.5 rounded bg-slate-950 text-slate-300 text-[10px] font-mono border border-slate-800"
          },
          u
        )))
      );
    }))), activeConflict ? /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-rose-400 uppercase tracking-wider" }, "Stakeholder Conflict Diagnostic & Resolution Architecture"), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-white mt-1" }, activeConflict.stakeholder_a_name, " vs.", " ", activeConflict.stakeholder_b_name), /* @__PURE__ */ h("p", { className: "text-xs font-semibold text-slate-400 mt-0.5" }, activeConflict.conflicting_expectations)), priorityBadge(activeConflict.severity)), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-200" }, "Current Resolution Mechanisms"), /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed" }, activeConflict.current_resolution_mechanisms)), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-300" }, "Potential Structural Weaknesses"), /* @__PURE__ */ h("p", { className: "text-rose-200 leading-relaxed" }, activeConflict.structural_weaknesses)), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-300" }, "Recommended Governance Mechanism"), /* @__PURE__ */ h("p", { className: "text-emerald-200 leading-relaxed font-medium" }, activeConflict.recommended_governance_mechanism))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5" }, "Supporting Documentary Citations for This Conflict"), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, (activeConflict.evidence_ids || []).map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-3.5 rounded-lg border border-slate-800 bg-slate-950/80 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-400" }, ev.document_name, " (p.", ev.page_number, ")")),
      /* @__PURE__ */ h("blockquote", { className: "italic text-slate-300 border-l-2 border-rose-500 pl-2.5" }, '"', ev.exact_quotation, '"')
    ))))) : null);
  }

  // src/components/EvidenceToInsightFlow.tsx
  function EvidenceToInsightFlow(props) {
    const [selectedNodeId, setSelectedNodeId] = useState("llm-gate");
    const nodes = [
      {
        id: "ingestion",
        step: "01",
        title: "Document Ingestion",
        category: "ingest",
        status: "verified",
        metricLabel: "Formats Supported",
        metricValue: "PDF \u2022 DOCX \u2022 XLSX \u2022 CSV \u2022 TXT",
        badge: "Zlib Stream Verified",
        description: "Extracts raw document text preserving page numbers, section headers, publication dates, and financial year metadata.",
        auditRule: "Strict character sanitization; rejection of prompt-injection attempts and binary malformations.",
        provenanceGuarantee: "Every extracted sentence retains immutable (document_id, chunk_id, page_number) coordinates."
      },
      {
        id: "vector-rag",
        step: "02",
        title: "Semantic Vector RAG",
        category: "rag",
        status: "active",
        metricLabel: "Embedding Model",
        metricValue: "all-MiniLM-L6-v2 (384-dim)",
        badge: "Local Semantic Vectors",
        description: "Embeds chunks locally with metadata-aware filtering (company_id, fiscal_year, dimension) and cosine similarity ranking.",
        auditRule: "Deterministic fallback to semantic feature hashing if local transformer weights are offline.",
        provenanceGuarantee: "Never hallucinates passage origins; context windows restricted to top-ranked verified chunks."
      },
      {
        id: "llm-gate",
        step: "03",
        title: "LLM Evidence Gate",
        category: "llm",
        status: "live",
        metricLabel: "Verified Quotations",
        metricValue: `${props.evidenceCount ?? 0} Records`,
        badge: "Groq Llama-3.3-70B",
        description: "Classifies evidence into FACT, COMPANY_CLAIM, THIRD_PARTY_CLAIM, and INFERENCE via structured JSON prompt contracts.",
        auditRule: "Mandatory Quotation Verification: Every quote is verified against source chunks; unmatched assertions are purged.",
        provenanceGuarantee: "COMPANY_CLAIM is capped at Partial Alignment (3.0); never awarded Strong Alignment without corroboration."
      },
      {
        id: "dimension-mapping",
        step: "04",
        title: "7-Dimension Mapping",
        category: "struct",
        status: "active",
        metricLabel: "Org Dimensions",
        metricValue: "7 Core Dimensions",
        badge: "Hierarchy \u2022 Centralization \u2022 Governance...",
        description: "Maps stakeholder expectations against organizational mechanisms, reporting lines, and operational units.",
        auditRule: "Reporting lines default to 'Insufficient Evidence' unless explicitly stated; no invented hierarchy.",
        provenanceGuarantee: "Disclosed units are indexed with explicit authority scope and evidence classification."
      },
      {
        id: "deterministic-scoring",
        step: "05",
        title: "Deterministic Scoring",
        category: "score",
        status: "verified",
        metricLabel: "Overall Alignment",
        metricValue: props.alignmentScore !== null && props.alignmentScore !== void 0 ? `${props.alignmentScore}%` : "Pending",
        badge: "Zero-LLM Numerical Bias",
        description: "Calculates requirement-level and stakeholder-weighted scores entirely in deterministic Python math.",
        auditRule: "LLM is strictly prohibited from inventing numerical percentages; weights: Strong (4.0), Partial (3.0), Misaligned (1.0).",
        provenanceGuarantee: "Coverage score is calculated separately from alignment score so data gaps never masquerade as misalignment."
      },
      {
        id: "action-insight",
        step: "06",
        title: "Actionable Insights",
        category: "action",
        status: "live",
        metricLabel: "Remediations",
        metricValue: `${props.conflictCount ?? 0} Tensions \u2022 ${props.recommendationCount ?? 0} Actions`,
        badge: "Executive Synthesis",
        description: "Generates prioritized structural governance recommendations and cross-stakeholder tension mediation strategies.",
        auditRule: "Every recommendation links directly to identified root causes and verified source evidence citations.",
        provenanceGuarantee: "Full audit trail: allows expert manual override with logged evaluator rationale and timestamp."
      }
    ];
    const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];
    return /* @__PURE__ */ h("div", { className: "glass-card rounded-2xl p-6 text-white space-y-6 border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden" }, /* @__PURE__ */ h("div", { className: "absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold tracking-wider uppercase text-cyan-300" }, "Signature Diagnostic Engine: Evidence to Insight Architecture")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "End-to-end evidence verification pipeline combining local RAG, Groq LLM inference, and deterministic scoring.")), /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-700/50" }, "6 Stage Multi-Agent Pipeline"), /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50" }, "Quotation Provenance Active"))), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10" }, nodes.map((node, idx) => {
      const isSelected = node.id === selectedNodeId;
      return /* @__PURE__ */ h(
        "div",
        {
          key: node.id,
          onClick: () => setSelectedNodeId(node.id),
          className: `cursor-pointer rounded-xl p-3.5 transition-all duration-200 border relative ${isSelected ? "bg-slate-800/90 border-violet-500 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400" : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ h("span", { className: "text-[10px] font-mono font-bold text-slate-500" }, node.step), /* @__PURE__ */ h(
          "span",
          {
            className: `w-1.5 h-1.5 rounded-full ${node.status === "verified" ? "bg-emerald-400" : node.status === "live" ? "bg-cyan-400" : "bg-violet-400"}`
          }
        )),
        /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-100 truncate" }, node.title),
        /* @__PURE__ */ h("div", { className: "text-[11px] text-cyan-300 font-semibold mt-1 truncate" }, node.metricValue),
        idx < nodes.length - 1 && /* @__PURE__ */ h("div", { className: "hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-20" }, /* @__PURE__ */ h("div", { className: "w-1 h-1 rounded-full bg-slate-600" }))
      );
    })), /* @__PURE__ */ h("div", { className: "rounded-xl p-4 bg-slate-950/80 border border-slate-800/80 relative z-10 space-y-3" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 flex items-center justify-center font-mono font-bold text-xs" }, activeNode.step), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white flex items-center gap-2" }, activeNode.title, /* @__PURE__ */ h("span", { className: "text-xs font-normal text-slate-400" }, "(", activeNode.badge, ")")), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400 mt-0.5" }, activeNode.description))), /* @__PURE__ */ h("div", { className: "text-right shrink-0" }, /* @__PURE__ */ h("span", { className: "text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50" }, activeNode.metricLabel, ": ", activeNode.metricValue))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1" }, /* @__PURE__ */ h("div", { className: "bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-semibold text-violet-300 uppercase tracking-wider text-[10px]" }, "Diagnostic Audit Rule"), /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed" }, activeNode.auditRule)), /* @__PURE__ */ h("div", { className: "bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-semibold text-emerald-300 uppercase tracking-wider text-[10px]" }, "Provenance & Academic Guarantee"), /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed" }, activeNode.provenanceGuarantee)))));
  }

  // src/components/DashboardView.tsx
  function DashboardView(props) {
    const { summary, stakeholders, onNavigate, onRunAnalysis, isAnalyzing } = props;
    const [showArchitecture, setShowArchitecture] = useState(false);
    const [aiQuestion, setAiQuestion] = useState(
      "What are the primary structural governance vulnerabilities and priority board-level reforms supported by the evidence?"
    );
    const [aiResult, setAiResult] = useState(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiError, setAiError] = useState(null);
    if (!summary || !summary.assessment) {
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-slate-300 font-mono text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse inline-block mr-2" }), "Loading organizational diagnostic intelligence overview...");
    }
    const { assessment } = summary;
    const metrics = summary.metrics || {
      overall_alignment_score: 0,
      evidence_coverage_pct: 0,
      strong_alignments: 0,
      partial_alignments: 0,
      potential_misalignments: 0,
      insufficient_evidence_count: 0,
      alignment_gaps_identified: 0,
      conflicts_count: 0,
      recommendations_count: 0,
      total_documents: 0
    };
    const dimensions_summary = summary.dimensions_summary || [];
    const totalReq = (metrics.strong_alignments || 0) + (metrics.partial_alignments || 0) + (metrics.potential_misalignments || 0) + (metrics.insufficient_evidence_count || 0);
    const handleRunGroqSynthesis = async () => {
      setIsGeneratingAi(true);
      setAiError(null);
      try {
        const res = await api.runAiSynthesis(assessment.id, aiQuestion);
        setAiResult(res);
      } catch (err) {
        setAiError(err.message || "Failed to generate Groq AI synthesis");
      } finally {
        setIsGeneratingAi(false);
      }
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "glass-card rounded-2xl p-6 text-white border border-white/10 bg-gradient-to-br from-[#0c162c] via-[#081120] to-[#060b14] shadow-2xl relative overflow-hidden card-hover" }, /* @__PURE__ */ h("div", { className: "absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1" }, /* @__PURE__ */ h("span", { className: "flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full shadow-sm shadow-emerald-500/20" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }), "Organizational Diagnostic Intelligence"), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", { className: "text-cyan-300 font-bold" }, assessment.fiscal_year), assessment.company_ticker ? /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 bg-[#060b14] border border-white/15 rounded-md text-cyan-300 font-mono font-bold" }, assessment.company_ticker) : null), /* @__PURE__ */ h("h1", { className: "text-2xl font-black tracking-tight text-white mt-1.5" }, assessment.company_name, " \u2014 ", assessment.title), /* @__PURE__ */ h("p", { className: "text-slate-300 text-xs mt-1.5 flex items-center gap-3" }, /* @__PURE__ */ h("span", null, "Last Evaluated:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-100" }, assessment.last_analyzed_at ? new Date(assessment.last_analyzed_at).toLocaleString() : "Not yet analyzed")), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Status:", " ", /* @__PURE__ */ h("span", { className: "uppercase font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40" }, assessment.status)))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("documents"),
        className: "px-4 py-2.5 rounded-xl bg-[#0e1a32] hover:bg-[#142344] text-white border border-white/15 text-xs font-bold transition card-hover shadow-lg"
      },
      "\u{1F4C1} Manage Filings (",
      metrics.documents_processed,
      ")"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        disabled: isAnalyzing,
        className: "btn-shimmer px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-500/30 transition card-hover flex items-center gap-2"
      },
      isAnalyzing ? /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ h("span", null, "Running AI Engine...")) : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", null, "\u26A1"), /* @__PURE__ */ h("span", null, "Run AI Diagnostic"))
    )))), /* @__PURE__ */ h("div", { className: "glass-card bg-gradient-to-br from-[#0c162c] to-[#070e1c] rounded-2xl p-5 border border-white/10 shadow-2xl" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3.5" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-300" }, "Diagnostic Workflow (Click Any Step to Inspect)")), /* @__PURE__ */ h("span", { className: "text-[11px] text-emerald-400 font-mono font-semibold" }, "5-Stage Diagnostic Pipeline")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" }, /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("documents"),
        className: "p-4 rounded-xl bg-[#091224]/90 border border-white/10 hover:border-emerald-500/60 cursor-pointer card-hover transition group shadow-md"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1" }, /* @__PURE__ */ h("span", null, "STEP 01"), /* @__PURE__ */ h("span", { className: "text-emerald-400 font-semibold" }, "\u2713 Ingested")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white group-hover:text-emerald-300 transition" }, "Research Library"),
      /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1" }, metrics.documents_processed, " Filings \u2022 ", metrics.evidence_records_count, " Chunks")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("stakeholders"),
        className: "p-4 rounded-xl bg-[#091224]/90 border border-white/10 hover:border-emerald-500/60 cursor-pointer card-hover transition group shadow-md"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1" }, /* @__PURE__ */ h("span", null, "STEP 02"), /* @__PURE__ */ h("span", { className: "text-emerald-400 font-semibold" }, "\u2713 Mapped")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white group-hover:text-emerald-300 transition" }, "Stakeholders"),
      /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1" }, metrics.stakeholders_assessed, " Groups (4 Int / 6 Ext)")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("structure"),
        className: "p-4 rounded-xl bg-[#091224]/90 border border-white/10 hover:border-emerald-500/60 cursor-pointer card-hover transition group shadow-md"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1" }, /* @__PURE__ */ h("span", null, "STEP 03"), /* @__PURE__ */ h("span", { className: "text-emerald-400 font-semibold" }, "\u2713 Extracted")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white group-hover:text-emerald-300 transition" }, "Org Structure"),
      /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1" }, "7 Core Dimensions & Units")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("matrix"),
        className: "p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-[#0a182e] to-[#070e1c] border border-emerald-500/40 hover:border-emerald-400 cursor-pointer card-hover transition group shadow-lg shadow-emerald-950/20"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-emerald-300 mb-1" }, /* @__PURE__ */ h("span", null, "STEP 04"), /* @__PURE__ */ h("span", { className: "text-emerald-400 font-black" }, assessment.overall_alignment_score, "% Score")),
      /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-white group-hover:text-cyan-300 transition" }, "Alignment Matrix"),
      /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1" }, totalReq, " Requirements Evaluated")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("recommendations"),
        className: "p-4 rounded-xl bg-[#091224]/90 border border-white/10 hover:border-amber-500/60 cursor-pointer card-hover transition group shadow-md"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1" }, /* @__PURE__ */ h("span", null, "STEP 05"), /* @__PURE__ */ h("span", { className: "text-amber-400 font-bold" }, metrics.recommendations_count, " Actions")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white group-hover:text-amber-300 transition" }, "Action Plan"),
      /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 mt-1" }, metrics.conflicts_count, " Conflicts \u2022 Reforms")
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" }, /* @__PURE__ */ h(
      RadialScoreGauge,
      {
        label: "Overall Alignment Score",
        sublabel: "Weighted average across assessed stakeholder expectations (Scale: Strong=4, Partial=3, Misaligned=1)",
        value: assessment.overall_alignment_score,
        colorHex: (assessment.overall_alignment_score || 0) >= 75 ? "#10b981" : (assessment.overall_alignment_score || 0) >= 55 ? "#f59e0b" : "#f43f5e"
      }
    ), /* @__PURE__ */ h(
      RadialScoreGauge,
      {
        label: "Evidence Coverage",
        sublabel: "Percentage of applicable stakeholder requirements backed by extracted documentary evidence",
        value: assessment.evidence_coverage_pct,
        colorHex: "#06b6d4"
      }
    ), /* @__PURE__ */ h("div", { className: "glass-card bg-gradient-to-br from-[#0c162c] to-[#070e1c] p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between card-hover" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider" }, "Knowledge Base & Evidence"), /* @__PURE__ */ h("div", { className: "mt-2.5 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-black text-white" }, metrics.documents_processed), /* @__PURE__ */ h("span", { className: "text-xs text-slate-300 font-medium" }, "documents (", metrics.evidence_records_count, " citations)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-slate-300" }, "Assessed:", " ", /* @__PURE__ */ h("strong", { className: "text-white" }, metrics.stakeholders_assessed, " / ", metrics.total_stakeholders)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("evidence"),
        className: "text-cyan-400 font-bold hover:text-cyan-300 flex items-center gap-1"
      },
      /* @__PURE__ */ h("span", null, "Inspect Citations"),
      /* @__PURE__ */ h("span", null, "\u2192")
    ))), /* @__PURE__ */ h("div", { className: "glass-card bg-gradient-to-br from-[#0c162c] to-[#070e1c] p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between card-hover" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider" }, "Alignment Gaps & Diagnostics"), /* @__PURE__ */ h("div", { className: "mt-2.5 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-black text-rose-400" }, metrics.alignment_gaps_identified), /* @__PURE__ */ h("span", { className: "text-xs text-slate-300 font-medium" }, "gaps (", metrics.potential_misalignments, " misaligned,", " ", metrics.partial_alignments, " partial)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-slate-300" }, "Remediations:", " ", /* @__PURE__ */ h("strong", { className: "text-white" }, metrics.recommendations_count)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("recommendations"),
        className: "text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1"
      },
      /* @__PURE__ */ h("span", null, "View Actions"),
      /* @__PURE__ */ h("span", null, "\u2192")
    )))), /* @__PURE__ */ h("div", { className: "glass-card bg-gradient-to-br from-[#0c162c] to-[#070e1c] p-6 rounded-2xl border border-white/10 shadow-2xl text-white" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-black text-white" }, "Requirement Alignment Distribution (", totalReq, " Evaluated Requirements)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 mt-0.5" }, "Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("matrix"),
        className: "px-3.5 py-1.5 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold hover:bg-violet-600/50 transition self-start sm:self-auto"
      },
      "Open Interactive Alignment Matrix \u2192"
    )), /* @__PURE__ */ h("div", { className: "w-full h-5 rounded-full overflow-hidden flex bg-slate-800/80 border border-slate-700/50" }, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.strong_alignments / totalReq * 100}%`
        },
        className: "bg-emerald-500 h-full shadow-sm shadow-emerald-400/50",
        title: `Strong Alignment: ${metrics.strong_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.partial_alignments / totalReq * 100}%`
        },
        className: "bg-amber-500 h-full shadow-sm shadow-amber-400/50",
        title: `Partial Alignment: ${metrics.partial_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.potential_misalignments / totalReq * 100}%`
        },
        className: "bg-rose-500 h-full shadow-sm shadow-rose-400/50",
        title: `Potential Misalignment: ${metrics.potential_misalignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.insufficient_evidence_count / totalReq * 100}%`
        },
        className: "bg-slate-600 h-full",
        title: `Insufficient Evidence: ${metrics.insufficient_evidence_count}`
      }
    ) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between card-hover" }, /* @__PURE__ */ h("span", { className: "font-bold text-emerald-200" }, "Strong Alignment (4)"), /* @__PURE__ */ h("span", { className: "font-black text-emerald-300 text-base" }, metrics.strong_alignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-between card-hover" }, /* @__PURE__ */ h("span", { className: "font-bold text-amber-200" }, "Partial Alignment (3)"), /* @__PURE__ */ h("span", { className: "font-black text-amber-300 text-base" }, metrics.partial_alignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-between card-hover" }, /* @__PURE__ */ h("span", { className: "font-bold text-rose-200" }, "Potential Misaligned (1)"), /* @__PURE__ */ h("span", { className: "font-black text-rose-300 text-base" }, metrics.potential_misalignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between card-hover" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-300" }, "Insufficient Evidence"), /* @__PURE__ */ h("span", { className: "font-black text-slate-300 text-base" }, metrics.insufficient_evidence_count)))), /* @__PURE__ */ h("div", { className: "glass-card bg-[#111827] p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-black text-white tracking-tight flex items-center gap-2" }, /* @__PURE__ */ h("span", null, "\u{1F3AF}"), /* @__PURE__ */ h("span", null, "Key Diagnostic Findings & Priority Governance Gaps")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 mt-0.5" }, "Identified through automated 6-stage cross-examination of corporate charters and 10-K disclosures")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("recommendations"),
        className: "text-xs text-indigo-400 font-bold hover:underline"
      },
      "View All ",
      metrics.recommendations_count,
      " Recommended Reforms \u2192"
    )), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px] border border-rose-800/60" }, "CRITICAL MISALIGNMENT"), /* @__PURE__ */ h("span", { className: "text-slate-400 font-mono text-[11px]" }, "Centralization")), /* @__PURE__ */ h("div", { className: "text-xs font-bold text-white leading-snug" }, "Dual-Class Founder Voting Power Concentration"), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-300 mt-2 leading-relaxed" }, "Class B shares hold >60% voting power, creating a severe governance imbalance between executive authority and independent minority shareholder accountability.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between" }, /* @__PURE__ */ h("span", null, "Reform: Independent lead director vote"), /* @__PURE__ */ h("span", { className: "text-slate-500" }, "Score 1.0"))), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px] border border-amber-800/60" }, "PARTIAL ALIGNMENT (CLAIM CAPPED)"), /* @__PURE__ */ h("span", { className: "text-slate-400 font-mono text-[11px]" }, "Formalization")), /* @__PURE__ */ h("div", { className: "text-xs font-bold text-white leading-snug" }, "Teen Safety Controls & Pre-Launch Privacy Review"), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-300 mt-2 leading-relaxed" }, "Default Instagram Teen Accounts deployed; self-reported safety disclosures capped at Partial Alignment by the epistemic validator pending independent audit.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between" }, /* @__PURE__ */ h("span", null, "Action: Publish 3P safety verification"), /* @__PURE__ */ h("span", { className: "text-slate-500" }, "Score 3.0"))), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800/60" }, "STRONG ALIGNMENT"), /* @__PURE__ */ h("span", { className: "text-slate-400 font-mono text-[11px]" }, "Governance")), /* @__PURE__ */ h("div", { className: "text-xs font-bold text-white leading-snug" }, "Audit & Privacy Committee Board Charter"), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-300 mt-2 leading-relaxed" }, "Direct board charter mandates quarterly reporting from Chief Privacy Officer, backed by AI Governance & Responsible Innovation Council.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between" }, /* @__PURE__ */ h("span", null, "Verified: Formal Board Charter (2025)"), /* @__PURE__ */ h("span", { className: "text-emerald-400 font-bold" }, "Score 4.0"))))), /* @__PURE__ */ h("div", { className: "glass-card bg-[#111827] rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowArchitecture(!showArchitecture),
        className: "w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-xl" }, "\u2699\uFE0F"), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-white" }, "Technical Multi-Agent Architecture (6-Stage Pipeline)"), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400" }, "End-to-end evidence verification combining local RAG, Groq LLM inference, and deterministic scoring."))),
      /* @__PURE__ */ h("span", { className: "text-xs text-indigo-300 font-bold px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-700/60" }, showArchitecture ? "Hide Diagram \u25B2" : "Inspect Diagram \u25BC")
    ), showArchitecture ? /* @__PURE__ */ h("div", { className: "p-5 border-t border-slate-800 animate-fade-in bg-slate-950/40" }, /* @__PURE__ */ h(
      EvidenceToInsightFlow,
      {
        evidenceCount: metrics.evidence_records_count,
        coveragePct: assessment.evidence_coverage_pct,
        alignmentScore: assessment.overall_alignment_score,
        conflictCount: metrics.conflicts_count,
        recommendationCount: metrics.recommendations_count
      }
    )) : null), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-violet-900/60 shadow-xl space-y-4 text-white" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider" }, "Groq AI Live Synthesis"), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "AI Executive Board Briefing & Evidence-Grounded Diagnostic Q&A")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-0.5" }, "Powered by Groq (llama-3.3-70b-versatile) with strict quotation guardrails. Synthesizes extracted citations and structural alignment gaps.")), /* @__PURE__ */ h(
      "button",
      {
        onClick: handleRunGroqSynthesis,
        disabled: isGeneratingAi,
        className: "px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition shrink-0"
      },
      isGeneratingAi ? "Querying Groq AI (llama-3.3-70b)..." : "Generate Groq AI Executive Synthesis"
    )), /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row gap-2" }, /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: aiQuestion,
        onInput: (e) => setAiQuestion(e.target.value),
        placeholder: "Ask an organizational alignment question grounded in this period's evidence...",
        className: "flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
      }
    )), aiError ? /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300" }, aiError) : null, aiResult ? /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-violet-300" }, "Executive Diagnostic Briefing (", assessment.company_name, ")"), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-mono text-[11px]" }, "Engine: ", aiResult.provider_used)), /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed" }, aiResult.executive_summary), aiResult.targeted_question_response && aiResult.targeted_question_response !== aiResult.executive_summary ? /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-violet-950/40 border border-violet-800/40" }, /* @__PURE__ */ h("div", { className: "font-bold text-violet-300 mb-1" }, "Targeted Diagnostic Response:"), /* @__PURE__ */ h("p", { className: "text-slate-200 leading-relaxed" }, aiResult.targeted_question_response)) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-1" }, /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-300 mb-1" }, "Key Structural Strengths"), /* @__PURE__ */ h("ul", { className: "list-disc pl-4 space-y-1 text-emerald-200" }, (aiResult.key_strengths || []).map((s, i) => /* @__PURE__ */ h("li", { key: i }, s)))), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-amber-950/40 border border-amber-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-amber-300 mb-1" }, "Key Structural Alignment Gaps"), /* @__PURE__ */ h("ul", { className: "list-disc pl-4 space-y-1 text-amber-200" }, (aiResult.key_structural_gaps || []).map((g, i) => /* @__PURE__ */ h("li", { key: i }, g))))), /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-400 italic" }, /* @__PURE__ */ h("strong", null, "Evidence Limitation Disclosure:"), " ", aiResult.evidence_limitations_summary)) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Stakeholder Alignment Score vs. Evidence Coverage"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Weighted by evaluator importance weights")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("stakeholders"),
        className: "text-xs text-cyan-400 font-semibold hover:underline"
      },
      "Adjust Weights \u2192"
    )), /* @__PURE__ */ h("div", { className: "space-y-3" }, stakeholders.map((sh) => {
      const score = sh.alignment_score;
      const barColor = score === null ? "bg-slate-700" : score >= 75 ? "bg-emerald-500 shadow-sm shadow-emerald-400/50" : score >= 55 ? "bg-amber-500 shadow-sm shadow-amber-400/50" : "bg-rose-500 shadow-sm shadow-rose-400/50";
      return /* @__PURE__ */ h("div", { key: sh.id, className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-200" }, sh.name), /* @__PURE__ */ h("span", { className: "px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono" }, sh.category, " \u2022 W:", sh.importance_weight, "x")), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-slate-400" }, "Cov: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, sh.evidence_coverage_pct, "%")), /* @__PURE__ */ h("span", { className: "font-bold text-white w-14 text-right" }, score !== null ? `${score}%` : "Insuff."))), /* @__PURE__ */ h("div", { className: "w-full h-2 bg-slate-800 rounded-full overflow-hidden flex" }, /* @__PURE__ */ h(
        "div",
        {
          className: `${barColor} h-full transition-all`,
          style: { width: `${score !== null ? score : 0}%` }
        }
      )));
    }))), /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "7 Organizational Structure Dimensions"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Structural suitability based on extracted evidence")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("structure"),
        className: "text-xs text-cyan-400 font-semibold hover:underline"
      },
      "Inspect Structure \u2192"
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-slate-800" }, dimensions_summary.map((d) => /* @__PURE__ */ h(
      "div",
      {
        key: d.id,
        className: "py-2.5 flex items-center justify-between text-xs"
      },
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-200" }, d.dimension_name), /* @__PURE__ */ h("span", { className: "text-slate-500 ml-2" }, "(", d.evidence_count, " citations)")),
      classificationBadge(d.suitability_classification)
    )))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Configured Diagnostic Priorities (", assessment.company_name, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-0.5 mb-3" }, "Priority focus areas guiding RAG retrieval and expectation discovery without predetermining conclusions"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2" }, (assessment.company_priorities || []).map((prio, idx) => /* @__PURE__ */ h(
      "span",
      {
        key: idx,
        className: "px-3 py-1 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 text-xs font-semibold"
      },
      prio
    )))))));
  }

  // src/components/DocumentsView.tsx
  var DOCUMENT_CATEGORIES = [
    "Annual Report / 10-K & Proxy",
    "Corporate Governance Guidelines",
    "Privacy & Data Protection Policy",
    "Community Standards & Safety Policy",
    "Transparency Report",
    "Advertising & Brand Safety Policy",
    "Creator Monetization Policy",
    "AI Governance Policy",
    "Employee & Workplace Policy",
    "Regulatory & Independent Report",
    "ESG & Sustainability Report"
  ];
  function DocumentsView(props) {
    const {
      companyId,
      assessmentPeriodId,
      fiscalYear,
      documents,
      onRefresh,
      onRunAnalysis
    } = props;
    const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
    const [docFy, setDocFy] = useState(fiscalYear || "FY2025");
    const [pubDate, setPubDate] = useState("2025-02-20");
    const [sourceUrl, setSourceUrl] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [selectedDocDetails, setSelectedDocDetails] = useState(null);
    const [ragQuery, setRagQuery] = useState("");
    const [ragCategoryFilter, setRagCategoryFilter] = useState("");
    const [ragResults, setRagResults] = useState([]);
    const [searchingRag, setSearchingRag] = useState(false);
    const handleFileUpload = async (ev) => {
      ev.preventDefault();
      const formEl = ev.target;
      const fileInput = formEl.querySelector(
        'input[type="file"]'
      );
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        setUploadStatus("Error: Please select one or more files to upload.");
        return;
      }
      const formData = new FormData();
      formData.append("company_id", String(companyId));
      formData.append("assessment_period_id", String(assessmentPeriodId));
      formData.append("category", category);
      formData.append("financial_year", docFy);
      formData.append("publication_date", pubDate);
      formData.append("source_url", sourceUrl);
      if (customTitle.trim()) {
        formData.append("title", customTitle.trim());
      }
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append("files", fileInput.files[i]);
      }
      try {
        setUploading(true);
        setUploadStatus("Extracting text, sanitizing, chunking & indexing vectors...");
        await api.uploadDocumentsForm(formData);
        setUploadStatus(
          "Successfully ingested and indexed document(s). Click 'Run Full Diagnostic Analysis' to update alignment scores."
        );
        setCustomTitle("");
        fileInput.value = "";
        onRefresh();
      } catch (err) {
        setUploadStatus(`Upload failed: ${err.message}`);
      } finally {
        setUploading(false);
      }
    };
    const inspectDoc = async (docId) => {
      const details = await api.getDocumentDetails(docId);
      setSelectedDocDetails(details);
    };
    const handleArchiveDoc = async (docId) => {
      await api.archiveDocument(docId);
      if (selectedDocDetails && selectedDocDetails.id === docId) {
        setSelectedDocDetails(null);
      }
      onRefresh();
    };
    const handleSearchRag = async (ev) => {
      ev.preventDefault();
      if (!ragQuery.trim()) return;
      setSearchingRag(true);
      try {
        const res = await api.searchChunks(
          ragQuery,
          companyId,
          assessmentPeriodId,
          ragCategoryFilter || void 0
        );
        setRagResults(res);
      } finally {
        setSearchingRag(false);
      }
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Document Ingestion & Metadata-Aware Indexing Pipeline")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Supported formats: ", /* @__PURE__ */ h("strong", { className: "text-cyan-300" }, "PDF, DOCX, TXT, CSV, XLSX, PPTX"), " ", "(with heading-preserving chunker and prompt-injection defense)")), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        className: "px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition shrink-0"
      },
      "Re-Run Diagnostic Analysis"
    )), /* @__PURE__ */ h("form", { onSubmit: handleFileUpload, className: "space-y-4" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Select File(s) (Multiple Allowed)"), /* @__PURE__ */ h(
      "input",
      {
        type: "file",
        multiple: true,
        accept: ".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md",
        className: "w-full text-xs text-slate-300 border border-slate-700 rounded-lg p-2 bg-slate-950 focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Document Category"), /* @__PURE__ */ h(
      "select",
      {
        value: category,
        onChange: (e) => setCategory(e.target.value),
        className: "w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white focus:outline-none"
      },
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Custom Title (Optional)"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: customTitle,
        onInput: (e) => setCustomTitle(e.target.value),
        placeholder: "e.g., FY2025 Form 10-K Governance Excerpt",
        className: "w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
      }
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Financial Year"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: docFy,
        onInput: (e) => setDocFy(e.target.value),
        className: "w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Publication Date"), /* @__PURE__ */ h(
      "input",
      {
        type: "date",
        value: pubDate,
        onInput: (e) => setPubDate(e.target.value),
        className: "w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-300 mb-1" }, "Source URL (Optional)"), /* @__PURE__ */ h(
      "input",
      {
        type: "url",
        value: sourceUrl,
        onInput: (e) => setSourceUrl(e.target.value),
        placeholder: "https://investor...",
        className: "w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: uploading,
        className: "w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/30"
      },
      uploading ? "Processing Pipeline..." : "Upload & Index Documents"
    )))), uploadStatus ? /* @__PURE__ */ h("div", { className: "mt-3 p-3 rounded-lg bg-violet-950/70 border border-violet-700/60 text-xs text-violet-200 font-medium" }, uploadStatus) : null), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-800 flex items-center justify-between" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Indexed Assessment Documents (", documents.length, ")"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400" }, "Source documents preserved with immutable coordinates")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-950 text-slate-400 border-b border-slate-800" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "ID & Title"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Category"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "FY / Pub Date"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Format"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Chunks"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Status & Security"), /* @__PURE__ */ h("th", { className: "p-3 font-bold text-right" }, "Actions"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-800/80" }, documents.map((doc) => /* @__PURE__ */ h("tr", { key: doc.id, className: "hover:bg-slate-800/40 transition" }, /* @__PURE__ */ h("td", { className: "p-3 font-semibold text-slate-100" }, /* @__PURE__ */ h("div", null, "#", doc.id, " \u2014 ", doc.title), doc.source_url ? /* @__PURE__ */ h(
      "a",
      {
        href: doc.source_url,
        target: "_blank",
        rel: "noreferrer",
        className: "text-[11px] text-cyan-400 hover:underline font-normal"
      },
      doc.source_url
    ) : null), /* @__PURE__ */ h("td", { className: "p-3 text-slate-300" }, doc.category), /* @__PURE__ */ h("td", { className: "p-3 text-slate-400 font-mono" }, doc.financial_year, " \u2022 ", doc.publication_date || "N/A"), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-slate-300 border border-slate-700" }, doc.file_type)), /* @__PURE__ */ h("td", { className: "p-3 font-bold text-violet-300 font-mono" }, doc.chunk_count, " chunks"), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h(
      "span",
      {
        className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${doc.processing_status === "completed" ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40" : "bg-rose-950/60 text-rose-300 border border-rose-500/40"}`
      },
      doc.processing_status
    ), doc.prompt_injection_flag ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 text-[10px] font-bold" }, "Injection Neutralized") : /* @__PURE__ */ h("span", { className: "text-[10px] text-emerald-400" }, "\u2713 Clean Source"))), /* @__PURE__ */ h("td", { className: "p-3 text-right space-x-2" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => inspectDoc(doc.id),
        className: "px-2.5 py-1 rounded bg-violet-950/70 text-violet-300 border border-violet-700/60 font-semibold hover:bg-violet-900/60"
      },
      "Inspect Chunks"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => handleArchiveDoc(doc.id),
        className: "px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:bg-rose-950 hover:text-rose-300 border border-slate-700"
      },
      "Archive"
    )))))))), selectedDocDetails ? /* @__PURE__ */ h("div", { className: "glass-card bg-slate-950 p-5 rounded-xl border border-violet-800/80 shadow-2xl space-y-3" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-violet-300" }, "Metadata-Aware Chunk Inspector: ", selectedDocDetails.title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Preserving Page Numbers, Section Headings, Financial Year (", selectedDocDetails.financial_year, "), and Vector Embeddings")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setSelectedDocDetails(null),
        className: "px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 border border-slate-700"
      },
      "Close Inspector \u2715"
    )), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1" }, (selectedDocDetails.chunks || []).map((ch) => /* @__PURE__ */ h(
      "div",
      {
        key: ch.id,
        className: "p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-violet-300 font-bold" }, /* @__PURE__ */ h("span", null, "Chunk #", ch.chunk_index + 1, " \u2022 Page ", ch.page_number), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-400 font-mono" }, ch.token_count, " tokens")),
      /* @__PURE__ */ h("div", { className: "font-semibold text-cyan-300" }, "Section: ", ch.section_heading),
      /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed whitespace-pre-wrap font-serif" }, ch.content)
    )))) : null, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Knowledge Base Vector RAG Retrieval & Metadata Filter"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Query the vector index directly with metadata filtering by category and assessment period")), /* @__PURE__ */ h("form", { onSubmit: handleSearchRag, className: "flex flex-col sm:flex-row gap-3" }, /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: ragQuery,
        onInput: (e) => setRagQuery(e.target.value),
        placeholder: "Search organizational mechanisms (e.g., 'dual-class voting', 'teen safety', 'privacy committee')...",
        className: "flex-1 text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
      }
    ), /* @__PURE__ */ h(
      "select",
      {
        value: ragCategoryFilter,
        onChange: (e) => setRagCategoryFilter(e.target.value),
        className: "text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white focus:outline-none"
      },
      /* @__PURE__ */ h("option", { value: "" }, "All Document Categories"),
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    ), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: searchingRag,
        className: "px-4 py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 shadow-md shadow-violet-600/30"
      },
      searchingRag ? "Searching..." : "Retrieve Vector Chunks"
    )), ragResults.length > 0 ? /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-2" }, ragResults.map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.chunk_id,
        className: "p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-slate-200" }, /* @__PURE__ */ h("span", null, "Page ", r.page_number, " \u2014 ", r.section_heading), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 font-mono" }, "Similarity: ", (r.similarity_score * 100).toFixed(1), "%")),
      /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-400" }, "Category: ", r.document_category, " | FY: ", r.financial_year),
      /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed mt-1 font-serif" }, r.content)
    ))) : null));
  }

  // src/components/MatrixView.tsx
  function MatrixView(props) {
    const { matrixData, onRefresh } = props;
    const [selectedCell, setSelectedCell] = useState(
      null
    );
    const [overrideClass, setOverrideClass] = useState("Strong Alignment");
    const [overrideJustification, setOverrideJustification] = useState("");
    const [overrideMsg, setOverrideMsg] = useState(null);
    const [savingOverride, setSavingOverride] = useState(false);
    if (!matrixData) {
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-slate-400 font-mono text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" }), "Loading Stakeholder \xD7 Structure Alignment Matrix...");
    }
    const stakeholders = matrixData.stakeholders || [];
    const dimensions = matrixData.dimensions || [];
    const assessments = matrixData.assessments || [];
    const activeCell = selectedCell && assessments.find((a) => a.id === selectedCell.id) || assessments[0] || null;
    const handleSelectCell = (cell) => {
      setSelectedCell(cell);
      setOverrideClass(cell.classification);
      setOverrideJustification("");
      setOverrideMsg(null);
    };
    const handleOverrideSubmit = async (ev) => {
      ev.preventDefault();
      if (!activeCell) return;
      if (overrideJustification.trim().length < 5) {
        setOverrideMsg(
          "Error: Please provide a justification of at least 5 characters for the audit trail."
        );
        return;
      }
      setSavingOverride(true);
      try {
        const res = await api.overrideAlignment(
          activeCell.id,
          overrideClass,
          overrideJustification.trim()
        );
        setOverrideMsg(
          `Override logged! Overall Alignment recalculated to ${res.recalculated_scores.overall_alignment_score}% (Coverage: ${res.recalculated_scores.evidence_coverage_pct}%).`
        );
        setOverrideJustification("");
        onRefresh();
      } catch (err) {
        setOverrideMsg(`Override failed: ${err.message}`);
      } finally {
        setSavingOverride(false);
      }
    };
    const getCellStyle = (status) => {
      if (status === "Strong Alignment")
        return "bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60 hover:border-emerald-400 shadow-sm shadow-emerald-500/10";
      if (status === "Partial Alignment")
        return "bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/60 hover:border-amber-400 shadow-sm shadow-amber-500/10";
      if (status === "Potential Misalignment")
        return "bg-rose-950/60 border-rose-500/40 text-rose-200 hover:bg-rose-900/60 hover:border-rose-400 shadow-sm shadow-rose-500/10";
      return "bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:border-slate-700";
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Interactive Stakeholder \xD7 Organizational Structure Alignment Matrix")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Click any cell to inspect exact page citations, root causes, score formula calculation, and manual audit override controls.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2 text-[11px]" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40" }, "Strong (4.0)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-md bg-amber-950/60 text-amber-300 font-bold border border-amber-500/40" }, "Partial (3.0)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-md bg-rose-950/60 text-rose-300 font-bold border border-rose-500/40" }, "Misaligned (1.0)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-md bg-slate-900 text-slate-400 font-bold border border-slate-700" }, "Insufficient Evidence (N/A)"))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-950 text-slate-200 border-b border-slate-800" }, /* @__PURE__ */ h("th", { className: "p-3.5 font-bold min-w-[220px]" }, "Stakeholder Group (Score / Cov)"), dimensions.map((d) => /* @__PURE__ */ h(
      "th",
      {
        key: d.code,
        className: "p-3.5 font-bold text-center min-w-[140px] capitalize border-l border-slate-800"
      },
      /* @__PURE__ */ h("div", { className: "text-slate-100" }, d.code),
      /* @__PURE__ */ h("div", { className: "text-[10px] font-normal text-violet-300 mt-0.5" }, d.suitability_classification.replace(" Alignment", ""))
    )))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-800/80" }, stakeholders.map((sh) => {
      const shAssessments = assessments.filter(
        (a) => a.stakeholder_id === sh.id
      );
      return /* @__PURE__ */ h("tr", { key: sh.id, className: "hover:bg-slate-800/30 transition" }, /* @__PURE__ */ h("td", { className: "p-3.5 bg-slate-950/60 font-bold text-slate-100 border-r border-slate-800" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "text-white" }, sh.name), /* @__PURE__ */ h("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700" }, sh.category)), /* @__PURE__ */ h("div", { className: "text-[11px] font-normal text-slate-400 mt-1" }, "Align:", " ", /* @__PURE__ */ h("strong", { className: "text-cyan-300" }, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), " ", "\u2022 Cov: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, sh.evidence_coverage_pct, "%"))), dimensions.map((dim) => {
        const matchingCells = shAssessments.filter(
          (a) => a.organizational_dimension === dim.code
        );
        return /* @__PURE__ */ h(
          "td",
          {
            key: dim.code,
            className: "p-2 border-l border-slate-800/60 align-top"
          },
          matchingCells.length === 0 ? /* @__PURE__ */ h("div", { className: "h-14 flex items-center justify-center text-[11px] text-slate-400 font-mono" }, "\u2014") : /* @__PURE__ */ h("div", { className: "space-y-1.5" }, matchingCells.map((cell) => {
            const isAct = activeCell && activeCell.id === cell.id;
            return /* @__PURE__ */ h(
              "button",
              {
                key: cell.id,
                onClick: () => handleSelectCell(cell),
                className: `w-full text-left p-2 rounded-lg border transition ${getCellStyle(
                  cell.classification
                )} ${isAct ? "ring-2 ring-violet-400 shadow-md shadow-violet-500/20" : ""}`
              },
              /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-[11px]" }, /* @__PURE__ */ h("span", null, cell.classification.replace(
                " Alignment",
                ""
              )), /* @__PURE__ */ h("span", { className: "font-mono" }, cell.numeric_score !== null ? `${cell.numeric_score}/4` : "N/A")),
              /* @__PURE__ */ h("div", { className: "text-[10px] truncate mt-0.5 opacity-90 text-slate-300" }, cell.expectation_title),
              cell.is_overridden ? /* @__PURE__ */ h("div", { className: "text-[9px] font-extrabold uppercase text-cyan-300 mt-0.5" }, "\u2605 Overridden") : null
            );
          }))
        );
      }));
    })))), activeCell ? /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/95 rounded-2xl border-2 border-violet-500/70 shadow-2xl overflow-hidden text-white relative" }, /* @__PURE__ */ h("div", { className: "absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" }), /* @__PURE__ */ h("div", { className: "bg-slate-950 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 relative z-10" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2 text-xs text-violet-400 font-bold uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Diagnostic Evidence Inspector"), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Stakeholder: ", activeCell.stakeholder_name), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", { className: "text-cyan-300 font-mono" }, "Dimension: ", activeCell.organizational_dimension.toUpperCase())), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold mt-1 text-white" }, activeCell.expectation_title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-0.5" }, activeCell.expectation_description)), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 shrink-0" }, classificationBadge(activeCell.classification), /* @__PURE__ */ h("div", { className: "bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono" }, "Score:", " ", /* @__PURE__ */ h("strong", { className: "text-cyan-300" }, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "N/A (Excluded from denominator)"), " ", "\xD7 Weight ", /* @__PURE__ */ h("strong", { className: "text-violet-300" }, activeCell.requirement_weight, "x")))), /* @__PURE__ */ h("div", { className: "p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10" }, /* @__PURE__ */ h("div", { className: "lg:col-span-2 space-y-5" }, /* @__PURE__ */ h("div", { className: "bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-violet-300 uppercase tracking-wider" }, "Diagnostic Rationale & Evaluation"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 leading-relaxed" }, activeCell.rationale)), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider" }, "Identified Organizational Mechanisms"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2" }, (activeCell.mapped_mechanisms || []).map((m, i) => /* @__PURE__ */ h(
      "span",
      {
        key: i,
        className: "px-3 py-1 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 text-xs font-semibold"
      },
      m
    )))), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider" }, "Root Causes & Structural Constraints"), /* @__PURE__ */ h("div", { className: "space-y-2" }, (activeCell.root_cause_diagnosis || []).map((rc, i) => /* @__PURE__ */ h(
      "div",
      {
        key: i,
        className: "p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2"
      },
      /* @__PURE__ */ h("span", { className: "text-rose-400 font-bold shrink-0" }, "!"),
      /* @__PURE__ */ h("span", null, rc)
    )))), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Supporting Evidence Records (", activeCell.evidence_records.length, ")"), /* @__PURE__ */ h("span", { className: "text-[11px] text-cyan-300 font-normal" }, "Quotation Provenance Verified")), activeCell.evidence_records.length === 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 italic" }, "Insufficient Evidence: No supporting documents or verifiable disclosures were found in this assessment period.") : /* @__PURE__ */ h("div", { className: "space-y-3" }, activeCell.evidence_records.map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 space-y-2 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "font-bold text-slate-200" }, ev.document_name), /* @__PURE__ */ h("span", { className: "text-slate-400" }, "(p. ", ev.page_number, ")")), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]" }, "Quality: ", Math.round((ev.quality_score || 0.8) * 100), "%")),
      /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-slate-900 border-l-2 border-cyan-400 font-serif italic text-slate-300 text-xs" }, '"', ev.exact_quotation, '"'),
      ev.is_contradictory ? /* @__PURE__ */ h("div", { className: "text-[10px] text-amber-400 font-semibold" }, "\u26A0\uFE0F Marked as Contradictory: Clashes with countervailing external or operational findings.") : null
    ))))), /* @__PURE__ */ h("div", { className: "space-y-5" }, /* @__PURE__ */ h("div", { className: "bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-200 uppercase tracking-wider" }, "Score Calculation Transparency"), /* @__PURE__ */ h("div", { className: "space-y-2 text-slate-300" }, /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Base Numeric Score:"), /* @__PURE__ */ h("strong", { className: "text-white font-mono" }, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "Excluded")), /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Requirement Weight:"), /* @__PURE__ */ h("strong", { className: "text-violet-300 font-mono" }, activeCell.requirement_weight, "x")), /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Weighted Contribution:"), /* @__PURE__ */ h("strong", { className: "text-cyan-300 font-mono" }, activeCell.numeric_score !== null ? `${(activeCell.numeric_score * activeCell.requirement_weight).toFixed(2)} pts` : "0.00 pts")), /* @__PURE__ */ h("div", { className: "flex justify-between border-t border-slate-800 pt-2" }, /* @__PURE__ */ h("span", null, "Evidence Quality Score:"), /* @__PURE__ */ h("strong", { className: "text-emerald-400 font-mono" }, Math.round((activeCell.evidence_quality_score || 0) * 100), "%")))), /* @__PURE__ */ h("div", { className: "bg-slate-950/90 p-4 rounded-xl border border-violet-800/60 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-violet-300 uppercase tracking-wider flex items-center justify-between" }, /* @__PURE__ */ h("span", null, "Evaluator Manual Override"), /* @__PURE__ */ h("span", { className: "text-[10px] font-normal text-slate-400" }, "Logged to Audit Trail")), /* @__PURE__ */ h("p", { className: "text-slate-400 text-[11px] leading-relaxed" }, "Override AI classification if proprietary context or unindexed evidence justifies a revision."), overrideMsg ? /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-violet-950/80 border border-violet-700/60 text-violet-200 text-xs" }, overrideMsg) : null, /* @__PURE__ */ h("form", { onSubmit: handleOverrideSubmit, className: "space-y-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-slate-300 font-semibold mb-1" }, "New Classification:"), /* @__PURE__ */ h(
      "select",
      {
        value: overrideClass,
        onChange: (e) => setOverrideClass(e.target.value),
        className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
      },
      /* @__PURE__ */ h("option", { value: "Strong Alignment" }, "Strong Alignment (4.0)"),
      /* @__PURE__ */ h("option", { value: "Partial Alignment" }, "Partial Alignment (3.0)"),
      /* @__PURE__ */ h("option", { value: "Potential Misalignment" }, "Potential Misalignment (1.0)"),
      /* @__PURE__ */ h("option", { value: "Insufficient Evidence" }, "Insufficient Evidence (N/A)")
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-slate-300 font-semibold mb-1" }, "Mandatory Evaluator Justification:"), /* @__PURE__ */ h(
      "textarea",
      {
        rows: 3,
        value: overrideJustification,
        onInput: (e) => setOverrideJustification(e.target.value),
        placeholder: "Explain organizational rationale, supporting document citations, or internal policy evidence...",
        className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500"
      }
    )), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: savingOverride,
        className: "w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition"
      },
      savingOverride ? "Saving Override..." : "Save Override & Recalculate Scores"
    )))))) : null);
  }

  // src/components/RecommendationsView.tsx
  function RecommendationsView(props) {
    const { recommendations, evidenceList, onRefresh } = props;
    const [priorityFilter, setPriorityFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [updatingId, setUpdatingId] = useState(null);
    const evMap = /* @__PURE__ */ new Map();
    for (const e of evidenceList) evMap.set(e.id, e);
    const filtered = recommendations.filter((r) => {
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
    const handleStatusChange = async (recId, nextStatus) => {
      setUpdatingId(recId);
      try {
        await api.updateRecommendationStatus(recId, nextStatus);
        onRefresh();
      } finally {
        setUpdatingId(null);
      }
    };
    const statusStyles = {
      Proposed: "bg-slate-800 text-slate-300 border-slate-700",
      Accepted: "bg-violet-950/80 text-violet-300 border-violet-700/60",
      Implemented: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
      Rejected: "bg-rose-950/80 text-rose-300 border-rose-700/60"
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Actionable Structural & Governance Recommendations (", recommendations.length, ")")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Specific organizational design changes, reporting line reforms, and governance controls with implementation trade-offs.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2 text-xs" }, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-400" }, "Priority:"), ["ALL", "Critical", "High", "Medium", "Low"].map((p) => /* @__PURE__ */ h(
      "button",
      {
        key: p,
        onClick: () => setPriorityFilter(p),
        className: `px-3 py-1 rounded-lg font-bold transition ${priorityFilter === p ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`
      },
      p
    )), /* @__PURE__ */ h("span", { className: "font-semibold text-slate-400 ml-2" }, "Status:"), /* @__PURE__ */ h(
      "select",
      {
        value: statusFilter,
        onChange: (e) => setStatusFilter(e.target.value),
        className: "border border-slate-700 rounded-lg p-1.5 bg-slate-950 text-white font-semibold focus:outline-none"
      },
      /* @__PURE__ */ h("option", { value: "ALL" }, "All Statuses"),
      /* @__PURE__ */ h("option", { value: "Proposed" }, "Proposed"),
      /* @__PURE__ */ h("option", { value: "Accepted" }, "Accepted"),
      /* @__PURE__ */ h("option", { value: "Implemented" }, "Implemented"),
      /* @__PURE__ */ h("option", { value: "Rejected" }, "Rejected")
    ))), /* @__PURE__ */ h("div", { className: "space-y-4" }, filtered.map((rec) => /* @__PURE__ */ h(
      "div",
      {
        key: rec.id,
        className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3" }, /* @__PURE__ */ h("div", { className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, priorityBadge(rec.priority), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded bg-violet-950/70 text-violet-300 text-xs font-mono border border-violet-700/60 uppercase" }, "Dimension: ", rec.organizational_dimension), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700 font-mono" }, "Difficulty: ", /* @__PURE__ */ h("strong", { className: "text-white" }, rec.implementation_difficulty))), /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white pt-1" }, rec.title)), /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-xs font-semibold text-slate-400" }, "Workflow Status:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: updatingId === rec.id,
          value: rec.status,
          onChange: (e) => handleStatusChange(rec.id, e.target.value),
          className: `text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none ${statusStyles[rec.status] || statusStyles.Proposed}`
        },
        /* @__PURE__ */ h("option", { value: "Proposed" }, "Proposed"),
        /* @__PURE__ */ h("option", { value: "Accepted" }, "Accepted"),
        /* @__PURE__ */ h("option", { value: "Implemented" }, "Implemented"),
        /* @__PURE__ */ h("option", { value: "Rejected" }, "Rejected")
      ))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-300" }, "Identified Structural Issue"), /* @__PURE__ */ h("p", { className: "text-rose-200 leading-relaxed" }, rec.identified_issue)), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-violet-300" }, "Required Governance Change"), /* @__PURE__ */ h("p", { className: "text-violet-200 leading-relaxed font-medium" }, rec.suggested_organizational_change))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30" }, /* @__PURE__ */ h("span", { className: "font-bold text-emerald-300" }, "Expected Benefit:", " "), /* @__PURE__ */ h("span", { className: "text-emerald-200" }, rec.expected_benefit)), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-amber-950/30 border border-amber-500/30" }, /* @__PURE__ */ h("span", { className: "font-bold text-amber-300" }, "Implementation Trade-offs:", " "), /* @__PURE__ */ h("span", { className: "text-amber-200" }, rec.possible_tradeoffs))),
      (rec.evidence_ids || []).length > 0 ? /* @__PURE__ */ h("div", { className: "pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] text-slate-400" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-300" }, "Traceable Evidence Citations:"), rec.evidence_ids.map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
        "span",
        {
          key: ev.id,
          className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
        },
        evidenceClassBadge(ev.evidence_classification),
        /* @__PURE__ */ h("span", null, ev.document_name, " (p.", ev.page_number, ")")
      ))) : null
    ))));
  }

  // src/components/ReportView.tsx
  function ReportView(props) {
    const { assessmentPeriodId, evidenceList, mode } = props;
    const [report, setReport] = useState(null);
    const [evFilter, setEvFilter] = useState("ALL");
    const [contradictoryOnly, setContradictoryOnly] = useState(false);
    useEffect(() => {
      if (assessmentPeriodId) {
        api.getReport(assessmentPeriodId).then(setReport).catch(() => {
        });
      }
    }, [assessmentPeriodId]);
    const filteredEv = evidenceList.filter((e) => {
      if (evFilter !== "ALL" && e.evidence_classification !== evFilter)
        return false;
      if (contradictoryOnly && !e.is_contradictory) return false;
      return true;
    });
    if (mode === "evidence") {
      return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Traceable Evidence Repository & Quality Scoring (", evidenceList.length, " Records)")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
          className: "px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
        },
        "\u2B07 Export Evidence CSV"
      ), /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
          className: "px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
        },
        "\u2B07 Export Evidence Excel (.xlsx)"
      ))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-400" }, "Filter by Classification:"), [
        "ALL",
        "FACT",
        "COMPANY_CLAIM",
        "THIRD_PARTY_CLAIM",
        "INFERENCE"
      ].map((cl) => /* @__PURE__ */ h(
        "button",
        {
          key: cl,
          onClick: () => setEvFilter(cl),
          className: `px-3 py-1 rounded-lg font-bold transition ${evFilter === cl ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"}`
        },
        cl.replace(/_/g, " ")
      ))), /* @__PURE__ */ h("label", { className: "flex items-center gap-2 cursor-pointer font-semibold text-rose-400" }, /* @__PURE__ */ h(
        "input",
        {
          type: "checkbox",
          checked: contradictoryOnly,
          onChange: (e) => setContradictoryOnly(e.target.checked)
        }
      ), /* @__PURE__ */ h("span", null, "Show Only Contradictory Evidence"))), /* @__PURE__ */ h("div", { className: "space-y-3" }, filteredEv.map((ev) => /* @__PURE__ */ h(
        "div",
        {
          key: ev.id,
          className: "glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl space-y-2 text-xs"
        },
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-mono font-bold text-violet-300" }, "Evidence #", ev.id), evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono uppercase text-[10px] border border-slate-800" }, "Dimension: ", ev.organizational_dimension), ev.is_contradictory ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[10px]" }, "\u26A0 Contradictory") : null), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 text-slate-400" }, /* @__PURE__ */ h("span", null, "Confidence: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, ev.confidence_level)), /* @__PURE__ */ h("span", null, "Quality:", " ", /* @__PURE__ */ h("strong", { className: "text-cyan-300 font-mono" }, Math.round(ev.quality_score * 100), "%")))),
        /* @__PURE__ */ h("div", { className: "font-semibold text-white" }, ev.extracted_statement),
        /* @__PURE__ */ h("blockquote", { className: "p-3 rounded-lg bg-slate-950 border-l-4 border-violet-500 italic text-slate-300 font-serif" }, '"', ev.exact_quotation, '"'),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1" }, /* @__PURE__ */ h("span", null, "Document: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, ev.document_name), " \u2022 Page", " ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, ev.page_number), " \u2022 Section:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, ev.section_heading)), /* @__PURE__ */ h("span", { className: "font-mono text-cyan-300" }, "FY: ", ev.financial_year, " | Pub: ", ev.publication_date || "N/A"))
      ))));
    }
    if (!report) {
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-slate-400 font-mono text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" }), "Generating 14-section evidence diagnostic report...");
    }
    const sec = report.sections;
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-950 p-6 rounded-2xl border border-violet-800/80 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-violet-400 uppercase tracking-wider" }, "Comprehensive 14-Section Diagnostic Report"), /* @__PURE__ */ h("h2", { className: "text-xl font-extrabold mt-1 text-white" }, report.company_name, " \u2014 ", report.assessment_title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1 font-mono" }, "Overall Alignment: ", /* @__PURE__ */ h("strong", { className: "text-cyan-300" }, report.overall_alignment_score, "%"), " ", "| Evidence Coverage: ", /* @__PURE__ */ h("strong", { className: "text-violet-300" }, report.evidence_coverage_pct, "%"))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2.5" }, /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/pdf`,
        className: "px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition"
      },
      "\u2B07 Export Report PDF (.pdf)"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/docx`,
        className: "px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition"
      },
      "\u2B07 Export Report Word (.docx)"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
        className: "px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
      },
      "\u2B07 Evidence CSV"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
        className: "px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
      },
      "\u2B07 Evidence XLSX"
    ))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl space-y-6 text-xs" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["1_executive_summary"].title), /* @__PURE__ */ h("p", { className: "mt-2 text-slate-300 leading-relaxed font-serif" }, sec["1_executive_summary"].summary_narrative)), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["2_company_overview"].title, " &", " ", sec["3_assessment_methodology"].title), /* @__PURE__ */ h("p", { className: "mt-2 text-slate-300" }, /* @__PURE__ */ h("strong", { className: "text-white" }, sec["2_company_overview"].company_name), " (", sec["2_company_overview"].industry, "):", " ", sec["2_company_overview"].description), /* @__PURE__ */ h("div", { className: "mt-2 flex flex-wrap gap-1.5" }, (sec["2_company_overview"].analysis_priorities || []).map(
      (p, i) => /* @__PURE__ */ h(
        "span",
        {
          key: i,
          className: "px-2.5 py-0.5 rounded bg-violet-950/70 border border-violet-700/60 text-violet-300 font-semibold"
        },
        p
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["4_stakeholder_landscape"].title, " &", " ", sec["5_stakeholder_expectations"].title), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" }, (sec["4_stakeholder_landscape"].internal_stakeholders.concat(
      sec["4_stakeholder_landscape"].external_stakeholders
    ) || []).map((s, idx) => /* @__PURE__ */ h(
      "div",
      {
        key: idx,
        className: "p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between"
      },
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-bold text-white" }, s.name), /* @__PURE__ */ h("span", { className: "text-slate-400 ml-2" }, "(W: ", s.importance_weight, "x, Influence: ", s.influence_level, ")")),
      /* @__PURE__ */ h("div", { className: "font-mono font-bold text-cyan-300" }, s.alignment_score !== null ? `${s.alignment_score}%` : "N/A", " ", "(Cov: ", s.evidence_coverage_pct, "%)")
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["6_organizational_structure_analysis"].title), /* @__PURE__ */ h("div", { className: "space-y-2 mt-3" }, (sec["6_organizational_structure_analysis"].dimensions || []).map(
      (d) => /* @__PURE__ */ h(
        "div",
        {
          key: d.dimension_code,
          className: "p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-bold text-white" }, d.dimension_name), /* @__PURE__ */ h("p", { className: "text-slate-400 mt-0.5" }, d.assessment_summary)),
        classificationBadge(d.suitability_classification)
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["10_key_organizational_gaps"].title, " &", " ", sec["11_recommendations"].title), /* @__PURE__ */ h("div", { className: "space-y-2.5 mt-3" }, (sec["11_recommendations"].recommendations || []).map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.id,
        className: "p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, priorityBadge(r.priority), /* @__PURE__ */ h("span", { className: "font-bold text-white" }, r.title)), /* @__PURE__ */ h("span", { className: "font-semibold text-violet-300 font-mono" }, r.status)),
      /* @__PURE__ */ h("p", { className: "text-slate-300 leading-relaxed" }, r.suggested_organizational_change)
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-white border-b border-slate-800 pb-2" }, sec["12_evidence_limitations"].title, " &", " ", sec["13_sources_and_references"].title), /* @__PURE__ */ h("div", { className: "mt-2 p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200" }, sec["12_evidence_limitations"].limitation_statement))));
  }

  // src/components/SettingsView.tsx
  function SettingsView(props) {
    const { assessmentPeriodId, onAuthChange } = props;
    const auth = getAuthContext();
    const [userName, setUserName] = useState(auth.name);
    const [userRole, setUserRole] = useState(auth.role);
    const [auditLogs, setAuditLogs] = useState([]);
    const [prompts, setPrompts] = useState({});
    const [selectedPromptKey, setSelectedPromptKey] = useState(
      "alignment_assessment"
    );
    const [backupMsg, setBackupMsg] = useState(null);
    const [llmConfig, setLlmConfig] = useState({
      llm_provider: "groq",
      llm_model: "llama-3.3-70b-versatile",
      groq_configured: false,
      masked_groq_key: "Checking..."
    });
    const [newGroqKey, setNewGroqKey] = useState("");
    const [llmModelInput, setLlmModelInput] = useState("llama-3.3-70b-versatile");
    const [llmMsg, setLlmMsg] = useState(null);
    useEffect(() => {
      api.getAuditLogs(assessmentPeriodId).then(setAuditLogs).catch(() => {
      });
      api.getPrompts().then(setPrompts).catch(() => {
      });
      api.getLlmConfig().then((cfg) => {
        setLlmConfig(cfg);
        if (cfg.llm_model) setLlmModelInput(cfg.llm_model);
      }).catch(() => {
      });
    }, [assessmentPeriodId]);
    const handleSaveLlmConfig = async (ev) => {
      ev.preventDefault();
      setLlmMsg(null);
      try {
        const updated = await api.updateLlmConfig({
          groq_api_key: newGroqKey.trim() || void 0,
          llm_provider: "groq",
          llm_model: llmModelInput
        });
        setLlmConfig(updated);
        setNewGroqKey("");
        setLlmMsg(
          `Groq AI configuration active (${updated.llm_model}, Key: ${updated.masked_groq_key})`
        );
      } catch (err) {
        setLlmMsg(`Failed to update LLM config: ${err.message}`);
      }
    };
    const handleSaveRole = (ev) => {
      ev.preventDefault();
      setAuthContext(userName, userRole);
      onAuthChange();
    };
    const handleBackup = async () => {
      try {
        const res = await api.triggerBackup();
        setBackupMsg(`Database backup snapshot created at: ${res.backup_path}`);
      } catch (err) {
        setBackupMsg(`Backup failed: ${err.message}`);
      }
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-violet-800/80 shadow-xl space-y-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider" }, "Groq Cloud LLM"), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "AI Inference Engine & Groq API Configuration")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-0.5" }, "Active Provider: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, llmConfig.llm_provider), " | Model:", " ", /* @__PURE__ */ h("strong", { className: "text-cyan-300 font-mono" }, llmConfig.llm_model), " | Key Status:", " ", /* @__PURE__ */ h(
      "span",
      {
        className: llmConfig.groq_configured ? "text-emerald-400 font-bold font-mono" : "text-amber-400 font-bold font-mono"
      },
      llmConfig.masked_groq_key
    )))), /* @__PURE__ */ h("form", { onSubmit: handleSaveLlmConfig, className: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-300 mb-1" }, "Groq Model"), /* @__PURE__ */ h(
      "select",
      {
        value: llmModelInput,
        onChange: (e) => setLlmModelInput(e.target.value),
        className: "w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-mono focus:outline-none"
      },
      /* @__PURE__ */ h("option", { value: "llama-3.3-70b-versatile" }, "llama-3.3-70b-versatile (Recommended)"),
      /* @__PURE__ */ h("option", { value: "llama-3.1-8b-instant" }, "llama-3.1-8b-instant"),
      /* @__PURE__ */ h("option", { value: "mixtral-8x7b-32768" }, "mixtral-8x7b-32768")
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-300 mb-1" }, "Update Groq API Key (Optional if in .env)"), /* @__PURE__ */ h(
      "input",
      {
        type: "password",
        value: newGroqKey,
        onInput: (e) => setNewGroqKey(e.target.value),
        placeholder: llmConfig.groq_configured ? `Active: ${llmConfig.masked_groq_key}` : "gsk_...",
        className: "w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-mono placeholder-slate-500 focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", { className: "flex items-end" }, /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        className: "w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition shadow-md shadow-violet-600/30"
      },
      "Save Groq AI Settings"
    ))), llmMsg ? /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-mono" }, llmMsg) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Authentication & Role-Based Access Control (RBAC)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-0.5" }, "Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.")), /* @__PURE__ */ h("form", { onSubmit: handleSaveRole, className: "space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-300 mb-1" }, "Evaluator Name"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: userName,
        onInput: (e) => setUserName(e.target.value),
        className: "w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-300 mb-1" }, "Access Role"), /* @__PURE__ */ h(
      "select",
      {
        value: userRole,
        onChange: (e) => setUserRole(e.target.value),
        className: "w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-semibold focus:outline-none"
      },
      /* @__PURE__ */ h("option", { value: "Admin" }, "Admin (Full Write, Override & Config)"),
      /* @__PURE__ */ h("option", { value: "Analyst" }, "Analyst (Upload, Analyze & Override)"),
      /* @__PURE__ */ h("option", { value: "Viewer" }, "Viewer (Read-Only Diagnostic Access)")
    ))), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        className: "px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-sm"
      },
      "Update Active Evaluator Context"
    ))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Database Reliability & Immutable Provenance"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.")), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: handleBackup,
        className: "px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
      },
      "Create Timestamped Database Backup Snapshot"
    ), backupMsg ? /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-mono" }, backupMsg) : null))), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "10 Modular AI System Prompts & Evidence Guardrails"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation")), /* @__PURE__ */ h(
      "select",
      {
        value: selectedPromptKey,
        onChange: (e) => setSelectedPromptKey(e.target.value),
        className: "text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 font-bold text-violet-300 focus:outline-none"
      },
      Object.keys(prompts).map((k) => /* @__PURE__ */ h("option", { key: k, value: k }, "Prompt: ", k.replace(/_/g, " ").toUpperCase()))
    )), /* @__PURE__ */ h("pre", { className: "p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 font-mono" }, prompts[selectedPromptKey] || "Loading prompt specification...")), /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-800" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Immutable Audit Trail & Manual Override History (", auditLogs.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-950 text-slate-400 border-b border-slate-800" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Timestamp"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Actor & Role"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Action"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Entity"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Justification / State Change"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-800/80" }, auditLogs.length === 0 ? /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("td", { colSpan: 5, className: "p-4 text-center text-slate-500" }, "No manual overrides or configuration changes logged for this period yet.")) : auditLogs.map((log) => /* @__PURE__ */ h("tr", { key: log.id, className: "hover:bg-slate-800/40 transition" }, /* @__PURE__ */ h("td", { className: "p-3 text-slate-400 font-mono text-[11px]" }, new Date(log.created_at).toLocaleString()), /* @__PURE__ */ h("td", { className: "p-3 font-semibold text-slate-200" }, log.actor, " ", /* @__PURE__ */ h("span", { className: "px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700" }, log.role)), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-700/60 font-mono font-bold" }, log.action_type)), /* @__PURE__ */ h("td", { className: "p-3 text-slate-300 font-mono" }, log.entity_type, " #", log.entity_id), /* @__PURE__ */ h("td", { className: "p-3 text-slate-300" }, log.justification ? /* @__PURE__ */ h("div", { className: "font-semibold text-white" }, 'Justification: "', log.justification, '"') : null, /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-400 font-mono truncate max-w-md" }, JSON.stringify(log.after_state))))))))));
  }

  // src/components/StakeholdersView.tsx
  function StakeholdersView(props) {
    const { stakeholders, onRefresh } = props;
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [selectedShId, setSelectedShId] = useState(
      stakeholders[0]?.id || null
    );
    const [savingWeight, setSavingWeight] = useState(false);
    const filtered = stakeholders.filter(
      (s) => categoryFilter === "ALL" || s.category === categoryFilter
    );
    const selectedSh = stakeholders.find((s) => s.id === selectedShId) || stakeholders[0] || null;
    const handleStakeholderWeightChange = async (shId, newWeight) => {
      setSavingWeight(true);
      try {
        await api.updateStakeholderWeight(shId, newWeight);
        onRefresh();
      } finally {
        setSavingWeight(false);
      }
    };
    const handleExpectationWeightChange = async (expId, newWeight) => {
      setSavingWeight(true);
      try {
        await api.updateExpectationWeight(expId, newWeight);
        onRefresh();
      } finally {
        setSavingWeight(false);
      }
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "Stakeholder Classification & Weight Calibration Framework")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, "Internal (4 groups) & External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.")), /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, ["ALL", "Internal", "External"].map((cat) => /* @__PURE__ */ h(
      "button",
      {
        key: cat,
        onClick: () => setCategoryFilter(cat),
        className: `px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${categoryFilter === cat ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`
      },
      cat === "ALL" ? "All Stakeholders (10)" : `${cat} Stakeholders`
    )))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" }, filtered.map((sh) => {
      const isSelected = selectedSh && selectedSh.id === sh.id;
      const totalReq = sh.strong_count + sh.partial_count + sh.misalignment_count + sh.insufficient_count;
      const assessedReq = sh.strong_count + sh.partial_count + sh.misalignment_count;
      return /* @__PURE__ */ h(
        "div",
        {
          key: sh.id,
          onClick: () => setSelectedShId(sh.id),
          className: `cursor-pointer glass-card rounded-xl p-5 border transition-all duration-200 relative ${isSelected ? "bg-slate-800/90 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20" : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
          "span",
          {
            className: `inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sh.category === "Internal" ? "bg-violet-950/70 text-violet-300 border border-violet-700/60" : "bg-cyan-950/70 text-cyan-300 border border-cyan-700/60"}`
          },
          sh.category
        ), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white mt-1.5" }, sh.name)), /* @__PURE__ */ h("div", { className: "text-right" }, /* @__PURE__ */ h("div", { className: "text-lg font-extrabold text-cyan-300 font-mono" }, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), /* @__PURE__ */ h("div", { className: "text-[10px] text-slate-400" }, "Cov: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, sh.evidence_coverage_pct, "%")))),
        /* @__PURE__ */ h("div", { className: "grid grid-cols-4 gap-1.5 mt-4 text-center text-[11px]" }, /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" }, /* @__PURE__ */ h("div", { className: "font-extrabold text-emerald-400" }, sh.strong_count), /* @__PURE__ */ h("div", { className: "text-[9px] text-emerald-500" }, "Strong")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30" }, /* @__PURE__ */ h("div", { className: "font-extrabold text-amber-400" }, sh.partial_count), /* @__PURE__ */ h("div", { className: "text-[9px] text-amber-500" }, "Partial")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30" }, /* @__PURE__ */ h("div", { className: "font-extrabold text-rose-400" }, sh.misalignment_count), /* @__PURE__ */ h("div", { className: "text-[9px] text-rose-500" }, "Misaligned")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700" }, /* @__PURE__ */ h("div", { className: "font-extrabold text-slate-400" }, sh.insufficient_count), /* @__PURE__ */ h("div", { className: "text-[9px] text-slate-500" }, "Insuff."))),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400" }, /* @__PURE__ */ h("span", null, "Assessed: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, assessedReq, "/", totalReq), " reqs"), /* @__PURE__ */ h("span", null, "Weight: ", /* @__PURE__ */ h("strong", { className: "text-violet-300 font-mono" }, sh.importance_weight, "x")))
      );
    })), selectedSh ? /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-6 space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-violet-400 uppercase tracking-wider" }, "Detailed Stakeholder Diagnostic Profile"), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-white mt-1" }, selectedSh.name, " (", selectedSh.category, ")"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400" }, /* @__PURE__ */ h("span", null, "Influence:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, selectedSh.influence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Dependence:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, selectedSh.dependence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Alignment Score:", " ", /* @__PURE__ */ h("strong", { className: "text-cyan-300 font-mono" }, selectedSh.alignment_score !== null ? `${selectedSh.alignment_score}%` : "Insufficient Evidence")))), /* @__PURE__ */ h("div", { className: "bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3" }, /* @__PURE__ */ h("div", { className: "text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-200" }, "Stakeholder Importance Weight"), /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-400" }, "Recalculates Overall Alignment Score")), /* @__PURE__ */ h(
      "select",
      {
        disabled: savingWeight,
        value: String(selectedSh.importance_weight),
        onChange: (e) => handleStakeholderWeightChange(
          selectedSh.id,
          parseFloat(e.target.value)
        ),
        className: "text-xs font-bold border border-slate-700 rounded-lg p-2 bg-slate-900 text-violet-300 focus:outline-none"
      },
      [0.5, 0.8, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3].map(
        (w) => /* @__PURE__ */ h("option", { key: w, value: String(w) }, w.toFixed(1), "x Weight")
      )
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-slate-950/80 border border-slate-800" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-200 mb-2" }, "Primary Interests"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-slate-300 list-disc list-inside" }, (selectedSh.key_interests || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-300 mb-2" }, "Concerns & Potential Risks"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-rose-200 list-disc list-inside" }, (selectedSh.concerns_and_risks || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-violet-300 mb-2" }, "Relevant Corporate Policies"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-violet-200 list-disc list-inside" }, (selectedSh.relevant_policies || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-amber-300 mb-2" }, "Potential Stakeholder Tensions"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-amber-200 list-disc list-inside" }, (selectedSh.potential_conflicts || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it))))), /* @__PURE__ */ h("div", { className: "space-y-3 pt-2" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider" }, "Assessed Expectations for ", selectedSh.name, " (", selectedSh.expectations.length, ")"), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-500" }, "Adjust requirement weights individually")), /* @__PURE__ */ h("div", { className: "space-y-2" }, selectedSh.expectations.map((exp) => /* @__PURE__ */ h(
      "div",
      {
        key: exp.id,
        className: "p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "space-y-1 flex-1" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-100" }, exp.title), exp.is_discovered_from_docs ? /* @__PURE__ */ h("span", { className: "px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 text-[10px] font-mono" }, "Discovered from Filings") : null), /* @__PURE__ */ h("p", { className: "text-slate-400 text-[11px]" }, exp.description), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1 mt-1" }, (exp.mapped_dimension_codes || []).map((d) => /* @__PURE__ */ h(
        "span",
        {
          key: d,
          className: "px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-700"
        },
        d
      )))),
      /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-slate-400 text-[11px]" }, "Weight:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: savingWeight,
          value: String(exp.requirement_weight),
          onChange: (e) => handleExpectationWeightChange(
            exp.id,
            parseFloat(e.target.value)
          ),
          className: "text-xs font-bold border border-slate-700 rounded p-1 bg-slate-900 text-cyan-300"
        },
        [0.5, 0.8, 1, 1.2, 1.4, 1.5, 1.8, 2].map((w) => /* @__PURE__ */ h("option", { key: w, value: String(w) }, w.toFixed(1), "x"))
      ))
    ))))) : null);
  }

  // src/components/StructureView.tsx
  function StructureView(props) {
    const { structureData } = props;
    const [selectedDimCode, setSelectedDimCode] = useState("governance");
    if (!structureData) {
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-slate-400 font-mono text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" }), "Loading 7-dimension organizational structure assessment...");
    }
    const dimensions = structureData.dimensions || [];
    const units = structureData.units || [];
    const evidenceByDim = structureData.evidence_by_dimension || {};
    const activeDim = dimensions.find((d) => d.dimension_code === selectedDimCode) || dimensions[0] || null;
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-white" }, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" }), /* @__PURE__ */ h("h2", { className: "text-base font-bold text-white" }, "7-Dimension Organizational Structure & Governance Diagnostic")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-1" }, 'Evaluates Hierarchy, Centralization, Formalization, Specialization, Delegation & Authority, Coordination & Integration, and Governance. Reporting lines not supported by public filings are strictly marked as "Insufficient Evidence".')), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" }, dimensions.map((d) => {
      const isSelected = activeDim && activeDim.dimension_code === d.dimension_code;
      return /* @__PURE__ */ h(
        "div",
        {
          key: d.id,
          onClick: () => setSelectedDimCode(d.dimension_code),
          className: `cursor-pointer glass-card rounded-xl p-4 border transition-all duration-200 shadow-xl flex flex-col justify-between ${isSelected ? "bg-slate-800/95 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20" : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2 mb-2" }, /* @__PURE__ */ h("span", { className: "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono border border-slate-800" }, d.dimension_code), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-400" }, "Conf: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, d.confidence_level))), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, d.dimension_name), /* @__PURE__ */ h("div", { className: "mt-2" }, classificationBadge(d.suitability_classification)), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400 mt-3 line-clamp-3" }, d.assessment_summary)),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-violet-400 font-semibold" }, /* @__PURE__ */ h("span", null, d.evidence_count, " Citations"), /* @__PURE__ */ h("span", null, "Inspect \u2192"))
      );
    })), activeDim ? /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-violet-400 uppercase tracking-wider" }, "Dimension Deep-Dive \u2022 ", activeDim.dimension_code.toUpperCase()), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-white mt-1" }, activeDim.dimension_name)), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, classificationBadge(activeDim.suitability_classification), /* @__PURE__ */ h("span", { className: "text-xs text-slate-400" }, "Confidence: ", /* @__PURE__ */ h("strong", { className: "text-slate-200" }, activeDim.confidence_level)))), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-lg border border-slate-800" }, activeDim.assessment_summary), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-300 mb-1.5" }, "Observed Structural Strengths"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-emerald-200 list-disc list-inside" }, (activeDim.strengths || []).map((s, idx) => /* @__PURE__ */ h("li", { key: idx }, s)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-300 mb-1.5" }, "Observed Structural Weaknesses / Tensions"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-rose-200 list-disc list-inside" }, (activeDim.weaknesses || []).map((w, idx) => /* @__PURE__ */ h("li", { key: idx }, w))))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider mb-2" }, "Documentary Citations for ", activeDim.dimension_name), /* @__PURE__ */ h("div", { className: "space-y-2" }, (evidenceByDim[activeDim.dimension_code] || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-xs text-slate-300 italic p-3 bg-slate-900/80 rounded-lg border border-slate-700/60" }, "No direct quotations indexed for this dimension in this assessment period.") : (evidenceByDim[activeDim.dimension_code] || []).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "font-bold text-slate-200" }, ev.document_name), /* @__PURE__ */ h("span", { className: "text-slate-400" }, "(p. ", ev.page_number, ")")), /* @__PURE__ */ h("span", { className: "text-[10px] text-cyan-300 font-mono" }, "FY: ", ev.financial_year || "N/A")),
      /* @__PURE__ */ h("p", { className: "font-serif italic text-slate-300 pl-2 border-l-2 border-violet-500" }, '"', ev.exact_quotation, '"')
    ))))) : null, /* @__PURE__ */ h("div", { className: "glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-800 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-white" }, "Explicitly Disclosed Organizational Units (", units.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Committees, divisions, functions, and oversight boards extracted directly from filings"))), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-950 text-slate-400 border-b border-slate-800" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Unit Name"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Type"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Dimension"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Reporting Line"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Core Mandate & Responsibilities"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-800/80" }, units.map((u) => /* @__PURE__ */ h("tr", { key: u.id, className: "hover:bg-slate-800/40 transition" }, /* @__PURE__ */ h("td", { className: "p-3 font-bold text-white" }, u.name), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700" }, u.unit_type)), /* @__PURE__ */ h("td", { className: "p-3 uppercase font-semibold text-violet-300 font-mono" }, u.dimension_code), /* @__PURE__ */ h("td", { className: "p-3 text-slate-300" }, u.reporting_line.includes("Insufficient Evidence") ? /* @__PURE__ */ h("span", { className: "italic text-amber-300/80 font-mono text-[11px]" }, u.reporting_line) : /* @__PURE__ */ h("strong", { className: "text-slate-200" }, u.reporting_line)), /* @__PURE__ */ h("td", { className: "p-3 text-slate-300 max-w-md" }, u.responsibilities))))))));
  }

  // src/main.tsx
  var NAV_SECTIONS = [
    {
      title: "DIAGNOSTIC WORKFLOW",
      items: [
        { id: "dashboard", stepNumber: "01", label: "Executive Dashboard", shortLabel: "Cockpit", icon: "\u{1F4CA}" },
        { id: "documents", stepNumber: "02", label: "Research Library", shortLabel: "Filings", icon: "\u{1F4C1}" },
        { id: "stakeholders", stepNumber: "03", label: "Stakeholder Profiles", shortLabel: "Profiles", icon: "\u{1F465}" },
        { id: "structure", stepNumber: "04", label: "Org Structure (7 Dims)", shortLabel: "Structure", icon: "\u{1F3DB}\uFE0F" },
        { id: "matrix", stepNumber: "05", label: "Alignment Matrix", shortLabel: "Matrix", icon: "\u{1F3AF}" }
      ]
    },
    {
      title: "DEEP ANALYSIS",
      items: [
        { id: "conflicts", stepNumber: "06", label: "Conflict Matrix", shortLabel: "Conflicts", icon: "\u26A1" },
        { id: "recommendations", stepNumber: "07", label: "Recommendations", shortLabel: "Actions", icon: "\u{1F4A1}" },
        { id: "evidence", stepNumber: "08", label: "Evidence Repository", shortLabel: "Citations", icon: "\u{1F50D}" }
      ]
    },
    {
      title: "GOVERNANCE & REPORTS",
      items: [
        { id: "comparison", stepNumber: "09", label: "Historical Trends", shortLabel: "Trends", icon: "\u{1F4C8}" },
        { id: "report", stepNumber: "10", label: "Diagnostic Report", shortLabel: "Report", icon: "\u{1F4C4}" },
        { id: "settings", stepNumber: "11", label: "Audit & Settings", shortLabel: "Audit", icon: "\u2699\uFE0F" }
      ]
    }
  ];
  function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [companies, setCompanies] = useState([]);
    const [allPeriods, setAllPeriods] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(1);
    const [selectedPeriodId, setSelectedPeriodId] = useState(0);
    const [summary, setSummary] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [stakeholders, setStakeholders] = useState([]);
    const [structureData, setStructureData] = useState(null);
    const [matrixData, setMatrixData] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [evidenceList, setEvidenceList] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
    const [newPeriodTitle, setNewPeriodTitle] = useState("FY2026 Assessment");
    const [newPeriodFy, setNewPeriodFy] = useState("FY2026");
    const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
    const [newCompName, setNewCompName] = useState("");
    const [newCompTicker, setNewCompTicker] = useState("");
    const [newCompIndustry, setNewCompIndustry] = useState(
      "Social Media & Digital Platforms"
    );
    const [newCompPriorities, setNewCompPriorities] = useState(
      "User privacy, Content safety, AI governance, Regulatory compliance"
    );
    const [, setAuthTick] = useState(0);
    const loadInitialLists = async () => {
      try {
        const [comps, periods] = await Promise.all([
          api.getCompanies(),
          api.getAssessments()
        ]);
        setCompanies(comps);
        setAllPeriods(periods);
        const metaPeriods = periods.filter((p) => p.company_id === 1);
        if (metaPeriods.length > 0) {
          const comprehensive = metaPeriods.find((p) => p.title.includes("Official SEC Filings") || p.id === 15);
          if (comprehensive) {
            setSelectedPeriodId(comprehensive.id);
          } else {
            setSelectedPeriodId(metaPeriods[metaPeriods.length - 1].id);
          }
        } else if (periods.length > 0) {
          setSelectedPeriodId(periods[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial lists:", err);
      }
    };
    const loadPeriodData = async (periodId) => {
      if (!periodId) return;
      try {
        const [sum, docs, shs, struct, mat, confs, recs, evs] = await Promise.all([
          api.getAssessmentSummary(periodId),
          api.getDocuments(periodId),
          api.getStakeholders(periodId),
          api.getStructureAnalysis(periodId),
          api.getAlignmentMatrix(periodId),
          api.getConflicts(periodId),
          api.getRecommendations(periodId),
          api.getEvidence(periodId)
        ]);
        setSummary(sum);
        setDocuments(docs);
        setStakeholders(shs);
        setStructureData(struct);
        setMatrixData(mat);
        setConflicts(confs);
        setRecommendations(recs);
        setEvidenceList(evs);
      } catch (err) {
        console.error("Failed to load period data:", err);
      }
    };
    useEffect(() => {
      loadInitialLists();
    }, []);
    useEffect(() => {
      loadPeriodData(selectedPeriodId);
    }, [selectedPeriodId]);
    const handleSelectCompany = (compId) => {
      setSelectedCompanyId(compId);
      const compPeriods = allPeriods.filter((p) => p.company_id === compId);
      if (compPeriods.length > 0) {
        setSelectedPeriodId(compPeriods[compPeriods.length - 1].id);
      }
    };
    const handleRunAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        await api.runAnalysis(selectedPeriodId);
        await loadInitialLists();
        await loadPeriodData(selectedPeriodId);
      } finally {
        setIsAnalyzing(false);
      }
    };
    const handleCreatePeriod = async (ev) => {
      ev.preventDefault();
      if (!newPeriodTitle.trim()) return;
      const created = await api.createAssessment({
        company_id: selectedCompanyId,
        title: newPeriodTitle.trim(),
        fiscal_year: newPeriodFy.trim() || "FY2026"
      });
      setShowNewPeriodModal(false);
      await loadInitialLists();
      setSelectedPeriodId(created.id);
    };
    const handleCreateCompany = async (ev) => {
      ev.preventDefault();
      if (!newCompName.trim()) return;
      const comp = await api.createCompany({
        name: newCompName.trim(),
        ticker: newCompTicker.trim() || null,
        industry: newCompIndustry.trim(),
        analysis_priorities: newCompPriorities.split(",").map((s) => s.trim()).filter(Boolean)
      });
      const period = await api.createAssessment({
        company_id: comp.id,
        title: "FY2025 Baseline Assessment",
        fiscal_year: "FY2025"
      });
      setShowNewCompanyModal(false);
      setNewCompName("");
      setNewCompTicker("");
      await loadInitialLists();
      setSelectedCompanyId(comp.id);
      setSelectedPeriodId(period.id);
    };
    const companyPeriods = allPeriods.filter(
      (p) => p.company_id === selectedCompanyId
    );
    const currentCompany = companies.find((c) => c.id === selectedCompanyId);
    const currentPeriod = allPeriods.find((p) => p.id === selectedPeriodId);
    const auth = getAuthContext();
    return /* @__PURE__ */ h("div", { className: "min-h-screen flex bg-[#0a0e1a] text-slate-100 relative overflow-x-hidden" }, /* @__PURE__ */ h("div", { className: "fixed top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none z-0" }), /* @__PURE__ */ h("div", { className: "fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0" }), /* @__PURE__ */ h("aside", { className: "w-64 bg-[#080f1e] text-slate-200 flex flex-col justify-between shrink-0 border-r border-white/10 backdrop-blur-2xl relative z-20 overflow-y-auto shadow-2xl" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "p-5 border-b border-white/10" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-500/30" }, "SA"), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-black text-white tracking-wider uppercase" }, "Alignment Analyzer"), /* @__PURE__ */ h("div", { className: "text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ h("span", null, "Enterprise Intelligence"), /* @__PURE__ */ h("span", { className: "px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40" }, "v2.2"))))), /* @__PURE__ */ h("div", { className: "p-4 border-b border-white/10 space-y-3 text-xs bg-[#0b1528]/80" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5" }, /* @__PURE__ */ h("span", null, "1. Target Company"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewCompanyModal(true),
        className: "text-emerald-400 hover:text-emerald-300 font-bold"
      },
      "+ Add"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedCompanyId),
        onChange: (e) => handleSelectCompany(parseInt(e.target.value, 10)),
        className: "w-full rounded-xl bg-[#060b14] border border-white/15 p-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
      },
      companies.map((c) => /* @__PURE__ */ h("option", { key: c.id, value: String(c.id) }, c.name, " ", c.ticker ? `(${c.ticker})` : ""))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5" }, /* @__PURE__ */ h("span", null, "2. Assessment Period"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewPeriodModal(true),
        className: "text-cyan-400 hover:text-cyan-300 font-bold"
      },
      "+ New"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedPeriodId),
        onChange: (e) => setSelectedPeriodId(parseInt(e.target.value, 10)),
        className: "w-full rounded-xl bg-[#060b14] border border-white/15 p-2 text-white font-semibold focus:outline-none focus:border-cyan-500"
      },
      companyPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, p.title))
    ))), /* @__PURE__ */ h("nav", { className: "p-3 space-y-4" }, NAV_SECTIONS.map((section) => /* @__PURE__ */ h("div", { key: section.title, className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1" }, section.title), section.items.map((item) => {
      const active = activeTab === item.id;
      return /* @__PURE__ */ h(
        "button",
        {
          key: item.id,
          onClick: () => setActiveTab(item.id),
          className: `w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 card-hover ${active ? "bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-transparent border-l-2 border-emerald-400 text-white font-bold shadow-md shadow-emerald-500/10" : "text-slate-300 hover:bg-white/5 hover:text-white"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5 truncate" }, /* @__PURE__ */ h("span", { className: "text-sm shrink-0" }, item.icon), /* @__PURE__ */ h("span", { className: "truncate" }, item.label)),
        /* @__PURE__ */ h(
          "span",
          {
            className: `text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${active ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "bg-[#060b14] text-slate-400"}`
          },
          item.stepNumber
        )
      );
    }))))), /* @__PURE__ */ h("div", { className: "p-4 border-t border-white/10 text-[11px] text-slate-300 space-y-1 bg-[#060b14]/70" }, /* @__PURE__ */ h("div", { className: "font-bold text-white flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }), auth.name), /* @__PURE__ */ h("div", null, "Role:", " ", /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/40" }, auth.role)))), /* @__PURE__ */ h("div", { className: "flex-1 flex flex-col min-w-0 relative z-10" }, /* @__PURE__ */ h("header", { className: "bg-[#080f1e]/85 border-b border-white/10 px-6 py-3.5 backdrop-blur-2xl sticky top-0 z-30 shadow-lg shadow-black/40" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-4" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/50 rounded-full text-emerald-300 font-bold shadow-sm shadow-emerald-500/20" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" }), /* @__PURE__ */ h("span", { className: "font-mono text-[11px]" }, "896 Chunks Verified")), /* @__PURE__ */ h("span", { className: "text-slate-600" }, "|"), /* @__PURE__ */ h("span", { className: "text-white font-extrabold tracking-tight" }, currentCompany ? currentCompany.name : "Company"), /* @__PURE__ */ h("span", { className: "text-slate-600" }, "/"), /* @__PURE__ */ h("span", { className: "text-cyan-300 font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-0.5 rounded-md" }, currentPeriod ? currentPeriod.fiscal_year : "FY2025")), /* @__PURE__ */ h("div", { className: "flex items-center gap-1.5 bg-[#060b14]/90 p-1.5 rounded-xl border border-white/10 shadow-inner" }, companies.map((c) => {
      const isSel = c.id === selectedCompanyId;
      return /* @__PURE__ */ h(
        "button",
        {
          key: c.id,
          onClick: () => handleSelectCompany(c.id),
          className: `px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${isSel ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`
        },
        /* @__PURE__ */ h("span", null, c.ticker || c.name.slice(0, 4)),
        /* @__PURE__ */ h("span", { className: `text-[10px] font-normal ${isSel ? "text-emerald-100" : "text-slate-400"}` }, c.name.split(" ")[0])
      );
    })), /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: handleRunAnalysis,
        disabled: isAnalyzing,
        className: "btn-shimmer px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all card-hover"
      },
      isAnalyzing ? /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ h("span", null, "Executing 6-Stage AI...")) : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", null, "\u26A1"), /* @__PURE__ */ h("span", null, "Run Full AI Diagnostic"))
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setActiveTab("report"),
        className: "px-4 py-2.5 rounded-xl bg-[#0b1528] hover:bg-[#101d36] border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition card-hover"
      },
      /* @__PURE__ */ h("span", null, "\u{1F4C4}"),
      /* @__PURE__ */ h("span", null, "Export Report")
    )))), /* @__PURE__ */ h("main", { className: "p-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto animate-fade-in" }, activeTab === "dashboard" ? /* @__PURE__ */ h(
      DashboardView,
      {
        summary,
        stakeholders,
        onNavigate: setActiveTab,
        onRunAnalysis: handleRunAnalysis,
        isAnalyzing
      }
    ) : null, activeTab === "documents" ? /* @__PURE__ */ h(
      DocumentsView,
      {
        companyId: selectedCompanyId,
        assessmentPeriodId: selectedPeriodId,
        fiscalYear: currentPeriod?.fiscal_year || "FY2025",
        documents,
        onRefresh: () => loadPeriodData(selectedPeriodId),
        onRunAnalysis: handleRunAnalysis
      }
    ) : null, activeTab === "stakeholders" ? /* @__PURE__ */ h(
      StakeholdersView,
      {
        stakeholders,
        onRefresh: async () => {
          await loadInitialLists();
          await loadPeriodData(selectedPeriodId);
        }
      }
    ) : null, activeTab === "structure" ? /* @__PURE__ */ h(StructureView, { structureData }) : null, activeTab === "matrix" ? /* @__PURE__ */ h(
      MatrixView,
      {
        matrixData,
        onRefresh: async () => {
          await loadInitialLists();
          await loadPeriodData(selectedPeriodId);
        }
      }
    ) : null, activeTab === "conflicts" ? /* @__PURE__ */ h(
      ConflictsView,
      {
        conflicts,
        evidenceList
      }
    ) : null, activeTab === "recommendations" ? /* @__PURE__ */ h(
      RecommendationsView,
      {
        recommendations,
        evidenceList,
        onRefresh: () => loadPeriodData(selectedPeriodId)
      }
    ) : null, activeTab === "evidence" ? /* @__PURE__ */ h(
      ReportView,
      {
        assessmentPeriodId: selectedPeriodId,
        evidenceList,
        mode: "evidence"
      }
    ) : null, activeTab === "comparison" ? /* @__PURE__ */ h(
      ComparisonView,
      {
        companies,
        allPeriods,
        currentPeriodId: selectedPeriodId
      }
    ) : null, activeTab === "report" ? /* @__PURE__ */ h(
      ReportView,
      {
        assessmentPeriodId: selectedPeriodId,
        evidenceList,
        mode: "report"
      }
    ) : null, activeTab === "settings" ? /* @__PURE__ */ h(
      SettingsView,
      {
        assessmentPeriodId: selectedPeriodId,
        onAuthChange: () => setAuthTick((t) => t + 1)
      }
    ) : null)), showNewPeriodModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreatePeriod,
        className: "glass-card bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-white border border-slate-700"
      },
      /* @__PURE__ */ h("h3", { className: "text-base font-extrabold text-white" }, "Create New Periodic Assessment"),
      /* @__PURE__ */ h("p", { className: "text-slate-400" }, "Initializes an isolated document collection, 10 stakeholder groups, and 7 organizational structure dimensions."),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Assessment Title"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodTitle,
          onInput: (e) => setNewPeriodTitle(e.target.value),
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      )),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Financial Year"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodFy,
          onInput: (e) => setNewPeriodFy(e.target.value),
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewPeriodModal(false),
          className: "px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-md shadow-violet-600/30"
        },
        "Create Assessment Period"
      ))
    )) : null, showNewCompanyModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreateCompany,
        className: "glass-card bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-white border border-slate-700"
      },
      /* @__PURE__ */ h("h3", { className: "text-base font-extrabold text-white" }, "Add New Company to Diagnostic Platform"),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Company Name"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompName,
          onInput: (e) => setNewCompName(e.target.value),
          placeholder: "e.g., Alphabet Inc.",
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      )),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Ticker Symbol"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompTicker,
          onInput: (e) => setNewCompTicker(e.target.value),
          placeholder: "GOOGL",
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Industry"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompIndustry,
          onInput: (e) => setNewCompIndustry(e.target.value),
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      ))),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-300 mb-1" }, "Company-Specific Analysis Priorities (Comma-separated)"), /* @__PURE__ */ h(
        "textarea",
        {
          rows: 2,
          value: newCompPriorities,
          onInput: (e) => setNewCompPriorities(e.target.value),
          className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewCompanyModal(false),
          className: "px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-md shadow-violet-600/30"
        },
        "Create Company"
      ))
    )) : null);
  }
  var rootEl = document.getElementById("app");
  if (rootEl) {
    mountApp(App, rootEl);
  }
})();
