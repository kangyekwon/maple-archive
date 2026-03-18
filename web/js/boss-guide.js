/**
 * MapleStory Archive - Boss Guide
 * Boss encyclopedia with filtering, sorting, and detail modals
 */
(function () {
  'use strict';

  var container = null;
  var allBosses = [];
  var activeDifficulty = 'all';
  var viewMode = 'cards'; // 'cards' or 'ranking'
  var modalEl = null;

  var DIFFICULTY_COLORS = {
    easy: { bar: '#2ecc71', bg: 'rgba(46,204,113,0.15)', text: '#2ecc71' },
    normal: { bar: '#3498db', bg: 'rgba(52,152,219,0.15)', text: '#3498db' },
    hard: { bar: '#e67e22', bg: 'rgba(230,126,34,0.15)', text: '#e67e22' },
    chaos: { bar: '#e74c3c', bg: 'rgba(231,76,60,0.15)', text: '#e74c3c' },
    extreme: { bar: '#9b59b6', bg: 'rgba(155,89,182,0.15)', text: '#9b59b6' }
  };

  var DIFFICULTY_ORDER = { easy: 1, normal: 2, hard: 3, chaos: 4, extreme: 5 };

  function init() {
    container = document.getElementById('panel-boss-guide');
    if (!container) return;

    container.innerHTML = '';
    buildModal();
    buildFilterBar();
    buildBossGrid();
    fetchBosses();
  }

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'boss-detail-modal';
    modalEl.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;display:none;' +
      'background:rgba(0,0,0,0.8);z-index:1000;justify-content:center;align-items:center;' +
      'padding:20px;';
    modalEl.innerHTML =
      '<div class="boss-modal-content" style="background:#1a1a2e;border-radius:16px;' +
      'max-width:650px;width:90%;max-height:90vh;overflow-y:auto;position:relative;' +
      'border:1px solid rgba(255,255,255,0.1);box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<button class="boss-modal-close" style="position:absolute;top:12px;right:16px;' +
      'background:none;border:none;color:#aaa;font-size:28px;cursor:pointer;z-index:10;">' +
      '&times;</button>' +
      '<div class="boss-modal-bar" style="height:6px;border-radius:16px 16px 0 0;"></div>' +
      '<div class="boss-modal-body" style="padding:28px;"></div></div>';
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl || e.target.classList.contains('boss-modal-close')) {
        modalEl.style.display = 'none';
      }
    });
    document.body.appendChild(modalEl);
  }

  function buildFilterBar() {
    var filterBar = document.createElement('div');
    filterBar.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;padding:16px 20px;' +
      'border-bottom:1px solid rgba(255,255,255,0.1);flex-wrap:wrap;gap:12px;';

    var leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;';

    // Difficulty dropdown
    var selectWrapper = document.createElement('div');
    selectWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
    selectWrapper.innerHTML =
      '<label style="font-size:13px;color:#888;">Difficulty:</label>' +
      '<select id="boss-difficulty-filter" style="padding:8px 14px;border-radius:8px;' +
      'border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;' +
      'font-size:14px;outline:none;cursor:pointer;">' +
      '<option value="all">All</option>' +
      '<option value="easy">Easy</option>' +
      '<option value="normal">Normal</option>' +
      '<option value="hard">Hard</option>' +
      '<option value="chaos">Chaos</option>' +
      '<option value="extreme">Extreme</option>' +
      '</select>';
    leftGroup.appendChild(selectWrapper);

    // Boss count
    var countEl = document.createElement('span');
    countEl.id = 'boss-count';
    countEl.style.cssText = 'font-size:13px;color:#666;';
    leftGroup.appendChild(countEl);

    filterBar.appendChild(leftGroup);

    // View mode toggle
    var toggleGroup = document.createElement('div');
    toggleGroup.style.cssText = 'display:flex;gap:4px;';

    var cardBtn = createToggleButton('Cards', 'cards');
    var rankBtn = createToggleButton('Ranking', 'ranking');
    toggleGroup.appendChild(cardBtn);
    toggleGroup.appendChild(rankBtn);
    filterBar.appendChild(toggleGroup);

    container.appendChild(filterBar);

    document.getElementById('boss-difficulty-filter').addEventListener('change', function (e) {
      activeDifficulty = e.target.value;
      renderBosses();
    });
  }

  function createToggleButton(label, mode) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'boss-view-toggle';
    btn.dataset.mode = mode;
    var isActive = viewMode === mode;
    btn.style.cssText =
      'padding:6px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;' +
      'cursor:pointer;font-size:13px;transition:all 0.2s;color:#fff;' +
      'background:' + (isActive ? 'rgba(255,204,0,0.2)' : 'transparent') + ';' +
      'border-color:' + (isActive ? 'rgba(255,204,0,0.4)' : 'rgba(255,255,255,0.15)') + ';';
    btn.addEventListener('click', function () {
      viewMode = mode;
      var allToggles = container.querySelectorAll('.boss-view-toggle');
      allToggles.forEach(function (b) {
        var active = b.dataset.mode === viewMode;
        b.style.background = active ? 'rgba(255,204,0,0.2)' : 'transparent';
        b.style.borderColor = active ? 'rgba(255,204,0,0.4)' : 'rgba(255,255,255,0.15)';
      });
      renderBosses();
    });
    return btn;
  }

  function buildBossGrid() {
    var grid = document.createElement('div');
    grid.id = 'boss-grid';
    grid.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);';
    container.appendChild(grid);
  }

  function fetchBosses() {
    var grid = document.getElementById('boss-grid');
    if (grid) {
      grid.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Loading bosses...</div>';
    }

    fetch('/api/bosses')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allBosses = data.bosses || data || [];
        if (allBosses.length === 0) allBosses = getFallbackBosses();
        renderBosses();
      })
      .catch(function () {
        allBosses = getFallbackBosses();
        renderBosses();
      });
  }

  function getFallbackBosses() {
    return [
      {
        id: 1, name: 'Zakum', name_ko: '자쿰', difficulty: 'easy',
        level_required: 90, hp: '7,000,000', party_size: 1, entry_limit: '2/day',
        description: 'An ancient stone golem sealed within the mines of El Nath. Its many arms attack from all directions.',
        mechanics: 'Multiple arms must be destroyed individually. Watch for petrify attack and falling rock debris.',
        rewards: 'Zakum Helmet, EXP, Mesos, Condensed Power Crystal',
        story: 'Created by the miners of El Nath who sought ultimate power, Zakum was once a great spirit of fire turned into a cursed stone idol.'
      },
      {
        id: 2, name: 'Horntail', name_ko: '혼테일', difficulty: 'normal',
        level_required: 130, hp: '23,000,000,000', party_size: 6, entry_limit: '2/day',
        description: 'A massive two-headed dragon residing in the Cave of Life at Leafre.',
        mechanics: 'Heads, wings, tails, and legs all attack separately. Seduce and weapon/magic cancel are major threats.',
        rewards: 'Horntail Necklace, Silver Blossom Ring, Dragon Stone',
        story: 'Horntail guards the Cave of Life, the birthplace of all dragons. It views all intruders as threats to dragonkind.'
      },
      {
        id: 3, name: 'Von Leon', name_ko: '반 레온', difficulty: 'normal',
        level_required: 125, hp: '30,000,000,000', party_size: 1, entry_limit: '2/day',
        description: 'The cursed Lion King who rules his frozen castle, driven mad by grief and the Black Mage\'s corruption.',
        mechanics: 'Elemental resistance phases. Summons knights. Ice and fire element attacks cycle throughout the fight.',
        rewards: 'Von Leon gear set, Royal Lion King Medal',
        story: 'Once a noble king, Von Leon made a pact with the Black Mage after his beloved queen was killed, becoming an immortal puppet of darkness.'
      },
      {
        id: 4, name: 'Hilla', name_ko: '힐라', difficulty: 'normal',
        level_required: 120, hp: '15,000,000,000', party_size: 1, entry_limit: '2/day',
        description: 'A necromancer and commander of the Black Mage who controls the undead.',
        mechanics: 'Spawns zombies continuously. Cage mechanic traps players. Altar heals her if not destroyed.',
        rewards: 'Necromancer gear, Pet Blackheart',
        story: 'Once a shamaness, Hilla was promised eternal youth by the Black Mage in exchange for her loyalty and service.'
      },
      {
        id: 5, name: 'Cygnus', name_ko: '시그너스', difficulty: 'hard',
        level_required: 190, hp: '420,000,000,000', party_size: 6, entry_limit: '1/day',
        description: 'The Empress of Ereve, corrupted and empowered by dark forces in a nightmare version of her throne.',
        mechanics: 'Five elemental phases matching Cygnus Knights. Soul split mechanic. 30-minute time limit.',
        rewards: 'Empress gear set, Cygnus Emblem',
        story: 'In this dark timeline, Cygnus succumbs to the Black Mage\'s influence, turning her righteous power against the adventurers.'
      },
      {
        id: 6, name: 'Lotus', name_ko: '로터스', difficulty: 'hard',
        level_required: 190, hp: '900,000,000,000', party_size: 6, entry_limit: '1/day',
        description: 'A commander of the Black Mage wielding devastating telekinetic powers from within his mechanical cocoon.',
        mechanics: 'Phase 1: Debris and laser attacks. Phase 2: Portals and electricity. Phase 3: Core destruction with falling platforms.',
        rewards: 'Absolab gear coins, Berserked, Core of Strength',
        story: 'Orchid\'s twin brother, Lotus was fatally wounded but preserved in a machine by the Black Mage, becoming a weapon of pure destruction.'
      },
      {
        id: 7, name: 'Damien', name_ko: '데미안', difficulty: 'hard',
        level_required: 190, hp: '1,050,000,000,000', party_size: 6, entry_limit: '1/day',
        description: 'A half-demon commander wielding a massive sword, seeking the World Tree\'s power.',
        mechanics: 'Phase 1: Sword combos and blue orbs. Phase 2: Flying phase with brand marks and altar mechanic.',
        rewards: 'Absolab gear coins, Damien Soul Shard',
        story: 'Born of a human mother and demon father, Damien was manipulated by the Black Mage into believing destroying the World Tree would save his mother.'
      },
      {
        id: 8, name: 'Lucid', name_ko: '루시드', difficulty: 'hard',
        level_required: 220, hp: '12,000,000,000,000', party_size: 6, entry_limit: '1/week',
        description: 'The dream manipulator who rules over Lachelein, the city of nightmares.',
        mechanics: 'Phase 1: Butterflies, golems, and dragon breath. Phase 2: Bombs, lasers, and flower platforms over the void.',
        rewards: 'Arcane Umbra gear coins, Lucid Soul Shard, Dream Fragment',
        story: 'Once an elf who admired the Black Mage, Lucid was granted power over dreams but became trapped in her own delusions of loyalty.'
      },
      {
        id: 9, name: 'Will', name_ko: '윌', difficulty: 'hard',
        level_required: 235, hp: '18,000,000,000,000', party_size: 6, entry_limit: '1/week',
        description: 'The spider-like manipulator of the Mirror World, residing in Esfera.',
        mechanics: 'Phase 1: Web patterns and mirror copies. Phase 2: Split into upper/lower groups. Phase 3: Test of time and web prison.',
        rewards: 'Arcane Umbra gear coins, Will Soul Shard',
        story: 'Will manipulates the Mirror World to weave the Black Mage\'s plans, serving as the ultimate gatekeeper before the final battle.'
      },
      {
        id: 10, name: 'Black Mage', name_ko: '검은 마법사', difficulty: 'extreme',
        level_required: 255, hp: '264,000,000,000,000', party_size: 6, entry_limit: '1/month',
        description: 'The ultimate antagonist of MapleStory. The Transcendent of Light who chose absolute darkness.',
        mechanics: '4 phases. Phase 1-3: Increasing mechanics with falling platforms, death zones, and genesis attacks. Phase 4: 15-minute DPS check with one-hit mechanics.',
        rewards: 'Genesis weapons, Black Mage Chair, Genesis Badge',
        story: 'Once a white mage seeking to free the world from the tyranny of the Overseers, he became the Black Mage after discovering the truth of Maple World\'s creation.'
      },
      {
        id: 11, name: 'Seren', name_ko: '세렌', difficulty: 'extreme',
        level_required: 260, hp: '330,000,000,000,000', party_size: 6, entry_limit: '1/week',
        description: 'Leader of the High Flora army and Sun God who has descended upon Cernium.',
        mechanics: '4 phases with increasing solar power. Sun and moon mechanics, domain attacks, and brand debuffs.',
        rewards: 'Eternal gear set, Seren Soul Shard, Mithra\'s Blessing',
        story: 'Seren is the god of the sun in Grandis, leading the High Flora in their conquest across worlds after the Interdimensional Portal opened.'
      },
      {
        id: 12, name: 'Kalos', name_ko: '칼로스', difficulty: 'extreme',
        level_required: 265, hp: '450,000,000,000,000', party_size: 6, entry_limit: '1/week',
        description: 'The Primal God awakened from the depths of Odium, wielding primordial power.',
        mechanics: 'Environmental destruction mechanics, gravity shifts, and elemental storm phases.',
        rewards: 'Eternal gear upgrades, Kalos Soul Shard',
        story: 'An ancient being predating even the Transcendents, Kalos was sealed away in Odium for millennia before being disturbed by the ongoing conflicts.'
      },
      {
        id: 13, name: 'Pink Bean', name_ko: '핑크빈', difficulty: 'normal',
        level_required: 160, hp: '80,000,000,000', party_size: 6, entry_limit: '2/day',
        description: 'A deceptively adorable yet incredibly powerful being that transcends normal comprehension.',
        mechanics: 'Statue guardians must be defeated first. Multiple magic attacks and healing phases.',
        rewards: 'Pink Bean gear, Pink Bean Chair, Pink Holy Cup',
        story: 'Pink Bean is actually the Transcendent of Time in another form, possessing power that rivals the Black Mage despite its cute appearance.'
      },
      {
        id: 14, name: 'Magnus', name_ko: '매그너스', difficulty: 'hard',
        level_required: 190, hp: '750,000,000,000', party_size: 6, entry_limit: '1/day',
        description: 'The tyrannical commander who conquered Heliseum for the Black Mage.',
        mechanics: 'Meteor zones, poison gas clouds, spin attacks. Blue zones are safe from meteors.',
        rewards: 'Tyrant gear, Nova gear, Magnus Soul Shard',
        story: 'Magnus is a Nova warrior who betrayed his people and joined the Black Mage, seizing control of Heliseum from the Nova kingdom.'
      }
    ];
  }

  function renderBosses() {
    var grid = document.getElementById('boss-grid');
    if (!grid) return;

    var filtered = activeDifficulty === 'all'
      ? allBosses.slice()
      : allBosses.filter(function (b) { return b.difficulty === activeDifficulty; });

    // Sort by level_required
    filtered.sort(function (a, b) {
      return (a.level_required || 0) - (b.level_required || 0);
    });

    // Update count
    var countEl = document.getElementById('boss-count');
    if (countEl) {
      countEl.textContent = filtered.length + ' boss' + (filtered.length !== 1 ? 'es' : '');
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="text-align:center;color:#888;padding:60px;">' +
        'No bosses found for this difficulty.</div>';
      return;
    }

    if (viewMode === 'ranking') {
      renderRankingView(grid, filtered);
    } else {
      renderCardView(grid, filtered);
    }
  }

  function renderCardView(grid, bosses) {
    grid.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);' +
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;';

    grid.innerHTML = bosses.map(function (boss) {
      var diffStyle = DIFFICULTY_COLORS[boss.difficulty] || DIFFICULTY_COLORS.normal;
      return '<div class="boss-card-item" data-id="' + boss.id + '" style="background:#1a1a2e;' +
        'border-radius:12px;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;' +
        'border:1px solid rgba(255,255,255,0.06);">' +
        // Difficulty color bar on top
        '<div style="height:4px;background:' + diffStyle.bar + ';"></div>' +
        '<div style="padding:18px;">' +
        // Name and difficulty badge
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">' +
        '<h4 style="margin:0;color:#fff;font-size:16px;">' + escapeHtml(boss.name) + '</h4>' +
        '<span style="font-size:11px;padding:3px 10px;border-radius:10px;white-space:nowrap;' +
        'background:' + diffStyle.bg + ';color:' + diffStyle.text + ';font-weight:600;text-transform:uppercase;">' +
        escapeHtml(boss.difficulty) + '</span></div>' +
        (boss.name_ko ? '<div style="font-size:12px;color:#888;margin-bottom:12px;">' +
          escapeHtml(boss.name_ko) + '</div>' : '') +
        // Stats grid
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">' +
        '<div style="color:#666;margin-bottom:2px;">Level Req.</div>' +
        '<div style="color:#fff;font-weight:600;">' + (boss.level_required || '?') + '</div></div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">' +
        '<div style="color:#666;margin-bottom:2px;">HP</div>' +
        '<div style="color:#fff;font-weight:600;font-size:11px;">' + escapeHtml(boss.hp || '?') + '</div></div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">' +
        '<div style="color:#666;margin-bottom:2px;">Party Size</div>' +
        '<div style="color:#fff;font-weight:600;">' + (boss.party_size || '?') + '</div></div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">' +
        '<div style="color:#666;margin-bottom:2px;">Entry Limit</div>' +
        '<div style="color:#fff;font-weight:600;">' + escapeHtml(boss.entry_limit || '?') + '</div></div>' +
        '</div></div></div>';
    }).join('');

    grid.querySelectorAll('.boss-card-item').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
      card.addEventListener('click', function () {
        var bossId = parseInt(card.getAttribute('data-id'));
        var boss = allBosses.find(function (b) { return b.id === bossId; });
        if (boss) showBossDetail(boss);
      });
    });
  }

  function renderRankingView(grid, bosses) {
    // Sort by level descending for ranking
    var ranked = bosses.slice().sort(function (a, b) {
      return (b.level_required || 0) - (a.level_required || 0);
    });

    grid.style.cssText = 'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);' +
      'display:flex;flex-direction:column;gap:8px;';

    grid.innerHTML = ranked.map(function (boss, idx) {
      var diffStyle = DIFFICULTY_COLORS[boss.difficulty] || DIFFICULTY_COLORS.normal;
      var rank = idx + 1;
      var rankColor = rank <= 3 ? '#ffcc00' : '#888';

      return '<div class="boss-rank-item" data-id="' + boss.id + '" style="background:#1a1a2e;' +
        'border-radius:10px;padding:14px 18px;cursor:pointer;transition:all 0.15s;' +
        'border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:16px;' +
        'border-left:4px solid ' + diffStyle.bar + ';">' +
        // Rank number
        '<div style="font-size:20px;font-weight:bold;color:' + rankColor +
        ';min-width:36px;text-align:center;">#' + rank + '</div>' +
        // Boss info
        '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">' +
        '<span style="font-weight:600;color:#fff;font-size:15px;">' + escapeHtml(boss.name) + '</span>' +
        (boss.name_ko ? '<span style="font-size:12px;color:#888;">' + escapeHtml(boss.name_ko) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:12px;font-size:12px;color:#888;">' +
        '<span>Lv. ' + (boss.level_required || '?') + '</span>' +
        '<span>' + escapeHtml(boss.hp || '?') + ' HP</span>' +
        '<span>Party: ' + (boss.party_size || '?') + '</span>' +
        '</div></div>' +
        // Difficulty badge
        '<span style="font-size:11px;padding:4px 12px;border-radius:10px;white-space:nowrap;' +
        'background:' + diffStyle.bg + ';color:' + diffStyle.text + ';font-weight:600;text-transform:uppercase;">' +
        escapeHtml(boss.difficulty) + '</span></div>';
    }).join('');

    grid.querySelectorAll('.boss-rank-item').forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        item.style.borderColor = 'rgba(255,204,0,0.3)';
        item.style.background = 'rgba(26,26,46,0.9)';
      });
      item.addEventListener('mouseleave', function () {
        item.style.borderColor = 'rgba(255,255,255,0.06)';
        item.style.background = '#1a1a2e';
      });
      item.addEventListener('click', function () {
        var bossId = parseInt(item.getAttribute('data-id'));
        var boss = allBosses.find(function (b) { return b.id === bossId; });
        if (boss) showBossDetail(boss);
      });
    });
  }

  function showBossDetail(boss) {
    var diffStyle = DIFFICULTY_COLORS[boss.difficulty] || DIFFICULTY_COLORS.normal;
    var bar = modalEl.querySelector('.boss-modal-bar');
    var body = modalEl.querySelector('.boss-modal-body');

    bar.style.background = diffStyle.bar;

    body.innerHTML =
      // Header
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
      '<h2 style="margin:0;color:#fff;font-size:24px;">' + escapeHtml(boss.name) + '</h2>' +
      '<span style="font-size:12px;padding:4px 14px;border-radius:12px;' +
      'background:' + diffStyle.bg + ';color:' + diffStyle.text + ';font-weight:600;' +
      'text-transform:uppercase;white-space:nowrap;">' + escapeHtml(boss.difficulty) + '</span></div>' +
      (boss.name_ko ? '<div style="font-size:15px;color:#888;margin-bottom:16px;">' +
        escapeHtml(boss.name_ko) + '</div>' : '') +
      // Description
      (boss.description ? '<p style="color:#ccc;line-height:1.7;font-size:14px;margin-bottom:20px;">' +
        escapeHtml(boss.description) + '</p>' : '') +
      // Stats
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;">' +
      buildStatBox('Level Required', boss.level_required) +
      buildStatBox('HP', boss.hp) +
      buildStatBox('Party Size', boss.party_size) +
      buildStatBox('Entry Limit', boss.entry_limit) +
      '</div>' +
      // Mechanics
      (boss.mechanics ? '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 8px 0;color:#ffcc00;font-size:15px;">Battle Mechanics</h4>' +
        '<p style="color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;margin:0;">' + escapeHtml(boss.mechanics) + '</p></div>' : '') +
      // Rewards
      (boss.rewards ? '<div style="margin-bottom:20px;">' +
        '<h4 style="margin:0 0 8px 0;color:#ffcc00;font-size:15px;">Rewards</h4>' +
        '<p style="color:#ccc;line-height:1.7;font-size:14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;margin:0;">' + escapeHtml(boss.rewards) + '</p></div>' : '') +
      // Story
      (boss.story ? '<div>' +
        '<h4 style="margin:0 0 8px 0;color:#ffcc00;font-size:15px;">Story Significance</h4>' +
        '<p style="color:#ccc;line-height:1.7;font-size:14px;font-style:italic;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;padding:14px;margin:0;border-left:3px solid ' + diffStyle.bar + ';">' +
        escapeHtml(boss.story) + '</p></div>' : '');

    modalEl.style.display = 'flex';
  }

  function buildStatBox(label, value) {
    return '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px;">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">' +
      label + '</div>' +
      '<div style="font-size:16px;font-weight:600;color:#fff;">' + escapeHtml(String(value || '?')) + '</div></div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.BossGuide = { init: init };
})();
