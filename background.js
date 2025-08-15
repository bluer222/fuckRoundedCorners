var userSettings = {
    mode: "1",
    roundAmount: 0,
    ratioAmount: 0,
    minRounding: 0,
    maxRounding: 0,
    editAll: false,
    excludeClasses: [],
    excludeIds: [],
    domMode: false
};

// CSS to inject
let css = "";
function createStyleSheet(settings) {
    //add a . to the start of each class name
    var excludeClasses = settings.excludeClasses.map(c => '.' + c).join(', ');
    //add a # to the start of each id name
    var excludeIds = settings.excludeIds.map(i => '#' + i).join(', ');

    var css = '*:not('
    if (excludeClasses) css += excludeClasses;
    if (excludeIds) css += excludedIds;
    css += ') { ';

    if (settings.mode === "1") {
        css += `border-radius: ${settings.roundAmount}px !important; `;
    }
    else if (settings.mode === "2") {
        if (settings.maxRounding === 0) {
            css += `border-radius: max(${settings.minRounding + "px"}, min(${settings.ratioAmount * 100}cqw, ${settings.ratioAmount * 100}cqh)) !important; `;
        } else {
            css += `border-radius: clamp(${settings.minRounding + "px"}, min(${settings.ratioAmount * 100}cqw, ${settings.ratioAmount * 100}cqh), ${settings.maxRounding + "px"}) !important; `;
        }
    }
    css += '}';
    console.log("Generated CSS:", css);
    return css;
}

// Cross-browser API
const storage = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
const runtime = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : chrome.runtime;
const scripting = (typeof browser !== "undefined" && browser.scripting) ? browser.scripting : chrome.scripting;
const tabsapi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : chrome.tabs;

function isURLRestricted(url) {
    if (!url) return true;

    const restrictedPatterns = [
        /^chrome:\/\//,           // Chrome internal pages
        /^chrome-extension:\/\//, // Extension pages
        /^edge:\/\//,            // Edge internal pages
        /^about:/,               // Firefox about pages
        /^moz-extension:\/\//,   // Firefox extension pages
        /^safari-extension:\/\//, // Safari extension pages
        /^devtools:\/\//,        // DevTools
        /^view-source:/,         // View source pages
        /^data:/,                // Data URLs
        /^file:\/\//,            // Local files (usually restricted)
        /^ftp:/                  // FTP (often restricted)
    ];

    return restrictedPatterns.some(pattern => pattern.test(url));
}

// Function to inject CSS into a specific tab
async function injectCSSIntoTab(tab, css) {
    //make sure its not a restricted URL, rememvber user can use firefox or edge as well as chrome
    if (!isURLRestricted(tab.url)) {
        try {
            await scripting.insertCSS({
                target: { tabId: tab.id },
                css: css
            });
            console.log(`CSS injected into tab ${tab.id}`);
        } catch (error) {
            console.error(`Failed to inject CSS into tab ${tab.id}:`, error);
        }
    }
}

// Function to remove CSS from a specific tab
async function removeFromTab(tab, css) {
    //make sure its not a restricted URL
    if (!isURLRestricted(tab.url)) {
        try {
            await scripting.removeCSS({
                target: { tabId: tab.id },
                css: css
            });
            console.log(`CSS removed from tab ${tab.id}`);
        } catch (error) {
            console.error(`Failed to remove CSS from tab ${tab.id}:`, error);
        }
    }
}

// Inject CSS into all existing tabs when extension starts
async function injectIntoAllTabs(css) {
    try {
        const tabs = await tabsapi.query({});

        for (const tab of tabs) {
            await injectCSSIntoTab(tab, css);

        }
    } catch (error) {
        console.error('Failed to inject into all tabs:', error);
    }
}

// remove CSS from all existing tabs when extension starts
async function removeFromAllTabs(css) {
    try {
        const tabs = await tabsapi.query({});

        for (const tab of tabs) {
            await removeFromTab(tab, css);

        }
    } catch (error) {
        console.error('Failed to inject into all tabs:', error);
    }
}

// Listen for new tabs
tabsapi.onCreated.addListener((tab) => {
    console.log('New tab created:', tab.id);
    // Note: Can't inject immediately as page might not be loaded yet
});

// Listen for tab updates (when page loads/navigates)
tabsapi.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Inject CSS when the page has finished loading
    if (changeInfo.status === 'loading' && tab.url) {
        if (!userSettings.domMode) {
            await injectCSSIntoTab(tab, css);
        }

    }
});

// Inject into all existing tabs when extension is installed/enabled
runtime.onInstalled.addListener(() => {
    console.log('Extension installed/enabled');
    load();
});

// Also inject when extension starts up (browser restart)
runtime.onStartup.addListener(() => {
    console.log('Extension starting up');
    load();
});

function load() {
    // Load settings
    storage.sync.get(null).then((data) => {
        if (data != null) userSettings = data;
        if (!userSettings.domMode) {
            //create stylesheet
            css = createStyleSheet(userSettings);
            // Run the function to fix rounded corners
            injectIntoAllTabs(css)
        } else {
            console.log("DOM mode is enabled, not injecting CSS");
        }
    });

}

// wait for changes in settings
storage.onChanged.addListener(() => {
    if (!userSettings.domMode) {

        //remove old CSS from all tabs
        console.log('Settings changed, removing CSS');

        removeFromAllTabs(css).then(() => {
            console.log('Settings changed, adding CSS');
            load();
        });
    }
});