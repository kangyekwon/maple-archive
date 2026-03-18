/**
 * MapleStory Archive - Image Gallery
 * Categorized gallery with lightbox view for characters, bosses, worlds, and jobs
 */
(function () {
  'use strict';

  var CATEGORIES = ['Characters', 'Bosses', 'Worlds', 'Jobs'];

  var PLACEHOLDER_COLORS = {
    Characters: { bg: '#2a4a7f', accent: '#5b9bd5' },
    Bosses: { bg: '#7f2a2a', accent: '#d55b5b' },
    Worlds: { bg: '#2a7f4a', accent: '#5bd58b' },
    Jobs: { bg: '#6b2a7f', accent: '#b05bd5' }
  };

  var activeCategory = 'Characters';
  var galleryData = {};
  var container = null;
  var lightboxEl = null;

  function init() {
    container = document.getElementById('panel-gallery');
    if (!container) return;

    container.innerHTML = '';
    buildCategoryTabs();
    buildGalleryGrid();
    buildLightbox();
    loadGalleryData();
  }

  function buildCategoryTabs() {
    var tabBar = document.createElement('div');
    tabBar.className = 'gallery-tabs';
    tabBar.style.cssText =
      'display:flex;gap:8px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);' +
      'flex-wrap:wrap;';

    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.textContent = cat;
      btn.className = 'gallery-tab' + (cat === activeCategory ? ' active' : '');
      btn.style.cssText =
        'padding:8px 20px;border:1px solid rgba(255,255,255,0.2);border-radius:20px;' +
        'background:' + (cat === activeCategory ? PLACEHOLDER_COLORS[cat].accent : 'transparent') + ';' +
        'color:#fff;cursor:pointer;font-size:14px;transition:all 0.2s;';
      btn.addEventListener('click', function () {
        activeCategory = cat;
        updateTabs(tabBar);
        renderGallery();
      });
      tabBar.appendChild(btn);
    });

    container.appendChild(tabBar);
  }

  function updateTabs(tabBar) {
    var buttons = tabBar.querySelectorAll('.gallery-tab');
    buttons.forEach(function (btn) {
      var cat = btn.textContent;
      var isActive = cat === activeCategory;
      btn.className = 'gallery-tab' + (isActive ? ' active' : '');
      btn.style.background = isActive ? PLACEHOLDER_COLORS[cat].accent : 'transparent';
    });
  }

  function buildGalleryGrid() {
    var grid = document.createElement('div');
    grid.id = 'gallery-grid';
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;' +
      'padding:20px;overflow-y:auto;max-height:calc(100vh - 250px);';
    container.appendChild(grid);
  }

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'gallery-lightbox';
    lightboxEl.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;display:none;' +
      'background:rgba(0,0,0,0.85);z-index:1000;justify-content:center;align-items:center;' +
      'padding:20px;';
    lightboxEl.innerHTML =
      '<div class="lightbox-content" style="background:#1a1a2e;border-radius:16px;' +
      'max-width:600px;width:90%;max-height:90vh;overflow-y:auto;position:relative;' +
      'border:1px solid rgba(255,255,255,0.1);box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<button class="lightbox-close" style="position:absolute;top:12px;right:16px;' +
      'background:none;border:none;color:#aaa;font-size:28px;cursor:pointer;z-index:10;">' +
      '&times;</button>' +
      '<div class="lightbox-image" style="width:100%;height:280px;border-radius:16px 16px 0 0;' +
      'display:flex;align-items:center;justify-content:center;font-size:64px;"></div>' +
      '<div class="lightbox-info" style="padding:24px;"></div>' +
      '</div>';
    lightboxEl.addEventListener('click', function (e) {
      if (e.target === lightboxEl || e.target.classList.contains('lightbox-close')) {
        lightboxEl.style.display = 'none';
      }
    });
    document.body.appendChild(lightboxEl);
  }

  function loadGalleryData() {
    galleryData = {
      Characters: getCharacterData(),
      Bosses: getBossData(),
      Worlds: getWorldData(),
      Jobs: getJobData()
    };
    renderGallery();
  }

  function getCharacterData() {
    return [
      { name: 'Mercedes', name_ko: '메르세데스', type: 'Hero', desc: 'Elven Queen and master of Dual Bowguns. One of the legendary Heroes of Maple World.' },
      { name: 'Luminous', name_ko: '루미너스', type: 'Hero', desc: 'Light/Dark Magician who fought against the Black Mage and absorbed his darkness.' },
      { name: 'Phantom', name_ko: '팬텀', type: 'Hero', desc: 'Master thief who can steal and use skills from other adventurers.' },
      { name: 'Aran', name_ko: '아란', type: 'Hero', desc: 'Polearm warrior who lost memories after the battle with the Black Mage.' },
      { name: 'Evan', name_ko: '에반', type: 'Hero', desc: 'Dragon Master who inherits the legacy of Freud, the legendary Dragon Master.' },
      { name: 'Shade', name_ko: '은월', type: 'Hero', desc: 'The forgotten hero who sacrificed his existence to seal the Black Mage.' },
      { name: 'Black Mage', name_ko: '검은 마법사', type: 'Villain', desc: 'The ultimate antagonist of MapleStory, a transcendent being seeking to destroy and recreate the world.' },
      { name: 'Orchid', name_ko: '오키드', type: 'NPC', desc: 'Commander of the Black Wings and twin sister of Lotus.' },
      { name: 'Cygnus', name_ko: '시그너스', type: 'NPC', desc: 'Empress of Ereve and leader of the Cygnus Knights.' },
      { name: 'Maple Admin', name_ko: '관리자', type: 'NPC', desc: 'The ever-helpful administrator of Maple World.' }
    ];
  }

  function getBossData() {
    return [
      { name: 'Zakum', name_ko: '자쿰', type: 'Boss', desc: 'Ancient stone golem of El Nath mines. A classic early-game boss.' },
      { name: 'Horntail', name_ko: '혼테일', type: 'Boss', desc: 'Massive two-headed dragon dwelling deep in the Cave of Life.' },
      { name: 'Pink Bean', name_ko: '핑크빈', type: 'Boss', desc: 'Deceptively cute yet incredibly powerful transcendent being.' },
      { name: 'Lotus', name_ko: '로터스', type: 'Boss', desc: 'Commander of the Black Mage with terrifying telekinetic powers.' },
      { name: 'Damien', name_ko: '데미안', type: 'Boss', desc: 'Half-demon commander who wields the corrupted Transcendence Stone.' },
      { name: 'Lucid', name_ko: '루시드', type: 'Boss', desc: 'Dream manipulator commanding Lachelein and the Nightmare realm.' },
      { name: 'Will', name_ko: '윌', type: 'Boss', desc: 'Manipulator of the Mirror World residing in Esfera.' },
      { name: 'Black Mage', name_ko: '검은 마법사', type: 'Boss', desc: 'The final boss. Transcendent of Light turned to Darkness.' },
      { name: 'Seren', name_ko: '세렌', type: 'Boss', desc: 'Leader of the High Flora in Cernium, immensely powerful.' },
      { name: 'Kalos', name_ko: '칼로스', type: 'Boss', desc: 'Ancient being from the depths of Odium.' }
    ];
  }

  function getWorldData() {
    return [
      { name: 'Henesys', name_ko: '헤네시스', type: 'Town', desc: 'Peaceful mushroom village and the starting hub for many adventurers.' },
      { name: 'Perion', name_ko: '페리온', type: 'Town', desc: 'Rocky warrior settlement built on rugged cliffs.' },
      { name: 'Ellinia', name_ko: '엘리니아', type: 'Town', desc: 'Magical forest town built high in ancient trees.' },
      { name: 'Ludibrium', name_ko: '루디브리엄', type: 'Town', desc: 'Whimsical toy-themed world floating in the sky.' },
      { name: 'Arcane River', name_ko: '아케인 리버', type: 'Region', desc: 'Mystical river connecting Maple World to the Tenebris region.' },
      { name: 'Cernium', name_ko: '세르니움', type: 'Town', desc: 'Holy city in Grandis under siege by the High Flora army.' },
      { name: 'Hotel Arcus', name_ko: '호텔 아르쿠스', type: 'Town', desc: 'Luxurious yet mysterious hotel in Grandis.' },
      { name: 'Odium', name_ko: '오디움', type: 'Region', desc: 'Ancient underground world of forgotten technology.' }
    ];
  }

  function getJobData() {
    return [
      { name: 'Hero', name_ko: '히어로', type: 'Warrior', desc: 'Sword-wielding warrior specializing in powerful combo attacks.' },
      { name: 'Dark Knight', name_ko: '다크나이트', type: 'Warrior', desc: 'Spear/Polearm warrior harnessing the power of darkness.' },
      { name: 'Arch Mage (F/P)', name_ko: '아크메이지(불,독)', type: 'Magician', desc: 'Master of fire and poison magic with devastating DoT skills.' },
      { name: 'Arch Mage (I/L)', name_ko: '아크메이지(썬,콜)', type: 'Magician', desc: 'Ice and lightning mage with strong crowd control abilities.' },
      { name: 'Bowmaster', name_ko: '보우마스터', type: 'Bowman', desc: 'Expert archer with rapid-fire skills and arrow rain.' },
      { name: 'Night Lord', name_ko: '나이트로드', type: 'Thief', desc: 'Throwing star assassin with incredible burst damage.' },
      { name: 'Shadower', name_ko: '섀도어', type: 'Thief', desc: 'Dagger specialist who fights from the shadows.' },
      { name: 'Buccaneer', name_ko: '바이퍼', type: 'Pirate', desc: 'Fist-fighting pirate with transformation abilities.' },
      { name: 'Corsair', name_ko: '캡틴', type: 'Pirate', desc: 'Gun-slinging pirate captain with summon abilities.' },
      { name: 'Adele', name_ko: '아델', type: 'Warrior', desc: 'High Flora knight commanding ethereal swords.' },
      { name: 'Kain', name_ko: '카인', type: 'Bowman', desc: 'Dragging shot specialist with a dark past.' },
      { name: 'Lara', name_ko: '라라', type: 'Magician', desc: 'Nature-attuned magician from Grandis who communicates with spirits.' }
    ];
  }

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var items = galleryData[activeCategory] || [];
    var colors = PLACEHOLDER_COLORS[activeCategory];

    if (items.length === 0) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">' +
        'No items in this category yet.</div>';
      return;
    }

    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'gallery-card';
      card.style.cssText =
        'background:#1a1a2e;border-radius:12px;overflow:hidden;cursor:pointer;' +
        'transition:transform 0.2s,box-shadow 0.2s;border:1px solid rgba(255,255,255,0.08);';

      var initials = item.name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2);

      card.innerHTML =
        '<div style="width:100%;height:140px;background:linear-gradient(135deg,' +
        colors.bg + ',' + colors.accent + ');display:flex;align-items:center;' +
        'justify-content:center;font-size:36px;font-weight:bold;color:rgba(255,255,255,0.7);' +
        'text-shadow:0 2px 8px rgba(0,0,0,0.3);">' + escapeHtml(initials) + '</div>' +
        '<div style="padding:12px;">' +
        '<div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px;' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
        escapeHtml(item.name) + '</div>' +
        (item.name_ko ? '<div style="font-size:11px;color:#888;margin-bottom:8px;">' +
          escapeHtml(item.name_ko) + '</div>' : '') +
        '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;' +
        'background:' + colors.bg + ';color:' + colors.accent + ';border:1px solid ' +
        colors.accent + '50;">' + escapeHtml(item.type) + '</span>' +
        '</div>';

      card.addEventListener('mouseenter', function () {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
      card.addEventListener('click', function () {
        showLightbox(item);
      });

      grid.appendChild(card);
    });
  }

  function showLightbox(item) {
    var colors = PLACEHOLDER_COLORS[activeCategory];
    var imageDiv = lightboxEl.querySelector('.lightbox-image');
    var infoDiv = lightboxEl.querySelector('.lightbox-info');

    var initials = item.name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 3);

    imageDiv.style.background = 'linear-gradient(135deg,' + colors.bg + ',' + colors.accent + ')';
    imageDiv.style.color = 'rgba(255,255,255,0.6)';
    imageDiv.textContent = initials;

    infoDiv.innerHTML =
      '<h2 style="margin:0 0 4px 0;color:#fff;font-size:22px;">' +
      escapeHtml(item.name) + '</h2>' +
      (item.name_ko ? '<p style="margin:0 0 12px 0;color:#888;font-size:14px;">' +
        escapeHtml(item.name_ko) + '</p>' : '') +
      '<div style="margin-bottom:16px;">' +
      '<span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;' +
      'background:' + colors.bg + ';color:' + colors.accent + ';border:1px solid ' +
      colors.accent + ';">' + escapeHtml(item.type) + '</span>' +
      (item.class_type ? '<span style="display:inline-block;padding:4px 12px;border-radius:12px;' +
        'font-size:12px;background:#333;color:#aaa;margin-left:8px;">' +
        escapeHtml(item.class_type) + '</span>' : '') +
      '</div>' +
      (item.desc ? '<p style="color:#ccc;line-height:1.7;font-size:14px;">' +
        escapeHtml(item.desc) + '</p>' : '') +
      (item.level_range ? '<div style="margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.05);' +
        'border-radius:8px;font-size:13px;color:#aaa;">Level Range: ' +
        escapeHtml(item.level_range) + '</div>' : '');

    lightboxEl.style.display = 'flex';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.Gallery = { init: init };
})();
