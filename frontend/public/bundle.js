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
    triggerBackup: () => request("/api/analysis/backup", {
      method: "POST"
    }),
    getReport: (assessmentPeriodId) => request(`/api/reports/${assessmentPeriodId}`)
  };

  // src/lib/react-lite.ts
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
        if (v === true) el.setAttribute(k, "");
      } else {
        el.setAttribute(k, String(v));
      }
    }
    for (const child of node.children) {
      el.appendChild(createDomNode(child, nextIsSvg));
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
    stateCursor = 0;
    effectCursor = 0;
    pendingEffects = [];
    const vnode = rootComponent();
    rootContainer.innerHTML = "";
    rootContainer.appendChild(createDomNode(vnode));
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
        bg: "bg-emerald-50 border-emerald-300",
        text: "text-emerald-800",
        dot: "bg-emerald-500"
      },
      "Partial Alignment": {
        bg: "bg-amber-50 border-amber-300",
        text: "text-amber-800",
        dot: "bg-amber-500"
      },
      "Potential Misalignment": {
        bg: "bg-rose-50 border-rose-300",
        text: "text-rose-800",
        dot: "bg-rose-500"
      },
      "Insufficient Evidence": {
        bg: "bg-slate-100 border-slate-300",
        text: "text-slate-600",
        dot: "bg-slate-400"
      },
      "Not Applicable": {
        bg: "bg-gray-100 border-gray-200",
        text: "text-gray-500",
        dot: "bg-gray-400"
      }
    };
    const style = map[status] || map["Insufficient Evidence"];
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text}`
      },
      /* @__PURE__ */ h("span", { className: `w-1.5 h-1.5 rounded-full ${style.dot}` }),
      status
    );
  }
  function evidenceClassBadge(evType) {
    const styles = {
      FACT: "bg-blue-50 text-blue-800 border-blue-300",
      COMPANY_CLAIM: "bg-purple-50 text-purple-800 border-purple-300",
      THIRD_PARTY_CLAIM: "bg-teal-50 text-teal-800 border-teal-300",
      INFERENCE: "bg-orange-50 text-orange-800 border-orange-300"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-block px-2 py-0.5 rounded text-xs font-bold border ${styles[evType] || "bg-slate-100 text-slate-700 border-slate-300"}`
      },
      evType.replace(/_/g, " ")
    );
  }
  function priorityBadge(priority) {
    const styles = {
      Critical: "bg-rose-600 text-white",
      High: "bg-orange-500 text-white",
      Medium: "bg-amber-500 text-white",
      Low: "bg-slate-500 text-white"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${styles[priority] || styles.Medium}`
      },
      priority
    );
  }
  function RadialScoreGauge(props) {
    const pct = props.value !== null && props.value !== void 0 ? Math.max(0, Math.min(100, props.value)) : 0;
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - pct / 100 * circumference;
    return /* @__PURE__ */ h("div", { className: "flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "relative w-28 h-28 flex items-center justify-center shrink-0" }, /* @__PURE__ */ h("svg", { className: "w-28 h-28 -rotate-90", viewBox: "0 0 120 120" }, /* @__PURE__ */ h(
      "circle",
      {
        cx: "60",
        cy: "60",
        r: radius,
        stroke: "#e2e8f0",
        "stroke-width": "10",
        fill: "none"
      }
    ), /* @__PURE__ */ h(
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
        fill: "none"
      }
    )), /* @__PURE__ */ h("div", { className: "absolute inset-0 flex flex-col items-center justify-center" }, /* @__PURE__ */ h("span", { className: "text-xl font-extrabold text-slate-900" }, props.value !== null && props.value !== void 0 ? `${props.value}%` : "N/A"))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-slate-900" }, props.label), /* @__PURE__ */ h("div", { className: "text-xs text-slate-500 mt-1 leading-relaxed" }, props.sublabel)));
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
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Periodic Historical & Cross-Company Alignment Comparison Engine"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-bold text-slate-700 mb-1" }, "Baseline Assessment Period (A)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(baseId),
        onChange: (e) => setBaseId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-bold text-slate-700 mb-1" }, "Target Assessment Period (B)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(targetId),
        onChange: (e) => setTargetId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => runComparison(baseId, targetId),
        disabled: loading,
        className: "w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
      },
      loading ? "Comparing Assessments..." : "Compare Assessments"
    )))), comparison ? /* @__PURE__ */ h("div", { className: "space-y-6" }, (comparison.date_difference_warnings || []).length > 0 ? /* @__PURE__ */ h("div", { className: "bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-1 text-xs text-amber-900" }, /* @__PURE__ */ h("div", { className: "font-bold uppercase tracking-wider" }, "Assessment Period & Document Date Advisories"), comparison.date_difference_warnings.map((w, i) => /* @__PURE__ */ h("div", { key: i }, "\u2022 ", w))) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-500 uppercase" }, "Baseline (Period A)"), /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-slate-900 mt-1" }, comparison.baseline.company_name, " \u2014 ", comparison.baseline.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-extrabold text-slate-900" }, comparison.baseline.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500 ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-indigo-600" }, comparison.baseline.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500 ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-500 uppercase" }, "Target (Period B)"), /* @__PURE__ */ h("div", { className: "text-sm font-extrabold text-slate-900 mt-1" }, comparison.target.company_name, " \u2014 ", comparison.target.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-extrabold text-slate-900" }, comparison.target.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500 ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-indigo-600" }, comparison.target.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500 ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "bg-slate-900 text-white p-5 rounded-xl shadow-sm" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-indigo-300 uppercase" }, "Net Alignment & Coverage Shift"), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-6" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "div",
      {
        className: `text-2xl font-extrabold ${(comparison.overall_alignment_delta || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`
      },
      comparison.overall_alignment_delta !== null ? `${comparison.overall_alignment_delta >= 0 ? "+" : ""}${comparison.overall_alignment_delta}%` : "N/A"
    ), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400" }, "Alignment Delta")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xl font-bold text-indigo-300" }, comparison.overall_coverage_delta >= 0 ? "+" : "", comparison.overall_coverage_delta, "%"), /* @__PURE__ */ h("div", { className: "text-xs text-slate-400" }, "Coverage Delta"))))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Stakeholder Alignment Score Comparison (Baseline vs. Target)"), /* @__PURE__ */ h("div", { className: "space-y-3" }, (comparison.stakeholder_comparisons || []).map((sc) => /* @__PURE__ */ h("div", { key: sc.slug, className: "space-y-1 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-800" }, sc.stakeholder_name, " (", sc.category, ")"), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-slate-500" }, "Base: ", /* @__PURE__ */ h("strong", null, sc.base_alignment_score ?? "N/A", "%")), /* @__PURE__ */ h("span", { className: "text-slate-800" }, "Target:", " ", /* @__PURE__ */ h("strong", null, sc.target_alignment_score ?? "N/A", "%")), sc.alignment_delta !== null ? /* @__PURE__ */ h(
      "span",
      {
        className: `px-2 py-0.5 rounded font-bold ${sc.alignment_delta > 0 ? "bg-emerald-100 text-emerald-800" : sc.alignment_delta < 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`
      },
      sc.alignment_delta > 0 ? "+" : "",
      sc.alignment_delta,
      "%"
    ) : null)), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ h("div", { className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-slate-400 h-full",
        style: { width: `${sc.base_alignment_score || 0}%` }
      }
    )), /* @__PURE__ */ h("div", { className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-indigo-600 h-full",
        style: { width: `${sc.target_alignment_score || 0}%` }
      }
    ))))))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-slate-900" }, "Alignment Improvements & New Capabilities"), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-900" }, "Improvements in Alignment:"), (comparison.alignment_improvements || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-emerald-700 italic" }, "No positive score shifts recorded.") : comparison.alignment_improvements.map(
      (imp, i) => /* @__PURE__ */ h("div", { key: i, className: "text-emerald-800" }, "\u2713 ", imp)
    )), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-indigo-900" }, "Newly Disclosed Capabilities & Units:"), (comparison.new_capabilities_and_units || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-indigo-700 italic" }, "No new organizational units added between periods.") : comparison.new_capabilities_and_units.map(
      (u, i) => /* @__PURE__ */ h("div", { key: i, className: "text-indigo-800" }, "+ ", u)
    ))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-slate-900" }, "Deteriorations & Structural Dimension Changes"), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-900" }, "Deteriorations in Alignment:"), (comparison.alignment_deteriorations || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-rose-700 italic" }, "No alignment score declines recorded.") : comparison.alignment_deteriorations.map(
      (det, i) => /* @__PURE__ */ h("div", { key: i, className: "text-rose-800" }, "\u2193 ", det)
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-slate-100" }, (comparison.dimension_comparisons || []).map((dc) => /* @__PURE__ */ h(
      "div",
      {
        key: dc.dimension_code,
        className: "py-2 flex items-center justify-between"
      },
      /* @__PURE__ */ h("span", { className: "font-semibold text-slate-800" }, dc.dimension_name),
      /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, classificationBadge(dc.base_classification), /* @__PURE__ */ h("span", null, "\u2192"), classificationBadge(dc.target_classification))
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
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Stakeholder Conflict Network & Governance Mediation Analysis"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500 mt-0.5" }, "Competing stakeholder expectations do not automatically imply poor alignment\u2014this diagnostic evaluates whether the organization has effective cross-functional mechanisms to mediate competing interests.")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6" }, /* @__PURE__ */ h("div", { className: "lg:col-span-7 bg-slate-900 rounded-xl p-5 text-white shadow-sm flex flex-col justify-between" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-indigo-300" }, "Interactive Stakeholder Tension Network Graph"), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-400" }, "Click any tension edge or conflict card to inspect organizational mediation mechanisms")), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded bg-slate-800 text-xs text-slate-300" }, conflicts.length, " Structural Tensions")), /* @__PURE__ */ h("div", { className: "w-full overflow-x-auto" }, /* @__PURE__ */ h("svg", { viewBox: "0 0 720 310", className: "w-full h-72" }, conflicts.map((c) => {
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
            stroke: isSelected ? "#f43f5e" : c.severity === "Critical" ? "#fb7185" : "#818cf8",
            "stroke-width": isSelected ? "4" : "2.5",
            "stroke-dasharray": isSelected ? "none" : "5,4"
          }
        ),
        /* @__PURE__ */ h(
          "rect",
          {
            x: midX - 42,
            y: midY - 11,
            width: "84",
            height: "22",
            rx: "6",
            fill: isSelected ? "#e11d48" : "#1e293b",
            stroke: "#475569"
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
          fill: isInvolved ? "#4f46e5" : "#334155",
          stroke: isInvolved ? "#a5b4fc" : "#64748b",
          "stroke-width": "3"
        }
      ), /* @__PURE__ */ h(
        "text",
        {
          x: pt.x,
          y: pt.y + 38,
          "text-anchor": "middle",
          fill: "#e2e8f0",
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
          className: `cursor-pointer p-4 rounded-xl border transition shadow-sm ${isSel ? "bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20" : "bg-white border-slate-200 hover:border-indigo-300"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-extrabold text-slate-900" }, c.stakeholder_a_name, " ", /* @__PURE__ */ h("span", { className: "text-rose-600" }, "\u26A1 vs."), " ", c.stakeholder_b_name), priorityBadge(c.severity)),
        /* @__PURE__ */ h("p", { className: "text-xs font-semibold text-indigo-950 mt-1.5" }, c.conflicting_expectations),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1.5 mt-2" }, (c.organizational_units_involved || []).map((u, i) => /* @__PURE__ */ h(
          "span",
          {
            key: i,
            className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
          },
          u
        )))
      );
    }))), activeConflict ? /* @__PURE__ */ h("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-rose-600 uppercase" }, "Stakeholder Conflict Diagnostic & Resolution Architecture"), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-slate-900" }, activeConflict.stakeholder_a_name, " vs.", " ", activeConflict.stakeholder_b_name), /* @__PURE__ */ h("p", { className: "text-xs font-semibold text-slate-600 mt-0.5" }, activeConflict.conflicting_expectations)), priorityBadge(activeConflict.severity)), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-900" }, "Current Resolution Mechanisms"), /* @__PURE__ */ h("p", { className: "text-slate-700 leading-relaxed" }, activeConflict.current_resolution_mechanisms)), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-900" }, "Potential Structural Weaknesses"), /* @__PURE__ */ h("p", { className: "text-rose-800 leading-relaxed" }, activeConflict.structural_weaknesses)), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-900" }, "Recommended Coordination / Governance Mechanism"), /* @__PURE__ */ h("p", { className: "text-emerald-800 leading-relaxed font-medium" }, activeConflict.recommended_governance_mechanism))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5" }, "Supporting Documentary Citations for This Conflict"), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, (activeConflict.evidence_ids || []).map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-500" }, ev.document_name, " (p.", ev.page_number, ")")),
      /* @__PURE__ */ h("blockquote", { className: "italic text-slate-800 border-l-2 border-rose-500 pl-2.5" }, '"', ev.exact_quotation, '"')
    ))))) : null);
  }

  // src/components/DashboardView.tsx
  function DashboardView(props) {
    const { summary, stakeholders, onNavigate, onRunAnalysis, isAnalyzing } = props;
    if (!summary) {
      return /* @__PURE__ */ h("div", { className: "p-8 text-center text-slate-500" }, "Loading organizational diagnostic overview...");
    }
    const { assessment, metrics, dimensions_summary } = summary;
    const totalReq = metrics.strong_alignments + metrics.partial_alignments + metrics.potential_misalignments + metrics.insufficient_evidence_count;
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md" }, /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Organizational Alignment Diagnostic"), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, assessment.fiscal_year), assessment.company_ticker ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 bg-indigo-900/80 border border-indigo-600 rounded text-white" }, assessment.company_ticker) : null), /* @__PURE__ */ h("h1", { className: "text-2xl font-extrabold mt-1" }, assessment.company_name, " \u2014 ", assessment.title), /* @__PURE__ */ h("p", { className: "text-slate-300 text-xs mt-1" }, "Last Assessed:", " ", assessment.last_analyzed_at ? new Date(assessment.last_analyzed_at).toLocaleString() : "Not yet analyzed", " ", "| Status:", " ", /* @__PURE__ */ h("span", { className: "uppercase font-semibold text-emerald-300" }, assessment.status))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("documents"),
        className: "px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold transition"
      },
      "+ Upload Company Documents"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        disabled: isAnalyzing,
        className: "px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-xs font-bold shadow transition"
      },
      isAnalyzing ? "Running 6-Stage AI Analysis..." : "Run Full Diagnostic Analysis"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("report"),
        className: "px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition"
      },
      "Export Report (PDF / DOCX)"
    )))), assessment.evidence_coverage_pct < 85 ? /* @__PURE__ */ h("div", { className: "bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3" }, /* @__PURE__ */ h("div", { className: "w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0" }), /* @__PURE__ */ h("div", { className: "text-xs text-amber-900 leading-relaxed" }, /* @__PURE__ */ h("strong", null, "Evidence Coverage Notice (", assessment.evidence_coverage_pct, "%):"), " ", metrics.insufficient_evidence_count, " stakeholder requirement(s) currently lack sufficient documentary evidence and are excluded from the alignment score denominator rather than assigned zero. Upload additional governance charters, 10-K filings, or independent audits to increase evidence coverage.")) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" }, /* @__PURE__ */ h(
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
        colorHex: "#4f46e5"
      }
    ), /* @__PURE__ */ h("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-semibold text-slate-500 uppercase" }, "Knowledge Base & Evidence"), /* @__PURE__ */ h("div", { className: "mt-2 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-extrabold text-slate-900" }, metrics.documents_processed), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500" }, "documents indexed (", metrics.evidence_records_count, " citations)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-slate-600" }, "Stakeholders Assessed:", " ", /* @__PURE__ */ h("strong", null, metrics.stakeholders_assessed, " / ", metrics.total_stakeholders)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("evidence"),
        className: "text-indigo-600 font-semibold hover:underline"
      },
      "Inspect Evidence \u2192"
    ))), /* @__PURE__ */ h("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-semibold text-slate-500 uppercase" }, "Alignment Gaps & Diagnostics"), /* @__PURE__ */ h("div", { className: "mt-2 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-extrabold text-rose-600" }, metrics.alignment_gaps_identified), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500" }, "gaps (", metrics.potential_misalignments, " misaligned,", " ", metrics.partial_alignments, " partial)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-slate-600" }, "Actionable Recommendations:", " ", /* @__PURE__ */ h("strong", null, metrics.recommendations_count)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("recommendations"),
        className: "text-indigo-600 font-semibold hover:underline"
      },
      "View Actions \u2192"
    )))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Requirement Alignment Distribution (", totalReq, " Total Requirements Evaluated)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("matrix"),
        className: "px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
      },
      "Open Interactive Alignment Matrix \u2192"
    )), /* @__PURE__ */ h("div", { className: "w-full h-5 rounded-full overflow-hidden flex bg-slate-100" }, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.strong_alignments / totalReq * 100}%`
        },
        className: "bg-emerald-500 h-full",
        title: `Strong Alignment: ${metrics.strong_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.partial_alignments / totalReq * 100}%`
        },
        className: "bg-amber-500 h-full",
        title: `Partial Alignment: ${metrics.partial_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.potential_misalignments / totalReq * 100}%`
        },
        className: "bg-rose-500 h-full",
        title: `Potential Misalignment: ${metrics.potential_misalignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.insufficient_evidence_count / totalReq * 100}%`
        },
        className: "bg-slate-300 h-full",
        title: `Insufficient Evidence: ${metrics.insufficient_evidence_count}`
      }
    ) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-emerald-900" }, "Strong Alignment (4)"), /* @__PURE__ */ h("span", { className: "font-extrabold text-emerald-700 text-sm" }, metrics.strong_alignments)), /* @__PURE__ */ h("div", { className: "p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-amber-900" }, "Partial Alignment (3)"), /* @__PURE__ */ h("span", { className: "font-extrabold text-amber-700 text-sm" }, metrics.partial_alignments)), /* @__PURE__ */ h("div", { className: "p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-rose-900" }, "Potential Misalignment (1)"), /* @__PURE__ */ h("span", { className: "font-extrabold text-rose-700 text-sm" }, metrics.potential_misalignments)), /* @__PURE__ */ h("div", { className: "p-2.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-700" }, "Insufficient Evidence (N/A)"), /* @__PURE__ */ h("span", { className: "font-extrabold text-slate-700 text-sm" }, metrics.insufficient_evidence_count)))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Stakeholder Alignment Score vs. Evidence Coverage"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Weighted by evaluator importance weights")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("stakeholders"),
        className: "text-xs text-indigo-600 font-semibold hover:underline"
      },
      "Adjust Weights \u2192"
    )), /* @__PURE__ */ h("div", { className: "space-y-3" }, stakeholders.map((sh) => {
      const score = sh.alignment_score;
      const barColor = score === null ? "bg-slate-300" : score >= 75 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : "bg-rose-500";
      return /* @__PURE__ */ h("div", { key: sh.id, className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-800" }, sh.name), /* @__PURE__ */ h("span", { className: "px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]" }, sh.category, " \u2022 W:", sh.importance_weight, "x")), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-slate-500" }, "Cov: ", /* @__PURE__ */ h("strong", null, sh.evidence_coverage_pct, "%")), /* @__PURE__ */ h("span", { className: "font-bold text-slate-900 w-14 text-right" }, score !== null ? `${score}%` : "Insuff."))), /* @__PURE__ */ h("div", { className: "w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex" }, /* @__PURE__ */ h(
        "div",
        {
          className: `${barColor} h-full transition-all`,
          style: { width: `${score !== null ? score : 0}%` }
        }
      )));
    }))), /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "7 Organizational Structure Dimensions"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Structural suitability based on extracted evidence")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("structure"),
        className: "text-xs text-indigo-600 font-semibold hover:underline"
      },
      "Inspect Structure \u2192"
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-slate-100" }, dimensions_summary.map((d) => /* @__PURE__ */ h(
      "div",
      {
        key: d.id,
        className: "py-2.5 flex items-center justify-between text-xs"
      },
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-800" }, d.dimension_name), /* @__PURE__ */ h("span", { className: "text-slate-400 ml-2" }, "(", d.evidence_count, " evidence records)")),
      classificationBadge(d.suitability_classification)
    )))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Configured Company-Specific Diagnostic Priorities (", assessment.company_name, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500 mt-0.5 mb-3" }, "Priority focus areas guiding RAG retrieval and expectation discovery without predetermining conclusions"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2" }, (assessment.company_priorities || []).map((prio, idx) => /* @__PURE__ */ h(
      "span",
      {
        key: idx,
        className: "px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold"
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
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Document Ingestion & Metadata-Aware Indexing Pipeline"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Supported formats: ", /* @__PURE__ */ h("strong", null, "PDF, DOCX, TXT, CSV, XLSX, PPTX"), " ", "(with OCR fallback, heading-preserving chunker, and prompt-injection sanitization)")), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        className: "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
      },
      "Re-Run Diagnostic Analysis on Knowledge Base"
    )), /* @__PURE__ */ h("form", { onSubmit: handleFileUpload, className: "space-y-4" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Select File(s) (Multiple Allowed)"), /* @__PURE__ */ h(
      "input",
      {
        type: "file",
        multiple: true,
        accept: ".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md",
        className: "w-full text-xs text-slate-700 border border-slate-300 rounded-lg p-2 bg-slate-50"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Document Category"), /* @__PURE__ */ h(
      "select",
      {
        value: category,
        onChange: (e) => setCategory(e.target.value),
        className: "w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
      },
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Custom Title (Optional for single file)"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: customTitle,
        onInput: (e) => setCustomTitle(e.target.value),
        placeholder: "e.g., FY2025 Form 10-K Governance Excerpt",
        className: "w-full text-xs border border-slate-300 rounded-lg p-2.5"
      }
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Financial Year"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: docFy,
        onInput: (e) => setDocFy(e.target.value),
        className: "w-full text-xs border border-slate-300 rounded-lg p-2"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Publication Date"), /* @__PURE__ */ h(
      "input",
      {
        type: "date",
        value: pubDate,
        onInput: (e) => setPubDate(e.target.value),
        className: "w-full text-xs border border-slate-300 rounded-lg p-2"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-slate-700 mb-1" }, "Source URL (Optional)"), /* @__PURE__ */ h(
      "input",
      {
        type: "url",
        value: sourceUrl,
        onInput: (e) => setSourceUrl(e.target.value),
        placeholder: "https://investor...",
        className: "w-full text-xs border border-slate-300 rounded-lg p-2"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: uploading,
        className: "w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
      },
      uploading ? "Processing Pipeline..." : "Upload & Index Documents"
    )))), uploadStatus ? /* @__PURE__ */ h("div", { className: "mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium" }, uploadStatus) : null), /* @__PURE__ */ h("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Indexed Assessment Documents (", documents.length, ")"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500" }, "Historical documents are preserved and never overwritten")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-50 text-slate-600 border-b border-slate-200" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "ID & Title"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Category"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "FY / Pub Date"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Format"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Chunks"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Status & Security"), /* @__PURE__ */ h("th", { className: "p-3 font-bold text-right" }, "Actions"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-100" }, documents.map((doc) => /* @__PURE__ */ h("tr", { key: doc.id, className: "hover:bg-slate-50" }, /* @__PURE__ */ h("td", { className: "p-3 font-semibold text-slate-900" }, /* @__PURE__ */ h("div", null, "#", doc.id, " \u2014 ", doc.title), doc.source_url ? /* @__PURE__ */ h(
      "a",
      {
        href: doc.source_url,
        target: "_blank",
        rel: "noreferrer",
        className: "text-[11px] text-indigo-600 hover:underline font-normal"
      },
      doc.source_url
    ) : null), /* @__PURE__ */ h("td", { className: "p-3 text-slate-700" }, doc.category), /* @__PURE__ */ h("td", { className: "p-3 text-slate-600" }, doc.financial_year, " \u2022 ", doc.publication_date || "N/A"), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700" }, doc.file_type)), /* @__PURE__ */ h("td", { className: "p-3 font-bold text-indigo-700" }, doc.chunk_count, " chunks"), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h(
      "span",
      {
        className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${doc.processing_status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`
      },
      doc.processing_status
    ), doc.prompt_injection_flag ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold" }, "Prompt Injection Neutralized") : /* @__PURE__ */ h("span", { className: "text-[10px] text-emerald-700" }, "\u2713 Clean Source"))), /* @__PURE__ */ h("td", { className: "p-3 text-right space-x-2" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => inspectDoc(doc.id),
        className: "px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
      },
      "Inspect Chunks"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => handleArchiveDoc(doc.id),
        className: "px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
      },
      "Archive"
    )))))))), selectedDocDetails ? /* @__PURE__ */ h("div", { className: "bg-slate-900 text-white p-5 rounded-xl shadow-lg space-y-3" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-indigo-300" }, "Metadata-Aware Chunk Inspector: ", selectedDocDetails.title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-400" }, "Preserving Page Numbers, Section Headings, Financial Year (", selectedDocDetails.financial_year, "), and Vector Embeddings")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setSelectedDocDetails(null),
        className: "px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
      },
      "Close Inspector \u2715"
    )), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1" }, (selectedDocDetails.chunks || []).map((ch) => /* @__PURE__ */ h(
      "div",
      {
        key: ch.id,
        className: "p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-indigo-300 font-bold" }, /* @__PURE__ */ h("span", null, "Chunk #", ch.chunk_index + 1, " \u2022 Page ", ch.page_number), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-400" }, ch.token_count, " tokens")),
      /* @__PURE__ */ h("div", { className: "font-semibold text-amber-300" }, "Section: ", ch.section_heading),
      /* @__PURE__ */ h("p", { className: "text-slate-200 leading-relaxed whitespace-pre-wrap" }, ch.content)
    )))) : null, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Knowledge Base Vector RAG Retrieval & Metadata Filter"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Query the vector index directly with metadata filtering by category and assessment period")), /* @__PURE__ */ h("form", { onSubmit: handleSearchRag, className: "flex flex-col sm:flex-row gap-3" }, /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: ragQuery,
        onInput: (e) => setRagQuery(e.target.value),
        placeholder: "Search organizational mechanisms (e.g., 'dual-class voting', 'teen safety', 'privacy committee')...",
        className: "flex-1 text-xs border border-slate-300 rounded-lg p-2.5"
      }
    ), /* @__PURE__ */ h(
      "select",
      {
        value: ragCategoryFilter,
        onChange: (e) => setRagCategoryFilter(e.target.value),
        className: "text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
      },
      /* @__PURE__ */ h("option", { value: "" }, "All Document Categories"),
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    ), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: searchingRag,
        className: "px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
      },
      searchingRag ? "Searching..." : "Retrieve Vector Chunks"
    )), ragResults.length > 0 ? /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-2" }, ragResults.map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.chunk_id,
        className: "p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-slate-800" }, /* @__PURE__ */ h("span", null, "Page ", r.page_number, " \u2014 ", r.section_heading), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-indigo-100 text-indigo-800" }, "Similarity: ", (r.similarity_score * 100).toFixed(1), "%")),
      /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-500" }, "Category: ", r.document_category, " | FY: ", r.financial_year),
      /* @__PURE__ */ h("p", { className: "text-slate-700 leading-relaxed mt-1" }, r.content)
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
      return /* @__PURE__ */ h("div", { className: "p-8 text-center text-slate-500" }, "Loading Stakeholder \xD7 Structure Alignment Matrix...");
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
          `Override saved & logged! Overall Alignment recalculated to ${res.recalculated_scores.overall_alignment_score}% (Coverage: ${res.recalculated_scores.evidence_coverage_pct}%).`
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
        return "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200";
      if (status === "Partial Alignment")
        return "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200";
      if (status === "Potential Misalignment")
        return "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200";
      return "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200";
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Interactive Stakeholder \xD7 Organizational Structure Alignment Matrix"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Click any cell to inspect the AI's reasoning, requirement mapping, exact page citations, score calculation, and manual override controls.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2 text-[11px]" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300" }, "Strong Alignment (4)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300" }, "Partial Alignment (3)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded bg-rose-100 text-rose-900 font-bold border border-rose-300" }, "Potential Misalignment (1)"), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-bold border border-slate-300" }, "Insufficient Evidence (N/A)"))), /* @__PURE__ */ h("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-900 text-white" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold min-w-[210px]" }, "Stakeholder Group (Score / Cov)"), dimensions.map((d) => /* @__PURE__ */ h(
      "th",
      {
        key: d.code,
        className: "p-3 font-bold text-center min-w-[130px] capitalize border-l border-slate-700"
      },
      /* @__PURE__ */ h("div", null, d.code),
      /* @__PURE__ */ h("div", { className: "text-[10px] font-normal text-slate-300" }, d.suitability_classification.replace(" Alignment", ""))
    )))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-200" }, stakeholders.map((sh) => {
      const shAssessments = assessments.filter(
        (a) => a.stakeholder_id === sh.id
      );
      return /* @__PURE__ */ h("tr", { key: sh.id, className: "hover:bg-slate-50/70" }, /* @__PURE__ */ h("td", { className: "p-3 bg-slate-50 font-bold text-slate-900 border-r border-slate-200" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("span", null, sh.name), /* @__PURE__ */ h("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700" }, sh.category)), /* @__PURE__ */ h("div", { className: "text-[11px] font-normal text-slate-500 mt-1" }, "Align:", " ", /* @__PURE__ */ h("strong", null, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), " ", "\u2022 Cov: ", /* @__PURE__ */ h("strong", null, sh.evidence_coverage_pct, "%"))), dimensions.map((dim) => {
        const matchingCells = shAssessments.filter(
          (a) => a.organizational_dimension === dim.code
        );
        return /* @__PURE__ */ h(
          "td",
          {
            key: dim.code,
            className: "p-2 border-l border-slate-100 align-top"
          },
          matchingCells.length === 0 ? /* @__PURE__ */ h("div", { className: "h-14 flex items-center justify-center text-[11px] text-slate-300 italic" }, "\u2014") : /* @__PURE__ */ h("div", { className: "space-y-1.5" }, matchingCells.map((cell) => {
            const isAct = activeCell && activeCell.id === cell.id;
            return /* @__PURE__ */ h(
              "button",
              {
                key: cell.id,
                onClick: () => handleSelectCell(cell),
                className: `w-full text-left p-2 rounded-lg border transition ${getCellStyle(
                  cell.classification
                )} ${isAct ? "ring-2 ring-indigo-600 shadow-sm" : ""}`
              },
              /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-[11px]" }, /* @__PURE__ */ h("span", null, cell.classification.replace(
                " Alignment",
                ""
              )), /* @__PURE__ */ h("span", null, cell.numeric_score !== null ? `${cell.numeric_score}/4` : "N/A")),
              /* @__PURE__ */ h("div", { className: "text-[10px] truncate mt-0.5 opacity-90" }, cell.expectation_title),
              cell.is_overridden ? /* @__PURE__ */ h("div", { className: "text-[9px] font-extrabold uppercase text-indigo-800 mt-0.5" }, "\u2605 Evaluator Overridden") : null
            );
          }))
        );
      }));
    })))), activeCell ? /* @__PURE__ */ h("div", { className: "bg-white rounded-2xl border-2 border-indigo-600 shadow-lg overflow-hidden" }, /* @__PURE__ */ h("div", { className: "bg-indigo-950 text-white p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2 text-xs text-indigo-300 font-bold uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Explainable Finding Inspector"), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Stakeholder: ", activeCell.stakeholder_name), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Dimension: ", activeCell.organizational_dimension.toUpperCase())), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold mt-1" }, activeCell.expectation_title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 mt-0.5" }, activeCell.expectation_description)), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 shrink-0" }, classificationBadge(activeCell.classification), /* @__PURE__ */ h("div", { className: "bg-indigo-900 px-3 py-1.5 rounded-lg border border-indigo-700 text-xs" }, "Score:", " ", /* @__PURE__ */ h("strong", null, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "N/A (Excluded from denominator)"), " ", "\xD7 Weight ", /* @__PURE__ */ h("strong", null, activeCell.requirement_weight, "x")))), /* @__PURE__ */ h("div", { className: "p-6 grid grid-cols-1 lg:grid-cols-3 gap-6" }, /* @__PURE__ */ h("div", { className: "lg:col-span-2 space-y-5" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-900 uppercase tracking-wider" }, "1. Why the Diagnostic Engine Reached This Conclusion"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-800 leading-relaxed" }, activeCell.rationale), /* @__PURE__ */ h("div", { className: "pt-2 flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "text-[11px] font-bold text-slate-600" }, "Mapped Organizational Mechanisms:"), (activeCell.mapped_mechanisms || []).length === 0 ? /* @__PURE__ */ h("span", { className: "text-xs text-slate-400 italic" }, "None identified in disclosures") : (activeCell.mapped_mechanisms || []).map((m, idx) => /* @__PURE__ */ h(
      "span",
      {
        key: idx,
        className: "px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold"
      },
      m
    )))), (activeCell.root_cause_diagnosis || []).length > 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-rose-900 uppercase tracking-wider" }, "2. Structural Root-Cause Diagnosis (Stage 5)"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-xs text-rose-900 list-disc list-inside" }, activeCell.root_cause_diagnosis.map((rc, i) => /* @__PURE__ */ h("li", { key: i }, rc)))) : null, /* @__PURE__ */ h("div", { className: "space-y-3" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-slate-900 uppercase tracking-wider" }, "3. Traceable Documentary Evidence & Verbatim Quotations (", (activeCell.evidence_records || []).length, ")"), /* @__PURE__ */ h("span", { className: "text-xs text-slate-600" }, "Separate Evidence Quality Score:", " ", /* @__PURE__ */ h("strong", null, Math.round((activeCell.evidence_quality_score || 0) * 100), "%"))), (activeCell.evidence_records || []).length === 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900" }, "Insufficient Evidence: No documentary excerpts in this assessment period address this requirement. Missing public evidence does not assign a zero score; it reduces Evidence Coverage.") : /* @__PURE__ */ h("div", { className: "space-y-3" }, activeCell.evidence_records.map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-900" }, "Evidence #", ev.id), evidenceClassBadge(ev.evidence_classification), ev.is_contradictory ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold" }, "\u26A0 Contradictory / Competing Evidence Detected") : null), /* @__PURE__ */ h("span", { className: "text-slate-500" }, "Confidence: ", /* @__PURE__ */ h("strong", null, ev.confidence_level), " | Quality: ", /* @__PURE__ */ h("strong", null, Math.round(ev.quality_score * 100), "%"))),
      /* @__PURE__ */ h("blockquote", { className: "p-3 rounded-lg bg-slate-50 border-l-4 border-indigo-600 italic text-slate-800" }, '"', ev.exact_quotation, '"'),
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1" }, /* @__PURE__ */ h("span", null, "Document: ", /* @__PURE__ */ h("strong", null, ev.document_name), " \u2022 Page", " ", /* @__PURE__ */ h("strong", null, ev.page_number), " \u2022 Section:", " ", /* @__PURE__ */ h("strong", null, ev.section_heading)), /* @__PURE__ */ h("span", null, "FY: ", ev.financial_year, " | Pub:", " ", ev.publication_date || "N/A"))
    )))), (activeCell.recommendations || []).length > 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-indigo-950 uppercase tracking-wider" }, "4. Recommended Structural & Governance Improvements"), activeCell.recommendations.map((rec) => /* @__PURE__ */ h("div", { key: rec.id, className: "text-xs space-y-1" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, priorityBadge(rec.priority), /* @__PURE__ */ h("span", { className: "font-bold text-slate-900" }, rec.title)), /* @__PURE__ */ h("p", { className: "text-slate-700" }, rec.suggested_organizational_change), /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-500" }, /* @__PURE__ */ h("strong", null, "Trade-offs:"), " ", rec.possible_tradeoffs)))) : null), /* @__PURE__ */ h("div", { className: "space-y-5" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-indigo-300 uppercase tracking-wider" }, "Score Calculation Transparency"), /* @__PURE__ */ h("div", { className: "space-y-1 text-slate-300" }, /* @__PURE__ */ h("div", null, "Classification: ", /* @__PURE__ */ h("strong", null, activeCell.classification)), /* @__PURE__ */ h("div", null, "Raw Numerical Score:", " ", /* @__PURE__ */ h("strong", null, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "N/A")), /* @__PURE__ */ h("div", null, "Requirement Weight:", " ", /* @__PURE__ */ h("strong", null, activeCell.requirement_weight, "x")), /* @__PURE__ */ h("div", null, "Weighted Contribution:", " ", /* @__PURE__ */ h("strong", null, activeCell.numeric_score !== null ? (activeCell.numeric_score * activeCell.requirement_weight).toFixed(2) : "Excluded from denominator")), /* @__PURE__ */ h("div", { className: "pt-2 border-t border-slate-700 text-[11px] text-slate-400" }, "Formula: Stakeholder Alignment % = ((\u03A3 Score \xD7 ReqWeight) / (\u03A3 AssessedWeight) / 4) \xD7 100"))), /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleOverrideSubmit,
        className: "p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "font-bold text-slate-900 uppercase tracking-wider" }, "Evaluator Manual Override & Audit Log"),
      /* @__PURE__ */ h("p", { className: "text-[11px] text-slate-600" }, "Override the AI-generated classification with a mandatory audit justification. Automatically recalculates stakeholder and overall alignment scores."),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-700 mb-1" }, "Override Classification"), /* @__PURE__ */ h(
        "select",
        {
          value: overrideClass,
          onChange: (e) => setOverrideClass(e.target.value),
          className: "w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
        },
        /* @__PURE__ */ h("option", { value: "Strong Alignment" }, "Strong Alignment (4)"),
        /* @__PURE__ */ h("option", { value: "Partial Alignment" }, "Partial Alignment (3)"),
        /* @__PURE__ */ h("option", { value: "Potential Misalignment" }, "Potential Misalignment (1)"),
        /* @__PURE__ */ h("option", { value: "Insufficient Evidence" }, "Insufficient Evidence (N/A)"),
        /* @__PURE__ */ h("option", { value: "Not Applicable" }, "Not Applicable (N/A)")
      )),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-700 mb-1" }, "Mandatory Evaluator Justification"), /* @__PURE__ */ h(
        "textarea",
        {
          rows: 3,
          value: overrideJustification,
          onInput: (e) => setOverrideJustification(e.target.value),
          placeholder: "Provide documentary or governance rationale for overriding this classification...",
          className: "w-full border border-slate-300 rounded-lg p-2 bg-white"
        }
      )),
      /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          disabled: savingOverride,
          className: "w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm transition"
        },
        savingOverride ? "Saving Override & Recalculating..." : "Apply Manual Override & Recalculate"
      ),
      overrideMsg ? /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-indigo-100 text-indigo-900 font-medium text-[11px]" }, overrideMsg) : null
    )))) : null);
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
      Proposed: "bg-slate-100 text-slate-800 border-slate-300",
      Accepted: "bg-indigo-100 text-indigo-800 border-indigo-300",
      Implemented: "bg-emerald-100 text-emerald-800 border-emerald-300",
      Rejected: "bg-rose-100 text-rose-800 border-rose-300"
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Actionable Structural & Governance Recommendations (", recommendations.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Specific organizational design changes, reporting line reforms, and governance controls with implementation trade-offs.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2 text-xs" }, /* @__PURE__ */ h("span", { className: "font-semibold text-slate-600" }, "Priority:"), ["ALL", "Critical", "High", "Medium", "Low"].map((p) => /* @__PURE__ */ h(
      "button",
      {
        key: p,
        onClick: () => setPriorityFilter(p),
        className: `px-2.5 py-1 rounded-lg font-bold transition ${priorityFilter === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
      },
      p
    )), /* @__PURE__ */ h("span", { className: "font-semibold text-slate-600 ml-2" }, "Status:"), /* @__PURE__ */ h(
      "select",
      {
        value: statusFilter,
        onChange: (e) => setStatusFilter(e.target.value),
        className: "border border-slate-300 rounded-lg p-1.5 bg-white font-semibold"
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
        className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3" }, /* @__PURE__ */ h("div", { className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, priorityBadge(rec.priority), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-xs font-bold uppercase" }, "Dimension: ", rec.organizational_dimension), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs" }, "Difficulty: ", /* @__PURE__ */ h("strong", null, rec.implementation_difficulty))), /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 pt-1" }, rec.title)), /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-xs font-semibold text-slate-500" }, "Workflow Status:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: updatingId === rec.id,
          value: rec.status,
          onChange: (e) => handleStatusChange(rec.id, e.target.value),
          className: `text-xs font-bold px-3 py-1.5 rounded-lg border ${statusStyles[rec.status] || statusStyles.Proposed}`
        },
        /* @__PURE__ */ h("option", { value: "Proposed" }, "Proposed"),
        /* @__PURE__ */ h("option", { value: "Accepted" }, "Accepted"),
        /* @__PURE__ */ h("option", { value: "Implemented" }, "Implemented"),
        /* @__PURE__ */ h("option", { value: "Rejected" }, "Rejected")
      ))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-50/50 border border-rose-200 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-900" }, "Identified Structural Issue"), /* @__PURE__ */ h("p", { className: "text-rose-900 leading-relaxed" }, rec.identified_issue)), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-indigo-950" }, "Required Organizational / Governance Change"), /* @__PURE__ */ h("p", { className: "text-indigo-950 leading-relaxed font-medium" }, rec.suggested_organizational_change))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-emerald-50/60 border border-emerald-200" }, /* @__PURE__ */ h("span", { className: "font-bold text-emerald-900" }, "Expected Benefit:", " "), /* @__PURE__ */ h("span", { className: "text-emerald-800" }, rec.expected_benefit)), /* @__PURE__ */ h("div", { className: "p-3 rounded-lg bg-amber-50/60 border border-amber-200" }, /* @__PURE__ */ h("span", { className: "font-bold text-amber-900" }, "Implementation Trade-offs:", " "), /* @__PURE__ */ h("span", { className: "text-amber-800" }, rec.possible_tradeoffs))),
      (rec.evidence_ids || []).length > 0 ? /* @__PURE__ */ h("div", { className: "pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-600" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-700" }, "Traceable Evidence Citations:"), rec.evidence_ids.map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
        "span",
        {
          key: ev.id,
          className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200"
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
      return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Traceable Evidence Repository & Quality Scoring (", evidenceList.length, " Records)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
          className: "px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
        },
        "\u2B07 Export Evidence CSV"
      ), /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
          className: "px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
        },
        "\u2B07 Export Evidence Excel (.xlsx)"
      ))), /* @__PURE__ */ h("div", { className: "bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-slate-700" }, "Filter by Classification:"), [
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
          className: `px-3 py-1 rounded-lg font-bold transition ${evFilter === cl ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
        },
        cl.replace(/_/g, " ")
      ))), /* @__PURE__ */ h("label", { className: "flex items-center gap-2 cursor-pointer font-semibold text-rose-700" }, /* @__PURE__ */ h(
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
          className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
        },
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-extrabold text-slate-900" }, "Evidence #", ev.id), evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]" }, "Dimension: ", ev.organizational_dimension), ev.is_contradictory ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]" }, "\u26A0 Contradictory Evidence") : null), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 text-slate-600" }, /* @__PURE__ */ h("span", null, "Confidence: ", /* @__PURE__ */ h("strong", null, ev.confidence_level)), /* @__PURE__ */ h("span", null, "Evidence Quality:", " ", /* @__PURE__ */ h("strong", { className: "text-indigo-700" }, Math.round(ev.quality_score * 100), "%")))),
        /* @__PURE__ */ h("div", { className: "font-semibold text-slate-900" }, ev.extracted_statement),
        /* @__PURE__ */ h("blockquote", { className: "p-3 rounded-lg bg-slate-50 border-l-4 border-indigo-500 italic text-slate-800" }, '"', ev.exact_quotation, '"'),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1" }, /* @__PURE__ */ h("span", null, "Document: ", /* @__PURE__ */ h("strong", null, ev.document_name), " \u2022 Page", " ", /* @__PURE__ */ h("strong", null, ev.page_number), " \u2022 Section:", " ", /* @__PURE__ */ h("strong", null, ev.section_heading)), /* @__PURE__ */ h("span", null, "FY: ", ev.financial_year, " | Pub: ", ev.publication_date || "N/A"))
      ))));
    }
    if (!report) {
      return /* @__PURE__ */ h("div", { className: "p-8 text-center text-slate-500" }, "Generating 14-section diagnostic report...");
    }
    const sec = report.sections;
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-indigo-300 uppercase tracking-wider" }, "Comprehensive 14-Section Diagnostic Report"), /* @__PURE__ */ h("h2", { className: "text-xl font-extrabold mt-1" }, report.company_name, " \u2014 ", report.assessment_title), /* @__PURE__ */ h("p", { className: "text-xs text-slate-300 mt-1" }, "Overall Alignment: ", /* @__PURE__ */ h("strong", null, report.overall_alignment_score, "%"), " ", "| Evidence Coverage: ", /* @__PURE__ */ h("strong", null, report.evidence_coverage_pct, "%"))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2.5" }, /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/pdf`,
        className: "px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
      },
      "\u2B07 Export Report PDF (.pdf)"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/docx`,
        className: "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
      },
      "\u2B07 Export Report Word (.docx)"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
        className: "px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
      },
      "\u2B07 Evidence CSV"
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
        className: "px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
      },
      "\u2B07 Evidence XLSX"
    ))), /* @__PURE__ */ h("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["1_executive_summary"].title), /* @__PURE__ */ h("p", { className: "mt-2 text-slate-700 leading-relaxed" }, sec["1_executive_summary"].summary_narrative)), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["2_company_overview"].title, " &", " ", sec["3_assessment_methodology"].title), /* @__PURE__ */ h("p", { className: "mt-2 text-slate-700" }, /* @__PURE__ */ h("strong", null, sec["2_company_overview"].company_name), " (", sec["2_company_overview"].industry, "):", " ", sec["2_company_overview"].description), /* @__PURE__ */ h("div", { className: "mt-2 flex flex-wrap gap-1.5" }, (sec["2_company_overview"].analysis_priorities || []).map(
      (p, i) => /* @__PURE__ */ h(
        "span",
        {
          key: i,
          className: "px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold"
        },
        p
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["4_stakeholder_landscape"].title, " &", " ", sec["5_stakeholder_expectations"].title), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" }, (sec["4_stakeholder_landscape"].internal_stakeholders.concat(
      sec["4_stakeholder_landscape"].external_stakeholders
    ) || []).map((s, idx) => /* @__PURE__ */ h(
      "div",
      {
        key: idx,
        className: "p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
      },
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-bold text-slate-900" }, s.name), /* @__PURE__ */ h("span", { className: "text-slate-500 ml-2" }, "(Weight: ", s.importance_weight, "x, Influence:", " ", s.influence_level, ")")),
      /* @__PURE__ */ h("div", { className: "font-bold text-indigo-700" }, s.alignment_score !== null ? `${s.alignment_score}%` : "N/A", " ", "(Cov: ", s.evidence_coverage_pct, "%)")
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["6_organizational_structure_analysis"].title), /* @__PURE__ */ h("div", { className: "space-y-2 mt-3" }, (sec["6_organizational_structure_analysis"].dimensions || []).map(
      (d) => /* @__PURE__ */ h(
        "div",
        {
          key: d.dimension_code,
          className: "p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-bold text-slate-900" }, d.dimension_name), /* @__PURE__ */ h("p", { className: "text-slate-600 mt-0.5" }, d.assessment_summary)),
        classificationBadge(d.suitability_classification)
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["10_key_organizational_gaps"].title, " &", " ", sec["11_recommendations"].title), /* @__PURE__ */ h("div", { className: "space-y-2.5 mt-3" }, (sec["11_recommendations"].recommendations || []).map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.id,
        className: "p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, priorityBadge(r.priority), /* @__PURE__ */ h("span", { className: "font-bold text-slate-900" }, r.title)), /* @__PURE__ */ h("span", { className: "font-semibold text-indigo-700" }, r.status)),
      /* @__PURE__ */ h("p", { className: "text-slate-700" }, r.suggested_organizational_change)
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2" }, sec["12_evidence_limitations"].title, " &", " ", sec["13_sources_and_references"].title), /* @__PURE__ */ h("div", { className: "mt-2 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900" }, sec["12_evidence_limitations"].limitation_statement))));
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
    useEffect(() => {
      api.getAuditLogs(assessmentPeriodId).then(setAuditLogs).catch(() => {
      });
      api.getPrompts().then(setPrompts).catch(() => {
      });
    }, [assessmentPeriodId]);
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
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Authentication & Role-Based Access Control (RBAC)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.")), /* @__PURE__ */ h("form", { onSubmit: handleSaveRole, className: "space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-700 mb-1" }, "Evaluator Name"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: userName,
        onInput: (e) => setUserName(e.target.value),
        className: "w-full border border-slate-300 rounded-lg p-2"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-slate-700 mb-1" }, "Access Role"), /* @__PURE__ */ h(
      "select",
      {
        value: userRole,
        onChange: (e) => setUserRole(e.target.value),
        className: "w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
      },
      /* @__PURE__ */ h("option", { value: "Admin" }, "Admin (Full Write, Override & Config)"),
      /* @__PURE__ */ h("option", { value: "Analyst" }, "Analyst (Upload, Analyze & Override)"),
      /* @__PURE__ */ h("option", { value: "Viewer" }, "Viewer (Read-Only Diagnostic Access)")
    ))), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        className: "px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500"
      },
      "Update Active Evaluator Context"
    ))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Database Reliability, Backups & Security Guardrails"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500 mt-1" }, "Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.")), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: handleBackup,
        className: "px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
      },
      "Create Timestamped Database Backup Snapshot"
    ), backupMsg ? /* @__PURE__ */ h("div", { className: "p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900" }, backupMsg) : null))), /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "10 Modular AI System Prompts & Evidence Guardrails (Section 17)"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation")), /* @__PURE__ */ h(
      "select",
      {
        value: selectedPromptKey,
        onChange: (e) => setSelectedPromptKey(e.target.value),
        className: "text-xs border border-slate-300 rounded-lg p-2 bg-white font-bold text-indigo-700"
      },
      Object.keys(prompts).map((k) => /* @__PURE__ */ h("option", { key: k, value: k }, "Prompt: ", k.replace(/_/g, " ").toUpperCase()))
    )), /* @__PURE__ */ h("pre", { className: "p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72" }, prompts[selectedPromptKey] || "Loading prompt specification...")), /* @__PURE__ */ h("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-200" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Immutable Audit Trail & Manual Override History (", auditLogs.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-50 text-slate-600 border-b border-slate-200" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Timestamp"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Actor & Role"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Action"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Entity"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Justification / State Change"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-100" }, auditLogs.length === 0 ? /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("td", { colSpan: 5, className: "p-4 text-center text-slate-400" }, "No manual overrides or configuration changes logged for this period yet.")) : auditLogs.map((log) => /* @__PURE__ */ h("tr", { key: log.id, className: "hover:bg-slate-50" }, /* @__PURE__ */ h("td", { className: "p-3 text-slate-500" }, new Date(log.created_at).toLocaleString()), /* @__PURE__ */ h("td", { className: "p-3 font-semibold text-slate-800" }, log.actor, " ", /* @__PURE__ */ h("span", { className: "px-1.5 py-0.5 rounded bg-slate-100 text-[10px]" }, log.role)), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold" }, log.action_type)), /* @__PURE__ */ h("td", { className: "p-3 text-slate-600" }, log.entity_type, " #", log.entity_id), /* @__PURE__ */ h("td", { className: "p-3 text-slate-700" }, log.justification ? /* @__PURE__ */ h("div", { className: "font-semibold text-slate-900" }, 'Justification: "', log.justification, '"') : null, /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-500 font-mono truncate max-w-md" }, JSON.stringify(log.after_state))))))))));
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
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "Stakeholder Classification & Weight Calibration Framework"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Internal (4 groups) & External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.")), /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, ["ALL", "Internal", "External"].map((cat) => /* @__PURE__ */ h(
      "button",
      {
        key: cat,
        onClick: () => setCategoryFilter(cat),
        className: `px-3 py-1.5 rounded-lg text-xs font-bold transition ${categoryFilter === cat ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
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
          className: `cursor-pointer bg-white rounded-xl p-5 border transition shadow-sm ${isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-indigo-300"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
          "span",
          {
            className: `inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${sh.category === "Internal" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-sky-50 text-sky-700 border border-sky-200"}`
          },
          sh.category,
          " Stakeholder"
        ), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900 mt-1.5" }, sh.name)), /* @__PURE__ */ h("div", { className: "text-right" }, /* @__PURE__ */ h("div", { className: "text-lg font-extrabold text-slate-900" }, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), /* @__PURE__ */ h("div", { className: "text-[10px] text-slate-500" }, "Coverage: ", /* @__PURE__ */ h("strong", null, sh.evidence_coverage_pct, "%")))),
        /* @__PURE__ */ h("div", { className: "grid grid-cols-4 gap-1.5 mt-4 text-center text-[11px]" }, /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-emerald-50 text-emerald-800" }, /* @__PURE__ */ h("div", { className: "font-extrabold" }, sh.strong_count), /* @__PURE__ */ h("div", { className: "text-[9px]" }, "Strong")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-amber-50 text-amber-800" }, /* @__PURE__ */ h("div", { className: "font-extrabold" }, sh.partial_count), /* @__PURE__ */ h("div", { className: "text-[9px]" }, "Partial")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-rose-50 text-rose-800" }, /* @__PURE__ */ h("div", { className: "font-extrabold" }, sh.misalignment_count), /* @__PURE__ */ h("div", { className: "text-[9px]" }, "Misaligned")), /* @__PURE__ */ h("div", { className: "p-1.5 rounded bg-slate-100 text-slate-600" }, /* @__PURE__ */ h("div", { className: "font-extrabold" }, sh.insufficient_count), /* @__PURE__ */ h("div", { className: "text-[9px]" }, "Insuff."))),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600" }, /* @__PURE__ */ h("span", null, "Assessed: ", /* @__PURE__ */ h("strong", null, assessedReq, "/", totalReq), " reqs"), /* @__PURE__ */ h("span", null, "Importance Weight: ", /* @__PURE__ */ h("strong", null, sh.importance_weight, "x")))
      );
    })), selectedSh ? /* @__PURE__ */ h("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-indigo-600 uppercase" }, "Detailed Stakeholder Diagnostic Profile"), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-slate-900" }, selectedSh.name, " (", selectedSh.category, ")"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-3 mt-1 text-xs text-slate-600" }, /* @__PURE__ */ h("span", null, "Influence over Company:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-900" }, selectedSh.influence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Dependence on Company:", " ", /* @__PURE__ */ h("strong", { className: "text-slate-900" }, selectedSh.dependence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Alignment Score:", " ", /* @__PURE__ */ h("strong", { className: "text-indigo-700" }, selectedSh.alignment_score !== null ? `${selectedSh.alignment_score}%` : "Insufficient Evidence")))), /* @__PURE__ */ h("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3" }, /* @__PURE__ */ h("div", { className: "text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-800" }, "Stakeholder Importance Weight"), /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-500" }, "Recalculates Overall Alignment Score")), /* @__PURE__ */ h(
      "select",
      {
        disabled: savingWeight,
        value: String(selectedSh.importance_weight),
        onChange: (e) => handleStakeholderWeightChange(
          selectedSh.id,
          parseFloat(e.target.value)
        ),
        className: "text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-indigo-700"
      },
      [0.5, 0.8, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3].map(
        (w) => /* @__PURE__ */ h("option", { key: w, value: String(w) }, w.toFixed(1), "x Weight")
      )
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-slate-50 border border-slate-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-800 mb-2" }, "Primary Interests"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-slate-600 list-disc list-inside" }, (selectedSh.key_interests || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-rose-50/50 border border-rose-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-900 mb-2" }, "Concerns & Potential Risks"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-rose-800 list-disc list-inside" }, (selectedSh.concerns_and_risks || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-indigo-900 mb-2" }, "Relevant Company Policies"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-indigo-800 list-disc list-inside" }, (selectedSh.relevant_policies || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-lg bg-amber-50/50 border border-amber-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-amber-900 mb-2" }, "Potential Stakeholder Conflicts"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-amber-800 list-disc list-inside" }, (selectedSh.potential_conflicts || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it))))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-slate-900 mb-2" }, "Extracted & Baseline Stakeholder Expectations (", (selectedSh.expectations || []).length, ")"), /* @__PURE__ */ h("div", { className: "space-y-2.5" }, (selectedSh.expectations || []).map((exp) => /* @__PURE__ */ h(
      "div",
      {
        key: exp.id,
        className: "p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50"
      },
      /* @__PURE__ */ h("div", { className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "text-xs font-bold text-slate-900" }, exp.title), exp.is_discovered_from_docs ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold" }, "AI Discovered from Uploaded Filings") : /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]" }, "Core Framework")), /* @__PURE__ */ h("p", { className: "text-xs text-slate-600" }, exp.description), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1.5 pt-1" }, (exp.mapped_dimension_codes || []).map((dc) => /* @__PURE__ */ h(
        "span",
        {
          key: dc,
          className: "px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold uppercase"
        },
        "Dimension: ",
        dc
      )))),
      /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-xs text-slate-500" }, "Req. Weight:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: savingWeight,
          value: String(exp.requirement_weight),
          onChange: (e) => handleExpectationWeightChange(
            exp.id,
            parseFloat(e.target.value)
          ),
          className: "text-xs font-bold border border-slate-300 rounded p-1.5 bg-white"
        },
        [0.5, 0.8, 1, 1.2, 1.3, 1.4, 1.5, 2].map((w) => /* @__PURE__ */ h("option", { key: w, value: String(w) }, w.toFixed(1), "x"))
      ))
    ))))) : null);
  }

  // src/components/StructureView.tsx
  function StructureView(props) {
    const { structureData } = props;
    const [selectedDimCode, setSelectedDimCode] = useState("governance");
    if (!structureData) {
      return /* @__PURE__ */ h("div", { className: "p-8 text-center text-slate-500" }, "Loading 7-dimension organizational structure assessment...");
    }
    const dimensions = structureData.dimensions || [];
    const units = structureData.units || [];
    const evidenceByDim = structureData.evidence_by_dimension || {};
    const activeDim = dimensions.find((d) => d.dimension_code === selectedDimCode) || dimensions[0] || null;
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "bg-white p-5 rounded-xl border border-slate-200 shadow-sm" }, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-slate-900" }, "7-Dimension Organizational Structure & Governance Diagnostic"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500 mt-0.5" }, 'Evaluates Hierarchy, Centralization, Formalization, Specialization, Delegation & Authority, Coordination & Integration, and Governance. Reporting lines not supported by public filings are strictly marked as "Insufficient Evidence".')), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" }, dimensions.map((d) => {
      const isSelected = activeDim && activeDim.dimension_code === d.dimension_code;
      return /* @__PURE__ */ h(
        "div",
        {
          key: d.id,
          onClick: () => setSelectedDimCode(d.dimension_code),
          className: `cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm flex flex-col justify-between ${isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-indigo-300"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2 mb-2" }, /* @__PURE__ */ h("span", { className: "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700" }, d.dimension_code), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-500" }, "Confidence: ", /* @__PURE__ */ h("strong", null, d.confidence_level))), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, d.dimension_name), /* @__PURE__ */ h("div", { className: "mt-2" }, classificationBadge(d.suitability_classification)), /* @__PURE__ */ h("p", { className: "text-xs text-slate-600 mt-3 line-clamp-3" }, d.assessment_summary)),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold" }, /* @__PURE__ */ h("span", null, d.evidence_count, " Evidence Records"), /* @__PURE__ */ h("span", null, "Inspect Dimension \u2192"))
      );
    })), activeDim ? /* @__PURE__ */ h("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-indigo-600 uppercase" }, "Dimension Deep-Dive \u2022 ", activeDim.dimension_code.toUpperCase()), /* @__PURE__ */ h("h3", { className: "text-lg font-extrabold text-slate-900" }, activeDim.dimension_name)), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, classificationBadge(activeDim.suitability_classification), /* @__PURE__ */ h("span", { className: "text-xs text-slate-500" }, "Confidence: ", /* @__PURE__ */ h("strong", null, activeDim.confidence_level)))), /* @__PURE__ */ h("p", { className: "text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200" }, activeDim.assessment_summary), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-emerald-50/60 border border-emerald-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-emerald-900 mb-2" }, "Identified Structural Strengths"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-emerald-800 list-disc list-inside" }, (activeDim.strengths || []).map((st, i) => /* @__PURE__ */ h("li", { key: i }, st)))), /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-rose-50/60 border border-rose-200" }, /* @__PURE__ */ h("div", { className: "font-bold text-rose-900 mb-2" }, "Structural Weaknesses & Evidence Gaps"), /* @__PURE__ */ h("ul", { className: "space-y-1 text-rose-800 list-disc list-inside" }, (activeDim.weaknesses || []).map((wk, i) => /* @__PURE__ */ h("li", { key: i }, wk))))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5" }, "Supporting Documentary Evidence for ", activeDim.dimension_name, " (", (evidenceByDim[activeDim.dimension_code] || []).length, ")"), (evidenceByDim[activeDim.dimension_code] || []).length === 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-lg bg-slate-50 text-xs text-slate-500" }, "Insufficient Evidence: No direct quotations mapped to this organizational dimension yet.") : /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, (evidenceByDim[activeDim.dimension_code] || []).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "text-[11px] text-slate-500" }, "Quality: ", /* @__PURE__ */ h("strong", null, Math.round(ev.quality_score * 100), "%"))),
      /* @__PURE__ */ h("blockquote", { className: "italic text-slate-800 border-l-2 border-indigo-500 pl-2.5 py-0.5" }, '"', ev.exact_quotation, '"'),
      /* @__PURE__ */ h("div", { className: "text-[11px] text-slate-500 font-medium" }, "Source: ", ev.document_name, " (Page ", ev.page_number, " \u2022", " ", ev.section_heading, ")")
    ))))) : null, /* @__PURE__ */ h("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-slate-900" }, "Extracted Organizational Units, Committees & Reporting Lines (", units.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-slate-500" }, "Anti-Hallucination Guardrail: Never fabricates internal reporting lines not supported by uploaded documents"))), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-slate-50 text-slate-600 border-b border-slate-200" }, /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Organizational Unit / Body"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Unit Type"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Disclosed Reporting Line"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Responsibilities"), /* @__PURE__ */ h("th", { className: "p-3 font-bold" }, "Evidence Class"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-slate-100" }, units.map((u) => /* @__PURE__ */ h("tr", { key: u.id, className: "hover:bg-slate-50" }, /* @__PURE__ */ h("td", { className: "p-3 font-bold text-slate-900" }, u.unit_name), /* @__PURE__ */ h("td", { className: "p-3" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold" }, u.unit_type)), /* @__PURE__ */ h("td", { className: "p-3" }, u.reporting_line.includes("Insufficient Evidence") ? /* @__PURE__ */ h("span", { className: "text-amber-700 font-semibold" }, u.reporting_line) : /* @__PURE__ */ h("span", { className: "text-slate-800 font-medium" }, u.reporting_line)), /* @__PURE__ */ h("td", { className: "p-3 text-slate-600" }, u.responsibilities), /* @__PURE__ */ h("td", { className: "p-3" }, evidenceClassBadge(u.evidence_classification)))))))));
  }

  // src/main.tsx
  var NAV_ITEMS = [
    { id: "dashboard", label: "1. Dashboard Overview", step: "Overview" },
    { id: "documents", label: "2. Document Knowledge Base", step: "Ingest & RAG" },
    { id: "stakeholders", label: "3. Stakeholder Profiles", step: "Stakeholders" },
    { id: "structure", label: "4. Org Structure (7 Dims)", step: "Structure" },
    { id: "matrix", label: "5. Alignment Matrix", step: "Evaluate" },
    { id: "conflicts", label: "6. Conflict Analysis", step: "Conflicts" },
    { id: "recommendations", label: "7. Recommendations", step: "Actions" },
    { id: "evidence", label: "8. Evidence Repository", step: "Citations" },
    { id: "comparison", label: "9. Historical Comparison", step: "Trends" },
    { id: "report", label: "10. Diagnostic Report", step: "Export" },
    { id: "settings", label: "11. Settings & Audit Trail", step: "Governance" }
  ];
  function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [companies, setCompanies] = useState([]);
    const [allPeriods, setAllPeriods] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(1);
    const [selectedPeriodId, setSelectedPeriodId] = useState(2);
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
      const [comps, periods] = await Promise.all([
        api.getCompanies(),
        api.getAssessments()
      ]);
      setCompanies(comps);
      setAllPeriods(periods);
    };
    const loadPeriodData = async (periodId) => {
      if (!periodId) return;
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
    const currentPeriod = allPeriods.find((p) => p.id === selectedPeriodId);
    const auth = getAuthContext();
    return /* @__PURE__ */ h("div", { className: "min-h-screen flex bg-slate-100 text-slate-900" }, /* @__PURE__ */ h("aside", { className: "w-64 bg-slate-950 text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "p-5 border-b border-slate-800" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("div", { className: "w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-white text-sm" }, "SA"), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-extrabold text-white tracking-wide uppercase" }, "Alignment Analyzer"), /* @__PURE__ */ h("div", { className: "text-[10px] text-indigo-400" }, "Stakeholder\u2013Structure Diagnostic")))), /* @__PURE__ */ h("div", { className: "p-4 border-b border-slate-800 space-y-3 text-xs" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase mb-1" }, /* @__PURE__ */ h("span", null, "1. Target Company"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewCompanyModal(true),
        className: "text-indigo-400 hover:underline"
      },
      "+ Add"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedCompanyId),
        onChange: (e) => handleSelectCompany(parseInt(e.target.value, 10)),
        className: "w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-semibold"
      },
      companies.map((c) => /* @__PURE__ */ h("option", { key: c.id, value: String(c.id) }, c.name, " ", c.ticker ? `(${c.ticker})` : ""))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase mb-1" }, /* @__PURE__ */ h("span", null, "2. Assessment Period"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewPeriodModal(true),
        className: "text-indigo-400 hover:underline"
      },
      "+ New Period"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedPeriodId),
        onChange: (e) => setSelectedPeriodId(parseInt(e.target.value, 10)),
        className: "w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-semibold"
      },
      companyPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, p.title))
    ))), /* @__PURE__ */ h("nav", { className: "p-3 space-y-1" }, NAV_ITEMS.map((item) => {
      const active = activeTab === item.id;
      return /* @__PURE__ */ h(
        "button",
        {
          key: item.id,
          onClick: () => setActiveTab(item.id),
          className: `w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${active ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`
        },
        /* @__PURE__ */ h("span", null, item.label),
        /* @__PURE__ */ h(
          "span",
          {
            className: `text-[10px] px-1.5 py-0.5 rounded ${active ? "bg-indigo-800 text-indigo-200" : "bg-slate-900 text-slate-500"}`
          },
          item.step
        )
      );
    }))), /* @__PURE__ */ h("div", { className: "p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-slate-200" }, auth.name), /* @__PURE__ */ h("div", null, "Role:", " ", /* @__PURE__ */ h("span", { className: "px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold" }, auth.role)))), /* @__PURE__ */ h("div", { className: "flex-1 flex flex-col min-w-0" }, /* @__PURE__ */ h("header", { className: "bg-white border-b border-slate-200 px-6 py-3" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-1.5 overflow-x-auto py-1" }, NAV_ITEMS.map((item, idx) => {
      const isCurrent = activeTab === item.id;
      return /* @__PURE__ */ h(
        "button",
        {
          key: item.id,
          onClick: () => setActiveTab(item.id),
          className: `px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition ${isCurrent ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`
        },
        idx + 1,
        ". ",
        item.step
      );
    })), currentPeriod && currentPeriod.title.includes("Sample") ? /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold" }, "Representative Sample Dataset (Upload your own filings or create a new period anytime)") : null)), /* @__PURE__ */ h("main", { className: "p-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto" }, activeTab === "dashboard" ? /* @__PURE__ */ h(
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
    ) : null)), showNewPeriodModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreatePeriod,
        className: "bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs"
      },
      /* @__PURE__ */ h("h3", { className: "text-base font-extrabold text-slate-900" }, "Create New Periodic Assessment"),
      /* @__PURE__ */ h("p", { className: "text-slate-500" }, "Initializes an isolated document collection, 10 stakeholder groups, and 7 organizational structure dimensions."),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Assessment Title"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodTitle,
          onInput: (e) => setNewPeriodTitle(e.target.value),
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      )),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Financial Year"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodFy,
          onInput: (e) => setNewPeriodFy(e.target.value),
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewPeriodModal(false),
          className: "px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold"
        },
        "Create Assessment Period"
      ))
    )) : null, showNewCompanyModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreateCompany,
        className: "bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs"
      },
      /* @__PURE__ */ h("h3", { className: "text-base font-extrabold text-slate-900" }, "Add New Company to Diagnostic Platform"),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Company Name"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompName,
          onInput: (e) => setNewCompName(e.target.value),
          placeholder: "e.g., Alphabet Inc.",
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      )),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Ticker Symbol"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompTicker,
          onInput: (e) => setNewCompTicker(e.target.value),
          placeholder: "GOOGL",
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Industry"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompIndustry,
          onInput: (e) => setNewCompIndustry(e.target.value),
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      ))),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-bold text-slate-700 mb-1" }, "Company-Specific Analysis Priorities (Comma-separated)"), /* @__PURE__ */ h(
        "textarea",
        {
          rows: 2,
          value: newCompPriorities,
          onInput: (e) => setNewCompPriorities(e.target.value),
          className: "w-full border border-slate-300 rounded-lg p-2.5"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewCompanyModal(false),
          className: "px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold"
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
