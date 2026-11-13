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
          <div style="width:40px; height:40px; margin:0 auto 12px; border-radius:50%; background:#eaf2fe; display:flex; align-items:center; justify-content:center; color:#0071e3;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
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
        bg: "bg-[#eaf8ee] border-[#a3e4b7]",
        text: "text-[#1d7334] font-semibold",
        dot: "bg-[#34c759]"
      },
      "Partial Alignment": {
        bg: "bg-[#fff7e6] border-[#ffd580]",
        text: "text-[#b25e00] font-semibold",
        dot: "bg-[#ff9500]"
      },
      "Potential Misalignment": {
        bg: "bg-[#fdeef0] border-[#f9abb4]",
        text: "text-[#c9182b] font-semibold",
        dot: "bg-[#ff3b30]"
      },
      "Insufficient Evidence": {
        bg: "bg-[#f2f2f7] border-[#d1d1d6]",
        text: "text-[#636366] font-medium",
        dot: "bg-[#8e8e93]"
      },
      "Not Applicable": {
        bg: "bg-[#f2f2f7] border-[#e5e5ea]",
        text: "text-[#8e8e93] font-medium",
        dot: "bg-[#aeaeb2]"
      }
    };
    const style = map[status] || map["Insufficient Evidence"];
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs border text-center whitespace-nowrap ${style.bg} ${style.text} shadow-sm`
      },
      /* @__PURE__ */ h("span", { className: `w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}` }),
      /* @__PURE__ */ h("span", null, status)
    );
  }
  function evidenceClassBadge(evType) {
    const styles = {
      FACT: "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff] font-semibold",
      COMPANY_CLAIM: "bg-[#f5eefb] text-[#7a2ea6] border-[#dfc3f3] font-semibold",
      THIRD_PARTY_CLAIM: "bg-[#e6f7f7] text-[#007a7a] border-[#b0e6e6] font-semibold",
      INFERENCE: "bg-[#fff3e6] text-[#b85c00] border-[#ffd1a4] font-semibold"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] border font-mono tracking-wide text-center whitespace-nowrap ${styles[evType] || "bg-[#f2f2f7] text-[#1d1d1f] border-[#d1d1d6]"}`
      },
      evType.replace(/_/g, " ")
    );
  }
  function priorityBadge(priority) {
    const styles = {
      Critical: "bg-[#ff3b30] text-white border-[#ff3b30] font-bold shadow-sm",
      High: "bg-[#ff9500] text-white border-[#ff9500] font-bold shadow-sm",
      Medium: "bg-[#fff3cd] text-[#8a5300] border-[#ffd580] font-semibold",
      Low: "bg-[#e5e5ea] text-[#515154] border-[#d1d1d6] font-semibold"
    };
    return /* @__PURE__ */ h(
      "span",
      {
        className: `inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] border uppercase tracking-wider text-center whitespace-nowrap ${styles[priority] || styles.Medium}`
      },
      priority
    );
  }
  function RadialScoreGauge(props) {
    const pct = props.value !== null && props.value !== void 0 ? Math.max(0, Math.min(100, props.value)) : 0;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - pct / 100 * circumference;
    return /* @__PURE__ */ h("div", { className: "apple-card p-5 flex items-center gap-4 relative overflow-hidden card-hover group" }, /* @__PURE__ */ h(
      "div",
      {
        className: "absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-15",
        style: { backgroundColor: props.colorHex }
      }
    ), /* @__PURE__ */ h("div", { className: "relative w-28 h-28 flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(
      "svg",
      {
        className: "w-28 h-28",
        viewBox: "0 0 120 120",
        style: { transform: "rotate(-90deg)" }
      },
      /* @__PURE__ */ h(
        "circle",
        {
          cx: "60",
          cy: "60",
          r: radius,
          stroke: "#e5e5ea",
          "stroke-width": "9",
          fill: "transparent"
        }
      ),
      /* @__PURE__ */ h(
        "circle",
        {
          cx: "60",
          cy: "60",
          r: radius,
          stroke: props.colorHex,
          "stroke-width": "9",
          "stroke-dasharray": circumference,
          "stroke-dashoffset": dashOffset,
          "stroke-linecap": "round",
          fill: "transparent",
          style: {
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)"
          }
        }
      )
    ), /* @__PURE__ */ h("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none" }, /* @__PURE__ */ h("span", { className: "text-2xl font-bold tracking-tight text-[#1d1d1f] tabular-nums leading-none" }, props.value !== null && props.value !== void 0 ? `${props.value.toFixed(1)}%` : "N/A"), /* @__PURE__ */ h("span", { className: "text-[10px] font-semibold text-[#86868b] uppercase tracking-wider mt-1" }, props.value !== null && props.value !== void 0 ? "Score" : "Pending"))), /* @__PURE__ */ h("div", { className: "flex flex-col min-w-0" }, /* @__PURE__ */ h("span", { className: "text-sm font-bold text-[#1d1d1f] tracking-tight" }, props.label), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] mt-1 leading-relaxed" }, props.sublabel), /* @__PURE__ */ h("div", { className: "mt-2.5 flex items-center gap-2" }, /* @__PURE__ */ h(
      "span",
      {
        className: "w-2 h-2 rounded-full shrink-0",
        style: { backgroundColor: props.colorHex }
      }
    ), /* @__PURE__ */ h("span", { className: "text-[11px] font-mono font-semibold text-[#515154]" }, pct >= 75 ? "Target Range" : pct >= 50 ? "Moderate Alignment" : "Action Required"))));
  }

  // src/components/icons.tsx
  function BrandLogo({ className = "", size = 40 }) {
    return /* @__PURE__ */ h(
      "svg",
      {
        className,
        width: size,
        height: size,
        viewBox: "0 0 48 48",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-label": "Alignment Analyzer Logo"
      },
      /* @__PURE__ */ h("defs", null, /* @__PURE__ */ h("linearGradient", { id: "brandSquircleGrad", x1: "4", y1: "2", x2: "44", y2: "46", gradientUnits: "userSpaceOnUse" }, /* @__PURE__ */ h("stop", { offset: "0%", "stop-color": "#0071e3" }), /* @__PURE__ */ h("stop", { offset: "55%", "stop-color": "#2997ff" }), /* @__PURE__ */ h("stop", { offset: "100%", "stop-color": "#5856d6" })), /* @__PURE__ */ h("linearGradient", { id: "brandHighlight", x1: "0", y1: "0", x2: "0", y2: "48", gradientUnits: "userSpaceOnUse" }, /* @__PURE__ */ h("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.45" }), /* @__PURE__ */ h("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0.0" }))),
      /* @__PURE__ */ h("rect", { x: "2", y: "2", width: "44", height: "44", rx: "13", fill: "url(#brandSquircleGrad)" }),
      /* @__PURE__ */ h("rect", { x: "2.75", y: "2.75", width: "42.5", height: "42.5", rx: "12.25", stroke: "url(#brandHighlight)", "stroke-width": "1.5" }),
      /* @__PURE__ */ h("g", { className: "animate-logo-orbit" }, /* @__PURE__ */ h(
        "ellipse",
        {
          cx: "24",
          cy: "24",
          rx: "15",
          ry: "6.8",
          stroke: "#ffffff",
          "stroke-opacity": "0.92",
          "stroke-width": "1.8",
          transform: "rotate(32 24 24)"
        }
      ), /* @__PURE__ */ h(
        "ellipse",
        {
          cx: "24",
          cy: "24",
          rx: "15",
          ry: "6.8",
          stroke: "#ffffff",
          "stroke-opacity": "0.82",
          "stroke-width": "1.8",
          transform: "rotate(-32 24 24)"
        }
      ), /* @__PURE__ */ h("circle", { cx: "36.5", cy: "17", r: "2.2", fill: "#ffffff" }), /* @__PURE__ */ h("circle", { cx: "11.5", cy: "31", r: "2.2", fill: "#ffffff" }), /* @__PURE__ */ h("circle", { cx: "24", cy: "9", r: "2", fill: "#aee2ff" })),
      /* @__PURE__ */ h(
        "path",
        {
          d: "M24 17.5L25.8 22.2L30.5 24L25.8 25.8L24 30.5L22.2 25.8L17.5 24L22.2 22.2L24 17.5Z",
          fill: "#ffffff"
        }
      ),
      /* @__PURE__ */ h("circle", { cx: "24", cy: "24", r: "1.8", fill: "#0071e3" })
    );
  }
  function CockpitIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M3 13a9 9 0 0 1 18 0" }), /* @__PURE__ */ h("path", { d: "M12 9v4" }), /* @__PURE__ */ h("circle", { cx: "12", cy: "13", r: "1" }), /* @__PURE__ */ h("path", { d: "M5.5 16.5 7 15" }), /* @__PURE__ */ h("path", { d: "M18.5 16.5 17 15" }), /* @__PURE__ */ h("path", { d: "M2 19h20" }));
  }
  function DocumentIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), /* @__PURE__ */ h("polyline", { points: "14 2 14 8 20 8" }), /* @__PURE__ */ h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }), /* @__PURE__ */ h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }), /* @__PURE__ */ h("polyline", { points: "10 9 9 9 8 9" }));
  }
  function UsersIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ h("circle", { cx: "9", cy: "7", r: "4" }), /* @__PURE__ */ h("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }), /* @__PURE__ */ h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }));
  }
  function StructureIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ h("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ h("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ h("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }));
  }
  function MatrixIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "6" }), /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "2" }));
  }
  function BoltIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }));
  }
  function LightbulbIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M9 18h6" }), /* @__PURE__ */ h("path", { d: "M10 22h4" }), /* @__PURE__ */ h("path", { d: "M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" }));
  }
  function SearchIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }));
  }
  function TrendIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }), /* @__PURE__ */ h("polyline", { points: "17 6 23 6 23 12" }));
  }
  function ReportIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" }), /* @__PURE__ */ h("path", { d: "M6 6h10" }), /* @__PURE__ */ h("path", { d: "M6 10h10" }), /* @__PURE__ */ h("path", { d: "M6 14h6" }));
  }
  function SettingsIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ h("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" }));
  }
  function ShieldIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }));
  }
  function SparklesIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" }));
  }
  function ArrowRightIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("line", { x1: "5", y1: "12", x2: "19", y2: "12" }), /* @__PURE__ */ h("polyline", { points: "12 5 19 12 12 19" }));
  }
  function ArrowDownIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ h("polyline", { points: "19 12 12 19 5 12" }));
  }
  function ChevronDownIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("polyline", { points: "6 9 12 15 18 9" }));
  }
  function ChevronUpIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("polyline", { points: "18 15 12 9 6 15" }));
  }
  function DownloadIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ h("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ h("line", { x1: "12", y1: "15", x2: "12", y2: "3" }));
  }
  function ScaleIcon({ className = "w-4 h-4", size = 16 }) {
    return /* @__PURE__ */ h("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("path", { d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }), /* @__PURE__ */ h("path", { d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }), /* @__PURE__ */ h("path", { d: "M7 21h10" }), /* @__PURE__ */ h("path", { d: "M12 3v18" }), /* @__PURE__ */ h("path", { d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" }));
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
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-1" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(TrendIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Periodic Historical & Cross-Company Alignment Comparison Engine")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Baseline Assessment Period (A)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(baseId),
        onChange: (e) => setBaseId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Target Assessment Period (B)"), /* @__PURE__ */ h(
      "select",
      {
        value: String(targetId),
        onChange: (e) => setTargetId(parseInt(e.target.value, 10)),
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      allPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, compMap.get(p.company_id), " \u2014 ", p.title, " (", p.overall_alignment_score ?? "N/A", "%)"))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => runComparison(baseId, targetId),
        disabled: loading,
        className: "apple-btn-primary w-full"
      },
      loading ? "Comparing Assessments..." : "Compare Assessments"
    )))), comparison ? /* @__PURE__ */ h("div", { className: "space-y-6" }, (comparison.date_difference_warnings || []).length > 0 ? /* @__PURE__ */ h("div", { className: "apple-card bg-[#fff7e6] border border-[#ffd580] p-4 space-y-1.5 text-xs text-[#1d1d1f] stagger-2" }, /* @__PURE__ */ h("div", { className: "font-bold uppercase tracking-wider text-[#b25e00]" }, "Assessment Period & Document Date Advisories"), comparison.date_difference_warnings.map((w, i) => /* @__PURE__ */ h("div", { key: i, className: "text-[#515154]" }, "\u2022 ", w))) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 stagger-2" }, /* @__PURE__ */ h("div", { className: "apple-card p-5" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#86868b] uppercase tracking-wider" }, "Baseline (Period A)"), /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] mt-1" }, comparison.baseline.company_name, " \u2014 ", comparison.baseline.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-bold text-[#515154] font-mono tabular-nums" }, comparison.baseline.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-[#0071e3] font-mono tabular-nums" }, comparison.baseline.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "apple-card p-5" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#86868b] uppercase tracking-wider" }, "Target (Period B)"), /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] mt-1" }, comparison.target.company_name, " \u2014 ", comparison.target.title), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-2xl font-bold text-[#0071e3] font-mono tabular-nums" }, comparison.target.overall_alignment_score ?? "N/A", "%"), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] ml-1" }, "Alignment")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "text-lg font-bold text-[#5856d6] font-mono tabular-nums" }, comparison.target.evidence_coverage_pct, "%"), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] ml-1" }, "Coverage")))), /* @__PURE__ */ h("div", { className: "apple-card p-5 border-[#0071e3]/30" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#0071e3] uppercase tracking-wider" }, "Net Alignment & Coverage Shift"), /* @__PURE__ */ h("div", { className: "mt-3 flex items-baseline gap-6" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "div",
      {
        className: `text-2xl font-bold font-mono tabular-nums ${(comparison.overall_alignment_delta || 0) >= 0 ? "text-[#1d7334]" : "text-[#d70015]"}`
      },
      comparison.overall_alignment_delta !== null ? `${comparison.overall_alignment_delta >= 0 ? "+" : ""}${comparison.overall_alignment_delta}%` : "N/A"
    ), /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b]" }, "Alignment Delta")), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xl font-bold text-[#0071e3] font-mono tabular-nums" }, comparison.overall_coverage_delta >= 0 ? "+" : "", comparison.overall_coverage_delta, "%"), /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b]" }, "Coverage Delta"))))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-3" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f]" }, "Stakeholder Alignment Score Comparison (Baseline vs. Target)"), /* @__PURE__ */ h("div", { className: "flex items-center gap-4 text-[11px] font-semibold" }, /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#515154]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#aeaeb2]" }), "Baseline"), /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#0071e3]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3]" }), "Target"))), /* @__PURE__ */ h("div", { className: "space-y-3.5" }, (comparison.stakeholder_comparisons || []).map((sc) => /* @__PURE__ */ h("div", { key: sc.slug, className: "space-y-1.5 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, sc.stakeholder_name, " (", sc.category, ")"), /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "text-[#86868b] font-mono tabular-nums" }, "Base: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, sc.base_alignment_score ?? "N/A", "%")), /* @__PURE__ */ h("span", { className: "text-[#86868b] font-mono tabular-nums" }, "Target:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3]" }, sc.target_alignment_score ?? "N/A", "%")), sc.alignment_delta !== null ? /* @__PURE__ */ h(
      "span",
      {
        className: `px-2.5 py-0.5 rounded-full font-mono font-bold border tabular-nums ${sc.alignment_delta > 0 ? "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]" : sc.alignment_delta < 0 ? "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]" : "bg-[#f2f2f7] text-[#636366] border-[#d1d1d6]"}`
      },
      sc.alignment_delta > 0 ? "+" : "",
      sc.alignment_delta,
      "%"
    ) : null)), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-2.5" }, /* @__PURE__ */ h("div", { className: "w-full h-2.5 bg-[#e5e5ea] rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-[#aeaeb2] h-full rounded-full bar-grow",
        style: { width: `${sc.base_alignment_score || 0}%` }
      }
    )), /* @__PURE__ */ h("div", { className: "w-full h-2.5 bg-[#e5e5ea] rounded-full overflow-hidden" }, /* @__PURE__ */ h(
      "div",
      {
        className: "bg-[#0071e3] h-full rounded-full bar-grow",
        style: { width: `${sc.target_alignment_score || 0}%` }
      }
    ))))))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 stagger-4" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-[#1d1d1f]" }, "Alignment Improvements & New Capabilities"), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#eaf8ee] border border-[#a3e4b7] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d7334]" }, "Improvements in Alignment:"), (comparison.alignment_improvements || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-[#248a3d] italic" }, "No positive score shifts recorded.") : comparison.alignment_improvements.map(
      (imp, i) => /* @__PURE__ */ h("div", { key: i, className: "text-[#1d1d1f]" }, "+ ", imp)
    )), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#0066cc]" }, "Newly Disclosed Capabilities & Units:"), (comparison.new_capabilities_and_units || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-[#0066cc] italic" }, "No new organizational units added between periods.") : comparison.new_capabilities_and_units.map(
      (u, i) => /* @__PURE__ */ h("div", { key: i, className: "text-[#1d1d1f]" }, "+ ", u)
    ))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-3 text-xs" }, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-[#1d1d1f]" }, "Deteriorations & Structural Dimension Changes"), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#c9182b]" }, "Deteriorations in Alignment:"), (comparison.alignment_deteriorations || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-[#c9182b] italic" }, "No alignment score declines recorded.") : comparison.alignment_deteriorations.map(
      (det, i) => /* @__PURE__ */ h("div", { key: i, className: "text-[#1d1d1f] flex items-center gap-1.5" }, /* @__PURE__ */ h(ArrowDownIcon, { className: "w-3.5 h-3.5 text-[#c9182b] shrink-0" }), /* @__PURE__ */ h("span", null, det))
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-black/8" }, (comparison.dimension_comparisons || []).map((dc) => /* @__PURE__ */ h(
      "div",
      {
        key: dc.dimension_code,
        className: "py-3 flex flex-wrap items-center justify-between gap-2"
      },
      /* @__PURE__ */ h("span", { className: "font-semibold text-[#1d1d1f]" }, dc.dimension_name),
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, classificationBadge(dc.base_classification), /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5 text-[#86868b]" }), classificationBadge(dc.target_classification))
    )))))) : null);
  }

  // src/components/ConflictsView.tsx
  function truncateLabel(text, maxLen) {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen - 1) + "..." : text;
  }
  function ConflictsView(props) {
    const { conflicts, evidenceList } = props;
    const [selectedConflictId, setSelectedConflictId] = useState(
      conflicts[0]?.id || null
    );
    const activeConflict = conflicts.find((c) => c.id === selectedConflictId) || conflicts[0] || null;
    const evMap = /* @__PURE__ */ new Map();
    for (const e of evidenceList) evMap.set(e.id, e);
    const leftStakeholders = Array.from(
      new Set(conflicts.map((c) => c.stakeholder_a_name))
    );
    const rightStakeholders = Array.from(
      new Set(conflicts.map((c) => c.stakeholder_b_name))
    );
    const laneCount = Math.max(
      1,
      conflicts.length,
      leftStakeholders.length,
      rightStakeholders.length
    );
    const svgHeight = Math.max(360, laneCount * 92 + 56);
    const getYPositions = (count) => {
      const usableHeight = svgHeight - 72;
      const step = usableHeight / Math.max(1, count);
      return Array.from(
        { length: count },
        (_, idx) => Math.round(44 + step * idx + step / 2)
      );
    };
    const leftYs = getYPositions(leftStakeholders.length);
    const rightYs = getYPositions(rightStakeholders.length);
    const centerYs = getYPositions(conflicts.length);
    const leftCoordMap = {};
    leftStakeholders.forEach((name, idx) => {
      leftCoordMap[name] = leftYs[idx];
    });
    const rightCoordMap = {};
    rightStakeholders.forEach((name, idx) => {
      rightCoordMap[name] = rightYs[idx];
    });
    const severityStroke = (severity, isSelected) => {
      if (isSelected) return "#0071e3";
      if (severity === "Critical") return "#ff3b30";
      if (severity === "High") return "#ff9500";
      return "#5856d6";
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-[#d70015] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(ScaleIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Stakeholder Conflict Network & Governance Mediation Analysis")), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-1.5 leading-relaxed max-w-3xl" }, "Competing stakeholder expectations do not automatically imply misalignment. This bipartite diagnostic evaluates whether existing organizational mechanisms effectively mediate structural tensions.")), /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "px-3.5 py-1.5 rounded-full bg-[#fdeef0] border border-[#f9abb4] text-[#c9182b] text-xs font-bold font-mono" }, conflicts.length, " Active Tensions"))), conflicts.length === 0 ? /* @__PURE__ */ h("div", { className: "apple-card p-10 text-center text-sm text-[#86868b] stagger-2" }, "No stakeholder conflicts recorded for this assessment period yet. Run the AI Diagnostic to extract structural tensions.") : /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-2 space-y-4 overflow-hidden" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] flex items-center gap-2" }, /* @__PURE__ */ h(BoltIcon, { className: "w-4 h-4 text-[#0071e3]" }), /* @__PURE__ */ h("span", null, "Bipartite Stakeholder Tension & Mediation Architecture")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Click any center tension bridge or stakeholder node to inspect structural weaknesses and governance reforms")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3 text-[11px] font-semibold" }, /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#c9182b]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#ff3b30]" }), "Critical"), /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#b25e00]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#ff9500]" }), "High"), /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#5856d6]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#5856d6]" }), "Medium"), /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1.5 text-[#0071e3]" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3]" }), "Selected"))), /* @__PURE__ */ h("div", { className: "w-full overflow-x-auto rounded-2xl bg-[#fbfbfd] border border-black/[0.06] p-3" }, /* @__PURE__ */ h(
      "svg",
      {
        viewBox: `0 0 960 ${svgHeight}`,
        className: "w-full min-w-[760px]",
        style: { height: `${Math.min(460, svgHeight)}px` }
      },
      /* @__PURE__ */ h(
        "text",
        {
          x: "134",
          y: "24",
          "text-anchor": "middle",
          fill: "#86868b",
          "font-size": "10",
          "font-weight": "700",
          "letter-spacing": "0.08em"
        },
        "STAKEHOLDER PARTY A"
      ),
      /* @__PURE__ */ h(
        "text",
        {
          x: "480",
          y: "24",
          "text-anchor": "middle",
          fill: "#86868b",
          "font-size": "10",
          "font-weight": "700",
          "letter-spacing": "0.08em"
        },
        "STRUCTURAL TENSION & GOVERNANCE BRIDGE"
      ),
      /* @__PURE__ */ h(
        "text",
        {
          x: "826",
          y: "24",
          "text-anchor": "middle",
          fill: "#86868b",
          "font-size": "10",
          "font-weight": "700",
          "letter-spacing": "0.08em"
        },
        "STAKEHOLDER PARTY B"
      ),
      conflicts.map((c, idx) => {
        const yA = leftCoordMap[c.stakeholder_a_name] ?? 100;
        const yB = rightCoordMap[c.stakeholder_b_name] ?? 100;
        const yC = centerYs[idx];
        const isSelected = activeConflict && activeConflict.id === c.id;
        const strokeColor = severityStroke(c.severity, isSelected);
        const leftPath = `M 248 ${yA} C 294 ${yA}, 300 ${yC}, 336 ${yC}`;
        const rightPath = `M 624 ${yC} C 660 ${yC}, 666 ${yB}, 712 ${yB}`;
        return /* @__PURE__ */ h(
          "g",
          {
            key: `edge-${c.id}`,
            onClick: () => setSelectedConflictId(c.id),
            style: { cursor: "pointer" }
          },
          isSelected ? /* @__PURE__ */ h("g", null, /* @__PURE__ */ h(
            "path",
            {
              d: leftPath,
              fill: "none",
              stroke: "#0071e3",
              "stroke-opacity": "0.18",
              "stroke-width": "8",
              "stroke-linecap": "round"
            }
          ), /* @__PURE__ */ h(
            "path",
            {
              d: rightPath,
              fill: "none",
              stroke: "#0071e3",
              "stroke-opacity": "0.18",
              "stroke-width": "8",
              "stroke-linecap": "round"
            }
          )) : null,
          /* @__PURE__ */ h(
            "path",
            {
              d: leftPath,
              fill: "none",
              stroke: strokeColor,
              "stroke-width": isSelected ? "2.6" : "1.8",
              "stroke-opacity": isSelected ? "1" : "0.65",
              className: isSelected ? "animate-dash-flow" : ""
            }
          ),
          /* @__PURE__ */ h(
            "path",
            {
              d: rightPath,
              fill: "none",
              stroke: strokeColor,
              "stroke-width": isSelected ? "2.6" : "1.8",
              "stroke-opacity": isSelected ? "1" : "0.65",
              className: isSelected ? "animate-dash-flow" : ""
            }
          ),
          /* @__PURE__ */ h("circle", { cx: "248", cy: yA, r: "4", fill: strokeColor }),
          /* @__PURE__ */ h("circle", { cx: "712", cy: yB, r: "4", fill: strokeColor })
        );
      }),
      leftStakeholders.map((name) => {
        const y = leftCoordMap[name];
        const isInvolved = activeConflict && activeConflict.stakeholder_a_name === name;
        return /* @__PURE__ */ h(
          "g",
          {
            key: `left-${name}`,
            onClick: () => {
              const match = conflicts.find((c) => c.stakeholder_a_name === name);
              if (match) setSelectedConflictId(match.id);
            },
            style: { cursor: "pointer" }
          },
          /* @__PURE__ */ h(
            "rect",
            {
              x: "20",
              y: y - 26,
              width: "228",
              height: "52",
              rx: "14",
              fill: isInvolved ? "#e8f2fe" : "#ffffff",
              stroke: isInvolved ? "#0071e3" : "#d2d2d7",
              "stroke-width": isInvolved ? "2" : "1.2"
            }
          ),
          /* @__PURE__ */ h(
            "circle",
            {
              cx: "40",
              cy: y,
              r: "5",
              fill: isInvolved ? "#0071e3" : "#86868b"
            }
          ),
          /* @__PURE__ */ h(
            "text",
            {
              x: "54",
              y: y + 4,
              fill: "#1d1d1f",
              "font-size": "12",
              "font-weight": "700"
            },
            truncateLabel(name, 26)
          )
        );
      }),
      conflicts.map((c, idx) => {
        const y = centerYs[idx];
        const isSelected = activeConflict && activeConflict.id === c.id;
        const badgeFill = c.severity === "Critical" ? "#ff3b30" : c.severity === "High" ? "#ff9500" : "#5856d6";
        return /* @__PURE__ */ h(
          "g",
          {
            key: `center-${c.id}`,
            onClick: () => setSelectedConflictId(c.id),
            style: { cursor: "pointer" }
          },
          /* @__PURE__ */ h(
            "rect",
            {
              x: "336",
              y: y - 32,
              width: "288",
              height: "64",
              rx: "16",
              fill: isSelected ? "#ffffff" : "#f5f5f7",
              stroke: isSelected ? "#0071e3" : "#d2d2d7",
              "stroke-width": isSelected ? "2.2" : "1.2"
            }
          ),
          /* @__PURE__ */ h(
            "rect",
            {
              x: "350",
              y: y - 20,
              width: "72",
              height: "18",
              rx: "9",
              fill: badgeFill
            }
          ),
          /* @__PURE__ */ h(
            "text",
            {
              x: "386",
              y: y - 8,
              "text-anchor": "middle",
              fill: "#ffffff",
              "font-size": "9.5",
              "font-weight": "700"
            },
            c.severity.toUpperCase()
          ),
          /* @__PURE__ */ h(
            "text",
            {
              x: "432",
              y: y - 8,
              fill: "#86868b",
              "font-size": "10",
              "font-weight": "600"
            },
            (c.organizational_units_involved || [])[0] ? truncateLabel(c.organizational_units_involved[0], 26) : "Cross-Functional"
          ),
          /* @__PURE__ */ h(
            "text",
            {
              x: "350",
              y: y + 15,
              fill: "#1d1d1f",
              "font-size": "11.5",
              "font-weight": "600"
            },
            truncateLabel(c.conflicting_expectations, 40)
          )
        );
      }),
      rightStakeholders.map((name) => {
        const y = rightCoordMap[name];
        const isInvolved = activeConflict && activeConflict.stakeholder_b_name === name;
        return /* @__PURE__ */ h(
          "g",
          {
            key: `right-${name}`,
            onClick: () => {
              const match = conflicts.find((c) => c.stakeholder_b_name === name);
              if (match) setSelectedConflictId(match.id);
            },
            style: { cursor: "pointer" }
          },
          /* @__PURE__ */ h(
            "rect",
            {
              x: "712",
              y: y - 26,
              width: "228",
              height: "52",
              rx: "14",
              fill: isInvolved ? "#e8f2fe" : "#ffffff",
              stroke: isInvolved ? "#0071e3" : "#d2d2d7",
              "stroke-width": isInvolved ? "2" : "1.2"
            }
          ),
          /* @__PURE__ */ h(
            "circle",
            {
              cx: "732",
              cy: y,
              r: "5",
              fill: isInvolved ? "#0071e3" : "#86868b"
            }
          ),
          /* @__PURE__ */ h(
            "text",
            {
              x: "746",
              y: y + 4,
              fill: "#1d1d1f",
              "font-size": "12",
              "font-weight": "700"
            },
            truncateLabel(name, 26)
          )
        );
      })
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 stagger-3" }, conflicts.map((c) => {
      const isSel = activeConflict && activeConflict.id === c.id;
      return /* @__PURE__ */ h(
        "div",
        {
          key: c.id,
          onClick: () => setSelectedConflictId(c.id),
          className: `apple-card p-5 cursor-pointer card-hover flex flex-col justify-between gap-3 ${isSel ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white" : "bg-white/85"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-3" }, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] flex flex-wrap items-center gap-1.5" }, /* @__PURE__ */ h("span", null, c.stakeholder_a_name), /* @__PURE__ */ h("span", { className: "text-[#d70015] font-semibold px-1.5 py-0.5 rounded bg-[#fdeef0] text-[11px]" }, "vs."), /* @__PURE__ */ h("span", null, c.stakeholder_b_name)), priorityBadge(c.severity)), /* @__PURE__ */ h("p", { className: "text-xs font-medium text-[#515154] mt-2 leading-relaxed" }, c.conflicting_expectations)),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1.5 pt-2 border-t border-black/5" }, (c.organizational_units_involved || []).map((u, i) => /* @__PURE__ */ h(
          "span",
          {
            key: i,
            className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[11px] font-medium border border-black/8"
          },
          u
        )))
      );
    })), activeConflict ? /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-5 stagger-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/8 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-[#0071e3] uppercase tracking-wider flex items-center gap-1.5" }, /* @__PURE__ */ h(ShieldIcon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ h("span", null, "Stakeholder Conflict Diagnostic & Resolution Architecture")), /* @__PURE__ */ h("h3", { className: "text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight" }, activeConflict.stakeholder_a_name, " vs.", " ", activeConflict.stakeholder_b_name), /* @__PURE__ */ h("p", { className: "text-xs font-medium text-[#515154] mt-1" }, activeConflict.conflicting_expectations)), /* @__PURE__ */ h("div", { className: "shrink-0" }, priorityBadge(activeConflict.severity))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#f5f5f7] border border-black/8 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f] uppercase tracking-wider text-[11px]" }, "Current Resolution Mechanisms"), /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed" }, activeConflict.current_resolution_mechanisms)), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#c9182b] uppercase tracking-wider text-[11px]" }, "Potential Structural Weaknesses"), /* @__PURE__ */ h("p", { className: "text-[#7f1d1d] leading-relaxed" }, activeConflict.structural_weaknesses)), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#0066cc] uppercase tracking-wider text-[11px]" }, "Recommended Governance Mechanism"), /* @__PURE__ */ h("p", { className: "text-[#1d1d1f] leading-relaxed font-medium" }, activeConflict.recommended_governance_mechanism))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3" }, "Supporting Documentary Citations for This Conflict"), (activeConflict.evidence_ids || []).length === 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-[#f5f5f7] border border-black/8 text-xs text-[#86868b]" }, "No linked quotation IDs recorded for this conflict.") : /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, (activeConflict.evidence_ids || []).map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-4 rounded-2xl border border-black/8 bg-[#fbfbfd] text-xs space-y-2"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "text-[11px] font-medium text-[#86868b]" }, ev.document_name, " (p.", ev.page_number, ")")),
      /* @__PURE__ */ h("blockquote", { className: "italic text-[#1d1d1f] border-l-2 border-[#0071e3] pl-3 leading-relaxed" }, "\u201C", ev.exact_quotation, "\u201D")
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
        metricValue: "PDF, DOCX, XLSX, TXT",
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
        metricValue: "MiniLM-L6-v2 (384d)",
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
        badge: "Hierarchy & Governance",
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
        metricValue: `${props.conflictCount ?? 0} Tensions / ${props.recommendationCount ?? 0} Actions`,
        badge: "Executive Synthesis",
        description: "Generates prioritized structural governance recommendations and cross-stakeholder tension mediation strategies.",
        auditRule: "Every recommendation links directly to identified root causes and verified source evidence citations.",
        provenanceGuarantee: "Full audit trail: allows expert manual override with logged evaluator rationale and timestamp."
      }
    ];
    const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];
    return /* @__PURE__ */ h("div", { className: "rounded-2xl p-6 text-[#1d1d1f] space-y-6 border border-black/8 bg-[#fbfbfd] relative overflow-hidden" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3] live-dot text-[#0071e3]" }), /* @__PURE__ */ h("h3", { className: "text-sm font-bold tracking-tight uppercase text-[#0071e3]" }, "Signature Diagnostic Engine: Evidence to Insight Architecture")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "End-to-end evidence verification pipeline combining local RAG, Groq LLM inference, and deterministic scoring.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff]" }, "6-Stage Multi-Agent Pipeline"), /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full text-[11px] font-semibold bg-[#eaf8ee] text-[#1d7334] border border-[#a3e4b7]" }, "Quotation Provenance Active"))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative z-10" }, nodes.map((node, idx) => {
      const isSelected = node.id === selectedNodeId;
      return /* @__PURE__ */ h(
        "div",
        {
          key: node.id,
          onClick: () => setSelectedNodeId(node.id),
          className: `cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between ${isSelected ? "bg-white border-[#0071e3] shadow-lg ring-2 ring-[#0071e3]/20" : "bg-white/80 border-black/8 hover:border-[#0071e3]/40 hover:bg-white shadow-sm"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ h("span", { className: "text-[10px] font-mono font-bold text-[#86868b]" }, "STAGE ", node.step), /* @__PURE__ */ h(
          "span",
          {
            className: `w-2 h-2 rounded-full ${node.status === "verified" ? "bg-[#34c759]" : node.status === "live" ? "bg-[#0071e3]" : "bg-[#5856d6]"}`
          }
        )), /* @__PURE__ */ h("div", { className: "text-xs font-bold text-[#1d1d1f] leading-snug" }, node.title)),
        /* @__PURE__ */ h("div", { className: "text-[11px] text-[#0071e3] font-semibold mt-2 truncate" }, node.metricValue),
        idx < nodes.length - 1 ? /* @__PURE__ */ h("div", { className: "hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-4 h-4 rounded-full bg-white border border-black/10 items-center justify-center text-[#0071e3] shadow-sm" }, /* @__PURE__ */ h(ArrowRightIcon, { className: "w-2.5 h-2.5" })) : null
      );
    })), /* @__PURE__ */ h("div", { className: "rounded-2xl p-5 bg-white border border-black/8 shadow-sm space-y-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 pb-3.5" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("span", { className: "w-9 h-9 rounded-xl bg-[#e8f2fe] text-[#0071e3] border border-[#b3d7ff] flex items-center justify-center font-mono font-bold text-xs shrink-0" }, activeNode.step), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", null, activeNode.title), /* @__PURE__ */ h("span", { className: "text-xs font-medium text-[#86868b]" }, "(", activeNode.badge, ")")), /* @__PURE__ */ h("div", { className: "text-xs text-[#515154] mt-0.5 leading-relaxed" }, activeNode.description))), /* @__PURE__ */ h("div", { className: "shrink-0" }, /* @__PURE__ */ h("span", { className: "inline-block text-xs font-mono font-bold text-[#0066cc] bg-[#e8f2fe] px-3 py-1.5 rounded-full border border-[#b3d7ff]" }, activeNode.metricLabel, ": ", activeNode.metricValue))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "bg-[#f5f5f7] rounded-xl p-3.5 border border-black/8 space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#5856d6] uppercase tracking-wider text-[10px]" }, "Diagnostic Audit Rule"), /* @__PURE__ */ h("p", { className: "text-[#1d1d1f] leading-relaxed" }, activeNode.auditRule)), /* @__PURE__ */ h("div", { className: "bg-[#eaf8ee] rounded-xl p-3.5 border border-[#a3e4b7] space-y-1" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d7334] uppercase tracking-wider text-[10px]" }, "Provenance & Academic Guarantee"), /* @__PURE__ */ h("p", { className: "text-[#1d1d1f] leading-relaxed" }, activeNode.provenanceGuarantee)))));
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
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-[#86868b] font-medium text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" }), "Loading organizational diagnostic intelligence overview...");
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
      total_documents: 0,
      documents_processed: 0,
      evidence_records_count: 0,
      stakeholders_assessed: 0,
      total_stakeholders: 10
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
        setAiError(err.message || "Failed to generate AI executive synthesis");
      } finally {
        setIsGeneratingAi(false);
      }
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "apple-card p-7 text-[#1d1d1f] relative overflow-hidden stagger-1" }, /* @__PURE__ */ h("div", { className: "absolute -right-8 -top-8 opacity-[0.06] pointer-events-none" }, /* @__PURE__ */ h(BrandLogo, { size: 180 })), /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2.5 text-xs font-semibold mb-2" }, /* @__PURE__ */ h("span", { className: "flex items-center gap-1.5 bg-[#0071e3]/10 border border-[#0071e3]/20 px-3 py-1 rounded-full text-[#0071e3]" }, /* @__PURE__ */ h("span", { className: "w-1.5 h-1.5 rounded-full bg-[#0071e3] shadow-sm shadow-[#0071e3]/60" }), "Organizational Diagnostic Intelligence"), /* @__PURE__ */ h("span", { className: "text-[#d2d2d7]" }, "\u2022"), /* @__PURE__ */ h("span", { className: "text-[#1d1d1f] font-bold" }, assessment.fiscal_year), assessment.company_ticker ? /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 bg-[#f5f5f7] border border-black/10 rounded-md text-[#0071e3] font-mono font-bold" }, assessment.company_ticker) : null), /* @__PURE__ */ h("h1", { className: "text-3xl font-bold tracking-tight text-[#1d1d1f]" }, assessment.company_name), /* @__PURE__ */ h("p", { className: "text-sm text-[#86868b] mt-1" }, assessment.title), /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-3 flex flex-wrap items-center gap-3" }, /* @__PURE__ */ h("span", null, "Last Evaluated:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, assessment.last_analyzed_at ? new Date(assessment.last_analyzed_at).toLocaleString() : "Not yet analyzed")), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Status:", " ", /* @__PURE__ */ h("span", { className: "font-semibold text-[#248a3d] px-2.5 py-0.5 rounded-full bg-[#34c759]/10 border border-[#34c759]/30" }, assessment.status)))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("documents"),
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h(DocumentIcon, { className: "w-4 h-4 text-[#0071e3]" }),
      /* @__PURE__ */ h("span", null, "Manage Filings (", metrics.documents_processed, ")")
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        disabled: isAnalyzing,
        className: "apple-btn-primary btn-shimmer"
      },
      isAnalyzing ? /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ h("span", null, "Running AI Engine...")) : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h(SparklesIcon, { className: "w-4 h-4" }), /* @__PURE__ */ h("span", null, "Run AI Diagnostic"))
    )))), /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-2" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ h("div", { className: "text-xs font-bold uppercase tracking-wider text-[#86868b]" }, "Diagnostic Workflow"), /* @__PURE__ */ h("span", { className: "text-xs text-[#0071e3] font-mono font-semibold" }, "5-Stage Pipeline")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" }, /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("documents"),
        className: "p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1" }, /* @__PURE__ */ h("span", null, "STEP 01"), /* @__PURE__ */ h("span", { className: "text-[#248a3d] font-semibold" }, "Ingested")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition" }, "Research Library"),
      /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-1" }, metrics.documents_processed, " Filings \u2022 ", metrics.evidence_records_count, " Chunks")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("stakeholders"),
        className: "p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1" }, /* @__PURE__ */ h("span", null, "STEP 02"), /* @__PURE__ */ h("span", { className: "text-[#248a3d] font-semibold" }, "Mapped")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition" }, "Stakeholders"),
      /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-1" }, metrics.stakeholders_assessed, " Groups (4 Int / 6 Ext)")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("structure"),
        className: "p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1" }, /* @__PURE__ */ h("span", null, "STEP 03"), /* @__PURE__ */ h("span", { className: "text-[#248a3d] font-semibold" }, "Extracted")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition" }, "Org Structure"),
      /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-1" }, "7 Core Dimensions & Units")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("matrix"),
        className: "p-4 rounded-2xl bg-[#0071e3]/5 hover:bg-white border border-[#0071e3]/20 hover:border-[#0071e3] cursor-pointer card-hover transition group shadow-sm"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#0071e3] mb-1" }, /* @__PURE__ */ h("span", null, "STEP 04"), /* @__PURE__ */ h("span", { className: "font-bold" }, assessment.overall_alignment_score, "% Score")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition" }, "Alignment Matrix"),
      /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-1" }, totalReq, " Requirements Evaluated")
    ), /* @__PURE__ */ h(
      "div",
      {
        onClick: () => onNavigate("recommendations"),
        className: "p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#ff9500]/40 cursor-pointer card-hover transition group shadow-sm"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1" }, /* @__PURE__ */ h("span", null, "STEP 05"), /* @__PURE__ */ h("span", { className: "text-[#c96500] font-bold" }, metrics.recommendations_count, " Actions")),
      /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] group-hover:text-[#c96500] transition" }, "Action Plan"),
      /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] mt-1" }, metrics.conflicts_count, " Conflicts \u2022 Reforms")
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-3" }, /* @__PURE__ */ h(
      RadialScoreGauge,
      {
        label: "Overall Alignment Score",
        sublabel: "Weighted average across stakeholder expectations (Strong=4, Partial=3, Misaligned=1)",
        value: assessment.overall_alignment_score,
        colorHex: (assessment.overall_alignment_score || 0) >= 75 ? "#34c759" : (assessment.overall_alignment_score || 0) >= 55 ? "#ff9500" : "#ff3b30"
      }
    ), /* @__PURE__ */ h(
      RadialScoreGauge,
      {
        label: "Evidence Coverage",
        sublabel: "Percentage of applicable requirements backed by extracted documentary evidence",
        value: assessment.evidence_coverage_pct,
        colorHex: "#0071e3"
      }
    ), /* @__PURE__ */ h("div", { className: "apple-card p-5 flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-semibold text-[#86868b] uppercase tracking-wider" }, "Knowledge Base & Evidence"), /* @__PURE__ */ h("div", { className: "mt-2.5 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-bold text-[#1d1d1f]" }, metrics.documents_processed), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] font-medium" }, "documents (", metrics.evidence_records_count, " citations)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-[#515154]" }, "Assessed:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, metrics.stakeholders_assessed, " / ", metrics.total_stakeholders)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("evidence"),
        className: "text-[#0071e3] font-semibold hover:underline flex items-center gap-1"
      },
      /* @__PURE__ */ h("span", null, "Inspect Citations"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })
    ))), /* @__PURE__ */ h("div", { className: "apple-card p-5 flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-semibold text-[#86868b] uppercase tracking-wider" }, "Alignment Gaps & Diagnostics"), /* @__PURE__ */ h("div", { className: "mt-2.5 flex items-baseline gap-2" }, /* @__PURE__ */ h("span", { className: "text-3xl font-bold text-[#d70015]" }, metrics.alignment_gaps_identified), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b] font-medium" }, "gaps (", metrics.potential_misalignments, " misaligned,", " ", metrics.partial_alignments, " partial)"))), /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs" }, /* @__PURE__ */ h("span", { className: "text-[#515154]" }, "Remediations:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, metrics.recommendations_count)), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("recommendations"),
        className: "text-[#0071e3] font-semibold hover:underline flex items-center gap-1"
      },
      /* @__PURE__ */ h("span", null, "View Actions"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })
    )))), /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "Requirement Alignment Distribution (", totalReq, " Evaluated Requirements)"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("matrix"),
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h("span", null, "Open Interactive Alignment Matrix"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-4 h-4 text-[#0071e3]" })
    )), /* @__PURE__ */ h("div", { className: "w-full h-4 rounded-full overflow-hidden flex bg-[#e5e5ea] bar-grow" }, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.strong_alignments / totalReq * 100}%`
        },
        className: "bg-[#34c759] h-full",
        title: `Strong Alignment: ${metrics.strong_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.partial_alignments / totalReq * 100}%`
        },
        className: "bg-[#ff9500] h-full",
        title: `Partial Alignment: ${metrics.partial_alignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.potential_misalignments / totalReq * 100}%`
        },
        className: "bg-[#ff3b30] h-full",
        title: `Potential Misalignment: ${metrics.potential_misalignments}`
      }
    ) : null, totalReq > 0 ? /* @__PURE__ */ h(
      "div",
      {
        style: {
          width: `${metrics.insufficient_evidence_count / totalReq * 100}%`
        },
        className: "bg-[#8e8e93] h-full",
        title: `Insufficient Evidence: ${metrics.insufficient_evidence_count}`
      }
    ) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-[#1d7334]" }, "Strong Alignment (4)"), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d7334] text-base" }, metrics.strong_alignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#fff7e6] border border-[#ffd580] flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-[#b25e00]" }, "Partial Alignment (3)"), /* @__PURE__ */ h("span", { className: "font-bold text-[#b25e00] text-base" }, metrics.partial_alignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#fdeef0] border border-[#f9abb4] flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-[#c9182b]" }, "Potential Misaligned (1)"), /* @__PURE__ */ h("span", { className: "font-bold text-[#c9182b] text-base" }, metrics.potential_misalignments)), /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#f2f2f7] border border-[#d1d1d6] flex items-center justify-between" }, /* @__PURE__ */ h("span", { className: "font-semibold text-[#636366]" }, "Insufficient Evidence"), /* @__PURE__ */ h("span", { className: "font-bold text-[#636366] text-base" }, metrics.insufficient_evidence_count)))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2" }, /* @__PURE__ */ h(MatrixIcon, { className: "w-5 h-5 text-[#0071e3]" }), /* @__PURE__ */ h("span", null, "Key Diagnostic Findings & Priority Governance Gaps")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Identified through automated 6-stage cross-examination of corporate charters and disclosures")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("recommendations"),
        className: "text-xs text-[#0071e3] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
      },
      /* @__PURE__ */ h("span", null, "View All ", metrics.recommendations_count, " Recommended Actions"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })
    )), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 pt-1" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0]/60 border border-[#f9abb4] card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#ff3b30] text-white font-bold text-[10px]" }, "CRITICAL GAP"), /* @__PURE__ */ h("span", { className: "text-[#86868b] font-mono text-[11px]" }, "Centralization")), /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] leading-snug" }, "Dual-Class Founder Voting Power Concentration"), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-2 leading-relaxed" }, "Class B shares hold concentrated voting power, creating a governance imbalance between executive authority and independent minority shareholder accountability.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium" }, /* @__PURE__ */ h("span", null, "Reform: Independent lead director"), /* @__PURE__ */ h("span", { className: "font-bold text-[#d70015]" }, "Score 1.0"))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fff7e6]/60 border border-[#ffd580] card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#ff9500] text-white font-bold text-[10px]" }, "PARTIAL ALIGNMENT"), /* @__PURE__ */ h("span", { className: "text-[#86868b] font-mono text-[11px]" }, "Formalization")), /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] leading-snug" }, "Youth Safety Controls & Pre-Launch Review"), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-2 leading-relaxed" }, "Default teen accounts deployed; self-reported safety disclosures capped at Partial Alignment pending third-party operational audit.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium" }, /* @__PURE__ */ h("span", null, "Action: Publish 3P audit report"), /* @__PURE__ */ h("span", { className: "font-bold text-[#b25e00]" }, "Score 3.0"))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#eaf8ee]/60 border border-[#a3e4b7] card-hover flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#34c759] text-white font-bold text-[10px]" }, "STRONG ALIGNMENT"), /* @__PURE__ */ h("span", { className: "text-[#86868b] font-mono text-[11px]" }, "Governance")), /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] leading-snug" }, "Audit & Risk Committee Board Charter"), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-2 leading-relaxed" }, "Direct board charter mandates quarterly reporting from Chief Privacy Officer, backed by executive Responsible Innovation Council.")), /* @__PURE__ */ h("div", { className: "mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium" }, /* @__PURE__ */ h("span", null, "Verified: Formal Board Charter"), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d7334]" }, "Score 4.0"))))), /* @__PURE__ */ h("div", { className: "apple-card overflow-hidden" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowArchitecture(!showArchitecture),
        className: "w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] transition cursor-pointer"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h("div", { className: "w-9 h-9 rounded-xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]" }, /* @__PURE__ */ h(SettingsIcon, { className: "w-5 h-5" })), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f]" }, "Technical Multi-Agent Architecture (6-Stage Pipeline)"), /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b]" }, "End-to-end evidence verification combining local RAG, Groq LLM inference, and deterministic scoring."))),
      /* @__PURE__ */ h("span", { className: "text-xs text-[#0071e3] font-semibold px-3 py-1.5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 inline-flex items-center gap-1.5 shrink-0" }, /* @__PURE__ */ h("span", null, showArchitecture ? "Hide Diagram" : "Inspect Diagram"), showArchitecture ? /* @__PURE__ */ h(ChevronUpIcon, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ h(ChevronDownIcon, { className: "w-3.5 h-3.5" }))
    ), showArchitecture ? /* @__PURE__ */ h("div", { className: "p-6 border-t border-black/5 animate-fade-in bg-white/50" }, /* @__PURE__ */ h(
      EvidenceToInsightFlow,
      {
        evidenceCount: metrics.evidence_records_count,
        coveragePct: assessment.evidence_coverage_pct,
        alignmentScore: assessment.overall_alignment_score,
        conflictCount: metrics.conflicts_count,
        recommendationCount: metrics.recommendations_count
      }
    )) : null), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#5856d6] text-white text-[10px] font-bold uppercase tracking-wider" }, "Groq AI Live Synthesis"), /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "AI Executive Briefing & Diagnostic Synthesis")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Powered by Groq with strict citation verification. Synthesizes extracted evidence and structural gaps.")), /* @__PURE__ */ h(
      "button",
      {
        onClick: handleRunGroqSynthesis,
        disabled: isGeneratingAi,
        className: "apple-btn-primary self-start sm:self-auto"
      },
      /* @__PURE__ */ h(SparklesIcon, { className: "w-4 h-4" }),
      /* @__PURE__ */ h("span", null, isGeneratingAi ? "Synthesizing AI Briefing..." : "Generate AI Briefing")
    )), /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row gap-2" }, /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: aiQuestion,
        onInput: (e) => setAiQuestion(e.target.value),
        placeholder: "Ask an organizational alignment question grounded in this period's evidence...",
        className: "flex-1 bg-[#f5f5f7] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
      }
    )), aiError ? /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-xs text-[#c9182b]" }, aiError) : null, aiResult ? /* @__PURE__ */ h("div", { className: "p-5 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between border-b border-black/5 pb-2.5" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f] text-sm" }, "Executive Diagnostic Briefing (", assessment.company_name, ")"), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 font-mono text-[11px] font-semibold" }, "Engine: ", aiResult.provider_used)), /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed text-sm" }, aiResult.executive_summary), aiResult.targeted_question_response && aiResult.targeted_question_response !== aiResult.executive_summary ? /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#f5f5f7] border border-black/8" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f] mb-1" }, "Targeted Diagnostic Response:"), /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed" }, aiResult.targeted_question_response)) : null, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-1" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d7334] mb-1" }, "Key Structural Strengths"), /* @__PURE__ */ h("ul", { className: "list-disc pl-4 space-y-1 text-[#1d7334]" }, (aiResult.key_strengths || []).map((s, i) => /* @__PURE__ */ h("li", { key: i }, s)))), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#fff7e6] border border-[#ffd580]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#b25e00] mb-1" }, "Key Structural Alignment Gaps"), /* @__PURE__ */ h("ul", { className: "list-disc pl-4 space-y-1 text-[#b25e00]" }, (aiResult.key_structural_gaps || []).map((g, i) => /* @__PURE__ */ h("li", { key: i }, g))))), /* @__PURE__ */ h("div", { className: "text-[11px] text-[#86868b] italic" }, /* @__PURE__ */ h("strong", null, "Evidence Limitation Disclosure:"), " ", aiResult.evidence_limitations_summary)) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ h("div", { className: "apple-card p-6" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "Stakeholder Alignment Score vs. Evidence Coverage"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b]" }, "Weighted by evaluator importance weights")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("stakeholders"),
        className: "text-xs text-[#0071e3] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
      },
      /* @__PURE__ */ h("span", null, "Adjust Weights"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })
    )), /* @__PURE__ */ h("div", { className: "space-y-3.5" }, stakeholders.map((sh) => {
      const score = sh.alignment_score;
      const barColor = score === null ? "bg-[#8e8e93]" : score >= 75 ? "bg-[#34c759]" : score >= 55 ? "bg-[#ff9500]" : "bg-[#ff3b30]";
      return /* @__PURE__ */ h("div", { key: sh.id, className: "space-y-1.5" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2 min-w-0" }, /* @__PURE__ */ h("span", { className: "font-semibold text-[#1d1d1f]" }, sh.name), /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-black/5 text-[#86868b] text-[10px] font-mono" }, sh.category, " \u2022 W:", sh.importance_weight, "x")), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-[#86868b]" }, "Cov: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f] tabular-nums" }, sh.evidence_coverage_pct, "%")), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f] w-14 text-right tabular-nums" }, score !== null ? `${score}%` : "Insuff."))), /* @__PURE__ */ h("div", { className: "w-full h-2 bg-[#e5e5ea] rounded-full overflow-hidden flex" }, /* @__PURE__ */ h(
        "div",
        {
          className: `${barColor} h-full rounded-full bar-grow`,
          style: { width: `${score !== null ? score : 0}%` }
        }
      )));
    }))), /* @__PURE__ */ h("div", { className: "space-y-6" }, /* @__PURE__ */ h("div", { className: "apple-card p-6" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "7 Organizational Structure Dimensions"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b]" }, "Structural suitability based on extracted evidence")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => onNavigate("structure"),
        className: "text-xs text-[#0071e3] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
      },
      /* @__PURE__ */ h("span", null, "Inspect Structure"),
      /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })
    )), /* @__PURE__ */ h("div", { className: "divide-y divide-black/5" }, dimensions_summary.map((d) => /* @__PURE__ */ h(
      "div",
      {
        key: d.id,
        className: "py-2.5 flex items-center justify-between text-xs"
      },
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-semibold text-[#1d1d1f]" }, d.dimension_name), /* @__PURE__ */ h("span", { className: "text-[#86868b] ml-2" }, "(", d.evidence_count, " citations)")),
      classificationBadge(d.suitability_classification)
    )))), /* @__PURE__ */ h("div", { className: "apple-card p-6" }, /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "Configured Diagnostic Priorities (", assessment.company_name, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5 mb-3" }, "Priority focus areas guiding retrieval and expectation discovery without predetermining conclusions"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2" }, (assessment.company_priorities || []).map((prio, idx) => /* @__PURE__ */ h(
      "span",
      {
        key: idx,
        className: "px-3 py-1 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] text-xs font-semibold"
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
          "Successfully ingested and indexed document(s). Click 'Re-Run Diagnostic Analysis' to update alignment scores."
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
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 space-y-5" }, /* @__PURE__ */ h("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(DocumentIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Document Ingestion & Metadata-Aware Indexing Pipeline")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Supported formats: ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3]" }, "PDF, DOCX, TXT, CSV, XLSX, PPTX"), " (with heading-preserving chunker and prompt-injection defense)")), /* @__PURE__ */ h(
      "button",
      {
        onClick: onRunAnalysis,
        className: "apple-btn-primary shrink-0"
      },
      /* @__PURE__ */ h(SparklesIcon, { className: "w-4 h-4" }),
      /* @__PURE__ */ h("span", null, "Re-Run Diagnostic Analysis")
    )), /* @__PURE__ */ h("form", { onSubmit: handleFileUpload, className: "space-y-4" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Select File(s) (Multiple Allowed)"), /* @__PURE__ */ h(
      "input",
      {
        type: "file",
        multiple: true,
        accept: ".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md",
        className: "w-full text-xs text-[#515154] border border-black/10 rounded-xl p-2 bg-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Document Category"), /* @__PURE__ */ h(
      "select",
      {
        value: category,
        onChange: (e) => setCategory(e.target.value),
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Custom Title (Optional)"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: customTitle,
        onInput: (e) => setCustomTitle(e.target.value),
        placeholder: "e.g., FY2025 Form 10-K Governance Excerpt",
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Financial Year"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: docFy,
        onInput: (e) => setDocFy(e.target.value),
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Publication Date"), /* @__PURE__ */ h(
      "input",
      {
        type: "date",
        value: pubDate,
        onInput: (e) => setPubDate(e.target.value),
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-xs font-semibold text-[#1d1d1f] mb-1.5" }, "Source URL (Optional)"), /* @__PURE__ */ h(
      "input",
      {
        type: "url",
        value: sourceUrl,
        onInput: (e) => setSourceUrl(e.target.value),
        placeholder: "https://investor...",
        className: "w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: uploading,
        className: "apple-btn-primary w-full"
      },
      uploading ? "Processing Pipeline..." : "Upload & Index Documents"
    )))), uploadStatus ? /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-xs text-[#0066cc] font-medium" }, uploadStatus) : null), /* @__PURE__ */ h("div", { className: "apple-card overflow-hidden stagger-2" }, /* @__PURE__ */ h("div", { className: "p-5 border-b border-black/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f]" }, "Indexed Assessment Documents (", documents.length, ")"), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b]" }, "Source documents preserved with immutable coordinates")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-[#f5f5f7] text-[#86868b] border-b border-black/8" }, /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "ID & Title"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Category"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "FY / Pub Date"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Format"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Chunks"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Status & Security"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold text-right" }, "Actions"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-black/5" }, documents.map((doc) => /* @__PURE__ */ h("tr", { key: doc.id, className: "hover:bg-black/[0.02] transition" }, /* @__PURE__ */ h("td", { className: "p-3.5 font-semibold text-[#1d1d1f]" }, /* @__PURE__ */ h("div", null, "#", doc.id, " \u2014 ", doc.title), doc.source_url ? /* @__PURE__ */ h(
      "a",
      {
        href: doc.source_url,
        target: "_blank",
        rel: "noreferrer",
        className: "text-[11px] text-[#0071e3] hover:underline font-normal break-all"
      },
      doc.source_url
    ) : null), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#515154]" }, doc.category), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#86868b] font-mono whitespace-nowrap" }, doc.financial_year, " \u2022 ", doc.publication_date || "N/A"), /* @__PURE__ */ h("td", { className: "p-3.5" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] font-mono font-bold text-[#1d1d1f] border border-black/10" }, doc.file_type)), /* @__PURE__ */ h("td", { className: "p-3.5 font-bold text-[#0071e3] font-mono whitespace-nowrap" }, doc.chunk_count, " chunks"), /* @__PURE__ */ h("td", { className: "p-3.5" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h(
      "span",
      {
        className: `px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${doc.processing_status === "completed" ? "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]" : "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]"}`
      },
      doc.processing_status
    ), doc.prompt_injection_flag ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#fff7e6] text-[#b25e00] border border-[#ffd580] text-[10px] font-bold" }, "Injection Neutralized") : /* @__PURE__ */ h("span", { className: "text-[11px] text-[#1d7334] font-semibold" }, "Clean Source"))), /* @__PURE__ */ h("td", { className: "p-3.5 text-right whitespace-nowrap" }, /* @__PURE__ */ h("div", { className: "inline-flex items-center gap-2" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: () => inspectDoc(doc.id),
        className: "px-3 py-1.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-semibold hover:bg-[#d6e9fd] transition"
      },
      "Inspect Chunks"
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => handleArchiveDoc(doc.id),
        className: "px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#515154] hover:bg-[#fdeef0] hover:text-[#c9182b] border border-black/10 transition font-semibold"
      },
      "Archive"
    ))))))))), selectedDocDetails ? /* @__PURE__ */ h("div", { className: "apple-card p-6 border-[#0071e3]/30 space-y-4 animate-fade-in" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 pb-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-sm font-bold text-[#0071e3]" }, "Metadata-Aware Chunk Inspector: ", selectedDocDetails.title), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Preserving Page Numbers, Section Headings, Financial Year (", selectedDocDetails.financial_year, "), and Vector Embeddings")), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setSelectedDocDetails(null),
        className: "apple-btn-secondary self-start sm:self-auto"
      },
      "Close Inspector"
    )), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1" }, (selectedDocDetails.chunks || []).map((ch) => /* @__PURE__ */ h(
      "div",
      {
        key: ch.id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[#0071e3] font-bold" }, /* @__PURE__ */ h("span", null, "Chunk #", ch.chunk_index + 1, " \u2022 Page ", ch.page_number), /* @__PURE__ */ h("span", { className: "text-[11px] text-[#86868b] font-mono" }, ch.token_count, " tokens")),
      /* @__PURE__ */ h("div", { className: "font-semibold text-[#1d1d1f]" }, "Section: ", ch.section_heading),
      /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed whitespace-pre-wrap" }, ch.content)
    )))) : null, /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] flex items-center gap-2" }, /* @__PURE__ */ h(SearchIcon, { className: "w-4 h-4 text-[#0071e3]" }), /* @__PURE__ */ h("span", null, "Knowledge Base Vector RAG Retrieval & Metadata Filter")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Query the vector index directly with metadata filtering by category and assessment period")), /* @__PURE__ */ h("form", { onSubmit: handleSearchRag, className: "flex flex-col sm:flex-row gap-3" }, /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: ragQuery,
        onInput: (e) => setRagQuery(e.target.value),
        placeholder: "Search organizational mechanisms (e.g., 'dual-class voting', 'teen safety', 'privacy committee')...",
        className: "flex-1 text-xs border border-black/10 rounded-xl px-3.5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    ), /* @__PURE__ */ h(
      "select",
      {
        value: ragCategoryFilter,
        onChange: (e) => setRagCategoryFilter(e.target.value),
        className: "text-xs border border-black/10 rounded-xl px-3.5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      /* @__PURE__ */ h("option", { value: "" }, "All Document Categories"),
      DOCUMENT_CATEGORIES.map((c) => /* @__PURE__ */ h("option", { key: c, value: c }, c))
    ), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: searchingRag,
        className: "apple-btn-primary shrink-0"
      },
      searchingRag ? "Searching..." : "Retrieve Vector Chunks"
    )), ragResults.length > 0 ? /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 pt-2" }, ragResults.map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.chunk_id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-[#1d1d1f] gap-2" }, /* @__PURE__ */ h("span", null, "Page ", r.page_number, " \u2014 ", r.section_heading), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-mono shrink-0" }, (r.similarity_score * 100).toFixed(1), "% Match")),
      /* @__PURE__ */ h("div", { className: "text-[11px] text-[#86868b]" }, "Category: ", r.document_category, " | FY: ", r.financial_year),
      /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed mt-1" }, r.content)
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
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-[#86868b] font-medium text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" }), "Loading Stakeholder \xD7 Structure Alignment Matrix...");
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
        return "bg-[#eaf8ee] border-[#a3e4b7] text-[#1d7334] hover:bg-[#daf3e2] hover:border-[#34c759]";
      if (status === "Partial Alignment")
        return "bg-[#fff7e6] border-[#ffd580] text-[#b25e00] hover:bg-[#ffefc9] hover:border-[#ff9500]";
      if (status === "Potential Misalignment")
        return "bg-[#fdeef0] border-[#f9abb4] text-[#c9182b] hover:bg-[#fadbe0] hover:border-[#ff3b30]";
      return "bg-[#f5f5f7] border-[#d1d1d6] text-[#636366] hover:bg-[#e5e5ea]";
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(MatrixIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Interactive Stakeholder \xD7 Organizational Structure Alignment Matrix")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Click any cell to inspect exact page citations, root causes, score formula calculation, and manual audit override controls.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2 text-[11px] shrink-0" }, /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full bg-[#eaf8ee] text-[#1d7334] font-bold border border-[#a3e4b7]" }, "Strong (4.0)"), /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full bg-[#fff7e6] text-[#b25e00] font-bold border border-[#ffd580]" }, "Partial (3.0)"), /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full bg-[#fdeef0] text-[#c9182b] font-bold border border-[#f9abb4]" }, "Misaligned (1.0)"), /* @__PURE__ */ h("span", { className: "px-3 py-1 rounded-full bg-[#f2f2f7] text-[#636366] font-bold border border-[#d1d1d6]" }, "Insufficient (N/A)"))), /* @__PURE__ */ h("div", { className: "apple-card overflow-x-auto stagger-2" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-[#f5f5f7] text-[#515154] border-b border-black/8" }, /* @__PURE__ */ h("th", { className: "p-3.5 font-bold min-w-[230px] text-[#1d1d1f]" }, "Stakeholder Group (Score / Cov)"), dimensions.map((d) => /* @__PURE__ */ h(
      "th",
      {
        key: d.code,
        className: "p-3.5 font-bold text-center min-w-[145px] capitalize border-l border-black/8"
      },
      /* @__PURE__ */ h("div", { className: "text-[#1d1d1f]" }, d.code),
      /* @__PURE__ */ h("div", { className: "text-[10px] font-semibold text-[#0071e3] mt-0.5" }, d.suitability_classification.replace(" Alignment", ""))
    )))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-black/5" }, stakeholders.map((sh) => {
      const shAssessments = assessments.filter(
        (a) => a.stakeholder_id === sh.id
      );
      return /* @__PURE__ */ h("tr", { key: sh.id, className: "hover:bg-black/[0.015] transition" }, /* @__PURE__ */ h("td", { className: "p-3.5 bg-[#fbfbfd] font-bold text-[#1d1d1f] border-r border-black/8" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ h("span", { className: "text-[#1d1d1f]" }, sh.name), /* @__PURE__ */ h("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-white text-[#515154] border border-black/10 shrink-0" }, sh.category)), /* @__PURE__ */ h("div", { className: "text-[11px] font-medium text-[#86868b] mt-1 tabular-nums" }, "Align:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3]" }, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), " ", "\u2022 Cov:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, sh.evidence_coverage_pct, "%"))), dimensions.map((dim) => {
        const matchingCells = shAssessments.filter(
          (a) => a.organizational_dimension === dim.code
        );
        return /* @__PURE__ */ h(
          "td",
          {
            key: dim.code,
            className: "p-2 border-l border-black/5 align-top"
          },
          matchingCells.length === 0 ? /* @__PURE__ */ h("div", { className: "h-14 flex items-center justify-center text-[11px] text-[#aeaeb2] font-mono" }, "\u2014") : /* @__PURE__ */ h("div", { className: "space-y-1.5" }, matchingCells.map((cell) => {
            const isAct = activeCell && activeCell.id === cell.id;
            return /* @__PURE__ */ h(
              "button",
              {
                key: cell.id,
                onClick: () => handleSelectCell(cell),
                className: `w-full text-left p-2.5 rounded-xl border transition ${getCellStyle(
                  cell.classification
                )} ${isAct ? "ring-2 ring-[#0071e3] shadow-md" : ""}`
              },
              /* @__PURE__ */ h("div", { className: "flex items-center justify-between font-bold text-[11px]" }, /* @__PURE__ */ h("span", null, cell.classification.replace(
                " Alignment",
                ""
              )), /* @__PURE__ */ h("span", { className: "font-mono tabular-nums" }, cell.numeric_score !== null ? `${cell.numeric_score}/4` : "N/A")),
              /* @__PURE__ */ h("div", { className: "text-[10px] truncate mt-0.5 opacity-90 font-medium" }, cell.expectation_title),
              cell.is_overridden ? /* @__PURE__ */ h("div", { className: "text-[9px] font-extrabold uppercase text-[#0071e3] mt-0.5" }, "[Overridden]") : null
            );
          }))
        );
      }));
    })))), activeCell ? /* @__PURE__ */ h("div", { className: "apple-card overflow-hidden border-[#0071e3]/30 stagger-3" }, /* @__PURE__ */ h("div", { className: "bg-[#f5f5f7] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-black/8" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2 text-xs text-[#0071e3] font-bold uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Diagnostic Evidence Inspector"), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Stakeholder: ", activeCell.stakeholder_name), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", { className: "font-mono" }, "Dimension: ", activeCell.organizational_dimension.toUpperCase())), /* @__PURE__ */ h("h3", { className: "text-lg font-bold mt-1 text-[#1d1d1f] tracking-tight" }, activeCell.expectation_title), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-0.5" }, activeCell.expectation_description)), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3 shrink-0" }, classificationBadge(activeCell.classification), /* @__PURE__ */ h("div", { className: "bg-white px-3.5 py-1.5 rounded-full border border-black/10 text-xs font-mono text-[#515154] shadow-sm" }, "Score:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3]" }, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "N/A (Excluded)"), " ", "\xD7 Weight ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, activeCell.requirement_weight, "x")))), /* @__PURE__ */ h("div", { className: "p-6 grid grid-cols-1 lg:grid-cols-3 gap-6" }, /* @__PURE__ */ h("div", { className: "lg:col-span-2 space-y-5" }, /* @__PURE__ */ h("div", { className: "bg-[#f5f5f7] p-4 rounded-2xl border border-black/8 space-y-1.5" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#0071e3] uppercase tracking-wider" }, "Diagnostic Rationale & Evaluation"), /* @__PURE__ */ h("p", { className: "text-xs text-[#1d1d1f] leading-relaxed" }, activeCell.rationale)), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#86868b] uppercase tracking-wider" }, "Identified Organizational Mechanisms"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-2" }, (activeCell.mapped_mechanisms || []).map((m, i) => /* @__PURE__ */ h(
      "span",
      {
        key: i,
        className: "px-3 py-1 rounded-full bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] text-xs font-semibold"
      },
      m
    )))), /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold text-[#86868b] uppercase tracking-wider" }, "Root Causes & Structural Constraints"), /* @__PURE__ */ h("div", { className: "space-y-2" }, (activeCell.root_cause_diagnosis || []).map((rc, i) => /* @__PURE__ */ h(
      "div",
      {
        key: i,
        className: "p-3.5 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-xs text-[#1d1d1f] flex items-start gap-2.5"
      },
      /* @__PURE__ */ h("span", { className: "w-5 h-5 rounded-full bg-[#ff3b30] text-white font-bold flex items-center justify-center shrink-0 text-[11px]" }, "!"),
      /* @__PURE__ */ h("span", { className: "leading-relaxed" }, rc)
    )))), /* @__PURE__ */ h("div", { className: "space-y-2.5" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-bold text-[#86868b] uppercase tracking-wider" }, /* @__PURE__ */ h("span", null, "Supporting Evidence Records (", activeCell.evidence_records.length, ")"), /* @__PURE__ */ h("span", { className: "text-[#0071e3] font-semibold" }, "Quotation Provenance Verified")), activeCell.evidence_records.length === 0 ? /* @__PURE__ */ h("div", { className: "p-4 rounded-xl bg-[#f5f5f7] border border-black/8 text-xs text-[#86868b] italic" }, "Insufficient Evidence: No supporting documents or verifiable disclosures were found in this assessment period.") : /* @__PURE__ */ h("div", { className: "space-y-3" }, activeCell.evidence_records.map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-2 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, ev.document_name), /* @__PURE__ */ h("span", { className: "text-[#86868b]" }, "(p. ", ev.page_number, ")")), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] font-mono text-[10px] font-bold" }, "Quality: ", Math.round((ev.quality_score || 0.8) * 100), "%")),
      /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-white border-l-2 border-[#0071e3] italic text-[#1d1d1f] text-xs leading-relaxed" }, "\u201C", ev.exact_quotation, "\u201D"),
      ev.is_contradictory ? /* @__PURE__ */ h("div", { className: "text-[11px] text-[#b25e00] font-semibold flex items-center gap-1.5" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-[#ff9500]" }), /* @__PURE__ */ h("span", null, "Marked as Contradictory: Clashes with countervailing external or operational findings.")) : null
    ))))), /* @__PURE__ */ h("div", { className: "space-y-5" }, /* @__PURE__ */ h("div", { className: "bg-[#f5f5f7] p-4 rounded-2xl border border-black/8 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f] uppercase tracking-wider text-[11px]" }, "Score Calculation Transparency"), /* @__PURE__ */ h("div", { className: "space-y-2 text-[#515154]" }, /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Base Numeric Score:"), /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f] font-mono" }, activeCell.numeric_score !== null ? `${activeCell.numeric_score} / 4.0` : "Excluded")), /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Requirement Weight:"), /* @__PURE__ */ h("strong", { className: "text-[#5856d6] font-mono" }, activeCell.requirement_weight, "x")), /* @__PURE__ */ h("div", { className: "flex justify-between" }, /* @__PURE__ */ h("span", null, "Weighted Contribution:"), /* @__PURE__ */ h("strong", { className: "text-[#0071e3] font-mono" }, activeCell.numeric_score !== null ? `${(activeCell.numeric_score * activeCell.requirement_weight).toFixed(2)} pts` : "0.00 pts")), /* @__PURE__ */ h("div", { className: "flex justify-between border-t border-black/8 pt-2" }, /* @__PURE__ */ h("span", null, "Evidence Quality Score:"), /* @__PURE__ */ h("strong", { className: "text-[#1d7334] font-mono" }, Math.round((activeCell.evidence_quality_score || 0) * 100), "%")))), /* @__PURE__ */ h("div", { className: "bg-[#fbfbfd] p-4 rounded-2xl border border-[#0071e3]/25 space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#0071e3] uppercase tracking-wider flex items-center justify-between text-[11px]" }, /* @__PURE__ */ h("span", null, "Evaluator Manual Override"), /* @__PURE__ */ h("span", { className: "text-[10px] font-medium text-[#86868b]" }, "Audit Trail Logged")), /* @__PURE__ */ h("p", { className: "text-[#515154] text-[11px] leading-relaxed" }, "Override AI classification if proprietary context or unindexed evidence justifies a revision."), overrideMsg ? /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] text-xs font-medium" }, overrideMsg) : null, /* @__PURE__ */ h("form", { onSubmit: handleOverrideSubmit, className: "space-y-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-[#1d1d1f] font-semibold mb-1" }, "New Classification:"), /* @__PURE__ */ h(
      "select",
      {
        value: overrideClass,
        onChange: (e) => setOverrideClass(e.target.value),
        className: "w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3]"
      },
      /* @__PURE__ */ h("option", { value: "Strong Alignment" }, "Strong Alignment (4.0)"),
      /* @__PURE__ */ h("option", { value: "Partial Alignment" }, "Partial Alignment (3.0)"),
      /* @__PURE__ */ h("option", { value: "Potential Misalignment" }, "Potential Misalignment (1.0)"),
      /* @__PURE__ */ h("option", { value: "Insufficient Evidence" }, "Insufficient Evidence (N/A)")
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block text-[#1d1d1f] font-semibold mb-1" }, "Mandatory Evaluator Justification:"), /* @__PURE__ */ h(
      "textarea",
      {
        rows: 3,
        value: overrideJustification,
        onInput: (e) => setOverrideJustification(e.target.value),
        placeholder: "Explain organizational rationale, supporting document citations, or internal policy evidence...",
        className: "w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
      }
    )), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        disabled: savingOverride,
        className: "apple-btn-primary w-full"
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
    const criticalCount = recommendations.filter((r) => r.priority === "Critical").length;
    const highCount = recommendations.filter((r) => r.priority === "High").length;
    const activeCount = recommendations.filter(
      (r) => r.status === "Accepted" || r.status === "Implemented"
    ).length;
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
      Proposed: "bg-[#f2f2f7] text-[#515154] border-[#d1d1d6]",
      Accepted: "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff]",
      Implemented: "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]",
      Rejected: "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]"
    };
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-1" }, /* @__PURE__ */ h("div", { className: "apple-card p-4 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold uppercase tracking-wider text-[#86868b]" }, "Total Reforms"), /* @__PURE__ */ h("div", { className: "text-2xl font-bold text-[#1d1d1f] mt-1 tabular-nums" }, recommendations.length)), /* @__PURE__ */ h("span", { className: "w-9 h-9 rounded-xl bg-[#e8f2fe] text-[#0071e3] flex items-center justify-center" }, /* @__PURE__ */ h(LightbulbIcon, { className: "w-5 h-5" }))), /* @__PURE__ */ h("div", { className: "apple-card p-4 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold uppercase tracking-wider text-[#86868b]" }, "Critical Priority"), /* @__PURE__ */ h("div", { className: "text-2xl font-bold text-[#d70015] mt-1 tabular-nums" }, criticalCount)), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-full bg-[#fdeef0] border border-[#f9abb4] text-[#c9182b] text-[11px] font-bold" }, "Urgent")), /* @__PURE__ */ h("div", { className: "apple-card p-4 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold uppercase tracking-wider text-[#86868b]" }, "High Priority"), /* @__PURE__ */ h("div", { className: "text-2xl font-bold text-[#b25e00] mt-1 tabular-nums" }, highCount)), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-full bg-[#fff7e6] border border-[#ffd580] text-[#b25e00] text-[11px] font-bold" }, "Keystone")), /* @__PURE__ */ h("div", { className: "apple-card p-4 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-[11px] font-bold uppercase tracking-wider text-[#86868b]" }, "Adopted / Active"), /* @__PURE__ */ h("div", { className: "text-2xl font-bold text-[#1d7334] mt-1 tabular-nums" }, activeCount)), /* @__PURE__ */ h("span", { className: "px-2.5 py-1 rounded-full bg-[#eaf8ee] border border-[#a3e4b7] text-[#1d7334] text-[11px] font-bold" }, "Tracked"))), /* @__PURE__ */ h("div", { className: "apple-card p-5 stagger-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", { className: "text-base font-bold text-[#1d1d1f] tracking-tight" }, "Actionable Structural & Governance Recommendations (", filtered.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Organizational design changes, reporting line reforms, and governance controls grounded in extracted evidence.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8" }, ["ALL", "Critical", "High", "Medium", "Low"].map((p) => /* @__PURE__ */ h(
      "button",
      {
        key: p,
        onClick: () => setPriorityFilter(p),
        className: `px-3 py-1 rounded-full font-semibold transition ${priorityFilter === p ? "bg-[#0071e3] text-white shadow-sm" : "text-[#515154] hover:text-[#1d1d1f]"}`
      },
      p
    ))), /* @__PURE__ */ h(
      "select",
      {
        value: statusFilter,
        onChange: (e) => setStatusFilter(e.target.value),
        className: "border border-black/10 rounded-full px-3.5 py-1.5 bg-white text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] shadow-sm"
      },
      /* @__PURE__ */ h("option", { value: "ALL" }, "All Statuses"),
      /* @__PURE__ */ h("option", { value: "Proposed" }, "Proposed"),
      /* @__PURE__ */ h("option", { value: "Accepted" }, "Accepted"),
      /* @__PURE__ */ h("option", { value: "Implemented" }, "Implemented"),
      /* @__PURE__ */ h("option", { value: "Rejected" }, "Rejected")
    ))), filtered.length === 0 ? /* @__PURE__ */ h("div", { className: "apple-card p-10 text-center space-y-3 stagger-3" }, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f]" }, recommendations.length === 0 ? "No recommendations generated for this assessment period yet." : "No recommendations match the selected Priority / Status filters."), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b]" }, recommendations.length === 0 ? "Run the AI Diagnostic from the top bar to generate prioritized organizational reforms." : "Reset your filters to view all available recommendations for this period."), recommendations.length > 0 ? /* @__PURE__ */ h(
      "button",
      {
        onClick: () => {
          setPriorityFilter("ALL");
          setStatusFilter("ALL");
        },
        className: "apple-btn-secondary"
      },
      "Reset All Filters"
    ) : null) : /* @__PURE__ */ h("div", { className: "space-y-4" }, filtered.map((rec, idx) => /* @__PURE__ */ h(
      "div",
      {
        key: rec.id,
        className: `apple-card p-6 space-y-4 card-hover ${idx < 4 ? `stagger-${idx + 2}` : "animate-fade-in"}`
      },
      /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-black/8 pb-4" }, /* @__PURE__ */ h("div", { className: "space-y-2" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-black/10 text-[#515154] text-[11px] font-mono font-bold" }, "REC #", rec.id), priorityBadge(rec.priority), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] text-[11px] font-mono font-semibold border border-[#b3d7ff] uppercase" }, rec.organizational_dimension), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[11px] border border-black/8 font-medium" }, "Difficulty: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, rec.implementation_difficulty))), /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f] tracking-tight leading-snug" }, rec.title)), /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-[11px] font-semibold text-[#86868b]" }, "Status:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: updatingId === rec.id,
          value: rec.status,
          onChange: (e) => handleStatusChange(rec.id, e.target.value),
          className: `text-xs font-bold px-3.5 py-1.5 rounded-full border focus:outline-none cursor-pointer ${statusStyles[rec.status] || statusStyles.Proposed}`
        },
        /* @__PURE__ */ h("option", { value: "Proposed" }, "Proposed"),
        /* @__PURE__ */ h("option", { value: "Accepted" }, "Accepted"),
        /* @__PURE__ */ h("option", { value: "Implemented" }, "Implemented"),
        /* @__PURE__ */ h("option", { value: "Rejected" }, "Rejected")
      ))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#c9182b] uppercase tracking-wider text-[11px]" }, "Identified Structural Issue"), /* @__PURE__ */ h("p", { className: "text-[#1d1d1f] leading-relaxed" }, rec.identified_issue)), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#0066cc] uppercase tracking-wider text-[11px]" }, "Required Governance Reform"), /* @__PURE__ */ h("p", { className: "text-[#1d1d1f] leading-relaxed font-medium" }, rec.suggested_organizational_change))),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] leading-relaxed" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d7334]" }, "Expected Benefit:", " "), /* @__PURE__ */ h("span", { className: "text-[#1d1d1f]" }, rec.expected_benefit)), /* @__PURE__ */ h("div", { className: "p-3.5 rounded-xl bg-[#fff7e6] border border-[#ffd580] leading-relaxed" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#b25e00]" }, "Implementation Trade-offs:", " "), /* @__PURE__ */ h("span", { className: "text-[#1d1d1f]" }, rec.possible_tradeoffs))),
      (rec.evidence_ids || []).length > 0 ? /* @__PURE__ */ h("div", { className: "pt-3 border-t border-black/8 flex flex-wrap items-center gap-2 text-[11px]" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#86868b] uppercase tracking-wider" }, "Evidence Citations:"), rec.evidence_ids.map((id) => evMap.get(id)).filter(Boolean).map((ev) => /* @__PURE__ */ h(
        "span",
        {
          key: ev.id,
          className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f5f5f7] border border-black/8 text-[#1d1d1f] font-medium"
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
      return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(SearchIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Traceable Evidence Repository & Quality Scoring (", evidenceList.length, " Records)")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2.5 shrink-0" }, /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
          className: "apple-btn-secondary"
        },
        /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4 text-[#0071e3]" }),
        /* @__PURE__ */ h("span", null, "Export Evidence CSV")
      ), /* @__PURE__ */ h(
        "a",
        {
          href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
          className: "apple-btn-primary"
        },
        /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4" }),
        /* @__PURE__ */ h("span", null, "Export Evidence Excel (.xlsx)")
      ))), /* @__PURE__ */ h("div", { className: "apple-card p-4 stagger-2 flex flex-wrap items-center justify-between gap-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#86868b] mr-1" }, "Filter by Classification:"), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8" }, [
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
          className: `px-3 py-1 rounded-full font-semibold transition ${evFilter === cl ? "bg-[#0071e3] text-white shadow-sm" : "text-[#515154] hover:text-[#1d1d1f]"}`
        },
        cl.replace(/_/g, " ")
      )))), /* @__PURE__ */ h("label", { className: "flex items-center gap-2 cursor-pointer font-semibold text-[#c9182b]" }, /* @__PURE__ */ h(
        "input",
        {
          type: "checkbox",
          checked: contradictoryOnly,
          onChange: (e) => setContradictoryOnly(e.target.checked)
        }
      ), /* @__PURE__ */ h("span", null, "Show Only Contradictory Evidence"))), /* @__PURE__ */ h("div", { className: "space-y-3 stagger-3" }, filteredEv.length === 0 ? /* @__PURE__ */ h("div", { className: "apple-card p-10 text-center text-xs text-[#86868b]" }, "No evidence records match the selected filter criteria.") : filteredEv.map((ev) => /* @__PURE__ */ h(
        "div",
        {
          key: ev.id,
          className: "apple-card p-5 space-y-2.5 text-xs card-hover"
        },
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-mono font-bold text-[#0071e3]" }, "Evidence #", ev.id), evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] font-mono uppercase text-[10px] border border-black/8" }, "Dimension: ", ev.organizational_dimension), ev.is_contradictory ? /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#fdeef0] text-[#c9182b] border border-[#f9abb4] font-bold text-[10px]" }, "Contradictory") : null), /* @__PURE__ */ h("div", { className: "flex items-center gap-3 text-[#86868b]" }, /* @__PURE__ */ h("span", null, "Confidence: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, ev.confidence_level)), /* @__PURE__ */ h("span", null, "Quality:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3] font-mono tabular-nums" }, Math.round(ev.quality_score * 100), "%")))),
        /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f] text-sm" }, ev.extracted_statement),
        /* @__PURE__ */ h("blockquote", { className: "p-3.5 rounded-xl bg-[#f5f5f7] border-l-4 border-[#0071e3] italic text-[#1d1d1f] leading-relaxed" }, "\u201C", ev.exact_quotation, "\u201D"),
        /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between text-[11px] text-[#86868b] pt-1 gap-2" }, /* @__PURE__ */ h("span", null, "Document: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, ev.document_name), " \u2022 Page", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, ev.page_number), " \u2022 Section:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, ev.section_heading)), /* @__PURE__ */ h("span", { className: "font-mono text-[#0066cc] font-semibold" }, "FY: ", ev.financial_year, " | Pub: ", ev.publication_date || "N/A"))
      ))));
    }
    if (!report) {
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-[#86868b] font-medium text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" }), "Generating 14-section evidence diagnostic report...");
    }
    const sec = report.sections;
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-[#0071e3] uppercase tracking-wider flex items-center gap-1.5" }, /* @__PURE__ */ h(ReportIcon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ h("span", null, "Comprehensive 14-Section Diagnostic Report")), /* @__PURE__ */ h("h2", { className: "text-xl font-bold mt-1 text-[#1d1d1f] tracking-tight" }, report.company_name, " \u2014 ", report.assessment_title), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1 font-mono" }, "Overall Alignment:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3]" }, report.overall_alignment_score, "%"), " | Evidence Coverage:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d7334]" }, report.evidence_coverage_pct, "%"))), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2.5 shrink-0" }, /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/pdf`,
        className: "apple-btn-primary"
      },
      /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4" }),
      /* @__PURE__ */ h("span", null, "Export PDF (.pdf)")
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/docx`,
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4 text-[#0071e3]" }),
      /* @__PURE__ */ h("span", null, "Export Word (.docx)")
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-csv`,
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4 text-[#515154]" }),
      /* @__PURE__ */ h("span", null, "Evidence CSV")
    ), /* @__PURE__ */ h(
      "a",
      {
        href: `/api/reports/${assessmentPeriodId}/export/evidence-xlsx`,
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h(DownloadIcon, { className: "w-4 h-4 text-[#1d7334]" }),
      /* @__PURE__ */ h("span", null, "Evidence XLSX")
    ))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-6 text-xs stagger-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["1_executive_summary"].title), /* @__PURE__ */ h("p", { className: "mt-2.5 text-[#515154] leading-relaxed text-sm" }, sec["1_executive_summary"].summary_narrative)), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["2_company_overview"].title, " &", " ", sec["3_assessment_methodology"].title), /* @__PURE__ */ h("p", { className: "mt-2.5 text-[#515154] leading-relaxed" }, /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, sec["2_company_overview"].company_name), " ", "(", sec["2_company_overview"].industry, "):", " ", sec["2_company_overview"].description), /* @__PURE__ */ h("div", { className: "mt-2.5 flex flex-wrap gap-1.5" }, (sec["2_company_overview"].analysis_priorities || []).map(
      (p, i) => /* @__PURE__ */ h(
        "span",
        {
          key: i,
          className: "px-3 py-1 rounded-full bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] font-semibold"
        },
        p
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["4_stakeholder_landscape"].title, " &", " ", sec["5_stakeholder_expectations"].title), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" }, (sec["4_stakeholder_landscape"].internal_stakeholders.concat(
      sec["4_stakeholder_landscape"].external_stakeholders
    ) || []).map((s, idx) => /* @__PURE__ */ h(
      "div",
      {
        key: idx,
        className: "p-3.5 rounded-2xl bg-[#fbfbfd] border border-black/8 flex items-center justify-between gap-3"
      },
      /* @__PURE__ */ h("div", { className: "min-w-0" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, s.name), /* @__PURE__ */ h("span", { className: "text-[#86868b] ml-2" }, "(W: ", s.importance_weight, "x, Influence: ", s.influence_level, ")")),
      /* @__PURE__ */ h("div", { className: "font-mono font-bold text-[#0071e3] shrink-0 tabular-nums" }, s.alignment_score !== null ? `${s.alignment_score}%` : "N/A", " ", "(Cov: ", s.evidence_coverage_pct, "%)")
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["6_organizational_structure_analysis"].title), /* @__PURE__ */ h("div", { className: "space-y-2.5 mt-3" }, (sec["6_organizational_structure_analysis"].dimensions || []).map(
      (d) => /* @__PURE__ */ h(
        "div",
        {
          key: d.dimension_code,
          className: "p-3.5 rounded-2xl border border-black/8 bg-[#fbfbfd] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, d.dimension_name), /* @__PURE__ */ h("p", { className: "text-[#515154] mt-0.5 leading-relaxed" }, d.assessment_summary)),
        /* @__PURE__ */ h("div", { className: "shrink-0" }, classificationBadge(d.suitability_classification))
      )
    ))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["10_key_organizational_gaps"].title, " &", " ", sec["11_recommendations"].title), /* @__PURE__ */ h("div", { className: "space-y-2.5 mt-3" }, (sec["11_recommendations"].recommendations || []).map((r) => /* @__PURE__ */ h(
      "div",
      {
        key: r.id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-1.5"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, priorityBadge(r.priority), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, r.title)), /* @__PURE__ */ h("span", { className: "font-semibold text-[#0071e3] font-mono" }, r.status)),
      /* @__PURE__ */ h("p", { className: "text-[#515154] leading-relaxed" }, r.suggested_organizational_change)
    )))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2" }, sec["12_evidence_limitations"].title, " &", " ", sec["13_sources_and_references"].title), /* @__PURE__ */ h("div", { className: "mt-2.5 p-4 rounded-2xl bg-[#fff7e6] border border-[#ffd580] text-[#1d1d1f] leading-relaxed" }, sec["12_evidence_limitations"].limitation_statement))));
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
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-1" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#5856d6] text-white text-[10px] font-bold uppercase tracking-wider" }, "Groq Cloud LLM"), /* @__PURE__ */ h("h3", { className: "text-base font-bold text-[#1d1d1f]" }, "AI Inference Engine & Groq API Configuration")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Active Provider: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, llmConfig.llm_provider), " | Model:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3] font-mono" }, llmConfig.llm_model), " | Key Status:", " ", /* @__PURE__ */ h(
      "span",
      {
        className: llmConfig.groq_configured ? "text-[#1d7334] font-bold font-mono" : "text-[#b25e00] font-bold font-mono"
      },
      llmConfig.masked_groq_key
    )))), /* @__PURE__ */ h("form", { onSubmit: handleSaveLlmConfig, className: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1.5" }, "Groq Model"), /* @__PURE__ */ h(
      "select",
      {
        value: llmModelInput,
        onChange: (e) => setLlmModelInput(e.target.value),
        className: "w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      /* @__PURE__ */ h("option", { value: "llama-3.3-70b-versatile" }, "llama-3.3-70b-versatile (Recommended)"),
      /* @__PURE__ */ h("option", { value: "llama-3.1-8b-instant" }, "llama-3.1-8b-instant"),
      /* @__PURE__ */ h("option", { value: "mixtral-8x7b-32768" }, "mixtral-8x7b-32768")
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1.5" }, "Update Groq API Key (Optional if in .env)"), /* @__PURE__ */ h(
      "input",
      {
        type: "password",
        value: newGroqKey,
        onInput: (e) => setNewGroqKey(e.target.value),
        placeholder: llmConfig.groq_configured ? `Active: ${llmConfig.masked_groq_key}` : "gsk_...",
        className: "w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-mono placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    )), /* @__PURE__ */ h("div", { className: "flex items-end" }, /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        className: "apple-btn-primary w-full"
      },
      "Save Groq AI Settings"
    ))), llmMsg ? /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] text-xs text-[#1d7334] font-mono font-medium" }, llmMsg) : null), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-2" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] flex items-center gap-2" }, /* @__PURE__ */ h(ShieldIcon, { className: "w-4 h-4 text-[#0071e3]" }), /* @__PURE__ */ h("span", null, "Authentication & Role-Based Access Control (RBAC)")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.")), /* @__PURE__ */ h("form", { onSubmit: handleSaveRole, className: "space-y-3 text-xs" }, /* @__PURE__ */ h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1.5" }, "Evaluator Name"), /* @__PURE__ */ h(
      "input",
      {
        type: "text",
        value: userName,
        onInput: (e) => setUserName(e.target.value),
        className: "w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
      }
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1.5" }, "Access Role"), /* @__PURE__ */ h(
      "select",
      {
        value: userRole,
        onChange: (e) => setUserRole(e.target.value),
        className: "w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
      },
      /* @__PURE__ */ h("option", { value: "Admin" }, "Admin (Full Write, Override & Config)"),
      /* @__PURE__ */ h("option", { value: "Analyst" }, "Analyst (Upload, Analyze & Override)"),
      /* @__PURE__ */ h("option", { value: "Viewer" }, "Viewer (Read-Only Diagnostic Access)")
    ))), /* @__PURE__ */ h(
      "button",
      {
        type: "submit",
        className: "apple-btn-primary"
      },
      "Update Active Evaluator Context"
    ))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 flex flex-col justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] flex items-center gap-2" }, /* @__PURE__ */ h(SettingsIcon, { className: "w-4 h-4 text-[#0071e3]" }), /* @__PURE__ */ h("span", null, "Database Reliability & Immutable Provenance")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1 leading-relaxed" }, "Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.")), /* @__PURE__ */ h("div", { className: "space-y-2.5" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: handleBackup,
        className: "apple-btn-secondary"
      },
      "Create Timestamped Database Backup Snapshot"
    ), backupMsg ? /* @__PURE__ */ h("div", { className: "p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] text-xs text-[#1d7334] font-mono" }, backupMsg) : null))), /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-4 stagger-3" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f]" }, "10 Modular AI System Prompts & Evidence Guardrails"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation")), /* @__PURE__ */ h(
      "select",
      {
        value: selectedPromptKey,
        onChange: (e) => setSelectedPromptKey(e.target.value),
        className: "text-xs border border-black/10 rounded-full px-4 py-2 bg-[#f5f5f7] font-bold text-[#0071e3] focus:outline-none focus:border-[#0071e3]"
      },
      Object.keys(prompts).map((k) => /* @__PURE__ */ h("option", { key: k, value: k }, "Prompt: ", k.replace(/_/g, " ").toUpperCase()))
    )), /* @__PURE__ */ h("pre", { className: "p-4 rounded-2xl bg-[#f5f5f7] border border-black/8 text-[#1d1d1f] text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 font-mono" }, prompts[selectedPromptKey] || "Loading prompt specification...")), /* @__PURE__ */ h("div", { className: "apple-card overflow-hidden stagger-4" }, /* @__PURE__ */ h("div", { className: "p-5 border-b border-black/8" }, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f]" }, "Immutable Audit Trail & Manual Override History (", auditLogs.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations")), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-[#f5f5f7] text-[#86868b] border-b border-black/8" }, /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Timestamp"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Actor & Role"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Action"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Entity"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Justification / State Change"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-black/5" }, auditLogs.length === 0 ? /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("td", { colSpan: 5, className: "p-6 text-center text-[#86868b]" }, "No manual overrides or configuration changes logged for this period yet.")) : auditLogs.map((log) => /* @__PURE__ */ h("tr", { key: log.id, className: "hover:bg-black/[0.02] transition" }, /* @__PURE__ */ h("td", { className: "p-3.5 text-[#86868b] font-mono text-[11px] whitespace-nowrap" }, new Date(log.created_at).toLocaleString()), /* @__PURE__ */ h("td", { className: "p-3.5 font-semibold text-[#1d1d1f]" }, log.actor, " ", /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[10px] border border-black/10" }, log.role)), /* @__PURE__ */ h("td", { className: "p-3.5" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-mono font-bold" }, log.action_type)), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#515154] font-mono whitespace-nowrap" }, log.entity_type, " #", log.entity_id), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#515154]" }, log.justification ? /* @__PURE__ */ h("div", { className: "font-semibold text-[#1d1d1f]" }, "Justification: \u201C", log.justification, "\u201D") : null, /* @__PURE__ */ h("div", { className: "text-[11px] text-[#86868b] font-mono truncate max-w-md" }, JSON.stringify(log.after_state))))))))));
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
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(UsersIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Stakeholder Classification & Weight Calibration Framework")), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-1" }, "Internal (4 groups) & External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.")), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8 shrink-0" }, ["ALL", "Internal", "External"].map((cat) => /* @__PURE__ */ h(
      "button",
      {
        key: cat,
        onClick: () => setCategoryFilter(cat),
        className: `px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${categoryFilter === cat ? "bg-[#0071e3] text-white shadow-sm" : "text-[#515154] hover:text-[#1d1d1f]"}`
      },
      cat === "ALL" ? `All (${stakeholders.length})` : cat
    )))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-2" }, filtered.map((sh) => {
      const isSelected = selectedSh && selectedSh.id === sh.id;
      const totalReq = sh.strong_count + sh.partial_count + sh.misalignment_count + sh.insufficient_count;
      const assessedReq = sh.strong_count + sh.partial_count + sh.misalignment_count;
      return /* @__PURE__ */ h(
        "div",
        {
          key: sh.id,
          onClick: () => setSelectedShId(sh.id),
          className: `cursor-pointer apple-card p-5 card-hover flex flex-col justify-between ${isSelected ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white" : "bg-white/85"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ h("div", { className: "min-w-0" }, /* @__PURE__ */ h(
          "span",
          {
            className: `inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sh.category === "Internal" ? "bg-[#f5eefb] text-[#5856d6] border-[#dfc3f3]" : "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff]"}`
          },
          sh.category
        ), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] mt-2 leading-snug" }, sh.name)), /* @__PURE__ */ h("div", { className: "text-right shrink-0" }, /* @__PURE__ */ h("div", { className: "text-xl font-bold text-[#0071e3] font-mono tabular-nums" }, sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"), /* @__PURE__ */ h("div", { className: "text-[11px] text-[#86868b] font-medium tabular-nums" }, "Cov: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, sh.evidence_coverage_pct, "%")))), /* @__PURE__ */ h("div", { className: "grid grid-cols-4 gap-2 mt-4" }, /* @__PURE__ */ h("div", { className: "py-2 px-1 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] flex flex-col items-center justify-center text-center" }, /* @__PURE__ */ h("div", { className: "font-bold text-sm text-[#1d7334] tabular-nums" }, sh.strong_count), /* @__PURE__ */ h("div", { className: "text-[10px] font-semibold text-[#248a3d]" }, "Strong")), /* @__PURE__ */ h("div", { className: "py-2 px-1 rounded-xl bg-[#fff7e6] border border-[#ffd580] flex flex-col items-center justify-center text-center" }, /* @__PURE__ */ h("div", { className: "font-bold text-sm text-[#b25e00] tabular-nums" }, sh.partial_count), /* @__PURE__ */ h("div", { className: "text-[10px] font-semibold text-[#c96500]" }, "Partial")), /* @__PURE__ */ h("div", { className: "py-2 px-1 rounded-xl bg-[#fdeef0] border border-[#f9abb4] flex flex-col items-center justify-center text-center" }, /* @__PURE__ */ h("div", { className: "font-bold text-sm text-[#c9182b] tabular-nums" }, sh.misalignment_count), /* @__PURE__ */ h("div", { className: "text-[10px] font-semibold text-[#d70015]" }, "Misalign")), /* @__PURE__ */ h("div", { className: "py-2 px-1 rounded-xl bg-[#f2f2f7] border border-[#d1d1d6] flex flex-col items-center justify-center text-center" }, /* @__PURE__ */ h("div", { className: "font-bold text-sm text-[#515154] tabular-nums" }, sh.insufficient_count), /* @__PURE__ */ h("div", { className: "text-[10px] font-semibold text-[#86868b]" }, "Insuff.")))),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-black/8 flex items-center justify-between text-xs text-[#86868b]" }, /* @__PURE__ */ h("span", null, "Assessed: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f] tabular-nums" }, assessedReq, "/", totalReq), " reqs"), /* @__PURE__ */ h("span", null, "Weight: ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3] font-mono tabular-nums" }, sh.importance_weight, "x")))
      );
    })), selectedSh ? /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-5 stagger-3" }, /* @__PURE__ */ h("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-black/8 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-[#0071e3] uppercase tracking-wider" }, "Detailed Stakeholder Diagnostic Profile"), /* @__PURE__ */ h("h3", { className: "text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight" }, selectedSh.name, " (", selectedSh.category, ")"), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-3 mt-1.5 text-xs text-[#86868b]" }, /* @__PURE__ */ h("span", null, "Influence:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, selectedSh.influence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Dependence:", " ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, selectedSh.dependence_level)), /* @__PURE__ */ h("span", null, "\u2022"), /* @__PURE__ */ h("span", null, "Alignment Score:", " ", /* @__PURE__ */ h("strong", { className: "text-[#0071e3] font-mono" }, selectedSh.alignment_score !== null ? `${selectedSh.alignment_score}%` : "Insufficient Evidence")))), /* @__PURE__ */ h("div", { className: "bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/8 flex items-center gap-3 shrink-0" }, /* @__PURE__ */ h("div", { className: "text-xs" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f]" }, "Stakeholder Importance Weight"), /* @__PURE__ */ h("div", { className: "text-[11px] text-[#86868b]" }, "Recalculates Overall Alignment Score")), /* @__PURE__ */ h(
      "select",
      {
        disabled: savingWeight,
        value: String(selectedSh.importance_weight),
        onChange: (e) => handleStakeholderWeightChange(
          selectedSh.id,
          parseFloat(e.target.value)
        ),
        className: "text-xs font-bold border border-black/10 rounded-full px-3.5 py-2 bg-white text-[#0071e3] shadow-sm focus:outline-none focus:border-[#0071e3]"
      },
      [0.5, 0.8, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3].map(
        (w) => /* @__PURE__ */ h("option", { key: w, value: String(w) }, w.toFixed(1), "x Weight")
      )
    ))), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#f5f5f7] border border-black/8" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d1d1f] mb-2" }, "Primary Interests"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#515154] list-disc pl-4" }, (selectedSh.key_interests || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#c9182b] mb-2" }, "Concerns & Potential Risks"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#1d1d1f] list-disc pl-4" }, (selectedSh.concerns_and_risks || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#0066cc] mb-2" }, "Relevant Corporate Policies"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#1d1d1f] list-disc pl-4" }, (selectedSh.relevant_policies || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it)))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fff7e6] border border-[#ffd580]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#b25e00] mb-2" }, "Potential Stakeholder Tensions"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#1d1d1f] list-disc pl-4" }, (selectedSh.potential_conflicts || []).map((it, idx) => /* @__PURE__ */ h("li", { key: idx }, it))))), /* @__PURE__ */ h("div", { className: "space-y-3 pt-2" }, /* @__PURE__ */ h("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-[#86868b] uppercase tracking-wider" }, "Assessed Expectations for ", selectedSh.name, " (", selectedSh.expectations.length, ")"), /* @__PURE__ */ h("span", { className: "text-[11px] text-[#86868b]" }, "Adjust requirement weights individually")), /* @__PURE__ */ h("div", { className: "space-y-2.5" }, selectedSh.expectations.map((exp) => /* @__PURE__ */ h(
      "div",
      {
        key: exp.id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
      },
      /* @__PURE__ */ h("div", { className: "space-y-1.5 flex-1" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, exp.title), exp.is_discovered_from_docs ? /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] text-[10px] font-mono font-semibold" }, "Discovered from Filings") : null), /* @__PURE__ */ h("p", { className: "text-[#515154] text-xs leading-relaxed" }, exp.description), /* @__PURE__ */ h("div", { className: "flex flex-wrap gap-1.5 pt-0.5" }, (exp.mapped_dimension_codes || []).map((d) => /* @__PURE__ */ h(
        "span",
        {
          key: d,
          className: "px-2.5 py-0.5 rounded-full bg-white text-[#515154] text-[10px] font-mono font-medium border border-black/10"
        },
        d
      )))),
      /* @__PURE__ */ h("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ h("span", { className: "text-[#86868b] text-[11px] font-medium" }, "Weight:"), /* @__PURE__ */ h(
        "select",
        {
          disabled: savingWeight,
          value: String(exp.requirement_weight),
          onChange: (e) => handleExpectationWeightChange(
            exp.id,
            parseFloat(e.target.value)
          ),
          className: "text-xs font-bold border border-black/10 rounded-full px-3 py-1.5 bg-white text-[#0071e3] shadow-sm focus:outline-none"
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
      return /* @__PURE__ */ h("div", { className: "p-12 text-center text-[#86868b] font-medium text-sm" }, /* @__PURE__ */ h("span", { className: "w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" }), "Loading 7-dimension organizational structure assessment...");
    }
    const dimensions = structureData.dimensions || [];
    const units = structureData.units || [];
    const evidenceByDim = structureData.evidence_by_dimension || {};
    const activeDim = dimensions.find((d) => d.dimension_code === selectedDimCode) || dimensions[0] || null;
    return /* @__PURE__ */ h("div", { className: "space-y-6 text-[#1d1d1f]" }, /* @__PURE__ */ h("div", { className: "apple-card p-6 stagger-1" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h("span", { className: "w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0" }, /* @__PURE__ */ h(StructureIcon, { className: "w-4 h-4" })), /* @__PURE__ */ h("h2", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "7-Dimension Organizational Structure & Governance Diagnostic")), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-1.5 leading-relaxed" }, "Evaluates Hierarchy, Centralization, Formalization, Specialization, Delegation & Authority, Coordination & Integration, and Governance. Reporting lines not supported by public filings are strictly marked as Insufficient Evidence.")), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2" }, dimensions.map((d) => {
      const isSelected = activeDim && activeDim.dimension_code === d.dimension_code;
      return /* @__PURE__ */ h(
        "div",
        {
          key: d.id,
          onClick: () => setSelectedDimCode(d.dimension_code),
          className: `cursor-pointer apple-card p-5 card-hover flex flex-col justify-between ${isSelected ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white" : "bg-white/85"}`
        },
        /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between gap-2 mb-2.5" }, /* @__PURE__ */ h("span", { className: "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] font-mono border border-[#b3d7ff]" }, d.dimension_code), /* @__PURE__ */ h("span", { className: "text-[11px] text-[#86868b]" }, "Conf: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, d.confidence_level))), /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f] leading-snug" }, d.dimension_name), /* @__PURE__ */ h("div", { className: "mt-2.5" }, classificationBadge(d.suitability_classification)), /* @__PURE__ */ h("p", { className: "text-xs text-[#515154] mt-3 line-clamp-3 leading-relaxed" }, d.assessment_summary)),
        /* @__PURE__ */ h("div", { className: "mt-4 pt-3 border-t border-black/8 flex items-center justify-between text-xs text-[#0071e3] font-semibold" }, /* @__PURE__ */ h("span", null, d.evidence_count, " Citations"), /* @__PURE__ */ h("span", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ h("span", null, "Inspect"), /* @__PURE__ */ h(ArrowRightIcon, { className: "w-3.5 h-3.5" })))
      );
    })), activeDim ? /* @__PURE__ */ h("div", { className: "apple-card p-6 space-y-5 stagger-3" }, /* @__PURE__ */ h("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/8 pb-4" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "text-xs font-bold text-[#0071e3] uppercase tracking-wider" }, "Dimension Deep-Dive \u2022 ", activeDim.dimension_code.toUpperCase()), /* @__PURE__ */ h("h3", { className: "text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight" }, activeDim.dimension_name)), /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-3" }, classificationBadge(activeDim.suitability_classification), /* @__PURE__ */ h("span", { className: "text-xs text-[#86868b]" }, "Confidence: ", /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, activeDim.confidence_level)))), /* @__PURE__ */ h("p", { className: "text-xs text-[#1d1d1f] leading-relaxed bg-[#f5f5f7] p-4 rounded-2xl border border-black/8" }, activeDim.assessment_summary), /* @__PURE__ */ h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" }, /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#eaf8ee] border border-[#a3e4b7]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#1d7334] mb-2 uppercase tracking-wider text-[11px]" }, "Observed Structural Strengths"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#1d1d1f] list-disc pl-4" }, (activeDim.strengths || []).map((s, idx) => /* @__PURE__ */ h("li", { key: idx }, s)))), /* @__PURE__ */ h("div", { className: "p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4]" }, /* @__PURE__ */ h("div", { className: "font-bold text-[#c9182b] mb-2 uppercase tracking-wider text-[11px]" }, "Observed Structural Weaknesses / Tensions"), /* @__PURE__ */ h("ul", { className: "space-y-1.5 text-[#1d1d1f] list-disc pl-4" }, (activeDim.weaknesses || []).map((w, idx) => /* @__PURE__ */ h("li", { key: idx }, w))))), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h4", { className: "text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3" }, "Documentary Citations for ", activeDim.dimension_name), /* @__PURE__ */ h("div", { className: "space-y-2.5" }, (evidenceByDim[activeDim.dimension_code] || []).length === 0 ? /* @__PURE__ */ h("div", { className: "text-xs text-[#86868b] italic p-4 bg-[#f5f5f7] rounded-xl border border-black/8" }, "No direct quotations indexed for this dimension in this assessment period.") : (evidenceByDim[activeDim.dimension_code] || []).map((ev) => /* @__PURE__ */ h(
      "div",
      {
        key: ev.id,
        className: "p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-2"
      },
      /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center gap-2" }, evidenceClassBadge(ev.evidence_classification), /* @__PURE__ */ h("span", { className: "font-bold text-[#1d1d1f]" }, ev.document_name), /* @__PURE__ */ h("span", { className: "text-[#86868b]" }, "(p. ", ev.page_number, ")")), /* @__PURE__ */ h("span", { className: "text-[11px] text-[#0066cc] font-mono font-semibold" }, "FY: ", ev.financial_year || "N/A")),
      /* @__PURE__ */ h("p", { className: "italic text-[#1d1d1f] pl-3 border-l-2 border-[#0071e3] leading-relaxed" }, "\u201C", ev.exact_quotation, "\u201D")
    ))))) : null, /* @__PURE__ */ h("div", { className: "apple-card overflow-hidden stagger-4" }, /* @__PURE__ */ h("div", { className: "p-5 border-b border-black/8 flex items-center justify-between" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", { className: "text-sm font-bold text-[#1d1d1f]" }, "Explicitly Disclosed Organizational Units (", units.length, ")"), /* @__PURE__ */ h("p", { className: "text-xs text-[#86868b] mt-0.5" }, "Committees, divisions, functions, and oversight boards extracted directly from filings"))), /* @__PURE__ */ h("div", { className: "overflow-x-auto" }, /* @__PURE__ */ h("table", { className: "w-full text-left border-collapse text-xs" }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", { className: "bg-[#f5f5f7] text-[#86868b] border-b border-black/8" }, /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Unit Name"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Type"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Dimension"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Reporting Line"), /* @__PURE__ */ h("th", { className: "p-3.5 font-bold" }, "Core Mandate & Responsibilities"))), /* @__PURE__ */ h("tbody", { className: "divide-y divide-black/5" }, units.map((u) => /* @__PURE__ */ h("tr", { key: u.id, className: "hover:bg-black/[0.02] transition" }, /* @__PURE__ */ h("td", { className: "p-3.5 font-bold text-[#1d1d1f]" }, u.name), /* @__PURE__ */ h("td", { className: "p-3.5" }, /* @__PURE__ */ h("span", { className: "px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] border border-black/10 font-medium whitespace-nowrap" }, u.unit_type)), /* @__PURE__ */ h("td", { className: "p-3.5 uppercase font-semibold text-[#0066cc] font-mono" }, u.dimension_code), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#515154]" }, u.reporting_line.includes("Insufficient Evidence") ? /* @__PURE__ */ h("span", { className: "italic text-[#b25e00] font-mono text-[11px]" }, u.reporting_line) : /* @__PURE__ */ h("strong", { className: "text-[#1d1d1f]" }, u.reporting_line)), /* @__PURE__ */ h("td", { className: "p-3.5 text-[#515154] max-w-md leading-relaxed" }, u.responsibilities))))))));
  }

  // src/main.tsx
  var NAV_SECTIONS = [
    {
      title: "DIAGNOSTIC WORKFLOW",
      items: [
        { id: "dashboard", stepNumber: "01", label: "Executive Dashboard", shortLabel: "Cockpit", icon: CockpitIcon },
        { id: "documents", stepNumber: "02", label: "Research Library", shortLabel: "Filings", icon: DocumentIcon },
        { id: "stakeholders", stepNumber: "03", label: "Stakeholder Profiles", shortLabel: "Profiles", icon: UsersIcon },
        { id: "structure", stepNumber: "04", label: "Org Structure (7 Dims)", shortLabel: "Structure", icon: StructureIcon },
        { id: "matrix", stepNumber: "05", label: "Alignment Matrix", shortLabel: "Matrix", icon: MatrixIcon }
      ]
    },
    {
      title: "DEEP ANALYSIS",
      items: [
        { id: "conflicts", stepNumber: "06", label: "Conflict Matrix", shortLabel: "Conflicts", icon: BoltIcon },
        { id: "recommendations", stepNumber: "07", label: "Recommendations", shortLabel: "Actions", icon: LightbulbIcon },
        { id: "evidence", stepNumber: "08", label: "Evidence Repository", shortLabel: "Citations", icon: SearchIcon }
      ]
    },
    {
      title: "GOVERNANCE & REPORTS",
      items: [
        { id: "comparison", stepNumber: "09", label: "Historical Trends", shortLabel: "Trends", icon: TrendIcon },
        { id: "report", stepNumber: "10", label: "Diagnostic Report", shortLabel: "Report", icon: ReportIcon },
        { id: "settings", stepNumber: "11", label: "Audit & Settings", shortLabel: "Audit", icon: SettingsIcon }
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
    const handleCreatePeriod = async (e) => {
      e.preventDefault();
      if (!newPeriodTitle || !newPeriodFy) return;
      const period = await api.createAssessment({
        company_id: selectedCompanyId,
        title: newPeriodTitle,
        fiscal_year: newPeriodFy
      });
      setShowNewPeriodModal(false);
      setNewPeriodTitle("FY2026 Assessment");
      await loadInitialLists();
      setSelectedPeriodId(period.id);
    };
    const handleCreateCompany = async (e) => {
      e.preventDefault();
      if (!newCompName) return;
      const prios = newCompPriorities.split(",").map((s) => s.strip ? s.strip() : s.trim()).filter((s) => s.length > 0);
      const comp = await api.createCompany({
        name: newCompName,
        ticker: newCompTicker || void 0,
        industry: newCompIndustry,
        analysis_priorities: prios
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
    return /* @__PURE__ */ h("div", { className: "min-h-screen flex text-[#1d1d1f] relative overflow-x-hidden" }, /* @__PURE__ */ h("aside", { className: "w-64 bg-white/75 backdrop-blur-2xl text-[#1d1d1f] flex flex-col justify-between shrink-0 border-r border-black/8 relative z-20 overflow-y-auto shadow-sm" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "p-5 border-b border-black/8" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ h(BrandLogo, { size: 42, className: "shrink-0 shadow-md shadow-[#0071e3]/25 rounded-2xl" }), /* @__PURE__ */ h("div", { className: "min-w-0" }, /* @__PURE__ */ h("div", { className: "text-sm font-bold text-[#1d1d1f] tracking-tight truncate" }, "Alignment Analyzer"), /* @__PURE__ */ h("div", { className: "text-[11px] text-[#0071e3] font-medium flex items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ h("span", { className: "truncate" }, "Diagnostic Engine"), /* @__PURE__ */ h("span", { className: "px-1.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-[9px] font-bold shrink-0" }, "v2.3"))))), /* @__PURE__ */ h("div", { className: "p-4 border-b border-black/8 space-y-3 text-xs bg-black/[0.02]" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5" }, /* @__PURE__ */ h("span", null, "Target Company"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewCompanyModal(true),
        className: "text-[#0071e3] hover:text-[#0077ed] font-semibold"
      },
      "+ Add"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedCompanyId),
        onChange: (e) => handleSelectCompany(parseInt(e.target.value, 10)),
        className: "w-full rounded-xl bg-white border border-black/10 p-2 text-[#1d1d1f] font-medium shadow-sm focus:outline-none focus:border-[#0071e3]"
      },
      companies.map((c) => /* @__PURE__ */ h("option", { key: c.id, value: String(c.id) }, c.name, " ", c.ticker ? `(${c.ticker})` : ""))
    )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "flex items-center justify-between text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5" }, /* @__PURE__ */ h("span", null, "Assessment Period"), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setShowNewPeriodModal(true),
        className: "text-[#0071e3] hover:text-[#0077ed] font-semibold"
      },
      "+ New"
    )), /* @__PURE__ */ h(
      "select",
      {
        value: String(selectedPeriodId),
        onChange: (e) => setSelectedPeriodId(parseInt(e.target.value, 10)),
        className: "w-full rounded-xl bg-white border border-black/10 p-2 text-[#1d1d1f] font-medium shadow-sm focus:outline-none focus:border-[#0071e3]"
      },
      companyPeriods.map((p) => /* @__PURE__ */ h("option", { key: p.id, value: String(p.id) }, p.title))
    ))), /* @__PURE__ */ h("nav", { className: "p-3 space-y-4" }, NAV_SECTIONS.map((section) => /* @__PURE__ */ h("div", { key: section.title, className: "space-y-1" }, /* @__PURE__ */ h("div", { className: "text-[10px] font-bold text-[#86868b] uppercase tracking-wider px-2 py-1" }, section.title), section.items.map((item) => {
      const active = activeTab === item.id;
      const IconComp = item.icon;
      return /* @__PURE__ */ h(
        "button",
        {
          key: item.id,
          onClick: () => setActiveTab(item.id),
          className: `w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-200 card-hover ${active ? "bg-[#0071e3] text-white font-semibold shadow-sm shadow-[#0071e3]/30" : "text-[#515154] hover:bg-black/5 hover:text-[#1d1d1f]"}`
        },
        /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5 truncate" }, /* @__PURE__ */ h(IconComp, { className: `w-4 h-4 shrink-0 ${active ? "text-white" : "text-[#86868b]"}` }), /* @__PURE__ */ h("span", { className: "truncate" }, item.label)),
        /* @__PURE__ */ h(
          "span",
          {
            className: `text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${active ? "bg-white/20 text-white font-bold" : "bg-black/5 text-[#86868b]"}`
          },
          item.stepNumber
        )
      );
    }))))), /* @__PURE__ */ h("div", { className: "p-4 border-t border-black/8 text-[11px] text-[#86868b] space-y-1 bg-black/[0.02]" }, /* @__PURE__ */ h("div", { className: "font-semibold text-[#1d1d1f] flex items-center gap-2" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-[#34c759] shadow-sm shadow-[#34c759]/60" }), auth.name), /* @__PURE__ */ h("div", null, "Role:", " ", /* @__PURE__ */ h("span", { className: "px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold border border-[#0071e3]/20" }, auth.role)))), /* @__PURE__ */ h("div", { className: "flex-1 flex flex-col min-w-0 relative z-10" }, /* @__PURE__ */ h("header", { className: "bg-white/80 border-b border-black/8 px-6 py-3.5 backdrop-blur-2xl sticky top-0 z-30 shadow-sm" }, /* @__PURE__ */ h("div", { className: "flex flex-wrap items-center justify-between gap-4" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-3 text-xs" }, /* @__PURE__ */ h("div", { className: "flex items-center gap-1.5 px-3 py-1 bg-[#34c759]/10 border border-[#34c759]/25 rounded-full text-[#248a3d] font-semibold shadow-sm" }, /* @__PURE__ */ h("span", { className: "w-2 h-2 rounded-full bg-[#34c759] shrink-0" }), /* @__PURE__ */ h("span", { className: "font-mono text-[11px]" }, "896 Chunks Verified")), /* @__PURE__ */ h("span", { className: "text-[#d2d2d7]" }, "/"), /* @__PURE__ */ h("span", { className: "text-[#1d1d1f] font-bold tracking-tight" }, currentCompany ? currentCompany.name : "Company"), /* @__PURE__ */ h("span", { className: "text-[#d2d2d7]" }, "/"), /* @__PURE__ */ h("span", { className: "text-[#0071e3] font-mono font-semibold bg-[#0071e3]/10 border border-[#0071e3]/20 px-2.5 py-0.5 rounded-full" }, currentPeriod ? currentPeriod.fiscal_year : "FY2025")), /* @__PURE__ */ h("div", { className: "flex items-center gap-1 bg-black/5 p-1 rounded-full border border-black/5" }, companies.map((c) => {
      const isSel = c.id === selectedCompanyId;
      return /* @__PURE__ */ h(
        "button",
        {
          key: c.id,
          onClick: () => handleSelectCompany(c.id),
          className: `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${isSel ? "bg-white text-[#1d1d1f] shadow-sm font-bold" : "text-[#86868b] hover:text-[#1d1d1f]"}`
        },
        /* @__PURE__ */ h("span", null, c.ticker || c.name.slice(0, 4)),
        /* @__PURE__ */ h("span", { className: `text-[10px] ${isSel ? "text-[#0071e3]" : "text-[#a1a1a6]"}` }, c.name.split(" ")[0])
      );
    })), /* @__PURE__ */ h("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ h(
      "button",
      {
        onClick: handleRunAnalysis,
        disabled: isAnalyzing,
        className: "apple-btn-primary btn-shimmer"
      },
      isAnalyzing ? /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ h("span", null, "Executing AI Engine...")) : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h(SparklesIcon, { className: "w-4 h-4" }), /* @__PURE__ */ h("span", null, "Run Full AI Diagnostic"))
    ), /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setActiveTab("report"),
        className: "apple-btn-secondary"
      },
      /* @__PURE__ */ h(ReportIcon, { className: "w-4 h-4 text-[#0071e3]" }),
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
    ) : null)), showNewPeriodModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreatePeriod,
        className: "apple-card bg-white p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-[#1d1d1f] border border-black/10"
      },
      /* @__PURE__ */ h("h3", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Create New Periodic Assessment"),
      /* @__PURE__ */ h("p", { className: "text-[#86868b] leading-relaxed" }, "Initializes an isolated document collection, 10 stakeholder groups, and 7 organizational structure dimensions."),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Assessment Title"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodTitle,
          onInput: (e) => setNewPeriodTitle(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      )),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Financial Year"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newPeriodFy,
          onInput: (e) => setNewPeriodFy(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewPeriodModal(false),
          className: "apple-btn-secondary"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "apple-btn-primary"
        },
        "Create Assessment"
      ))
    )) : null, showNewCompanyModal ? /* @__PURE__ */ h("div", { className: "fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" }, /* @__PURE__ */ h(
      "form",
      {
        onSubmit: handleCreateCompany,
        className: "apple-card bg-white p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-[#1d1d1f] border border-black/10"
      },
      /* @__PURE__ */ h("h3", { className: "text-lg font-bold text-[#1d1d1f] tracking-tight" }, "Register New Organization"),
      /* @__PURE__ */ h("p", { className: "text-[#86868b] leading-relaxed" }, "Sets up organizational entity profile with customized diagnostic priorities and baseline stakeholder framework."),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Company Legal Name"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          placeholder: "e.g., Apple Inc.",
          value: newCompName,
          onInput: (e) => setNewCompName(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      )),
      /* @__PURE__ */ h("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Ticker Symbol"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          placeholder: "AAPL",
          value: newCompTicker,
          onInput: (e) => setNewCompTicker(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      )), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Industry Classification"), /* @__PURE__ */ h(
        "input",
        {
          type: "text",
          value: newCompIndustry,
          onInput: (e) => setNewCompIndustry(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      ))),
      /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { className: "block font-semibold text-[#1d1d1f] mb-1" }, "Analysis Priorities (comma-separated)"), /* @__PURE__ */ h(
        "textarea",
        {
          rows: 2,
          value: newCompPriorities,
          onInput: (e) => setNewCompPriorities(e.target.value),
          className: "w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
        }
      )),
      /* @__PURE__ */ h("div", { className: "flex justify-end gap-2 pt-2" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          onClick: () => setShowNewCompanyModal(false),
          className: "apple-btn-secondary"
        },
        "Cancel"
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "submit",
          className: "apple-btn-primary"
        },
        "Register & Initialize"
      ))
    )) : null);
  }
  mountApp(App, document.getElementById("root"));
})();
