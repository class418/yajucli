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

// デバッグモードGUI（名前が「デバッグ」の時のみ表示）
const debugPanel = document.createElement('div');
debugPanel.style.position = 'fixed';
debugPanel.style.top = '50px';
debugPanel.style.right = '10px';
debugPanel.style.backgroundColor = '#222';
debugPanel.style.padding = '10px';
debugPanel.style.borderRadius = '8px';
debugPanel.style.color = '#fff';
debugPanel.style.fontSize = '14px';
debugPanel.style.userSelect = 'none';
debugPanel.style.display = 'none'; // 最初は非表示
document.body.appendChild(debugPanel);

// デバッグモードON/OFFチェックボックス
const debugToggleLabel = document.createElement('label');
debugToggleLabel.style.userSelect = 'none';
debugToggleLabel.style.cursor = 'pointer';
debugToggleLabel.style.display = 'flex';
debugToggleLabel.style.alignItems = 'center';
debugToggleLabel.style.marginBottom = '10px';

const debugToggleCheckbox = document.createElement('input');
debugToggleCheckbox.type = 'checkbox';
debugToggleCheckbox.style.marginRight = '6px';

debugToggleLabel.appendChild(debugToggleCheckbox);
debugToggleLabel.appendChild(document.createTextNode('デバッグモード ON/OFF'));

debugPanel.appendChild(debugToggleLabel);

// データ削除ボタン（常に表示）
const deleteBtnWrapper = document.createElement('div');
deleteBtnWrapper.style.position = 'fixed';
deleteBtnWrapper.style.bottom = '10px';
deleteBtnWrapper.style.right = '10px';

const deleteBtn = document.createElement('button');
deleteBtn.textContent = 'セーブデータ削除';
deleteBtn.style.backgroundColor = '#b00';
deleteBtn.style.color = '#fff';
deleteBtn.style.border = 'none';
deleteBtn.style.padding = '8px 12px';
deleteBtn.style.borderRadius = '6px';
deleteBtn.style.cursor = 'pointer';
deleteBtn.style.fontWeight = 'bold';
deleteBtn.style.userSelect = 'none';

deleteBtnWrapper.appendChild(deleteBtn);
document.body.appendChild(deleteBtnWrapper);

// 名前変数
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

function pointsPerClick() {
  let base = 1 * (1 + 0.2 * clickPowerLevel);
  if (debugMode) base *= 10;
  if (feverActive) base *= 3;
  return base;
}

function autoClickPerSec() {
  let base = autoClickLevel * 0.1 + takuyaLevel * 1.0;
  if (debugMode) base *= 10;
  if (feverActive) base *= 3;
  return base;
}

function updateAutoClickDisplay() {
  autoClickDisplay.textContent = `自動${autoClickPerSec().toFixed(1)}/秒`;
}

function updateScore() {
  scoreDisplay.textContent = `ポイント: ${points.toFixed(1)}`;
  updateButtons();
}

function addFacilityImages(src, count) {
  for(let i = 0; i < count; i++) {
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
  if (feverActive) return;
  feverActive = true;
  feverReady = false;
  feverBtn.style.display = 'none';
  clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
  clickerBtn.style.animationDuration = '0.2s'; // 爆速回転
  feverAudio.play().catch(() => {});
  feverTimeout = setTimeout(() => {
    endFever();
  }, 30000);
}

function endFever() {
  feverActive = false;
  clickerBtn.src = '/yajucli/assets/yajuu.png';
  clickerBtn.style.animationDuration = '5s';
  feverAudio.pause();
  feverAudio.currentTime = 0;
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

  feverBtnInterval = setInterval(() => {
    if (feverActive) {
      feverBtn.style.display = 'none';
      return;
    }
    if (Math.random() < 0.3) {
      feverReady = true;
      const rect = centerPanel.getBoundingClientRect();
      const x = rect.left + Math.random() * (rect.width - 100);
      const y = rect.top + Math.random() * (rect.height - 100);
      feverBtn.style.left = `${x}px`;
      feverBtn.style.top = `${y}px`;
      feverBtn.style.display = 'block';

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

  // 名前が「デバッグ」ならデバッグモードGUI表示、それ以外は非表示
  if (senpaiName === 'デバッグ') {
    debugPanel.style.display = 'block';
    debugToggleCheckbox.checked = debugMode;
  } else {
    debugPanel.style.display = 'none';
    debugMode = false;
    debugToggleCheckbox.checked = false;
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

// デバッグモードトグル操作
debugToggleCheckbox.addEventListener('change', () => {
  debugMode = debugToggleCheckbox.checked;
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

// セーブデータ削除ボタンの挙動（二重確認）
deleteBtn.addEventListener('click', () => {
  if (!confirm('本当にセーブデータを削除しますか？')) return;
  if (!confirm('二重確認です。本当に削除しますか？')) return;
  localStorage.removeItem('yajuuSave');
  alert('セーブデータを削除しました。ページを再読み込みします。');
  location.reload();
});

// 初期化関数
function init() {
  initAudioContext();
  loadClickSound();
  loadGame();

  nameInput.value = senpaiName;

  createButtons();
  addAllFacilities();
  updateAutoClickDisplay();
  updateScore();

  if (autoClickLevel + takuyaLevel > 0) startAutoClick();

  if (feverActive) {
    clickerBtn.src = '/yajucli/assets/yajuu_fever.png';
    clickerBtn.style.animationDuration = '0.2s';
    feverAudio.play().catch(() => {});
  } else {
    clickerBtn.src = '/yajucli/assets/yajuu.png';
    clickerBtn.style.animationDuration = '5s';
    setupFeverBtnAppearance();
  }

  // 名前入力欄の変更反映を強制実行（名前によるUI切替）
  onNameInputChange();
}

window.addEventListener('load', init);

// 右クリック防止
document.addEventListener('contextmenu', e => e.preventDefault());
