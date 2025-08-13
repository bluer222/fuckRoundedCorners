
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'reloadPage') {
        //reload the page to apply the new settings
        window.location.reload();
    }
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

const callback = (mutationsList, observer) => {
        fixRounds(document.querySelectorAll('*'));
};
// Create an observer and when the body changes
var observer = new MutationObserver(callback);
observer.observe(document.body, {
    childList: true,
    subtree: true

});
