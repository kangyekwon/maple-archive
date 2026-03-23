/**
 * MapleStory Archive - SPA Controller (app.js)
 * Manages tab switching, global search, modal system, and shared helpers.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------
  const loadedTabs = new Set();
  let debounceTimer = null;

  // Module registry: maps tab name -> { init }
  const modules = {
    search: () => window.Search,
    encyclopedia: () => window.Encyclopedia,
    'character-graph': () => window.CharacterGraph,
    'world-map': () => window.WorldMap,
    'job-tree': () => window.JobTree,
    'story-timeline': () => window.StoryTimeline,
    'boss-guide': () => window.BossGuide,
    gallery: () => window.Gallery,
    community: () => window.Community,
    quiz: () => window.Quiz,
    'skill-simulator': () => window.SkillSimulator,
    'stats-dashboard': () => window.StatsDashboard,
    resources: () => window.Resources,
    'party-quest': () => window.PartyQuest,
    bgm: () => window.BGM,
    'patch-history': () => window.PatchHistory,
    'maple-culture': () => window.MapleCulture,
    'data-explorer': () => window.DataExplorer,
  };

  // ---------------------------------------------------------------------------
  // Helpers exposed via window.MapleApp
  // ---------------------------------------------------------------------------

  /**
   * Fetch wrapper that prepends the base path and returns parsed JSON.
   * @param {string} path - API path starting with /
   * @returns {Promise<any>}
   */
  async function api(path) {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Format an ISO date string into a locale-friendly display string.
   * @param {string} str - ISO 8601 date string
   * @returns {string}
   */
  function formatDate(str) {
    if (!str) return '';
    try {
      const d = new Date(str);
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return str;
    }
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, function (c) {
      return map[c];
    });
  }

  // ---------------------------------------------------------------------------
  // Modal system
  // ---------------------------------------------------------------------------
  function showModal(html) {
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modalOverlay';
      overlay.className = 'modal-overlay';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideModal();
      });
      document.body.appendChild(overlay);
    }

    let container = document.getElementById('modalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modalContainer';
      container.className = 'modal-container';
      overlay.appendChild(container);
    }

    container.innerHTML =
      '<button class="modal-close" id="modalCloseBtn">&times;</button>' + html;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('modalCloseBtn').addEventListener('click', hideModal);
  }

  function hideModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideModal();
  });

  // ---------------------------------------------------------------------------
  // Tab switching
  // ---------------------------------------------------------------------------
  function switchTab(tabName) {
    // Update tab button active states
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Show/hide panels
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'panel-' + tabName);
    });

    // Initialize the module if not yet loaded
    if (!loadedTabs.has(tabName)) {
      const getModule = modules[tabName];
      if (getModule) {
        const mod = getModule();
        if (mod && typeof mod.init === 'function') {
          mod.init();
        }
      }
      loadedTabs.add(tabName);
    }
  }

  function initTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(this.dataset.tab);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Global search with debounce
  // ---------------------------------------------------------------------------
  function initGlobalSearch() {
    const input = document.getElementById('globalSearch');
    const suggestions = document.getElementById('searchSuggestions');
    if (!input || !suggestions) return;

    input.addEventListener('input', function () {
      const query = input.value.trim();
      clearTimeout(debounceTimer);

      if (query.length === 0) {
        suggestions.innerHTML = '';
        suggestions.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(async function () {
        try {
          const data = await api('/api/suggest?q=' + encodeURIComponent(query));
          const items = data.suggestions || data;
          renderSuggestions(items, suggestions);
        } catch {
          suggestions.innerHTML = '';
          suggestions.style.display = 'none';
        }
      }, 300);
    });

    // Close suggestions on outside click
    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.style.display = 'none';
      }
    });
  }

  function renderSuggestions(items, container) {
    if (!items || items.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.innerHTML = items
      .map(function (item) {
        return (
          '<div class="suggestion-item" data-type="' +
          escapeHtml(item.type || '') +
          '" data-id="' +
          escapeHtml(String(item.id || '')) +
          '">' +
          '<span class="suggestion-name">' +
          escapeHtml(item.name || '') +
          '</span>' +
          '<span class="suggestion-type">' +
          escapeHtml(item.type || '') +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    container.style.display = 'block';

    container.querySelectorAll('.suggestion-item').forEach(function (el) {
      el.addEventListener('click', function () {
        const type = this.dataset.type;
        const id = this.dataset.id;
        container.style.display = 'none';
        // Navigate to search tab and show detail
        switchTab('search');
        if (window.Search && typeof window.Search.showDetail === 'function') {
          window.Search.showDetail(type, id);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Header stats
  // ---------------------------------------------------------------------------
  async function loadHeaderStats() {
    try {
      const [stats, visitor] = await Promise.all([
        api('/api/stats'),
        api('/api/visitor-count'),
      ]);

      const statsEl = document.getElementById('statsCount');
      if (statsEl && stats) {
        const parts = [];
        if (stats.characters != null) parts.push('Characters: ' + stats.characters);
        if (stats.worlds != null) parts.push('Worlds: ' + stats.worlds);
        if (stats.job_classes != null) parts.push('Jobs: ' + stats.job_classes);
        if (stats.bosses != null) parts.push('Bosses: ' + stats.bosses);
        statsEl.textContent = parts.join(' | ');
      }

      const visitorEl = document.getElementById('visitorCount');
      if (visitorEl && visitor) {
        visitorEl.textContent = (visitor.count || 0).toLocaleString();
      }
    } catch {
      // Silently ignore stats loading errors
    }
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  function init() {
    initTabs();
    initGlobalSearch();
    loadHeaderStats();

    // Default tab: search
    const defaultTab = 'search';
    switchTab(defaultTab);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.MapleApp = {
    api: api,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    showModal: showModal,
    hideModal: hideModal,
    switchTab: switchTab,
  };

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
