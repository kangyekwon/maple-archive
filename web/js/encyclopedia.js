/**
 * MapleStory Archive - Encyclopedia / Dogam Module (encyclopedia.js)
 * Sub-tabbed grid view with filtering, pagination, and detail modals.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var SUB_TABS = [
    { key: 'characters', label: 'Characters', endpoint: '/api/characters' },
    { key: 'jobs', label: 'Jobs', endpoint: '/api/jobs' },
    { key: 'worlds', label: 'Worlds', endpoint: '/api/worlds' },
    { key: 'bosses', label: 'Bosses', endpoint: '/api/bosses' },
    { key: 'monsters', label: 'Monsters', endpoint: '/api/monsters' },
    { key: 'items', label: 'Items', endpoint: '/api/items' },
    { key: 'power-systems', label: 'Power Systems', endpoint: '/api/power-systems' },
  ];

  var FILTERS = {
    characters: [
      { key: 'role', label: 'Role', param: 'role' },
      { key: 'faction', label: 'Faction', param: 'faction' },
    ],
    jobs: [
      { key: 'branch', label: 'Branch', param: 'branch' },
      { key: 'class_type', label: 'Class Type', param: 'class_type' },
    ],
    worlds: [
      { key: 'region', label: 'Region', param: 'region' },
    ],
    bosses: [
      { key: 'difficulty', label: 'Difficulty', param: 'difficulty' },
      { key: 'world', label: 'World', param: 'world' },
    ],
    monsters: [
      { key: 'category', label: 'Category', param: 'category' },
      { key: 'world', label: 'World', param: 'world' },
    ],
    items: [
      { key: 'category', label: 'Category', param: 'category' },
      { key: 'tier', label: 'Tier', param: 'tier' },
    ],
    'power-systems': [
      { key: 'category', label: 'Category', param: 'category' },
    ],
  };

  var PAGE_SIZE = 20;

  var TYPE_COLORS = {
    characters: '#ff6b35',
    jobs: '#2979ff',
    worlds: '#00bfa5',
    bosses: '#ff1744',
    monsters: '#ff9500',
    items: '#ffd700',
    'power-systems': '#7c4dff',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var currentSubTab = 'characters';
  var currentPage = {};       // { characters: 1, jobs: 1, ... }
  var cachedItems = {};       // { characters: [...], ... }
  var hasMore = {};           // { characters: true, ... }
  var filterOptions = {};     // { characters: { role: [...], faction: [...] }, ... }
  var activeFilters = {};     // { characters: { role: '', faction: '' }, ... }
  var subTabInitialized = {}; // track which sub-tabs have been loaded

  SUB_TABS.forEach(function (t) {
    currentPage[t.key] = 1;
    cachedItems[t.key] = [];
    hasMore[t.key] = true;
    activeFilters[t.key] = {};
    filterOptions[t.key] = {};
    subTabInitialized[t.key] = false;
  });

  // ---------------------------------------------------------------------------
  // Panel access
  // ---------------------------------------------------------------------------
  function getPanel() {
    return document.getElementById('panel-encyclopedia');
  }

  // ---------------------------------------------------------------------------
  // Build UI skeleton
  // ---------------------------------------------------------------------------
  function buildUI() {
    var panel = getPanel();
    if (!panel) return;

    var subTabHtml = SUB_TABS.map(function (t) {
      var cls = t.key === currentSubTab ? ' active' : '';
      return (
        '<button class="enc-sub-tab' +
        cls +
        '" data-subtab="' +
        t.key +
        '">' +
        MapleApp.escapeHtml(t.label) +
        '</button>'
      );
    }).join('');

    panel.innerHTML =
      '<div class="encyclopedia-module">' +
      '  <div class="enc-sub-tabs">' +
      subTabHtml +
      '  </div>' +
      '  <div class="enc-filters" id="encFilters"></div>' +
      '  <div class="enc-grid" id="encGrid"></div>' +
      '  <div class="enc-pagination" id="encPagination"></div>' +
      '</div>';

    // Bind sub-tab clicks
    panel.querySelectorAll('.enc-sub-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchSubTab(this.dataset.subtab);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Sub-tab switching
  // ---------------------------------------------------------------------------
  function switchSubTab(key) {
    currentSubTab = key;

    // Update active class
    var panel = getPanel();
    if (panel) {
      panel.querySelectorAll('.enc-sub-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.subtab === key);
      });
    }

    if (!subTabInitialized[key]) {
      resetSubTab(key);
      loadFilterOptions(key);
      loadItems(key, true);
      subTabInitialized[key] = true;
    } else {
      renderFilters(key);
      renderGrid(key);
      renderPagination(key);
    }
  }

  function resetSubTab(key) {
    currentPage[key] = 1;
    cachedItems[key] = [];
    hasMore[key] = true;
    activeFilters[key] = {};
  }

  // ---------------------------------------------------------------------------
  // Filter options (fetched from API with distinct values)
  // ---------------------------------------------------------------------------
  async function loadFilterOptions(key) {
    var defs = FILTERS[key] || [];
    if (defs.length === 0) {
      renderFilters(key);
      return;
    }

    var tabConfig = SUB_TABS.find(function (t) { return t.key === key; });
    if (!tabConfig) return;

    try {
      // Fetch a large batch to extract distinct filter values
      var data = await MapleApp.api(tabConfig.endpoint + '?limit=1000');
      var items = Array.isArray(data) ? data : (Object.values(data).find(function(v) { return Array.isArray(v); }) || []);

      filterOptions[key] = {};
      defs.forEach(function (def) {
        var values = {};
        items.forEach(function (item) {
          var v = item[def.key];
          if (v != null && v !== '') {
            if (Array.isArray(v)) {
              v.forEach(function (x) { values[x] = true; });
            } else {
              values[v] = true;
            }
          }
        });
        filterOptions[key][def.key] = Object.keys(values).sort();
      });
    } catch {
      filterOptions[key] = {};
    }

    renderFilters(key);
  }

  // ---------------------------------------------------------------------------
  // Render filter dropdowns
  // ---------------------------------------------------------------------------
  function renderFilters(key) {
    var container = document.getElementById('encFilters');
    if (!container) return;

    var defs = FILTERS[key] || [];
    if (defs.length === 0) {
      container.innerHTML = '';
      return;
    }

    var html = defs.map(function (def) {
      var options = (filterOptions[key] && filterOptions[key][def.key]) || [];
      var current = (activeFilters[key] && activeFilters[key][def.key]) || '';

      var optHtml =
        '<option value="">All ' + MapleApp.escapeHtml(def.label) + '</option>';
      options.forEach(function (val) {
        var sel = val === current ? ' selected' : '';
        optHtml +=
          '<option value="' +
          MapleApp.escapeHtml(val) +
          '"' +
          sel +
          '>' +
          MapleApp.escapeHtml(val) +
          '</option>';
      });

      return (
        '<div class="enc-filter-group">' +
        '  <label class="enc-filter-label">' +
        MapleApp.escapeHtml(def.label) +
        '</label>' +
        '  <select class="enc-filter-select" data-filter-key="' +
        def.key +
        '">' +
        optHtml +
        '  </select>' +
        '</div>'
      );
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.enc-filter-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (!activeFilters[key]) activeFilters[key] = {};
        activeFilters[key][this.dataset.filterKey] = this.value;
        // Reset and reload
        currentPage[key] = 1;
        cachedItems[key] = [];
        hasMore[key] = true;
        loadItems(key, true);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Load items from API
  // ---------------------------------------------------------------------------
  async function loadItems(key, replace) {
    var tabConfig = SUB_TABS.find(function (t) { return t.key === key; });
    if (!tabConfig) return;

    var grid = document.getElementById('encGrid');
    if (grid && replace) {
      grid.innerHTML = '<p class="enc-loading">Loading...</p>';
    }

    try {
      var url =
        tabConfig.endpoint +
        '?limit=' +
        PAGE_SIZE +
        '&offset=' +
        (currentPage[key] - 1) * PAGE_SIZE;

      // Append active filters
      var filters = activeFilters[key] || {};
      Object.keys(filters).forEach(function (fk) {
        if (filters[fk]) {
          url += '&' + encodeURIComponent(fk) + '=' + encodeURIComponent(filters[fk]);
        }
      });

      var data = await MapleApp.api(url);
      var items = Array.isArray(data) ? data : (Object.values(data).find(function(v) { return Array.isArray(v); }) || []);

      if (replace) {
        cachedItems[key] = items;
      } else {
        cachedItems[key] = cachedItems[key].concat(items);
      }

      hasMore[key] = items.length >= PAGE_SIZE;

      renderGrid(key);
      renderPagination(key);
    } catch {
      if (grid) {
        grid.innerHTML = '<p class="enc-error">Failed to load data.</p>';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render grid
  // ---------------------------------------------------------------------------
  function renderGrid(key) {
    var grid = document.getElementById('encGrid');
    if (!grid) return;

    var items = cachedItems[key] || [];

    if (items.length === 0) {
      grid.innerHTML = '<p class="enc-empty">No items found.</p>';
      return;
    }

    var color = TYPE_COLORS[key] || '#888';

    grid.innerHTML = items
      .map(function (item) {
        var name = MapleApp.escapeHtml(item.name || '');
        var nameKo = item.name_ko ? MapleApp.escapeHtml(item.name_ko) : '';
        var desc = MapleApp.escapeHtml(
          item.description || item.brief || item.role || ''
        );
        var id = MapleApp.escapeHtml(String(item.id || ''));

        var subtitle = '';
        if (key === 'characters' && item.role) {
          subtitle = MapleApp.escapeHtml(item.role);
        } else if (key === 'jobs' && item.branch) {
          subtitle = MapleApp.escapeHtml(item.branch);
        } else if (key === 'bosses' && item.difficulty) {
          subtitle = MapleApp.escapeHtml(item.difficulty);
        } else if (key === 'worlds' && item.region) {
          subtitle = MapleApp.escapeHtml(item.region);
        } else if (key === 'monsters' && item.category) {
          subtitle = 'Lv.' + (item.level || '?') + ' - ' + MapleApp.escapeHtml(item.category);
        } else if (key === 'items' && item.tier) {
          subtitle = MapleApp.escapeHtml(item.tier) + (item.category ? ' / ' + MapleApp.escapeHtml(item.category) : '');
        } else if (key === 'power-systems' && item.category) {
          subtitle = MapleApp.escapeHtml(item.category);
        }

        return (
          '<div class="enc-card" data-key="' +
          key +
          '" data-id="' +
          id +
          '">' +
          '  <div class="enc-card-accent" style="background:' +
          color +
          '"></div>' +
          '  <div class="enc-card-body">' +
          '    <div class="enc-card-name">' +
          name +
          '</div>' +
          (nameKo
            ? '    <div class="enc-card-name-ko">' + nameKo + '</div>'
            : '') +
          (subtitle
            ? '    <div class="enc-card-subtitle">' + subtitle + '</div>'
            : '') +
          (desc
            ? '    <div class="enc-card-desc">' + desc + '</div>'
            : '') +
          '  </div>' +
          '</div>'
        );
      })
      .join('');

    // Bind card clicks
    grid.querySelectorAll('.enc-card').forEach(function (card) {
      card.addEventListener('click', function () {
        showCardDetail(this.dataset.key, this.dataset.id);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Pagination (load more)
  // ---------------------------------------------------------------------------
  function renderPagination(key) {
    var container = document.getElementById('encPagination');
    if (!container) return;

    if (!hasMore[key]) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML =
      '<button class="enc-load-more" id="encLoadMore">Load More</button>';

    document.getElementById('encLoadMore').addEventListener('click', function () {
      currentPage[key]++;
      loadItems(key, false);
    });
  }

  // ---------------------------------------------------------------------------
  // Detail modal
  // ---------------------------------------------------------------------------
  async function showCardDetail(key, id) {
    if (!key || !id) return;

    var tabConfig = SUB_TABS.find(function (t) { return t.key === key; });
    if (!tabConfig) return;

    MapleApp.showModal('<div class="detail-loading">Loading...</div>');

    try {
      var data = await MapleApp.api(
        tabConfig.endpoint + '/' + encodeURIComponent(id)
      );
      renderDetailModal(data, key);
    } catch {
      MapleApp.showModal(
        '<div class="detail-error"><p>Failed to load details.</p></div>'
      );
    }
  }

  function renderDetailModal(data, key) {
    var color = TYPE_COLORS[key] || '#888';
    var name = MapleApp.escapeHtml(data.name || '');
    var nameKo = data.name_ko ? MapleApp.escapeHtml(data.name_ko) : '';
    var label = key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');

    var html =
      '<div class="detail-modal">' +
      '  <div class="detail-header">' +
      '    <h2 class="detail-name">' +
      name +
      '</h2>' +
      (nameKo ? '    <span class="detail-name-ko">' + nameKo + '</span>' : '') +
      '    <span class="type-badge" style="background:' +
      color +
      '">' +
      MapleApp.escapeHtml(label) +
      '</span>' +
      '  </div>' +
      '  <div class="detail-body">';

    // Render all fields except core identity fields
    var skipKeys = { name: 1, name_ko: 1, type: 1, id: 1 };
    Object.keys(data).forEach(function (field) {
      if (skipKeys[field]) return;
      var val = data[field];
      if (val == null || val === '') return;

      var fieldLabel = field
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        });

      if (Array.isArray(val)) {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(fieldLabel) +
          ':</strong> ' +
          val
            .map(function (v) {
              return MapleApp.escapeHtml(String(v));
            })
            .join(', ') +
          '</div>';
      } else if (typeof val === 'object') {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(fieldLabel) +
          ':</strong>' +
          '  <pre class="detail-json">' +
          MapleApp.escapeHtml(JSON.stringify(val, null, 2)) +
          '</pre>' +
          '</div>';
      } else {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(fieldLabel) +
          ':</strong> ' +
          MapleApp.escapeHtml(String(val)) +
          '</div>';
      }
    });

    html += '  </div></div>';

    MapleApp.showModal(html);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    buildUI();
    switchSubTab(currentSubTab);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.Encyclopedia = {
    init: init,
  };
})();
