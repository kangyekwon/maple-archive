/**
 * MapleStory Archive - Stats Dashboard
 * D3.js multi-chart dashboard with MapleStory color theme.
 * Rendered inside #panel-stats-dashboard.
 */
window.StatsDashboard = (function () {
  'use strict';

  // MapleStory theme colors
  var THEME = {
    orange: '#f97316',
    blue: '#3b82f6',
    gold: '#eab308',
    green: '#22c55e',
    red: '#ef4444',
    purple: '#a855f7',
    cyan: '#06b6d4',
    pink: '#ec4899',
    teal: '#14b8a6',
    amber: '#f59e0b'
  };

  var PALETTE = [
    THEME.orange, THEME.blue, THEME.gold, THEME.green, THEME.red,
    THEME.purple, THEME.cyan, THEME.pink, THEME.teal, THEME.amber
  ];

  function init() {
    var panel = document.getElementById('panel-stats-dashboard');
    if (!panel) {
      console.error('StatsDashboard: #panel-stats-dashboard not found');
      return;
    }

    // Build dashboard grid layout
    panel.innerHTML =
      '<div class="stats-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:8px;">' +
        '<div id="chart-entity-counts" style="grid-column:1/-1;"></div>' +
        '<div id="chart-faction-dist"></div>' +
        '<div id="chart-job-dist"></div>' +
        '<div id="chart-boss-diff"></div>' +
        '<div id="chart-world-dist"></div>' +
      '</div>';

    // Fetch all stats in parallel
    Promise.all([
      _fetchJSON('/api/stats/faction-distribution'),
      _fetchJSON('/api/stats/job-distribution'),
      _fetchJSON('/api/stats/boss-difficulty'),
      _fetchJSON('/api/stats/world-distribution'),
      _fetchJSON('/api/stats/entity-counts')
    ])
    .then(function (results) {
      _renderEntityCounts(results[4]);
      _renderFactionDonut(results[0]);
      _renderJobBars(results[1]);
      _renderBossDifficulty(results[2]);
      _renderWorldPie(results[3]);
    })
    .catch(function (err) {
      console.error('StatsDashboard: failed to fetch stats', err);
      panel.innerHTML = '<div style="padding:40px;text-align:center;color:#f87171;">Failed to load stats data.</div>';
    });
  }

  // -------------------------------------------------------
  // Chart 5: Entity Counts Summary Cards
  // -------------------------------------------------------
  function _renderEntityCounts(data) {
    var container = document.getElementById('chart-entity-counts');
    if (!container || !data) return;

    var entries = data.counts || data;
    var keys = Object.keys(entries);

    var html = '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">';
    keys.forEach(function (key, idx) {
      var color = PALETTE[idx % PALETTE.length];
      var label = key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      html +=
        '<div style="background:#1e293b;border-radius:10px;padding:16px 24px;' +
        'min-width:140px;text-align:center;border:1px solid rgba(255,255,255,0.08);">' +
          '<div style="font-size:28px;font-weight:bold;color:' + color + ';">' + entries[key] + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + label + '</div>' +
        '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // -------------------------------------------------------
  // Chart 1: Faction Distribution (Donut Chart)
  // -------------------------------------------------------
  function _renderFactionDonut(data) {
    var container = document.getElementById('chart-faction-dist');
    if (!container) return;

    var items = _normalizeData(data);
    if (items.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;">No faction data</p>';
      return;
    }

    _addChartTitle(container, 'Faction Distribution');

    var size = 280;
    var radius = size / 2;
    var innerRadius = radius * 0.55;

    var svg = d3.select(container)
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + radius + ',' + radius + ')');

    var pie = d3.pie()
      .value(function (d) { return d.value; })
      .sort(null);

    var arc = d3.arc().innerRadius(innerRadius).outerRadius(radius - 4);
    var arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius);

    var color = d3.scaleOrdinal().range(PALETTE);

    var arcs = svg.selectAll('.arc')
      .data(pie(items))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', function (d, i) { return color(i); })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', arcHover);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', arc);
      });

    // Labels
    arcs.append('text')
      .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(function (d) {
        var pct = ((d.data.value / d3.sum(items, function (i) { return i.value; })) * 100).toFixed(0);
        return pct > 5 ? d.data.label : '';
      });

    // Legend
    _addLegend(container, items, color);
  }

  // -------------------------------------------------------
  // Chart 2: Job Branch Distribution (Bar Chart)
  // -------------------------------------------------------
  function _renderJobBars(data) {
    var container = document.getElementById('chart-job-dist');
    if (!container) return;

    var items = _normalizeData(data);
    if (items.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;">No job data</p>';
      return;
    }

    _addChartTitle(container, 'Job Branch Distribution');

    var margin = { top: 10, right: 20, bottom: 40, left: 100 };
    var w = 360 - margin.left - margin.right;
    var h = Math.max(items.length * 32, 120);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear()
      .domain([0, d3.max(items, function (d) { return d.value; }) || 1])
      .range([0, w]);

    var yScale = d3.scaleBand()
      .domain(items.map(function (d) { return d.label; }))
      .range([0, h])
      .padding(0.25);

    var color = d3.scaleOrdinal().range(PALETTE);

    // Bars
    svg.selectAll('.bar')
      .data(items)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', function (d) { return yScale(d.label); })
      .attr('width', function (d) { return xScale(d.value); })
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', function (d, i) { return color(i); })
      .attr('opacity', 0.85);

    // Value labels
    svg.selectAll('.bar-label')
      .data(items)
      .join('text')
      .attr('x', function (d) { return xScale(d.value) + 6; })
      .attr('y', function (d) { return yScale(d.label) + yScale.bandwidth() / 2 + 4; })
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .text(function (d) { return d.value; });

    // Y axis labels
    svg.append('g')
      .selectAll('text')
      .data(items)
      .join('text')
      .attr('x', -8)
      .attr('y', function (d) { return yScale(d.label) + yScale.bandwidth() / 2 + 4; })
      .attr('text-anchor', 'end')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '11px')
      .text(function (d) { return d.label; });
  }

  // -------------------------------------------------------
  // Chart 3: Boss Difficulty Distribution (Horizontal Bar)
  // -------------------------------------------------------
  function _renderBossDifficulty(data) {
    var container = document.getElementById('chart-boss-diff');
    if (!container) return;

    var items = _normalizeData(data);
    if (items.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;">No boss data</p>';
      return;
    }

    _addChartTitle(container, 'Boss Difficulty Distribution');

    // Difficulty color scale
    var difficultyColors = {
      'Easy': '#22c55e',
      'Normal': '#3b82f6',
      'Hard': '#f97316',
      'Chaos': '#ef4444',
      'Extreme': '#a855f7',
      'Hell': '#dc2626'
    };

    var margin = { top: 10, right: 20, bottom: 40, left: 80 };
    var w = 360 - margin.left - margin.right;
    var h = Math.max(items.length * 36, 120);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xScale = d3.scaleLinear()
      .domain([0, d3.max(items, function (d) { return d.value; }) || 1])
      .range([0, w]);

    var yScale = d3.scaleBand()
      .domain(items.map(function (d) { return d.label; }))
      .range([0, h])
      .padding(0.3);

    // Bars
    svg.selectAll('.bar')
      .data(items)
      .join('rect')
      .attr('x', 0)
      .attr('y', function (d) { return yScale(d.label); })
      .attr('width', function (d) { return xScale(d.value); })
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', function (d) { return difficultyColors[d.label] || THEME.orange; })
      .attr('opacity', 0.85);

    // Value labels
    svg.selectAll('.val-label')
      .data(items)
      .join('text')
      .attr('x', function (d) { return xScale(d.value) + 6; })
      .attr('y', function (d) { return yScale(d.label) + yScale.bandwidth() / 2 + 4; })
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .text(function (d) { return d.value; });

    // Y axis labels
    svg.append('g')
      .selectAll('text')
      .data(items)
      .join('text')
      .attr('x', -8)
      .attr('y', function (d) { return yScale(d.label) + yScale.bandwidth() / 2 + 4; })
      .attr('text-anchor', 'end')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(function (d) { return d.label; });
  }

  // -------------------------------------------------------
  // Chart 4: World Distribution (Pie Chart)
  // -------------------------------------------------------
  function _renderWorldPie(data) {
    var container = document.getElementById('chart-world-dist');
    if (!container) return;

    var items = _normalizeData(data);
    if (items.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;">No world data</p>';
      return;
    }

    _addChartTitle(container, 'World Distribution');

    var size = 280;
    var radius = size / 2;

    var svg = d3.select(container)
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', 'translate(' + radius + ',' + radius + ')');

    var pie = d3.pie()
      .value(function (d) { return d.value; })
      .sort(null);

    var arc = d3.arc().innerRadius(0).outerRadius(radius - 8);
    var arcHover = d3.arc().innerRadius(0).outerRadius(radius - 2);

    var color = d3.scaleOrdinal().range(PALETTE);

    var arcs = svg.selectAll('.arc')
      .data(pie(items))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', function (d, i) { return color(i); })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).transition().duration(150).attr('d', arcHover);
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('d', arc);
      });

    // Labels
    var labelArc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius * 0.55);
    arcs.append('text')
      .attr('transform', function (d) { return 'translate(' + labelArc.centroid(d) + ')'; })
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(function (d) {
        var total = d3.sum(items, function (i) { return i.value; });
        var pct = ((d.data.value / total) * 100).toFixed(0);
        return pct > 5 ? d.data.label : '';
      });

    // Legend
    _addLegend(container, items, color);
  }

  // -------------------------------------------------------
  // Shared Utilities
  // -------------------------------------------------------

  function _fetchJSON(url) {
    return fetch(url).then(function (res) { return res.json(); });
  }

  /**
   * Normalize various API response shapes into [{label, value}].
   */
  function _normalizeData(data) {
    if (!data) return [];

    // If array of {label, value} or {name, count}
    if (Array.isArray(data)) {
      return data.map(function (d) {
        return {
          label: d.label || d.name || d.key || 'Unknown',
          value: d.value || d.count || d.total || 0
        };
      });
    }

    // If data has a "distribution" or "data" or "items" property
    var arr = data.distribution || data.data || data.items;
    if (arr) {
      // If it's an array of objects
      if (Array.isArray(arr)) {
        return arr.map(function (d) {
          return {
            label: d.label || d.name || d.key || 'Unknown',
            value: d.value || d.count || d.total || 0
          };
        });
      }
      // If it's an object {key: number} (e.g. {distribution: {faction_name: count}})
      if (typeof arr === 'object') {
        return Object.keys(arr).map(function (key) {
          return { label: key, value: arr[key] };
        }).filter(function (d) { return typeof d.value === 'number'; });
      }
    }

    // If plain object {key: number}
    if (typeof data === 'object') {
      return Object.keys(data).map(function (key) {
        return { label: key, value: data[key] };
      }).filter(function (d) { return typeof d.value === 'number'; });
    }

    return [];
  }

  function _addChartTitle(container, title) {
    var h3 = document.createElement('h3');
    h3.style.cssText = 'color:#e2e8f0;font-size:15px;text-align:center;margin:8px 0 12px;';
    h3.textContent = title;
    container.appendChild(h3);
  }

  function _addLegend(container, items, colorScale) {
    var legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px;';

    items.forEach(function (item, idx) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;';
      span.innerHTML =
        '<span style="width:10px;height:10px;border-radius:2px;background:' +
        colorScale(idx) + ';display:inline-block;"></span>' + item.label;
      legend.appendChild(span);
    });

    container.appendChild(legend);
  }

  function _showError(container, message) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:40px;text-align:center;color:#f87171;font-size:15px;';
    el.textContent = message;
    container.appendChild(el);
  }

  return { init: init };
})();
