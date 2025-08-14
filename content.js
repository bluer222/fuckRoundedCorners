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
const watchedElements = new WeakSet();   // elements we attached observers to (attr + resize)

//do we need to reload the page for new settings?
let pendingReload = false;

// Load settings & initial pass
storage.sync.get(null).then((data) => {
    if (data != null) userSettings = data;
    // Initial sweep
    fixRounds(document.querySelectorAll('*'));
});

// Reload on settings change
(ifStorageOnChanged => {
    if (ifStorageOnChanged) {
        ifStorageOnChanged.addListener(() => pendingReload = true);
    }
})((storage && storage.onChanged) ? storage.onChanged : (chrome.storage && chrome.storage.onChanged));

//just got focused, check if we need to reload
window.addEventListener('focus', () => {
    if (pendingReload) {
        document.location.reload();
    }
});

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

// Core rounding
function computeNewRadius(element, style, currentBorderRadius) {
    let newRadius = null;

    // Width/height: prefer fast geometry; fall back to computed values
    const rect = element.getBoundingClientRect();
    let width = rect.width || parseFloat(style.getPropertyValue("width")) || 0;
    let height = rect.height || parseFloat(style.getPropertyValue("height")) || 0;
    const shortestSide = Math.min(width, height);

    //if the element is not rendered lets just observe it
    if (shortestSide === 0 || style.getPropertyValue("display") === "none") {
        observeElementVisibility(element);
        return;
    }

    if (userSettings.mode === "1") {
        newRadius = userSettings.roundAmount;
    } else if (userSettings.mode === "2") {
        if (userSettings.ratioAmount !== null) {
            newRadius = shortestSide * userSettings.ratioAmount;
            if (newRadius < userSettings.minRounding) newRadius = userSettings.minRounding;
            else if (userSettings.maxRounding !== 0 && newRadius > userSettings.maxRounding) newRadius = userSettings.maxRounding;
        }
    } else if (userSettings.mode === "3") {
        const numericRadius = parseFloat(currentBorderRadius) || 0;
        if (numericRadius < userSettings.minRounding) {
            newRadius = userSettings.minRounding;
        } else if (userSettings.maxRounding !== 0 && numericRadius > userSettings.maxRounding) {
            newRadius = userSettings.maxRounding;
        }
    }

    return newRadius + "px";
}

function fixRounds(elementList) {
    elementList.forEach((element) => {
        if (shouldExclude(element)) return;

        //check for shadow roots first because an element that does not meet requrements
        //can still have a shadow root that does
        if (element.shadowRoot) {
            //create an observer for the shadow root
            observeDocumentChanges(element.shadowRoot);
            //if the element has a shadow root, then get all elements in the shadow root
            const shadowElements = element.shadowRoot.querySelectorAll('*');
            //call the function on all elements in the shadow root
            fixRounds(shadowElements);
        }

        if (!element || element.nodeType !== 1) return;

        const style = window.getComputedStyle(element);
        const currentBorderRadius = style.getPropertyValue("border-radius");

        // Candidate if it has rounding or we're set to edit all
        const isCandidate = ((currentBorderRadius && currentBorderRadius !== "0px") || userSettings.editAll);
        if (!isCandidate) return;

        // Compute desired radius
        const desired = computeNewRadius(element, style, currentBorderRadius);

        // If ratio mode and we don't have size yet, skip for now — resize observer will retry
        if (!desired) return;

        if (currentBorderRadius !== desired) {
            //do it this way to overrule any !important styles
            element.style.setProperty('border-radius', desired, 'important');
        }


    });
}
// Create an observer and when the body changes
const observer = new MutationObserver((mutations) => {
    const newElements = [];

    mutations.forEach((mutation) => {
        // Check for added nodes
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
                // Only process element nodes (nodeType 1), skip text nodes, comments, etc.
                if (node.nodeType === 1) {
                    newElements.push(node);

                    // Optional: Also include all descendant elements
                    const descendants = node.querySelectorAll('*');
                    newElements.push(...descendants);
                }
            });
        }
    });

    // Call your function with the array of new elements (if any were found)
    if (newElements.length > 0) {
        fixRounds(newElements);
    }
});

// One ResizeObserver for all watched elements
const resizeObserver = new ResizeObserver((entries) => {
    const changed = [];
    for (const e of entries) {
        if (e && e.target) changed.push(e.target);
    }
    if (changed.length) fixRounds(changed);
});

function observeElementVisibility(element) {
    if (watchedElements.has(element)) return;
    watchedElements.add(element);
    try {
        resizeObserver.observe(element);
    } catch (_) { }
}
function observeDocumentChanges(docToObserve) {
    if (watchedElements.has(docToObserve)) return;
    watchedElements.add(docToObserve);

    // Start observing the document (or any specific element)
    observer.observe(docToObserve, {
        childList: true,        // Watch for added/removed children
        subtree: true,          // Watch all descendants, not just direct children
        attributes: false,      // Don't watch attribute changes
        characterData: false    // Don't watch text content changes
    });
}

observeDocumentChanges(document);