// === Corner Unrounding — optimized, YouTube-safe ===

// Defaults
var userSettings = {
    mode: "1",
    roundAmount: 0,
    ratioAmount: 0,
    minRounding: 0,
    maxRounding: 0,
    editAll: false,
    excludeClasses: [],
    excludeIds: []
};

// Cross-browser storage API
const storage = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
const runtime = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : chrome.runtime;

// Caches / trackers
const lastAppliedRadius = new WeakMap();   // element -> last radius we set (string like "8px")
const watchedElements   = new WeakSet();   // elements we attached observers to (attr + resize)

// Batched processing queue
let pending = new Set();
let flushScheduled = false;
const scheduleFlush = () => {
    if (flushScheduled) return;
    flushScheduled = true;
    const runner = () => { flushScheduled = false; const list = Array.from(pending); pending.clear(); fixRounds(list); };
    // Prefer idle when available
    if (typeof requestIdleCallback === "function") requestIdleCallback(runner, { timeout: 100 });
    else setTimeout(runner, 50);
};
const queueElements = (els) => { for (const el of els) if (el && el.nodeType === 1) pending.add(el); scheduleFlush(); };

// Load settings & initial pass
storage.sync.get(null).then((data) => {
    if (data != null) userSettings = data;
    // Initial sweep
    queueElements(document.querySelectorAll('*'));
});

// Reload on settings change
(ifStorageOnChanged => {
    if (ifStorageOnChanged) {
        ifStorageOnChanged.addListener(() => document.location.reload());
    }
})((storage && storage.onChanged) ? storage.onChanged : (chrome.storage && chrome.storage.onChanged));

// Reload on runtime message
runtime.onMessage.addListener((message) => { if (message.action === 'reloadPage') window.location.reload(); });

// Exclusion helpers
function shouldExclude(element) {
    if (userSettings.excludeClasses && Array.isArray(userSettings.excludeClasses)) {
        for (const cls of userSettings.excludeClasses) {
            if (element.classList && element.classList.contains(cls)) return true;
        }
    }
    if (userSettings.excludeIds && Array.isArray(userSettings.excludeIds)) {
        if (element.id && userSettings.excludeIds.includes(element.id)) return true;
    }
    return false;
}

// Per-element observers (attribute + resize) — attach ONLY to candidates
const attrObserver = new MutationObserver((records) => {
    const changed = new Set();
    for (const r of records) {
        if (r.type === "attributes" && r.target && r.target.nodeType === 1) {
            changed.add(r.target);
        }
    }
    if (changed.size) queueElements(changed);
});

// One ResizeObserver for all watched elements
const resizeObserver = new ResizeObserver((entries) => {
    const changed = new Set();
    for (const e of entries) {
        if (e && e.target) changed.add(e.target);
    }
    if (changed.size) queueElements(changed);
});

function ensureWatching(element) {
    if (watchedElements.has(element)) return;
    watchedElements.add(element);
    try {
        // Watch minimal attribute set that impacts rounding/visibility
        attrObserver.observe(element, { attributes: true, attributeFilter: ['style', 'class', 'src'] });
    } catch (_) {}
    try {
        resizeObserver.observe(element);
    } catch (_) {}

    // Shadow DOM: start discovery inside once
    if (element.shadowRoot && !element.shadowRoot.__cu_observed) {
        element.shadowRoot.__cu_observed = true;
        observeChildList(element.shadowRoot);
        // kick an initial pass inside the shadow root
        queueElements(element.shadowRoot.querySelectorAll('*'));
    }
}

// Core rounding
function computeNewRadius(element, style, currentBorderRadius) {
    let newRadius = null;

    // Width/height: prefer fast geometry; fall back to computed values
    const rect = element.getBoundingClientRect();
    let width  = rect.width  || parseFloat(style.getPropertyValue("width"))  || 0;
    let height = rect.height || parseFloat(style.getPropertyValue("height")) || 0;
    const shortestSide = Math.min(width, height);

    if (userSettings.mode === "1") {
        newRadius = userSettings.roundAmount + "px";
    } else if (userSettings.mode === "2") {
        // Ratio mode: if we don't have dimensions yet, wait for ResizeObserver
        if (userSettings.ratioAmount !== null && shortestSide > 0) {
            let r = shortestSide * userSettings.ratioAmount;
            if (r < userSettings.minRounding) r = userSettings.minRounding;
            else if (userSettings.maxRounding !== 0 && r > userSettings.maxRounding) r = userSettings.maxRounding;
            newRadius = r + "px";
        }
    } else if (userSettings.mode === "3") {
        const numericRadius = parseFloat(currentBorderRadius) || 0;
        if (numericRadius < userSettings.minRounding) {
            newRadius = userSettings.minRounding + "px";
        } else if (userSettings.maxRounding !== 0 && numericRadius > userSettings.maxRounding) {
            newRadius = userSettings.maxRounding + "px";
        }
    }

    return newRadius;
}

function fixRounds(elementList) {
    elementList.forEach((element) => {
        if (!element || element.nodeType !== 1) return;
        if (shouldExclude(element)) return;

        const style = window.getComputedStyle(element);
        const currentBorderRadius = style.getPropertyValue("border-radius");

        // Candidate if it has rounding or we're set to edit all
        const isCandidate = (currentBorderRadius && currentBorderRadius !== "0px") || userSettings.editAll;
        if (!isCandidate) return;

        // Attach lightweight watchers so we respond when this element actually changes
        ensureWatching(element);

        // Compute desired radius
        const desired = computeNewRadius(element, style, currentBorderRadius);

        // If ratio mode and we don't have size yet, skip for now — resize observer will retry
        if (!desired) return;

        // Skip if already at desired radius (cheap, avoids redundant style writes)
        if (lastAppliedRadius.get(element) === desired && element.style.borderRadius === desired) return;

        if (currentBorderRadius !== desired) {
            element.style.borderRadius = desired;
            lastAppliedRadius.set(element, desired);
        }
    });
}

// ChildList-only observer to discover new nodes (cheap)
function observeChildList(root) {
    const mo = new MutationObserver((mutations) => {
        const toProcess = new Set();
        for (const m of mutations) {
            if (m.type === 'childList' && m.addedNodes.length) {
                for (const n of m.addedNodes) {
                    if (n.nodeType === 1) {
                        toProcess.add(n);
                        // Collect descendants without an extra pass later
                        const descendants = n.querySelectorAll ? n.querySelectorAll('*') : [];
                        for (const d of descendants) toProcess.add(d);
                    }
                }
            }
        }
        if (toProcess.size) queueElements(toProcess);
    });
    mo.observe(root, { childList: true, subtree: true });
}

// Start observing the main document
observeChildList(document);
