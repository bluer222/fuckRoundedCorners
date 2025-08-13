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
    if(data != null){
      console.log("settings loaded");
    userSettings = data;
    }
    makeInputs(userSettings.mode, userSettings);
});


document.getElementById('save').addEventListener('click', () => {
  userSettings = {
    mode: document.getElementById('mode').value,
    roundAmount: 0,
    ratioAmount: 0,
    minRounding: 0,
    maxRounding: 0,
    editAll: document.getElementById('editAll').checked
  };
  if (userSettings.mode === "1") {
    userSettings.roundAmount = parseFloat(document.getElementById('roundAmount').value);
  } else if (userSettings.mode === "2") {
    userSettings.ratioAmount = parseFloat(document.getElementById('ratioAmount').value);
    userSettings.minRounding = parseFloat(document.getElementById('minRounding').value);
    userSettings.maxRounding = parseFloat(document.getElementById('maxRounding').value);
  } else if (userSettings.mode === "3") {
    userSettings.minRounding = parseFloat(document.getElementById('minRounding').value);
    userSettings.maxRounding = parseFloat(document.getElementById('maxRounding').value);
  }
  //save the settings to chrome storage
  chrome.storage.sync.set(userSettings).then(() => {
    console.log(userSettings);
    console.log('Settings saved');
  });
});


document.getElementById('mode').addEventListener('change', (event) => {
  const mode = event.target.value;
  makeInputs(mode);

});

function makeInputs(mode) {
  document.getElementById('mode').value = mode; // Set the mode in the dropdown
  document.getElementById('editAll').checked = userSettings.editAll; // Set the editAll checkbox state
  var inputs = document.getElementById('inputs');
  inputs.innerHTML = ""; // Clear previous inputs
  if (mode === "1") {
    // Create input for round amount
    const roundInput = document.createElement('input');
    roundInput.type = 'number';
    roundInput.id = 'roundAmount';
    roundInput.placeholder = 'Enter round amount';
    roundInput.value = userSettings.roundAmount; // Set default value if exists
    inputs.appendChild(roundInput);
  } else if (mode === "2") {
    // Create input for ratio
    const ratioInput = document.createElement('input');
    ratioInput.type = 'number';
    ratioInput.id = 'ratioAmount';
    ratioInput.placeholder = 'Enter ratio (e.g., 0.1 for 10%)';
    ratioInput.value = userSettings.ratioAmount; // Set default value if exists
    const min = document.createElement('input');
    min.type = 'number';
    min.id = 'minRounding';
    min.placeholder = 'Min rounding (0 to disable)';
    min.value = userSettings.minRounding; // Set default value if exists
    const max = document.createElement('input');
    max.type = 'number';
    max.id = 'maxRounding';
    max.placeholder = 'Max rounding (0 to disable)';
    max.value = userSettings.maxRounding; // Set default value if exists
    inputs.appendChild(ratioInput);
    inputs.appendChild(max);
    inputs.appendChild(min);
  } else if (mode === "3") {
    const min = document.createElement('input');
    min.type = 'number';
    min.id = 'minRounding';
    min.placeholder = 'Min rounding (0 to disable)';
    min.value = userSettings.minRounding; // Set default value if exists
    const max = document.createElement('input');
    max.type = 'number';
    max.id = 'maxRounding';
    max.placeholder = 'Max rounding (0 to disable)';
    max.value = userSettings.maxRounding; // Set default value if exists
    inputs.appendChild(max);
    inputs.appendChild(min);
  }
}