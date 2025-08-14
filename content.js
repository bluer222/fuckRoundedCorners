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

// Load settings & initial pass
storage.sync.get(null).then((data) => {
    if (data != null) userSettings = data;
    // Initial sweep
    fixRounds(document.querySelectorAll('*'));
});

// Reload on settings change
(ifStorageOnChanged => {
    if (ifStorageOnChanged) {
        ifStorageOnChanged.addListener(() => document.location.reload());
    }
})((storage && storage.onChanged) ? storage.onChanged : (chrome.storage && chrome.storage.onChanged));

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

    if (userSettings.mode === "1") {
        newRadius = userSettings.roundAmount;
    } else if (userSettings.mode === "2") {
        // Ratio mode: if we don't have dimensions yet, wait for ResizeObserver
        if (userSettings.ratioAmount !== null) {
            let newRadius = shortestSide * userSettings.ratioAmount;
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
        if (!element || element.nodeType !== 1) return;
        if (shouldExclude(element)) return;

        const style = window.getComputedStyle(element);
        const currentBorderRadius = style.getPropertyValue("border-radius");

        // Candidate if it has rounding or we're set to edit all
        // Always Skip if not visible
        const isCandidate = ((currentBorderRadius && currentBorderRadius !== "0px") || userSettings.editAll) && (style.getPropertyValue("display") !== "none" && style.getPropertyValue("visibility") !== "hidden" && style.getPropertyValue("opacity") !== "0");
        if (!isCandidate) return;

        // Compute desired radius
        const desired = computeNewRadius(element, style, currentBorderRadius);

        // If ratio mode and we don't have size yet, skip for now — resize observer will retry
        if (!desired) return;

        if (currentBorderRadius !== desired) {
            element.style.borderRadius = desired;
        }

        //check for shadow roots
        if (element.shadowRoot) {
            //create an observer for the shadow root
            observeDocumentChanges(element.shadowRoot);
            //if the element has a shadow root, then get all elements in the shadow root
            const shadowElements = element.shadowRoot.querySelectorAll('*');
            //call the function on all elements in the shadow root
            fixRounds(shadowElements);
        }
    });
}

function observeDocumentChanges(docToObserve) {
    if (watchedElements.has(docToObserve)) return;
    watchedElements.add(docToObserve);
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

    // Start observing the document (or any specific element)
    observer.observe(docToObserve, {
        childList: true,        // Watch for added/removed children
        subtree: true,          // Watch all descendants, not just direct children
        attributes: false,      // Don't watch attribute changes
        characterData: false    // Don't watch text content changes
    });
}
observeDocumentChanges(document.body);