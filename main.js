let gameData = {
    points: 0,
    pointsPerSecond: 0,
    clickPower: 1,
    totalClicks: 0,
    feverActive: false,
    feverCooldown: false,
    upgrades: {
        takuya: { count: 0, cost: 15, pps: 1, name: 'TAKUYA', icon: 'assets/takuya.png', description: '毎秒1M' },
        mur: { count: 0, cost: 100, pps: 5, name: 'MUR', icon: 'assets/mur.png', description: '毎秒5M' },
        kouhai: { count: 0, cost: 1100, pps: 25, name: '後輩', icon: 'assets/kouhai.png', description: '毎秒25M' },
        kmr: { count: 0, cost: 12000, pps: 100, name: 'KMR', icon: 'assets/kmr.png', description: '毎秒100M' },
        yajuu: { count: 0, cost: 130000, pps: 500, name: '野獣先輩', icon: 'assets/yajuu.png', description: '毎秒500M' },
        yajuutei: { count: 0, cost: 1400000, pps: 2000, name: '野獣邸', icon: 'assets/yajuutei.png', description: '毎秒2000M' }
    }
};

// 音声関連
let audioContext;
let clickBuffer, feverBuffer;

async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 音声ファイルを読み込み
        const [clickResponse, feverResponse] = await Promise.all([
            fetch('assets/click.mp3').catch(() => null),
            fetch('assets/fever.mp3').catch(() => null)
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

// セーブとロード
function saveGame() {
    localStorage.setItem('yajuuClickerSave', JSON.stringify(gameData));
}

function loadGame() {
    const saved = localStorage.getItem('yajuuClickerSave');
    if (saved) {
        try {
            const loadedData = JSON.parse(saved);
            Object.assign(gameData, loadedData);

            // 型や関数のないところは復元
            if (!gameData.upgrades) gameData.upgrades = {};
            // 可能ならcostを整数にし直す
            for (const key in gameData.upgrades) {
                gameData.upgrades[key].cost = Math.floor(gameData.upgrades[key].cost);
                if (!gameData.upgrades[key].count) gameData.upgrades[key].count = 0;
            }
        } catch {
            // 読み込み失敗なら初期化そのまま
        }
    }
}

// セーブ削除（確認付き）
function clearSave() {
    if (confirm('セーブデータを完全に削除しますか？この操作は戻せません。')) {
        localStorage.removeItem('yajuuClickerSave');
        location.reload();
    }
}

// ページ読み込み時の初期化
window.onload = function () {
    initAudio();

    // ズーム完全無効化
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });
    document.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    });
    document.addEventListener('gestureend', function (e) {
        e.preventDefault();
    });
    document.addEventListener('dblclick', function (e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('mousedown', function (e) {
        if (e.detail > 1) {
            e.preventDefault();
        }
    });

    // タッチズーム無効化
    let lastTouchEnd = 0;
    document.addEventListener(
        'touchend',
        function (e) {
            const now = new Date().getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        },
        { passive: false }
    );

    // ピンチズーム無効化
    document.addEventListener(
        'touchmove',
        function (e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        },
        { passive: false }
    );

    loadGame();

    updateDisplay();
    renderUpgrades();

    // 自動獲得のタイマー (0.1秒ごと)
    setInterval(() => {
        if (gameData.pointsPerSecond > 0) {
            gameData.points += gameData.pointsPerSecond / 10;
            updateDisplay();
        }
    }, 100);

    // フィーバーボタンのクールダウンチェック
    setInterval(() => {
        if (!gameData.feverActive && !gameData.feverCooldown && gameData.points >= 1000) {
            document.getElementById('feverBtn').disabled = false;
        }
    }, 1000);

    // 1秒ごとにセーブ
    setInterval(() => {
        saveGame();
    }, 1000);

    // セーブ削除ボタンを表示（bodyの一番下に）
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'セーブ削除';
    clearBtn.style.position = 'fixed';
    clearBtn.style.bottom = '10px';
    clearBtn.style.right = '10px';
    clearBtn.style.background = 'rgba(255,255,255,0.2)';
    clearBtn.style.border = 'none';
    clearBtn.style.color = 'white';
    clearBtn.style.padding = '8px 12px';
    clearBtn.style.borderRadius = '8px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.zIndex = '9999';
    clearBtn.addEventListener('click', clearSave);
    document.body.appendChild(clearBtn);
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

    // クリックエフェクトをクリックした場所に表示
    showClickEffect(event, points);

    playSound(clickBuffer, 0.3);

    updateDisplay();
}

function showClickEffect(event, points) {
    const container = document.querySelector('.yajuu-container');
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = '+' + formatNumber(points);

    // マウスまたはタッチの座標取得
    let x, y;
    if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }

    // containerの位置を取得
    const rect = container.getBoundingClientRect();

    // 相対位置を計算
    const relX = x - rect.left;
    const relY = y - rect.top;

    effect.style.left = relX + 'px';
    effect.style.top = relY + 'px';

    container.appendChild(effect);

    setTimeout(() => {
        container.removeChild(effect);
    }, 600);
}

function activateFever() {
    gameData.feverActive = true;
    gameData.feverCooldown = true;

    document.getElementById('yajuuImage').src = 'assets/yajuu_fever.png';
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
}

function endFever() {
    gameData.feverActive = false;
    document.getElementById('yajuuImage').src = 'assets/yajuu.png';
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
}

function buyUpgrade(upgradeKey) {
    const upgrade = gameData.upgrades[upgradeKey];
    if (gameData.points >= upgrade.cost) {
        gameData.points -= upgrade.cost;
        upgrade.count++;
        upgrade.cost = Math.floor(upgrade.cost * 1.15);

        gameData.pointsPerSecond = Object.values(gameData.upgrades).reduce(
            (total, up) => total + up.count * up.pps,
            0
        );

        updateDisplay();
    }
}

function buyClickUpgrade() {
    const cost = gameData.clickPower * 100;
    if (gameData.points >= cost) {
        gameData.points -= cost;
        gameData.clickPower++;
        updateDisplay();
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
                <img src="${upgrade.icon}" alt="${upgrade.name}" class="upgrade-icon" />
                <div class="upgrade-details">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-description">${upgrade.description}</div>
                    <div class="upgrade-cost">${formatNumber(upgrade.cost)}P</div>
                </div>
            </div>
            <div class="upgrade-count">${upgrade.count}</div>
            <button class="buy-btn" onclick="buyUpgrade('${key}')" ${gameData.points < upgrade.cost ? 'disabled' : ''}>${formatNumber(upgrade.cost)}</button>
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
