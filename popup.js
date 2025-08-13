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
  //round all corners the same amount
  if (mode === "1") {
    // Create input for radius
    const roundInput = document.createElement('input');
    roundInput.type = 'number';
    roundInput.id = 'roundAmount';
    roundInput.name = 'roundAmount';
    roundInput.value = userSettings.roundAmount;
    // create label for radius input
    const riLabel = document.createElement('label');
    riLabel.htmlFor = 'roundAmount';
    riLabel.textContent = 'Corner Radius: ';


    inputs.appendChild(riLabel);
    inputs.appendChild(roundInput);

  } else if (mode === "2") {
    //round all corners using a ratio relative to the shortest side
    // Create input for ratio
    const ratioInput = document.createElement('input');
    ratioInput.type = 'number';
    ratioInput.id = 'ratioAmount';
    ratioInput.name = 'ratioAmount';
    ratioInput.value = userSettings.ratioAmount; // Set default value if exists
    // Create label for ratio input
    const ratioLabel = document.createElement('label');
    ratioLabel.htmlFor = 'ratioAmount';
    ratioLabel.textContent = 'Enter ratio (e.g., 0.1 for 10%): ';

    // Create inputs for min and max rounding
    const min = document.createElement('input');
    min.type = 'number';
    min.id = 'minRounding';
    min.name = 'minRounding';
    min.value = userSettings.minRounding; // Set default value if exists
    const max = document.createElement('input');
    max.type = 'number';
    max.id = 'maxRounding';
    max.name = 'maxRounding';
    max.value = userSettings.maxRounding; // Set default value if exists
    //create label for min and max inputs
    const minLabel = document.createElement('label');
    minLabel.htmlFor = 'minRounding';
    minLabel.textContent = 'Min rounding (0 to disable): ';
    const maxLabel = document.createElement('label');
    maxLabel.htmlFor = 'maxRounding';
    maxLabel.textContent = 'Max Rounding(0 to disable): ';

    inputs.appendChild(ratioLabel);
    inputs.appendChild(ratioInput);
    inputs.appendChild(document.createElement('br'));
    inputs.appendChild(minLabel);
    inputs.appendChild(min);
    inputs.appendChild(document.createElement('br'));
    inputs.appendChild(maxLabel);
    inputs.appendChild(max);

  } else if (mode === "3") {
    //round all corners by applying a min and max to the existing rounding
    // Create inputs for min and max rounding
    const min = document.createElement('input');
    min.type = 'number';
    min.id = 'minRounding';
    min.name = 'minRounding';
    min.value = userSettings.minRounding; // Set default value if exists
    const max = document.createElement('input');
    max.type = 'number';
    max.id = 'maxRounding';
    max.name = 'maxRounding';
    max.value = userSettings.maxRounding; // Set default value if exists
    //create label for min and max inputs
    const minLabel = document.createElement('label');
    minLabel.htmlFor = 'minRounding';
    minLabel.textContent = 'Min rounding (0 to disable): ';
    const maxLabel = document.createElement('label');
    maxLabel.htmlFor = 'maxRounding';
    maxLabel.textContent = 'Max Rounding(0 to disable): ';

    inputs.appendChild(minLabel);
    inputs.appendChild(min);
    inputs.appendChild(document.createElement('br'));
    inputs.appendChild(maxLabel);
    inputs.appendChild(max);
  }
}