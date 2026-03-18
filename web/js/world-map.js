/**
 * MapleStory Archive - 3D World Map
 * Three.js powered interactive world map with Maple World and Grandis spheres
 */
(function () {
  'use strict';

  const CONFIG = {
    MAPLE_WORLD_RADIUS: 5,
    GRANDIS_RADIUS: 3.5,
    GRANDIS_OFFSET: { x: 12, y: 1, z: 0 },
    ARCANE_BRIDGE_SEGMENTS: 80,
    STARFIELD_COUNT: 2000,
    DOT_SIZE: 0.12,
    GLOW_SIZE: 0.25,
    CAMERA_DISTANCE: 20,
    ROTATION_SPEED: 0.001,
    COLORS: {
      mapleWorld: 0x2e8b8b,
      grandis: 0xd4622b,
      arcanePath: 0xb366ff,
      starfield: 0xffffff,
      dot: 0xffee88,
      dotGlow: 0xffcc00,
      ambient: 0x404060,
      directional: 0xffffff
    }
  };

  let scene, camera, renderer, animationId;
  let mapleWorldGroup, grandisGroup;
  let worldDots = [];
  let hoveredDot = null;
  let raycaster, mouse;
  let isDragging = false;
  let previousMouse = { x: 0, y: 0 };
  let sphereRotation = { x: 0.3, y: 0 };
  let cameraDistance = CONFIG.CAMERA_DISTANCE;
  let tooltip = null;
  let modalEl = null;
  let worlds = [];

  function init() {
    const container = document.getElementById('panel-world-map');
    if (!container) return;

    container.innerHTML = '';
    setupTooltip(container);
    setupModal(container);
    setupScene(container);
    fetchWorldData();
    animate();
  }

  function setupTooltip(container) {
    tooltip = document.createElement('div');
    tooltip.style.cssText =
      'position:absolute;display:none;background:rgba(0,0,0,0.85);color:#fff;' +
      'padding:8px 14px;border-radius:6px;font-size:13px;pointer-events:none;' +
      'z-index:100;border:1px solid rgba(255,204,0,0.4);white-space:nowrap;' +
      'box-shadow:0 2px 12px rgba(0,0,0,0.5);';
    container.appendChild(tooltip);
  }

  function setupModal(container) {
    modalEl = document.createElement('div');
    modalEl.className = 'world-map-modal';
    modalEl.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;display:none;' +
      'background:rgba(0,0,0,0.7);z-index:1000;justify-content:center;align-items:center;';
    modalEl.innerHTML =
      '<div style="background:#1a1a2e;border-radius:12px;padding:32px;max-width:500px;' +
      'width:90%;color:#fff;position:relative;border:1px solid rgba(255,204,0,0.3);' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.6);">' +
      '<button class="modal-close" style="position:absolute;top:12px;right:16px;' +
      'background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;">&times;</button>' +
      '<div class="modal-body"></div></div>';
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl || e.target.classList.contains('modal-close')) {
        modalEl.style.display = 'none';
      }
    });
    document.body.appendChild(modalEl);
  }

  function setupScene(container) {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 5, cameraDistance);
    camera.lookAt(4, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(CONFIG.COLORS.ambient, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(CONFIG.COLORS.directional, 0.8);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6666ff, 0.4, 50);
    pointLight.position.set(-8, 5, -5);
    scene.add(pointLight);

    createStarfield();
    createMapleWorld();
    createGrandis();
    createArcaneBridge();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mouseleave', function () {
      tooltip.style.display = 'none';
      isDragging = false;
    });

    window.addEventListener('resize', function () {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  function createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.STARFIELD_COUNT * 3);
    const sizes = new Float32Array(CONFIG.STARFIELD_COUNT);

    for (let i = 0; i < CONFIG.STARFIELD_COUNT; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: CONFIG.COLORS.starfield,
      size: 0.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7
    });

    scene.add(new THREE.Points(geometry, material));
  }

  function createSphere(radius, color, emissiveIntensity) {
    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: emissiveIntensity || 0.15,
      transparent: true,
      opacity: 0.55,
      wireframe: false,
      shininess: 30
    });
    const mesh = new THREE.Mesh(geometry, material);

    const wireGeo = new THREE.SphereGeometry(radius * 1.002, 24, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    mesh.add(wireMesh);

    return mesh;
  }

  function createMapleWorld() {
    mapleWorldGroup = new THREE.Group();
    const sphere = createSphere(CONFIG.MAPLE_WORLD_RADIUS, CONFIG.COLORS.mapleWorld, 0.15);
    mapleWorldGroup.add(sphere);

    const ringGeo = new THREE.TorusGeometry(CONFIG.MAPLE_WORLD_RADIUS * 1.3, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x44aaaa,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    mapleWorldGroup.add(ring);

    scene.add(mapleWorldGroup);
  }

  function createGrandis() {
    grandisGroup = new THREE.Group();
    const sphere = createSphere(CONFIG.GRANDIS_RADIUS, CONFIG.COLORS.grandis, 0.2);
    grandisGroup.add(sphere);

    grandisGroup.position.set(
      CONFIG.GRANDIS_OFFSET.x,
      CONFIG.GRANDIS_OFFSET.y,
      CONFIG.GRANDIS_OFFSET.z
    );
    scene.add(grandisGroup);
  }

  function createArcaneBridge() {
    const points = [];
    const start = new THREE.Vector3(
      CONFIG.MAPLE_WORLD_RADIUS * 0.9,
      0.5,
      0
    );
    const end = new THREE.Vector3(
      CONFIG.GRANDIS_OFFSET.x - CONFIG.GRANDIS_RADIUS * 0.9,
      CONFIG.GRANDIS_OFFSET.y - 0.3,
      0
    );
    const midX = (start.x + end.x) / 2;
    const control1 = new THREE.Vector3(midX - 1.5, 3, 1.5);
    const control2 = new THREE.Vector3(midX + 1.5, 3.5, -1.5);
    const curve = new THREE.CubicBezierCurve3(start, control1, control2, end);

    for (let i = 0; i <= CONFIG.ARCANE_BRIDGE_SEGMENTS; i++) {
      points.push(curve.getPoint(i / CONFIG.ARCANE_BRIDGE_SEGMENTS));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: CONFIG.COLORS.arcanePath,
      transparent: true,
      opacity: 0.6
    });
    scene.add(new THREE.Line(geometry, material));

    const particleCount = 40;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const point = curve.getPoint(i / particleCount);
      particlePositions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
      particlePositions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
      particlePositions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: CONFIG.COLORS.arcanePath,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });
    scene.add(new THREE.Points(particleGeometry, particleMaterial));
  }

  function latLngToSpherePosition(lat, lng, radius, groupPosition) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(
      x + (groupPosition ? groupPosition.x : 0),
      y + (groupPosition ? groupPosition.y : 0),
      z + (groupPosition ? groupPosition.z : 0)
    );
  }

  function plotWorldLocations(data) {
    worlds = data || [];

    worldDots.forEach(function (dot) {
      scene.remove(dot.mesh);
      scene.remove(dot.glowMesh);
    });
    worldDots = [];

    worlds.forEach(function (world) {
      var isGrandis = world.region === 'grandis';
      var isArcane = world.region === 'arcane_river';
      var radius = isGrandis ? CONFIG.GRANDIS_RADIUS : CONFIG.MAPLE_WORLD_RADIUS;
      var groupPos = isGrandis ? CONFIG.GRANDIS_OFFSET : { x: 0, y: 0, z: 0 };

      var lat = world.lat != null ? world.lat : (Math.random() - 0.5) * 140;
      var lng = world.lng != null ? world.lng : (Math.random() - 0.5) * 300;

      if (isArcane) {
        var t = world.arcane_position != null ? world.arcane_position : Math.random();
        var start = new THREE.Vector3(CONFIG.MAPLE_WORLD_RADIUS * 0.9, 0.5, 0);
        var end = new THREE.Vector3(
          CONFIG.GRANDIS_OFFSET.x - CONFIG.GRANDIS_RADIUS * 0.9,
          CONFIG.GRANDIS_OFFSET.y - 0.3,
          0
        );
        var midX = (start.x + end.x) / 2;
        var control1 = new THREE.Vector3(midX - 1.5, 3, 1.5);
        var control2 = new THREE.Vector3(midX + 1.5, 3.5, -1.5);
        var curve = new THREE.CubicBezierCurve3(start, control1, control2, end);
        var pos = curve.getPoint(t);

        var dotGeo = new THREE.SphereGeometry(CONFIG.DOT_SIZE, 12, 12);
        var dotMat = new THREE.MeshBasicMaterial({
          color: CONFIG.COLORS.arcanePath,
          transparent: true,
          opacity: 0.95
        });
        var dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.position.copy(pos);
        scene.add(dotMesh);

        var glowGeo = new THREE.SphereGeometry(CONFIG.GLOW_SIZE, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
          color: CONFIG.COLORS.arcanePath,
          transparent: true,
          opacity: 0.25
        });
        var glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.copy(pos);
        scene.add(glowMesh);

        worldDots.push({ mesh: dotMesh, glowMesh: glowMesh, data: world });
      } else {
        var position = latLngToSpherePosition(lat, lng, radius * 1.02, groupPos);

        var dotGeo2 = new THREE.SphereGeometry(CONFIG.DOT_SIZE, 12, 12);
        var dotMat2 = new THREE.MeshBasicMaterial({
          color: CONFIG.COLORS.dot,
          transparent: true,
          opacity: 0.95
        });
        var dotMesh2 = new THREE.Mesh(dotGeo2, dotMat2);
        dotMesh2.position.copy(position);
        scene.add(dotMesh2);

        var glowGeo2 = new THREE.SphereGeometry(CONFIG.GLOW_SIZE, 12, 12);
        var glowMat2 = new THREE.MeshBasicMaterial({
          color: CONFIG.COLORS.dotGlow,
          transparent: true,
          opacity: 0.2
        });
        var glowMesh2 = new THREE.Mesh(glowGeo2, glowMat2);
        glowMesh2.position.copy(position);
        scene.add(glowMesh2);

        worldDots.push({ mesh: dotMesh2, glowMesh: glowMesh2, data: world });
      }
    });
  }

  function fetchWorldData() {
    fetch('/api/worlds/map')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        plotWorldLocations(data.worlds || data);
      })
      .catch(function (err) {
        console.warn('World map data fetch failed, using fallback:', err);
        plotWorldLocations(getFallbackWorlds());
      });
  }

  function getFallbackWorlds() {
    return [
      { name: 'Henesys', name_ko: '헤네시스', region: 'maple_world', level_range: '1-30', lat: 20, lng: -40 },
      { name: 'Perion', name_ko: '페리온', region: 'maple_world', level_range: '15-40', lat: 45, lng: -20 },
      { name: 'Ellinia', name_ko: '엘리니아', region: 'maple_world', level_range: '20-45', lat: 10, lng: 10 },
      { name: 'Kerning City', name_ko: '커닝시티', region: 'maple_world', level_range: '15-40', lat: -15, lng: -50 },
      { name: 'Sleepywood', name_ko: '슬리피우드', region: 'maple_world', level_range: '40-60', lat: -5, lng: -25 },
      { name: 'Ludibrium', name_ko: '루디브리엄', region: 'maple_world', level_range: '60-100', lat: 55, lng: 30 },
      { name: 'Leafre', name_ko: '리프레', region: 'maple_world', level_range: '100-140', lat: -30, lng: 60 },
      { name: 'Temple of Time', name_ko: '시간의 신전', region: 'maple_world', level_range: '140-170', lat: 60, lng: -70 },
      { name: 'Arcane River - Vanishing Journey', name_ko: '소멸의 여로', region: 'arcane_river', level_range: '200-210', arcane_position: 0.1 },
      { name: 'Arcane River - Chu Chu Island', name_ko: '츄츄 아일랜드', region: 'arcane_river', level_range: '210-220', arcane_position: 0.3 },
      { name: 'Arcane River - Lachelein', name_ko: '레헬른', region: 'arcane_river', level_range: '220-225', arcane_position: 0.5 },
      { name: 'Arcane River - Arcana', name_ko: '아르카나', region: 'arcane_river', level_range: '225-230', arcane_position: 0.65 },
      { name: 'Arcane River - Morass', name_ko: '모라스', region: 'arcane_river', level_range: '230-235', arcane_position: 0.8 },
      { name: 'Arcane River - Esfera', name_ko: '에스페라', region: 'arcane_river', level_range: '235-245', arcane_position: 0.95 },
      { name: 'Pantheon', name_ko: '판테온', region: 'grandis', level_range: '100-120', lat: 20, lng: 0 },
      { name: 'Heliseum', name_ko: '헬리시움', region: 'grandis', level_range: '120-150', lat: -10, lng: 40 },
      { name: 'Savage Terminal', name_ko: '새비지 터미널', region: 'grandis', level_range: '150-180', lat: 30, lng: -30 }
    ];
  }

  function onMouseDown(e) {
    isDragging = true;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
  }

  function onMouseMove(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      var deltaX = e.clientX - previousMouse.x;
      var deltaY = e.clientY - previousMouse.y;
      sphereRotation.y += deltaX * 0.005;
      sphereRotation.x += deltaY * 0.005;
      sphereRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, sphereRotation.x));
      previousMouse.x = e.clientX;
      previousMouse.y = e.clientY;
      tooltip.style.display = 'none';
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    var dotMeshes = worldDots.map(function (d) { return d.mesh; });
    var intersects = raycaster.intersectObjects(dotMeshes);

    if (intersects.length > 0) {
      var hitMesh = intersects[0].object;
      var dotEntry = worldDots.find(function (d) { return d.mesh === hitMesh; });
      if (dotEntry) {
        hoveredDot = dotEntry;
        var world = dotEntry.data;
        var label = (world.name_ko ? world.name_ko + ' / ' : '') + world.name;
        if (world.level_range) label += ' (Lv. ' + world.level_range + ')';
        tooltip.textContent = label;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      hoveredDot = null;
      tooltip.style.display = 'none';
      renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.02;
    cameraDistance = Math.max(8, Math.min(50, cameraDistance));
  }

  function onClick() {
    if (hoveredDot) {
      showWorldDetail(hoveredDot.data);
    }
  }

  function showWorldDetail(world) {
    var body = modalEl.querySelector('.modal-body');
    var regionLabel = {
      maple_world: 'Maple World',
      grandis: 'Grandis',
      arcane_river: 'Arcane River'
    };
    var regionColor = {
      maple_world: '#2e8b8b',
      grandis: '#d4622b',
      arcane_river: '#b366ff'
    };

    body.innerHTML =
      '<h2 style="margin:0 0 4px 0;color:#ffcc00;font-size:22px;">' +
      escapeHtml(world.name) + '</h2>' +
      (world.name_ko ? '<p style="margin:0 0 16px 0;color:#aaa;font-size:14px;">' +
        escapeHtml(world.name_ko) + '</p>' : '') +
      '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
      '<span style="background:' + (regionColor[world.region] || '#555') +
      ';padding:4px 10px;border-radius:12px;font-size:12px;">' +
      (regionLabel[world.region] || world.region) + '</span>' +
      (world.level_range ? '<span style="background:#333;padding:4px 10px;border-radius:12px;' +
        'font-size:12px;">Lv. ' + escapeHtml(world.level_range) + '</span>' : '') +
      '</div>' +
      (world.description ? '<p style="color:#ccc;line-height:1.6;">' +
        escapeHtml(world.description) + '</p>' : '') +
      (world.monsters ? '<div style="margin-top:12px;"><strong style="color:#ffcc00;">Monsters:</strong>' +
        '<p style="color:#ccc;">' + escapeHtml(world.monsters) + '</p></div>' : '') +
      (world.npcs ? '<div style="margin-top:8px;"><strong style="color:#ffcc00;">NPCs:</strong>' +
        '<p style="color:#ccc;">' + escapeHtml(world.npcs) + '</p></div>' : '');

    modalEl.style.display = 'flex';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    sphereRotation.y += CONFIG.ROTATION_SPEED;

    camera.position.x = cameraDistance * Math.sin(sphereRotation.y) * Math.cos(sphereRotation.x) + 4;
    camera.position.y = cameraDistance * Math.sin(sphereRotation.x) + 2;
    camera.position.z = cameraDistance * Math.cos(sphereRotation.y) * Math.cos(sphereRotation.x);
    camera.lookAt(4, 0, 0);

    var time = Date.now() * 0.003;
    worldDots.forEach(function (dot, i) {
      var pulse = 0.15 + Math.sin(time + i * 0.5) * 0.1;
      dot.glowMesh.material.opacity = pulse;
      var scale = 1 + Math.sin(time + i * 0.5) * 0.15;
      dot.glowMesh.scale.setScalar(scale);
    });

    renderer.render(scene, camera);
  }

  window.WorldMap = { init: init };
})();
