/**
 * MapleStory Archive - Full-Text Search Module (search.js)
 * Default tab: provides filtered search with grouped result cards.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const FILTER_TYPES = [
    { key: 'all', label: 'All' },
    { key: 'character', label: 'Characters' },
    { key: 'story', label: 'Story' },
    { key: 'world', label: 'Worlds' },
    { key: 'job', label: 'Jobs' },
    { key: 'boss', label: 'Bosses' },
    { key: 'monster', label: 'Monsters' },
    { key: 'item', label: 'Items' },
  ];

  const TYPE_COLORS = {
    character: '#ff6b35',
    story: '#7c4dff',
    world: '#00bfa5',
    job: '#2979ff',
    boss: '#ff1744',
    monster: '#ff9500',
    item: '#ffd700',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let currentFilter = 'all';
  let debounceTimer = null;

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function getPanel() {
    return document.getElementById('panel-search');
  }

  function buildUI() {
    const panel = getPanel();
    if (!panel) return;

    panel.innerHTML =
      '<div class="search-module">' +
      '  <div class="search-bar">' +
      '    <input type="text" id="searchInput" class="search-input" placeholder="Search characters, worlds, jobs, bosses..." />' +
      '  </div>' +
      '  <div class="search-filters" id="searchFilters"></div>' +
      '  <div class="search-results" id="searchResults">' +
      '    <p class="search-placeholder">Enter a keyword to search the MapleStory archive.</p>' +
      '  </div>' +
      '</div>';

    renderFilters();
    bindEvents();
  }

  function renderFilters() {
    const container = document.getElementById('searchFilters');
    if (!container) return;

    container.innerHTML = FILTER_TYPES.map(function (f) {
      const active = f.key === currentFilter ? ' active' : '';
      return (
        '<button class="filter-btn' +
        active +
        '" data-filter="' +
        f.key +
        '">' +
        MapleApp.escapeHtml(f.label) +
        '</button>'
      );
    }).join('');

    container.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentFilter = this.dataset.filter;
        renderFilters();
        triggerSearch();
      });
    });
  }

  function bindEvents() {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerSearch, 300);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        triggerSearch();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Search execution
  // ---------------------------------------------------------------------------

  async function triggerSearch() {
    const input = document.getElementById('searchInput');
    const container = document.getElementById('searchResults');
    if (!input || !container) return;

    const query = input.value.trim();
    if (query.length === 0) {
      container.innerHTML =
        '<p class="search-placeholder">Enter a keyword to search the MapleStory archive.</p>';
      return;
    }

    container.innerHTML = '<p class="search-loading">Searching...</p>';

    try {
      const FILTER_TO_API = {
        character: 'characters', story: 'story_arcs', world: 'worlds',
        job: 'jobs', boss: 'bosses', monster: 'monsters', item: 'items',
      };
      let url = '/api/search?q=' + encodeURIComponent(query);
      if (currentFilter !== 'all' && FILTER_TO_API[currentFilter]) {
        url += '&type=' + encodeURIComponent(FILTER_TO_API[currentFilter]);
      }

      const data = await MapleApp.api(url);
      renderResults(data, container);
    } catch {
      container.innerHTML = '<p class="search-error">Search failed. Please try again.</p>';
    }
  }

  // ---------------------------------------------------------------------------
  // Result rendering
  // ---------------------------------------------------------------------------

  function renderResults(data, container) {
    // API returns grouped format: { characters: [...], characters_total: N, ... }
    const TYPE_MAP = {
      characters: 'character',
      story_arcs: 'story',
      worlds: 'world',
      jobs: 'job',
      bosses: 'boss',
      monsters: 'monster',
      items: 'item',
    };
    const TYPE_LABELS = {
      character: 'Characters',
      story: 'Story Arcs',
      world: 'Worlds',
      job: 'Jobs',
      boss: 'Bosses',
      monster: 'Monsters',
      item: 'Items',
    };

    // Build grouped from API response
    const grouped = {};
    let totalCount = 0;
    Object.keys(TYPE_MAP).forEach(function (apiKey) {
      const arr = data[apiKey];
      if (arr && arr.length > 0) {
        const type = TYPE_MAP[apiKey];
        grouped[type] = arr.map(function (item) {
          item.type = type;
          return item;
        });
        totalCount += arr.length;
      }
    });

    if (totalCount === 0) {
      container.innerHTML =
        '<div class="no-results">' +
        '  <p class="no-results-icon">&#x1F50D;</p>' +
        '  <p class="no-results-text">No results found.</p>' +
        '  <p class="no-results-hint">Try different keywords or change the filter.</p>' +
        '</div>';
      return;
    }

    let html = '';
    Object.keys(grouped).forEach(function (type) {
      const items = grouped[type];
      const typeLabel = TYPE_LABELS[type] || type;

      html +=
        '<div class="result-group">' +
        '  <h3 class="result-group-title">' +
        MapleApp.escapeHtml(typeLabel) +
        ' <span class="result-count">(' +
        items.length +
        ')</span></h3>' +
        '  <div class="result-cards">';

      items.forEach(function (item) {
        html += buildResultCard(item);
      });

      html += '  </div></div>';
    });

    container.innerHTML = html;

    // Bind card click events
    container.querySelectorAll('.result-card').forEach(function (card) {
      card.addEventListener('click', function () {
        showDetail(this.dataset.type, this.dataset.id);
      });
    });
  }

  function buildResultCard(item) {
    const color = TYPE_COLORS[item.type] || '#888';
    const name = MapleApp.escapeHtml(item.name || '');
    const nameKo = item.name_ko ? MapleApp.escapeHtml(item.name_ko) : '';
    const desc = MapleApp.escapeHtml(item.description || item.brief || '');
    const type = MapleApp.escapeHtml(item.type || '');
    const id = MapleApp.escapeHtml(String(item.id || ''));

    return (
      '<div class="result-card" data-type="' +
      type +
      '" data-id="' +
      id +
      '">' +
      '  <div class="result-card-header">' +
      '    <span class="result-card-name">' +
      name +
      '</span>' +
      '    <span class="type-badge" style="background:' +
      color +
      '">' +
      type +
      '</span>' +
      '  </div>' +
      (nameKo
        ? '  <div class="result-card-name-ko">' + nameKo + '</div>'
        : '') +
      (desc
        ? '  <div class="result-card-desc">' + desc + '</div>'
        : '') +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // Detail modal
  // ---------------------------------------------------------------------------

  async function showDetail(type, id) {
    if (!type || !id) return;

    MapleApp.showModal('<div class="detail-loading">Loading...</div>');

    try {
      const endpoints = {
        character: '/api/characters/',
        job: '/api/jobs/',
        world: '/api/worlds/',
        boss: '/api/bosses/',
        story: '/api/story/',
        monster: '/api/monsters/',
        item: '/api/items/',
      };

      const base = endpoints[type] || '/api/' + type + 's/';
      const data = await MapleApp.api(base + encodeURIComponent(id));
      renderDetailModal(data, type);
    } catch {
      MapleApp.showModal(
        '<div class="detail-error"><p>Failed to load details.</p></div>'
      );
    }
  }

  function renderDetailModal(data, type) {
    const color = TYPE_COLORS[type] || '#888';
    const name = MapleApp.escapeHtml(data.name || '');
    const nameKo = data.name_ko ? MapleApp.escapeHtml(data.name_ko) : '';

    let html =
      '<div class="detail-modal">' +
      '  <div class="detail-header">' +
      '    <h2 class="detail-name">' +
      name +
      '</h2>' +
      (nameKo ? '    <span class="detail-name-ko">' + nameKo + '</span>' : '') +
      '    <span class="type-badge" style="background:' +
      color +
      '">' +
      MapleApp.escapeHtml(type) +
      '</span>' +
      '  </div>' +
      '  <div class="detail-body">';

    // Render all fields except name/name_ko/type/id
    var skipKeys = { name: 1, name_ko: 1, type: 1, id: 1 };
    Object.keys(data).forEach(function (key) {
      if (skipKeys[key]) return;
      var val = data[key];
      if (val == null || val === '') return;

      var label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        });

      if (Array.isArray(val)) {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(label) +
          ':</strong> ' +
          val.map(function (v) { return MapleApp.escapeHtml(String(v)); }).join(', ') +
          '</div>';
      } else if (typeof val === 'object') {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(label) +
          ':</strong>' +
          '  <pre class="detail-json">' +
          MapleApp.escapeHtml(JSON.stringify(val, null, 2)) +
          '</pre>' +
          '</div>';
      } else {
        html +=
          '<div class="detail-field">' +
          '  <strong>' +
          MapleApp.escapeHtml(label) +
          ':</strong> ' +
          MapleApp.escapeHtml(String(val)) +
          '</div>';
      }
    });

    html += '  </div></div>';

    MapleApp.showModal(html);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function init() {
    buildUI();
  }

  window.Search = {
    init: init,
    showDetail: showDetail,
  };
})();
