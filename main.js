let points = 0;
let clickPowerLevel = 0;
let autoClickLevel = 0;
let takuyaLevel = 0;
let debugMode = false;
let feverActive = false;
let feverReady = false;
let feverTimeout = null;
let feverBtnInterval = null;

const clickerBtn = document.getElementById('clickerBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const autoClickDisplay = document.getElementById('autoClickDisplay');
const facilityButtons = document.getElementById('facilityButtons');
const upgradeButtons = document.getElementById('upgradeButtons');
const centerPanel = document.getElementById('centerPanel');
const debugToggle = document.getElementById('debugToggle');

let autoClickInterval = null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let clickBuffer = null;
let feverAudio = null;

// フィーバーボタン生成
const feverBtn = document.createElement('img');
feverBtn.src = '/yajucli/assets/feverbtn.png';
feverBtn.alt = 'フィーバーボタン';
feverBtn.style.position = 'absolute';
feverBtn.style.cursor = 'pointer';
feverBtn.style.width = '100px';
feverBtn.style.height = '100px';
feverBtn.style.display = 'none';
feverBtn.style.zIndex = '10';
document.body.appendChild(feverBtn);

// 先輩の名前入力欄（右上に常設）
const nameInputWrapper = document.createElement('div');
nameInputWrapper.style.position = 'fixed';
nameInputWrapper.style.top = '10px';
nameInputWrapper.style.right = '10px';
nameInputWrapper.style.backgroundColor = '#222';
nameInputWrapper.style.padding = '6px 10px';
nameInputWrapper.style.borderRadius = '8px';
nameInputWrapper.style.color = '#fff';
nameInputWrapper.style.userSelect = 'none';
nameInputWrapper.style.fontSize = '14px';

const nameLabel = document.createElement('label');
nameLabel.textContent = '先輩の名前: ';
nameLabel.style.marginRight = '6px';

const nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.maxLength = 10;
nameInput.style.width = '120px';

nameInputWrapper.appendChild(nameLabel);
nameInputWrapper.appendChild(nameInput);
document.body.appendChild(nameInputWrapper);

// 先輩名前管理変数
let senpaiName = '野獣';

// Audio初期化
function initAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (!feverAudio) {
    feverAudio = new Audio('/yajucli/assets/fever.mp3');
    feverAudio.loop = true;
  }
}

function loadClickSound() {
  fetch('/yajucli/assets/click.mp3')
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => clickBuffer = decoded);
}

function playClickSound() {
  if (!clickBuffer || !audioCtx) return;
  const src = audioCtx.createBufferSource();
  src.buffer = clickBuffer;
  src.connect(audioCtx.destination);
  src.start();
}

function calcPrice(base, level) {
  return Math.floor(base * Math.pow(1.15, level));
}

// クリック時のポイント倍率にデバッグ効果を加算
function pointsPerClick() {
  let base = 1 * (1 + 0.2 * clickPowerLevel);
  if (debugMode) base *= 10; // デバッグは10倍に増加
  if (feverActive) base *= 3; // フィーバー中は3倍
  return base;
}

// 自動クリック秒間ポイント倍率（施設＋デバッグ効果）
function autoClickPerSec() {
  let base = autoClickLevel * 0.1 + takuyaLevel * 1.0;
  if (debugMode) base *= 10; // デバッグ時は10倍
  if (feverActive) base *= 3; // フィーバー中は3倍
  return base;
}

function updateAutoClickDisplay() {
  autoClickDisplay.textContent = `自動${autoClickPerSec().toFixed(1)}/秒`;
}

function updateScore() {
  scoreDisplay.textContent = `ポイント: ${points.toFixed(1)}`;
  updateButtons();
}

// 施設アイコンは最大2列まで表示、3列目は描画しない（JavaScriptで制御）
function addFacilityImages(src, count) {
  centerPanel.innerHTML = '';
  const maxPerRow = 10;
  const maxRows = 2;
  const showCount = Math.min(count, maxPerRow * maxRows);
  for(let i = 0; i < showCount; i++) {
    const img = document.createElement('img');
    img.src = src;
    img.classList.add('facilityIcon');
    centerPanel.appendChild(img);
  }
}

function addAllFacilities() {
  centerPanel.innerHTML = '';
  addFacilityImages('/yajucli/assets/cursor.png', autoClickLevel);
  addFacilityImages('/yajucli/assets/takuya.png', takuyaLevel);
}

function startAutoClick() {
  if (autoClickInterval) return;
  autoClickInterval = setInterval(() => {
    points += autoClickPerSec();
    updateScore();
    // 自動クリックでは音は鳴らさない仕様（任意）
  }, 1000);
}

const facilities = [
  { id:'cursor', name:'自動クリック', baseCost:10, level:0, icon:'/yajucli/assets/cursor.png',
    onBuy: function(){
      this.level++;
      autoClickLevel = this.level;
      addAllFacilities();
      updateAutoClickDisplay();
      if (autoClickLevel + takuyaLevel > 0) startAutoClick();
    }
  },
  { id:'takuya', name:'拓也さん', baseCost:100, level:0, icon:'/yajucli/assets/takuya.png',
    onBuy: function(){
      this.level++;
      takuyaLevel = this.level;
      addAllFacilities();
      updateAutoClickDisplay();
      if (autoClickLevel + takuyaLevel > 0) startAutoClick();
    }
  }
];

const upgrades = [
  { id:'clickPower', name:'クリック力強化', baseCost:50, level:0,
    onBuy:function(){
      this.level++;
      clickPowerLevel = this.level;
    }
  }
];

function createButtons() {
  facilities.forEach(f => {
    const btn = document.createElement('div');
    btn.id = 'facility-'+f.id;
    btn.classList.add('buyButton');
    facilityButtons.appendChild(btn);
  });
  upgrades.forEach(u => {
    const btn = document.createElement('div');
    btn.id = 'upgrade-'+u.id;
    btn.classList.add('buyButton');
    upgradeButtons.appendChild(btn);
  });
  updateButtons();
}

function updateButtons() {
  facilities.forEach(f => {
    const btn = document.getElementById('facility-'+f.id);
    const price = calcPrice(f.baseCost, f.level);
    btn.textContent = `${f.name} Lv.${f.level} - ${price}pt`;
    if (points >= price) {
      btn.classList.remove('disabled');
      btn.onclick = () => {
        if (points >= price) {
          points -= price;
          f.onBuy();
          updateScore();
          saveGame();
        }
      };
    } else {
      btn.classList.add('disabled');
      btn.onclick = null;
    }
  });
  upgrades.forEach(u => {
    const btn = document.getElementById('upgrade-'+u.id);
    const price = calcPrice(u.baseCost, u.level);
    btn.textContent = `${u.name} Lv.${u.level} - ${price}pt`;
    if (points >= price) {
      btn.classList.remove('disabled');
      btn.onclick = () => {
        if (points >= price) {
          points -= price;
          u.onBuy();
          updateScore();
          saveGame();
        }
      };
    } else {
      btn.classList.add('disabled');
      btn.onclick = null;
    }
  });
}

// フィーバーモード制御
function startFever() {
  if (feverActive) return; // 多重防止
  feverActive = true;
  feverReady = false;
  feverBtn.style.display = 'none';
  clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
  clickerBtn.style.animationDuration = '0.2s'; // 爆速回転
  feverAudio.play().catch(() => {});
  // フィーバー終了30秒後
  feverTimeout = setTimeout(() => {
    endFever();
  }, 30000);
}

function endFever() {
  feverActive = false;
  clickerBtn.src = '/yajucli/assets/yajuu.png';
  clickerBtn.style.animationDuration = '5s'; // 元に戻す
  feverAudio.pause();
  feverAudio.currentTime = 0;
  // フィーバー再準備
  if (!debugMode) setupFeverBtnAppearance();
  updateScore();
}

function setupFeverBtnAppearance() {
  if (debugMode) {
    feverBtn.style.display = 'block';
    return;
  }
  feverReady = false;
  feverBtn.style.display = 'none';

  if (feverBtnInterval) clearInterval(feverBtnInterval);

  // 15〜30秒毎にfeverBtnを一瞬表示するタイマー（ランダム位置）
  feverBtnInterval = setInterval(() => {
    if (feverActive) {
      feverBtn.style.display = 'none';
      return;
    }
    const chance = Math.random();
    if (chance < 0.3) { // 約30%で出現
      feverReady = true;
      // 真ん中パネル（centerPanel）の範囲内に配置
      const rect = centerPanel.getBoundingClientRect();
      // パネル内ランダム位置(100px分余裕)
      const x = rect.left + Math.random() * (rect.width - 100);
      const y = rect.top + Math.random() * (rect.height - 100);
      feverBtn.style.left = `${x}px`;
      feverBtn.style.top = `${y}px`;
      feverBtn.style.display = 'block';

      // 5秒で消す
      setTimeout(() => {
        if (!feverActive) {
          feverBtn.style.display = 'none';
          feverReady = false;
        }
      }, 5000);
    } else {
      feverBtn.style.display = 'none';
      feverReady = false;
    }
  }, 15000);
}

// クリック時の処理
function playPuniAnimation() {
  clickerBtn.style.transform = 'scale(1.1,0.9)';
  setTimeout(() => clickerBtn.style.transform = 'scale(1,1)', 100);
}

function handleTap(e) {
  e.preventDefault();
  initAudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  points += pointsPerClick();
  updateScore();
  playClickSound();
  playPuniAnimation();
  saveGame();
}

clickerBtn.addEventListener('pointerdown', handleTap, { passive: false });

feverBtn.addEventListener('click', () => {
  if (!feverReady || feverActive) return;
  startFever();
  saveGame();
});

// 名前入力欄の制御
nameInput.value = senpaiName;
function onNameInputChange() {
  let val = nameInput.value.trim();
  if (val === '') {
    senpaiName = '野獣';
    nameInput.value = senpaiName;
  } else {
    senpaiName = val;
  }
  // デバッグモード判定
  if (senpaiName === 'デバッグ') {
    debugMode = true;
    debugToggle.checked = true;
  } else {
    debugMode = false;
    debugToggle.checked = false;
  }

  // フィーバーボタン表示制御
  if (debugMode) {
    feverBtn.style.display = 'block';
  } else {
    feverBtn.style.display = feverReady && !feverActive ? 'block' : 'none';
  }

  updateScore();
  updateAutoClickDisplay();
  saveGame();
}
nameInput.addEventListener('change', onNameInputChange);
nameInput.addEventListener('blur', onNameInputChange);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') nameInput.blur();
});

// デバッグモードGUIトグル
debugToggle.addEventListener('change', () => {
  debugMode = debugToggle.checked;
  if (debugMode) {
    senpaiName = 'デバッグ';
    nameInput.value = senpaiName;
    feverBtn.style.display = 'block';
  } else {
    if (senpaiName === 'デバッグ') {
      senpaiName = '野獣';
      nameInput.value = senpaiName;
    }
    feverBtn.style.display = feverReady && !feverActive ? 'block' : 'none';
  }
  updateScore();
  updateAutoClickDisplay();
  saveGame();
});

// セーブ・ロード処理
function saveGame() {
  const saveData = {
    points,
    clickPowerLevel,
    autoClickLevel,
    takuyaLevel,
    debugMode,
    senpaiName,
    feverActive,
  };
  localStorage.setItem('yajuuSave', JSON.stringify(saveData));
}

function loadGame() {
  const saveStr = localStorage.getItem('yajuuSave');
  if (!saveStr) return;
  try {
    const saveData = JSON.parse(saveStr);
    points = saveData.points || 0;
    clickPowerLevel = saveData.clickPowerLevel || 0;
    autoClickLevel = saveData.autoClickLevel || 0;
    takuyaLevel = saveData.takuyaLevel || 0;
    debugMode = saveData.debugMode || false;
    senpaiName = saveData.senpaiName || '野獣';
    feverActive = saveData.feverActive || false;
  } catch {
    // 解析エラー時は無視
  }
}

// 初期化関数
function init() {
  initAudioContext();
  loadClickSound();
  loadGame();

  debugToggle.checked = debugMode;
  nameInput.value = senpaiName;

  createButtons();
  addAllFacilities();
  updateAutoClickDisplay();
  updateScore();

  if (autoClickLevel + takuyaLevel > 0) startAutoClick();

  if (feverActive) {
    // フィーバーモード継続中だったら復帰処理
    clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
    clickerBtn.style.animationDuration = '0.2s';
    feverAudio.play().catch(() => {});
    // フィーバーはタイマーリセットはできないため、30秒経過扱いはしない仕様
  } else {
    clickerBtn.src = '/yajucli/assets/yajuu.png';
    clickerBtn.style.animationDuration = '5s';
    setupFeverBtnAppearance();
  }
}

window.addEventListener('load', init);

// 右クリック防止
document.addEventListener('contextmenu', e => e.preventDefault());
