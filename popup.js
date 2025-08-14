document.addEventListener('DOMContentLoaded', function () {
  // Custom dropdown logic
  const dropdown = document.getElementById('customDropdown');
  const selected = document.getElementById('dropdownSelected');
  const list = document.getElementById('dropdownList');
  const options = list.querySelectorAll('.custom-dropdown-option');
  const modeInput = document.getElementById('mode');

  selected.addEventListener('click', () => {
    list.classList.toggle('show');
  });

  options.forEach(option => {
    option.addEventListener('click', () => {
      selected.textContent = option.textContent;
      modeInput.value = option.getAttribute('data-value');
      list.classList.remove('show');
      // Trigger change event for compatibility with popup.js
      modeInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  document.addEventListener('mousedown', (e) => {
    if (!dropdown.contains(e.target)) {
      list.classList.remove('show');
    }
  });

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

  storage.sync.get(null).then((data) => {
    if (data != null) {
      console.log("settings loaded");
      userSettings = data;
    }
    makeInputs(userSettings.mode, userSettings);

    // Set custom dropdown to correct value on load
    const modeValue = userSettings.mode || "1";
    document.getElementById('mode').value = modeValue;
    const dropdownOptions = document.querySelectorAll('.custom-dropdown-option');
    dropdownOptions.forEach(opt => {
      if (opt.getAttribute('data-value') === modeValue) {
        document.getElementById('dropdownSelected').textContent = opt.textContent;
      }
    });
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
    //save the settings to storage
    storage.sync.set(userSettings).then(() => {
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
      // create label for radius input
      const riLabel = document.createElement('label');
      riLabel.htmlFor = 'roundAmount';
      riLabel.textContent = 'Corner Radius: ';
      riLabel.classNaame = 'input-label';
      // Create input for radius
      const roundInput = document.createElement('input');
      roundInput.type = 'number';
      roundInput.id = 'roundAmount';
      roundInput.value = userSettings.roundAmount;

      inputs.appendChild(riLabel);
      inputs.appendChild(roundInput);
    } else if (mode === "2") {
      //round all corners using a ratio relative to the shortest side
      // Create label for ratio input
      const ratioLabel = document.createElement('label');
      ratioLabel.htmlFor = 'ratioAmount';
      ratioLabel.textContent = 'Enter ratio (e.g., 0.1 for 10%): ';
      ratioLabel.className = 'input-label';
      // Create input for ratio
      const ratioInput = document.createElement('input');
      ratioInput.type = 'number';
      ratioInput.id = 'ratioAmount';
      ratioInput.value = userSettings.ratioAmount; // Set default value if exists

      // Max
      const maxLabel = document.createElement('label');
      maxLabel.htmlFor = 'maxRounding';
      maxLabel.textContent = 'Max rounding (0 to disable):';
      maxLabel.className = 'input-label';
      const max = document.createElement('input');
      max.type = 'number';
      max.id = 'maxRounding';
      max.value = userSettings.maxRounding;
      // Min
      const minLabel = document.createElement('label');
      minLabel.htmlFor = 'minRounding';
      minLabel.textContent = 'Min rounding (0 to disable):';
      minLabel.className = 'input-label';
      const min = document.createElement('input');
      min.type = 'number';
      min.id = 'minRounding';
      min.value = userSettings.minRounding;

      inputs.appendChild(ratioLabel);
      inputs.appendChild(ratioInput);
      inputs.appendChild(maxLabel);
      inputs.appendChild(max);
      inputs.appendChild(minLabel);
      inputs.appendChild(min);
    } else if (mode === "3") {
      //round all corners by applying a min and max to the existing rounding
      // Max
      const maxLabel = document.createElement('label');
      maxLabel.htmlFor = 'maxRounding';
      maxLabel.textContent = 'Max rounding (0 to disable):';
      maxLabel.className = 'input-label';
      const max = document.createElement('input');
      max.type = 'number';
      max.id = 'maxRounding';
      max.value = userSettings.maxRounding;
      // Min
      const minLabel = document.createElement('label');
      minLabel.htmlFor = 'minRounding';
      minLabel.textContent = 'Min rounding (0 to disable):';
      minLabel.className = 'input-label';
      const min = document.createElement('input');
      min.type = 'number';
      min.id = 'minRounding';
      min.value = userSettings.minRounding;

      inputs.appendChild(maxLabel);
      inputs.appendChild(max);
      inputs.appendChild(minLabel);
      inputs.appendChild(min);
    }
  }
});