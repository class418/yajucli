let gameData = {
    points: 0,
    pointsPerSecond: 0,
    clickPower: 1,
    totalClicks: 0,
    feverActive: false,
    feverCooldown: false,
    upgrades: {
        takuya: { count: 0, cost: 15, pps: 1, name: 'TAKUYA', icon: 'assets/takuya.png', description: '毎秒1P' },
        homo: { count: 0, cost: 100, pps: 5, name: 'ホモ', icon: 'assets/homo.png', description: '毎秒5P' },
        senpai: { count: 0, cost: 1100, pps: 25, name: '先輩', icon: 'assets/senpai.png', description: '毎秒25P' },
        danshi: { count: 0, cost: 12000, pps: 100, name: '男子学生', icon: 'assets/chugaku.png', description: '毎秒100P' },
        yajuu: { count: 0, cost: 130000, pps: 500, name: '野獣先輩', icon: 'assets/yajuu.png', description: '毎秒500P' },
        yajuutei: { count: 0, cost: 1400000, pps: 2000, name: '野獣邸', icon: 'assets/yajuutei.png', description: '毎秒2000P' }
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

// ページ読み込み時の初期化
window.onload = function () {
    // 音声初期化
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
    document.addEventListener('touchend', function (e) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // ピンチズーム無効化
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    updateDisplay();
    renderUpgrades();

    // 自動獲得のタイマー
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

        gameData.pointsPerSecond = Object.values(gameData.upgrades)
            .reduce((total, up) => total + (up.count * up.pps), 0);

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
