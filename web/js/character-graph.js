/**
 * MapleStory Archive - Character Relationship Graph
 * D3.js force-directed graph showing character relationships.
 * Rendered inside #panel-character-graph.
 */
window.CharacterGraph = (function () {
  'use strict';

  // Role color mapping
  const ROLE_COLORS = {
    hero: '#4ade80',
    commander: '#ef4444',
    npc: '#60a5fa',
    transcendent: '#a78bfa',
    villain: '#f87171',
    ally: '#34d399',
    default: '#94a3b8'
  };

  // Link color mapping by relationship type
  const LINK_COLORS = {
    ally: '#4ade80',
    enemy: '#ef4444',
    family: '#fbbf24',
    mentor: '#60a5fa',
    rival: '#f97316',
    servant: '#a78bfa',
    default: '#64748b'
  };

  let svg, simulation, tooltip, container;
  let width, height;

  function init() {
    const panel = document.getElementById('panel-character-graph');
    if (!panel) {
      console.error('CharacterGraph: #panel-character-graph not found');
      return;
    }

    // Create viz container
    container = document.createElement('div');
    container.className = 'viz-container';
    container.style.height = '600px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    panel.appendChild(container);

    // Create tooltip
    tooltip = d3.select(container)
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', '#fff')
      .style('padding', '10px 14px')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 100)
      .style('border', '1px solid rgba(255,255,255,0.15)')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.4)');

    // Measure container
    width = container.clientWidth || 900;
    height = 600;

    // Create SVG
    svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom support
    const zoomGroup = svg.append('g').attr('class', 'zoom-layer');
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Add legend
    _buildLegend(svg);

    // Fetch data
    fetch('/api/characters/graph')
      .then((res) => res.json())
      .then((data) => _render(zoomGroup, data))
      .catch((err) => {
        console.error('CharacterGraph: failed to fetch data', err);
        _showError(container, 'Failed to load character graph data.');
      });
  }

  function _render(g, data) {
    const nodes = data.nodes || [];
    const links = (data.links || []).map(l => ({
      source: l.character_a_id,
      target: l.character_b_id,
      type: l.relationship_type,
      description: l.description,
      strength: l.strength,
    }));

    // Power level mapping (string -> number) and scale for node radius
    const POWER_MAP = { mortal: 1, elite: 3, legendary: 7, god: 10 };
    const getPower = (d) => {
      if (typeof d.power_level === 'number') return d.power_level || 1;
      return POWER_MAP[d.power_level] || 1;
    };
    const radiusScale = d3.scaleSqrt()
      .domain([1, 10])
      .range([6, 28]);

    // Build simulation
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => radiusScale(getPower(d)) + 4));

    // Draw links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => LINK_COLORS[d.type] || LINK_COLORS.default)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d) => d.type === 'enemy' ? '6,3' : null);

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(_drag(simulation));

    // Node circles
    node.append('circle')
      .attr('r', (d) => radiusScale(getPower(d)))
      .attr('fill', (d) => ROLE_COLORS[d.role] || ROLE_COLORS.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9);

    // Node labels
    node.append('text')
      .text((d) => d.name_ko || d.name || '')
      .attr('dy', (d) => radiusScale(getPower(d)) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '11px')
      .attr('pointer-events', 'none');

    // Hover events
    node.on('mouseenter', function (event, d) {
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 3);

      const roleLabel = d.role ? d.role.charAt(0).toUpperCase() + d.role.slice(1) : 'Unknown';
      tooltip
        .html(
          '<strong>' + (d.name_ko || d.name || 'Unknown') + '</strong>' +
          (d.name_en ? '<br><span style="color:#94a3b8">' + d.name_en + '</span>' : '') +
          '<br>Role: ' + roleLabel +
          (d.faction ? '<br>Faction: ' + d.faction : '') +
          (d.power_level ? '<br>Power: ' + d.power_level : '')
        )
        .style('left', (event.offsetX + 15) + 'px')
        .style('top', (event.offsetY - 10) + 'px')
        .transition().duration(150)
        .style('opacity', 1);
    })
    .on('mousemove', function (event) {
      tooltip
        .style('left', (event.offsetX + 15) + 'px')
        .style('top', (event.offsetY - 10) + 'px');
    })
    .on('mouseleave', function () {
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      tooltip.transition().duration(200).style('opacity', 0);
    });

    // Click shows detail modal
    node.on('click', function (event, d) {
      event.stopPropagation();
      _showCharacterModal(d);
    });

    // Tick update
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');
    });
  }

  function _drag(sim) {
    function dragStarted(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragEnded(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded);
  }

  function _buildLegend(svgEl) {
    const legendData = [
      { label: 'Hero', color: ROLE_COLORS.hero },
      { label: 'Commander', color: ROLE_COLORS.commander },
      { label: 'NPC', color: ROLE_COLORS.npc },
      { label: 'Transcendent', color: ROLE_COLORS.transcendent }
    ];

    const legend = svgEl.append('g')
      .attr('class', 'legend')
      .attr('transform', 'translate(16, 16)');

    // Background
    legend.append('rect')
      .attr('width', 140)
      .attr('height', legendData.length * 24 + 12)
      .attr('rx', 6)
      .attr('fill', 'rgba(0,0,0,0.5)')
      .attr('stroke', 'rgba(255,255,255,0.1)');

    const items = legend.selectAll('.legend-item')
      .data(legendData)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => 'translate(12,' + (10 + i * 24) + ')');

    items.append('circle')
      .attr('r', 6)
      .attr('cx', 6)
      .attr('cy', 6)
      .attr('fill', (d) => d.color);

    items.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .text((d) => d.label);
  }

  function _showCharacterModal(character) {
    // Remove existing modal
    const existing = document.getElementById('character-detail-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'character-detail-modal';
    modal.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.7);display:flex;align-items:center;' +
      'justify-content:center;z-index:9999;';

    const roleColor = ROLE_COLORS[character.role] || ROLE_COLORS.default;
    const card = document.createElement('div');
    card.style.cssText =
      'background:#1e293b;border-radius:12px;padding:32px;max-width:420px;' +
      'width:90%;color:#e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,0.5);' +
      'border:1px solid rgba(255,255,255,0.1);';
    card.innerHTML =
      '<h2 style="margin:0 0 8px;color:' + roleColor + '">' +
        (character.name_ko || character.name || 'Unknown') +
      '</h2>' +
      (character.name_en ? '<p style="margin:0 0 16px;color:#94a3b8">' + character.name_en + '</p>' : '') +
      '<p><strong>Role:</strong> ' + (character.role || 'N/A') + '</p>' +
      (character.faction ? '<p><strong>Faction:</strong> ' + character.faction + '</p>' : '') +
      (character.power_level ? '<p><strong>Power Level:</strong> ' + character.power_level + '</p>' : '') +
      (character.description ? '<p style="margin-top:12px;color:#94a3b8">' + character.description + '</p>' : '') +
      '<button id="close-char-modal" style="margin-top:20px;padding:8px 20px;' +
        'background:' + roleColor + ';border:none;border-radius:6px;color:#fff;' +
        'cursor:pointer;font-size:14px;">Close</button>';

    modal.appendChild(card);
    document.body.appendChild(modal);

    document.getElementById('close-char-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function _showError(container, message) {
    const el = document.createElement('div');
    el.style.cssText = 'padding:40px;text-align:center;color:#f87171;font-size:15px;';
    el.textContent = message;
    container.appendChild(el);
  }

  return { init: init };
})();
