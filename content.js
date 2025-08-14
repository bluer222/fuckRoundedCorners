//defaults
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

// Use Sets for fast exclusion lookup
let excludeClassSet = new Set();
let excludeIdSet = new Set();
const processedElements = new WeakSet();

function updateExclusionSets() {
    excludeClassSet = new Set(userSettings.excludeClasses || []);
    excludeIdSet = new Set(userSettings.excludeIds || []);
}

// Debounce utility
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Only process visible elements once on load, after DOM settles
const initialProcess = debounce(() => {
    fixRounds(document.body.querySelectorAll('*'));
}, 200);

storage.sync.get(null).then((data) => {
    if (data != null) {
        userSettings = data;
        updateExclusionSets();
    }
    initialProcess();
});

if (storage.onChanged) {
    storage.onChanged.addListener(() => document.location.reload());
} else if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(() => document.location.reload());
}

runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'reloadPage') {
        window.location.reload();
    }
});

function shouldExclude(element) {
    // Exclude by class
    for (const cls of excludeClassSet) {
        if (element.classList && element.classList.contains(cls)) return true;
    }
    // Exclude by id
    if (element.id && excludeIdSet.has(element.id)) return true;
    return false;
}

function isVisibleAndSized(element) {
    // Only process elements that are visible and have size
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).display !== "none";
}

function setBorderRadiusIfNeeded(element, value) {
    if (element.style.borderRadius !== value) {
        element.style.borderRadius = value;
    }
}

function fixRounds(elementList) {
    elementList.forEach((element) => {
        if (processedElements.has(element)) return;
        if (!isVisibleAndSized(element)) return;
        if (shouldExclude(element)) return;

        const style = window.getComputedStyle(element);
        const currentBorderRadius = style.getPropertyValue("border-radius");
        let newRadius = null;

        if ((currentBorderRadius !== "" && currentBorderRadius !== "0px") || userSettings.editAll) {
            const width = parseFloat(style.getPropertyValue("width"));
            const height = parseFloat(style.getPropertyValue("height"));
            if (!width || !height) return;
            const shortestSide = Math.min(width, height);
            if (userSettings.mode === "1") {
                newRadius = userSettings.roundAmount + "px";
            } else if (userSettings.mode === "2") {
                if (userSettings.ratioAmount !== null) {
                    let calcRadius = shortestSide * userSettings.ratioAmount;
                    if (calcRadius < userSettings.minRounding) {
                        calcRadius = userSettings.minRounding;
                    } else if (calcRadius > userSettings.maxRounding && userSettings.maxRounding !== 0) {
                        calcRadius = userSettings.maxRounding;
                    }
                    newRadius = calcRadius + "px";
                }
            } else if (userSettings.mode === "3") {
                const numericRadius = parseFloat(currentBorderRadius);
                if (numericRadius < userSettings.minRounding) {
                    newRadius = userSettings.minRounding + "px";
                } else if (numericRadius > userSettings.maxRounding && userSettings.maxRounding !== 0) {
                    newRadius = userSettings.maxRounding + "px";
                }
            }
            if (newRadius && currentBorderRadius !== newRadius) {
                setBorderRadiusIfNeeded(element, newRadius);
            }
        }
        processedElements.add(element);

        // Only observe shadow roots if present and not already observed
        if (element.shadowRoot && !element.shadowRoot.__fcr_observed) {
            element.shadowRoot.__fcr_observed = true;
            observeDocumentChanges(element.shadowRoot);
            fixRounds(element.shadowRoot.querySelectorAll('*'));
        }
    });
}

function observeDocumentChanges(docToObserve) {
    const observer = new MutationObserver((mutations) => {
        const newElements = [];
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && !processedElements.has(node)) {
                        newElements.push(node);
                        // Only query descendants if node is an element and not excluded
                        if (!shouldExclude(node)) {
                            const descendants = node.querySelectorAll('*');
                            descendants.forEach(desc => {
                                if (!processedElements.has(desc)) newElements.push(desc);
                            });
                        }
                    }
                });
            }
        });
        if (newElements.length > 0) {
            fixRounds(newElements);
        }
    });
    observer.observe(docToObserve, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
}
observeDocumentChanges(document.body);
