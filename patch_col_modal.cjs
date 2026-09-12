const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Remove old modal HTML
const oldModalRegex = /<!-- Collection Card Modal -->[\s\S]*?<\/div>\s*<\/div>/;

const newModalHtml = `<!-- Collection Card Modal -->
  <div id="collection-card-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;">
    <div style="background:var(--bg-secondary); border:1px solid rgba(255,255,255,0.1); border-radius:24px; width:100%; max-width:960px; height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.8);">
      
      <!-- Header -->
      <div style="padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);">
        <div>
          <h3 style="margin:0; color:#FFF; font-size:20px; font-weight:800; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-layer-group" style="color:#10B981;"></i> Create Collection Card
          </h3>
          <p style="margin:4px 0 0 0; color:var(--text-tertiary); font-size:12px;">Group multiple episodes or movies into a single card on the home screen.</p>
        </div>
        <button type="button" onclick="document.getElementById('collection-card-modal').style.display='none'" style="background:rgba(255,255,255,0.1); border:none; width:32px; height:32px; border-radius:50%; color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Content Grid -->
      <div style="display:flex; flex:1; overflow:hidden;">
        
        <!-- Left Side: Form & Preview -->
        <div style="width:360px; min-width:360px; padding:24px; border-right:1px solid rgba(255,255,255,0.05); overflow-y:auto; background:var(--bg-tertiary); display:flex; flex-direction:column; gap:20px;">
          <input type="hidden" id="col-card-row-id">
          
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="form-group" style="margin:0;">
              <label style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Collection Title</label>
              <input type="text" id="col-card-title" class="form-control" placeholder="e.g. Dragon Ball Super" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#FFF;" oninput="updateColPreview()">
            </div>
            
            <div class="form-group" style="margin:0;">
              <label style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Portrait Poster URL</label>
              <input type="text" id="col-card-poster" class="form-control" placeholder="https://..." style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#FFF;" oninput="updateColPreview()">
            </div>

            <div class="form-group" style="margin:0;">
              <label style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Landscape Header URL</label>
              <input type="text" id="col-card-backdrop" class="form-control" placeholder="https://..." style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#FFF;">
            </div>
          </div>

          <!-- Live Preview -->
          <div style="margin-top:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top:20px;">
            <span style="font-size:10px; font-weight:800; color:#10B981; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Live Home Screen Preview</span>
            
            <div style="width:110px; display:flex; flex-direction:column; align-items:center; gap:8px;">
              <div style="width:110px; aspect-ratio:3/4; border-radius:8px; background:#1a1a1a; overflow:hidden; position:relative; box-shadow:0 10px 20px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);">
                <img id="col-preview-img" src="" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/150x200/1a1a1a/666666?text=No+Image'">
                <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%); pointer-events:none;"></div>
                <!-- Custom Badge -->
                <div style="position:absolute; top:6px; right:6px; background:rgba(16,185,129,0.9); backdrop-filter:blur(4px); padding:2px 6px; border-radius:4px; font-size:8px; font-weight:900; color:#FFF;">COLLECTION</div>
              </div>
              <span id="col-preview-title" style="font-size:11px; font-weight:700; color:#FFF; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Title</span>
            </div>
          </div>

        </div>

        <!-- Right Side: Item Selection -->
        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-secondary);">
          <div style="padding:16px 24px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; gap:16px; background:rgba(0,0,0,0.2);">
            <div>
              <span style="font-size:14px; font-weight:700; color:#FFF;">Select Content</span>
              <span id="col-selected-count" style="margin-left:8px; font-size:11px; background:rgba(16,185,129,0.2); color:#10B981; padding:2px 8px; border-radius:12px; font-weight:800;">0 Selected</span>
            </div>
            <div style="position:relative; width:220px;">
              <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-tertiary); font-size:12px;"></i>
              <input type="text" id="col-card-search" placeholder="Search items..." class="form-control" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:6px 12px 6px 32px; color:#FFF; font-size:12px;" onkeyup="renderColSelector()">
            </div>
          </div>
          
          <div id="col-card-list" style="flex:1; overflow-y:auto; padding:20px 24px; display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:16px; align-content:start;">
            <!-- Rendered by JS -->
          </div>
        </div>

      </div>

      <!-- Footer Action -->
      <div style="padding:16px 24px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:flex-end; align-items:center; background:var(--bg-tertiary);">
        <button type="button" class="btn-primary" onclick="saveCollectionCard()" style="background:linear-gradient(135deg, #10B981, #059669); color:#FFF; font-size:14px; font-weight:800; padding:12px 32px; border-radius:12px; border:none; cursor:pointer; box-shadow:0 4px 15px rgba(16,185,129,0.4); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          Save Collection
        </button>
      </div>

    </div>
  </div>`;

html = html.replace(oldModalRegex, newModalHtml);


// 2. Replace Old JS Functions
const oldJsRegex = /window\.openCollectionCardModal = function[\s\S]*?window\.renderHotRows\(\);\s*\};\s*/;

const newJs = `window.colSelectedItems = [];

    window.updateColPreview = function() {
      const title = document.getElementById('col-card-title').value;
      const poster = document.getElementById('col-card-poster').value;
      document.getElementById('col-preview-title').textContent = title || 'Title';
      document.getElementById('col-preview-img').src = poster || 'https://via.placeholder.com/150x200/1a1a1a/666666?text=No+Image';
    };

    window.openCollectionCardModal = function(rowId) {
      document.getElementById('col-card-row-id').value = rowId;
      document.getElementById('col-card-title').value = '';
      document.getElementById('col-card-poster').value = '';
      document.getElementById('col-card-backdrop').value = '';
      document.getElementById('col-card-search').value = '';
      
      window.colSelectedItems = [];
      window.updateColPreview();
      window.renderColSelector();

      document.getElementById('collection-card-modal').style.display = 'flex';
    };

    window.toggleColItem = function(id) {
      const idx = window.colSelectedItems.indexOf(id);
      if (idx > -1) {
        window.colSelectedItems.splice(idx, 1);
      } else {
        window.colSelectedItems.push(id);
      }
      window.renderColSelector();
    };

    window.renderColSelector = function() {
      const searchEl = document.getElementById('col-card-search');
      const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
      const list = document.getElementById('col-card-list');
      if (!list) return;
      list.innerHTML = '';
      
      const countEl = document.getElementById('col-selected-count');
      if (countEl) countEl.textContent = \`\${window.colSelectedItems.length} Selected\`;

      const docs = window.cachedContentDocs || [];
      
      let rendered = 0;
      docs.forEach(docItem => {
        const title = (docItem.data.title || '').toLowerCase();
        const id = docItem.id.toLowerCase();
        if (q && !title.includes(q) && !id.includes(q)) return;
        
        const isSelected = window.colSelectedItems.includes(docItem.id);
        const poster = docItem.data.posterUrl;

        const borderStyle = isSelected 
          ? 'border:2px solid #10B981; transform:scale(0.95);' 
          : 'border:2px solid transparent;';
        
        const overlay = isSelected 
          ? \`<div style="position:absolute; inset:0; background:rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px);">
               <div style="width:32px; height:32px; background:#10B981; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5);">
                 <i class="fa-solid fa-check"></i>
               </div>
             </div>\` 
          : \`<div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);"></div>\`;

        list.innerHTML += \`
          <div onclick="toggleColItem('\${docItem.id}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all 0.2s;">
            <div style="width:100%; aspect-ratio:3/4; border-radius:8px; overflow:hidden; position:relative; background:#1a1a1a; \${borderStyle} transition:all 0.2s;">
              <img src="\${poster}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
              \${overlay}
            </div>
            <span style="font-size:10px; color:\${isSelected ? '#10B981' : 'var(--text-secondary)'}; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:\${isSelected ? '800' : '600'};">
              \${docItem.data.title}
            </span>
          </div>
        \`;
        rendered++;
      });
      
      if (rendered === 0) {
        list.innerHTML = \`<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary); font-size:13px;"><i class="fa-solid fa-ghost" style="font-size:24px; margin-bottom:12px; display:block;"></i>No items found</div>\`;
      }
    };

    window.saveCollectionCard = function() {
      const rowId = document.getElementById('col-card-row-id').value;
      const title = document.getElementById('col-card-title').value;
      const poster = document.getElementById('col-card-poster').value;
      const backdrop = document.getElementById('col-card-backdrop').value;

      if(!title || !poster) {
        alert("Please provide a title and a portrait poster URL.");
        return;
      }

      if(window.colSelectedItems.length === 0) {
        alert("Please select at least one content item for this collection.");
        return;
      }

      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === rowId);
      if(!row) return;

      if(!row.contentIds) row.contentIds = [];
      row.contentIds.push({
        id: 'col_' + Date.now(),
        isCollection: true,
        customTitle: title,
        customImage: poster,
        backdropImage: backdrop,
        collectionIds: [...window.colSelectedItems] // Save selected items directly
      });

      document.getElementById('collection-card-modal').style.display = 'none';
      window.renderHotRows();
    };
`;

html = html.replace(oldJsRegex, newJs);
fs.writeFileSync('public/admin.html', html);
console.log("Patched Collection Card Modal");
