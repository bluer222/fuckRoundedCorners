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

storage.sync.get(null).then((data) => {
    if (data != null) {
        userSettings = data;
    }
    console.log("load1");
    // Call the function on all elements initially
    fixRounds(document.querySelectorAll('*'));
    console.log("done1");
});

// Listen for changes in storage (cross-browser)
if (storage.onChanged) {
    storage.onChanged.addListener(() => {
        document.location.reload();
    });
} else if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(() => {
        document.location.reload();
    });
}

runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'reloadPage') {
        //reload the page to apply the new settings
        window.location.reload();
    }
});

function fixRounds(elementList) {
    elementList.forEach((element) => {
        // Exclusion logic
        if (
            userSettings.excludeClasses &&
            Array.isArray(userSettings.excludeClasses) &&
            userSettings.excludeClasses.some(cls => element.classList.contains(cls))
        ) {
            return;
        }
        if (
            userSettings.excludeIds &&
            Array.isArray(userSettings.excludeIds) &&
            userSettings.excludeIds.includes(element.id)
        ) {
            return;
        }
        var style = window.getComputedStyle(element);
        var currentBorderRadius = style.getPropertyValue("border-radius");
        //if the element has a border radius
        if ((currentBorderRadius !== "" && currentBorderRadius !== "0px") || userSettings.editAll) {

            var width = style.getPropertyValue("width");
            var height = style.getPropertyValue("height");
            //remove "px" from width and height
            width = parseFloat(width);
            height = parseFloat(height);
            //find the shortest side
            var shortestSide = Math.min(width, height);
            if (userSettings.mode === "1") {
                //round all corners the same amount
                element.style.borderRadius = userSettings.roundAmount + "px";
            } else if (userSettings.mode === "2") {
                //round all corners using a ratio relative to the shortest side
                if (userSettings.ratioAmount !== null) {
                    var newRadius = shortestSide * userSettings.ratioAmount;
                    if (newRadius < userSettings.minRounding) {
                        newRadius = userSettings.minRounding;
                    } else if (newRadius > userSettings.maxRounding && userSettings.maxRounding !== 0) {
                        newRadius = userSettings.maxRounding;
                    }
                    element.style.borderRadius = newRadius + "px";
                }
            } else if (userSettings.mode === "3") {
                //round all corners by applying a min and max to the existing rounding
                if (currentBorderRadius < userSettings.minRounding) {
                    element.style.borderRadius = userSettings.minRounding + "px";
                } else if (currentBorderRadius > userSettings.maxRounding && userSettings.maxRounding !== 0) {
                    element.style.borderRadius = userSettings.maxRounding + "px";
                }
            }
        }
        // Shadow DOM support
        if (element.shadowRoot) {
            observeDocumentChanges(element.shadowRoot);
            const shadowElements = element.shadowRoot.querySelectorAll('*');
            fixRounds(shadowElements);
        }
    });
}

function observeDocumentChanges(docToObserve) {
    const observer = new MutationObserver((mutations) => {
        const newElements = [];
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        newElements.push(node);
                        const descendants = node.querySelectorAll('*');
                        newElements.push(...descendants);
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
