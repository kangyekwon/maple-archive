/**
 * MapleStory Archive - Story Timeline
 * D3.js horizontal timeline grouped by era.
 * Rendered inside #panel-story-timeline.
 */
window.StoryTimeline = (function () {
  'use strict';

  // Era color mapping
  var ERA_COLORS = {
    ancient: '#8b5cf6',
    age_of_heroes: '#4ade80',
    modern: '#60a5fa',
    arcane_era: '#ff9500',
    tenebris_era: '#f87171',
    grandis_era: '#fbbf24'
  };

  var ERA_LABELS = {
    ancient: 'Ancient',
    age_of_heroes: 'Age of Heroes',
    modern: 'Modern',
    arcane_era: 'Arcane Era',
    tenebris_era: 'Tenebris Era',
    grandis_era: 'Grandis Era'
  };

  var svg, g, container, detailPanel;
  var width, height, margin;

  function init() {
    var panel = document.getElementById('panel-story-timeline');
    if (!panel) {
      console.error('StoryTimeline: #panel-story-timeline not found');
      return;
    }

    // Create viz container
    container = document.createElement('div');
    container.className = 'viz-container';
    container.style.height = '600px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    panel.appendChild(container);

    // Create detail panel below timeline
    detailPanel = document.createElement('div');
    detailPanel.className = 'timeline-detail-panel';
    detailPanel.style.cssText =
      'padding:16px 20px;background:#1e293b;border-radius:8px;margin-top:8px;' +
      'color:#e2e8f0;display:none;border:1px solid rgba(255,255,255,0.1);';
    panel.appendChild(detailPanel);

    margin = { top: 40, right: 40, bottom: 120, left: 40 };
    width = (container.clientWidth || 1200) - margin.left - margin.right;
    height = 600 - margin.top - margin.bottom;

    svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', 600)
      .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom]);

    g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Zoom support (horizontal scroll/zoom)
    var zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .translateExtent([[-100, -100], [width + 200, height + 200]])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });
    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    // Fetch data
    fetch('/api/story/timeline')
      .then(function (res) { return res.json(); })
      .then(function (data) { _render(data); })
      .catch(function (err) {
        console.error('StoryTimeline: failed to fetch data', err);
        _showError(container, 'Failed to load story timeline data.');
      });
  }

  function _render(data) {
    var events = data.events || [];
    var arcs = data.arcs || [];
    var eras = data.eras || Object.keys(ERA_COLORS);

    // Sort events by order/date
    events.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    // X scale: event index (or timeline position)
    var xScale = d3.scaleLinear()
      .domain([0, events.length - 1 || 1])
      .range([0, width]);

    // Group events by era and compute era sections
    var eraGroups = {};
    eras.forEach(function (era) { eraGroups[era] = []; });
    events.forEach(function (evt, idx) {
      evt._index = idx;
      var era = evt.era || 'modern';
      if (!eraGroups[era]) eraGroups[era] = [];
      eraGroups[era].push(evt);
    });

    // Draw era background sections
    var eraY = 0;
    var eraHeight = 120;
    var currentX = 0;

    eras.forEach(function (era) {
      var group = eraGroups[era];
      if (!group || group.length === 0) return;

      var startIdx = group[0]._index;
      var endIdx = group[group.length - 1]._index;
      var x1 = xScale(startIdx) - 20;
      var x2 = xScale(endIdx) + 20;

      // Era background band
      g.append('rect')
        .attr('x', x1)
        .attr('y', eraY)
        .attr('width', Math.max(x2 - x1, 40))
        .attr('height', eraHeight)
        .attr('rx', 8)
        .attr('fill', ERA_COLORS[era] || '#64748b')
        .attr('opacity', 0.12);

      // Era label
      g.append('text')
        .attr('x', (x1 + x2) / 2)
        .attr('y', eraY + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', ERA_COLORS[era] || '#64748b')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .text(ERA_LABELS[era] || era);
    });

    // Draw timeline axis line
    var timelineY = eraY + eraHeight / 2 + 10;
    g.append('line')
      .attr('x1', xScale(0) - 10)
      .attr('y1', timelineY)
      .attr('x2', xScale(events.length - 1 || 0) + 10)
      .attr('y2', timelineY)
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    // Draw event dots
    var eventGroup = g.selectAll('.event-dot')
      .data(events)
      .join('g')
      .attr('class', 'event-dot')
      .attr('transform', function (d) {
        return 'translate(' + xScale(d._index) + ',' + timelineY + ')';
      })
      .style('cursor', 'pointer');

    eventGroup.append('circle')
      .attr('r', 7)
      .attr('fill', function (d) { return ERA_COLORS[d.era] || '#64748b'; })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Event labels (alternating above/below)
    eventGroup.append('text')
      .attr('dy', function (d, i) { return i % 2 === 0 ? -16 : 22; })
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .text(function (d) {
        var label = d.name_ko || d.name || '';
        return label.length > 12 ? label.substring(0, 12) + '...' : label;
      });

    // Click event to show detail
    eventGroup.on('click', function (event, d) {
      event.stopPropagation();
      _showEventDetail(d);

      // Highlight selected
      eventGroup.selectAll('circle')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      d3.select(this).select('circle')
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 3);
    });

    // Draw story arcs as horizontal bars below events
    if (arcs.length > 0) {
      var arcY = timelineY + 50;
      var arcHeight = 12;
      var arcSpacing = 20;

      arcs.forEach(function (arc, idx) {
        var startEvt = events.find(function (e) { return e.id === arc.start_event_id; });
        var endEvt = events.find(function (e) { return e.id === arc.end_event_id; });

        if (!startEvt || !endEvt) return;

        var x1 = xScale(startEvt._index);
        var x2 = xScale(endEvt._index);
        var y = arcY + idx * arcSpacing;
        var color = ERA_COLORS[arc.era] || '#64748b';

        // Arc bar
        g.append('rect')
          .attr('x', x1)
          .attr('y', y)
          .attr('width', Math.max(x2 - x1, 4))
          .attr('height', arcHeight)
          .attr('rx', 4)
          .attr('fill', color)
          .attr('opacity', 0.5)
          .style('cursor', 'pointer')
          .on('click', function () { _showArcDetail(arc); });

        // Arc label
        g.append('text')
          .attr('x', (x1 + x2) / 2)
          .attr('y', y + arcHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#e2e8f0')
          .attr('font-size', '9px')
          .text(arc.name_ko || arc.name || '');
      });
    }

    // Era legend at bottom
    _buildEraLegend(g, eras, width, height);
  }

  function _buildEraLegend(g, eras, w, h) {
    var legendGroup = g.append('g')
      .attr('transform', 'translate(0,' + (h - 20) + ')');

    var xOffset = 0;
    eras.forEach(function (era) {
      if (!ERA_COLORS[era]) return;

      legendGroup.append('rect')
        .attr('x', xOffset)
        .attr('y', 0)
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 3)
        .attr('fill', ERA_COLORS[era]);

      legendGroup.append('text')
        .attr('x', xOffset + 20)
        .attr('y', 11)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '11px')
        .text(ERA_LABELS[era] || era);

      xOffset += 20 + (ERA_LABELS[era] || era).length * 7 + 16;
    });
  }

  function _showEventDetail(evt) {
    detailPanel.style.display = 'block';
    var eraColor = ERA_COLORS[evt.era] || '#64748b';
    detailPanel.innerHTML =
      '<h3 style="margin:0 0 8px;color:' + eraColor + '">' +
        (evt.name_ko || evt.name || 'Unknown Event') +
      '</h3>' +
      (evt.name_en ? '<p style="margin:0 0 8px;color:#94a3b8">' + evt.name_en + '</p>' : '') +
      '<p><strong>Era:</strong> ' + (ERA_LABELS[evt.era] || evt.era || 'N/A') + '</p>' +
      (evt.date ? '<p><strong>Date:</strong> ' + evt.date + '</p>' : '') +
      (evt.location ? '<p><strong>Location:</strong> ' + evt.location + '</p>' : '') +
      (evt.description ? '<p style="margin-top:8px;color:#94a3b8">' + evt.description + '</p>' : '') +
      (evt.characters && evt.characters.length > 0
        ? '<p style="margin-top:8px;"><strong>Characters:</strong> ' + evt.characters.join(', ') + '</p>'
        : '');
  }

  function _showArcDetail(arc) {
    detailPanel.style.display = 'block';
    var eraColor = ERA_COLORS[arc.era] || '#64748b';
    detailPanel.innerHTML =
      '<h3 style="margin:0 0 8px;color:' + eraColor + '">Story Arc: ' +
        (arc.name_ko || arc.name || 'Unknown Arc') +
      '</h3>' +
      (arc.description ? '<p style="color:#94a3b8">' + arc.description + '</p>' : '') +
      (arc.era ? '<p><strong>Era:</strong> ' + (ERA_LABELS[arc.era] || arc.era) + '</p>' : '');
  }

  function _showError(container, message) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:40px;text-align:center;color:#f87171;font-size:15px;';
    el.textContent = message;
    container.appendChild(el);
  }

  return { init: init };
})();
