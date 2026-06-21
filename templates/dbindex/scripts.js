(function() {
  const vscode = acquireVsCodeApi();

  // Active View Elements
  const viewIndexes = document.getElementById('view-indexes');
  const viewCuration = document.getElementById('view-curation');

  // List View Elements
  const container = document.getElementById('index-cards');
  const buildNewBtn = document.getElementById('btn-build-new');
  const chkEmbeddings = document.getElementById('chk-enable-embeddings');

  // Curation View Elements
  const btnBack = document.getElementById('btn-back');
  const btnSaveCuration = document.getElementById('btn-save-curation');
  const curationDb = document.getElementById('curation-db');
  const curationConn = document.getElementById('curation-conn');
  const txtObjectSearch = document.getElementById('txt-object-search');
  const objectsList = document.getElementById('objects-list');
  const joinsList = document.getElementById('joins-list');
  const synonymsList = document.getElementById('synonyms-list');

  // Join Form Elements
  const selJoinSrcTable = document.getElementById('sel-join-src-table');
  const selJoinSrcCol = document.getElementById('sel-join-src-col');
  const selJoinTgtTable = document.getElementById('sel-join-tgt-table');
  const selJoinTgtCol = document.getElementById('sel-join-tgt-col');
  const txtJoinVia = document.getElementById('txt-join-via');
  const btnAddJoin = document.getElementById('btn-add-join');

  // Synonym Form Elements
  const txtSynWord = document.getElementById('txt-syn-word');
  const txtSynList = document.getElementById('txt-syn-list');
  const btnAddSynonym = document.getElementById('btn-add-synonym');

  // Local Curation State
  let curatingConnectionId = '';
  let curatingDatabase = '';
  let curatingObjects = [];
  let curatingBaseJoins = [];
  let curatingMinedSynonyms = {};
  let curatingOverrides = { joins: [], synonyms: {}, objects: {} };

  // Handle setting updates
  chkEmbeddings.addEventListener('change', () => {
    vscode.postMessage({
      command: 'updateConfig',
      enableEmbeddings: chkEmbeddings.checked
    });
  });

  buildNewBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'buildNew' });
  });

  btnBack.addEventListener('click', () => {
    viewCuration.style.display = 'none';
    viewIndexes.style.display = 'block';
    // Clear state
    curatingConnectionId = '';
    curatingDatabase = '';
    curatingObjects = [];
    curatingBaseJoins = [];
    curatingOverrides = { joins: [], synonyms: {}, objects: {} };
  });

  btnSaveCuration.addEventListener('click', () => {
    vscode.postMessage({
      command: 'saveOverrides',
      connectionId: curatingConnectionId,
      database: curatingDatabase,
      overrides: curatingOverrides
    });
  });

  // Tab Switching Logic
  const tabButtons = document.querySelectorAll('.curation-tabs .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Search Filter
  txtObjectSearch.addEventListener('input', () => {
    renderObjectsTab();
  });

  // Message Listener
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'state':
        renderState(message.state);
        break;
      case 'details':
        loadCurationState(message);
        break;
      case 'detailsError':
        alert('Failed to load curation workspace: ' + message.error);
        break;
    }
  });

  function renderState(state) {
    chkEmbeddings.checked = !!state.enableEmbeddings;

    if (!state.indexes || state.indexes.length === 0) {
      container.innerHTML = `
        <div class="pg-empty-state">
          <p>No active database indexes found.</p>
          <button id="btn-empty-build" class="empty-cta">⚡ Index a Database</button>
        </div>
      `;
      document.getElementById('btn-empty-build')?.addEventListener('click', () => {
        vscode.postMessage({ command: 'buildNew' });
      });
      return;
    }

    container.innerHTML = '';
    state.indexes.forEach(idx => {
      const card = document.createElement('div');
      card.className = 'pg-card db-index-card';

      const dateStr = idx.indexedAt ? new Date(idx.indexedAt).toLocaleString() : 'N/A';
      const statusClass = idx.drift ? 'drift' : (idx.indexedAt ? 'fresh' : 'none');
      const statusLabel = idx.drift ? 'Drifted' : (idx.indexedAt ? 'Fresh' : 'Not Indexed');

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <span>💾</span>
            <strong>${idx.database}</strong>
            <span class="pg-text-meta">(${idx.connectionName})</span>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <span class="pg-text-meta">Indexed Objects</span>
            <span class="val">${idx.tables || 0} tables · ${idx.views || 0} views · ${idx.functions || 0} fns</span>
          </div>
          <div class="stat-item">
            <span class="pg-text-meta">Last Updated</span>
            <span class="val">${dateStr}</span>
          </div>
          <div class="stat-item">
            <span class="pg-text-meta">Depth</span>
            <span class="val">${idx.depth || 'N/A'}</span>
          </div>
        </div>

        <div class="scope-details">
          <strong>Scope:</strong> Schemas: <code>${idx.schemas ? idx.schemas.join(', ') : 'none'}</code> 
          ${idx.piiCount > 0 ? ` · <span style="color:var(--vscode-errorForeground)">${idx.piiCount} PII columns excluded</span>` : ''}
        </div>

        <div class="card-actions">
          <button class="pg-btn pg-btn--primary btn-curate" data-conn="${idx.connectionId}" data-db="${idx.database}">
            🔧 Curate
          </button>
          <button class="pg-btn pg-btn--ghost btn-rebuild" data-conn="${idx.connectionId}" data-db="${idx.database}">
            Rebuild
          </button>
          <button class="pg-btn pg-btn--ghost btn-export" data-conn="${idx.connectionId}" data-db="${idx.database}">
            Export Schema
          </button>
          <button class="pg-btn pg-btn--ghost btn-clear" data-conn="${idx.connectionId}" data-db="${idx.database}" style="color:var(--vscode-errorForeground)">
            Delete Index
          </button>
        </div>
      `;

      card.querySelector('.btn-curate').addEventListener('click', () => {
        vscode.postMessage({
          command: 'requestDetails',
          connectionId: idx.connectionId,
          database: idx.database
        });
      });

      card.querySelector('.btn-rebuild').addEventListener('click', () => {
        vscode.postMessage({
          command: 'rebuild',
          connectionId: idx.connectionId,
          database: idx.database
        });
      });

      card.querySelector('.btn-export').addEventListener('click', () => {
        vscode.postMessage({
          command: 'export',
          connectionId: idx.connectionId,
          database: idx.database
        });
      });

      card.querySelector('.btn-clear').addEventListener('click', () => {
        vscode.postMessage({
          command: 'clear',
          connectionId: idx.connectionId,
          database: idx.database
        });
      });

      container.appendChild(card);
    });
  }

  function loadCurationState(message) {
    curatingConnectionId = message.connectionId;
    curatingDatabase = message.database;
    curatingObjects = message.objects;
    curatingBaseJoins = message.baseJoins || [];
    curatingMinedSynonyms = message.minedSynonyms || {};

    // Clone overrides safely
    curatingOverrides = JSON.parse(JSON.stringify(message.overrides || {}));
    if (!curatingOverrides.joins) curatingOverrides.joins = [];
    if (!curatingOverrides.synonyms) curatingOverrides.synonyms = {};
    if (!curatingOverrides.objects) curatingOverrides.objects = {};

    curationDb.innerText = curatingDatabase;
    curationConn.innerText = `(${curatingConnectionId})`;

    // Reset view
    viewIndexes.style.display = 'none';
    viewCuration.style.display = 'block';

    // Reset tabs (Objects default active)
    tabButtons.forEach((b, i) => {
      if (i === 0) b.classList.add('active');
      else b.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach((c, i) => {
      if (i === 0) c.classList.add('active');
      else c.classList.remove('active');
    });

    txtObjectSearch.value = '';

    // Render workspace contents
    renderObjectsTab();
    renderJoinsTab();
    renderSynonymsTab();
    setupJoinsForm();
  }

  // Safely retrieve/initialize overrides path
  function getOrCreateObjectOverride(ref) {
    if (!curatingOverrides.objects) {
      curatingOverrides.objects = {};
    }
    if (!curatingOverrides.objects[ref]) {
      curatingOverrides.objects[ref] = { columns: {} };
    }
    if (!curatingOverrides.objects[ref].columns) {
      curatingOverrides.objects[ref].columns = {};
    }
    return curatingOverrides.objects[ref];
  }

  // --- RENDERING: OBJECTS TAB ---
  function renderObjectsTab() {
    objectsList.innerHTML = '';
    const query = txtObjectSearch.value.trim().toLowerCase();

    const filtered = curatingObjects.filter(obj => {
      if (!query) return true;
      if (obj.ref.toLowerCase().includes(query)) return true;
      if (obj.comment && obj.comment.toLowerCase().includes(query)) return true;
      return false;
    });

    if (filtered.length === 0) {
      objectsList.innerHTML = '<p class="pg-empty-state">No objects matched your search filter.</p>';
      return;
    }

    filtered.forEach(obj => {
      const isExcluded = curatingOverrides.objects?.[obj.ref]?.excluded ?? false;
      const commentVal = curatingOverrides.objects?.[obj.ref]?.comment ?? obj.comment ?? '';

      const kindLabels = {
        table: '💾 TABLE',
        view: '👁️ VIEW',
        matview: '👁️ MATVIEW',
        function: '⚡ FUNCTION',
        enum: '🔢 ENUM',
        domain: '🏷️ DOMAIN',
        sequence: '🔢 SEQ'
      };
      const label = kindLabels[obj.kind] || obj.kind.toUpperCase();

      const item = document.createElement('div');
      item.className = `tree-item ${isExcluded ? 'excluded-item' : ''}`;

      item.innerHTML = `
        <div class="tree-header">
          <div class="tree-toggle-icon">▶</div>
          <div class="tree-info">
            <span class="obj-kind">${label}</span>
            <span class="obj-ref"><strong>${obj.ref}</strong></span>
          </div>
          <div class="tree-actions" onclick="event.stopPropagation()">
            <input type="text" class="pg-input obj-comment-input" placeholder="Custom description..." value="${commentVal}">
            <label class="checkbox-container">
              <input type="checkbox" class="chk-exclude" ${isExcluded ? 'checked' : ''}>
              <span class="checkbox-label">Exclude</span>
            </label>
          </div>
        </div>
        <div class="tree-children" style="display: none;">
          <table class="columns-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>PII</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${obj.columns.map(col => {
                const colOverride = curatingOverrides.objects?.[obj.ref]?.columns?.[col.name];
                const isPii = colOverride?.pii ?? col.pii ?? false;
                const colComment = colOverride?.comment ?? col.comment ?? '';
                return `
                  <tr class="${isPii ? 'pii-row' : ''}">
                    <td><code>${col.name}</code></td>
                    <td class="col-type">${col.type}</td>
                    <td>
                      <label class="checkbox-container">
                        <input type="checkbox" class="chk-pii" data-ref="${obj.ref}" data-col="${col.name}" ${isPii ? 'checked' : ''}>
                        <span class="checkbox-label">PII</span>
                      </label>
                    </td>
                    <td>
                      <input type="text" class="pg-input col-comment-input" data-ref="${obj.ref}" data-col="${col.name}" placeholder="Custom column description..." value="${colComment}">
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Expand/collapse child columns
      const header = item.querySelector('.tree-header');
      const children = item.querySelector('.tree-children');
      const toggleIcon = item.querySelector('.tree-toggle-icon');

      header.addEventListener('click', () => {
        const isCollapsed = children.style.display === 'none';
        children.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.innerText = isCollapsed ? '▼' : '▶';
        toggleIcon.classList.toggle('expanded', isCollapsed);
      });

      // Handle Object Exclusion
      const chkExclude = item.querySelector('.chk-exclude');
      chkExclude.addEventListener('change', () => {
        const override = getOrCreateObjectOverride(obj.ref);
        override.excluded = chkExclude.checked;
        if (chkExclude.checked) {
          item.classList.add('excluded-item');
        } else {
          item.classList.remove('excluded-item');
        }
      });

      // Handle Object Comment
      const commentInput = item.querySelector('.obj-comment-input');
      commentInput.addEventListener('change', () => {
        const override = getOrCreateObjectOverride(obj.ref);
        override.comment = commentInput.value.trim() || null;
      });

      // Handle Column PII & Comment
      item.querySelectorAll('.chk-pii').forEach(chk => {
        chk.addEventListener('change', () => {
          const ref = chk.getAttribute('data-ref');
          const colName = chk.getAttribute('data-col');
          const override = getOrCreateObjectOverride(ref);
          if (!override.columns[colName]) {
            override.columns[colName] = {};
          }
          override.columns[colName].pii = chk.checked;
          
          const row = chk.closest('tr');
          if (chk.checked) {
            row.classList.add('pii-row');
          } else {
            row.classList.remove('pii-row');
          }
        });
      });

      item.querySelectorAll('.col-comment-input').forEach(input => {
        input.addEventListener('change', () => {
          const ref = input.getAttribute('data-ref');
          const colName = input.getAttribute('data-col');
          const override = getOrCreateObjectOverride(ref);
          if (!override.columns[colName]) {
            override.columns[colName] = {};
          }
          override.columns[colName].comment = input.value.trim() || null;
        });
      });

      objectsList.appendChild(item);
    });
  }

  // --- RENDERING: RELATIONSHIPS / JOINS TAB ---
  function renderJoinsTab() {
    joinsList.innerHTML = '';

    // Gather all merged join edges
    const overrideMap = new Map();
    curatingOverrides.joins.forEach(edge => {
      const key = `${edge.from}->${edge.to}:${edge.via}`;
      overrideMap.set(key, edge);
    });

    const displayEdges = [];

    // Base joins
    curatingBaseJoins.forEach(baseEdge => {
      const key = `${baseEdge.from}->${baseEdge.to}:${baseEdge.via}`;
      if (overrideMap.has(key)) {
        displayEdges.push({
          ...overrideMap.get(key),
          isOverride: true
        });
        overrideMap.delete(key);
      } else {
        displayEdges.push({
          ...baseEdge,
          isOverride: false
        });
      }
    });

    // Custom remaining joins
    overrideMap.forEach(edge => {
      displayEdges.push({
        ...edge,
        isOverride: true,
        isCustom: true
      });
    });

    if (displayEdges.length === 0) {
      joinsList.innerHTML = '<p class="pg-empty-state">No relationships or join paths defined.</p>';
      return;
    }

    displayEdges.forEach(edge => {
      const joinRow = document.createElement('div');
      joinRow.className = `join-item ${edge.disabled ? 'disabled-join' : ''}`;

      const inferredBadge = edge.inferred ? '<span class="badge inferred">Inferred</span>' : '';
      const customBadge = edge.isCustom ? '<span class="badge custom">Custom</span>' : '';
      const colsStr = edge.cols.map(c => `<code>${c[0]} = ${c[1]}</code>`).join(' & ');

      joinRow.innerHTML = `
        <div class="join-info">
          <div class="join-direction">
            <strong>${edge.from}</strong> → <strong>${edge.to}</strong>
            ${inferredBadge} ${customBadge}
          </div>
          <div class="join-columns">
            via ${colsStr} (relationship: <code>${edge.via}</code>)
          </div>
        </div>
        <div class="join-actions">
          <label class="checkbox-container">
            <input type="checkbox" class="chk-disable-join" ${edge.disabled ? 'checked' : ''}>
            <span class="checkbox-label">Disable</span>
          </label>
          ${edge.isCustom ? '<button class="pg-btn pg-btn--ghost btn-del-join" style="color:var(--vscode-errorForeground)">Delete</button>' : ''}
        </div>
      `;

      // Handle disabling
      const chkDisable = joinRow.querySelector('.chk-disable-join');
      chkDisable.addEventListener('change', () => {
        // Find existing or push new override edge
        let overrideEdge = curatingOverrides.joins.find(e => e.from === edge.from && e.to === edge.to && e.via === edge.via);
        if (!overrideEdge) {
          overrideEdge = {
            from: edge.from,
            to: edge.to,
            via: edge.via,
            cols: edge.cols,
            inferred: edge.inferred,
            disabled: false
          };
          curatingOverrides.joins.push(overrideEdge);
        }
        overrideEdge.disabled = chkDisable.checked;
        if (chkDisable.checked) {
          joinRow.classList.add('disabled-join');
        } else {
          joinRow.classList.remove('disabled-join');
        }
      });

      // Handle deleting custom join
      if (edge.isCustom) {
        const btnDel = joinRow.querySelector('.btn-del-join');
        btnDel.addEventListener('click', () => {
          curatingOverrides.joins = curatingOverrides.joins.filter(e => !(e.from === edge.from && e.to === edge.to && e.via === edge.via));
          renderJoinsTab();
        });
      }

      joinsList.appendChild(joinRow);
    });
  }

  function setupJoinsForm() {
    selJoinSrcTable.innerHTML = '<option value="">Select table...</option>';
    selJoinTgtTable.innerHTML = '<option value="">Select table...</option>';

    const tables = curatingObjects.filter(o => o.kind === 'table' || o.kind === 'view' || o.kind === 'matview');

    tables.forEach(t => {
      const optSrc = document.createElement('option');
      optSrc.value = t.ref;
      optSrc.textContent = t.ref;
      selJoinSrcTable.appendChild(optSrc);

      const optTgt = document.createElement('option');
      optTgt.value = t.ref;
      optTgt.textContent = t.ref;
      selJoinTgtTable.appendChild(optTgt);
    });

    selJoinSrcTable.addEventListener('change', () => {
      populateColsSelect(selJoinSrcTable.value, selJoinSrcCol);
    });

    selJoinTgtTable.addEventListener('change', () => {
      populateColsSelect(selJoinTgtTable.value, selJoinTgtCol);
    });
  }

  function populateColsSelect(tableRef, selectEl) {
    selectEl.innerHTML = '<option value="">Select column...</option>';
    if (!tableRef) return;

    const tableObj = curatingObjects.find(o => o.ref === tableRef);
    if (tableObj && tableObj.columns) {
      tableObj.columns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.name;
        opt.textContent = col.name;
        selectEl.appendChild(opt);
      });
    }
  }

  btnAddJoin.addEventListener('click', () => {
    const srcTable = selJoinSrcTable.value;
    const srcCol = selJoinSrcCol.value;
    const tgtTable = selJoinTgtTable.value;
    const tgtCol = selJoinTgtCol.value;
    const via = txtJoinVia.value.trim() || 'custom';

    if (!srcTable || !srcCol || !tgtTable || !tgtCol) {
      alert('Please fill out all source and target tables/columns to create a join path.');
      return;
    }

    // Add to override list
    const newEdge = {
      from: srcTable,
      to: tgtTable,
      via,
      cols: [[srcCol, tgtCol]],
      inferred: false,
      disabled: false
    };

    // Prevent duplicate exact custom edges
    const exists = curatingOverrides.joins.some(e => e.from === srcTable && e.to === tgtTable && e.via === via);
    if (exists) {
      alert('A custom join relationship already exists with this name between these tables.');
      return;
    }

    curatingOverrides.joins.push(newEdge);
    txtJoinVia.value = '';
    renderJoinsTab();
  });

  // --- RENDERING: SYNONYMS TAB ---
  function renderSynonymsTab() {
    synonymsList.innerHTML = '';

    // Load override synonyms
    const overrideSyns = curatingOverrides.synonyms || {};
    const words = Object.keys(overrideSyns);

    if (words.length === 0) {
      synonymsList.innerHTML = '<p class="pg-empty-state">No custom synonyms defined. Add mappings below.</p>';
      return;
    }

    words.forEach(word => {
      const synList = overrideSyns[word] || [];
      if (synList.length === 0) return;

      const synRow = document.createElement('div');
      synRow.className = 'synonym-item';
      synRow.innerHTML = `
        <div class="synonym-info">
          <strong>${word}</strong> ➔ <span>${synList.join(', ')}</span>
        </div>
        <button class="pg-btn pg-btn--ghost btn-del-syn" data-word="${word}" style="color:var(--vscode-errorForeground)">Delete</button>
      `;

      synRow.querySelector('.btn-del-syn').addEventListener('click', () => {
        delete curatingOverrides.synonyms[word];
        renderSynonymsTab();
      });

      synonymsList.appendChild(synRow);
    });
  }

  btnAddSynonym.addEventListener('click', () => {
    const word = txtSynWord.value.trim().toLowerCase();
    const synInput = txtSynList.value.trim();

    if (!word || !synInput) {
      alert('Please specify a valid word and a comma-separated list of synonyms.');
      return;
    }

    const syns = synInput.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    if (syns.length === 0) {
      alert('Please specify at least one non-empty synonym.');
      return;
    }

    if (!curatingOverrides.synonyms) {
      curatingOverrides.synonyms = {};
    }

    const currentList = curatingOverrides.synonyms[word] || [];
    curatingOverrides.synonyms[word] = Array.from(new Set([...currentList, ...syns]));

    txtSynWord.value = '';
    txtSynList.value = '';
    renderSynonymsTab();
  });

  // Request initial state on load
  vscode.postMessage({ command: 'requestState' });
}());
