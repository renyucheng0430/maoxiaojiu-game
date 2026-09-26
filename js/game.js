// ===== 猫小九历险记 - 3D 山谷版（Three.js） =====

(function() {

  // ===== 版本号 =====
  const GAME_VERSION = 'v1.0.0';

  // ===== 存档系统 =====
  const SAVE_KEY = 'mxj_save_v1';
  function saveGame(slotName) {
    const data = {
      version: GAME_VERSION,
      timestamp: Date.now(),
      player: { x: state.player.x, z: state.player.z, face: state.player.face },
      cam: { x: state.cam.x, z: state.cam.z, yaw: state.camYaw, h: state.camH },
      questState: questState,
      claimedQuests: claimedQuests,
      currentLocation: state.currentLocation
    };

  // ===== 游戏设置（持久化到 localStorage） =====
  // 画质预设（必须在 gameSettings 验证之前定义）
  const QUALITY_PRESETS = {
    high:   { pixelRatio: 2, shadowMap: 2048, antialias: true,  fogNear: 62,  fogFar: 255 },
    medium: { pixelRatio: 1.5, shadowMap: 1024, antialias: true,  fogNear: 55,  fogFar: 200 },
    low:    { pixelRatio: 1, shadowMap: 512,  antialias: false, fogNear: 45,  fogFar: 150 }
  };
  const SETTINGS_KEY = 'mxj_settings_v1';
  let gameSettings = { quality: 'high', autosave: true, bgm: true, sfx: true };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    gameSettings = Object.assign(gameSettings, saved);
  if (!QUALITY_PRESETS[gameSettings.quality]) gameSettings.quality = 'high';
  } catch (e) {}
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings)); } catch (e) {}
  }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.player) { state.player.x = data.player.x; state.player.z = data.player.z; state.player.face = data.player.face || 1; }
      if (data.cam) { state.cam.x = data.cam.x; state.cam.z = data.cam.z; state.camYaw = data.cam.yaw || 0; state.camH = data.cam.h || 19; }
      if (data.questState) { questState = data.questState; try { localStorage.setItem('mxj_quest_state_v1', JSON.stringify(questState)); } catch(e){} }
      if (data.claimedQuests) { claimedQuests = data.claimedQuests; try { localStorage.setItem('mxj_claimed_quests_v1', JSON.stringify(claimedQuests)); } catch(e){} }
      if (data.currentLocation) state.currentLocation = data.currentLocation;
      renderQuests(state.currentQuestTab);
      return true;
    } catch (e) { return false; }
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); return true; } catch (e) { return false; }
  }
  function saveInfo() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return { version: d.version, time: new Date(d.timestamp).toLocaleString('zh-CN'), loc: d.currentLocation };
    } catch (e) { return null; }
  }
  'use strict';

  // ===== 游戏状态 =====
  const state = {
    player: { x: -24, z: 20, speed: 0.16, face: 1, isMoving: false, bobT: 0 },
    cam: { x: -24, z: 54 },
    camYaw: 0,          // 环绕视角方位角（拖动屏幕左右）
    camH: 19,           // 相机高度（拖动屏幕上下）
    currentLocation: 'road',
    currentQuestTab: 'main',
    currentModal: null,
    comicViewer: { active: false, chapter: null, page: 0, pages: [] },
    keys: {},
    joystick: { active: false, dx: 0, dy: 0 }
  };

  const CAM_DIST = 30;      // 相机与玩家的水平距离
  const INTERACT_DIST = 3.6;   // E 键交互距离
  const TAP_DIST = 4.5;        // 点击 NPC 对话距离

  // 领奖记录（localStorage 持久化）
  let claimedQuests = [];
  try {
    claimedQuests = JSON.parse(localStorage.getItem('mxj_claimed_quests_v1') || '[]');
  } catch (e) { claimedQuests = []; }

  // 任务状态进度（localStorage 持久化：key → active/locked/completed）
  let questState = {};
  try { questState = JSON.parse(localStorage.getItem('mxj_quest_state_v1') || '{}'); } catch (e) { questState = {}; }
  function qStatus(qid) { return questState[qid] || null; }
  function setQStatus(qid, st) {
    questState[qid] = st;
    try { localStorage.setItem('mxj_quest_state_v1', JSON.stringify(questState)); } catch (e) {}
    if (st === 'completed' && gameSettings.autosave) { try { saveGame(); } catch(e){} }
  }
  // 任务触发条件：到达某区域 / 与某 NPC 对话 时自动结算
  const QUEST_TRIGGER = {
    m1: ['location', 'tribe_square'],
    c1: ['npc', 'elder'],
    c2: ['auto'],
    m2: ['npc', 'mom'],
    s1: ['location', 'home'],
    s3: ['location', 'home'],
    m3: ['location', 'home'],
    m4: ['location', 'home'],
    s2: ['npc', 'bailing'],
    m5: ['npc', 'maomo'],
    c3: ['npc', 'maomo'],
    c4: ['npc', 'maomo'],
    m6: ['location', 'arena'],
    c5: ['location', 'arena'],
    c6: ['location', 'arena'],
    c7: ['location', 'arena'],
    s5: ['location', 'forest']
  };
  const QUEST_AFTER = {
    m1: ['c1'],
    c1: ['c2'],
    c2: ['m2'],
    m2: ['m3', 's1', 's3'],
    m3: ['m4', 's4'],
    m4: ['m5', 's2'],
    m5: ['c3'],
    c3: ['c4'],
    c4: ['m6'],
    m6: ['c5'],
    c5: ['c6'],
    c6: ['c7'],
    c7: ['m7'],
    s1: [], s2: [], s3: [], s4: [], s5: []
  };

  // 触发结算：完成所有"正在进行"且匹配触发条件的任务，并解锁后续
  // 递归解锁：auto 任务立即完成并继续级联
  function unlockAndCascade(qid, finished) {
    if (qStatus(qid)) return;
    setQStatus(qid, 'active');
    const tr = QUEST_TRIGGER[qid];
    if (tr && tr[0] === 'auto') {
      setQStatus(qid, 'completed');
      const q = findQuest(qid);
      if (q) finished.push(q);
      const after = QUEST_AFTER[qid] || [];
      after.forEach(nid => unlockAndCascade(nid, finished));
    }
  }
  function findQuest(qid) {
    for (const type of ['main', 'side', 'challenge']) {
      const q = (GAME_DATA.quests[type] || []).find(x => x.id === qid);
      if (q) return q;
    }
    return null;
  }

  // 触发结算：完成所有"正在进行"且匹配触发条件的任务，并解锁后续
  function fireQuestTrigger(kind, id) {
    const finished = [];
    for (const type of ['main', 'side', 'challenge']) {
      for (const q of (GAME_DATA.quests[type] || [])) {
        const st = qStatus(q.id) || q.status;
        const tr = QUEST_TRIGGER[q.id];
        if (tr && tr[0] === kind && tr[1] === id && st === 'active') {
          setQStatus(q.id, 'completed');
          finished.push(q);
          const after = QUEST_AFTER[q.id] || [];
          after.forEach(nid => unlockAndCascade(nid, finished));
        }
      }
    }
    if (finished.length) {
      finished.forEach((q, i) => {
        setTimeout(() => showNotification('✅ 任务完成：' + q.title), i * 700);
      });
      renderQuests(state.currentQuestTab);
      // m1 完成后：猫长老宣布灵力测试开始
      if (finished.some(q => q.id === 'm1')) {
        setTimeout(() => {
          dialogueState.npc = {
            name: '猫长老',
            lines: [
              { speaker: '猫长老', text: '诸位族人安静！一年一度的灵力修为测试，正式开始！' },
              { speaker: '猫长老', text: '按照惯例，从年龄最小的开始，一个个上前接受测试。' },
              { speaker: '猫长老', text: '猫小九，你第一个上来！' }
            ]
          };
          dialogueState.index = 0;
          showDialogueLine();
          dialogueBox.onclick = nextDialogueLine;
        }, 1200);
      }
    }
  }

  // ===== 山谷分区（半径判定） =====
  const zones = [
    { id: 'home', name: '猫小九的家', x: -30, z: -6, r: 8 },
    { id: 'forest', name: '林间修炼地', x: -24, z: 10, r: 10 },
    { id: 'tribe_square', name: '部落广场', x: 0, z: -18, r: 9 },
    { id: 'road', name: '上学路', x: 0, z: 6, r: 8 },
    { id: 'school', name: '猫族学堂', x: 24, z: -12, r: 8 },
    { id: 'arena', name: '练武场', x: 28, z: 16, r: 9 }
  ];

  // 建筑 / 高台碰撞圈
  const obstacles = [
    { x: -30, z: -6, r: 2.8 },   // 家（木屋）
    { x: 24, z: -12, r: 4.4 },   // 学堂大殿
    { x: 28, z: 18, r: 5.4 },    // 练武石台
    { x: 0, z: -18, r: 4.0 }     // 部落广场台
  ];


  // ===== 自动寻路系统（A* 网格） =====
  const NAV = {
    minX: -46, maxX: 46, minZ: -36, maxZ: 36,
    cell: 2,  // 每格 2 单位
    get cols() { return Math.ceil((this.maxX - this.minX) / this.cell); },
    get rows() { return Math.ceil((this.maxZ - this.minZ) / this.cell); }
  };
  let navGrid = null;
  function buildNavGrid() {
    const cols = NAV.cols, rows = NAV.rows;
    navGrid = new Uint8Array(cols * rows);
    // 标记障碍格
    for (const o of obstacles) {
      const r = o.r + 0.5;  // 留一点余量
      const cx0 = Math.max(0, Math.floor((o.x - r - NAV.minX) / NAV.cell));
      const cx1 = Math.min(cols - 1, Math.floor((o.x + r - NAV.minX) / NAV.cell));
      const cz0 = Math.max(0, Math.floor((o.z - r - NAV.minZ) / NAV.cell));
      const cz1 = Math.min(rows - 1, Math.floor((o.z + r - NAV.minZ) / NAV.cell));
      for (let cz = cz0; cz <= cz1; cz++)
        for (let cx = cx0; cx <= cx1; cx++)
          navGrid[cz * cols + cx] = 1;
    }
  }
  function cellToWorld(cx, cz) {
    return { x: NAV.minX + cx * NAV.cell + NAV.cell / 2, z: NAV.minZ + cz * NAV.cell + NAV.cell / 2 };
  }
  function worldToCell(x, z) {
    return {
      cx: Math.max(0, Math.min(NAV.cols - 1, Math.floor((x - NAV.minX) / NAV.cell))),
      cz: Math.max(0, Math.min(NAV.rows - 1, Math.floor((z - NAV.minZ) / NAV.cell)))
    };
  }
  function isBlocked(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= NAV.cols || cz >= NAV.rows) return true;
    return navGrid[cz * NAV.cols + cx] === 1;
  }
  // A* 寻路，返回世界坐标路径点数组（不含起点）
  function findPath(sx, sz, ex, ez) {
    if (!navGrid) buildNavGrid();
    const cols = NAV.cols, rows = NAV.rows;
    const start = worldToCell(sx, sz), goal = worldToCell(ex, ez);
    if (isBlocked(goal.cx, goal.cz)) {
      // 目标被挡，找最近的可走格
      let best = null, bestD = Infinity;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const nx = goal.cx + dx, nz = goal.cz + dz;
        if (!isBlocked(nx, nz)) {
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = { cx: nx, cz: nz }; }
        }
      }
      if (best) { goal.cx = best.cx; goal.cz = best.cz; } else return null;
    }
    if (start.cx === goal.cx && start.cz === goal.cz) return [];
    const open = [], cameFrom = new Map(), gScore = new Map();
    const key = (cx, cz) => cx + ',' + cz;
    const h = (cx, cz) => Math.abs(cx - goal.cx) + Math.abs(cz - goal.cz);
    open.push({ cx: start.cx, cz: start.cz, f: h(start.cx, start.cz) });
    gScore.set(key(start.cx, start.cz), 0);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let iter = 0;
    while (open.length && iter++ < 5000) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.cx === goal.cx && cur.cz === goal.cz) {
        // 回溯路径
        const path = [];
        let ck = key(cur.cx, cur.cz);
        while (cameFrom.has(ck)) {
          const [cx, cz] = ck.split(',').map(Number);
          path.unshift(cellToWorld(cx, cz));
          ck = cameFrom.get(ck);
        }
        // 简化路径：去掉共线中间点
        if (path.length > 2) {
          const simplified = [path[0]];
          for (let i = 1; i < path.length - 1; i++) {
            const a = simplified[simplified.length - 1], b = path[i], c = path[i + 1];
            const d1x = b.x - a.x, d1z = b.z - a.z;
            const d2x = c.x - b.x, d2z = c.z - b.z;
            if (Math.abs(d1x * d2z - d1z * d2x) > 0.01) simplified.push(b);
          }
          simplified.push(path[path.length - 1]);
          return simplified;
        }
        return path;
      }
      for (const [dx, dz] of dirs) {
        const nx = cur.cx + dx, nz = cur.cz + dz;
        if (isBlocked(nx, nz)) continue;
        // 斜向移动时不能穿墙角
        if (dx !== 0 && dz !== 0 && (isBlocked(cur.cx + dx, cur.cz) || isBlocked(cur.cx, cur.cz + dz))) continue;
        const nk = key(nx, nz);
        const tentative = (gScore.get(key(cur.cx, cur.cz)) || 0) + (dx !== 0 && dz !== 0 ? 1.414 : 1);
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, key(cur.cx, cur.cz));
          gScore.set(nk, tentative);
          if (!open.find(o => o.cx === nx && o.cz === nz))
            open.push({ cx: nx, cz: nz, f: tentative + h(nx, nz) });
        }
      }
    }
    return null;
  }

  // 自动寻路状态
  const autoNav = { active: false, path: [], index: 0, marker: null };
  function startAutoNav(ex, ez) {
    const path = findPath(state.player.x, state.player.z, ex, ez);
    if (!path || path.length === 0) {
      if (path === null) showNotification('无法到达该位置');
      return;
    }
    autoNav.path = path;
    autoNav.index = 0;
    autoNav.active = true;
    // 目的地标记
    if (!autoNav.marker) {
      const ringGeo = new THREE.RingGeometry(0.8, 1.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      autoNav.marker = new THREE.Mesh(ringGeo, ringMat);
      autoNav.marker.rotation.x = -Math.PI / 2;
      autoNav.marker.position.y = 0.05;
      if (outdoorGroup) outdoorGroup.add(autoNav.marker); else scene.add(autoNav.marker);
    }
    autoNav.marker.position.set(ex, 0.05, ez);
    autoNav.marker.visible = true;
  }
  function stopAutoNav() {
    autoNav.active = false;
    autoNav.path = [];
    if (autoNav.marker) autoNav.marker.visible = false;
  }
  const backdropMap = {
    forest: 'assets/images/backdrops/forest.jpg',
    home: 'assets/images/backdrops/home.jpg',
    tribe_square: 'assets/images/backdrops/tribe_square.jpg',
    road: 'assets/images/backdrops/road.jpg',
    school: 'assets/images/backdrops/school_yard.jpg',
    arena: 'assets/images/backdrops/arena.jpg'
  };

  // ===== NPC（坐标与对话均依据48页漫画与4集音频） =====
  // ===== NPC（对话随任务进度变化） =====
  // 对话阶段判定工具
  function phase() {
    if (qStatus('m6') === 'completed') return 'after_fight';
    if (qStatus('m5') === 'completed') return 'before_fight';
    if (qStatus('m4') === 'completed') return 'provocation';
    if (qStatus('m2') === 'completed') return 'training';
    if (qStatus('c1') === 'completed') return 'after_test';
    if (qStatus('m1') === 'completed') return 'testing';
    return 'before_test';
  }
  const npcs = [
    { id: 'mom', name: '妈妈', x: -6, z: -18 },
    { id: 'elder', name: '猫长老', x: 0, z: -14 },
    { id: 'bailing', name: '猫白灵', x: 6, z: -18 },
    { id: 'maomo', name: '猫墨', x: -3, z: -22 },
    { id: 'lele', name: '猫乐乐', x: 3, z: -22 },
    { id: 'tiantian', name: '猫天天', x: 9, z: -20 }
  ];
  // 各阶段对话（按原著情节推进）

  // NPC 各阶段位置（随情节移动）
  const NPC_POSITIONS = {
    before_test: {  // 测试前：齐聚部落广场
      mom: { x: -6, z: -18 }, elder: { x: 0, z: -14 }, bailing: { x: 6, z: -18 },
      maomo: { x: -3, z: -22 }, lele: { x: 3, z: -22 }, tiantian: { x: 9, z: -20 }
    },
    testing: {  // 测试中：围在测试台周围
      mom: { x: -7, z: -16 }, elder: { x: 0, z: -12 }, bailing: { x: 7, z: -16 },
      maomo: { x: -4, z: -20 }, lele: { x: 4, z: -20 }, tiantian: { x: 10, z: -18 }
    },
    after_test: {  // 测试后：嘲笑围观，妈妈走向小九
      mom: { x: -3, z: -16 }, elder: { x: 0, z: -13 }, bailing: { x: 4, z: -16 },
      maomo: { x: -2, z: -19 }, lele: { x: 2, z: -19 }, tiantian: { x: 8, z: -18 }
    },
    training: {  // 苦修期：妈妈回家，其他人在学堂
      mom: { x: -30, z: -4 }, elder: { x: 0, z: -14 }, bailing: { x: 20, z: -10 },
      maomo: { x: 26, z: -8 }, lele: { x: 22, z: -14 }, tiantian: { x: 28, z: -14 }
    },
    provocation: {  // 挑衅期：学堂前，猫墨挡路
      mom: { x: -30, z: -4 }, elder: { x: 0, z: -14 }, bailing: { x: 18, z: -8 },
      maomo: { x: 24, z: -6 }, lele: { x: 22, z: -12 }, tiantian: { x: 27, z: -12 }
    },
    before_fight: {  // 比武前：齐聚练武场
      mom: { x: 22, z: 14 }, elder: { x: 28, z: 10 }, bailing: { x: 34, z: 14 },
      maomo: { x: 28, z: 18 }, lele: { x: 22, z: 20 }, tiantian: { x: 34, z: 20 }
    },
    after_fight: {  // 比武后：震惊围观
      mom: { x: 24, z: 14 }, elder: { x: 28, z: 12 }, bailing: { x: 32, z: 14 },
      maomo: { x: 28, z: 17 }, lele: { x: 24, z: 19 }, tiantian: { x: 32, z: 19 }
    }
  };
  let currentNpcPhase = null;
  function updateNpcPositions() {
    const p = phase();
    if (p === currentNpcPhase) return;
    currentNpcPhase = p;
    const pos = NPC_POSITIONS[p] || NPC_POSITIONS.before_test;
    for (const npc of npcs) {
      const target = pos[npc.id];
      if (target) { npc.tx = target.x; npc.tz = target.z; }
    }
  }
  function lerpNpcPositions() {
    for (const npc of npcs) {
      if (npc.tx !== undefined) {
        npc.x += (npc.tx - npc.x) * 0.03;
        npc.z += (npc.tz - npc.z) * 0.03;
      }
    }
  }
  const NPC_DIALOGUES = {
    mom: {
      before_test: [
        { speaker: '妈妈', text: '小九，今天是灵力测试的日子，妈妈给你做了最爱吃的红烧鱼，吃完了有力气！' },
        { speaker: '妈妈', text: '不管测试结果怎么样，在妈妈心里，你永远是最棒的。' },
        { speaker: '妈妈', text: '爸爸只是去了一个很远的地方，只要小九不放弃，很快就能见到他啦。' }
      ],
      testing: [
        { speaker: '妈妈', text: '小九，快去广场吧，猫长老他们都在等你呢。' },
        { speaker: '妈妈', text: '别紧张，正常发挥就好，妈妈相信你。' }
      ],
      after_test: [
        { speaker: '妈妈', text: '小九，回来啦？别听他们乱说，妈妈知道你已经很努力了。' },
        { speaker: '妈妈', text: '不到一星武者又怎么样？妈妈像你这么大的时候，连灵气都感应不到呢。' },
        { speaker: '妈妈', text: '别哭，孩子。妈妈一直都相信，你一定可以做到的！' }
      ],
      training: [
        { speaker: '妈妈', text: '小九，你最近修炼得好刻苦，妈妈看着都心疼。' },
        { speaker: '妈妈', text: '别人花一小时，你就花两小时，妈妈的小九真是长大了。' },
        { speaker: '妈妈', text: '夜深了，早点休息吧，明天还要继续修炼呢。' }
      ],
      provocation: [
        { speaker: '妈妈', text: '小九，妈妈听说猫墨要和你比武？你可要小心啊。' },
        { speaker: '妈妈', text: '猫墨是五星武者，你……你有把握吗？' },
        { speaker: '妈妈', text: '不管怎么样，安全第一，实在不行就……算了，妈妈相信你有分寸。' }
      ],
      before_fight: [
        { speaker: '妈妈', text: '小九，比武的时候别硬撑，打不过就认输，妈妈不怪你。' },
        { speaker: '妈妈', text: '你能站到比武台上，就已经比很多人勇敢了。' }
      ],
      after_fight: [
        { speaker: '妈妈', text: '小九！你……你赢了？妈妈简直不敢相信！' },
        { speaker: '妈妈', text: '我的小九终于长大了，妈妈好骄傲……（擦眼泪）' },
        { speaker: '妈妈', text: '今晚妈妈做一桌子好菜，好好庆祝一下！' }
      ]
    },
    elder: {
      before_test: [
        { speaker: '猫长老', text: '小九啊，月末猫族圣宗会来部落挑选弟子，你要加把劲儿啊。' },
        { speaker: '猫长老', text: '修炼这事儿急不得，一步一步来，只要不放弃，未来不可限量。' }
      ],
      testing: [
        { speaker: '猫长老', text: '小九，到你了，上来接受测试吧。' },
        { speaker: '猫长老', text: '放轻松，把手放在测灵石上，凝聚你全身的灵力。' }
      ],
      after_test: [
        { speaker: '猫长老', text: '小九，测试结果……不到一星武者。唉，你也别太灰心。' },
        { speaker: '猫长老', text: '老夫观你根骨，并非毫无希望，只是……需要比别人多付出数倍的努力。' },
        { speaker: '猫长老', text: '记住，永不放弃，才是真正的武者之心。' }
      ],
      training: [
        { speaker: '猫长老', text: '小九，你最近修炼很刻苦，老夫都看在眼里。' },
        { speaker: '猫长老', text: '听说你夜里还在独自修炼？好，好啊！有这份毅力，何愁大事不成。' }
      ],
      provocation: [
        { speaker: '猫长老', text: '猫墨那孩子，天赋是好，就是心性太傲。' },
        { speaker: '猫长老', text: '小九，你确定要接受猫墨的挑战？老夫可以帮你推辞。' },
        { speaker: '猫长老', text: '……既然你心意已决，老夫便不多言了。记住，比武第二，安全第一。' }
      ],
      before_fight: [
        { speaker: '猫长老', text: '比武即将开始，双方上台！' },
        { speaker: '猫长老', text: '点到为止，不可伤人性命，违者逐出比武台！' }
      ],
      after_fight: [
        { speaker: '猫长老', text: '这……这怎么可能？不到一星武者，竟然接下了震风拳四式？' },
        { speaker: '猫长老', text: '小九，你……你到底经历了什么？你的灵力……深不可测！' },
        { speaker: '猫长老', text: '好！好啊！我土猫部落，终于又要出一个天才了！' }
      ]
    },
    bailing: {
      before_test: [
        { speaker: '猫白灵', text: '小九！你今天看起来很有精神呢。' },
        { speaker: '猫白灵', text: '今天就是灵力测试了，你紧张吗？我有点紧张呢。' },
        { speaker: '猫白灵', text: '猫爷爷说过，我们土猫部落一定要团结。不管结果怎么样，我都支持你！' }
      ],
      testing: [
        { speaker: '猫白灵', text: '小九，快上去吧，轮到你了！' },
        { speaker: '猫白灵', text: '加油！我相信你一定可以的！' }
      ],
      after_test: [
        { speaker: '猫白灵', text: '小九，你别听他们的，你已经很努力了。' },
        { speaker: '猫白灵', text: '不到一星武者又怎么样？我相信你总有一天会变强的！' },
        { speaker: '猫白灵', text: '别哭啦，我们一起努力，好不好？' }
      ],
      training: [
        { speaker: '猫白灵', text: '小九，你最近好努力啊，每天都修炼到很晚。' },
        { speaker: '猫白灵', text: '我也要向你学习，不能偷懒了！' },
        { speaker: '猫白灵', text: '走吧，我们一起上学去。' }
      ],
      provocation: [
        { speaker: '猫白灵', text: '小九，猫墨他太过分了！你别理他。' },
        { speaker: '猫白灵', text: '你真的要接受他的挑战吗？他可是五星武者啊……' },
        { speaker: '猫白灵', text: '我……我会在台下为你加油的！你一定要小心！' }
      ],
      before_fight: [
        { speaker: '猫白灵', text: '小九，加油！我相信你！' },
        { speaker: '猫白灵', text: '不管结果怎么样，你在我心里都是最棒的！' }
      ],
      after_fight: [
        { speaker: '猫白灵', text: '小九！你太厉害了！你赢了！' },
        { speaker: '猫白灵', text: '我就知道你一定可以的！你是最棒的！' },
        { speaker: '猫白灵', text: '猫墨他……他以后再也不敢欺负你了吧？' }
      ]
    },
    maomo: {
      before_test: [
        { speaker: '猫墨', text: '哼，猫小九，就凭你也来参加测试？别丢人现眼了。' },
        { speaker: '猫墨', text: '我可是五星武者，你连给我提鞋都不配。' },
        { speaker: '猫墨', text: '白灵也是你能靠近的？离她远点！' }
      ],
      testing: [
        { speaker: '猫墨', text: '哼，等着看他出丑吧，肯定连一星都不到。' },
        { speaker: '猫墨', text: '这种废物，也配和我站在同一个广场上？' }
      ],
      after_test: [
        { speaker: '猫墨', text: '哈哈哈！不到一星武者！我就知道！' },
        { speaker: '猫墨', text: '猫小九，我劝你还是去撒泡尿照照自己，就凭你，也配和白灵站在一起？' },
        { speaker: '猫墨', text: '废物就是废物，再怎么修炼也没用！' }
      ],
      training: [
        { speaker: '猫墨', text: '哼，听说那废物最近在拼命修炼？有用吗？' },
        { speaker: '猫墨', text: '再怎么练，也不过是个不到一星的废物罢了。' }
      ],
      provocation: [
        { speaker: '猫墨', text: '猫小九！你敢不敢接受我的挑战？练武场，我等着你！' },
        { speaker: '猫墨', text: '震风拳可是武者五星才能修炼的拳法，整个学堂，只有我猫墨才会！' },
        { speaker: '猫墨', text: '到时候，我要让全族都看看，你这个废物有多不堪一击！' }
      ],
      before_fight: [
        { speaker: '猫墨', text: '猫小九，现在认输还来得及，跪下来求我，我可以考虑下手轻一点。' },
        { speaker: '猫墨', text: '哼，不敢说话了？怕了吧？' }
      ],
      after_fight: [
        { speaker: '猫墨', text: '不……不可能！我的震风拳……竟然被你全部躲过了？' },
        { speaker: '猫墨', text: '你……你到底是什么人？你的灵力……怎么可能这么强？' },
        { speaker: '猫墨', text: '我不信！我不信！我可是五星武者！我怎么会输给你这个废物！' }
      ]
    },
    lele: {
      before_test: [
        { speaker: '猫乐乐', text: '猫墨哥说得对，那废物肯定连一星都不到。' },
        { speaker: '猫乐乐', text: '嘿嘿，等会儿有好戏看了。' }
      ],
      testing: [
        { speaker: '猫乐乐', text: '快上去啊废物，别磨磨蹭蹭的！' },
        { speaker: '猫乐乐', text: '猫墨哥都等急了，赶紧测完滚蛋！' }
      ],
      after_test: [
        { speaker: '猫乐乐', text: '哈哈哈！不到一星！我就知道！' },
        { speaker: '猫乐乐', text: '猫小九，我们都很期待你的"实力"呢~（偷笑）' }
      ],
      training: [
        { speaker: '猫乐乐', text: '听说那废物最近在拼命修炼？笑死我了。' },
        { speaker: '猫乐乐', text: '再练也是废物，白费力气。' }
      ],
      provocation: [
        { speaker: '猫乐乐', text: '猫小九，猫墨哥挑战你，你敢不敢接啊？' },
        { speaker: '猫乐乐', text: '不敢就直说，没人会笑话你的……才怪！哈哈哈！' }
      ],
      before_fight: [
        { speaker: '猫乐乐', text: '还愣着干什么，猫墨哥都等急了，快上台吧！' },
        { speaker: '猫乐乐', text: '等会儿猫墨哥一拳就能把他打飞，大家看好了！' }
      ],
      after_fight: [
        { speaker: '猫乐乐', text: '这……这怎么可能？猫墨哥竟然输了？' },
        { speaker: '猫乐乐', text: '不……不可能的……猫墨哥可是五星武者啊……' }
      ]
    },
    tiantian: {
      before_test: [
        { speaker: '猫天天', text: '听说猫小九连灵气都感应不到，也来参加测试？' },
        { speaker: '猫天天', text: '哼，等着看他出丑吧。' }
      ],
      testing: [
        { speaker: '猫天天', text: '到他了到他了，大家快看！' },
        { speaker: '猫天天', text: '我赌他连半星都不到，有人跟吗？' }
      ],
      after_test: [
        { speaker: '猫天天', text: '听说他连一星武者都不到，也敢来参加测试？' },
        { speaker: '猫天天', text: '哼，等着看他出丑吧！' },
        { speaker: '猫天天', text: '这种废物，简直是我们土猫部落的耻辱。' }
      ],
      training: [
        { speaker: '猫天天', text: '那废物最近好像在拼命修炼？有用吗？' },
        { speaker: '猫天天', text: '天赋不行，再努力也白搭。' }
      ],
      provocation: [
        { speaker: '猫天天', text: '听说猫墨哥要和猫小九比武？这有什么好比的。' },
        { speaker: '猫天天', text: '猫墨哥可是五星武者，一拳就能把他打飞吧。' }
      ],
      before_fight: [
        { speaker: '猫天天', text: '比武要开始了，大家快来看！' },
        { speaker: '猫天天', text: '我赌猫墨哥三招之内解决战斗，有人跟吗？' }
      ],
      after_fight: [
        { speaker: '猫天天', text: '天……天啊！猫小九竟然赢了？' },
        { speaker: '猫天天', text: '他……他不是不到一星武者吗？怎么可能接下震风拳？' },
        { speaker: '猫天天', text: '难道……他一直在隐藏实力？' }
      ]
    }
  };
  function getNPCDialogue(npc) {
    const p = phase();
    const sets = NPC_DIALOGUES[npc.id] || {};
    return sets[p] || sets.before_test || [{ speaker: npc.name, text: '……' }];
  }
  // ===== DOM =====
  const $ = id => document.getElementById(id);
  let questContent, modalOverlay, modalBody, comicViewer, comicImage;
  let dialogueBox, dialogueSpeaker, dialogueText, notification;

  // ===== Three.js 句柄 =====
  let renderer, scene, camera, playerSprite, playerShadow;
  let backdropCyl = null, backdropMat = null;
  let groundMat = null;
  const npcEntries = [];     // { npc, sprite, mat, prompt, shadow }
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  // 贴图缓存（切换区域不重复加载）
  const texCache = {};
  // file:// 双击打开时本地图片会污染 WebGL 纹理；一旦检测到上传异常，整体降级为 canvas 应急贴图
  let tainted = false;

  // file:// 下用原生 <img>（不带 crossOrigin）加载，再包成 THREE.Texture
  function loadTex(url, onOk, onErr) {
    if (texCache[url]) { onOk(texCache[url]); return; }
    const img = new Image();
    img.onload = function() {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const id = ctx.getImageData(0, 0, c.width, c.height);
        const px = id.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
          if (r > 235 && g > 235 && b > 235) { px[i + 3] = 0; continue; }
          if (mn > 190 && mx - mn < 35) {
            const t = (mn - 190) / 50;
            px[i + 3] = Math.max(0, px[i + 3] * (1 - t * 1.2));
          }
        }
        ctx.putImageData(id, 0, 0);
      } catch (e) {}
      const t = new THREE.CanvasTexture(c);
      t.needsUpdate = true;
      texCache[url] = t; onOk(t);
    };
    img.onerror = function() { if (onErr) onErr(); };
    img.src = url;
  }

  // 加载 AI 道具素材（data URI），抠白背景，做成面向相机的 Sprite
  function loadPropSprite(dataUri, scaleX, scaleY, onDone) {
    const img = new Image();
    img.onload = function() {
      const c = document.createElement('canvas');
      const S = 512; c.width = S; c.height = S;
      const ctx = c.getContext('2d');
      const aspect = img.width / img.height;
      let dw = S, dh = S;
      if (aspect > 1) { dh = S / aspect; } else { dw = S * aspect; }
      const ox = (S - dw) / 2, oy = (S - dh) / 2;
      ctx.drawImage(img, ox, oy, dw, dh);
      try {
        const id = ctx.getImageData(0, 0, S, S);
        const px = id.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
          // 纯白直接透明
          if (r > 235 && g > 235 && b > 235) { px[i + 3] = 0; continue; }
          // 近白边缘：按亮度和饱和度渐变透明，去白边
          if (mn > 190 && mx - mn < 35) {
            const t = (mn - 190) / 50;
            px[i + 3] = Math.max(0, px[i + 3] * (1 - t * 1.2));
          }
        }
        ctx.putImageData(id, 0, 0);
      } catch (e) {}
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(scaleX, scaleY, 1);
      onDone(sp);
    };
    img.onerror = function() { onDone(null); };
    img.src = dataUri;
  }
  // ===== 初始化 =====
  function init() {
    questContent = $("quest-content");
    modalOverlay = $("modal-overlay");
    modalBody = $("modal-body");
    comicViewer = $("comic-viewer");
    comicImage = $("comic-image");
    dialogueBox = $("dialogue-box");
    dialogueSpeaker = $("dialogue-speaker");
    dialogueText = $("dialogue-text");
    notification = $("notification");

    // 显示加载界面
    const fb = $("webgl-fallback");
    if (fb) fb.classList.add("show");
    updateLoadText("正在启动游戏", 3);

    // 先让浏览器画出3%，再开始重活
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          if (!initThree()) { updateLoadText("WebGL 初始化失败，请使用 Chrome/Edge/Firefox 现代浏览器", 0); return; }
          // UI 设置（轻量，放在3D之后）
          setupQuestPanel();
          setupMenuButtons();
          setupJoystick();
          setupKeyboard();
          setupComicViewer();
          setupModal();
          setupSettingsPanel();
          updateLocationDisplay();
          setBackdrop("road");
          renderQuests("main");
          $("quest-panel").classList.add("collapsed");
          gameLoop();
          showNotification("拖动屏幕可旋转视角（双击复位）；摇杆或WASD移动，靠近NPC按 E 或点击对话。");
        } catch(err) {
          updateLoadText("初始化出错: " + err.message, 0);
          console.error("INIT ERROR:", err);
        }
      });
    });
  }

  // ===== Three.js 场景 =====
  function initThree() {
    updateLoadText("正在初始化 WebGL 图形引擎…", 8);
    const world = $('game-world');
    try {
      renderer = new THREE.WebGLRenderer({ antialias: QUALITY_PRESETS[gameSettings.quality].antialias });
    } catch (e) {
      showFallback();
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS[gameSettings.quality].pixelRatio));
    world.appendChild(renderer.domElement);
    updateLoadText("正在创建 3D 场景…", 12);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe2ee);
    camera = new THREE.PerspectiveCamera(55, world.clientWidth / world.clientHeight, 0.1, 800);
    camera.position.set(state.cam.x, state.camH, state.cam.z + CAM_DIST);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // 半球环境光（天光偏冷、地面反光偏暖绿）+ 暖色太阳光（投软阴影）
    scene.add(new THREE.AmbientLight(0xffffff, 0.16));
    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x5f7a40, 0.5);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1cf, 0.62);
    sun.position.set(36, 56, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.mapSize.set(QUALITY_PRESETS[gameSettings.quality].shadowMap, QUALITY_PRESETS[gameSettings.quality].shadowMap);
    sun.shadow.camera.top = 64; sun.shadow.camera.bottom = -64;
    sun.shadow.camera.near = 8; sun.shadow.camera.far = 170;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    // 山间薄雾：近实远虚，让 3D 远山与漫画背景画卷自然融合
    scene.fog = new THREE.Fog(0xc4dcec, 62, 255);

    buildWorld();
    buildCharacters();
    setupCameraDrag();
    buildNavGrid();

    // 室外物体打包成一组，进入室内时整体隐藏
    outdoorGroup = new THREE.Group();
    [...scene.children].forEach(o => {
      if (o.isLight) return;
      scene.remove(o); outdoorGroup.add(o);
    });
    scene.add(outdoorGroup);
    scene.add(playerSprite);
    scene.add(playerShadow);
    buildIndoorRoom();

    window.addEventListener('resize', onResize);
    return true;
  }

  function showFallback() {
    const fb = $('webgl-fallback');
    if (fb) fb.classList.add('show');
  }

  // ======================================================================
  //  大世界构建：起伏山谷 + 泥土路网 + 远山 + 漫画画卷穹幕
  //  设计：可行走区域（r<50）保持平缓 y=0，向外逐渐隆起为丘陵群山，
  //  与 backdrops 漫画背景在雾中自然衔接。
  // ======================================================================
  let worldTick = null;
  let wrng = mulberry32(20260919);
  const WT = {};                                       // 共享贴图/材质
  const anim = { flags: [], lanterns: [], butterflies: [], petals: [], clouds: [] };
  const WORLD_ROADS = [];                              // 道路折线（避让与贴花共用）
  const CLEAR_ZONES = [];                              // {x,z,r} 建筑/点位禁种区
  const HUT_DOORS = [];

  const _matCache = {};
  function LM(color, opts) {
    const key = color + '|' + JSON.stringify(opts || {});
    if (!_matCache[key]) _matCache[key] = new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}));
    return _matCache[key];
  }
  function makeMesh(geo, mat, cast, recv) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast !== false;
    m.receiveShadow = recv !== false;
    return m;
  }
  function ctex(size, draw, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function smooth01(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function hash2(ix, iz) {
    let n = (ix * 374761393 + iz * 668265263) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  function terrainNoise(x, z) {
    return vnoise(x * 0.02 + 7, z * 0.02 - 11) * 0.62 + vnoise(x * 0.055, z * 0.055) * 0.38;
  }
  // 远方丘陵高度（村庄内恒为 0）
  const CREEK_PTS = [[46, -60], [45, -30], [47, -6], [44, 18], [47, 40], [50, 60]];
  function segDistXZ(px, pz, pts) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      let t = L2 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = ax + dx * t, cz = az + dz * t;
      best = Math.min(best, Math.hypot(px - cx, pz - cz));
    }
    return best;
  }
  function outerH(x, z) {
    const r = Math.hypot(x, z);
    const e = smooth01(50, 132, r);
    let h = (terrainNoise(x, z) - 0.5) * 17 * e + e * e * 9;
    const groove = 1 - smooth01(1.2, 3.6, segDistXZ(x, z, CREEK_PTS));   // 东边小溪谷底
    const pond = 1 - smooth01(3.5, 6.5, Math.hypot(x - 49, z - 18));
    h *= 1 - Math.max(groove, pond) * 0.96;
    return Math.max(0, h);
  }
  function nearRoad(x, z, pad) {
    for (let i = 0; i < WORLD_ROADS.length; i++) {
      if (segDistXZ(x, z, WORLD_ROADS[i]) < pad) return true;
    }
    return false;
  }
  function nearClear(x, z, extra) {
    for (let i = 0; i < CLEAR_ZONES.length; i++) {
      const c = CLEAR_ZONES[i];
      if (Math.hypot(x - c.x, z - c.z) < c.r + (extra || 0)) return true;
    }
    return false;
  }

  // 分块加载：避免长时间阻塞主线程
  let loadProgress = 0;
  function buildWorld() {
    updateLoadText("正在初始化 3D 引擎…", 5);
    groundMat = LM(0x86b356);
    // 所有构建都异步分帧，避免阻塞主线程导致进度条卡住
    requestAnimationFrame(() => {
        updateLoadText("正在生成地形…", 15);
        buildBackdrop(); buildTerrain(); buildRoadsAndWater();
      updateLoadText('正在构建建筑…', 35);
      buildBuildings();
      buildVillageDetails();
      requestAnimationFrame(() => {
        updateLoadText('正在生成自然环境…', 55);
        buildNature();
        requestAnimationFrame(() => {
          updateLoadText('正在加载道具与装饰…', 75);
          buildProps();
          buildDecor();
          requestAnimationFrame(() => {
            updateLoadText('正在添加动画元素…', 90);
            buildAmbientLife();
            updateLoadText('初始化完成！', 100);
            setTimeout(() => { const fb = $('webgl-fallback'); if (fb) fb.classList.remove('show'); }, 300);
          });
        });
      });
    });
    worldTick = function (t) {
      anim.flags.forEach(f => { f.mesh.rotation.z = Math.sin(t * 2.4 + f.ph) * 0.16; });
      anim.lanterns.forEach(f => { f.mesh.rotation.z = Math.sin(t * 1.25 + f.ph) * 0.045; });
      anim.clouds.forEach(c => {
        c.g.position.x = ((c.x0 + t * c.sp + 135) % 270) - 135;
      });
      anim.butterflies.forEach(b => {
        const a = t * b.sp + b.ph;
        b.sprite.position.set(
          b.cx + Math.cos(a) * b.rx,
          b.y0 + Math.sin(a * 2.1 + b.ph) * 0.45,
          b.cz + Math.sin(a * 1.3) * b.rz
        );
        b.sprite.scale.x = b.sz * (0.35 + Math.abs(Math.sin(t * 13 + b.ph)) * 0.8);
      });
      anim.petals.forEach(p => {
        const cyc = (t * p.sp + p.off) % p.dist;
        p.sprite.position.set(
          p.x + Math.sin(t * 1.4 + p.ph) * 0.7,
          p.yTop - cyc,
          p.z + Math.cos(t * 1.1 + p.ph) * 0.7
        );
      });
    };
  }
  function updateLoadText(msg, pct) {
    loadProgress = pct;
    const fb = $("webgl-fallback");
    if (fb) {
      fb.innerHTML = "<div style=\"font-size:18px;margin-bottom:4px\">" + msg + "</div>" +
        "<div class=\"load-bar-wrap\"><div class=\"load-bar\" style=\"width:" + pct + "%\"></div></div>" +
        "<div class=\"load-pct\">" + pct + "%</div>";
    }
  }
  function buildBackdrop() {
    backdropMat = new THREE.MeshBasicMaterial({ color: 0xa8d4f0, side: THREE.BackSide, fog: false, depthWrite: false });
    backdropCyl = makeMesh(new THREE.CylinderGeometry(236, 236, 150, 56, 1, true), backdropMat, false, false);
    backdropCyl.position.y = 42;
    scene.add(backdropCyl);
  }

  function buildTerrain() {
    // 草地主贴图：草色 + 深浅草叶噪点
    const grassTex = ctex(128, (ctx, s) => {
      const r = mulberry32(7);
      ctx.fillStyle = '#7faf55';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1000; i++) {
        const x = r() * s, y = r() * s;
        const g = 90 + Math.floor(r() * 70);
        ctx.fillStyle = `rgba(${40 + Math.floor(r() * 40)},${g + 40},${40 + Math.floor(r() * 30)},${0.18 + r() * 0.22})`;
        ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
      }
      for (let i = 0; i < 80; i++) {
        const x = r() * s, y = r() * s;
        ctx.strokeStyle = r() > 0.5 ? 'rgba(90,140,60,0.5)' : 'rgba(150,190,90,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
        ctx.stroke();
      }
    }, [34, 34]);
    const innerMat = new THREE.MeshLambertMaterial({ map: grassTex, color: 0xffffff });
    const inner = makeMesh(new THREE.CircleGeometry(52, 72), innerMat, false, true);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.008;
    scene.add(inner);

    // 外围起伏山地（顶点着色：草坡 → 岩灰）
    const SIZE = 360, SEG = 64;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const cGrass = new THREE.Color(0x6d9c46), cGrass2 = new THREE.Color(0x5c8a3c);
    const cRock = new THREE.Color(0x8b93a2), cHigh = new THREE.Color(0xb9c2cf);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = outerH(x, z);
      pos.setY(i, h - 0.05);
      const n = terrainNoise(x * 1.3, z * 1.3);
      tmp.copy(cGrass2).lerp(cGrass, n);
      if (h > 2.5) tmp.lerp(cRock, Math.min(1, (h - 2.5) / 7));
      if (h > 11) tmp.lerp(cHigh, Math.min(0.7, (h - 11) / 8));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const outer = makeMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), false, true);
    scene.add(outer);

    // 远山：多层蓝灰色峰峦，雾中与画卷融为一体
    const mountColors = [0x5f7a96, 0x52708e, 0x6b85a2, 0x48628a];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (wrng() - 0.5) * 0.22;
      const r = 82 + wrng() * 58;
      const h = 24 + wrng() * 40;
      const rad = 16 + wrng() * 15;
      const col = mountColors[Math.floor(wrng() * 3)];
      const m = makeMesh(new THREE.ConeGeometry(rad, h, 5 + Math.floor(wrng() * 3)),
        LM(col), false, false);
      m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
      m.rotation.y = wrng() * Math.PI;
      scene.add(m);
      if (h > 44) {
        const snow = makeMesh(new THREE.ConeGeometry(rad * 0.42, h * 0.3, 5), LM(0xe8edf3), false, false);
        snow.position.set(m.position.x, h - h * 0.15 - 1, m.position.z);
        snow.rotation.y = m.rotation.y;
        scene.add(snow);
      }
    }
  }

  // 沿曲线铺设泥路/溪水条带（边缘自然起伏）
  function addRibbon(points, width, mat, y, seed) {
    const r = mulberry32(seed || 1);
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])));
    const N = 64;
    const verts = [], uvs = [], idx = [];
    let cum = 0, lx = null, lz = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPoint(t);
      const t0 = curve.getPoint(Math.max(0, t - 0.01)), t1 = curve.getPoint(Math.min(1, t + 0.01));
      let dx = t1.x - t0.x, dz = t1.z - t0.z;
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const nx = -dz, nz = dx;
      if (lx !== null) cum += Math.hypot(p.x - lx, p.z - lz);
      lx = p.x; lz = p.z;
      const j1 = 1 + (r() - 0.5) * 0.16, j2 = 1 + (r() - 0.5) * 0.16;
      verts.push(p.x + nx * width / 2 * j1, y, p.z + nz * width / 2 * j1);
      verts.push(p.x - nx * width / 2 * j2, y, p.z - nz * width / 2 * j2);
      uvs.push(0, cum / 2.4, 1, cum / 2.4);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = makeMesh(g, mat, false, true);
    scene.add(m);
    return m;
  }

  function buildRoadsAndWater() {
    // 泥路贴图：土黄 + 碎石 + 车辙压痕
    const dirtTex = ctex(128, (ctx, s) => {
      const r = mulberry32(23);
      ctx.fillStyle = '#b38c5c';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 700; i++) {
        const v = 120 + Math.floor(r() * 80);
        ctx.fillStyle = `rgba(${v + 20},${v - 5},${v - 40},${0.15 + r() * 0.25})`;
        ctx.fillRect(r() * s, r() * s, 1 + r() * 2.5, 1 + r() * 2.5);
      }
      ctx.fillStyle = 'rgba(120,90,55,0.18)';
      ctx.fillRect(s * 0.24, 0, s * 0.16, s);
      ctx.fillRect(s * 0.60, 0, s * 0.16, s);
    }, [1, 1]);
    const roadMat = new THREE.MeshLambertMaterial({ map: dirtTex, color: 0xffffff });
    const R = [
      [[-30, -6], [-22, -5], [-12, -3], [0, 6]],                       // 家 → 路口
      [[0, 6], [10, 1], [18, -4], [24, -7.4]],                          // 上学路
      [[0, 6], [10, 10], [18, 15], [28, 24], [28, 26.9]],               // 路口 → 练武台
      [[0, 6], [0, 0], [0, -11.4]],                                     // 路口 → 部落牌坊
      [[-24, 10], [-14, 9], [0, 6]],                                    // 修炼林 → 路口
      [[0, -12.6], [-8, -13.8], [-13, -15]],                            // 广场环道
      [[0, -12.6], [8, -13.8], [13, -15]],
      [[0, -12.6], [0, -19], [0, -24]],
      [[-12, -24], [0, -24], [12, -24]],
      [[-13, -15], [-15, -17], [-16, -19]],
      [[13, -15], [15, -17], [16, -19]],
      [[-10, -30], [0, -31], [10, -30]],
      [[0, -24], [0, -28], [0, -30.6]],
      [[31.5, 18], [38, 18], [43.2, 18]]                                // 村东 → 溪桥
    ];
    R.forEach((pts, i) => { addRibbon(pts, i < 5 ? 2.5 : 1.9, roadMat, 0.02, 100 + i); WORLD_ROADS.push(pts); });

    // 东边小溪（村外）+ 溪塘
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x5d8fb5, transparent: true, opacity: 0.78, emissive: 0x1c3a52, emissiveIntensity: 0.35
    });
    addRibbon(CREEK_PTS, 3.4, waterMat, 0.015, 777);
    const pond = makeMesh(new THREE.CircleGeometry(5.4, 28), waterMat, false, false);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(49, 0.016, 18);
    scene.add(pond);
    // 木桥
    const bridge = new THREE.Group();
    const deckMat = LM(0x8a5e38);
    for (let i = 0; i < 8; i++) {
      const plank = makeMesh(new THREE.BoxGeometry(3.2, 0.12, 0.42), deckMat, true, true);
      plank.position.set(0, 0.12, (i - 3.5) * 0.46);
      bridge.add(plank);
    }
    [-1.45, 1.45].forEach(sx => {
      const rail = makeMesh(new THREE.BoxGeometry(0.1, 0.5, 3.6), LM(0x6e482a), true, true);
      rail.position.set(sx, 0.42, 0);
      bridge.add(rail);
    });
    bridge.position.set(44, outerH(44, 18), 18);
    scene.add(bridge);
    // 环绕部落的河流（环形水面）
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x4f8fc4, transparent: true, opacity: 0.85, emissive: 0x1c3a52, emissiveIntensity: 0.3
    });
    const riverRing = new THREE.Mesh(
      new THREE.RingGeometry(50, 58, 64),
      riverMat
    );
    riverRing.rotation.x = -Math.PI / 2;
    riverRing.position.y = 0.02;
    scene.add(riverRing);
  }

  // 檐下红灯笼（挂绳 + 金盖 + 流苏），随风微摆
  function hangingLantern(s) {
    const g = new THREE.Group();
    const rope = makeMesh(new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.5 * s, 5), LM(0x54331a), false, false);
    rope.position.y = -0.25 * s; g.add(rope);
    const capT = makeMesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 0.08 * s, 6), LM(0xd9b24a), false, false);
    capT.position.y = -0.52 * s; g.add(capT);
    const body = makeMesh(new THREE.SphereGeometry(0.26 * s, 10, 8),
      LM(0xd94a3a, { emissive: 0x8a2014, emissiveIntensity: 0.55 }), false, false);
    body.position.y = -0.78 * s; body.scale.y = 0.9; g.add(body);
    const capB = makeMesh(new THREE.CylinderGeometry(0.11 * s, 0.08 * s, 0.07 * s, 6), LM(0xd9b24a), false, false);
    capB.position.y = -1.02 * s; g.add(capB);
    const tassel = makeMesh(new THREE.CylinderGeometry(0.02 * s, 0.035 * s, 0.16 * s, 5), LM(0xd9b24a), false, false);
    tassel.position.y = -1.14 * s; g.add(tassel);
    anim.lanterns.push({ mesh: g, ph: wrng() * 7 });
    return g;
  }

  // AI 道具立绘批量布置（PROP_DATA 缺失或加载失败时退回几何体）
  function placePropSet(key, spots, w, h, fallback, opts) {
    opts = opts || {};
    function put(sp) {
      if (!sp) { if (fallback) fallback(spots); return; }
      spots.forEach((p, i) => {
        const s = sp.clone();
        const sc = 1 - (opts.jitter || 0) + wrng() * (opts.jitter || 0) * 2;
        s.scale.set(w * sc * (opts.flip && wrng() > 0.5 ? -1 : 1), h * sc, 1);
        s.position.set(p[0], h * sc / 2 - 0.06, p[1]);
        scene.add(s);
        if (opts.obstacleR) obstacles.push({ x: p[0], z: p[1], r: opts.obstacleR });
      });
    }
    if (typeof PROP_DATA !== 'undefined' && PROP_DATA[key]) {
      loadPropSprite(PROP_DATA[key], w, h, put);
    } else if (fallback) {
      fallback(spots);
    }
  }

  // 几何树兜底（大树冠 / 松树两层）
  function geoTree(x, z, pine) {
    const g = new THREE.Group();
    const trunk = makeMesh(new THREE.CylinderGeometry(0.16, 0.3, 2.2, 7), LM(0x6b4430));
    trunk.position.y = 1.1; g.add(trunk);
    if (pine) {
      [[1.6, 2.6, 1.5], [1.2, 3.8, 1.2], [0.8, 4.8, 0.9]].forEach(a => {
        const c = makeMesh(new THREE.ConeGeometry(a[0], a[2], 7), LM(0x3f6b35));
        c.position.y = a[1]; g.add(c);
      });
    } else {
      [[0, 3.0, 1.4], [0.7, 2.5, 1.0], [-0.6, 2.6, 0.95]].forEach(a => {
        const b = makeMesh(new THREE.IcosahedronGeometry(a[2], 1), LM(0x4a7c3f));
        b.position.set(a[0], a[1], 0); b.scale.y = 0.85; g.add(b);
      });
    }
    g.position.set(x, 0, z);
    g.rotation.y = wrng() * 6.28;
    scene.add(g);
  }

  // ===== 零散道具：练功桩 / 柴堆 / 水缸 =====
  function buildProps() {
    // 练武场西侧练功木人
    [12, 15, 18].forEach(z => {
      const d = new THREE.Group();
      const body = makeMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 7), LM(0x8a6a44));
      body.position.y = 0.9; d.add(body);
      const head = makeMesh(new THREE.SphereGeometry(0.26, 8, 6), LM(0xb98a63));
      head.position.y = 1.95; d.add(head);
      [-0.4, 0.4].forEach(dx => {
        const arm = makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), LM(0x8a6a44));
        arm.rotation.z = dx > 0 ? -1.2 : 1.2;
        arm.position.set(dx, 1.45, 0); d.add(arm);
      });
      d.position.set(19.6, 0, z);
      scene.add(d);
      obstacles.push({ x: 19.6, z: z, r: 0.5 });
    });
    // 家旁柴堆
    const wood = new THREE.Group();
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const log = makeMesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 7), LM(0x8a5e38));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.14 + row * 0.23, i * 0.28 + row * 0.14);
        wood.add(log);
      }
    }
    wood.position.set(-26.6, 0, -2.9);
    wood.rotation.y = 0.6;
    scene.add(wood);
    obstacles.push({ x: -26.6, z: -2.9, r: 0.7 });
    // 水缸
    const vat = makeMesh(new THREE.CylinderGeometry(0.42, 0.34, 0.62, 10), LM(0x7d7468));
    vat.position.set(-33.6, 0.31, -7.6);
    scene.add(vat);
    const vatRim = makeMesh(new THREE.TorusGeometry(0.42, 0.05, 6, 12), LM(0x6b625a));
    vatRim.rotation.x = Math.PI / 2;
    vatRim.position.set(-33.6, 0.63, -7.6);
    scene.add(vatRim);
    obstacles.push({ x: -33.6, z: -7.6, r: 0.55 });
    // AI 立绘：练武场牌楼
    if (typeof PROP_DATA !== 'undefined' && PROP_DATA.arch) {
      loadPropSprite(PROP_DATA.arch, 6.5, 4.5, function(sp) {
        sp.position.set(28, 2.2, 12.2);
        scene.add(sp);
        obstacles.push({ x: 28, z: 12.2, r: 1.2 });
      });
    }
    // AI 立绘：水井（部落广场旁）
    if (typeof PROP_DATA !== 'undefined' && PROP_DATA.well) {
      loadPropSprite(PROP_DATA.well, 2.6, 2.0, function(sp) {
        sp.position.set(5.5, 0.95, -15.5);
        scene.add(sp);
        obstacles.push({ x: 5.5, z: -15.5, r: 0.7 });
      });
    }
    // 主路两侧石灯笼（AI精模）
    const lanternSpots = [[-8,4.5],[-8,7.5],[8,4.5],[8,7.5],[0,-14],[0,-20],[0,-26]];
    lanternSpots.forEach(p => {
      if (typeof PROP_DATA !== 'undefined' && PROP_DATA.stoneLantern2) {
        loadPropSprite(PROP_DATA.stoneLantern2, 1.2, 1.6, function(sp) {
          sp.position.set(p[0], 0.8, p[1]);
          scene.add(sp);
        });
      }
    });
    // 修炼山旁小瀑布（AI精模）
    if (typeof PROP_DATA !== 'undefined' && PROP_DATA.waterfall) {
      loadPropSprite(PROP_DATA.waterfall, 4, 3.2, function(sp) {
        sp.position.set(-30, 1.6, 8);
        scene.add(sp);
      });
    }
  }
  // ===== 自然环境：AI 立绘树林 / 石灯 / 猫形石桩 / 花草 =====
  function buildNature() {
    // --- 布点（避路、避建筑） ---
    const pineSpots = [], sakuraSpots = [], treeSpots = [], bushSpots = [], rockSpots = [];
    // 修炼林（森林区）松树
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + wrng() * 0.5;
      const r = 4 + wrng() * 7.5;
      const x = -24 + Math.cos(a) * r, z = 10 + Math.sin(a) * r;
      if (nearRoad(x, z, 3.0) || nearClear(x, z, 1.2)) continue;
      pineSpots.push([x, z]);
    }
    // 上学路樱花（p29 粉色花枝）+ 学堂前两株
    for (let i = 0; i < 8; i++) {
      const t = 0.14 + i * 0.11;
      const x = 0 + 24 * t, z = 6 - 13.4 * t;
      const side = i % 2 ? 1 : -1;
      const sx = x + side * (2.8 + wrng() * 0.8), sz = z + (wrng() - 0.5) * 1.2;
      if (nearClear(sx, sz, 0.8)) continue;
      sakuraSpots.push([sx, sz]);
    }
    sakuraSpots.push([19.4, -6.2], [28.6, -6.4]);
    // 全村散树（大树为主）
    let guard = 0;
    while (treeSpots.length < 22 && guard++ < 300) {
      const a = wrng() * Math.PI * 2, r = 12 + wrng() * 36;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (nearRoad(x, z, 3.4) || nearClear(x, z, 1.8)) continue;
      if (Math.hypot(x + 24, z - 10) < 12) continue;   // 避开松林
      if (Math.abs(x) < 3 && z > -13 && z < 8) continue; // 避开主路口
      treeSpots.push([x, z]);
    }
    guard = 0;
    while (bushSpots.length < 14 && guard++ < 200) {
      const a = wrng() * Math.PI * 2, r = 7 + wrng() * 40;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (nearRoad(x, z, 2.4) || nearClear(x, z, 1.0)) continue;
      bushSpots.push([x, z]);
    }
    guard = 0;
    while (rockSpots.length < 9 && guard++ < 200) {
      const a = wrng() * Math.PI * 2, r = 9 + wrng() * 38;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (nearRoad(x, z, 2.6) || nearClear(x, z, 1.0)) continue;
      rockSpots.push([x, z]);
    }

    // --- AI 立绘布置（缺失时几何兜底） ---
    placePropSet('pine', pineSpots, 3.4, 4.6, s => s.forEach(p => geoTree(p[0], p[1], true)), { jitter: 0.14 });
    placePropSet('sakura', sakuraSpots, 3.8, 4.4, s => s.forEach(p => geoTree(p[0], p[1], false)), { jitter: 0.12 });
    placePropSet('tree', treeSpots, 4.2, 4.8,
      s => s.forEach(p => geoTree(p[0], p[1], wrng() > 0.5)), { jitter: 0.18, flip: true });
    placePropSet('bush', bushSpots, 1.5, 1.1,
      s => s.forEach(p => {
        const b = makeMesh(new THREE.IcosahedronGeometry(0.45 + wrng() * 0.25, 1), LM(0x5d9448));
        b.position.set(p[0], 0.35, p[1]); b.scale.y = 0.8; scene.add(b);
      }), { jitter: 0.2 });
    placePropSet('rock', rockSpots, 1.3, 1.0,
      s => s.forEach(p => {
        const r = makeMesh(new THREE.IcosahedronGeometry(0.45 + wrng() * 0.3, 0), LM(0x9aa0a8));
        r.position.set(p[0], 0.28, p[1]); r.rotation.set(wrng() * 3, wrng() * 3, wrng() * 3);
        scene.add(r);
      }), { jitter: 0.25 });

    // --- 石灯笼（漫画场景灯具）：村门/学堂/练武场/广场 ---
    const lanternSpots = [
      [-3.1, -9.4], [3.1, -9.4],        // 部落牌坊
      [21.6, -7.4], [26.4, -7.4],       // 学堂门前
      [23.7, 25.7], [32.3, 25.7],       // 练武场牌坊
      [-2.5, -13.6], [2.5, -13.6]       // 广场前小径
    ];
    placePropSet('stoneLantern', lanternSpots, 1.0, 1.5, s => s.forEach(p => {
      const g = new THREE.Group();
      const base = makeMesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), LM(0x9aa0a8));
      base.position.y = 0.09; g.add(base);
      const pole = makeMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.7, 6), LM(0xb2b8c0));
      pole.position.y = 0.5; g.add(pole);
      const light = makeMesh(new THREE.BoxGeometry(0.34, 0.32, 0.34),
        LM(0xffd98a, { emissive: 0x7a5a10, emissiveIntensity: 0.6 }));
      light.position.y = 1.0; g.add(light);
      const cap = makeMesh(new THREE.ConeGeometry(0.34, 0.26, 4), LM(0x8a92a0));
      cap.position.y = 1.3; cap.rotation.y = Math.PI / 4; g.add(cap);
      g.position.set(p[0], 0, p[1]);
      scene.add(g);
    }), { obstacleR: 0.45 });

    // --- 猫形石桩（p5/p36 部落图腾柱）：练武场四角 + 村门两侧 ---
    const catSpots = [
      [18.6, 8.6], [37.4, 8.6], [18.6, 27.4], [37.4, 27.4],
      [-3.0, -12.9], [3.0, -12.9]
    ];
    placePropSet('catStatue', catSpots, 0.95, 2.0, s => s.forEach(p => {
      const g = new THREE.Group();
      const base = makeMesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), LM(0xb2aa9c));
      base.position.y = 0.15; g.add(base);
      const col = makeMesh(new THREE.CylinderGeometry(0.18, 0.22, 1.3, 8), LM(0xd8d2c2));
      col.position.y = 0.95; g.add(col);
      const head = makeMesh(new THREE.SphereGeometry(0.3, 10, 8), LM(0xd8d2c2));
      head.position.y = 1.8; g.add(head);
      [-0.16, 0.16].forEach(dx => {
        const ear = makeMesh(new THREE.ConeGeometry(0.11, 0.22, 4), LM(0xd8d2c2));
        ear.position.set(dx, 2.08, 0); g.add(ear);
      });
      g.position.set(p[0], 0, p[1]);
      scene.add(g);
    }), { obstacleR: 0.5 });

    // --- 村口牌坊（p6 土猫部落入口） ---
    (function () {
      const g = new THREE.Group();
      const red = LM(0xb23a2a), dark = LM(0x54331a), stone = LM(0xb2aa9c);
      [-1.75, 1.75].forEach(dx => {
        const foot = makeMesh(new THREE.CylinderGeometry(0.3, 0.36, 0.4, 8), stone);
        foot.position.set(dx, 0.2, 0); g.add(foot);
        const col = makeMesh(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 10), red);
        col.position.set(dx, 2.0, 0); g.add(col);
      });
      const beam = makeMesh(new THREE.BoxGeometry(4.9, 0.5, 0.55), dark);
      beam.position.y = 3.7; g.add(beam);
      const roof = makeMesh(new THREE.ConeGeometry(3.3, 1.1, 4), LM(0x5d6878));
      roof.rotation.y = Math.PI / 4; roof.scale.z = 0.42;
      roof.position.y = 4.5; g.add(roof);
      const c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#43290f'; ctx.fillRect(0, 0, 256, 96);
      ctx.strokeStyle = '#d9b24a'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 80);
      ctx.fillStyle = '#f0c95a';
      ctx.font = 'bold 52px "KaiTi","STKaiti","Microsoft YaHei",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('土猫部落', 128, 50);
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      const pl = makeMesh(new THREE.PlaneGeometry(3.3, 0.72),
        new THREE.MeshLambertMaterial({ map: t, transparent: true }), false, false);
      pl.position.set(0, 3.7, 0.3); g.add(pl);
      g.position.set(0, 0, -11.6);
      scene.add(g);
      obstacles.push({ x: -1.75, z: -11.6, r: 0.35 });
      obstacles.push({ x: 1.75, z: -11.6, r: 0.35 });
    })();

    // --- 白雏菊 / 野花 / 草丛（p3 林间地被） ---
    const daisyTex = ctex(64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.fillStyle = k % 2 ? '#ffffff' : '#fff2f6';
        ctx.beginPath();
        ctx.ellipse(32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12, 9, 5, a, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#f5c542';
      ctx.beginPath(); ctx.arc(32, 32, 6, 0, 7); ctx.fill();
    });
    const daisyMat = new THREE.SpriteMaterial({ map: daisyTex, transparent: true });
    const flowerColors = [0xff8fa3, 0xffd24d, 0xff9a3d, 0xc58bff];
    const flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
    const flowerMats = flowerColors.map(c => new THREE.MeshLambertMaterial({ color: c }));
    const stemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.3, 4);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4e7d33 });
    guard = 0;
    let placed = 0;
    while (placed < 46 && guard++ < 500) {
      const a = wrng() * Math.PI * 2, r = 5 + wrng() * 42;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (nearRoad(x, z, 1.9) || nearClear(x, z, 0.6)) continue;
      placed++;
      if (wrng() < 0.4) {
        const cl = 0.22 + wrng() * 0.16;
        const d = new THREE.Sprite(daisyMat);
        d.scale.set(cl, cl, 1);
        d.position.set(x, cl / 2 + 0.1, z);
        scene.add(d);
      } else {
        const f = new THREE.Group();
        const st = new THREE.Mesh(stemGeo, stemMat);
        st.position.y = 0.15; f.add(st);
        const pe = new THREE.Mesh(flowerGeo, flowerMats[Math.floor(wrng() * flowerMats.length)]);
        pe.position.y = 0.33; f.add(pe);
        f.position.set(x, 0, z);
        scene.add(f);
      }
    }
    guard = 0; placed = 0;
    const grassGeo = new THREE.ConeGeometry(0.14, 0.45, 4);
    const grassMats2 = [0x6fa63f, 0x7fb849, 0x5d9136].map(c => new THREE.MeshLambertMaterial({ color: c }));
    while (placed < 130 && guard++ < 900) {
      const a = wrng() * Math.PI * 2, r = 4 + wrng() * 44;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (nearRoad(x, z, 1.7) || nearClear(x, z, 0.4)) continue;
      placed++;
      const gme = new THREE.Mesh(grassGeo, grassMats2[placed % 3]);
      gme.position.set(x, 0.22, z);
      gme.rotation.y = wrng() * Math.PI;
      scene.add(gme);
    }
  }

  // ===== 环境动效：流云 / 蝴蝶 / 飘落花瓣 =====
  function buildAmbientLife() {
    // 流云（低多边形云团，缓慢漂移）
    const cloudMat = LM(0xffffff, { transparent: true, opacity: 0.88, fog: false });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(wrng() * 3);
      for (let k = 0; k < n; k++) {
        const s = makeMesh(new THREE.SphereGeometry(1.4 + wrng() * 1.6, 8, 6), cloudMat, false, false);
        s.position.set(k * 1.9 - n * 0.95 + (wrng() - 0.5), (wrng() - 0.5) * 0.7, (wrng() - 0.5) * 1.8);
        s.scale.y = 0.55;
        c.add(s);
      }
      c.position.set((wrng() - 0.5) * 240, 30 + wrng() * 16, (wrng() - 0.5) * 200);
      scene.add(c);
      anim.clouds.push({ g: c, x0: c.position.x, sp: 0.5 + wrng() * 0.7 });
    }

    // 橙黑花纹蝴蝶（p3）：canvas 翅膀，花丛间飞舞
    const bfTex = ctex(64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      // 左右翅膀
      [[16, 1], [48, -1]].forEach(w => {
        ctx.save();
        ctx.translate(w[0], 30);
        ctx.scale(w[1], 1);
        ctx.fillStyle = '#e88a1f';
        ctx.beginPath();
        ctx.ellipse(0, -8, 13, 10, 0.35, 0, 7); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2, 8, 9, 7, -0.3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -8, 13, 10, 0.35, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(2, 8, 9, 7, -0.3, 0, 7); ctx.stroke();
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath(); ctx.arc(6, -8, 3, 0, 7); ctx.fill();
        ctx.restore();
      });
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(30, 18, 4, 26);
    });
    const bfHots = [
      [-24, 10], [-20, 14], [8, -2], [18, -6], [26, 8], [-28, -2]
    ];
    bfHots.forEach(h => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bfTex, transparent: true }));
      const sz = 0.5 + wrng() * 0.25;
      sp.scale.set(sz, sz, 1);
      sp.position.set(h[0], 1.4, h[1]);
      scene.add(sp);
      anim.butterflies.push({
        sprite: sp, cx: h[0], cz: h[1], rx: 1.6 + wrng() * 1.6, rz: 1.4 + wrng() * 1.4,
        y0: 1.1 + wrng() * 0.9, sz: sz, sp: 0.5 + wrng() * 0.5, ph: wrng() * 7
      });
    });

    // 樱花瓣飘落（上学路，p29）
    const petalTex = ctex(24, (ctx) => {
      ctx.clearRect(0, 0, 24, 24);
      ctx.fillStyle = '#ffb7c9';
      ctx.beginPath();
      ctx.ellipse(12, 12, 8, 5, 0.6, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(11, 11, 4, 2.4, 0.6, 0, 7);
      ctx.fill();
    });
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: petalTex, transparent: true, opacity: 0.95 }));
      const s = 0.16 + wrng() * 0.12;
      sp.scale.set(s, s, 1);
      const x = 2 + wrng() * 20, z = -7 + wrng() * 12;
      sp.position.set(x, 2.5, z);
      scene.add(sp);
      anim.petals.push({
        sprite: sp, x: x, z: z, yTop: 2.6 + wrng() * 1.3,
        dist: 3.2 + wrng() * 2.2, sp: 0.24 + wrng() * 0.22, off: wrng() * 10, ph: wrng() * 7
      });
    }
  }

  // 远山 / 树 / 灌木 / 云
  function buildDecor() {
    const rng = mulberry32(42);
    // 远山由画卷穹幕提供，不再用圆锥山遮挡

    const greens = [0x4a7c3f, 0x5d9448, 0x3f6b35, 0x6aa64b];
    function makeTree(x, z, s) {
      const g = new THREE.Group();
      // 更高的树干
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 2.2 * s, 7),
        new THREE.MeshLambertMaterial({ color: 0x6b4430 })
      );
      trunk.position.y = 1.1 * s;
      g.add(trunk);
      // 大而圆的层叠树冠（漫画风格）
      const blobs = 4;
      for (let k = 0; k < blobs; k++) {
        const r = (1.0 + (k === 0 ? 0.5 : 0) + rng() * 0.3) * s;
        const blob = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 2),
          new THREE.MeshLambertMaterial({ color: greens[Math.floor(rng() * greens.length)] })
        );
        const ang = (k / blobs) * Math.PI * 2;
        blob.position.set(Math.cos(ang) * 0.5 * s, (2.3 + k * 0.35 + rng() * 0.2) * s, Math.sin(ang) * 0.5 * s);
        blob.scale.y = 0.85;
        g.add(blob);
      }
      g.position.set(x, 0, z);
      g.rotation.y = rng() * Math.PI * 2;
      scene.add(g);
    }
    const treeSpots = [
      [-34, 6], [-28, 14], [-20, 16], [-30, 16], [-18, 8],
      [-12, -4], [10, -10], [14, 4], [-8, 16], [8, 18],
      [20, 8], [-36, -14], [16, -26], [-16, -18],
      [-22, -10], [12, 22], [30, 4], [-6, 22], [18, -22],
      [-38, 0], [26, 26], [-14, 24], [6, -24], [-24, -22]
    ];
    // AI 大树 Sprite 替换几何树
    loadPropSprite(PROP_DATA.tree, 4.2, 4.8, function(sp) {
      if (!sp) { treeSpots.forEach(p => makeTree(p[0], p[1], 1.2)); return; }
      treeSpots.forEach(p => {
        const s = sp.clone();
        const sc = 0.9 + rng() * 0.6;
        s.scale.set(4.2 * sc, 4.8 * sc, 1);
        s.position.set(p[0], 2.2 * sc, p[1]);
        scene.add(s);
      });
    });

    for (let i = 0; i < 22; i++) {
      const r = 0.4 + rng() * 0.4;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
        new THREE.MeshLambertMaterial({ color: greens[Math.floor(rng() * greens.length)] }));
      b.position.set((rng() - 0.5) * 80, r * 0.6, (rng() - 0.5) * 60);
      scene.add(b);
    }

    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.2 + rng() * 1.2, 8, 6), cloudMat);
        s.position.set(k * 1.6 - n * 0.8 + (rng() - 0.5), (rng() - 0.5) * 0.6, (rng() - 0.5) * 1.5);
        s.scale.y = 0.55;
        c.add(s);
      }
      c.position.set((rng() - 0.5) * 120, 26 + rng() * 12, (rng() - 0.5) * 100);
      scene.add(c);
    }

    // 山脉：部落坐落在山谷之中——一圈高大层叠青山环抱，远蓝近绿，带岩顶
    const mtnColors = [0x6f8fb5, 0x7fa0c4, 0x5f7fa8, 0x8fb0cf, 0x7a9ac0];
    const mtnRock = 0xb9c2cf;
    const mountainSpots = [
      [-60,-55],[-80,-30],[-85,0],[-75,35],[-55,65],[-25,85],[15,88],[55,75],
      [80,45],[88,10],[82,-30],[60,-60],[25,-80],[-15,-82],[-50,-70],[-90,-5],
      [-35,-78],[40,-78],[-70,55],[70,55]
    ];
    mountainSpots.forEach((p, i) => {
      const h = 26 + rng() * 22;
      const r = 12 + rng() * 8;
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 5),
        new THREE.MeshLambertMaterial({ color: mtnColors[i % mtnColors.length] })
      );
      body.position.y = h / 2 - 1;
      g.add(body);
      // 岩石峰顶
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.32, h * 0.28, 5),
        new THREE.MeshLambertMaterial({ color: mtnRock })
      );
      cap.position.y = h - 1 + h * 0.14;
      g.add(cap);
      g.position.set(p[0], 0, p[1]);
      g.rotation.y = rng() * Math.PI;
      scene.add(g);
    });

    // ===== 林间修炼地：一座特别的山，山顶开辟空地，中央放一块大青石 =====
    const cx = -24, cz = 10;
    const pg = new THREE.Group();
    // 山体（缓坡大锥，顶部平）
    // 山体（缓坡大山，顶部平）— 加高到28，远看就是一座独立山峰
    const peak = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 11, 22, 7),
      new THREE.MeshLambertMaterial({ color: 0x6d9c46 })
    );
    peak.position.y = 10;
    pg.add(peak);
    // 山顶空地平台（草色圆盘）
    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.3, 0.6, 7),
      new THREE.MeshLambertMaterial({ color: 0x86b356 })
    );
    plat.position.y = 21.6;
    pg.add(plat);
    // 中央大青石（AI精模Sprite）
    if (typeof PROP_DATA !== 'undefined' && PROP_DATA.bluestone) {
      loadPropSprite(PROP_DATA.bluestone, 3.2, 2.6, function(sp) {
        sp.position.set(cx, 23.2, cz);
        scene.add(sp);
      });
    }
    // 平台边缘竹林（AI精模）
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const bx = cx + Math.cos(a) * 3.6;
      const bz = cz + Math.sin(a) * 3.6;
      if (typeof PROP_DATA !== 'undefined' && PROP_DATA.bamboo) {
        loadPropSprite(PROP_DATA.bamboo, 1.8, 2.6, function(sp) {
          sp.position.set(bx, 22.6, bz);
          scene.add(sp);
        });
      }
    }

  }
  // 建筑：学堂大殿 / 小九家 / 练武场 / 部落广场（按漫画风格细化）
  function buildBuildings() {
    const greyRoof = 0x6e7a8c;   // 青灰瓦
    const greyRoof2 = 0x5d6878;
    const woodWarm = 0xc79a6b;
    const woodDark = 0x7a4a2b;
    const redCol = 0xb23a2a;
    const stone = 0xb8b0a4;
    const stoneDark = 0x9a9288;

    // 中式庑殿顶（四棱锥压扁，青瓦色）
    function hipRoof(w, d, h, color) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, h, 4),
        new THREE.MeshLambertMaterial({ color: color || greyRoof }));
      m.rotation.y = Math.PI / 4;
      m.scale.z = d / w;
      return m;
    }

    // ===== 学堂大殿（中式厅堂） =====
    const school = new THREE.Group();
    // 石台基
    const schBase = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.6, 7.5),
      new THREE.MeshLambertMaterial({ color: stone }));
    schBase.position.y = 0.3;
    school.add(schBase);
    // 木墙身
    const schBody = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.8, 6),
      new THREE.MeshLambertMaterial({ color: woodWarm }));
    schBody.position.y = 2.0;
    school.add(schBody);
    // 前廊红柱
    for (let i = -2; i <= 2; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.9, 8),
        new THREE.MeshLambertMaterial({ color: redCol }));
      col.position.set(i * 1.9, 2.0, 3.05);
      school.add(col);
    }
    // 大门
    const schDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x5a3a22 }));
    schDoor.position.set(0, 1.6, 3.08);
    school.add(schDoor);
    // 门前石阶
    const schStep = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 0.9),
      new THREE.MeshLambertMaterial({ color: stoneDark }));
    schStep.position.set(0, 0.13, 3.6);
    school.add(schStep);
    // 青瓦大屋顶 + 小屋脊
    const roof = hipRoof(9.6, 7.2, 1.8, greyRoof);
    roof.position.y = 4.3;
    school.add(roof);
    const roofTop = hipRoof(5.4, 4.2, 1.1, greyRoof2);
    roofTop.position.y = 5.6;
    school.add(roofTop);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xd9b24a }));
    finial.position.y = 6.3;
    school.add(finial);
    school.position.set(24, 0, -12);
    scene.add(school);
    loadPropSprite(PROP_DATA.school, 8, 6.5, function(sp) {
      if (!sp) return;
      sp.position.set(24, 3.1, -12);
      scene.add(sp);
    });

    // ===== 小九家（两层木屋，灰瓦） =====
    const home = new THREE.Group();
    const hBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 3.6),
      new THREE.MeshLambertMaterial({ color: stone }));
    hBase.position.y = 0.2;
    home.add(hBase);
    const hLower = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.9, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xb98a63 }));
    hLower.position.y = 1.35;
    home.add(hLower);
    const hUpper = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.8),
      new THREE.MeshLambertMaterial({ color: 0xc79a6b }));
    hUpper.position.y = 2.9;
    home.add(hUpper);
    // 双开木门 + 门环
    const hDoor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x6b4426 }));
    hDoor.position.set(0, 1.2, 1.72);
    home.add(hDoor);
    [-0.45, 0.45].forEach(dx => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12),
        new THREE.MeshLambertMaterial({ color: 0xd9b24a }));
      ring.position.set(dx, 1.25, 1.8);
      home.add(ring);
    });
    // 亮窗
    const hWin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xffe9a8 }));
    hWin.position.set(-1.3, 2.9, 1.42);
    home.add(hWin);
    const hStep = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.8),
      new THREE.MeshLambertMaterial({ color: stoneDark }));
    hStep.position.set(0, 0.11, 2.1);
    home.add(hStep);
    const hRoof = hipRoof(4.4, 3.8, 1.5, greyRoof);
    hRoof.position.y = 4.3;
    home.add(hRoof);
    home.position.set(-30, 0, -6);
    scene.add(home);
    // AI 中式房子 Sprite 覆盖在几何房子上
    loadPropSprite(PROP_DATA.house, 6.5, 5.5, function(sp) {
      if (!sp) return;
      sp.position.set(-30, 2.6, -6);
      scene.add(sp);
    });
    // 旁侧小屋
    const shed = new THREE.Group();
    const shedB = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2),
      new THREE.MeshLambertMaterial({ color: 0xcbb89a }));
    shedB.position.y = 0.75;
    shed.add(shedB);
    const shedR = hipRoof(2.4, 2.2, 1.0, greyRoof2);
    shedR.position.y = 2.25;
    shed.add(shedR);
    shed.position.set(-34.5, 0, -3);
    scene.add(shed);

    // ===== 练武场（石砖方台 + 红柱 + 看台 + 牌楼） =====
    const arena = new THREE.Group();
    const aBase = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 12),
      new THREE.MeshLambertMaterial({ color: stone }));
    aBase.position.y = 0.3;
    arena.add(aBase);
    const aTile = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.08, 10.4),
      new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }));
    aTile.position.y = 0.64;
    arena.add(aTile);
    // 四柱
    [[-4.6, -4.6], [4.6, -4.6], [-4.6, 4.6], [4.6, 4.6]].forEach(p => {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.4, 8),
        new THREE.MeshLambertMaterial({ color: stoneDark }));
      plinth.position.set(p[0], 0.8, p[1]);
      arena.add(plinth);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 8),
        new THREE.MeshLambertMaterial({ color: redCol }));
      pillar.position.set(p[0], 2.1, p[1]);
      arena.add(pillar);
    });
    // 两侧石阶看台
    for (let side = -1; side <= 1; side += 2) {
      for (let s = 0; s < 3; s++) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3 * (s + 1), 9),
          new THREE.MeshLambertMaterial({ color: stoneDark }));
        seat.position.set(side * (6.2 + s * 1.1), 0.15 * (s + 1), 0);
        arena.add(seat);
      }
    }
    // 后方牌楼
    const gate = new THREE.Group();
    [-2.2, 2.2].forEach(gx => {
      const gc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.2, 8),
        new THREE.MeshLambertMaterial({ color: redCol }));
      gc.position.set(gx, 1.6, -5.2);
      gate.add(gc);
    });
    const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 0.6),
      new THREE.MeshLambertMaterial({ color: woodDark }));
    gateBeam.position.set(0, 3.0, -5.2);
    gate.add(gateBeam);
    const gateRoof = hipRoof(5.6, 1.6, 0.9, greyRoof);
    gateRoof.position.y = 3.8;
    gate.add(gateRoof);
    arena.add(gate);
    arena.position.set(28, 0, 18);
    scene.add(arena);

    // ===== 部落广场（石台 + 图腾 + 旗） =====
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: stone }));
    dais.position.set(0, 0.25, -18);
    scene.add(dais);
    const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a5a3a }));
    totem.position.set(0, 1.8, -18);
    scene.add(totem);
    const totemTop = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 6),
      new THREE.MeshLambertMaterial({ color: 0xd94a3a }));
    totemTop.position.set(0, 3.9, -18);
    scene.add(totemTop);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 5),
        new THREE.MeshLambertMaterial({ color: 0x8a6a44 }));
      post.position.set(Math.cos(a) * 5.6, 0.55, -18 + Math.sin(a) * 5.6);
      scene.add(post);
    }
  }

  // 村落细节：红灯笼 + 更多木屋 + 水井 + 练功桩（把土猫部落做大）
  function buildVillageDetails() {
    const rng = mulberry32(99);
    const redMat = new THREE.MeshLambertMaterial({ color: 0xd94a3a });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xd9b24a });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xb98a63 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b4a3a });

    // 红灯笼：沿主路与部落广场布置
    function lantern(x, z, s) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.09 * s, 2.4 * s, 6), poleMat);
      pole.position.y = 1.2 * s;
      g.add(pole);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35 * s, 10, 8), redMat);
      body.position.y = 2.5 * s;
      body.scale.y = 0.85;
      g.add(body);
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.1 * s, 6), goldMat);
      capT.position.y = 2.85 * s;
      g.add(capT);
      const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.08 * s, 6), goldMat);
      capB.position.y = 2.15 * s;
      g.add(capB);
      g.position.set(x, 0, z);
      scene.add(g);
    }
    // 沿广场一圈
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      lantern(Math.cos(a) * 7.5, -18 + Math.sin(a) * 7.5, 1.0);
    }
    // 沿上学路两侧
    for (let i = 1; i <= 4; i++) {
      lantern(-1.6, 6 - i * 3.2, 0.9);
      lantern(1.6, 6 - i * 3.2, 0.9);
    }
    // 家与学堂门口
    lantern(-32, -8, 1.0); lantern(22, -14, 1.0); lantern(26, 16, 1.0);

    // 部落周围更多小木屋（把部落做大）
    function smallHut(x, z, rot) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.4), woodMat);
      body.position.y = 0.9;
      g.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 4), roofMat);
      roof.position.y = 2.4;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x4a3220 }));
      door.position.set(0, 0.55, 1.21);
      g.add(door);
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      scene.add(g);
    }
    // 部落环广场一圈小木屋
    const hutSpots = [
      [-12,-24,0.4],[12,-24,-0.4],[-13,-15,1.2],[13,-15,-1.0],
      [-10,-30,0.8],[10,-30,-0.8],[0,-33,Math.PI],
      [-16,-19,1.5],[16,-19,-1.5],[-9,-10,0.3],[9,-10,-0.3],
      [-20,-8,0.5],[20,-6,-0.5],[-18,-28,1.0],[18,-27,-1.0],
      [-5,-28,0.9],[5,-28,-0.9]
    ];
    hutSpots.forEach(s => smallHut(s[0], s[1], s[2]));

    // 广场水井
    const well = new THREE.Group();
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.7, 10),
      new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
    wellBase.position.y = 0.35;
    well.add(wellBase);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 4), roofMat);
    wellRoof.position.y = 1.6;
    wellRoof.rotation.y = Math.PI / 4;
    well.add(wellRoof);
    well.position.set(-3.5, 0, -20);
    scene.add(well);

    // 练武场练功桩（木人）
    for (let i = 0; i < 3; i++) {
      const dummy = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6), poleMat);
      dummy.position.set(24 + i * 1.5, 0.9, 21);
      scene.add(dummy);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), woodMat);
      head.position.set(24 + i * 1.5, 1.9, 21);
      scene.add(head);
    }

    // AI 小木屋 Sprite 覆盖
    loadPropSprite(PROP_DATA.hut, 3.4, 3.0, function(sp) {
      if (!sp) return;
      const hutSpots = [
        [-12,-24],[12,-24],[-13,-15],[13,-15],[-10,-30],[10,-30],[0,-33],
        [-16,-19],[16,-19],[-9,-10],[9,-10],[-20,-8],[20,-6],[-18,-28],[18,-27]
      ];
      hutSpots.forEach(p => {
        const s = sp.clone();
        s.scale.set(3.2 + Math.random()*0.8, 2.8 + Math.random()*0.6, 1);
        s.position.set(p[0], 1.5, p[1]);
        scene.add(s);
      });
    });
    // AI 红灯笼 Sprite 成排
    loadPropSprite(PROP_DATA.lantern, 1.0, 1.3, function(sp) {
      if (!sp) return;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const s = sp.clone();
        s.scale.set(0.9, 1.1, 1);
        s.position.set(Math.cos(a) * 7.5, 2.6, -18 + Math.sin(a) * 7.5);
        scene.add(s);
      }
    });
  }

  // 角色（漫画立绘 billboard + 地面阴影 + 交互提示）
  function buildCharacters() {
    // 玩家
    const pMat = new THREE.SpriteMaterial({ transparent: true });
    playerSprite = new THREE.Sprite(pMat);
    playerSprite.scale.set(1.7, 2.2, 1);
    playerSprite.position.set(state.player.x, 1.1, state.player.z);
    scene.add(playerSprite);
    playerShadow = makeShadow(1.0);
    playerShadow.position.set(state.player.x, 0.03, state.player.z);
    scene.add(playerShadow);
    loadTex(SPRITE_DATA.xiaojiu,
      t => { pMat.map = t; pMat.needsUpdate = true; },
      () => {});

    // NPC
    npcs.forEach(npc => {
      const mat = new THREE.SpriteMaterial({ transparent: true });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(1.6, 2.1, 1);
      sp.position.set(npc.x, 1.05, npc.z);
      sp.userData.npcId = npc.id;
      scene.add(sp);

      const label = makeLabelSprite(npc.name);
      label.position.set(npc.x, 2.7, npc.z);
      scene.add(label);

      const prompt = makePromptSprite();
      prompt.position.set(npc.x, 3.5, npc.z);
      prompt.visible = false;
      scene.add(prompt);

      const shadow = makeShadow(0.9);
      shadow.position.set(npc.x, 0.03, npc.z);
      scene.add(shadow);

      npcEntries.push({ npc, sprite: sp, mat, prompt, shadow, label });
      loadTex(SPRITE_DATA[npc.id],
        t => { mat.map = t; mat.needsUpdate = true; },
        () => {});
    });
  }

  function makeShadow(r) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24),
      new THREE.MeshBasicMaterial({ color: 0x16240f, transparent: true, opacity: 0.28, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  // 名牌（canvas 文字 sprite）
  function makeLabelSprite(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 34px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const pad = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, 128 - w / 2 - pad, 12, w + pad * 2, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sp.scale.set(2.2, 0.55, 1);
    sp.renderOrder = 10;
    return sp;
  }

  // “按 E 对话”气泡提示
  function makePromptSprite() {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    const text = '💬 按 E 对话';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const pad = 26;
    ctx.fillStyle = 'rgba(245,166,35,0.92)';
    roundRect(ctx, 150 - w / 2 - pad, 8, w + pad * 2, 60, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 150, 40);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sp.scale.set(2.6, 0.7, 1);
    sp.renderOrder = 11;
    return sp;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // file:// 纹理污染降级：canvas 应急立绘（canvas 不跨域，绝不会污染 WebGL）
  function fallbackPortrait(name, fur) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 176;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 176);
    ctx.fillStyle = fur;
    // 猫耳
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(48, 8); ctx.lineTo(62, 34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(88, 40); ctx.lineTo(80, 8); ctx.lineTo(66, 34); ctx.closePath(); ctx.fill();
    // 头
    ctx.beginPath(); ctx.arc(64, 58, 30, 0, Math.PI * 2); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath(); ctx.arc(53, 58, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(75, 58, 3.5, 0, Math.PI * 2); ctx.fill();
    // 身体（修行服）
    ctx.fillStyle = '#8a7a66';
    ctx.beginPath();
    ctx.moveTo(64, 84); ctx.lineTo(36, 150); ctx.lineTo(92, 150); ctx.closePath(); ctx.fill();
    // 名字
    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(name).width + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, 64 - w / 2, 150, w, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 64, 163);
    return new THREE.CanvasTexture(c);
  }

  function degradeTextures() {
    tainted = true;
    if (groundMat) { groundMat.map = null; groundMat.color.set(0x6fae4e); groundMat.needsUpdate = true; }
    if (scene) scene.background = new THREE.Color(0xaedcff);
    if (playerSprite) { playerSprite.material.map = fallbackPortrait('猫小九', '#f2a65a'); playerSprite.material.needsUpdate = true; }
    npcEntries.forEach(e => {
      e.mat.map = fallbackPortrait(e.npc.name, '#b9a38a');
      e.mat.needsUpdate = true;
    });
  }

  // 远景画卷（base64，切区域不重复加载）
  function setBackdrop(locId) {
    const url = BACKDROP_DATA[locId] || BACKDROP_DATA.road;
    loadTex(url,
      t => { if (t) t.encoding = THREE.sRGBEncoding; if (backdropMat && !tainted) { backdropMat.map = t; backdropMat.needsUpdate = true; } },
      () => { if (scene && !tainted) scene.background = new THREE.Color(0xaedcff); });
  }

  function onResize() {
    const world = $('game-world');
    const w = world.clientWidth, h = world.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // 跨平台：屏幕旋转 / 标签页隐藏
  window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { lastFrameTime = 0; }
    else { lastFrameTime = performance.now(); }
  });

  // ===== 拖动旋转视角 / 点击 NPC（按位移区分，双击复位） =====
  function setupCameraDrag() {
    const el = renderer.domElement;
    let dragging = false, sx = 0, sy = 0, moved = false, t0 = 0;
    let suppressTapUntil = 0;

    el.addEventListener('pointerdown', e => {
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY; t0 = Date.now();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      if (moved) {
        state.camYaw += dx * 0.008;
        state.camH = Math.max(14, Math.min(40, state.camH + dy * 0.04));
      }
      sx = e.clientX; sy = e.clientY;
    });
    const up = e => {
      if (!dragging) return;
      dragging = false;
      if (!moved && Date.now() - t0 < 500 && Date.now() > suppressTapUntil) onCanvasClick(e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { dragging = false; });
    el.addEventListener('dblclick', () => {
      state.camYaw = 0;
      state.camH = 24;
      suppressTapUntil = Date.now() + 300;   // 双击产生的 click 不再触发对话
    });
  }

  function onCanvasClick(e) {
    if (inIndoor) return;  // 室内不寻路
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    // 先检测 NPC
    const npcHits = raycaster.intersectObjects(npcEntries.map(e => e.sprite));
    if (npcHits.length) {
      const npc = npcs.find(n => n.id === npcHits[0].object.userData.npcId);
      if (npc) {
        const d = Math.hypot(state.player.x - npc.x, state.player.z - npc.z);
        if (d > TAP_DIST) {
          // 太远：自动寻路过去
          startAutoNav(npc.x, npc.z);
          showNotification(`正在前往${npc.name}处…`);
        } else {
          stopAutoNav();
          startDialogue(npc);
        }
        return;
      }
    }
    // 点击地面：自动寻路
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      const x = Math.max(NAV.minX + 1, Math.min(NAV.maxX - 1, hitPoint.x));
      const z = Math.max(NAV.minZ + 1, Math.min(NAV.maxZ - 1, hitPoint.z));
      startAutoNav(x, z);
    }
  }
  // ===== 任务面板（收起 + 领奖自动消失） =====
  function setupQuestPanel() {
    document.querySelectorAll('.quest-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.quest-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderQuests(tab.dataset.type);
      });
    });
    $('quest-header').addEventListener('click', () => {
      $('quest-panel').classList.toggle('collapsed');
    });
  }

  // ===== 任务详情：类型 / 地点 / 章节 映射 =====
  const QUEST_TYPE_NAMES = { main: '主线任务', side: '支线任务', challenge: '挑战任务' };
  // 主线与挑战任务没有 location 字段，按剧情在此补全（支线任务自带 location）
  const QUEST_LOCATION_MAP = {
    m1: 'tribe_square', m2: 'tribe_square', m3: 'pendant_dimension',
    m4: 'home', m5: 'school_yard', m6: 'arena', m7: '',
    c1: 'tribe_square', c2: 'tribe_square', c3: 'school_yard',
    c4: 'school_yard', c5: 'arena', c6: 'arena', c7: 'arena'
  };
  // 地点 id → 山谷分区 id（用于"你当前就在这里"提示）
  const LOC_TO_ZONE = { school_yard: 'school', road_to_school: 'road' };
  function getQuestLocationId(q) {
    return q.location || QUEST_LOCATION_MAP[q.id] || '';
  }
  function chapterName(ch) {
    if (ch === 0) return '序章·风暴前夕';
    return ch ? `第 ${ch} 章` : '';
  }
  function allQuests() {
    return ['main', 'side', 'challenge'].flatMap(t => GAME_DATA.quests[t] || []);
  }
  function es(q) { return qStatus(q.id) || q.status; }

  function renderQuests(type) {
    state.currentQuestTab = type;
    const quests = (GAME_DATA.quests[type] || []).filter(q => {
      return !(es(q) === 'completed' && claimedQuests.indexOf(q.id) !== -1);
    });
    questContent.innerHTML = quests.map(q => `
      <div class="quest-item ${es(q)}" data-id="${q.id}" title="点击查看任务详情">
        <div class="quest-title">
          ${es(q) === 'completed' ? '✅' : es(q) === 'active' ? '⭐' : '🔒'}
          <span class="quest-title-text">${q.title}</span>
          <span class="quest-status ${es(q)}">${es(q) === 'completed' ? '已完成' : es(q) === 'active' ? '进行中' : '未解锁'}</span>
        </div>
        <div class="quest-desc">${q.description}</div>
        ${q.condition ? `<div class="quest-condition">🎯 完成条件：${q.condition}</div>` : ``}
        <div class="quest-more">查看详情 ›</div>
      </div>
    `).join('') || '<div style="text-align:center;color:#999;font-size:12px;padding:12px;">暂无任务</div>';

    // 点击任务卡片 → 弹出任务详情（地点/奖励/描述）
    questContent.querySelectorAll('.quest-item').forEach(item => {
      item.addEventListener('click', () => openQuestDetail(state.currentQuestTab, item.dataset.id));
    });
  }

  // ===== 任务详情弹窗 =====
  function openQuestDetail(type, qid) {
    const q = (GAME_DATA.quests[type] || []).find(x => x.id === qid);
    if (!q) return;
    state.currentModal = 'questDetail';
    state.questDetail = { type, qid };
    $('modal-title').textContent = '📜 任务详情';
    modalBody.innerHTML = renderQuestDetail(type, q);
    modalOverlay.classList.add('show');
    bindQuestDetailEvents();
  }

  function renderQuestDetail(type, q) {
    const st = es(q);
    const statusText = st === 'completed' ? '已完成' : st === 'active' ? '进行中' : '未解锁';
    const locId = getQuestLocationId(q);
    const loc = locId ? GAME_DATA.locations[locId] : null;
    const zoneId = LOC_TO_ZONE[locId] || locId;
    const here = loc && zoneId === state.currentLocation;
    const claimed = claimedQuests.indexOf(q.id) !== -1;
    const ch = chapterName(q.chapter);

    let footer = '';
    if (st === 'completed') {
      footer = claimed
        ? `<div class="qdetail-claimed">✓ 奖励已领取</div>`
        : `<button class="quest-claim-btn qdetail-claim" data-claim="${q.id}">🎁 领取任务奖励</button>`;
    } else if (st === 'active') {
      footer = `<div class="qdetail-ongoing">🏃 任务进行中，达成目标后即可领取奖励</div>`;
    } else {
      footer = `<div class="qdetail-lock">🔒 完成前置任务后解锁</div>`;
    }

    return `
      <div class="qdetail">
        <div class="qdetail-badges">
          <span class="qdetail-type qdetail-type-${type}">${QUEST_TYPE_NAMES[type]}</span>
          <span class="qdetail-status ${st}">${statusText}</span>
        </div>
        <h3 class="qdetail-title">${q.title}</h3>
        <div class="qdetail-meta">
          <div class="qdetail-meta-row">
            <span class="qdetail-meta-label">📍 任务地点</span>
            <span class="qdetail-meta-value">${loc ? loc.name + (here ? '<em class="qdetail-here">你当前就在这里</em>' : '') : '❓ 未知之地'}</span>
          </div>
          ${ch ? `<div class="qdetail-meta-row"><span class="qdetail-meta-label">📖 所属章节</span><span class="qdetail-meta-value">${ch}</span></div>` : ''}
        </div>
        <div class="qdetail-section">
          <div class="qdetail-section-label">📝 任务描述</div>
          <div class="qdetail-section-text">${q.description}</div>
        </div>
        <div class="qdetail-section">
          <div class="qdetail-section-label">🎁 任务奖励</div>
          <div class="qdetail-reward">${q.reward || '暂无奖励（荣誉之战）'}</div>
        </div>
        ${q.result ? `<div class="qdetail-section"><div class="qdetail-section-label">📊 挑战结果</div><div class="qdetail-section-text">${q.result}</div></div>` : ''}
        ${footer}
      </div>`;
  }

  function bindQuestDetailEvents() {
    const btn = modalBody.querySelector('.qdetail-claim');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const qid = btn.dataset.claim;
      const q = allQuests().find(x => x.id === qid);
      if (!q || claimedQuests.indexOf(qid) !== -1) return;
      btn.disabled = true;
      btn.textContent = '领取中…';
      setTimeout(() => {
        claimedQuests.push(qid);
        try { localStorage.setItem('mxj_claimed_quests_v1', JSON.stringify(claimedQuests)); } catch (e) {}
        renderQuests(state.currentQuestTab);
        // 详情弹窗内同步刷新为"已领取"状态
        if (state.currentModal === 'questDetail' && state.questDetail && state.questDetail.qid === qid) {
          const cur = allQuests().find(x => x.id === qid);
          modalBody.innerHTML = renderQuestDetail(state.questDetail.type, cur);
          bindQuestDetailEvents();
        }
        showNotification(`已领取奖励：${q.reward || q.title}`);
      }, 420);
    });
  }

  // ===== 菜单按钮 =====
  function setupMenuButtons() {
    const buttons = [
      { id: 'btn-bag', panel: 'bag' },
      { id: 'btn-profile', panel: 'profile' },
      { id: 'btn-cultivation', panel: 'cultivation' },
      { id: 'btn-relationships', panel: 'relationships' },
      { id: 'btn-chapters', panel: 'chapters' },
      { id: 'btn-settings', panel: 'settings' }
    ];
    buttons.forEach(b => $(b.id).addEventListener('click', () => openModal(b.panel)));
  }

  // ===== 模态面板 =====
  function setupModal() {
    $('modal-close').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  }
  function openModal(type) {
    state.currentModal = type;
    let title = '', content = '';
    if (type === 'bag') { title = '🎒 背包'; content = renderBag(); }
    else if (type === 'profile') { title = '👤 我的'; content = renderProfile(); }
    else if (type === 'cultivation') { title = '⚡ 修行'; content = renderCultivation(); }
    else if (type === 'relationships') { title = '💞 关系'; content = renderRelationships(); }
    else if (type === 'chapters') { title = '📖 章节'; content = renderChapters(); }
    else if (type === 'settings') { title = '⚙️ 设置'; content = renderSettings(); }

    $('modal-title').textContent = title;
    modalBody.innerHTML = content;
    modalOverlay.classList.add('show');

    if (type === 'bag') {
      document.querySelectorAll('.inventory-item').forEach(item => {
        item.addEventListener('click', () => showItemDetail(item.dataset.itemId));
      });
    }
    if (type === 'chapters') {
      document.querySelectorAll('.chapter-card').forEach(card => {
        card.addEventListener('click', () => openComicViewer(parseInt(card.dataset.chapterId)));
      });
    }
  }
  function closeModal() { modalOverlay.classList.remove('show'); state.currentModal = null; state.questDetail = null; }

  // ===== 背包 =====
  function renderBag() {
    const items = GAME_DATA.items;
    return `
      <div class="inventory-grid">
        ${items.map(item => `
          <div class="inventory-item" data-item-id="${item.id}">
            <span class="item-rarity rarity-${item.rarity}">${item.rarity === '传说' ? '传说' : item.rarity === '稀有' ? '稀有' : '普通'}</span>
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <span class="item-type">${item.type}</span>
          </div>`).join('')}
      </div>
      <div class="item-detail" id="item-detail">
        <h4 id="item-detail-name"></h4>
        <p id="item-detail-desc"></p>
        <p style="margin-top:8px;font-size:12px;color:#999;" id="item-detail-meta"></p>
      </div>`;
  }
  function showItemDetail(itemId) {
    const item = GAME_DATA.items.find(i => i.id === itemId);
    if (!item) return;
    $('item-detail-name').textContent = `${item.icon} ${item.name}`;
    $('item-detail-desc').textContent = item.description;
    $('item-detail-meta').textContent = `类型：${item.type} | 品质：${item.rarity} | 获得：${item.obtained}`;
    $('item-detail').classList.add('show');
  }

  // ===== 我的 =====
  function renderProfile() {
    const p = GAME_DATA.player;
    const c = GAME_DATA.characters.maoxiaojiu;
    return `
      <div class="profile-section">
        <div class="profile-avatar"><img src="assets/images/sprites/xiaojiu.png" alt="猫小九"></div>
        <div class="profile-info">
          <h3>${c.name}</h3>
          <div class="title">${c.title}</div>
          <div class="cultivation">⚡ ${c.cultivation}</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">❤️</div><div class="stat-value">${p.hp}</div><div class="stat-label">生命值</div></div>
        <div class="stat-card"><div class="stat-icon">💠</div><div class="stat-value">${p.spiritualPower}</div><div class="stat-label">灵力</div></div>
        <div class="stat-card"><div class="stat-icon">⚔️</div><div class="stat-value">${p.attack}</div><div class="stat-label">攻击</div></div>
        <div class="stat-card"><div class="stat-icon">🛡️</div><div class="stat-value">${p.defense}</div><div class="stat-label">防御</div></div>
        <div class="stat-card"><div class="stat-icon">💨</div><div class="stat-value">${p.speed}</div><div class="stat-label">速度</div></div>
        <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">Lv.${p.level}</div><div class="stat-label">等级</div></div>
      </div>
      <div class="appearance-box"><h4>📝 角色外观（忠于原作）</h4><p>${c.appearance}</p></div>
      <div class="appearance-box" style="margin-top:12px;"><h4>🎭 性格</h4><p>${c.personality}</p></div>`;
  }

  // ===== 修行 =====
  function renderCultivation() {
    const cult = GAME_DATA.cultivation;
    return `
      <div class="cultivation-realm">
        <div class="realm-name">${cult.playerStatus.currentRealm}</div>
        <div class="realm-stage">${cult.playerStatus.currentStage}</div>
        <div class="realm-progress"><div class="realm-progress-fill" style="width:5%;"></div></div>
        <div style="font-size:11px;color:#888;margin-top:6px;">经脉状态：${cult.playerStatus.meridianStatus}</div>
      </div>
      <div class="realm-ladder">
        ${cult.realms.map((realm, i) => `
          <div class="realm-tier ${i === 0 ? 'current' : 'locked'}">
            <span class="tier-name">${i === 0 ? '▶ ' : ''}${realm.name}</span>
            <span class="tier-stages">${realm.stages.slice(0,3).join(' → ')}... → ${realm.stages[realm.stages.length-1]}</span>
          </div>`).join('')}
      </div>
      <h4 style="color:#8b4513;margin-bottom:10px;">📜 已知招式</h4>
      <div class="techniques-list">
        ${cult.techniques.map(t => `
          <div class="technique-item">
            <div class="tech-icon">🥋</div>
            <div class="tech-info">
              <div class="tech-name">${t.name}</div>
              <div class="tech-meta">类型：${t.type} | 使用者：${t.user}${t.level ? ' | 等级：' + t.level : ''}</div>
              <div class="tech-desc">${t.description}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // ===== 关系 =====
  function renderRelationships() {
    const rels = GAME_DATA.relationships;
    const typeColors = {
      '好友': '#2ecc71', '敌对': '#e74c3c', '母子': '#f39c12',
      '父子（思念）': '#f39c12', '暗恋': '#e91e63', '主从': '#3498db',
      '祖孙/师徒': '#9b59b6', '祖孙/测试者': '#9b59b6'
    };
    const typeClass = {
      '好友': 'type-friend', '敌对': 'type-enemy', '母子': 'type-family',
      '父子（思念）': 'type-family', '暗恋': 'type-love', '主从': 'type-follower',
      '祖孙/师徒': 'type-follower', '祖孙/测试者': 'type-follower'
    };
    const avatars = { '猫小九': 'xiaojiu', '猫白灵': 'bailing', '猫墨': 'maomo', '妈妈': 'mom', '爸爸': null, '猫长老': 'elder', '猫乐乐': 'lele', '猫天天': 'tiantian' };
    return `
      <div class="relation-graph">
        ${rels.map(r => `
          <div class="relation-card">
            <div class="relation-avatar">${avatars[r.to] ? `<img src="assets/images/sprites/${avatars[r.to]}.png" alt="${r.to}">` : '<span style="font-size:26px;">❓</span>'}</div>
            <div class="relation-info">
              <div class="relation-name">${r.to}<span class="relation-type ${typeClass[r.type] || 'type-friend'}">${r.type}</span></div>
              <div class="relation-level-bar"><div class="relation-level-fill" style="width:${Math.abs(r.level)}%;background:${typeColors[r.type] || '#999'};"></div></div>
              <div style="font-size:11px;color:#999;margin-top:3px;">好感度：${r.level > 0 ? '+' : ''}${r.level}</div>
              <div class="relation-desc">${r.description}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // ===== 章节 =====
  function renderChapters() {
    const chapters = GAME_DATA.chapters;
    return `
      <div class="chapters-list">
        ${chapters.map(ch => `
          <div class="chapter-card" data-chapter-id="${ch.id}">
            <span class="chapter-num">${ch.id === 0 ? '序章' : '第' + ch.id + '章'}</span>
            <div class="chapter-title">${ch.title}</div>
            <div class="chapter-subtitle">${ch.subtitle}</div>
            <div class="chapter-summary">${ch.summary}</div>
            <div class="chapter-pages">📄 漫画页数：第${ch.pages[0]}-${ch.pages[ch.pages.length-1]}页（共${ch.pages.length}页） | 点击查看漫画</div>
          </div>`).join('')}
      </div>`;
  }
  // ===== 设置面板 =====
  function renderSettings() {
    const info = saveInfo();
    const saveHtml = info
      ? `<div class="settings-save-info">📁 存档时间：${info.time}<br>📍 存档地点：${info.loc}<br>🏷️ 存档版本：${info.version}</div>`
      : `<div class="settings-save-info" style="color:#999">暂无存档</div>`;
    return `
      <div class="settings-panel">
        <div class="settings-section">
          <div class="settings-section-title">💾 存档管理</div>
          ${saveHtml}
          <div class="settings-btns">
            <button class="settings-btn" id="btn-save-game">💾 保存游戏</button>
            <button class="settings-btn" id="btn-load-game">📂 读取存档</button>
            <button class="settings-btn settings-btn-danger" id="btn-delete-save">🗑️ 删除存档</button>
          </div>
            <button class="settings-btn" id="btn-fullscreen">🖥️ 全屏</button>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">⚙️ 游戏设置</div>
          <div class="settings-option">
            <span>自动存档</span>
            <label class="switch"><input type="checkbox" id="opt-autosave" checked><span class="slider"></span></label>
          </div>
          <div class="settings-option">
            <span>背景音乐</span>
            <label class="switch"><input type="checkbox" id="opt-bgm" checked><span class="slider"></span></label>
          </div>
          <div class="settings-option">
            <span>音效</span>
            <label class="switch"><input type="checkbox" id="opt-sfx" checked><span class="slider"></span></label>
          </div>
          <div class="settings-option">
            <span>画面质量</span>
            <select id="opt-quality" class="settings-select">
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">ℹ️ 关于</div>
          <div class="settings-about">
            <div>猫小九历险记</div>
            <div style="color:#888;font-size:12px">游戏版本：${GAME_VERSION}</div>
            <div style="color:#888;font-size:12px">改编自奇喵君同名有声故事</div>
          </div>
        </div>
      </div>`;
  }
  function setupSettingsPanel() {
    document.addEventListener('click', e => {
      if (e.target.id === 'btn-save-game') {
        if (saveGame()) { e.target.textContent = '✅ 已保存！'; setTimeout(() => { e.target.textContent = '💾 保存游戏'; openModal('settings'); }, 1200); }
      }
      if (e.target.id === 'btn-load-game') {
        if (loadGame()) { e.target.textContent = '✅ 已读取！'; setTimeout(() => { e.target.textContent = '📂 读取存档'; openModal('settings'); }, 1200); }
        else { e.target.textContent = '❌ 无存档'; setTimeout(() => { e.target.textContent = '📂 读取存档'; }, 1200); }
      }
      if (e.target.id === 'btn-delete-save') {
        if (confirm('确定要删除存档吗？')) { deleteSave(); openModal('settings'); }
      }
      if (e.target.id === 'btn-fullscreen') { toggleFullscreen(); }
    });
    // 画质切换
    document.addEventListener('change', e => {
      if (e.target.id === 'opt-quality') {
        gameSettings.quality = e.target.value;
        saveSettings();
        showNotification('⚙️ 画质已切换为：' + ({high:'高',medium:'中',low:'低'}[e.target.value] || e.target.value) + '，刷新后生效');
      }
    });
    // 开关切换
    document.addEventListener('change', e => {
      if (e.target.id === 'opt-autosave') { gameSettings.autosave = e.target.checked; saveSettings(); }
      if (e.target.id === 'opt-bgm') { gameSettings.bgm = e.target.checked; saveSettings(); }
      if (e.target.id === 'opt-sfx') { gameSettings.sfx = e.target.checked; saveSettings(); }
    });
  }
  // 全屏切换（跨浏览器兼容）
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  }
  // ===== 漫画查看器 =====
  function setupComicViewer() {
    $('comic-close').addEventListener('click', closeComicViewer);
    $('comic-prev').addEventListener('click', () => navigateComic(-1));
    $('comic-next').addEventListener('click', () => navigateComic(1));
    document.addEventListener('keydown', e => {
      if (!state.comicViewer.active) return;
      if (e.key === 'ArrowLeft') navigateComic(-1);
      if (e.key === 'ArrowRight') navigateComic(1);
      if (e.key === 'Escape') closeComicViewer();
    });
  }
  function openComicViewer(chapterId) {
    const chapter = GAME_DATA.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    state.comicViewer.active = true;
    state.comicViewer.chapter = chapter;
    state.comicViewer.page = 0;
    state.comicViewer.pages = chapter.pages;
    $('comic-chapter-title').textContent = chapter.title;
    comicViewer.classList.add('show');
    closeModal();
    updateComicImage();
  }
  function closeComicViewer() { state.comicViewer.active = false; comicViewer.classList.remove('show'); }
  function navigateComic(dir) {
    const np = state.comicViewer.page + dir;
    if (np < 0 || np >= state.comicViewer.pages.length) return;
    state.comicViewer.page = np;
    updateComicImage();
  }
  function updateComicImage() {
    const pageNum = state.comicViewer.pages[state.comicViewer.page];
    comicImage.src = `assets/images/comic/page_${String(pageNum).padStart(2, '0')}.jpg`;
    comicImage.alt = `第${pageNum}页`;
    $('comic-page-indicator').textContent = `${state.comicViewer.page + 1} / ${state.comicViewer.pages.length}`;
    $('comic-prev').disabled = state.comicViewer.page === 0;
    $('comic-next').disabled = state.comicViewer.page === state.comicViewer.pages.length - 1;
  }

  // ===== 虚拟摇杆 =====
  function setupJoystick() {
    const container = $('joystick-container');
    const knob = $('joystick-knob');
    const base = $('joystick-base');
    const maxDist = 35;
    function getPos(e) {
      const rect = base.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left - rect.width / 2, y: touch.clientY - rect.top - rect.height / 2 };
    }
    function start(e) {
      e.preventDefault();
      state.joystick.active = true;
      move(e);
    }
    function move(e) {
      if (!state.joystick.active) return;
      e.preventDefault();
      const pos = getPos(e);
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const clamped = Math.min(dist, maxDist);
      const angle = Math.atan2(pos.y, pos.x);
      const dx = Math.cos(angle) * clamped;
      const dy = Math.sin(angle) * clamped;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      state.joystick.dx = dx / maxDist;
      state.joystick.dy = dy / maxDist;
    }
    function end() {
      state.joystick.active = false;
      state.joystick.dx = 0; state.joystick.dy = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    }
    container.addEventListener('mousedown', start);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
    container.addEventListener('touchstart', start, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
  }

  // ===== 键盘 =====
  function setupKeyboard() {
    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      state.keys[k] = true;
      if (k === 'e') {
        // 对话中：E 推进对话；否则：尝试与附近 NPC 交互
        if (dialogueBox.classList.contains('show')) {
          nextDialogueLine();
        } else if (!modalOverlay.classList.contains('show') && !comicViewer.classList.contains('show')) {
          tryInteractNPC();
        }
      }
      // Esc 关闭弹出的面板（含任务详情）
      if (k === 'escape' && modalOverlay.classList.contains('show')) closeModal();
      if (k === 'f') { toggleFullscreen(); }
    });
    document.addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });
  }

  // 对话 / 面板 / 漫画 打开期间暂停一切移动
  function isBusy() {
    return dialogueBox.classList.contains('show')
      || modalOverlay.classList.contains('show')
      || comicViewer.classList.contains('show');
  }


  // ===== 室内（进屋切换） =====
  let outdoorGroup, indoorGroup, inIndoor = false, indoorDoorOut = { x: 0, z: 0 };
  const BUILDING_DOORS = {
    home:   { x: -30, z: -3.0, out: { x: -30, z: -1.5 } },
    school: { x: 24,  z: -6.8, out: { x: 24,  z: -5.0 } }
  };

  function buildIndoorRoom() {
    indoorGroup = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x9c7748 });
    const wall = new THREE.MeshLambertMaterial({ color: 0xe8d8b8 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), wood);
    floor.rotation.x = -Math.PI / 2;
    indoorGroup.add(floor);
    // 四面墙
    const back = new THREE.Mesh(new THREE.BoxGeometry(16, 4.5, 0.3), wall);
    back.position.set(0, 2.25, -6); indoorGroup.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 12), wall);
    left.position.set(-8, 2.25, 0); indoorGroup.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 12), wall);
    right.position.set(8, 2.25, 0); indoorGroup.add(right);
    const front = new THREE.Mesh(new THREE.BoxGeometry(16, 4.5, 0.3), wall);
    front.position.set(0, 2.25, 6); indoorGroup.add(front);
    // 窗户 + 月光（小九卧室）
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x9fd0ff }));
    win.position.set(0, 2.4, -5.82); indoorGroup.add(win);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
    moon.position.set(0.5, 2.6, -5.78); indoorGroup.add(moon);
    // 床
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xa86a4a }));
    bed.position.set(-4.5, 0.4, -3.8); indoorGroup.add(bed);
    const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.0),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    pil.position.set(-5.6, 0.85, -3.8); indoorGroup.add(pil);
    // 小桌 + 油灯
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.3),
      new THREE.MeshLambertMaterial({ color: 0x7a4a2b }));
    tbl.position.set(4.5, 0.95, 3); indoorGroup.add(tbl);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    lamp.position.set(4.5, 1.5, 3); indoorGroup.add(lamp);
    // 地毯
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24),
      new THREE.MeshLambertMaterial({ color: 0xc96a4a }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 0); indoorGroup.add(rug);
    // 木架 + 石珠吊坠（关键道具展示）
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x7a4a2b }));
    shelf.position.set(-6.5, 2.0, -5.7); indoorGroup.add(shelf);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x4aa8ff }));
    bead.position.set(-6.5, 1.75, -5.7); indoorGroup.add(bead);

    indoorGroup.visible = false;
    indoorGroup.position.set(0, 0, 0);
    scene.add(indoorGroup);
  }

  function enterIndoor(doorKey) {
    const d = BUILDING_DOORS[doorKey];
    if (!d || inIndoor) return;
    inIndoor = true;
    indoorDoorOut = d.out;
    outdoorGroup.visible = false;
    indoorGroup.visible = true;
    scene.background = new THREE.Color(0x2c2c46);
    state.camYaw = 0;
    state.player.x = 0; state.player.z = -1;
    state.cam.x = 0; state.cam.z = -1;
    showSceneTransition('室内');
  }

  function exitIndoor() {
    if (!inIndoor) return;
    inIndoor = false;
    indoorGroup.visible = false;
    outdoorGroup.visible = true;
    state.player.x = indoorDoorOut.x;
    state.player.z = indoorDoorOut.z;
    state.cam.x = indoorDoorOut.x;
    state.cam.z = indoorDoorOut.z;
    if (!inIndoor) setBackdrop(state.currentLocation);
    showSceneTransition('出门');
  }

  // ===== 主循环 =====
  function gameLoop(now) {
    const dt = Math.min((now - (lastFrameTime || now)) * 0.001, 0.05); lastFrameTime = now;
    if (worldTick) worldTick((now || 0) * 0.001);
    updatePlayer(dt);
    updatePrompts();
    updateNpcPositions(); lerpNpcPositions();
    renderCharacters();
    safeRender();
    if (autoNav.marker && autoNav.marker.visible) { autoNav.marker.rotation.z += 0.03; autoNav.marker.material.opacity = 0.5 + Math.sin(now * 0.005) * 0.3; }
    requestAnimationFrame(gameLoop);
  }

  function safeRender() {
    try {
      renderer.render(scene, camera);
    } catch (e) {
      if (!tainted) { degradeTextures(); }
    }
  }

  function updatePlayer(dt) {
    if (isBusy()) { state.player.isMoving = false; return; }

    let iFwd = 0, iRight = 0;
    if (state.keys['w'] || state.keys['arrowup']) iFwd += 1;
    if (state.keys['s'] || state.keys['arrowdown']) iFwd -= 1;
    if (state.keys['d'] || state.keys['arrowright']) iRight += 1;
    if (state.keys['a'] || state.keys['arrowleft']) iRight -= 1;
    if (state.joystick.active) { iRight += state.joystick.dx; iFwd -= state.joystick.dy; }

    const len = Math.sqrt(iFwd * iFwd + iRight * iRight);
    if (len > 0.01 && autoNav.active) stopAutoNav();
    if (len > 0.01) {
      iFwd /= len; iRight /= len;
      // 输入方向随环绕视角旋转：W 永远走向屏幕深处
      const cs = Math.cos(state.camYaw), sn = Math.sin(state.camYaw);
      const wx = iRight * cs - iFwd * sn;
      const wz = -iRight * sn - iFwd * cs;
      state.player.isMoving = true;
      state.player.bobT += 0.22;
      if (wx > 0.05) state.player.face = 1;
      else if (wx < -0.05) state.player.face = -1;

      let nx = state.player.x + wx * state.player.speed * (dt || 1/60) * 60;
      let nz = state.player.z + wz * state.player.speed * (dt || 1/60) * 60;
      if (inIndoor) {
        nx = Math.max(-7, Math.min(7, nx));
        nz = Math.max(-5, Math.min(5, nz));
        state.player.x = nx;
        state.player.z = nz;
        if (nz > 4.6) { exitIndoor(); return; }
      } else {
        nx = Math.max(-46, Math.min(46, nx));
        nz = Math.max(-36, Math.min(36, nz));
        const pr = 0.9;
        for (const o of obstacles) {
          const dx = nx - o.x, dz = nz - o.z;
          const d = Math.hypot(dx, dz), min = o.r + pr;
          if (d < min && d > 0.0001) {
            nx = o.x + dx / d * min;
            nz = o.z + dz / d * min;
          }
        }
        state.player.x = nx;
        state.player.z = nz;
        for (const key in BUILDING_DOORS) {
          const dr = BUILDING_DOORS[key];
          if (Math.hypot(state.player.x - dr.x, state.player.z - dr.z) < 3.2) {
            enterIndoor(key); return;
          }
        }
      }
    } else if (autoNav.active && autoNav.index < autoNav.path.length) {
      const target = autoNav.path[autoNav.index];
      const dx = target.x - state.player.x, dz = target.z - state.player.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.8) {
        autoNav.index++;
        if (autoNav.index >= autoNav.path.length) {
          stopAutoNav();
          state.player.isMoving = false;
        }
      } else {
        const spd = state.player.speed * (dt || 1/60) * 60;
        const wx = dx / d, wz = dz / d;
        state.player.isMoving = true;
        state.player.bobT += 0.22;
        if (wx > 0.05) state.player.face = 1;
        else if (wx < -0.05) state.player.face = -1;
        let nx = state.player.x + wx * Math.min(spd, d);
        let nz = state.player.z + wz * Math.min(spd, d);
        nx = Math.max(-46, Math.min(46, nx));
        nz = Math.max(-36, Math.min(36, nz));
        state.player.x = nx;
        state.player.z = nz;
      }
    } else {
      state.player.isMoving = false;
    }
    checkLocation();
  }

  function updateCamera() {
    const dist = inIndoor ? 6 : CAM_DIST;
    const h = inIndoor ? 5.5 : state.camH;
    state.cam.x += (state.player.x - state.cam.x) * 0.12;
    state.cam.z += (state.player.z - state.cam.z) * 0.12;
    const tx = state.cam.x + Math.sin(state.camYaw) * dist;
    const tz = state.cam.z + Math.cos(state.camYaw) * dist;
    camera.position.set(tx, h, tz);
    camera.lookAt(state.cam.x, 0.8, state.cam.z);
  }

  // 仅最近的一个附近 NPC 头顶显示交互提示
  function updatePrompts() {
    let best = null, bestD = INTERACT_DIST;
    for (const e of npcEntries) {
      e.prompt.visible = false;
      const d = Math.hypot(state.player.x - e.npc.x, state.player.z - e.npc.z);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (best && !dialogueBox.classList.contains('show')) best.prompt.visible = true;
  }

  function renderCharacters() {
    const bob = state.player.isMoving ? Math.abs(Math.sin(state.player.bobT)) * 0.08 : 0;
    playerSprite.position.x = state.player.x;
    playerSprite.position.z = state.player.z;
    playerSprite.position.y = 1.1 + bob;
    playerSprite.scale.x = 1.7 * state.player.face;
    playerShadow.position.x = state.player.x;
    playerShadow.position.z = state.player.z;
    // NPC 位置随情节移动（平滑插值）
    for (const e of npcEntries) {
      e.sprite.position.x = e.npc.x;
      e.sprite.position.z = e.npc.z;
      e.shadow.position.x = e.npc.x;
      e.shadow.position.z = e.npc.z;
      if (e.label) { e.label.position.x = e.npc.x; e.label.position.z = e.npc.z; }
      if (e.prompt) { e.prompt.position.x = e.npc.x; e.prompt.position.z = e.npc.z; }
    }
  }

  // ===== 位置检测 =====
  function checkLocation() {
    let best = null, bestD = Infinity;
    for (const z of zones) {
      const d = Math.hypot(state.player.x - z.x, state.player.z - z.z);
      if (d < z.r && d < bestD) { best = z; bestD = d; }
    }
    if (best && best.id !== state.currentLocation) {
      state.currentLocation = best.id;
      updateLocationDisplay();
      setBackdrop(best.id);
      showSceneTransition(best.name);
    }
  }

  function updateLocationDisplay() {
    const z = zones.find(o => o.id === state.currentLocation);
    $('location-name').textContent = z ? `📍 ${z.name}` : '📍 猫族山谷';
  }

  function showSceneTransition(name) {
    const st = $('scene-transition');
    $('scene-transition-text').textContent = name;
    $('scene-transition-sub').textContent = '加载中...';
    st.classList.add('show');
    setTimeout(() => st.classList.remove('show'), 900);
  }

  // ===== NPC 交互（E 键，需靠近） =====
  function tryInteractNPC() {
    let best = null, bestD = INTERACT_DIST;
    for (const npc of npcs) {
      const d = Math.hypot(state.player.x - npc.x, state.player.z - npc.z);
      if (d < bestD) { best = npc; bestD = d; }
    }
    if (best) startDialogue(best);
  }

  // ===== 对话 =====
  const PORTRAITS = {
    '猫小九': 'xiaojiu', '妈妈': 'mom', '猫白灵': 'bailing', '猫墨': 'maomo',
    '猫长老': 'elder', '猫乐乐': 'lele', '猫天天': 'tiantian'
  };
  function getPortrait(name) { return PORTRAITS[name] ? `assets/images/sprites/${PORTRAITS[name]}.png` : ''; }

  let dialogueState = { npc: null, index: 0 };
  function startDialogue(npc) {
    dialogueState.npc = npc;
    dialogueState.lines = getNPCDialogue(npc);
    dialogueState.index = 0;
    showDialogueLine();
    dialogueBox.onclick = nextDialogueLine;
  }
  function showDialogueLine() {
    const line = dialogueState.lines[dialogueState.index];
    if (!line) { closeDialogue(); return; }
    dialogueSpeaker.textContent = line.speaker;
    dialogueText.textContent = line.text;
    const src = getPortrait(line.speaker);
    const portrait = $('dialogue-portrait');
    if (src) { portrait.src = src; portrait.style.display = 'block'; }
    else { portrait.style.display = 'none'; }
    dialogueBox.classList.add('show');
  }
  function nextDialogueLine() {
    dialogueState.index++;
    if (dialogueState.index >= dialogueState.lines.length) closeDialogue();
    else showDialogueLine();
  }
  function closeDialogue() { dialogueBox.classList.remove('show'); dialogueBox.onclick = null; }

  // ===== 通知 =====
  let notifyTimeout;
  function showNotification(msg) {
    notification.textContent = msg;
    notification.classList.add('show');
    clearTimeout(notifyTimeout);
    notifyTimeout = setTimeout(() => notification.classList.remove('show'), 3500);
  }

  // ===== 启动（先显示启动页，点击后进入游戏） =====
  // ===== 更新检查 =====
  const LOCAL_VERSION = GAME_VERSION;
  let updateCheckDone = false;
  function startUpdateCheck(callback) {
    const overlay = $('update-overlay');
    const text = $('update-text');
    const verEl = $('update-version');
    const btns = $('update-btns');
    if (!overlay) { callback(); return; }
    overlay.style.display = 'flex';
    text.textContent = '正在检查更新…';
    verEl.textContent = '当前版本：' + LOCAL_VERSION;
    // 尝试读取本地 version.json 获取更新地址
    let updateUrl = '';
    const doCheck = () => {
      if (!updateUrl) { finishCheck(false); return; }
      text.textContent = '正在连接更新服务器…';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      fetch(updateUrl, { signal: controller.signal, cache: 'no-store' })
        .then(r => r.json())
        .then(remote => {
          clearTimeout(timeoutId);
          const remoteVer = remote.version || '';
          if (remoteVer && compareVersion(remoteVer, LOCAL_VERSION) > 0) {
            text.textContent = '发现新版本：' + remoteVer;
            verEl.textContent = '当前版本：' + LOCAL_VERSION + ' → 最新版本：' + remoteVer;
            if (remote.release_notes) verEl.textContent += '\n更新内容：' + remote.release_notes;
            btns.style.display = 'flex';
            $('update-now').onclick = () => {
              if (remote.update_url) window.open(remote.update_url, '_blank');
              finishCheck(true);
            };
            $('update-skip').onclick = () => finishCheck(false);
          } else {
            text.textContent = '已是最新版本';
            setTimeout(() => finishCheck(false), 800);
          }
        })
        .catch(() => { clearTimeout(timeoutId); text.textContent = '更新检查失败，将进入游戏'; setTimeout(() => finishCheck(false), 800); });
    };
    const finishCheck = (updated) => {
      updateCheckDone = true;
      overlay.style.display = 'none';
      callback();
    };
    // file:// 下不能 fetch 本地文件，直接跳过；http(s) 下读取 version.json
    if (location.protocol === "file:") { doCheck(); }
    else {
      fetch("version.json", { cache: "no-store" })
        .then(r => r.json())
        .then(data => { updateUrl = data.update_url || ""; doCheck(); })
        .catch(() => doCheck());
    }
  }
  function compareVersion(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0, nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
  function enterGame() {
    try { init(); } catch(err){ window.__ie = err.message + " || " + (err.stack||"").slice(0,400); }
    const splash = $('splash-screen');
    if (splash) { splash.classList.add('splash-hide'); setTimeout(() => splash.remove(), 800); }
  }
  function bootstrap() {
    if (typeof THREE === "undefined") { showFallback(); return; }
    const splash = $("splash-screen");
    if (splash) { splash.addEventListener("click", enterGame); }
    else init();
    setTimeout(() => { if (!splash || !splash.parentNode) return; enterGame(); }, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
