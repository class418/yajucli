console.log('script js loaded');
let gameData = {
    points: 0,
    pointsPerSecond: 0,
    clickPower: 1,
    totalClicks: 0,
    feverActive: false,
    feverCooldown: false,
    upgrades: {
        KBTIT: { count: 0, cost: 15, pps: 1, name: 'KBTIT', icon: '/assets/takuya.png', description: '毎秒1P' },
        MUR: { count: 0, cost: 100, pps: 5, name: 'MUR', icon: '/assets/mur.png', description: '毎秒5P' },
        kouhai: { count: 0, cost: 1100, pps: 25, name: '後輩', icon: '/assets/kouhai.png', description: '毎秒25P' },
        KMR: { count: 0, cost: 12000, pps: 100, name: 'KMR', icon: '/assets/kmr.png', description: '毎秒100P' },
        yajuu: { count: 0, cost: 130000, pps: 500, name: '野獣先輩', icon: '/assets/yajuu.png', description: '毎秒500P' },
        yajuutei: { count: 0, cost: 1400000, pps: 2000, name: '野獣邸', icon: '/assets/yajuutei.png', description: '毎秒2000P' }
    }
};

let audioContext;
let clickBuffer, feverBuffer;
let buyMultiplier = 1;

function setBuyMultiplier(n) {
    buyMultiplier = n;

    // ボタンのactiveクラス切り替え
    document.querySelectorAll('.multiplier-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('multiplier' + n).classList.add('active');
}

async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const [clickResponse, feverResponse] = await Promise.all([
            fetch('/assets/click.mp3').catch(() => null),
            fetch('/assets/fever.mp3').catch(() => null)
        ]);

        if (clickResponse) {
            const clickArrayBuffer = await clickResponse.arrayBuffer();
            clickBuffer = await audioContext.decodeAudioData(clickArrayBuffer);
        }

        if (feverResponse) {
            const feverArrayBuffer = await feverResponse.arrayBuffer();
            feverBuffer = await audioContext.decodeAudioData(feverArrayBuffer);
        }
    } catch (e) {
        console.log('Web Audio API初期化失敗:', e);
    }
}

function playSound(buffer, volume = 0.3) {
    if (!audioContext || !buffer) return;

    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start();
    } catch (e) {
        console.log('音声再生エラー:', e);
    }
}

// --- 匿名ユーザーID取得 ---
function getAnonId() {
  console.log('getAnonId called');
  let id = localStorage.getItem('anonId');
  if (!id) {
    id = 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    localStorage.setItem('anonId', id);
  }
  return id;
}

// --- サーバーにポイント送信 ---
function sendPointsToServer() {
  fetch('/api/save_points.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      anonId: getAnonId(),
      points: gameData.points
    }),
  })
  .then(res => res.json())
  .then(json => {
    if (json.error) console.error('ポイント保存エラー:', json.error);
  })
  .catch(err => console.error('通信失敗:', err));
}

// --- 送信予約（1分間隔で送信） ---
let saveTimer = null;

function scheduleSave() {
  if (saveTimer) return; // 予約済みなら何もしない
  saveTimer = setTimeout(() => {
    sendPointsToServer();
    saveTimer = null;
  }, 60000); // 60秒後に送信
}

// --- 既存のsaveGame()内でscheduleSave()を呼ぶ例 ---
function saveGame() {
  try {
    localStorage.setItem('yajuuClickerSave', JSON.stringify(gameData));
    scheduleSave(); // 送信予約
  } catch (e) {
    console.log('セーブ失敗:', e);
  }
}

// --- ページ離脱時に最新データを送信 ---
window.addEventListener('beforeunload', () => {
  if (!navigator.sendBeacon) return;

  const data = JSON.stringify({
    anonId: getAnonId(),
    points: gameData.points
  });

  const blob = new Blob([data], { type: 'application/json' });

  navigator.sendBeacon('/api/save_points.php', blob);
});


function loadGame() {
    const saved = localStorage.getItem('yajuuClickerSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);

            gameData.points = data.points || 0;
            gameData.pointsPerSecond = data.pointsPerSecond || 0;
            gameData.clickPower = data.clickPower || 1;
            gameData.totalClicks = data.totalClicks || 0;
            gameData.feverActive = data.feverActive || false;
            gameData.feverCooldown = data.feverCooldown || false;

            if (data.upgrades) {
                Object.keys(gameData.upgrades).forEach(key => {
                    if (data.upgrades[key]) {
                        gameData.upgrades[key].count = data.upgrades[key].count || 0;
                        gameData.upgrades[key].cost = data.upgrades[key].cost || gameData.upgrades[key].cost;
                    }
                });
            }

            // PPS再計算
            gameData.pointsPerSecond = Object.values(gameData.upgrades)
                .reduce((total, up) => total + (up.count * up.pps), 0);
        } catch (e) {
            console.log('セーブデータの読み込み失敗', e);
        }
    }
}

window.onload = function () {
    initAudio();
    // 匿名IDを画面に表示
  const anonSpan = document.getElementById('anonIdDisplay');
  if (anonSpan) {
    anonSpan.textContent = getAnonId();
  }
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());

    document.addEventListener('dblclick', e => {
        e.preventDefault();
        return false;
    });

    document.addEventListener('mousedown', e => {
        if (e.detail > 1) e.preventDefault();
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', e => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener('touchmove', e => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    loadGame();
    updateDisplay();
    renderUpgrades();

    setInterval(() => {
        if (gameData.pointsPerSecond > 0) {
            gameData.points += gameData.pointsPerSecond / 10;
            updateDisplay();
            saveGame();
        }
    }, 100);

    setInterval(() => {
        if (!gameData.feverActive && !gameData.feverCooldown && gameData.points >= 1000) {
            document.getElementById('feverBtn').disabled = false;
        }
    }, 1000);

    setInterval(() => {
        saveGame();
    }, 5000);
};

function clickYajuu(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

    let points = gameData.feverActive ? gameData.clickPower * 5 : gameData.clickPower;
    gameData.points += points;
    gameData.totalClicks++;

    showClickEffect(points);
    playSound(clickBuffer, 0.3);
    updateDisplay();
    saveGame();
}

function showClickEffect(points) {
    const container = document.querySelector('.yajuu-container');
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = '+' + formatNumber(points);

    const x = Math.random() * 100 - 50;
    const y = Math.random() * 100 - 50;
    effect.style.left = (50 + x * 0.3) + '%';
    effect.style.top = (50 + y * 0.3) + '%';

    container.appendChild(effect);

    setTimeout(() => {
        container.removeChild(effect);
    }, 600);
}

function activateFever() {
    gameData.feverActive = true;
    gameData.feverCooldown = true;

    document.getElementById('yajuuImage').src = '/assets/yajuu_fever.png';
    document.getElementById('feverBtn').disabled = true;
    document.body.classList.add('fever-mode');

    playSound(feverBuffer, 0.5);

    let timeLeft = 10;
    const timerElement = document.getElementById('feverTimer');
    timerElement.style.display = 'block';
    timerElement.textContent = `フィーバータイム: ${timeLeft}s`;

    const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `フィーバータイム: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            endFever();
        }
    }, 1000);

    saveGame();
}

function endFever() {
    gameData.feverActive = false;
    document.getElementById('yajuuImage').src = '/assets/yajuu.png';
    document.body.classList.remove('fever-mode');
    document.getElementById('feverTimer').style.display = 'none';

    let cooldownTime = 30;
    const cooldownTimer = setInterval(() => {
        cooldownTime--;
        if (cooldownTime <= 0) {
            clearInterval(cooldownTimer);
            gameData.feverCooldown = false;
        }
    }, 1000);

    saveGame();
}

function buyUpgrade(upgradeKey) {
    const upgrade = gameData.upgrades[upgradeKey];
    let bought = 0;

    for (let i = 0; i < buyMultiplier; i++) {
        if (gameData.points >= upgrade.cost) {
            gameData.points -= upgrade.cost;
            upgrade.count++;
            bought++;
            upgrade.cost = Math.floor(upgrade.cost * 1.15);
        } else {
            break;
        }
    }

    if (bought > 0) {
        gameData.pointsPerSecond = Object.values(gameData.upgrades)
            .reduce((total, up) => total + (up.count * up.pps), 0);
        updateDisplay();
        saveGame();
    }
}

function buyClickUpgrade() {
    const cost = gameData.clickPower * 100;
    if (gameData.points >= cost) {
        gameData.points -= cost;
        gameData.clickPower++;
        updateDisplay();
        saveGame();
    }
}

function updateDisplay() {
    document.getElementById('points').textContent = formatNumber(gameData.points);
    document.getElementById('pointsPerSecond').textContent = formatNumber(gameData.pointsPerSecond);
    document.getElementById('clickPower').textContent = gameData.clickPower;
    document.getElementById('totalClicks').textContent = formatNumber(gameData.totalClicks);

    const clickCost = gameData.clickPower * 100;
    document.getElementById('clickUpgradeCost').textContent = formatNumber(clickCost);

    document.getElementById('clickUpgradeBtn').disabled = gameData.points < clickCost;

    renderUpgrades();
}

function renderUpgrades() {
    const upgradeList = document.getElementById('upgradeList');
    upgradeList.innerHTML = '';

    Object.entries(gameData.upgrades).forEach(([key, upgrade]) => {
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'upgrade-item';

        upgradeDiv.innerHTML = `
            <div class="upgrade-info">
                <img src="${upgrade.icon}" alt="${upgrade.name}" class="upgrade-icon">
                <div class="upgrade-details">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-description">${upgrade.description}</div>
                </div>
            </div>
            <div class="upgrade-count">${upgrade.count}</div>
            <button class="buy-btn" onclick="buyUpgrade('${key}')" ${gameData.points < upgrade.cost ? 'disabled' : ''}>
                ${formatNumber(upgrade.cost)}
            </button>
        `;

        upgradeList.appendChild(upgradeDiv);
    });
}

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}
