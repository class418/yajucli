const clickerBtn = document.getElementById("clickerBtn");
const scoreDisplay = document.getElementById("scoreDisplay");
const autoClickDisplay = document.getElementById("autoClickDisplay");
const nameInput = document.getElementById("nameInput");
const facilityButtons = document.getElementById("facilityButtons");
const upgradeButtons = document.getElementById("upgradeButtons");
const debugToggle = document.getElementById("debugToggle");
const rightPanel = document.getElementById("rightPanel");

let score = 0;
let cps = 0;
let clickValue = 1;
let facilities = [];
let upgrades = [];
let facilityLevels = {};
let upgradeLevels = {};
let debugMode = false;
let feverMode = false;
let feverTimeout = null;

const defaultName = "野獣先輩";

// サウンド
const tapSound = new Audio("assets/tap.mp3");
const feverSound = new Audio("assets/fever.mp3");
feverSound.loop = true;

// 保存
function saveGame() {
  localStorage.setItem("score", score);
  localStorage.setItem("name", nameInput.value || defaultName);
  localStorage.setItem("facilityLevels", JSON.stringify(facilityLevels));
  localStorage.setItem("upgradeLevels", JSON.stringify(upgradeLevels));
}

// 読み込み
function loadGame() {
  score = Number(localStorage.getItem("score")) || 0;
  nameInput.value = localStorage.getItem("name") || defaultName;
  facilityLevels = JSON.parse(localStorage.getItem("facilityLevels") || "{}");
  upgradeLevels = JSON.parse(localStorage.getItem("upgradeLevels") || "{}");
}

// ポイント更新
function updateScoreDisplay() {
  scoreDisplay.textContent = `ポイント: ${Math.floor(score)}`;
  autoClickDisplay.textContent = `自動${cps.toFixed(1)}/秒`;
}

// デバッグGUI
function createDebugOptions() {
  let existing = document.getElementById("debugOptions");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "debugOptions";

  const feverBtn = document.createElement("button");
  feverBtn.textContent = "フィーバーモード起動";
  feverBtn.onclick = triggerFever;

  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.placeholder = "ポイント書き換え";
  scoreInput.onchange = () => {
    score = Number(scoreInput.value) || 0;
    updateScoreDisplay();
  };

  container.appendChild(feverBtn);
  container.appendChild(scoreInput);

  rightPanel.appendChild(container);
}

// データ削除
function createDeleteButton() {
  const btn = document.createElement("button");
  btn.textContent = "データを完全削除";
  btn.onclick = () => {
    if (confirm("本当に削除しますか？")) {
      if (confirm("最終確認です。削除してよろしいですか？")) {
        localStorage.clear();
        location.reload();
      }
    }
  };
  rightPanel.appendChild(btn);
}

// フィーバー
function triggerFever() {
  if (feverMode) return;
  feverMode = true;
  clickerBtn.src = "assets/yajuu_fever.png";
  feverSound.play();
  setTimeout(() => {
    feverMode = false;
    clickerBtn.src = "assets/yajuu.png";
    feverSound.pause();
    feverSound.currentTime = 0;
  }, 30000);
}

// クリック処理
clickerBtn.onclick = () => {
  score += clickValue;
  updateScoreDisplay();
  tapSound.currentTime = 0;
  tapSound.play();
};

// 名前変更
nameInput.addEventListener("input", () => {
  const name = nameInput.value;
  if (name === "デバッグ先輩") {
    debugToggle.parentElement.style.display = "block";
  } else {
    debugToggle.parentElement.style.display = "none";
  }
});

// デバッグモード切替
debugToggle.addEventListener("change", () => {
  debugMode = debugToggle.checked;
  if (debugMode) {
    createDebugOptions();
  } else {
    const opts = document.getElementById("debugOptions");
    if (opts) opts.remove();
  }
});

// 施設とアップグレード（例）
facilities = [
  { id: "printer", name: "プリンター", baseCost: 50, cps: 0.1 },
  { id: "senpaiFactory", name: "先輩工場", baseCost: 500, cps: 1 }
];

upgrades = [
  { id: "doubleClick", name: "クリック2倍", cost: 200, effect: () => clickValue *= 2 }
];

// 購入ボタン生成
function renderShop() {
  facilityButtons.innerHTML = "";
  facilities.forEach(f => {
    const level = facilityLevels[f.id] || 0;
    const btn = document.createElement("button");
    btn.textContent = `${f.name} Lv.${level}`;
    btn.onclick = () => {
      const cost = Math.floor(f.baseCost * Math.pow(1.5, level));
      if (score >= cost) {
        score -= cost;
        facilityLevels[f.id] = level + 1;
        updateScoreDisplay();
        renderShop();
        calculateCPS();
        saveGame();
      }
    };
    facilityButtons.appendChild(btn);
  });

  upgradeButtons.innerHTML = "";
  upgrades.forEach(u => {
    const level = upgradeLevels[u.id] || 0;
    const btn = document.createElement("button");
    btn.textContent = `${u.name} Lv.${level}`;
    btn.onclick = () => {
      if (level === 0 && score >= u.cost) {
        score -= u.cost;
        upgradeLevels[u.id] = 1;
        u.effect();
        updateScoreDisplay();
        renderShop();
        saveGame();
      }
    };
    upgradeButtons.appendChild(btn);
  });
}

// CPS計算
function calculateCPS() {
  cps = 0;
  facilities.forEach(f => {
    const level = facilityLevels[f.id] || 0;
    cps += level * f.cps;
  });
}

// 自動加算
setInterval(() => {
  score += cps / 10;
  updateScoreDisplay();
}, 100);

// 起動時
window.onload = () => {
  loadGame();
  updateScoreDisplay();
  renderShop();
  calculateCPS();
  if (nameInput.value === "デバッグ先輩") {
    debugToggle.parentElement.style.display = "block";
  } else {
    debugToggle.parentElement.style.display = "none";
  }
  createDeleteButton();
};
