/**
 * MapleStory Archive - Maple Culture
 * Displays MapleStory memes, slang, and community culture in a masonry-style layout.
 */
window.MapleCulture = {
  loaded: false,

  _allMemes: [],
  _activeCategory: 'all',
  _activeEra: 'all',
  _sortBy: 'popularity',

  CATEGORY_COLORS: {
    quote: '#FFD700',
    meme: '#ff9500',
    slang: '#60a5fa',
    culture: '#4ade80',
    memory: '#a78bfa',
    tradition: '#f87171'
  },

  CATEGORY_LABELS: {
    all: 'All',
    quote: 'Quote',
    meme: 'Meme',
    slang: 'Slang',
    culture: 'Culture',
    memory: 'Memory',
    tradition: 'Tradition'
  },

  ERA_LABELS: {
    all: 'All Eras',
    classic: 'Classic',
    modern: 'Modern',
    timeless: 'Timeless'
  },

  CONTEXT_LABELS: {
    training: 'Training',
    social: 'Social',
    economy: 'Economy',
    pvp: 'PvP',
    boss: 'Boss',
    general: 'General'
  },

  async init() {
    if (this.loaded) return;
    var panel = document.getElementById('panel-maple-culture');
    if (!panel) return;

    panel.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Loading maple culture...</div>';

    try {
      var data = await MapleApp.api('/api/memes');
      this._allMemes = Array.isArray(data) ? data : (data.memes || []);
      this._buildUI(panel);
    } catch (e) {
      panel.innerHTML = '<div style="text-align:center;color:#f87171;padding:40px;">Failed to load culture data.</div>';
    }

    this.loaded = true;
  },

  _buildUI: function (panel) {
    var self = this;
    panel.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:20px 24px 0;';
    header.innerHTML =
      '<h2 style="margin:0 0 4px;color:#ffcc00;font-size:22px;">Maple Culture</h2>' +
      '<p style="margin:0 0 16px;color:#888;font-size:14px;">Memes, slang, and community traditions</p>';
    panel.appendChild(header);

    // Filter bar
    var filterBar = document.createElement('div');
    filterBar.style.cssText =
      'display:flex;gap:12px;padding:0 24px 16px;flex-wrap:wrap;align-items:center;' +
      'border-bottom:1px solid rgba(255,255,255,0.1);';

    // Category filter
    var catWrapper = document.createElement('div');
    catWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    catWrapper.innerHTML = '<label style="font-size:13px;color:#888;">Category:</label>';
    var catSelect = document.createElement('select');
    catSelect.id = 'culture-category-filter';
    catSelect.style.cssText =
      'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;';
    Object.keys(self.CATEGORY_LABELS).forEach(function (key) {
      catSelect.innerHTML += '<option value="' + key + '">' +
        MapleApp.escapeHtml(self.CATEGORY_LABELS[key]) + '</option>';
    });
    catSelect.addEventListener('change', function () {
      self._activeCategory = this.value;
      self._renderCards();
    });
    catWrapper.appendChild(catSelect);
    filterBar.appendChild(catWrapper);

    // Era filter
    var eraWrapper = document.createElement('div');
    eraWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    eraWrapper.innerHTML = '<label style="font-size:13px;color:#888;">Era:</label>';
    var eraSelect = document.createElement('select');
    eraSelect.id = 'culture-era-filter';
    eraSelect.style.cssText =
      'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;';
    Object.keys(self.ERA_LABELS).forEach(function (key) {
      eraSelect.innerHTML += '<option value="' + key + '">' +
        MapleApp.escapeHtml(self.ERA_LABELS[key]) + '</option>';
    });
    eraSelect.addEventListener('change', function () {
      self._activeEra = this.value;
      self._renderCards();
    });
    eraWrapper.appendChild(eraSelect);
    filterBar.appendChild(eraWrapper);

    // Sort toggle
    var sortWrapper = document.createElement('div');
    sortWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    sortWrapper.innerHTML = '<label style="font-size:13px;color:#888;">Sort:</label>';
    var sortSelect = document.createElement('select');
    sortSelect.id = 'culture-sort';
    sortSelect.style.cssText =
      'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;';
    sortSelect.innerHTML =
      '<option value="popularity">Popularity</option>' +
      '<option value="alphabetical">Alphabetical</option>';
    sortSelect.addEventListener('change', function () {
      self._sortBy = this.value;
      self._renderCards();
    });
    sortWrapper.appendChild(sortSelect);
    filterBar.appendChild(sortWrapper);

    // Count
    var countBadge = document.createElement('span');
    countBadge.id = 'culture-count';
    countBadge.style.cssText = 'font-size:13px;color:#666;margin-left:auto;';
    filterBar.appendChild(countBadge);

    panel.appendChild(filterBar);

    // Cards grid
    var grid = document.createElement('div');
    grid.id = 'culture-grid';
    grid.style.cssText =
      'padding:20px 24px;overflow-y:auto;max-height:calc(100vh - 280px);' +
      'columns:3;column-gap:16px;';
    panel.appendChild(grid);

    this._renderCards();
  },

  _getFiltered: function () {
    var self = this;
    var filtered = this._allMemes.filter(function (m) {
      var catMatch = self._activeCategory === 'all' || m.category === self._activeCategory;
      var eraMatch = self._activeEra === 'all' || m.era === self._activeEra;
      return catMatch && eraMatch;
    });

    if (self._sortBy === 'alphabetical') {
      filtered.sort(function (a, b) {
        var nameA = (a.name || '').toLowerCase();
        var nameB = (b.name || '').toLowerCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      });
    } else {
      filtered.sort(function (a, b) {
        return (b.popularity || 0) - (a.popularity || 0);
      });
    }

    return filtered;
  },

  _getPastelBorder: function (category) {
    var base = this.CATEGORY_COLORS[category] || '#888';
    return base + '66';
  },

  _renderFlames: function (count) {
    var max = 10;
    var val = Math.max(0, Math.min(max, count || 0));
    var html = '';
    for (var i = 0; i < max; i++) {
      if (i < val) {
        html += '<span style="color:#ff9500;font-size:13px;">&#x1F525;</span>';
      } else {
        html += '<span style="color:#333;font-size:13px;">&#x1F525;</span>';
      }
    }
    return html;
  },

  _renderCards: function () {
    var self = this;
    var grid = document.getElementById('culture-grid');
    if (!grid) return;

    var items = this._getFiltered();

    // Update count
    var countEl = document.getElementById('culture-count');
    if (countEl) {
      countEl.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
    }

    if (items.length === 0) {
      grid.style.columns = '1';
      grid.innerHTML =
        '<div style="text-align:center;color:#888;padding:60px;">No items found for the selected filters.</div>';
      return;
    }

    // Responsive columns
    grid.style.columns = '3';
    grid.style.columnGap = '16px';

    grid.innerHTML = items.map(function (item, idx) {
      var catColor = self.CATEGORY_COLORS[item.category] || '#888';
      var borderColor = self._getPastelBorder(item.category);
      var stillRelevant = item.still_relevant;

      var html = '<div class="culture-card" data-idx="' + idx + '" style="' +
        'break-inside:avoid;background:#1a1a2e;border-radius:14px;padding:18px;margin-bottom:16px;' +
        'border:2px solid ' + borderColor + ';cursor:pointer;transition:all 0.2s;' +
        'display:inline-block;width:100%;box-sizing:border-box;">';

      // Name
      html += '<div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:4px;line-height:1.4;">' +
        MapleApp.escapeHtml(item.name || '') + '</div>';

      // Korean name
      if (item.name_ko) {
        html += '<div style="font-size:13px;color:#aaa;margin-bottom:10px;">' +
          MapleApp.escapeHtml(item.name_ko) + '</div>';
      }

      // Badges row: category + era
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">';
      if (item.category) {
        html += '<span style="font-size:10px;padding:3px 10px;border-radius:10px;font-weight:600;' +
          'background:' + catColor + '22;color:' + catColor + ';border:1px solid ' + catColor + '44;">' +
          MapleApp.escapeHtml(self.CATEGORY_LABELS[item.category] || item.category) + '</span>';
      }
      if (item.era) {
        html += '<span style="font-size:10px;padding:3px 10px;border-radius:10px;font-weight:600;' +
          'background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);">' +
          MapleApp.escapeHtml(self.ERA_LABELS[item.era] || item.era) + '</span>';
      }
      html += '</div>';

      // Popularity flames
      if (item.popularity != null) {
        html += '<div style="margin-bottom:8px;">' + self._renderFlames(item.popularity) + '</div>';
      }

      // Still relevant + context
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">';
      if (stillRelevant === true) {
        html += '<span style="font-size:12px;color:#4ade80;font-weight:600;">&#x2713; Still relevant</span>';
      } else if (stillRelevant === false) {
        html += '<span style="font-size:12px;color:#666;">&#x2717; Not relevant</span>';
      }
      if (item.context) {
        html += '<span style="font-size:10px;padding:2px 8px;border-radius:8px;' +
          'background:rgba(255,255,255,0.06);color:#888;">' +
          MapleApp.escapeHtml(self.CONTEXT_LABELS[item.context] || item.context) + '</span>';
      }
      html += '</div>';

      // Description preview (2 lines)
      if (item.description) {
        var desc = typeof item.description === 'string' ? item.description : (item.description.en || '');
        html += '<div style="font-size:12px;color:#999;line-height:1.6;' +
          'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' +
          MapleApp.escapeHtml(desc) + '</div>';
      }

      html += '</div>';
      return html;
    }).join('');

    // Attach event handlers
    grid.querySelectorAll('.culture-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.style.transform = 'translateY(-3px)';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
      card.addEventListener('click', function () {
        var i = parseInt(card.getAttribute('data-idx'));
        var filtered = self._getFiltered();
        if (!isNaN(i) && filtered[i]) {
          self._showCultureModal(filtered[i]);
        }
      });
    });
  },

  _showCultureModal: function (item) {
    var self = this;
    var catColor = this.CATEGORY_COLORS[item.category] || '#888';

    var html = '<div style="padding:28px;">';

    // Name
    html += '<h2 style="margin:0 0 4px;color:#fff;font-size:24px;">' +
      MapleApp.escapeHtml(item.name || '') + '</h2>';

    // Korean name
    if (item.name_ko) {
      html += '<div style="font-size:15px;color:#aaa;margin-bottom:14px;">' +
        MapleApp.escapeHtml(item.name_ko) + '</div>';
    }

    // Badges
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
    if (item.category) {
      html += '<span style="font-size:11px;padding:4px 14px;border-radius:12px;font-weight:600;' +
        'background:' + catColor + '22;color:' + catColor + ';border:1px solid ' + catColor + '44;">' +
        MapleApp.escapeHtml(self.CATEGORY_LABELS[item.category] || item.category) + '</span>';
    }
    if (item.era) {
      html += '<span style="font-size:11px;padding:4px 14px;border-radius:12px;font-weight:600;' +
        'background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);">' +
        MapleApp.escapeHtml(self.ERA_LABELS[item.era] || item.era) + '</span>';
    }
    if (item.context) {
      html += '<span style="font-size:11px;padding:4px 14px;border-radius:12px;font-weight:600;' +
        'background:rgba(255,255,255,0.06);color:#888;">' +
        MapleApp.escapeHtml(self.CONTEXT_LABELS[item.context] || item.context) + '</span>';
    }
    html += '</div>';

    // Popularity
    if (item.popularity != null) {
      html += '<div style="margin-bottom:16px;">' +
        '<span style="font-size:13px;color:#888;margin-right:8px;">Popularity:</span>' +
        self._renderFlames(item.popularity) + '</div>';
    }

    // Still relevant
    if (item.still_relevant === true) {
      html += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(74,222,128,0.1);' +
        'border-radius:8px;border-left:3px solid #4ade80;">' +
        '<span style="color:#4ade80;font-weight:600;font-size:14px;">&#x2713; Still Relevant</span>';
      if (item.still_relevant_reason) {
        html += '<p style="margin:6px 0 0;color:#ccc;font-size:13px;line-height:1.6;">' +
          MapleApp.escapeHtml(item.still_relevant_reason) + '</p>';
      }
      html += '</div>';
    } else if (item.still_relevant === false) {
      html += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(255,255,255,0.04);' +
        'border-radius:8px;border-left:3px solid #666;">' +
        '<span style="color:#666;font-weight:600;font-size:14px;">&#x2717; No Longer Relevant</span>';
      if (item.still_relevant_reason) {
        html += '<p style="margin:6px 0 0;color:#999;font-size:13px;line-height:1.6;">' +
          MapleApp.escapeHtml(item.still_relevant_reason) + '</p>';
      }
      html += '</div>';
    }

    // Full description (English + Korean)
    var descEn = '';
    var descKo = '';
    if (typeof item.description === 'string') {
      descEn = item.description;
    } else if (item.description) {
      descEn = item.description.en || '';
      descKo = item.description.ko || '';
    }

    if (descEn || descKo) {
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Description</h4>';
      if (descEn) {
        html += '<p style="margin:0 0 8px;color:#ccc;line-height:1.7;font-size:14px;">' +
          MapleApp.escapeHtml(descEn) + '</p>';
      }
      if (descKo) {
        html += '<p style="margin:0;color:#999;line-height:1.7;font-size:13px;font-style:italic;">' +
          MapleApp.escapeHtml(descKo) + '</p>';
      }
      html += '</div>';
    }

    // Origin story
    if (item.origin) {
      var originText = typeof item.origin === 'string' ? item.origin : (item.origin.en || item.origin.text || '');
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Origin</h4>' +
        '<p style="margin:0;color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;border-left:3px solid ' + catColor + ';">' +
        MapleApp.escapeHtml(originText) + '</p></div>';
    }

    // Related mechanic
    if (item.related_mechanic) {
      var mechText = typeof item.related_mechanic === 'string'
        ? item.related_mechanic
        : (item.related_mechanic.en || item.related_mechanic.name || '');
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Related Mechanic</h4>' +
        '<p style="margin:0;color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;">' +
        MapleApp.escapeHtml(mechText) + '</p></div>';
    }

    html += '</div>';
    MapleApp.showModal(html);
  }
};
