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
        // Transform flat jobs array into hierarchical tree structure
        var treeData = _buildTreeFromJobs(data);

        root = d3.hierarchy(treeData);
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
        // Use fallback data
        var fallbackTree = _getFallbackTree();
        root = d3.hierarchy(fallbackTree);
        root.x0 = height / 2;
        root.y0 = 0;
        if (root.children) {
          root.children.forEach(_collapse);
        }
        _update(root);
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

  /**
   * Transform flat API response {jobs:[...], advancements:[]} into
   * a hierarchical tree structure suitable for d3.hierarchy().
   * Groups by branch, then by class_type within each branch.
   */
  function _buildTreeFromJobs(data) {
    // If data is already hierarchical (has name and children), use as-is
    if (data && data.name && data.children) {
      return data;
    }

    var jobs = data.jobs || data;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return _getFallbackTree();
    }

    // Group jobs by branch
    var branches = {};
    jobs.forEach(function (job) {
      var branchName = job.branch || 'other';
      if (!branches[branchName]) {
        branches[branchName] = {};
      }
      var classType = job.class_type || 'unknown';
      if (!branches[branchName][classType]) {
        branches[branchName][classType] = [];
      }
      branches[branchName][classType].push(job);
    });

    // Build tree: Root -> Branch -> ClassType -> Jobs
    var branchLabels = {
      explorer: 'Explorer',
      cygnus_knights: 'Cygnus Knights',
      heroes: 'Heroes',
      resistance: 'Resistance',
      nova: 'Nova',
      flora: 'Flora',
      anima: 'Anima',
      child_of_god: 'Child of God',
      other: 'Other'
    };

    var children = Object.keys(branches).map(function (branchKey) {
      var classGroups = branches[branchKey];
      var classChildren = Object.keys(classGroups).map(function (classKey) {
        var jobNodes = classGroups[classKey].map(function (job) {
          return {
            name: job.name || '',
            name_ko: job.name_ko || '',
            name_en: job.name || '',
            job_id: job.id,
            class_type: classKey,
            branch: branchKey,
            description: job.description || '',
            difficulty: job.difficulty || '',
            weapon_type: job.weapon_type || ''
          };
        });

        // If only one class type in this branch, skip the class grouping level
        return {
          name: classKey.charAt(0).toUpperCase() + classKey.slice(1),
          name_ko: classKey,
          class_type: classKey,
          branch: branchKey,
          children: jobNodes
        };
      });

      return {
        name: branchLabels[branchKey] || branchKey,
        name_ko: branchLabels[branchKey] || branchKey,
        class_type: null,
        branch: branchKey,
        children: classChildren
      };
    });

    return {
      name: 'MapleStory Jobs',
      name_ko: 'MapleStory Jobs',
      children: children
    };
  }

  /**
   * Fallback tree data when API fails or returns empty.
   */
  function _getFallbackTree() {
    return {
      name: 'MapleStory Jobs',
      name_ko: 'MapleStory Jobs',
      children: [
        {
          name: 'Explorer', name_ko: 'Explorer', branch: 'explorer',
          children: [
            { name: 'Warrior', name_ko: 'Warrior', class_type: 'warrior', children: [
              { name_ko: '히어로', name: 'Hero', class_type: 'warrior', job_id: 1 },
              { name_ko: '팔라딘', name: 'Paladin', class_type: 'warrior', job_id: 2 },
              { name_ko: '다크나이트', name: 'Dark Knight', class_type: 'warrior', job_id: 3 }
            ]},
            { name: 'Magician', name_ko: 'Magician', class_type: 'magician', children: [
              { name_ko: '아크메이지 (불/독)', name: 'Arch Mage (F/P)', class_type: 'magician', job_id: 4 },
              { name_ko: '아크메이지 (썬/콜)', name: 'Arch Mage (I/L)', class_type: 'magician', job_id: 5 },
              { name_ko: '비숍', name: 'Bishop', class_type: 'magician', job_id: 6 }
            ]},
            { name: 'Bowman', name_ko: 'Bowman', class_type: 'bowman', children: [
              { name_ko: '보우마스터', name: 'Bowmaster', class_type: 'bowman', job_id: 7 },
              { name_ko: '신궁', name: 'Marksman', class_type: 'bowman', job_id: 8 }
            ]},
            { name: 'Thief', name_ko: 'Thief', class_type: 'thief', children: [
              { name_ko: '나이트로드', name: 'Night Lord', class_type: 'thief', job_id: 9 },
              { name_ko: '섀도어', name: 'Shadower', class_type: 'thief', job_id: 10 },
              { name_ko: '듀얼블레이드', name: 'Dual Blade', class_type: 'thief', job_id: 11 }
            ]},
            { name: 'Pirate', name_ko: 'Pirate', class_type: 'pirate', children: [
              { name_ko: '바이퍼', name: 'Buccaneer', class_type: 'pirate', job_id: 12 },
              { name_ko: '캡틴', name: 'Corsair', class_type: 'pirate', job_id: 13 },
              { name_ko: '캐논슈터', name: 'Cannoneer', class_type: 'pirate', job_id: 14 }
            ]}
          ]
        },
        {
          name: 'Cygnus Knights', name_ko: 'Cygnus Knights', branch: 'cygnus_knights',
          children: [
            { name: 'Warrior', name_ko: 'Warrior', class_type: 'warrior', children: [
              { name_ko: '소울마스터', name: 'Dawn Warrior', class_type: 'warrior', job_id: 16 },
              { name_ko: '미하일', name: 'Mihile', class_type: 'warrior', job_id: 21 }
            ]},
            { name: 'Magician', name_ko: 'Magician', class_type: 'magician', children: [
              { name_ko: '플레임위자드', name: 'Blaze Wizard', class_type: 'magician', job_id: 17 }
            ]},
            { name: 'Bowman', name_ko: 'Bowman', class_type: 'bowman', children: [
              { name_ko: '윈드브레이커', name: 'Wind Archer', class_type: 'bowman', job_id: 18 }
            ]},
            { name: 'Thief', name_ko: 'Thief', class_type: 'thief', children: [
              { name_ko: '나이트워커', name: 'Night Walker', class_type: 'thief', job_id: 19 }
            ]},
            { name: 'Pirate', name_ko: 'Pirate', class_type: 'pirate', children: [
              { name_ko: '스트라이커', name: 'Thunder Breaker', class_type: 'pirate', job_id: 20 }
            ]}
          ]
        },
        {
          name: 'Heroes', name_ko: 'Heroes', branch: 'heroes',
          children: [
            { name: 'Warrior', name_ko: 'Warrior', class_type: 'warrior', children: [
              { name_ko: '아란', name: 'Aran', class_type: 'warrior', job_id: 22 }
            ]},
            { name: 'Magician', name_ko: 'Magician', class_type: 'magician', children: [
              { name_ko: '에반', name: 'Evan', class_type: 'magician', job_id: 23 },
              { name_ko: '루미너스', name: 'Luminous', class_type: 'magician', job_id: 26 }
            ]},
            { name: 'Bowman', name_ko: 'Bowman', class_type: 'bowman', children: [
              { name_ko: '메르세데스', name: 'Mercedes', class_type: 'bowman', job_id: 24 }
            ]},
            { name: 'Thief', name_ko: 'Thief', class_type: 'thief', children: [
              { name_ko: '팬텀', name: 'Phantom', class_type: 'thief', job_id: 25 }
            ]},
            { name: 'Pirate', name_ko: 'Pirate', class_type: 'pirate', children: [
              { name_ko: '은월', name: 'Shade', class_type: 'pirate', job_id: 27 }
            ]}
          ]
        },
        {
          name: 'Resistance', name_ko: 'Resistance', branch: 'resistance',
          children: [
            { name: 'Warrior', name_ko: 'Warrior', class_type: 'warrior', children: [
              { name_ko: '데몬슬레이어', name: 'Demon Slayer', class_type: 'warrior', job_id: 28 },
              { name_ko: '데몬어벤져', name: 'Demon Avenger', class_type: 'warrior', job_id: 29 },
              { name_ko: '블래스터', name: 'Blaster', class_type: 'warrior', job_id: 33 }
            ]},
            { name: 'Magician', name_ko: 'Magician', class_type: 'magician', children: [
              { name_ko: '배틀메이지', name: 'Battle Mage', class_type: 'magician', job_id: 30 }
            ]},
            { name: 'Bowman', name_ko: 'Bowman', class_type: 'bowman', children: [
              { name_ko: '와일드헌터', name: 'Wild Hunter', class_type: 'bowman', job_id: 31 }
            ]},
            { name: 'Pirate', name_ko: 'Pirate', class_type: 'pirate', children: [
              { name_ko: '메카닉', name: 'Mechanic', class_type: 'pirate', job_id: 32 }
            ]},
            { name: 'Thief', name_ko: 'Thief', class_type: 'thief', children: [
              { name_ko: '제논', name: 'Xenon', class_type: 'thief', job_id: 34 }
            ]}
          ]
        },
        {
          name: 'Nova', name_ko: 'Nova', branch: 'nova',
          children: [
            { name: 'Warrior', name_ko: 'Warrior', class_type: 'warrior', children: [
              { name_ko: '카이저', name: 'Kaiser', class_type: 'warrior', job_id: 35 }
            ]},
            { name: 'Thief', name_ko: 'Thief', class_type: 'thief', children: [
              { name_ko: '카데나', name: 'Cadena', class_type: 'thief', job_id: 37 }
            ]},
            { name: 'Pirate', name_ko: 'Pirate', class_type: 'pirate', children: [
              { name_ko: '엔젤릭버스터', name: 'Angelic Buster', class_type: 'pirate', job_id: 36 }
            ]}
          ]
        }
      ]
    };
  }

  function _showError(container, message) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:40px;text-align:center;color:#f87171;font-size:15px;';
    el.textContent = message;
    container.appendChild(el);
  }

  return { init: init };
})();
