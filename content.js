//defaults
var userSettings = {
    mode: "1",
    roundAmount: 0,
    ratioAmount: 0,
    minRounding: 0,
    maxRounding: 0,
    editAll: false
};
chrome.storage.sync.get(null).then((data) => {
    if (data != null) {
        userSettings = data;
    }
    console.log("load1");
    // Call the function on all elements initially
    fixRounds(document.querySelectorAll('*'));
    console.log("done1");
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
    //reload the webpage
    document.location.reload();
});

function fixRounds(elementList) {
    elementList.forEach((element) => {
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

// Start observing the document (or any specific element)
observer.observe(document.body, {
    childList: true,        // Watch for added/removed children
    subtree: true,          // Watch all descendants, not just direct children
    attributes: false,      // Don't watch attribute changes
    characterData: false    // Don't watch text content changes
});