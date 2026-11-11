/**
 * Lightweight Reactive JSX & Hooks Runtime for Enterprise SPA (.tsx)
 * Provides h(), Fragment, useState(), useEffect(), and mountApp() with zero external runtime dependencies.
 */

export type VNodeChild = VNode | string | number | boolean | null | undefined;

export interface VNode {
  tag: any;
  props: Record<string, any>;
  children: VNodeChild[];
}

export function Fragment(props: { children?: VNodeChild[] }): any {
  return props.children || [];
}

export function h(
  tag: any,
  props: Record<string, any> | null,
  ...children: any[]
): VNode {
  const flatChildren: VNodeChild[] = [];
  const flatten = (arr: any[]) => {
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
    children: flatChildren,
  };
}

let stateStore: any[] = [];
let stateCursor = 0;
let effectStore: { deps?: any[]; cleanup?: () => void }[] = [];
let effectCursor = 0;
let pendingEffects: (() => void)[] = [];
let rootComponent: (() => VNode) | null = null;
let rootContainer: HTMLElement | null = null;
let renderScheduled = false;

export function useState<T>(
  initialValue: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const idx = stateCursor++;
  if (stateStore.length <= idx) {
    stateStore[idx] = initialValue;
  }
  const setState = (next: T | ((prev: T) => T)) => {
    const prev = stateStore[idx];
    const resolved = typeof next === "function" ? (next as any)(prev) : next;
    if (resolved !== prev) {
      stateStore[idx] = resolved;
      scheduleRender();
    }
  };
  return [stateStore[idx], setState];
}

export function useEffect(
  callback: () => void | (() => void),
  deps?: any[]
): void {
  const idx = effectCursor++;
  const prev = effectStore[idx];
  let changed = true;
  if (prev && deps && prev.deps) {
    changed =
      deps.length !== prev.deps.length ||
      deps.some((d, i) => d !== prev.deps![i]);
  }
  if (changed) {
    pendingEffects.push(() => {
      if (prev && typeof prev.cleanup === "function") {
        prev.cleanup();
      }
      const cleanup = callback();
      effectStore[idx] = {
        deps,
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
      };
    });
  }
}

const SVG_TAGS = new Set([
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
  "stop",
]);

function createDomNode(node: VNodeChild, isSvg = false): Node {
  if (node === null || node === undefined || typeof node === "boolean") {
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
  const el = nextIsSvg
    ? document.createElementNS("http://www.w3.org/2000/svg", node.tag)
    : document.createElement(node.tag);

  // Append children FIRST so <select> has its <option> elements before setting .value
  for (const child of node.children) {
    el.appendChild(createDomNode(child, nextIsSvg));
  }

  // Apply attributes, properties, and event listeners AFTER children exist
  for (const [k, v] of Object.entries(node.props || {})) {
    if (
      k === "children" ||
      k === "key" ||
      v === undefined ||
      v === null ||
      v === false
    ) {
      continue;
    }
    if (k === "className") {
      if (nextIsSvg) {
        el.setAttribute("class", String(v));
      } else {
        (el as HTMLElement).className = String(v);
      }
    } else if (k === "style" && typeof v === "object") {
      Object.assign((el as HTMLElement).style, v);
    } else if (k.startsWith("on") && typeof v === "function") {
      const eventName = k.slice(2).toLowerCase();
      el.addEventListener(eventName, v);
    } else if (
      k === "checked" ||
      k === "value" ||
      k === "disabled" ||
      k === "selected"
    ) {
      (el as any)[k] = v;
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

export function scheduleRender(): void {
  if (renderScheduled) return;
  renderScheduled = true;
  Promise.resolve().then(() => {
    renderScheduled = false;
    performRender();
  });
}

function performRender(): void {
  if (!rootComponent || !rootContainer) return;

  // Save focused input state before re-rendering
  const activeEl = document.activeElement as HTMLInputElement | null;
  let focusInfo: {
    tag: string;
    placeholder: string;
    type: string;
    selStart: number | null;
    selEnd: number | null;
  } | null = null;

  if (
    activeEl &&
    rootContainer.contains(activeEl) &&
    (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
  ) {
    focusInfo = {
      tag: activeEl.tagName,
      placeholder: activeEl.getAttribute("placeholder") || "",
      type: activeEl.getAttribute("type") || "",
      selStart: activeEl.selectionStart,
      selEnd: activeEl.selectionEnd,
    };
  }

  stateCursor = 0;
  effectCursor = 0;
  pendingEffects = [];

  const vnode = rootComponent();
  rootContainer.innerHTML = "";
  rootContainer.appendChild(createDomNode(vnode));

  // Restore focus & cursor position if user was typing in an input/textarea
  if (focusInfo) {
    const candidates = rootContainer.querySelectorAll(focusInfo.tag);
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i] as HTMLInputElement;
      if (
        (c.getAttribute("placeholder") || "") === focusInfo.placeholder &&
        (c.getAttribute("type") || "") === focusInfo.type
      ) {
        c.focus();
        try {
          if (focusInfo.selStart !== null && focusInfo.selEnd !== null) {
            c.setSelectionRange(focusInfo.selStart, focusInfo.selEnd);
          }
        } catch {
          // ignore for input types that do not support selectionRange
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

export function mountApp(
  component: () => VNode,
  container: HTMLElement
): void {
  rootComponent = component;
  rootContainer = container;
  performRender();
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
