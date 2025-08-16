// Cross-browser storage API
if (!storage) {
    var storage = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
}
// Load settings & initial pass
storage.sync.get(null).then((data) => {
    if (data.mode) userSettings = data;
    //the CSS to inject
    var css = createCss();

    // Array to cache the foundSelectors
    var selectors = [];

    var userSettings = {
        mode: "1",
        roundAmount: 0,
        ratioAmount: 0,
        minRounding: 0,
        maxRounding: 0,
        excludeClasses: [],
        excludeIds: [],
    };

    // Caches / trackers
    const watchedDoms = new WeakSet();   // elements we attached observers to (attr + resize)

    //do we need to reload the page for new settings?
    let pendingReload = false;

    // Reload on settings change
    storage.onChanged.addListener(() => {
        pendingReload = true;
    });

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
    function createCss() {
        let newRadius = null;

        if (userSettings.mode === "1") {
            newRadius = userSettings.roundAmount + "px";
        } else if (userSettings.mode === "2") {
            if (userSettings.ratioAmount !== null) {
                if (settings.maxRounding === 0) {
                    newRadius = `max(${settings.minRounding + "px"}, min(${settings.ratioAmount * 100}cqw, ${settings.ratioAmount * 100}cqh))`;
                } else {
                    newRadius = `clamp(${settings.minRounding + "px"}, min(${settings.ratioAmount * 100}cqw, ${settings.ratioAmount * 100}cqh), ${settings.maxRounding + "px"})`;
                }
            }
        }

        return newRadius;
    }

    function fixRounds(elementList) {
        elementList.forEach((element) => {
            if (shouldExclude(element)) return;

            //check for shadow roots first because an element that does not meet requrements
            //can still have a shadow root that does
            if (element.shadowRoot) {
                //create an observer for the shadow root
                if (observeDOMChanges(element.shadowRoot)) {
                    //if the element has a shadow root, then get all elements in the shadow root
                    const shadowElements = element.shadowRoot.querySelectorAll('*');
                    //call the function on all elements in the shadow root
                    fixRounds(shadowElements);
                }
            }

            if (!element || element.nodeType !== 1) return;

            //do it this way to overrule any !important styles
            element.style.setProperty('border-radius', css, 'important');
        });
    }

    // Create an observer for observing shadow DOM changes
    const shadowObserver = new MutationObserver((mutations) => {
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

    // Create an observer for observing changes in the main DOM
    const mainObserver = new MutationObserver((mutations) => {
        const newElements = [];

        mutations.forEach((mutation) => {
            // Check for added nodes
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    // Only process element nodes (nodeType 1), skip text nodes, comments, etc.
                    if (node.nodeType === 1) {
                        if (node.shadowRoot) {
                            //create an observer for the shadow root
                            if (observeDOMChanges(node.shadowRoot)) {
                                //if the element has a shadow root, then get all elements in the shadow root
                                const shadowElements = node.shadowRoot.querySelectorAll('*');
                                //call the function on all elements in the shadow root
                                fixRounds(shadowElements);
                            }
                        }
                        //if we have selectors cached, check if the node matches any of them
                        if (selectors.length !== 0) {
                            //if the node matches any of the selectors we found earlier
                            if (node.matches(selectors.join(', '))) {
                                newElements.push(node);
                            }
                        }
                    }
                });
            }
        });

        // Call your function with the array of new elements (if any were found)
        if (newElements.length > 0) {
            fixRounds(newElements);
        }
    });

    function observeDOMChanges(docToObserve) {
        if (watchedDoms.has(docToObserve)) return false;
        watchedDoms.add(docToObserve);

        // Start observing the document (or any specific element)
        shadowObserver.observe(docToObserve, {
            childList: true,        // Watch for added/removed children
            subtree: true,          // Watch all descendants, not just direct children
            attributes: false,      // Don't watch attribute changes
            characterData: false    // Don't watch text content changes
        });
        return true; // Indicate that we started observing
    }

    function observeDocumentChanges() {
        // Start observing the document (or any specific element)
        mainObserver.observe(document, {
            childList: true,        // Watch for added/removed children
            subtree: true,          // Watch all descendants, not just direct children
            attributes: false,      // Don't watch attribute changes
            characterData: false    // Don't watch text content changes
        });
        return true; // Indicate that we started observing
    }

    function findElementsWithShadowRoots() {
        const elementsWithShadowRoots = [];
        const allElements = document.querySelectorAll('*');
        allElements.forEach((element) => {
            if (element.shadowRoot) {
                elementsWithShadowRoots.push(element);
            }
        });
        return elementsWithShadowRoots;
    }

    function findElementsWithImportantBorderRadius() {
        const matchingElements = [];
        const foundSelectors = [];

        // First, find all CSS rules with !important border-radius
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const stylesheet = document.styleSheets[i];
                const rules = stylesheet.cssRules || stylesheet.rules;

                for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];

                    if (rule.type === CSSRule.STYLE_RULE) {
                        checkRule(rule, foundSelectors);
                    }

                }
            } catch (e) {
                // Skip inaccessible stylesheets
            }
        }

        selectors = foundSelectors; // Cache the selectors for later use

        // Now find actual elements that match those selectors
        foundSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (!matchingElements.includes(element)) {
                        matchingElements.push(element);
                    }
                });
            } catch (e) {
                // Skip invalid selectors
            }
        });

        return matchingElements;
    }

    function checkRule(rule, foundSelectors) {
        const style = rule.style;
        const props = ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'];

        for (const prop of props) {
            if (style.getPropertyValue(prop) && style.getPropertyPriority(prop) === 'important') {
                foundSelectors.push(rule.selectorText);
                break; // Only add selector once even if multiple border-radius props have !important
            }
        }
    }

    // Observe the document for new shadow roots and elements with important border-radius
    observeDocumentChanges();
    // Find elements with important border-radius and shadow roots
    var elements = findElementsWithImportantBorderRadius();
    elements = elements.concat(findElementsWithShadowRoots());
    // Initial sweep
    fixRounds(elements);
});