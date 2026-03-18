/**
 * MapleStory Archive - Patch History
 * Visual timeline of MapleStory's major updates, filterable by era and category.
 */
window.PatchHistory = {
  loaded: false,

  _allPatches: [],
  _activeEra: 'all',
  _activeCategory: 'all',

  ERA_COLORS: {
    beta: '#888888',
    classic: '#4ade80',
    big_bang: '#ff9500',
    tempest: '#60a5fa',
    red: '#ef4444',
    black: '#8b5cf6',
    arcane: '#a78bfa',
    destiny: '#fbbf24',
    modern: '#06b6d4'
  },

  ERA_LABELS: {
    beta: 'Beta',
    classic: 'Classic',
    big_bang: 'Big Bang',
    tempest: 'Tempest',
    red: 'RED',
    black: 'Black',
    arcane: 'Arcane',
    destiny: 'Destiny',
    modern: 'Modern'
  },

  CATEGORY_LABELS: {
    all: 'All',
    major: 'Major',
    content: 'Content',
    rebalance: 'Rebalance',
    qol: 'QoL'
  },

  REACTION_STYLES: {
    positive: { bg: 'rgba(74,222,128,0.2)', color: '#4ade80', label: 'Positive' },
    negative: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', label: 'Negative' },
    mixed: { bg: 'rgba(250,204,21,0.2)', color: '#facc15', label: 'Mixed' },
    controversial: { bg: 'rgba(251,146,60,0.2)', color: '#fb923c', label: 'Controversial' }
  },

  async init() {
    if (this.loaded) return;
    var panel = document.getElementById('panel-patch-history');
    if (!panel) return;

    panel.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Loading patch history...</div>';

    try {
      var data = await MapleApp.api('/api/patch-history');
      this._allPatches = Array.isArray(data) ? data : (data.patches || []);
      this._buildUI(panel);
    } catch (e) {
      panel.innerHTML = '<div style="text-align:center;color:#f87171;padding:40px;">Failed to load patch history data.</div>';
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
      '<h2 style="margin:0 0 4px;color:#ffcc00;font-size:22px;">Patch History</h2>' +
      '<p style="margin:0 0 16px;color:#888;font-size:14px;">MapleStory major update timeline</p>';
    panel.appendChild(header);

    // Filters
    var filterBar = document.createElement('div');
    filterBar.style.cssText =
      'display:flex;gap:12px;padding:0 24px 16px;flex-wrap:wrap;align-items:center;' +
      'border-bottom:1px solid rgba(255,255,255,0.1);';

    // Era filter
    var eraWrapper = document.createElement('div');
    eraWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    eraWrapper.innerHTML = '<label style="font-size:13px;color:#888;">Era:</label>';
    var eraSelect = document.createElement('select');
    eraSelect.id = 'patch-era-filter';
    eraSelect.style.cssText =
      'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;';
    eraSelect.innerHTML = '<option value="all">All Eras</option>';
    Object.keys(self.ERA_LABELS).forEach(function (key) {
      eraSelect.innerHTML += '<option value="' + key + '">' + MapleApp.escapeHtml(self.ERA_LABELS[key]) + '</option>';
    });
    eraSelect.addEventListener('change', function () {
      self._activeEra = this.value;
      self._renderTimeline();
    });
    eraWrapper.appendChild(eraSelect);
    filterBar.appendChild(eraWrapper);

    // Category filter
    var catWrapper = document.createElement('div');
    catWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    catWrapper.innerHTML = '<label style="font-size:13px;color:#888;">Category:</label>';
    var catSelect = document.createElement('select');
    catSelect.id = 'patch-category-filter';
    catSelect.style.cssText =
      'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
      'background:rgba(0,0,0,0.3);color:#fff;font-size:13px;outline:none;cursor:pointer;';
    Object.keys(self.CATEGORY_LABELS).forEach(function (key) {
      catSelect.innerHTML += '<option value="' + key + '">' + MapleApp.escapeHtml(self.CATEGORY_LABELS[key]) + '</option>';
    });
    catSelect.addEventListener('change', function () {
      self._activeCategory = this.value;
      self._renderTimeline();
    });
    catWrapper.appendChild(catSelect);
    filterBar.appendChild(catWrapper);

    // Count badge
    var countBadge = document.createElement('span');
    countBadge.id = 'patch-count';
    countBadge.style.cssText = 'font-size:13px;color:#666;margin-left:auto;';
    filterBar.appendChild(countBadge);

    panel.appendChild(filterBar);

    // Timeline container
    var timelineContainer = document.createElement('div');
    timelineContainer.id = 'patch-timeline';
    timelineContainer.style.cssText =
      'padding:24px;overflow-y:auto;max-height:calc(100vh - 280px);position:relative;';
    panel.appendChild(timelineContainer);

    this._renderTimeline();
  },

  _getFiltered: function () {
    var self = this;
    return this._allPatches.filter(function (p) {
      var eraMatch = self._activeEra === 'all' || p.era === self._activeEra;
      var catMatch = self._activeCategory === 'all' || p.category === self._activeCategory;
      return eraMatch && catMatch;
    });
  },

  _renderTimeline: function () {
    var self = this;
    var container = document.getElementById('patch-timeline');
    if (!container) return;

    var patches = this._getFiltered();

    // Sort chronologically by date
    patches.sort(function (a, b) {
      return new Date(a.date || 0) - new Date(b.date || 0);
    });

    // Update count
    var countEl = document.getElementById('patch-count');
    if (countEl) {
      countEl.textContent = patches.length + ' patch' + (patches.length !== 1 ? 'es' : '');
    }

    if (patches.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;color:#888;padding:60px;">No patches found for the selected filters.</div>';
      return;
    }

    // Extract years for year markers
    var yearsSeen = {};
    patches.forEach(function (p) {
      if (p.date) {
        var year = new Date(p.date).getFullYear();
        if (!isNaN(year)) yearsSeen[year] = true;
      }
    });
    var years = Object.keys(yearsSeen).sort();

    // Build timeline HTML
    var html = '<div class="patch-timeline-wrapper" style="position:relative;padding:0 20px;">';

    // Center line
    html += '<div style="position:absolute;left:50%;top:0;bottom:0;width:3px;' +
      'background:linear-gradient(180deg,#ffcc00 0%,#ff9500 30%,#8b5cf6 60%,#06b6d4 100%);' +
      'transform:translateX(-50%);border-radius:3px;"></div>';

    var currentYear = null;

    patches.forEach(function (patch, idx) {
      var isLeft = idx % 2 === 0;
      var eraColor = self.ERA_COLORS[patch.era] || '#888';
      var patchYear = patch.date ? new Date(patch.date).getFullYear() : null;

      // Year marker
      if (patchYear && patchYear !== currentYear) {
        currentYear = patchYear;
        html +=
          '<div style="position:relative;text-align:center;margin:24px 0 16px;z-index:2;">' +
          '<span style="display:inline-block;background:#0f172a;border:2px solid #ffcc00;' +
          'color:#ffcc00;font-weight:700;font-size:15px;padding:6px 20px;border-radius:20px;">' +
          currentYear + '</span></div>';
      }

      // Card container
      html += '<div style="display:flex;align-items:flex-start;margin-bottom:20px;position:relative;' +
        (isLeft ? 'flex-direction:row;' : 'flex-direction:row-reverse;') + '">';

      // Card
      html += '<div class="patch-card" data-idx="' + idx + '" style="' +
        'width:calc(50% - 30px);background:#1a1a2e;border-radius:12px;padding:18px;' +
        'border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:all 0.2s;' +
        'border-left:4px solid ' + eraColor + ';">';

      // Name
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
        '<h3 style="margin:0;color:#fff;font-size:16px;font-weight:700;">' +
        MapleApp.escapeHtml(patch.name || '') + '</h3>';

      // Era badge
      html += '<span style="font-size:10px;padding:3px 10px;border-radius:10px;white-space:nowrap;' +
        'background:' + eraColor + '22;color:' + eraColor + ';font-weight:600;border:1px solid ' + eraColor + '44;">' +
        MapleApp.escapeHtml(self.ERA_LABELS[patch.era] || patch.era || '') + '</span>';
      html += '</div>';

      // Korean name
      if (patch.name_ko) {
        html += '<div style="font-size:13px;color:#aaa;margin-bottom:8px;">' +
          MapleApp.escapeHtml(patch.name_ko) + '</div>';
      }

      // Date and version
      html += '<div style="display:flex;gap:12px;font-size:12px;color:#666;margin-bottom:10px;">';
      if (patch.date) {
        html += '<span>' + MapleApp.escapeHtml(patch.date) + '</span>';
      }
      if (patch.version) {
        html += '<span>v' + MapleApp.escapeHtml(patch.version) + '</span>';
      }
      html += '</div>';

      // Impact score bar
      if (patch.impact_score != null) {
        var score = Math.max(1, Math.min(10, patch.impact_score));
        var pct = score * 10;
        html += '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span style="font-size:11px;color:#888;">Impact</span>' +
          '<span style="font-size:11px;color:#fff;font-weight:600;">' + score + '/10</span></div>' +
          '<div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;border-radius:3px;' +
          'background:linear-gradient(90deg,' + eraColor + ',' + eraColor + 'aa);"></div>' +
          '</div></div>';
      }

      // Player reaction badge
      if (patch.player_reaction) {
        var rs = self.REACTION_STYLES[patch.player_reaction] || self.REACTION_STYLES.mixed;
        html += '<div style="margin-bottom:10px;">' +
          '<span style="font-size:11px;padding:3px 10px;border-radius:8px;' +
          'background:' + rs.bg + ';color:' + rs.color + ';font-weight:600;">' +
          MapleApp.escapeHtml(rs.label) + '</span></div>';
      }

      // Key changes (first 3)
      var changes = patch.key_changes || [];
      if (changes.length > 0) {
        html += '<ul style="margin:0;padding-left:18px;font-size:12px;color:#ccc;line-height:1.7;">';
        changes.slice(0, 3).forEach(function (c) {
          var text = typeof c === 'string' ? c : (c.en || c.name || '');
          html += '<li>' + MapleApp.escapeHtml(text) + '</li>';
        });
        if (changes.length > 3) {
          html += '<li style="color:#888;">+' + (changes.length - 3) + ' more...</li>';
        }
        html += '</ul>';
      }

      // Classes added
      var classes = patch.classes_added || [];
      if (classes.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;">';
        classes.forEach(function (cls) {
          var clsName = typeof cls === 'string' ? cls : (cls.name || cls.en || '');
          html += '<span style="font-size:10px;padding:2px 8px;border-radius:8px;' +
            'background:rgba(255,204,0,0.15);color:#ffcc00;border:1px solid rgba(255,204,0,0.3);">' +
            MapleApp.escapeHtml(clsName) + '</span>';
        });
        html += '</div>';
      }

      html += '</div>'; // end card

      // Center dot
      html += '<div style="position:absolute;left:50%;top:24px;width:14px;height:14px;' +
        'background:' + eraColor + ';border:3px solid #0f172a;border-radius:50%;' +
        'transform:translateX(-50%);z-index:2;"></div>';

      html += '</div>'; // end row
    });

    html += '</div>';
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.patch-card').forEach(function (card) {
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
        if (!isNaN(i) && patches[i]) {
          self._showPatchModal(patches[i]);
        }
      });
    });
  },

  _showPatchModal: function (patch) {
    var self = this;
    var eraColor = this.ERA_COLORS[patch.era] || '#888';
    var rs = this.REACTION_STYLES[patch.player_reaction] || this.REACTION_STYLES.mixed;

    var html = '<div style="padding:28px;">';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">' +
      '<h2 style="margin:0;color:#fff;font-size:24px;">' + MapleApp.escapeHtml(patch.name || '') + '</h2>' +
      '<span style="font-size:11px;padding:4px 14px;border-radius:12px;white-space:nowrap;' +
      'background:' + eraColor + '22;color:' + eraColor + ';font-weight:600;border:1px solid ' + eraColor + '44;">' +
      MapleApp.escapeHtml(self.ERA_LABELS[patch.era] || patch.era || '') + '</span></div>';

    if (patch.name_ko) {
      html += '<div style="font-size:15px;color:#aaa;margin-bottom:12px;">' +
        MapleApp.escapeHtml(patch.name_ko) + '</div>';
    }

    // Date, version, reaction
    html += '<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">';
    if (patch.date) {
      html += '<span style="font-size:13px;color:#888;">' + MapleApp.escapeHtml(patch.date) + '</span>';
    }
    if (patch.version) {
      html += '<span style="font-size:13px;color:#888;">v' + MapleApp.escapeHtml(patch.version) + '</span>';
    }
    if (patch.player_reaction) {
      html += '<span style="font-size:11px;padding:3px 12px;border-radius:8px;' +
        'background:' + rs.bg + ';color:' + rs.color + ';font-weight:600;">' +
        MapleApp.escapeHtml(rs.label) + '</span>';
    }
    html += '</div>';

    // Impact score
    if (patch.impact_score != null) {
      var score = Math.max(1, Math.min(10, patch.impact_score));
      var pct = score * 10;
      html += '<div style="margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
        '<span style="font-size:13px;color:#888;">Impact Score</span>' +
        '<span style="font-size:13px;color:#fff;font-weight:600;">' + score + '/10</span></div>' +
        '<div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">' +
        '<div style="height:100%;width:' + pct + '%;border-radius:4px;' +
        'background:linear-gradient(90deg,' + eraColor + ',' + eraColor + 'aa);"></div></div></div>';
    }

    // Key changes (full list)
    var changes = patch.key_changes || [];
    if (changes.length > 0) {
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Key Changes</h4>' +
        '<ul style="margin:0;padding-left:20px;font-size:13px;color:#ccc;line-height:1.8;">';
      changes.forEach(function (c) {
        if (typeof c === 'string') {
          html += '<li>' + MapleApp.escapeHtml(c) + '</li>';
        } else {
          html += '<li>' + MapleApp.escapeHtml(c.en || c.name || '');
          if (c.ko) {
            html += ' <span style="color:#888;">(' + MapleApp.escapeHtml(c.ko) + ')</span>';
          }
          html += '</li>';
        }
      });
      html += '</ul></div>';
    }

    // New content
    var newContent = patch.new_content || [];
    if (newContent.length > 0) {
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">New Content</h4>' +
        '<ul style="margin:0;padding-left:20px;font-size:13px;color:#ccc;line-height:1.8;">';
      newContent.forEach(function (item) {
        var text = typeof item === 'string' ? item : (item.en || item.name || '');
        html += '<li>' + MapleApp.escapeHtml(text) + '</li>';
      });
      html += '</ul></div>';
    }

    // Community impact
    if (patch.community_impact) {
      html += '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Community Impact</h4>' +
        '<p style="margin:0;color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;border-left:3px solid ' + eraColor + ';">' +
        MapleApp.escapeHtml(patch.community_impact) + '</p></div>';
    }

    // Classes added
    var classes = patch.classes_added || [];
    if (classes.length > 0) {
      html += '<div>' +
        '<h4 style="margin:0 0 10px;color:#ffcc00;font-size:15px;">Classes Added</h4>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      classes.forEach(function (cls) {
        var clsName = typeof cls === 'string' ? cls : (cls.name || cls.en || '');
        var clsKo = typeof cls === 'object' ? (cls.name_ko || cls.ko || '') : '';
        html += '<span style="font-size:12px;padding:4px 12px;border-radius:10px;' +
          'background:rgba(255,204,0,0.15);color:#ffcc00;border:1px solid rgba(255,204,0,0.3);">' +
          MapleApp.escapeHtml(clsName);
        if (clsKo) {
          html += ' <span style="color:#bbb;">(' + MapleApp.escapeHtml(clsKo) + ')</span>';
        }
        html += '</span>';
      });
      html += '</div></div>';
    }

    html += '</div>';
    MapleApp.showModal(html);
  }
};
