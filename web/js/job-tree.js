/**
 * MapleStory Archive - Job Advancement Tree
 * D3.js collapsible horizontal tree showing job hierarchy.
 * Rendered inside #panel-job-tree.
 */
window.JobTree = (function () {
  'use strict';

  // Class type color mapping
  const CLASS_COLORS = {
    warrior: '#ef4444',
    magician: '#3b82f6',
    bowman: '#22c55e',
    thief: '#a855f7',
    pirate: '#eab308',
    default: '#94a3b8'
  };

  let svg, root, treeLayout, g;
  let width, height, margin;
  let i = 0; // node id counter

  function init() {
    const panel = document.getElementById('panel-job-tree');
    if (!panel) {
      console.error('JobTree: #panel-job-tree not found');
      return;
    }

    // Create viz container
    const container = document.createElement('div');
    container.className = 'viz-container';
    container.style.height = '600px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    panel.appendChild(container);

    margin = { top: 30, right: 200, bottom: 30, left: 120 };
    width = (container.clientWidth || 1200) - margin.left - margin.right;
    height = 600 - margin.top - margin.bottom;

    svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', 600)
      .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom]);

    // Zoom support
    g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    treeLayout = d3.tree().size([height, width]);

    // Fetch data
    fetch('/api/jobs/tree')
      .then((res) => res.json())
      .then((data) => {
        root = d3.hierarchy(data);
        root.x0 = height / 2;
        root.y0 = 0;

        // Collapse children by default (show only branches)
        if (root.children) {
          root.children.forEach(_collapse);
        }

        _update(root);
      })
      .catch((err) => {
        console.error('JobTree: failed to fetch data', err);
        _showError(container, 'Failed to load job tree data.');
      });
  }

  function _collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(_collapse);
      d.children = null;
    }
  }

  function _update(source) {
    var duration = 400;

    // Compute new tree layout
    var treeData = treeLayout(root);
    var nodes = treeData.descendants();
    var links = treeData.links();

    // Normalize depth spacing
    nodes.forEach(function (d) {
      d.y = d.depth * 220;
    });

    // --- NODES ---
    var node = g.selectAll('g.node')
      .data(nodes, function (d) { return d.id || (d.id = ++i); });

    // Enter new nodes at source position
    var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', function () {
        return 'translate(' + source.y0 + ',' + source.x0 + ')';
      })
      .style('cursor', 'pointer')
      .on('click', _onNodeClick);

    // Node circle
    nodeEnter.append('circle')
      .attr('r', 1e-6)
      .attr('fill', function (d) {
        return d._children ? _getColor(d) : '#1e293b';
      })
      .attr('stroke', function (d) { return _getColor(d); })
      .attr('stroke-width', 2.5);

    // Node label
    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', function (d) { return d.children || d._children ? -14 : 14; })
      .attr('text-anchor', function (d) { return d.children || d._children ? 'end' : 'start'; })
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .text(function (d) { return d.data.name_ko || d.data.name || ''; });

    // Merge enter + update
    var nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition().duration(duration)
      .attr('transform', function (d) { return 'translate(' + d.y + ',' + d.x + ')'; });

    nodeUpdate.select('circle')
      .attr('r', function (d) {
        if (d.depth === 0) return 10;
        if (d.depth === 1) return 8;
        return 6;
      })
      .attr('fill', function (d) {
        return d._children ? _getColor(d) : '#1e293b';
      })
      .attr('stroke', function (d) { return _getColor(d); });

    // Remove exiting nodes
    var nodeExit = node.exit().transition().duration(duration)
      .attr('transform', function () {
        return 'translate(' + source.y + ',' + source.x + ')';
      })
      .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    // --- LINKS ---
    var link = g.selectAll('path.link')
      .data(links, function (d) { return d.target.id; });

    // Enter links at source position
    var linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148,163,184,0.3)')
      .attr('stroke-width', 1.5)
      .attr('d', function () {
        var o = { x: source.x0, y: source.y0 };
        return _diagonal(o, o);
      });

    var linkUpdate = linkEnter.merge(link);

    linkUpdate.transition().duration(duration)
      .attr('d', function (d) { return _diagonal(d.source, d.target); });

    link.exit().transition().duration(duration)
      .attr('d', function () {
        var o = { x: source.x, y: source.y };
        return _diagonal(o, o);
      })
      .remove();

    // Store old positions
    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  function _diagonal(s, d) {
    return 'M ' + s.y + ' ' + s.x +
      ' C ' + ((s.y + d.y) / 2) + ' ' + s.x +
      ', ' + ((s.y + d.y) / 2) + ' ' + d.x +
      ', ' + d.y + ' ' + d.x;
  }

  function _onNodeClick(event, d) {
    // Toggle children
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }

    _update(d);

    // If leaf node (job), show detail modal
    if (!d.children && !d._children && d.data.job_id) {
      _showJobModal(d.data);
    }
  }

  function _getColor(d) {
    // Walk up to find class_type
    var current = d;
    while (current) {
      if (current.data.class_type) {
        return CLASS_COLORS[current.data.class_type] || CLASS_COLORS.default;
      }
      current = current.parent;
    }
    return CLASS_COLORS.default;
  }

  function _showJobModal(job) {
    var existing = document.getElementById('job-detail-modal');
    if (existing) existing.remove();

    var color = CLASS_COLORS[job.class_type] || CLASS_COLORS.default;

    var modal = document.createElement('div');
    modal.id = 'job-detail-modal';
    modal.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.7);display:flex;align-items:center;' +
      'justify-content:center;z-index:9999;';

    var skillsHtml = '';
    if (job.skills && job.skills.length > 0) {
      skillsHtml = '<div style="margin-top:12px;"><strong>Skills:</strong><ul style="margin:6px 0 0 16px;padding:0;">';
      job.skills.forEach(function (s) {
        var skillName = typeof s === 'string' ? s : (s.name_ko || s.name || '');
        skillsHtml += '<li style="margin:2px 0;color:#cbd5e1;">' + skillName + '</li>';
      });
      skillsHtml += '</ul></div>';
    }

    var card = document.createElement('div');
    card.style.cssText =
      'background:#1e293b;border-radius:12px;padding:32px;max-width:420px;' +
      'width:90%;color:#e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,0.5);' +
      'border:1px solid rgba(255,255,255,0.1);max-height:80vh;overflow-y:auto;';
    card.innerHTML =
      '<h2 style="margin:0 0 8px;color:' + color + '">' +
        (job.name_ko || job.name || 'Unknown Job') +
      '</h2>' +
      (job.name_en ? '<p style="margin:0 0 12px;color:#94a3b8">' + job.name_en + '</p>' : '') +
      (job.class_type ? '<p><strong>Class:</strong> ' + job.class_type + '</p>' : '') +
      (job.advancement ? '<p><strong>Advancement:</strong> ' + job.advancement + '</p>' : '') +
      (job.branch ? '<p><strong>Branch:</strong> ' + job.branch + '</p>' : '') +
      (job.description ? '<p style="margin-top:12px;color:#94a3b8">' + job.description + '</p>' : '') +
      skillsHtml +
      '<button id="close-job-modal" style="margin-top:20px;padding:8px 20px;' +
        'background:' + color + ';border:none;border-radius:6px;color:#fff;' +
        'cursor:pointer;font-size:14px;">Close</button>';

    modal.appendChild(card);
    document.body.appendChild(modal);

    document.getElementById('close-job-modal').addEventListener('click', function () { modal.remove(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
  }

  function _showError(container, message) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:40px;text-align:center;color:#f87171;font-size:15px;';
    el.textContent = message;
    container.appendChild(el);
  }

  return { init: init };
})();
