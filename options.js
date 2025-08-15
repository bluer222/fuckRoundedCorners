document.addEventListener('DOMContentLoaded', function() {
  const storage = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;

  const excludeClassInput = document.getElementById('excludeClassInput');
  const addClassBtn = document.getElementById('addClassBtn');
  const excludeClassesList = document.getElementById('excludeClassesList');

  const excludeIdInput = document.getElementById('excludeIdInput');
  const addIdBtn = document.getElementById('addIdBtn');
  const excludeIdsList = document.getElementById('excludeIdsList');
  const domModeCheckbox = document.getElementById('domMode');

  let excludeClasses = [];
  let excludeIds = [];
  let domMode = false;

  function renderList(list, arr, removeHandler) {
    list.innerHTML = '';
    arr.forEach((val, idx) => {
      const li = document.createElement('li');
      li.textContent = val;
      const btn = document.createElement('button');
      btn.textContent = 'Remove';
      btn.className = 'remove-btn';
      btn.addEventListener('click', () => removeHandler(idx));
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function saveOptions() {
    storage.sync.get(null).then((data) => {
      data.excludeClasses = excludeClasses;
      data.excludeIds = excludeIds;
      data.domMode = domMode;
      storage.sync.set(data).then(() => {
        document.getElementById('saveStatus').style.display = 'inline';
        setTimeout(() => {
          document.getElementById('saveStatus').style.display = 'none';
        }, 1200);
      });
    });
  }

  function loadOptions() {
    storage.sync.get(null).then((data) => {
      excludeClasses = Array.isArray(data.excludeClasses) ? data.excludeClasses : [];
      excludeIds = Array.isArray(data.excludeIds) ? data.excludeIds : [];
      domMode = data.domMode || false;
      domModeCheckbox.checked = domMode;
      renderList(excludeClassesList, excludeClasses, idx => {
        excludeClasses.splice(idx, 1);
        renderList(excludeClassesList, excludeClasses, arguments.callee);
      });
      renderList(excludeIdsList, excludeIds, idx => {
        excludeIds.splice(idx, 1);
        renderList(excludeIdsList, excludeIds, arguments.callee);
      });
    });
  }

  addClassBtn.addEventListener('click', () => {
    const val = excludeClassInput.value.trim();
    if (val && !excludeClasses.includes(val)) {
      excludeClasses.push(val);
      renderList(excludeClassesList, excludeClasses, idx => {
        excludeClasses.splice(idx, 1);
        renderList(excludeClassesList, excludeClasses, arguments.callee);
      });
      excludeClassInput.value = '';
    }
  });

  addIdBtn.addEventListener('click', () => {
    const val = excludeIdInput.value.trim();
    if (val && !excludeIds.includes(val)) {
      excludeIds.push(val);
      renderList(excludeIdsList, excludeIds, idx => {
        excludeIds.splice(idx, 1);
        renderList(excludeIdsList, excludeIds, arguments.callee);
      });
      excludeIdInput.value = '';
    }
  });

  domModeCheckbox.addEventListener('change', () => {
    domMode = domModeCheckbox.checked;
    storage.sync.get(null).then((data) => {
      data.domMode = domMode;
    });
  });

  document.getElementById('saveOptions').addEventListener('click', saveOptions);

  loadOptions();
});
