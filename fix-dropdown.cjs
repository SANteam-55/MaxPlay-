const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

// 1. Replace the select dropdown HTML
const oldSelectHTML = `<select id="up-type" class="input-control" onchange="onTypeDropdownChange(this.value)">
                    <option value="anime">Anime</option>
                    <option value="movie">Movie</option>
                    <option value="tv">TV Series</option>
                    <option value="short_tv">Short TV</option>
                  </select>`;

const newSelectHTML = `<div style="position:relative;">
                    <input type="hidden" id="up-type" value="anime">
                    <div id="custom-type-dropdown" class="input-control" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleCustomDropdown('type-options')">
                      <span id="custom-type-text" style="color:var(--text-primary);">Anime</span>
                      <i class="fa-solid fa-chevron-down" style="font-size:12px; color:var(--text-tertiary);"></i>
                    </div>
                    <div id="type-options" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; margin-top:4px; z-index:100; box-shadow:0 10px 25px rgba(0,0,0,0.5); overflow:hidden;">
                      <div class="custom-dropdown-item" onclick="selectTypeDropdown('anime', 'Anime')" style="padding:10px 14px; font-size:13px; cursor:pointer; color:var(--text-primary); border-bottom:1px solid rgba(255,255,255,0.05); transition:all 0.2s;">Anime</div>
                      <div class="custom-dropdown-item" onclick="selectTypeDropdown('movie', 'Movie')" style="padding:10px 14px; font-size:13px; cursor:pointer; color:var(--text-primary); border-bottom:1px solid rgba(255,255,255,0.05); transition:all 0.2s;">Movie</div>
                      <div class="custom-dropdown-item" onclick="selectTypeDropdown('tv', 'TV Series')" style="padding:10px 14px; font-size:13px; cursor:pointer; color:var(--text-primary); border-bottom:1px solid rgba(255,255,255,0.05); transition:all 0.2s;">TV Series</div>
                      <div class="custom-dropdown-item" onclick="selectTypeDropdown('short_tv', 'Short TV')" style="padding:10px 14px; font-size:13px; cursor:pointer; color:var(--text-primary); transition:all 0.2s;">Short TV</div>
                    </div>
                  </div>`;

content = content.replace(oldSelectHTML, newSelectHTML);

// 2. Add the JS functions
const oldSelectCustomDropdownFunc = `window.selectCustomDropdown = function(inputId, value, text, dropdownId, textId) {
      document.getElementById(inputId).value = value;
      document.getElementById(textId).innerText = text;
      document.getElementById(dropdownId).style.display = 'none';
    };`;

const newSelectCustomDropdownFunc = `window.selectCustomDropdown = function(inputId, value, text, dropdownId, textId) {
      document.getElementById(inputId).value = value;
      document.getElementById(textId).innerText = text;
      document.getElementById(dropdownId).style.display = 'none';
    };

    window.selectTypeDropdown = function(value, text) {
      document.getElementById('up-type').value = value;
      document.getElementById('custom-type-text').innerText = text;
      document.getElementById('type-options').style.display = 'none';
      if (typeof window.onTypeDropdownChange === 'function') {
        window.onTypeDropdownChange(value);
      }
    };

    window.setCustomTypeDropdown = function(value) {
      const el = document.getElementById('up-type');
      if (el) el.value = value;
      const textMap = { 'anime': 'Anime', 'movie': 'Movie', 'tv': 'TV Series', 'short_tv': 'Short TV' };
      const textEl = document.getElementById('custom-type-text');
      if (textEl) textEl.innerText = textMap[value] || value;
    };`;

content = content.replace(oldSelectCustomDropdownFunc, newSelectCustomDropdownFunc);

// 3. Fix the global click listener
const oldClickListener = `document.addEventListener('click', function(event) {
      const isDropdown = event.target.closest('#custom-search-hot-dropdown');
      const isOptions = event.target.closest('#search-hot-options');
      if (!isDropdown && !isOptions) {
        const options = document.getElementById('search-hot-options');
        if (options) options.style.display = 'none';
      }
    });`;

const newClickListener = `document.addEventListener('click', function(event) {
      if (!event.target.closest('#custom-search-hot-dropdown') && !event.target.closest('#search-hot-options')) {
        const options1 = document.getElementById('search-hot-options');
        if (options1) options1.style.display = 'none';
      }
      if (!event.target.closest('#custom-type-dropdown') && !event.target.closest('#type-options')) {
        const options2 = document.getElementById('type-options');
        if (options2) options2.style.display = 'none';
      }
    });`;

content = content.replace(oldClickListener, newClickListener);

// 4. Update programmatic assignments
content = content.replace(
  `document.getElementById('up-type').value = item.type || 'movie';`,
  `window.setCustomTypeDropdown(item.type || 'movie');`
);

content = content.replace(
  `document.getElementById('up-type').value = 'anime';`,
  `window.setCustomTypeDropdown('anime');`
);

content = content.replace(
  `if (typeSelect) typeSelect.value = 'movie';`,
  `window.setCustomTypeDropdown('movie');`
);

content = content.replace(
  `if (typeSelect && typeSelect.value === 'movie') typeSelect.value = 'anime';`,
  `const curType = document.getElementById('up-type')?.value; if (curType === 'movie') window.setCustomTypeDropdown('anime');`
);

fs.writeFileSync('public/admin.html', content, 'utf8');
console.log('Dropdown updated');
