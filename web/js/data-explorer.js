/**
 * MapleStory Archive - Data Explorer Module (data-explorer.js)
 * D3.js-powered visualization for crawled MapleStory.io data.
 * Rendered inside #panel-data-explorer.
 */
window.DataExplorer = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Theme constants
  // ---------------------------------------------------------------------------
  var COLORS = {
    bg: '#0f172a',
    card: '#1e293b',
    cardBorder: 'rgba(255,255,255,0.08)',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textDim: '#cbd5e1',
    orange: '#FF9500',
    blue: '#1E90FF',
    gold: '#FFD700',
    red: '#ef4444',
    green: '#22c55e',
    purple: '#a855f7',
    cyan: '#06b6d4',
    pink: '#ec4899',
  };

  var CHART_PALETTE = [
    COLORS.orange, COLORS.blue, COLORS.gold, COLORS.green,
    COLORS.purple, COLORS.cyan, COLORS.pink, COLORS.red,
  ];

  var SUB_TABS = [
    { key: 'mobs', label: 'Mobs Analysis' },
    { key: 'maps', label: 'Maps Analysis' },
    { key: 'items', label: 'Items Analysis' },
    { key: 'npcs', label: 'NPCs Analysis' },
    { key: 'quests', label: 'Quests Analysis' },
    { key: 'network', label: 'NPC-Quest Network' },
    { key: 'wiki', label: 'Wiki Encyclopedia' },
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var activeSubTab = 'mobs';
  var subTabLoaded = {};
  var debounceTimers = {};

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function getPanel() {
    return document.getElementById('panel-data-explorer');
  }

  function formatNumber(n) {
    if (n == null) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function makeCard(id, extraStyle) {
    return (
      '<div id="' + id + '" style="background:' + COLORS.card +
      ';border-radius:12px;padding:20px;border:1px solid ' + COLORS.cardBorder +
      ';' + (extraStyle || '') + '"></div>'
    );
  }

  function makeChartTitle(text) {
    return (
      '<h3 style="color:' + COLORS.text + ';font-size:15px;font-weight:600;' +
      'margin:0 0 16px 0;">' + MapleApp.escapeHtml(text) + '</h3>'
    );
  }

  function makeEmptyMessage() {
    return (
      '<div style="padding:40px;text-align:center;color:' + COLORS.textMuted + ';font-size:14px;">' +
      'No crawled data yet. Run <code style="background:' + COLORS.bg +
      ';padding:2px 8px;border-radius:4px;color:' + COLORS.orange +
      ';">python main.py crawl maplestory_io</code> to fetch data.' +
      '</div>'
    );
  }

  function getContainerWidth(el) {
    if (!el) return 600;
    return el.getBoundingClientRect().width - 40; // subtract padding
  }

  // ---------------------------------------------------------------------------
  // Build UI skeleton
  // ---------------------------------------------------------------------------
  function buildUI() {
    var panel = getPanel();
    if (!panel) return;

    // Overview stats bar
    var html =
      '<div style="padding:8px;">' +
        '<div id="de-overview" style="margin-bottom:20px;">' +
          '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:20px;">Loading overview...</div>' +
        '</div>' +

        // Sub-tab navigation
        '<div id="de-subtabs" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;"></div>' +

        // Sub-tab content panels
        '<div id="de-tab-mobs" style="display:none;"></div>' +
        '<div id="de-tab-maps" style="display:none;"></div>' +
        '<div id="de-tab-items" style="display:none;"></div>' +
        '<div id="de-tab-npcs" style="display:none;"></div>' +
        '<div id="de-tab-quests" style="display:none;"></div>' +
        '<div id="de-tab-network" style="display:none;"></div>' +
        '<div id="de-tab-wiki" style="display:none;"></div>' +
      '</div>';

    panel.innerHTML = html;
    renderSubTabs();
    loadOverview();
    switchSubTab('mobs');
  }

  // ---------------------------------------------------------------------------
  // Overview stats bar
  // ---------------------------------------------------------------------------
  function loadOverview() {
    MapleApp.api('/api/crawled/overview')
      .then(function (data) {
        renderOverview(data);
      })
      .catch(function () {
        var el = document.getElementById('de-overview');
        if (el) el.innerHTML = makeEmptyMessage();
      });
  }

  function renderOverview(data) {
    var el = document.getElementById('de-overview');
    if (!el) return;

    var stats = (data && data.stats) || {};
    var total = (stats.mobs || 0) + (stats.maps || 0) + (stats.items || 0) + (stats.bosses || 0);

    if (total === 0) {
      el.innerHTML = makeEmptyMessage();
      return;
    }

    var entries = [
      { label: 'Mobs', value: stats.mobs || 0, icon: '&#x1F47E;', color: COLORS.orange },
      { label: 'Maps', value: stats.maps || 0, icon: '&#x1F5FA;', color: COLORS.blue },
      { label: 'Items', value: stats.items || 0, icon: '&#x2728;', color: COLORS.gold },
      { label: 'Bosses', value: stats.bosses || 0, icon: '&#x1F480;', color: COLORS.red },
    ];

    var html = '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">';
    entries.forEach(function (entry) {
      html +=
        '<div style="background:' + COLORS.card + ';border-radius:10px;padding:16px 28px;' +
        'min-width:150px;text-align:center;border:1px solid ' + COLORS.cardBorder + ';">' +
          '<div style="font-size:24px;margin-bottom:4px;">' + entry.icon + '</div>' +
          '<div style="font-size:28px;font-weight:bold;color:' + entry.color + ';">' +
            formatNumber(entry.value) +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;">' +
            MapleApp.escapeHtml(entry.label) +
          '</div>' +
        '</div>';
    });
    html += '</div>';

    // Crawl status if available
    if (data.crawl_status) {
      var cs = data.crawl_status;
      html +=
        '<div style="text-align:center;margin-top:12px;font-size:12px;color:' + COLORS.textMuted + ';">' +
        'Last crawled: ' + MapleApp.escapeHtml(cs.last_crawled || 'Unknown') +
        (cs.duration ? ' (' + MapleApp.escapeHtml(cs.duration) + ')' : '') +
        '</div>';
    }

    el.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Sub-tab navigation
  // ---------------------------------------------------------------------------
  function renderSubTabs() {
    var container = document.getElementById('de-subtabs');
    if (!container) return;

    var html = SUB_TABS.map(function (tab) {
      var isActive = tab.key === activeSubTab;
      return (
        '<button data-subtab="' + tab.key + '" style="' +
        'padding:8px 20px;border-radius:20px;border:none;cursor:pointer;' +
        'font-size:13px;font-weight:600;transition:all 0.2s;' +
        (isActive
          ? 'background:' + COLORS.orange + ';color:#fff;'
          : 'background:' + COLORS.card + ';color:' + COLORS.textMuted +
            ';border:1px solid ' + COLORS.cardBorder + ';') +
        '">' +
        MapleApp.escapeHtml(tab.label) +
        '</button>'
      );
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchSubTab(this.dataset.subtab);
      });
    });
  }

  function switchSubTab(key) {
    activeSubTab = key;
    renderSubTabs();

    // Show/hide panels
    SUB_TABS.forEach(function (tab) {
      var el = document.getElementById('de-tab-' + tab.key);
      if (el) el.style.display = tab.key === key ? 'block' : 'none';
    });

    // Initialize tab content if first visit
    if (!subTabLoaded[key]) {
      subTabLoaded[key] = true;
      if (key === 'mobs') initMobsTab();
      else if (key === 'maps') initMapsTab();
      else if (key === 'items') initItemsTab();
      else if (key === 'npcs') initNPCsTab();
      else if (key === 'quests') initQuestsTab();
      else if (key === 'network') initNetworkTab();
      else if (key === 'wiki') initWikiTab();
    }
  }

  // ===========================================================================
  // MOBS ANALYSIS TAB
  // ===========================================================================
  function initMobsTab() {
    var container = document.getElementById('de-tab-mobs');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        makeCard('de-mob-level-dist', 'grid-column:1/-1;min-height:300px;') +
        makeCard('de-mob-scatter', 'grid-column:1/-1;min-height:350px;') +
        '<div style="grid-column:1/-1;">' +
          makeCard('de-mob-search', 'min-height:100px;') +
        '</div>' +
      '</div>';

    Promise.all([
      MapleApp.api('/api/crawled/mobs/stats'),
      MapleApp.api('/api/crawled/mobs/chart'),
    ])
    .then(function (results) {
      renderMobLevelDistribution(results[0]);
      renderMobScatterPlot(results[1]);
      renderMobSearch();
    })
    .catch(function () {
      container.innerHTML = makeEmptyMessage();
    });
  }

  // --- Mob Level Distribution Bar Chart ---
  function renderMobLevelDistribution(data) {
    var container = document.getElementById('de-mob-level-dist');
    if (!container || !data) return;

    var dist = data.level_distribution || [];
    if (dist.length === 0) {
      container.innerHTML = makeChartTitle('Level Distribution') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Mob Level Distribution');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-mob-level-chart';
    container.appendChild(chartDiv);

    var width = getContainerWidth(container);
    var margin = { top: 10, right: 20, bottom: 50, left: 60 };
    var w = width - margin.left - margin.right;
    var h = 240;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleBand()
      .domain(dist.map(function (d) { return d.level_range; }))
      .range([0, w])
      .padding(0.2);

    var yScale = d3.scaleLinear()
      .domain([0, d3.max(dist, function (d) { return d.count; }) || 1])
      .nice()
      .range([h, 0]);

    // X axis
    svg.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end');

    svg.selectAll('.domain, .tick line').attr('stroke', COLORS.cardBorder);

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px');

    // Bars
    svg.selectAll('.bar')
      .data(dist)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', function (d) { return xScale(d.level_range); })
      .attr('y', function (d) { return yScale(d.count); })
      .attr('width', xScale.bandwidth())
      .attr('height', function (d) { return h - yScale(d.count); })
      .attr('rx', 3)
      .attr('fill', COLORS.orange)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85);
      });

    // Value labels on bars
    svg.selectAll('.bar-label')
      .data(dist)
      .join('text')
      .attr('x', function (d) { return xScale(d.level_range) + xScale.bandwidth() / 2; })
      .attr('y', function (d) { return yScale(d.count) - 4; })
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textDim)
      .attr('font-size', '10px')
      .text(function (d) { return d.count; });

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Count');
  }

  // --- Mob Scatter Plot (Level vs HP) ---
  function renderMobScatterPlot(data) {
    var container = document.getElementById('de-mob-scatter');
    if (!container || !data) return;

    var mobs = data.data || [];
    if (mobs.length === 0) {
      container.innerHTML = makeChartTitle('Level vs HP') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Level vs HP (Bosses highlighted)');

    // Legend
    var legendHtml =
      '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:12px;font-size:12px;color:' +
      COLORS.textMuted + ';">' +
        '<span style="display:inline-flex;align-items:center;gap:4px;">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + COLORS.blue + ';display:inline-block;"></span>' +
          'Normal Mob' +
        '</span>' +
        '<span style="display:inline-flex;align-items:center;gap:4px;">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + COLORS.red + ';display:inline-block;"></span>' +
          'Boss' +
        '</span>' +
      '</div>';

    var legendDiv = document.createElement('div');
    legendDiv.innerHTML = legendHtml;
    container.appendChild(legendDiv);

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-mob-scatter-chart';
    container.appendChild(chartDiv);

    var width = getContainerWidth(container);
    var margin = { top: 10, right: 30, bottom: 50, left: 70 };
    var w = width - margin.left - margin.right;
    var h = 260;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear()
      .domain([0, d3.max(mobs, function (d) { return d.level; }) || 1])
      .nice()
      .range([0, w]);

    var maxHp = d3.max(mobs, function (d) { return d.max_hp; }) || 1;
    var yScale = d3.scaleLog()
      .domain([1, maxHp])
      .range([h, 0])
      .clamp(true);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale).ticks(8).tickSize(-h).tickFormat(''))
      .selectAll('line')
      .attr('stroke', COLORS.cardBorder)
      .attr('stroke-dasharray', '2,2');

    svg.selectAll('.grid .domain').remove();

    // Axes
    svg.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale).ticks(8))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px');

    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5, '~s'))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px');

    svg.selectAll('.domain, .tick line').attr('stroke', COLORS.cardBorder);

    // Tooltip
    var tooltip = d3.select(chartDiv)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', COLORS.card)
      .style('border', '1px solid ' + COLORS.cardBorder)
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', COLORS.text)
      .style('opacity', 0)
      .style('z-index', '10');

    // Sort so bosses render on top
    var sorted = mobs.slice().sort(function (a, b) {
      return (a.is_boss ? 1 : 0) - (b.is_boss ? 1 : 0);
    });

    // Dots
    svg.selectAll('.dot')
      .data(sorted)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', function (d) { return xScale(d.level || 0); })
      .attr('cy', function (d) { return yScale(Math.max(1, d.max_hp || 1)); })
      .attr('r', function (d) { return d.is_boss ? 6 : 3; })
      .attr('fill', function (d) { return d.is_boss ? COLORS.red : COLORS.blue; })
      .attr('opacity', function (d) { return d.is_boss ? 0.9 : 0.5; })
      .attr('stroke', function (d) { return d.is_boss ? COLORS.gold : 'none'; })
      .attr('stroke-width', function (d) { return d.is_boss ? 1.5 : 0; })
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('r', d.is_boss ? 8 : 5);
        tooltip
          .style('opacity', 1)
          .html(
            '<strong>' + MapleApp.escapeHtml(d.name || 'Unknown') + '</strong><br>' +
            'Level: ' + (d.level || 0) + '<br>' +
            'HP: ' + formatNumber(d.max_hp || 0) + '<br>' +
            'EXP: ' + formatNumber(d.exp || 0) +
            (d.is_boss ? '<br><span style="color:' + COLORS.red + ';font-weight:bold;">BOSS</span>' : '')
          );
      })
      .on('mousemove', function (event) {
        var rect = chartDiv.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 15) + 'px')
          .style('top', (event.clientY - rect.top - 10) + 'px');
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .attr('opacity', d.is_boss ? 0.9 : 0.5)
          .attr('r', d.is_boss ? 6 : 3);
        tooltip.style('opacity', 0);
      });

    // Axis labels
    svg.append('text')
      .attr('x', w / 2)
      .attr('y', h + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Level');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -55)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Max HP (log scale)');
  }

  // --- Mob Search ---
  function renderMobSearch() {
    var container = document.getElementById('de-mob-search');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Search Mobs') +
      '<div style="position:relative;">' +
        '<input id="de-mob-search-input" type="text" placeholder="Search by mob name..." ' +
          'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' + COLORS.cardBorder + ';' +
          'background:' + COLORS.bg + ';color:' + COLORS.text + ';font-size:14px;' +
          'box-sizing:border-box;outline:none;" />' +
      '</div>' +
      '<div id="de-mob-search-results" style="margin-top:12px;max-height:350px;overflow-y:auto;"></div>';

    var input = document.getElementById('de-mob-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(debounceTimers.mobSearch);
        if (q.length === 0) {
          document.getElementById('de-mob-search-results').innerHTML = '';
          return;
        }
        debounceTimers.mobSearch = setTimeout(function () {
          searchMobs(q);
        }, 300);
      });
    }
  }

  function searchMobs(query) {
    var resultsEl = document.getElementById('de-mob-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Searching...</div>';

    MapleApp.api('/api/crawled/mobs/search?q=' + encodeURIComponent(query))
      .then(function (data) {
        var mobs = data.mobs || [];
        if (mobs.length === 0) {
          resultsEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">' +
            'No mobs found for "' + MapleApp.escapeHtml(query) + '"</div>';
          return;
        }
        renderMobSearchResults(mobs, resultsEl);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<div style="text-align:center;color:' + COLORS.red + ';padding:12px;">Search failed.</div>';
      });
  }

  function renderMobSearchResults(mobs, container) {
    var html = mobs.map(function (mob) {
      var isBoss = mob.is_boss;
      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;' +
        'padding:10px 14px;border-bottom:1px solid ' + COLORS.cardBorder + ';' +
        'transition:background 0.15s;" ' +
        'onmouseenter="this.style.background=\'' + COLORS.bg + '\'" ' +
        'onmouseleave="this.style.background=\'transparent\'">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;color:' + COLORS.text + ';font-weight:' +
              (isBoss ? 'bold' : 'normal') + ';">' +
              MapleApp.escapeHtml(mob.name || 'Unknown') +
              (isBoss
                ? ' <span style="background:' + COLORS.red + ';color:#fff;padding:1px 6px;' +
                  'border-radius:4px;font-size:10px;font-weight:bold;margin-left:6px;">BOSS</span>'
                : '') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:16px;font-size:12px;color:' + COLORS.textMuted + ';flex-shrink:0;">' +
            '<span>Lv.' + (mob.level || '?') + '</span>' +
            '<span>HP: ' + formatNumber(mob.max_hp || mob.hp || 0) + '</span>' +
            '<span>EXP: ' + formatNumber(mob.exp || 0) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML = html;
  }

  // ===========================================================================
  // MAPS ANALYSIS TAB
  // ===========================================================================
  function initMapsTab() {
    var container = document.getElementById('de-tab-maps');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;gap:16px;">' +
        makeCard('de-map-total', 'min-height:60px;') +
        makeCard('de-map-street-chart', 'min-height:400px;') +
      '</div>';

    MapleApp.api('/api/crawled/maps/stats')
      .then(function (data) {
        renderMapTotal(data);
        renderMapStreetChart(data);
      })
      .catch(function () {
        container.innerHTML = makeEmptyMessage();
      });
  }

  function renderMapTotal(data) {
    var container = document.getElementById('de-map-total');
    if (!container || !data) return;

    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;">' +
        '<span style="font-size:14px;color:' + COLORS.textMuted + ';">Total Maps:</span>' +
        '<span style="font-size:28px;font-weight:bold;color:' + COLORS.blue + ';">' +
          formatNumber(data.total || 0) +
        '</span>' +
      '</div>';
  }

  function renderMapStreetChart(data) {
    var container = document.getElementById('de-map-street-chart');
    if (!container || !data) return;

    var dist = (data.street_distribution || []).slice(0, 20);
    if (dist.length === 0) {
      container.innerHTML = makeChartTitle('Top Streets by Map Count') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Top 20 Streets by Map Count');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-map-street-svg';
    container.appendChild(chartDiv);

    var width = getContainerWidth(container);
    var barHeight = 26;
    var margin = { top: 10, right: 50, bottom: 20, left: 180 };
    var w = width - margin.left - margin.right;
    var h = dist.length * barHeight;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear()
      .domain([0, d3.max(dist, function (d) { return d.count; }) || 1])
      .nice()
      .range([0, w]);

    var yScale = d3.scaleBand()
      .domain(dist.map(function (d) { return d.street_name; }))
      .range([0, h])
      .padding(0.2);

    var colorScale = d3.scaleLinear()
      .domain([0, dist.length - 1])
      .range([COLORS.blue, COLORS.cyan]);

    // Bars
    svg.selectAll('.bar')
      .data(dist)
      .join('rect')
      .attr('x', 0)
      .attr('y', function (d) { return yScale(d.street_name); })
      .attr('width', function (d) { return xScale(d.count); })
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', function (d, i) { return colorScale(i); })
      .attr('opacity', 0.85)
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85);
      });

    // Value labels
    svg.selectAll('.val-label')
      .data(dist)
      .join('text')
      .attr('x', function (d) { return xScale(d.count) + 6; })
      .attr('y', function (d) { return yScale(d.street_name) + yScale.bandwidth() / 2 + 4; })
      .attr('fill', COLORS.textDim)
      .attr('font-size', '11px')
      .text(function (d) { return d.count; });

    // Y axis labels
    svg.append('g')
      .selectAll('text')
      .data(dist)
      .join('text')
      .attr('x', -8)
      .attr('y', function (d) { return yScale(d.street_name) + yScale.bandwidth() / 2 + 4; })
      .attr('text-anchor', 'end')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px')
      .text(function (d) {
        var name = d.street_name || 'Unknown';
        return name.length > 22 ? name.substring(0, 20) + '...' : name;
      });
  }

  // ===========================================================================
  // ITEMS ANALYSIS TAB
  // ===========================================================================
  function initItemsTab() {
    var container = document.getElementById('de-tab-items');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        makeCard('de-item-treemap', 'grid-column:1/-1;min-height:400px;') +
        makeCard('de-item-level-dist', 'grid-column:1/-1;min-height:300px;') +
        '<div style="grid-column:1/-1;">' +
          makeCard('de-item-search', 'min-height:100px;') +
        '</div>' +
      '</div>';

    MapleApp.api('/api/crawled/items/stats')
      .then(function (data) {
        renderItemTreemap(data);
        renderItemLevelDistribution(data);
        renderItemSearch();
      })
      .catch(function () {
        container.innerHTML = makeEmptyMessage();
      });
  }

  // --- Item Category Treemap ---
  function renderItemTreemap(data) {
    var container = document.getElementById('de-item-treemap');
    if (!container || !data) return;

    var categories = data.category_distribution || [];
    if (categories.length === 0) {
      container.innerHTML = makeChartTitle('Item Categories') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Item Categories (Treemap)');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-item-treemap-chart';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);

    // Build hierarchy: overall_category > category > sub_category
    var root = { name: 'Items', children: [] };
    var overallMap = {};

    categories.forEach(function (cat) {
      var overallKey = cat.overall_category || 'Other';
      var catKey = cat.category || 'Uncategorized';

      if (!overallMap[overallKey]) {
        overallMap[overallKey] = { name: overallKey, children: [], _catMap: {} };
        root.children.push(overallMap[overallKey]);
      }

      var parent = overallMap[overallKey];
      if (!parent._catMap[catKey]) {
        parent._catMap[catKey] = { name: catKey, children: [] };
        parent.children.push(parent._catMap[catKey]);
      }

      if (cat.sub_category) {
        parent._catMap[catKey].children.push({
          name: cat.sub_category,
          value: cat.count || 0,
        });
      } else {
        // If no sub_category, add value directly
        parent._catMap[catKey].value = (parent._catMap[catKey].value || 0) + (cat.count || 0);
      }
    });

    // Clean up internal maps
    root.children.forEach(function (ov) { delete ov._catMap; });

    // Ensure leaf nodes have values
    function ensureValues(node) {
      if (node.children && node.children.length > 0) {
        node.children.forEach(ensureValues);
        // Remove empty children arrays on leaf-like nodes
        if (!node.children.some(function (c) { return c.value || (c.children && c.children.length); })) {
          node.value = 1;
          delete node.children;
        }
      } else if (!node.value) {
        node.value = 1;
      }
    }
    ensureValues(root);

    var width = getContainerWidth(container);
    var height = 340;

    var colorScale = d3.scaleOrdinal()
      .range(CHART_PALETTE);

    var hierarchy = d3.hierarchy(root)
      .sum(function (d) { return d.value || 0; })
      .sort(function (a, b) { return b.value - a.value; });

    d3.treemap()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(3)
      .round(true)(hierarchy);

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 auto');

    // Tooltip
    var tooltip = d3.select(chartDiv)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', COLORS.card)
      .style('border', '1px solid ' + COLORS.cardBorder)
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', COLORS.text)
      .style('opacity', 0)
      .style('z-index', '10');

    var leaves = hierarchy.leaves();

    var cell = svg.selectAll('g')
      .data(leaves)
      .join('g')
      .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; });

    cell.append('rect')
      .attr('width', function (d) { return Math.max(0, d.x1 - d.x0); })
      .attr('height', function (d) { return Math.max(0, d.y1 - d.y0); })
      .attr('rx', 3)
      .attr('fill', function (d) {
        // Color by top-level parent
        var ancestor = d;
        while (ancestor.depth > 1) ancestor = ancestor.parent;
        return colorScale(ancestor.data.name);
      })
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1);
        var path = [];
        var node = d;
        while (node.parent) {
          path.unshift(node.data.name);
          node = node.parent;
        }
        tooltip
          .style('opacity', 1)
          .html(
            '<strong>' + MapleApp.escapeHtml(path.join(' > ')) + '</strong><br>' +
            'Count: ' + (d.value || 0)
          );
      })
      .on('mousemove', function (event) {
        var rect = chartDiv.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 15) + 'px')
          .style('top', (event.clientY - rect.top - 10) + 'px');
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.8);
        tooltip.style('opacity', 0);
      });

    // Text labels for cells large enough
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text(function (d) {
        var w = d.x1 - d.x0;
        var h = d.y1 - d.y0;
        if (w < 40 || h < 18) return '';
        var name = d.data.name || '';
        var maxChars = Math.floor(w / 6);
        return name.length > maxChars ? name.substring(0, maxChars - 1) + '...' : name;
      });

    // Legend for top-level categories
    var topCategories = root.children.map(function (c) { return c.name; });
    var legendDiv = document.createElement('div');
    legendDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:12px;';

    topCategories.forEach(function (cat) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:' + COLORS.textDim + ';';
      span.innerHTML =
        '<span style="width:10px;height:10px;border-radius:2px;background:' +
        colorScale(cat) + ';display:inline-block;"></span>' +
        MapleApp.escapeHtml(cat);
      legendDiv.appendChild(span);
    });

    container.appendChild(legendDiv);
  }

  // --- Item Level Distribution ---
  function renderItemLevelDistribution(data) {
    var container = document.getElementById('de-item-level-dist');
    if (!container || !data) return;

    var dist = data.level_distribution || [];
    if (dist.length === 0) {
      container.innerHTML = makeChartTitle('Item Level Requirements') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Item Level Requirement Distribution');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-item-level-chart';
    container.appendChild(chartDiv);

    var width = getContainerWidth(container);
    var margin = { top: 10, right: 20, bottom: 50, left: 60 };
    var w = width - margin.left - margin.right;
    var h = 220;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleBand()
      .domain(dist.map(function (d) { return d.level_range; }))
      .range([0, w])
      .padding(0.2);

    var yScale = d3.scaleLinear()
      .domain([0, d3.max(dist, function (d) { return d.count; }) || 1])
      .nice()
      .range([h, 0]);

    // X axis
    svg.append('g')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end');

    svg.selectAll('.domain, .tick line').attr('stroke', COLORS.cardBorder);

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '10px');

    // Bars with gradient
    var colorGrad = d3.scaleLinear()
      .domain([0, dist.length - 1])
      .range([COLORS.gold, COLORS.orange]);

    svg.selectAll('.bar')
      .data(dist)
      .join('rect')
      .attr('x', function (d) { return xScale(d.level_range); })
      .attr('y', function (d) { return yScale(d.count); })
      .attr('width', xScale.bandwidth())
      .attr('height', function (d) { return h - yScale(d.count); })
      .attr('rx', 3)
      .attr('fill', function (d, i) { return colorGrad(i); })
      .attr('opacity', 0.85)
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85);
      });

    // Value labels
    svg.selectAll('.bar-label')
      .data(dist)
      .join('text')
      .attr('x', function (d) { return xScale(d.level_range) + xScale.bandwidth() / 2; })
      .attr('y', function (d) { return yScale(d.count) - 4; })
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textDim)
      .attr('font-size', '10px')
      .text(function (d) { return d.count; });

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Count');
  }

  // --- Item Search ---
  function renderItemSearch() {
    var container = document.getElementById('de-item-search');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Search Items') +
      '<div style="position:relative;">' +
        '<input id="de-item-search-input" type="text" placeholder="Search by item name..." ' +
          'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' + COLORS.cardBorder + ';' +
          'background:' + COLORS.bg + ';color:' + COLORS.text + ';font-size:14px;' +
          'box-sizing:border-box;outline:none;" />' +
      '</div>' +
      '<div id="de-item-search-results" style="margin-top:12px;max-height:350px;overflow-y:auto;"></div>';

    var input = document.getElementById('de-item-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(debounceTimers.itemSearch);
        if (q.length === 0) {
          document.getElementById('de-item-search-results').innerHTML = '';
          return;
        }
        debounceTimers.itemSearch = setTimeout(function () {
          searchItems(q);
        }, 300);
      });
    }
  }

  function searchItems(query) {
    var resultsEl = document.getElementById('de-item-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Searching...</div>';

    MapleApp.api('/api/crawled/items/search?q=' + encodeURIComponent(query))
      .then(function (data) {
        var items = data.items || [];
        if (items.length === 0) {
          resultsEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">' +
            'No items found for "' + MapleApp.escapeHtml(query) + '"</div>';
          return;
        }
        renderItemSearchResults(items, resultsEl);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<div style="text-align:center;color:' + COLORS.red + ';padding:12px;">Search failed.</div>';
      });
  }

  function renderItemSearchResults(items, container) {
    var html = items.map(function (item) {
      var category = [
        item.overall_category,
        item.category,
        item.sub_category,
      ].filter(Boolean).join(' > ');

      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;' +
        'padding:10px 14px;border-bottom:1px solid ' + COLORS.cardBorder + ';' +
        'transition:background 0.15s;" ' +
        'onmouseenter="this.style.background=\'' + COLORS.bg + '\'" ' +
        'onmouseleave="this.style.background=\'transparent\'">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;color:' + COLORS.text + ';">' +
              MapleApp.escapeHtml(item.name || 'Unknown') +
            '</div>' +
            (category
              ? '<div style="font-size:11px;color:' + COLORS.textMuted + ';margin-top:2px;">' +
                  MapleApp.escapeHtml(category) +
                '</div>'
              : '') +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.gold + ';flex-shrink:0;margin-left:12px;">' +
            (item.req_level != null ? 'Lv.' + item.req_level : '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML = html;
  }

  // ===========================================================================
  // NPCs ANALYSIS TAB
  // ===========================================================================
  function initNPCsTab() {
    var container = document.getElementById('de-tab-npcs');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        makeCard('de-npc-stats', 'grid-column:1/-1;min-height:60px;') +
        makeCard('de-npc-pie', 'grid-column:1/-1;min-height:350px;') +
        '<div style="grid-column:1/-1;">' +
          makeCard('de-npc-search', 'min-height:100px;') +
        '</div>' +
        makeCard('de-npc-list', 'grid-column:1/-1;min-height:200px;') +
      '</div>';

    MapleApp.api('/api/crawled/npcs/stats')
      .then(function (data) {
        renderNPCStats(data);
        renderNPCPieChart(data);
        renderNPCSearch();
        loadNPCList();
      })
      .catch(function () {
        container.innerHTML = makeEmptyMessage();
      });
  }

  // --- NPC Stats Cards ---
  function renderNPCStats(data) {
    var container = document.getElementById('de-npc-stats');
    if (!container || !data) return;

    var total = data.total || 0;
    var shops = data.shops || 0;

    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:40px;">' +
        '<div style="text-align:center;">' +
          '<div style="font-size:28px;font-weight:bold;color:' + COLORS.orange + ';">' +
            formatNumber(total) +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;">Total NPCs</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<div style="font-size:28px;font-weight:bold;color:' + COLORS.gold + ';">' +
            formatNumber(shops) +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;">Shop NPCs</div>' +
        '</div>' +
      '</div>';
  }

  // --- NPC Pie Chart: Shop vs Non-Shop ---
  function renderNPCPieChart(data) {
    var container = document.getElementById('de-npc-pie');
    if (!container || !data) return;

    var total = data.total || 0;
    var shops = data.shops || 0;
    var nonShops = total - shops;

    if (total === 0) {
      container.innerHTML = makeChartTitle('Shop vs Non-Shop NPCs') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Shop vs Non-Shop NPCs');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-npc-pie-chart';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);

    var width = Math.min(getContainerWidth(container), 400);
    var height = 300;
    var radius = Math.min(width, height) / 2 - 20;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    var pieData = [
      { label: 'Shop NPCs', value: shops, color: COLORS.gold },
      { label: 'Non-Shop NPCs', value: nonShops, color: COLORS.orange },
    ];

    var pie = d3.pie()
      .value(function (d) { return d.value; })
      .sort(null);

    var arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    var arcHover = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius + 8);

    // Tooltip
    var tooltip = d3.select(chartDiv)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', COLORS.card)
      .style('border', '1px solid ' + COLORS.cardBorder)
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', COLORS.text)
      .style('opacity', 0)
      .style('z-index', '10');

    var arcs = svg.selectAll('.arc')
      .data(pie(pieData))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', function (d) { return d.data.color; })
      .attr('opacity', 0.85)
      .attr('stroke', COLORS.bg)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', arcHover).attr('opacity', 1);
        var pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : 0;
        tooltip
          .style('opacity', 1)
          .html(
            '<strong>' + MapleApp.escapeHtml(d.data.label) + '</strong><br>' +
            'Count: ' + formatNumber(d.data.value) + '<br>' +
            'Percentage: ' + pct + '%'
          );
      })
      .on('mousemove', function (event) {
        var rect = chartDiv.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 15) + 'px')
          .style('top', (event.clientY - rect.top - 10) + 'px');
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('d', arc).attr('opacity', 0.85);
        tooltip.style('opacity', 0);
      });

    // Labels on slices
    arcs.append('text')
      .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(function (d) {
        var pct = total > 0 ? ((d.data.value / total) * 100).toFixed(0) : 0;
        return d.data.value > 0 ? pct + '%' : '';
      });

    // Center text
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', COLORS.text)
      .attr('font-size', '22px')
      .attr('font-weight', 'bold')
      .text(formatNumber(total));

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Total NPCs');

    // Legend
    var legendDiv = document.createElement('div');
    legendDiv.style.cssText = 'display:flex;gap:20px;justify-content:center;margin-top:12px;';
    pieData.forEach(function (d) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:12px;color:' + COLORS.textDim + ';';
      span.innerHTML =
        '<span style="width:12px;height:12px;border-radius:3px;background:' + d.color +
        ';display:inline-block;"></span>' +
        MapleApp.escapeHtml(d.label) + ' (' + formatNumber(d.value) + ')';
      legendDiv.appendChild(span);
    });
    container.appendChild(legendDiv);
  }

  // --- NPC Search ---
  function renderNPCSearch() {
    var container = document.getElementById('de-npc-search');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Search NPCs') +
      '<div style="position:relative;">' +
        '<input id="de-npc-search-input" type="text" placeholder="Search by NPC name or dialogue..." ' +
          'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' + COLORS.cardBorder + ';' +
          'background:' + COLORS.bg + ';color:' + COLORS.text + ';font-size:14px;' +
          'box-sizing:border-box;outline:none;" />' +
      '</div>' +
      '<div id="de-npc-search-results" style="margin-top:12px;max-height:350px;overflow-y:auto;"></div>';

    var input = document.getElementById('de-npc-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(debounceTimers.npcSearch);
        if (q.length === 0) {
          document.getElementById('de-npc-search-results').innerHTML = '';
          return;
        }
        debounceTimers.npcSearch = setTimeout(function () {
          searchNPCs(q);
        }, 300);
      });
    }
  }

  function searchNPCs(query) {
    var resultsEl = document.getElementById('de-npc-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Searching...</div>';

    MapleApp.api('/api/crawled/npcs/search?q=' + encodeURIComponent(query))
      .then(function (data) {
        var npcs = data.npcs || [];
        if (npcs.length === 0) {
          resultsEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">' +
            'No NPCs found for "' + MapleApp.escapeHtml(query) + '"</div>';
          return;
        }
        renderNPCSearchResults(npcs, resultsEl);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<div style="text-align:center;color:' + COLORS.red + ';padding:12px;">Search failed.</div>';
      });
  }

  function renderNPCSearchResults(npcs, container) {
    var html = npcs.map(function (npc) {
      return buildNPCRow(npc);
    }).join('');
    container.innerHTML = html;
  }

  function buildNPCRow(npc) {
    var isShop = npc.is_shop || npc.has_shop;
    var npcId = npc.npc_id || npc.id || '';
    return (
      '<div class="de-npc-row" data-npc-id="' + MapleApp.escapeHtml(String(npcId)) + '" ' +
      'style="padding:10px 14px;border-bottom:1px solid ' + COLORS.cardBorder + ';' +
      'transition:background 0.15s;cursor:pointer;" ' +
      'onmouseenter="this.style.background=\'' + COLORS.bg + '\'" ' +
      'onmouseleave="this.style.background=\'transparent\'">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;color:' + COLORS.text + ';">' +
              MapleApp.escapeHtml(npc.name || 'Unknown') +
              (isShop
                ? ' <span style="background:' + COLORS.gold + ';color:#000;padding:1px 6px;' +
                  'border-radius:4px;font-size:10px;font-weight:bold;margin-left:6px;">SHOP</span>'
                : '') +
            '</div>' +
            (npc.location
              ? '<div style="font-size:11px;color:' + COLORS.textMuted + ';margin-top:2px;">' +
                  MapleApp.escapeHtml(npc.location) +
                '</div>'
              : '') +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';flex-shrink:0;margin-left:12px;">' +
            'ID: ' + MapleApp.escapeHtml(String(npcId)) +
          '</div>' +
        '</div>' +
        '<div id="de-npc-detail-' + MapleApp.escapeHtml(String(npcId)) + '" style="display:none;margin-top:10px;"></div>' +
      '</div>'
    );
  }

  // --- NPC List ---
  function loadNPCList() {
    var container = document.getElementById('de-npc-list');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('NPC List') +
      '<div id="de-npc-list-content" style="max-height:450px;overflow-y:auto;">' +
        '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Loading NPCs...</div>' +
      '</div>';

    MapleApp.api('/api/crawled/npcs?limit=100&offset=0')
      .then(function (data) {
        var npcs = data.npcs || [];
        var listEl = document.getElementById('de-npc-list-content');
        if (!listEl) return;

        if (npcs.length === 0) {
          listEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">No NPCs found.</div>';
          return;
        }

        var html = npcs.map(function (npc) {
          return buildNPCRow(npc);
        }).join('');
        listEl.innerHTML = html;

        // Attach click handlers for detail expansion
        listEl.querySelectorAll('.de-npc-row').forEach(function (row) {
          row.addEventListener('click', function () {
            var npcId = this.dataset.npcId;
            toggleNPCDetail(npcId);
          });
        });
      })
      .catch(function () {
        var listEl = document.getElementById('de-npc-list-content');
        if (listEl) listEl.innerHTML = makeEmptyMessage();
      });
  }

  function toggleNPCDetail(npcId) {
    var detailEl = document.getElementById('de-npc-detail-' + npcId);
    if (!detailEl) return;

    // Toggle visibility
    if (detailEl.style.display === 'block') {
      detailEl.style.display = 'none';
      return;
    }

    detailEl.style.display = 'block';
    detailEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:8px;font-size:12px;">Loading detail...</div>';

    // Fetch NPC detail and related quests in parallel
    Promise.all([
      MapleApp.api('/api/crawled/npcs/' + encodeURIComponent(npcId)),
      MapleApp.api('/api/crawled/npcs/' + encodeURIComponent(npcId) + '/quests'),
    ])
    .then(function (results) {
      var detail = results[0] || {};
      var questData = results[1] || {};
      var quests = questData.quests || [];

      var html =
        '<div style="background:' + COLORS.bg + ';border-radius:8px;padding:12px;font-size:12px;">';

      // Dialogue
      if (detail.dialogue && detail.dialogue.length > 0) {
        html += '<div style="margin-bottom:8px;">' +
          '<strong style="color:' + COLORS.orange + ';">Dialogue:</strong>' +
          '<div style="color:' + COLORS.textDim + ';margin-top:4px;max-height:120px;overflow-y:auto;">';
        detail.dialogue.forEach(function (line) {
          html += '<div style="padding:2px 0;">' + MapleApp.escapeHtml(line) + '</div>';
        });
        html += '</div></div>';
      }

      // Location
      if (detail.location) {
        html += '<div style="margin-bottom:8px;">' +
          '<strong style="color:' + COLORS.blue + ';">Location:</strong> ' +
          '<span style="color:' + COLORS.textDim + ';">' + MapleApp.escapeHtml(detail.location) + '</span>' +
          '</div>';
      }

      // Related Quests
      if (quests.length > 0) {
        html += '<div>' +
          '<strong style="color:' + COLORS.gold + ';">Related Quests (' + quests.length + '):</strong>' +
          '<div style="margin-top:4px;">';
        quests.forEach(function (q) {
          html +=
            '<div style="padding:3px 0;color:' + COLORS.textDim + ';">' +
              '&#x2022; ' + MapleApp.escapeHtml(q.name || q.quest_name || 'Quest #' + (q.quest_id || q.id || '?')) +
            '</div>';
        });
        html += '</div></div>';
      } else {
        html += '<div style="color:' + COLORS.textMuted + ';font-style:italic;">No related quests.</div>';
      }

      html += '</div>';
      detailEl.innerHTML = html;
    })
    .catch(function () {
      detailEl.innerHTML =
        '<div style="color:' + COLORS.red + ';padding:8px;font-size:12px;">Failed to load detail.</div>';
    });
  }

  // ===========================================================================
  // QUESTS ANALYSIS TAB
  // ===========================================================================
  function initQuestsTab() {
    var container = document.getElementById('de-tab-quests');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;gap:16px;">' +
        makeCard('de-quest-stats', 'min-height:60px;') +
        makeCard('de-quest-area-chart', 'min-height:400px;') +
        makeCard('de-quest-search', 'min-height:100px;') +
        makeCard('de-quest-list', 'min-height:200px;') +
      '</div>';

    MapleApp.api('/api/crawled/quests/stats')
      .then(function (data) {
        renderQuestStats(data);
        renderQuestAreaChart(data);
        renderQuestSearch();
        loadQuestList();
      })
      .catch(function () {
        container.innerHTML = makeEmptyMessage();
      });
  }

  // --- Quest Stats ---
  function renderQuestStats(data) {
    var container = document.getElementById('de-quest-stats');
    if (!container || !data) return;

    var total = data.total || 0;

    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;">' +
        '<span style="font-size:14px;color:' + COLORS.textMuted + ';">Total Quests:</span>' +
        '<span style="font-size:28px;font-weight:bold;color:' + COLORS.blue + ';">' +
          formatNumber(total) +
        '</span>' +
      '</div>';
  }

  // --- Quest Area Distribution Bar Chart ---
  function renderQuestAreaChart(data) {
    var container = document.getElementById('de-quest-area-chart');
    if (!container || !data) return;

    var dist = (data.area_distribution || []).slice(0, 25);
    if (dist.length === 0) {
      container.innerHTML = makeChartTitle('Quest Area Distribution') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Quest Area Distribution');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-quest-area-svg';
    container.appendChild(chartDiv);

    var width = getContainerWidth(container);
    var barHeight = 26;
    var margin = { top: 10, right: 50, bottom: 20, left: 180 };
    var w = width - margin.left - margin.right;
    var h = dist.length * barHeight;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear()
      .domain([0, d3.max(dist, function (d) { return d.count; }) || 1])
      .nice()
      .range([0, w]);

    var yScale = d3.scaleBand()
      .domain(dist.map(function (d) { return d.area || d.area_name || 'Unknown'; }))
      .range([0, h])
      .padding(0.2);

    var colorScale = d3.scaleLinear()
      .domain([0, dist.length - 1])
      .range([COLORS.blue, COLORS.purple]);

    // Bars
    svg.selectAll('.bar')
      .data(dist)
      .join('rect')
      .attr('x', 0)
      .attr('y', function (d) { return yScale(d.area || d.area_name || 'Unknown'); })
      .attr('width', function (d) { return xScale(d.count); })
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', function (d, i) { return colorScale(i); })
      .attr('opacity', 0.85)
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85);
      });

    // Value labels
    svg.selectAll('.val-label')
      .data(dist)
      .join('text')
      .attr('x', function (d) { return xScale(d.count) + 6; })
      .attr('y', function (d) { return yScale(d.area || d.area_name || 'Unknown') + yScale.bandwidth() / 2 + 4; })
      .attr('fill', COLORS.textDim)
      .attr('font-size', '11px')
      .text(function (d) { return d.count; });

    // Y axis labels
    svg.append('g')
      .selectAll('text')
      .data(dist)
      .join('text')
      .attr('x', -8)
      .attr('y', function (d) { return yScale(d.area || d.area_name || 'Unknown') + yScale.bandwidth() / 2 + 4; })
      .attr('text-anchor', 'end')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px')
      .text(function (d) {
        var name = d.area || d.area_name || 'Unknown';
        return name.length > 22 ? name.substring(0, 20) + '...' : name;
      });
  }

  // --- Quest Search ---
  function renderQuestSearch() {
    var container = document.getElementById('de-quest-search');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Search Quests') +
      '<div style="position:relative;">' +
        '<input id="de-quest-search-input" type="text" placeholder="Search by quest name..." ' +
          'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' + COLORS.cardBorder + ';' +
          'background:' + COLORS.bg + ';color:' + COLORS.text + ';font-size:14px;' +
          'box-sizing:border-box;outline:none;" />' +
      '</div>' +
      '<div id="de-quest-search-results" style="margin-top:12px;max-height:350px;overflow-y:auto;"></div>';

    var input = document.getElementById('de-quest-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(debounceTimers.questSearch);
        if (q.length === 0) {
          document.getElementById('de-quest-search-results').innerHTML = '';
          return;
        }
        debounceTimers.questSearch = setTimeout(function () {
          searchQuests(q);
        }, 300);
      });
    }
  }

  function searchQuests(query) {
    var resultsEl = document.getElementById('de-quest-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Searching...</div>';

    MapleApp.api('/api/crawled/quests/search?q=' + encodeURIComponent(query))
      .then(function (data) {
        var quests = data.quests || [];
        if (quests.length === 0) {
          resultsEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">' +
            'No quests found for "' + MapleApp.escapeHtml(query) + '"</div>';
          return;
        }
        renderQuestSearchResults(quests, resultsEl);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<div style="text-align:center;color:' + COLORS.red + ';padding:12px;">Search failed.</div>';
      });
  }

  function renderQuestSearchResults(quests, container) {
    var html = quests.map(function (quest) {
      return buildQuestRow(quest);
    }).join('');
    container.innerHTML = html;
  }

  function buildQuestRow(quest) {
    var questId = quest.quest_id || quest.id || '';
    var area = quest.area || quest.area_name || '';
    return (
      '<div class="de-quest-row" data-quest-id="' + MapleApp.escapeHtml(String(questId)) + '" ' +
      'style="padding:10px 14px;border-bottom:1px solid ' + COLORS.cardBorder + ';' +
      'transition:background 0.15s;cursor:pointer;" ' +
      'onmouseenter="this.style.background=\'' + COLORS.bg + '\'" ' +
      'onmouseleave="this.style.background=\'transparent\'">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;color:' + COLORS.text + ';">' +
              MapleApp.escapeHtml(quest.name || quest.quest_name || 'Unknown Quest') +
            '</div>' +
            (area
              ? '<div style="font-size:11px;color:' + COLORS.textMuted + ';margin-top:2px;">' +
                  MapleApp.escapeHtml(area) +
                '</div>'
              : '') +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';flex-shrink:0;margin-left:12px;">' +
            'ID: ' + MapleApp.escapeHtml(String(questId)) +
          '</div>' +
        '</div>' +
        '<div id="de-quest-detail-' + MapleApp.escapeHtml(String(questId)) + '" style="display:none;margin-top:10px;"></div>' +
      '</div>'
    );
  }

  // --- Quest List ---
  function loadQuestList() {
    var container = document.getElementById('de-quest-list');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Quest List') +
      '<div id="de-quest-list-content" style="max-height:450px;overflow-y:auto;">' +
        '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Loading quests...</div>' +
      '</div>';

    MapleApp.api('/api/crawled/quests?limit=100&offset=0')
      .then(function (data) {
        var quests = data.quests || [];
        var listEl = document.getElementById('de-quest-list-content');
        if (!listEl) return;

        if (quests.length === 0) {
          listEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">No quests found.</div>';
          return;
        }

        var html = quests.map(function (quest) {
          return buildQuestRow(quest);
        }).join('');
        listEl.innerHTML = html;

        // Attach click handlers for detail expansion
        listEl.querySelectorAll('.de-quest-row').forEach(function (row) {
          row.addEventListener('click', function () {
            var questId = this.dataset.questId;
            toggleQuestDetail(questId);
          });
        });
      })
      .catch(function () {
        var listEl = document.getElementById('de-quest-list-content');
        if (listEl) listEl.innerHTML = makeEmptyMessage();
      });
  }

  function toggleQuestDetail(questId) {
    var detailEl = document.getElementById('de-quest-detail-' + questId);
    if (!detailEl) return;

    if (detailEl.style.display === 'block') {
      detailEl.style.display = 'none';
      return;
    }

    detailEl.style.display = 'block';
    detailEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:8px;font-size:12px;">Loading detail...</div>';

    MapleApp.api('/api/crawled/quests/' + encodeURIComponent(questId))
      .then(function (detail) {
        if (!detail) {
          detailEl.innerHTML =
            '<div style="color:' + COLORS.red + ';padding:8px;font-size:12px;">No detail available.</div>';
          return;
        }

        var html =
          '<div style="background:' + COLORS.bg + ';border-radius:8px;padding:12px;font-size:12px;">';

        // Messages / Description
        var messages = detail.messages || detail.description;
        if (messages) {
          html += '<div style="margin-bottom:8px;">' +
            '<strong style="color:' + COLORS.blue + ';">Description:</strong>' +
            '<div style="color:' + COLORS.textDim + ';margin-top:4px;">';
          if (Array.isArray(messages)) {
            messages.forEach(function (msg) {
              html += '<div style="padding:2px 0;">' + MapleApp.escapeHtml(msg) + '</div>';
            });
          } else {
            html += '<div>' + MapleApp.escapeHtml(String(messages)) + '</div>';
          }
          html += '</div></div>';
        }

        // Requirements
        var reqs = detail.requirements || detail.required_items;
        if (reqs && ((Array.isArray(reqs) && reqs.length > 0) || (!Array.isArray(reqs) && Object.keys(reqs).length > 0))) {
          html += '<div style="margin-bottom:8px;">' +
            '<strong style="color:' + COLORS.orange + ';">Requirements:</strong>' +
            '<div style="color:' + COLORS.textDim + ';margin-top:4px;">';
          if (Array.isArray(reqs)) {
            reqs.forEach(function (req) {
              var reqText = typeof req === 'string' ? req : (req.name || req.item_name || JSON.stringify(req));
              html += '<div style="padding:2px 0;">&#x2022; ' + MapleApp.escapeHtml(reqText) + '</div>';
            });
          } else {
            Object.keys(reqs).forEach(function (key) {
              html += '<div style="padding:2px 0;">&#x2022; ' + MapleApp.escapeHtml(key) + ': ' +
                MapleApp.escapeHtml(String(reqs[key])) + '</div>';
            });
          }
          html += '</div></div>';
        }

        // Rewards
        var rewards = detail.rewards || detail.reward_items;
        if (rewards && ((Array.isArray(rewards) && rewards.length > 0) || (!Array.isArray(rewards) && Object.keys(rewards).length > 0))) {
          html += '<div>' +
            '<strong style="color:' + COLORS.gold + ';">Rewards:</strong>' +
            '<div style="color:' + COLORS.textDim + ';margin-top:4px;">';
          if (Array.isArray(rewards)) {
            rewards.forEach(function (r) {
              var rText = typeof r === 'string' ? r : (r.name || r.item_name || JSON.stringify(r));
              html += '<div style="padding:2px 0;">&#x2022; ' + MapleApp.escapeHtml(rText) + '</div>';
            });
          } else {
            Object.keys(rewards).forEach(function (key) {
              html += '<div style="padding:2px 0;">&#x2022; ' + MapleApp.escapeHtml(key) + ': ' +
                MapleApp.escapeHtml(String(rewards[key])) + '</div>';
            });
          }
          html += '</div></div>';
        }

        html += '</div>';
        detailEl.innerHTML = html;
      })
      .catch(function () {
        detailEl.innerHTML =
          '<div style="color:' + COLORS.red + ';padding:8px;font-size:12px;">Failed to load detail.</div>';
      });
  }

  // ===========================================================================
  // NPC-QUEST NETWORK TAB
  // ===========================================================================
  function initNetworkTab() {
    var container = document.getElementById('de-tab-network');
    if (!container) return;

    container.innerHTML =
      makeCard('de-network-graph', 'min-height:600px;position:relative;');

    var graphContainer = document.getElementById('de-network-graph');
    if (!graphContainer) return;

    graphContainer.innerHTML =
      makeChartTitle('NPC-Quest Relationship Network') +
      '<div id="de-network-svg-wrap" style="position:relative;">' +
        '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:40px;">Loading network data...</div>' +
      '</div>';

    MapleApp.api('/api/crawled/network')
      .then(function (data) {
        renderNetworkGraph(data);
      })
      .catch(function () {
        var wrap = document.getElementById('de-network-svg-wrap');
        if (wrap) wrap.innerHTML = makeEmptyMessage();
      });
  }

  function renderNetworkGraph(data) {
    var wrap = document.getElementById('de-network-svg-wrap');
    if (!wrap || !data) return;

    var nodes = data.nodes || [];
    var links = data.links || [];

    if (nodes.length === 0) {
      wrap.innerHTML = makeEmptyMessage();
      return;
    }

    wrap.innerHTML = '';

    // Legend
    var legendHtml =
      '<div style="display:flex;gap:20px;justify-content:center;margin-bottom:12px;font-size:12px;color:' +
      COLORS.textMuted + ';">' +
        '<span style="display:inline-flex;align-items:center;gap:4px;">' +
          '<span style="width:12px;height:12px;border-radius:50%;background:' + COLORS.orange + ';display:inline-block;"></span>' +
          'NPC' +
        '</span>' +
        '<span style="display:inline-flex;align-items:center;gap:4px;">' +
          '<span style="width:12px;height:12px;border-radius:50%;background:' + COLORS.blue + ';display:inline-block;"></span>' +
          'Quest' +
        '</span>' +
      '</div>' +
      '<div style="text-align:center;font-size:11px;color:' + COLORS.textMuted + ';margin-bottom:8px;">' +
        'Scroll to zoom, drag to pan. Click and drag nodes to rearrange.' +
      '</div>';

    var legendDiv = document.createElement('div');
    legendDiv.innerHTML = legendHtml;
    wrap.appendChild(legendDiv);

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-network-chart';
    chartDiv.style.position = 'relative';
    wrap.appendChild(chartDiv);

    var graphEl = document.getElementById('de-network-graph');
    var width = getContainerWidth(graphEl);
    var height = 500;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 auto')
      .style('background', COLORS.bg)
      .style('border-radius', '8px');

    // Zoom behavior
    var g = svg.append('g');

    var zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Tooltip
    var tooltip = d3.select(chartDiv)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', COLORS.card)
      .style('border', '1px solid ' + COLORS.cardBorder)
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', COLORS.text)
      .style('opacity', 0)
      .style('z-index', '10');

    // Build node map for link resolution
    var nodeMap = {};
    nodes.forEach(function (n) {
      nodeMap[n.id] = n;
    });

    // Resolve links (handle string IDs)
    var resolvedLinks = links.map(function (l) {
      return {
        source: typeof l.source === 'object' ? l.source : l.source,
        target: typeof l.target === 'object' ? l.target : l.target,
        type: l.type || 'related',
      };
    }).filter(function (l) {
      return nodeMap[l.source] && nodeMap[l.target];
    });

    // Force simulation
    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(resolvedLinks)
        .id(function (d) { return d.id; })
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    // Links
    var link = g.append('g')
      .selectAll('line')
      .data(resolvedLinks)
      .join('line')
      .attr('stroke', COLORS.cardBorder)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Nodes
    var node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', function (d) { return d.type === 'npc' ? 8 : 6; })
      .attr('fill', function (d) { return d.type === 'npc' ? COLORS.orange : COLORS.blue; })
      .attr('stroke', function (d) { return d.type === 'npc' ? COLORS.gold : '#fff'; })
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)
      .style('cursor', 'grab')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('r', d.type === 'npc' ? 11 : 9);
        tooltip
          .style('opacity', 1)
          .html(
            '<strong>' + MapleApp.escapeHtml(d.name || d.id) + '</strong><br>' +
            'Type: ' + MapleApp.escapeHtml(d.type || 'unknown')
          );
      })
      .on('mousemove', function (event) {
        var rect = chartDiv.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 15) + 'px')
          .style('top', (event.clientY - rect.top - 10) + 'px');
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).attr('opacity', 0.9).attr('r', d.type === 'npc' ? 8 : 6);
        tooltip.style('opacity', 0);
      })
      .call(d3.drag()
        .on('start', function (event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function (event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', function (event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          d3.select(this).style('cursor', 'grab');
        })
      );

    // Node labels
    var label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('font-size', '9px')
      .attr('fill', COLORS.textDim)
      .attr('text-anchor', 'middle')
      .attr('dy', function (d) { return d.type === 'npc' ? -12 : -10; })
      .attr('pointer-events', 'none')
      .text(function (d) {
        var name = d.name || String(d.id);
        return name.length > 16 ? name.substring(0, 14) + '...' : name;
      });

    // Tick
    simulation.on('tick', function () {
      link
        .attr('x1', function (d) { return d.source.x; })
        .attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; })
        .attr('y2', function (d) { return d.target.y; });

      node
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });

      label
        .attr('x', function (d) { return d.x; })
        .attr('y', function (d) { return d.y; });
    });
  }

  // ===========================================================================
  // WIKI ENCYCLOPEDIA TAB
  // ===========================================================================
  function initWikiTab() {
    var container = document.getElementById('de-tab-wiki');
    if (!container) return;

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        makeCard('de-wiki-stats', 'grid-column:1/-1;min-height:60px;') +
        makeCard('de-wiki-donut', 'grid-column:1/-1;min-height:350px;') +
        '<div style="grid-column:1/-1;">' +
          makeCard('de-wiki-search', 'min-height:100px;') +
        '</div>' +
        makeCard('de-wiki-list', 'grid-column:1/-1;min-height:200px;') +
      '</div>';

    MapleApp.api('/api/wiki/stats')
      .then(function (data) {
        renderWikiStats(data);
        renderWikiDonutChart(data);
        renderWikiSearch();
        loadWikiList();
      })
      .catch(function () {
        container.innerHTML = makeEmptyMessage();
      });
  }

  // --- Wiki Stats Cards ---
  function renderWikiStats(data) {
    var container = document.getElementById('de-wiki-stats');
    if (!container || !data) return;

    var total = data.total || 0;
    var categories = data.categories || [];
    var categoryCount = categories.length;

    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:40px;">' +
        '<div style="text-align:center;">' +
          '<div style="font-size:28px;font-weight:bold;color:#9B59B6;">' +
            formatNumber(total) +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;">Total Wiki Pages</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<div style="font-size:28px;font-weight:bold;color:' + COLORS.orange + ';">' +
            formatNumber(categoryCount) +
          '</div>' +
          '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;">Categories</div>' +
        '</div>' +
      '</div>';
  }

  // --- Wiki Category Donut Chart ---
  function renderWikiDonutChart(data) {
    var container = document.getElementById('de-wiki-donut');
    if (!container || !data) return;

    var categories = data.categories || [];
    var total = data.total || 0;

    if (categories.length === 0 || total === 0) {
      container.innerHTML = makeChartTitle('Wiki Categories') + makeEmptyMessage();
      return;
    }

    container.innerHTML = makeChartTitle('Wiki Categories Distribution');

    var chartDiv = document.createElement('div');
    chartDiv.id = 'de-wiki-donut-chart';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);

    var width = Math.min(getContainerWidth(container), 400);
    var height = 300;
    var radius = Math.min(width, height) / 2 - 20;

    var svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    var colorScale = d3.scaleOrdinal()
      .range(CHART_PALETTE);

    var pieData = categories.map(function (cat) {
      return {
        label: cat.category || 'Unknown',
        value: cat.count || 0,
      };
    });

    var pie = d3.pie()
      .value(function (d) { return d.value; })
      .sort(null);

    var arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    var arcHover = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius + 8);

    // Tooltip
    var tooltip = d3.select(chartDiv)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', COLORS.card)
      .style('border', '1px solid ' + COLORS.cardBorder)
      .style('border-radius', '8px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', COLORS.text)
      .style('opacity', 0)
      .style('z-index', '10');

    var arcs = svg.selectAll('.arc')
      .data(pie(pieData))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', function (d, i) { return colorScale(i); })
      .attr('opacity', 0.85)
      .attr('stroke', COLORS.bg)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', arcHover).attr('opacity', 1);
        var pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : 0;
        tooltip
          .style('opacity', 1)
          .html(
            '<strong>' + MapleApp.escapeHtml(d.data.label) + '</strong><br>' +
            'Count: ' + formatNumber(d.data.value) + '<br>' +
            'Percentage: ' + pct + '%'
          );
      })
      .on('mousemove', function (event) {
        var rect = chartDiv.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 15) + 'px')
          .style('top', (event.clientY - rect.top - 10) + 'px');
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('d', arc).attr('opacity', 0.85);
        tooltip.style('opacity', 0);
      });

    // Labels on slices
    arcs.append('text')
      .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(function (d) {
        var pct = total > 0 ? ((d.data.value / total) * 100).toFixed(0) : 0;
        return d.data.value > 0 && pct >= 5 ? pct + '%' : '';
      });

    // Center text
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', COLORS.text)
      .attr('font-size', '22px')
      .attr('font-weight', 'bold')
      .text(formatNumber(total));

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', COLORS.textMuted)
      .attr('font-size', '11px')
      .text('Wiki Pages');

    // Legend
    var legendDiv = document.createElement('div');
    legendDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:12px;';
    pieData.forEach(function (d, i) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:12px;color:' + COLORS.textDim + ';';
      span.innerHTML =
        '<span style="width:12px;height:12px;border-radius:3px;background:' + colorScale(i) +
        ';display:inline-block;"></span>' +
        MapleApp.escapeHtml(d.label) + ' (' + formatNumber(d.value) + ')';
      legendDiv.appendChild(span);
    });
    container.appendChild(legendDiv);
  }

  // --- Wiki Search ---
  function renderWikiSearch() {
    var container = document.getElementById('de-wiki-search');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Search Wiki') +
      '<div style="position:relative;">' +
        '<input id="de-wiki-search-input" type="text" placeholder="Search wiki pages..." ' +
          'style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' + COLORS.cardBorder + ';' +
          'background:' + COLORS.bg + ';color:' + COLORS.text + ';font-size:14px;' +
          'box-sizing:border-box;outline:none;" />' +
      '</div>' +
      '<div id="de-wiki-search-results" style="margin-top:12px;max-height:350px;overflow-y:auto;"></div>';

    var input = document.getElementById('de-wiki-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(debounceTimers.wikiSearch);
        if (q.length === 0) {
          document.getElementById('de-wiki-search-results').innerHTML = '';
          return;
        }
        debounceTimers.wikiSearch = setTimeout(function () {
          searchWiki(q);
        }, 300);
      });
    }
  }

  function searchWiki(query) {
    var resultsEl = document.getElementById('de-wiki-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML =
      '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Searching...</div>';

    MapleApp.api('/api/wiki/search?q=' + encodeURIComponent(query))
      .then(function (data) {
        var pages = data.results || [];
        if (pages.length === 0) {
          resultsEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">' +
            'No wiki pages found for "' + MapleApp.escapeHtml(query) + '"</div>';
          return;
        }
        renderWikiSearchResults(pages, resultsEl);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<div style="text-align:center;color:' + COLORS.red + ';padding:12px;">Search failed.</div>';
      });
  }

  function renderWikiSearchResults(pages, container) {
    var html = pages.map(function (page) {
      return buildWikiRow(page);
    }).join('');
    container.innerHTML = html;
  }

  function buildWikiRow(page) {
    var title = page.title || 'Unknown';
    var category = page.category || '';
    var extract = page.extract || '';
    var pageUrl = page.page_url || '';

    if (extract.length > 200) {
      extract = extract.substring(0, 200) + '...';
    }

    return (
      '<div style="padding:10px 14px;border-bottom:1px solid ' + COLORS.cardBorder + ';' +
      'transition:background 0.15s;" ' +
      'onmouseenter="this.style.background=\'' + COLORS.bg + '\'" ' +
      'onmouseleave="this.style.background=\'transparent\'">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;color:' + COLORS.text + ';font-weight:bold;">' +
              MapleApp.escapeHtml(title) +
              (category
                ? ' <span style="background:rgba(155,89,182,0.2);color:#9B59B6;padding:1px 8px;' +
                  'border-radius:4px;font-size:10px;font-weight:600;margin-left:6px;">' +
                  MapleApp.escapeHtml(category) + '</span>'
                : '') +
            '</div>' +
            (extract
              ? '<div style="font-size:12px;color:' + COLORS.textMuted + ';margin-top:4px;line-height:1.4;">' +
                  MapleApp.escapeHtml(extract) +
                '</div>'
              : '') +
          '</div>' +
          (pageUrl
            ? '<div style="flex-shrink:0;margin-left:12px;">' +
                '<a href="' + MapleApp.escapeHtml(pageUrl) + '" target="_blank" rel="noopener noreferrer" ' +
                  'style="font-size:11px;color:#9B59B6;text-decoration:none;" ' +
                  'onmouseenter="this.style.textDecoration=\'underline\'" ' +
                  'onmouseleave="this.style.textDecoration=\'none\'">' +
                  'Wiki &#x2197;' +
                '</a>' +
              '</div>'
            : '') +
        '</div>' +
      '</div>'
    );
  }

  // --- Wiki List ---
  function loadWikiList() {
    var container = document.getElementById('de-wiki-list');
    if (!container) return;

    container.innerHTML =
      makeChartTitle('Wiki Pages') +
      '<div id="de-wiki-list-content" style="max-height:450px;overflow-y:auto;">' +
        '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">Loading wiki pages...</div>' +
      '</div>';

    MapleApp.api('/api/wiki/pages?limit=50')
      .then(function (data) {
        var pages = data.pages || [];
        var listEl = document.getElementById('de-wiki-list-content');
        if (!listEl) return;

        if (pages.length === 0) {
          listEl.innerHTML =
            '<div style="text-align:center;color:' + COLORS.textMuted + ';padding:12px;">No wiki pages found.</div>';
          return;
        }

        var html = pages.map(function (page) {
          return buildWikiRow(page);
        }).join('');
        listEl.innerHTML = html;
      })
      .catch(function () {
        var listEl = document.getElementById('de-wiki-list-content');
        if (listEl) listEl.innerHTML = makeEmptyMessage();
      });
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================
  function init() {
    var panel = getPanel();
    if (!panel) {
      console.error('DataExplorer: #panel-data-explorer not found');
      return;
    }
    buildUI();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return { init: init };
})();
