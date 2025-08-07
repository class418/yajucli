const clickerBtn = document.getElementById('clickerBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const autoClickDisplay = document.getElementById('autoClickDisplay');
const facilityButtons = document.getElementById('facilityButtons');
const upgradeButtons = document.getElementById('upgradeButtons');
const centerPanel = document.getElementById('centerPanel');

let nameInput = document.getElementById('nameInput');
let feverBtn = document.createElement('img');
feverBtn.id = 'feverBtn';
feverBtn.src = '/yajucli/assets/feverbtn.png';
document.body.appendChild(feverBtn);

let points = 0;
let clickPowerLevel = 0;
let autoClickLevel = 0;
let takuyaLevel = 0;

let feverActive = false;
let feverReady = true;
let feverTimeout = null;
let debugMode = false;

let autoClickInterval = null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let clickBuffer = null;
let feverAudio = null;

function initAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
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
  src.start(0);
}

function loadFeverAudio() {
  feverAudio = new Audio('/yajucli/assets/fever.mp3');
  feverAudio.loop = true;
  feverAudio.preload = 'auto';
}

function playFeverAudio() {
  if (!feverAudio) return;
  feverAudio.currentTime = 0;
  feverAudio.play();
}

function stopFeverAudio() {
  if (!feverAudio) return;
  feverAudio.pause();
  feverAudio.currentTime = 0;
}

function calcPrice(base, level) {
  return Math.floor(base * Math.pow(1.15, level));
}
function pointsPerClick() {
  let base = 1 * (1 + 0.2 * clickPowerLevel);
  if (feverActive) base *= 3;
  if (debugMode) base *= 5;
  return base;
}
function autoClickPerSec() {
  let base = autoClickLevel * 0.1 + takuyaLevel * 1.0;
  if (feverActive) base *= 3;
  if (debugMode) base *= 5;
  return base;
}
function updateAutoClickDisplay() {
  autoClickDisplay.textContent = `自動${autoClickPerSec().toFixed(1)}/秒`;
}
function updateScore() {
  scoreDisplay.textContent = `ポイント: ${points.toFixed(1)}`;
  updateButtons();
}

// 施設アイコンは最大2列まで表示、3列目は描画しない
function addFacilityImages(src, count) {
  // 既存のアイコン全部消す
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
    playClickSound();
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

function playPuniAnimation() {
  clickerBtn.style.transform = 'scale(1.1,0.9)';
  setTimeout(()=>clickerBtn.style.transform = 'scale(1,1)',100);
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

document.addEventListener('contextmenu', e => e.preventDefault());

// フィーバーモード制御

function startFever() {
  if (feverActive) return;
  feverActive = true;
  feverReady = false;

  document.body.classList.add('fever');
  clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
  clickerBtn.style.animation = "spinFast 0.2s linear infinite";

  playFeverAudio();
  feverBtn.style.display = 'none';

  if (feverTimeout) clearTimeout(feverTimeout);
  feverTimeout = setTimeout(() => {
    stopFever();
  }, 30000);

  saveGame();
}

function stopFever() {
  feverActive = false;

  document.body.classList.remove('fever');
  clickerBtn.src = '/yajucli/assets/yajuu.png';
  clickerBtn.style.animation = "spin 5s linear infinite";

  stopFeverAudio();
  feverBtn.style.display = (debugMode || feverReady) ? 'block' : 'none';

  saveGame();
}

// フィーバーボタンのランダム表示

function randomFeverBtnShow() {
  if (feverActive) return; // フィーバー中は出さない
  if (debugMode) {
    feverBtn.style.display = 'block';
    return;
  }
  // ランダムに10%の確率で表示/非表示を切り替え
  if (feverReady) {
    if (Math.random() < 0.1) {
      feverBtn.style.display = 'block';
    } else {
      feverBtn.style.display = 'none';
    }
  } else {
    feverBtn.style.display = 'none';
  }
}

// フィーバーボタン押下

feverBtn.addEventListener('click', () => {
  startFever();
});

// 名前入力処理

if (!nameInput.value) {
  nameInput.value = "野獣";
}

nameInput.addEventListener('input', () => {
  const currentName = nameInput.value.trim() || "野獣";
  document.title = `${currentName}先輩クリックゲーム`;
});

nameInput.addEventListener('blur', () => {
  if (nameInput.value.trim() === "") {
    nameInput.value = "野獣";
  }
  onNameChange();
});

function onNameChange() {
  let name = nameInput.value.trim();
  if (name === "") {
    name = "野獣";
  }
  document.title = `${name}先輩クリックゲーム`;
  clickerBtn.alt = `${name}先輩`;

  debugMode = (name === "デバッグ先輩");

  if (debugMode) {
    feverBtn.style.display = 'block';
  } else {
    feverBtn.style.display = feverReady && !feverActive ? 'block' : 'none';
  }
  updateScore();
  updateAutoClickDisplay();
  saveGame();
}

// セーブ・ロード

function saveGame() {
  const saveData = {
    points,
    clickPowerLevel,
    autoClickLevel,
    takuyaLevel,
    feverActive,
    feverReady,
    debugMode,
    name: nameInput.value || "野獣"
  };
  localStorage.setItem('yajuClickSave', JSON.stringify(saveData));
}

function loadGame() {
  const data = localStorage.getItem('yajuClickSave');
  if (!data) return;
  try {
    const saveData = JSON.parse(data);
    points = saveData.points || 0;
    clickPowerLevel = saveData.clickPowerLevel || 0;
    autoClickLevel = saveData.autoClickLevel || 0;
    takuyaLevel = saveData.takuyaLevel || 0;
    feverActive = saveData.feverActive || false;
    feverReady = (typeof saveData.feverReady === 'boolean') ? saveData.feverReady : true;
    debugMode = saveData.debugMode || false;

    let savedName = saveData.name || "野獣";
    nameInput.value = savedName;
    document.title = `${savedName}先輩クリックゲーム`;
    clickerBtn.alt = `${savedName}先輩`;

    if (debugMode) {
      feverBtn.style.display = 'block';
    } else if (feverReady && !feverActive) {
      feverBtn.style.display = 'block';
    } else {
      feverBtn.style.display = 'none';
    }

    if (feverActive) {
      document.body.classList.add('fever');
      clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
      clickerBtn.style.animation = "spinFast 0.2s linear infinite";
      loadFeverAudio();
      playFeverAudio();
    } else {
      document.body.classList.remove('fever');
      clickerBtn.src = '/yajucli/assets/yajuu.png';
      clickerBtn.style.animation = "spin 5s linear infinite";
      stopFeverAudio();
    }

    addAllFacilities();
    updateAutoClickDisplay();
    updateScore();

    if (autoClickLevel + takuyaLevel > 0) startAutoClick();

  } catch (e) {
    console.error('セーブデータの読み込みに失敗しました:', e);
  }
}

window.addEventListener('load', () => {
  initAudioContext();
  loadClickSound();
  loadFeverAudio();
  loadGame();
  createButtons();
  setInterval(randomFeverBtnShow, 1000);
});
