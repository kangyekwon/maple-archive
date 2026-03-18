/**
 * MapleStory Archive - Skill Simulator
 * Job skill viewer with branch/job selection and skill cards grouped by advancement
 */
(function () {
  'use strict';

  var container = null;
  var allJobs = [];
  var selectedJob = null;
  var selectedSkills = [];

  var SKILL_TYPE_STYLES = {
    active: { bg: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: 'rgba(231,76,60,0.4)' },
    passive: { bg: 'rgba(52,152,219,0.2)', color: '#3498db', border: 'rgba(52,152,219,0.4)' },
    hyper: { bg: 'rgba(155,89,182,0.2)', color: '#9b59b6', border: 'rgba(155,89,182,0.4)' },
    '5th': { bg: 'rgba(241,196,15,0.2)', color: '#f1c40f', border: 'rgba(241,196,15,0.4)' },
    '6th': { bg: 'rgba(230,126,34,0.2)', color: '#e67e22', border: 'rgba(230,126,34,0.4)' },
    buff: { bg: 'rgba(46,204,113,0.2)', color: '#2ecc71', border: 'rgba(46,204,113,0.4)' }
  };

  var ADVANCEMENT_LABELS = {
    1: '1st Job',
    2: '2nd Job',
    3: '3rd Job',
    4: '4th Job',
    hyper: 'Hyper Skills',
    5: '5th Job (V Matrix)',
    6: '6th Job (HEXA Matrix)'
  };

  function init() {
    container = document.getElementById('panel-skill-simulator');
    if (!container) return;

    container.innerHTML = '';
    buildLayout();
    fetchJobs();
  }

  function buildLayout() {
    container.innerHTML =
      '<div style="display:flex;height:100%;min-height:500px;">' +
      // Left panel - job selector
      '<div id="skill-left-panel" style="width:280px;min-width:280px;border-right:1px solid rgba(255,255,255,0.1);' +
      'padding:20px;overflow-y:auto;background:rgba(0,0,0,0.15);">' +
      '<h3 style="margin:0 0 16px 0;color:#ffcc00;font-size:16px;">Select a Job</h3>' +
      '<div id="skill-branch-select" style="margin-bottom:12px;"></div>' +
      '<div id="skill-job-list" style="display:flex;flex-direction:column;gap:6px;">' +
      '<div style="text-align:center;color:#888;padding:20px;font-size:13px;">Loading jobs...</div>' +
      '</div></div>' +
      // Right panel - skill display
      '<div id="skill-right-panel" style="flex:1;padding:20px;overflow-y:auto;">' +
      '<div style="text-align:center;color:#888;padding:60px;font-size:15px;">' +
      'Select a job from the left panel to view skills.</div></div></div>';
  }

  function fetchJobs() {
    fetch('/api/jobs')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allJobs = data.jobs || data || [];
        if (allJobs.length === 0) allJobs = getFallbackJobs();
        buildBranchSelector();
        renderJobList();
      })
      .catch(function () {
        allJobs = getFallbackJobs();
        buildBranchSelector();
        renderJobList();
      });
  }

  function getFallbackJobs() {
    return [
      { id: 1, name: 'Hero', name_ko: '히어로', branch: 'Explorer', class_type: 'warrior' },
      { id: 2, name: 'Dark Knight', name_ko: '다크나이트', branch: 'Explorer', class_type: 'warrior' },
      { id: 3, name: 'Paladin', name_ko: '팔라딘', branch: 'Explorer', class_type: 'warrior' },
      { id: 4, name: 'Arch Mage (F/P)', name_ko: '아크메이지(불,독)', branch: 'Explorer', class_type: 'magician' },
      { id: 5, name: 'Arch Mage (I/L)', name_ko: '아크메이지(썬,콜)', branch: 'Explorer', class_type: 'magician' },
      { id: 6, name: 'Bishop', name_ko: '비숍', branch: 'Explorer', class_type: 'magician' },
      { id: 7, name: 'Bowmaster', name_ko: '보우마스터', branch: 'Explorer', class_type: 'bowman' },
      { id: 8, name: 'Marksman', name_ko: '신궁', branch: 'Explorer', class_type: 'bowman' },
      { id: 9, name: 'Night Lord', name_ko: '나이트로드', branch: 'Explorer', class_type: 'thief' },
      { id: 10, name: 'Shadower', name_ko: '섀도어', branch: 'Explorer', class_type: 'thief' },
      { id: 11, name: 'Buccaneer', name_ko: '바이퍼', branch: 'Explorer', class_type: 'pirate' },
      { id: 12, name: 'Corsair', name_ko: '캡틴', branch: 'Explorer', class_type: 'pirate' },
      { id: 13, name: 'Dawn Warrior', name_ko: '소울마스터', branch: 'Cygnus Knights', class_type: 'warrior' },
      { id: 14, name: 'Blaze Wizard', name_ko: '플레임위자드', branch: 'Cygnus Knights', class_type: 'magician' },
      { id: 15, name: 'Wind Archer', name_ko: '윈드브레이커', branch: 'Cygnus Knights', class_type: 'bowman' },
      { id: 16, name: 'Night Walker', name_ko: '나이트워커', branch: 'Cygnus Knights', class_type: 'thief' },
      { id: 17, name: 'Thunder Breaker', name_ko: '스트라이커', branch: 'Cygnus Knights', class_type: 'pirate' },
      { id: 18, name: 'Adele', name_ko: '아델', branch: 'Flora', class_type: 'warrior' },
      { id: 19, name: 'Illium', name_ko: '일리움', branch: 'Flora', class_type: 'magician' },
      { id: 20, name: 'Ark', name_ko: '아크', branch: 'Flora', class_type: 'pirate' },
      { id: 21, name: 'Hoyoung', name_ko: '호영', branch: 'Anima', class_type: 'thief' },
      { id: 22, name: 'Lara', name_ko: '라라', branch: 'Anima', class_type: 'magician' },
      { id: 23, name: 'Kain', name_ko: '카인', branch: 'Anima', class_type: 'bowman' }
    ];
  }

  function getBranches() {
    var branches = [];
    allJobs.forEach(function (job) {
      if (job.branch && branches.indexOf(job.branch) === -1) {
        branches.push(job.branch);
      }
    });
    return branches;
  }

  var activeBranch = 'All';

  function buildBranchSelector() {
    var branchContainer = document.getElementById('skill-branch-select');
    if (!branchContainer) return;

    var branches = ['All'].concat(getBranches());

    branchContainer.innerHTML =
      '<select id="skill-branch-dropdown" style="width:100%;padding:10px 14px;border-radius:8px;' +
      'border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;' +
      'font-size:14px;outline:none;cursor:pointer;">' +
      branches.map(function (b) {
        return '<option value="' + b + '"' + (b === activeBranch ? ' selected' : '') + '>' + b + '</option>';
      }).join('') +
      '</select>';

    document.getElementById('skill-branch-dropdown').addEventListener('change', function (e) {
      activeBranch = e.target.value;
      renderJobList();
    });
  }

  function renderJobList() {
    var jobList = document.getElementById('skill-job-list');
    if (!jobList) return;

    var filteredJobs = activeBranch === 'All'
      ? allJobs
      : allJobs.filter(function (j) { return j.branch === activeBranch; });

    if (filteredJobs.length === 0) {
      jobList.innerHTML = '<div style="text-align:center;color:#888;padding:20px;font-size:13px;">' +
        'No jobs in this branch.</div>';
      return;
    }

    // Group by class_type
    var grouped = {};
    filteredJobs.forEach(function (job) {
      var ct = job.class_type || 'other';
      if (!grouped[ct]) grouped[ct] = [];
      grouped[ct].push(job);
    });

    var CLASS_ORDER = ['warrior', 'magician', 'bowman', 'thief', 'pirate', 'other'];
    var CLASS_COLORS = {
      warrior: '#e74c3c', magician: '#3498db', bowman: '#27ae60',
      thief: '#8e44ad', pirate: '#e67e22', other: '#888'
    };

    jobList.innerHTML = '';

    CLASS_ORDER.forEach(function (ct) {
      if (!grouped[ct]) return;

      var groupHeader = document.createElement('div');
      groupHeader.style.cssText =
        'font-size:11px;text-transform:uppercase;color:' + (CLASS_COLORS[ct] || '#888') +
        ';margin-top:12px;margin-bottom:4px;padding-left:4px;font-weight:600;letter-spacing:0.5px;';
      groupHeader.textContent = ct.charAt(0).toUpperCase() + ct.slice(1);
      jobList.appendChild(groupHeader);

      grouped[ct].forEach(function (job) {
        var btn = document.createElement('button');
        var isSelected = selectedJob && selectedJob.id === job.id;
        btn.style.cssText =
          'width:100%;padding:10px 12px;border:1px solid ' +
          (isSelected ? 'rgba(255,204,0,0.4)' : 'rgba(255,255,255,0.08)') +
          ';border-radius:8px;background:' +
          (isSelected ? 'rgba(255,204,0,0.1)' : 'rgba(0,0,0,0.2)') +
          ';color:#fff;cursor:pointer;font-size:13px;text-align:left;transition:all 0.15s;';
        btn.innerHTML =
          '<div style="font-weight:600;">' + escapeHtml(job.name) + '</div>' +
          (job.name_ko ? '<div style="font-size:11px;color:#888;">' + escapeHtml(job.name_ko) + '</div>' : '');

        btn.addEventListener('mouseenter', function () {
          if (!isSelected) {
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            btn.style.background = 'rgba(255,255,255,0.05)';
          }
        });
        btn.addEventListener('mouseleave', function () {
          if (!isSelected) {
            btn.style.borderColor = 'rgba(255,255,255,0.08)';
            btn.style.background = 'rgba(0,0,0,0.2)';
          }
        });
        btn.addEventListener('click', function () {
          selectedJob = job;
          renderJobList();
          fetchSkills(job);
        });

        jobList.appendChild(btn);
      });
    });
  }

  function fetchSkills(job) {
    var rightPanel = document.getElementById('skill-right-panel');
    if (!rightPanel) return;

    rightPanel.innerHTML =
      '<div style="text-align:center;color:#888;padding:40px;">Loading skills for ' +
      escapeHtml(job.name) + '...</div>';

    fetch('/api/jobs/' + job.id + '/skills')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        selectedSkills = data.skills || data || [];
        renderSkills(job);
      })
      .catch(function () {
        selectedSkills = getFallbackSkills(job);
        renderSkills(job);
      });
  }

  function getFallbackSkills(job) {
    var skills = [];
    var advancements = [1, 2, 3, 4, 'hyper', 5, 6];
    var skillTypes = ['active', 'active', 'passive', 'active', 'buff'];

    advancements.forEach(function (adv) {
      var count = adv === 'hyper' ? 3 : (adv >= 5 ? 2 : 4);
      for (var i = 0; i < count; i++) {
        var type = skillTypes[i % skillTypes.length];
        if (adv === 'hyper') type = 'hyper';
        if (adv >= 5) type = '5th';
        if (adv >= 6) type = '6th';

        skills.push({
          name: job.name + ' Skill ' + adv + '-' + (i + 1),
          type: type,
          advancement: adv,
          description: 'A powerful ' + type + ' skill for ' + job.name + '.',
          damage_percent: type === 'passive' ? null : (100 + Math.floor(Math.random() * 500)),
          cooldown: type === 'passive' ? null : (type === 'buff' ? 120 : Math.floor(Math.random() * 30)),
          max_level: adv === 'hyper' ? 1 : (adv >= 5 ? 25 : 30)
        });
      }
    });

    return skills;
  }

  function renderSkills(job) {
    var rightPanel = document.getElementById('skill-right-panel');
    if (!rightPanel) return;

    // Header
    var headerHtml =
      '<div style="margin-bottom:24px;">' +
      '<h2 style="margin:0 0 4px 0;color:#fff;font-size:22px;">' + escapeHtml(job.name) + '</h2>' +
      (job.name_ko ? '<div style="font-size:14px;color:#888;margin-bottom:8px;">' +
        escapeHtml(job.name_ko) + '</div>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      (job.branch ? '<span style="font-size:12px;padding:3px 10px;border-radius:10px;' +
        'background:rgba(255,255,255,0.08);color:#aaa;">' + escapeHtml(job.branch) + '</span>' : '') +
      (job.class_type ? '<span style="font-size:12px;padding:3px 10px;border-radius:10px;' +
        'background:rgba(255,255,255,0.08);color:#aaa;">' +
        job.class_type.charAt(0).toUpperCase() + job.class_type.slice(1) + '</span>' : '') +
      '<span style="font-size:12px;padding:3px 10px;border-radius:10px;' +
      'background:rgba(255,255,255,0.08);color:#aaa;">' +
      selectedSkills.length + ' skills</span>' +
      '</div></div>';

    if (selectedSkills.length === 0) {
      rightPanel.innerHTML = headerHtml +
        '<div style="text-align:center;color:#888;padding:40px;">No skills found for this job.</div>';
      return;
    }

    // Group skills by advancement
    var grouped = {};
    selectedSkills.forEach(function (skill) {
      var adv = skill.advancement || 'other';
      if (!grouped[adv]) grouped[adv] = [];
      grouped[adv].push(skill);
    });

    var ADV_ORDER = [1, 2, 3, 4, 'hyper', 5, 6, 'other'];
    var skillsHtml = '';

    ADV_ORDER.forEach(function (adv) {
      if (!grouped[adv]) return;
      var label = ADVANCEMENT_LABELS[adv] || ('Advancement ' + adv);

      skillsHtml += '<div style="margin-bottom:24px;">' +
        '<h3 style="margin:0 0 12px 0;color:#ffcc00;font-size:16px;' +
        'border-bottom:1px solid rgba(255,204,0,0.2);padding-bottom:8px;">' +
        label + ' <span style="font-size:12px;color:#888;">(' + grouped[adv].length + ')</span></h3>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">';

      grouped[adv].forEach(function (skill) {
        var typeStyle = SKILL_TYPE_STYLES[skill.type] || SKILL_TYPE_STYLES.active;

        skillsHtml += '<div style="background:#1a1a2e;border-radius:10px;padding:16px;' +
          'border:1px solid rgba(255,255,255,0.06);transition:border-color 0.2s;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
          '<div style="font-weight:600;color:#fff;font-size:14px;">' + escapeHtml(skill.name) + '</div>' +
          '<span style="font-size:11px;padding:2px 8px;border-radius:8px;white-space:nowrap;' +
          'background:' + typeStyle.bg + ';color:' + typeStyle.color + ';border:1px solid ' +
          typeStyle.border + ';">' + escapeHtml(skill.type) + '</span></div>';

        if (skill.description) {
          skillsHtml += '<p style="margin:0 0 10px 0;color:#aaa;font-size:12px;line-height:1.5;">' +
            escapeHtml(skill.description) + '</p>';
        }

        var statsHtml = '';
        if (skill.damage_percent) {
          statsHtml += '<span style="font-size:11px;color:#e74c3c;margin-right:12px;">' +
            'DMG: ' + skill.damage_percent + '%</span>';
        }
        if (skill.cooldown) {
          statsHtml += '<span style="font-size:11px;color:#3498db;margin-right:12px;">' +
            'CD: ' + skill.cooldown + 's</span>';
        }
        if (skill.max_level) {
          statsHtml += '<span style="font-size:11px;color:#888;">' +
            'Max Lv. ' + skill.max_level + '</span>';
        }

        if (statsHtml) {
          skillsHtml += '<div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);">' +
            statsHtml + '</div>';
        }

        skillsHtml += '</div>';
      });

      skillsHtml += '</div></div>';
    });

    rightPanel.innerHTML = headerHtml + skillsHtml;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.SkillSimulator = { init: init };
})();
