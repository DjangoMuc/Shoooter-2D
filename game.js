// ============================================
// SHOOOTER 2D - Local Multiplayer Shooter
// ============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Constants ---
const GRAVITY = 0.6;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -12;
const BULLET_SPEED = 8;
const BULLET_DAMAGE = 10;
const SHOOT_COOLDOWN = 300;
const AI_SHOOT_COOLDOWN = 500;
const MAX_HP = 100;
const PX = 2; // Pixel scale factor

// --- Power-Up Definitions ---
const POWERUP_TYPES = {
    heal: {
        name: 'Heal',
        color: '#44dd44',
        colorDark: '#228822',
        symbol: '+',
        duration: 0, // instant
        description: '+40 HP',
    },
    invincible: {
        name: 'Shield',
        color: '#ffdd00',
        colorDark: '#aa8800',
        symbol: 'S',
        duration: 5000,
        description: '5s invincible',
    },
    rapidfire: {
        name: 'Rapid Fire',
        color: '#ff8800',
        colorDark: '#aa5500',
        symbol: 'F',
        duration: 6000,
        description: '6s faster bullets',
    },
    nocooldown: {
        name: 'No Cooldown',
        color: '#cc44ff',
        colorDark: '#7722aa',
        symbol: '!',
        duration: 4000,
        description: '4s half cooldown',
    },
    damage: {
        name: 'More Damage',
        color: '#ff2244',
        colorDark: '#aa1133',
        symbol: 'D',
        duration: 6000,
        description: '6s 3x damage',
    },
};
const POWERUP_SPAWN_INTERVAL = 4000; // ms between spawns
const POWERUP_SIZE = 18;

// --- Game State ---
let gameState = 'start'; // 'start', 'settings', 'playing', 'dying', 'roundover', 'gameover'
let gameMode = null; // 'pvp' or 'pve'
let winner = null;
let loser = null;
let deathTimer = 0;
const DEATH_DURATION = 90; // frames (~1.5 seconds)
let particles = [];
let damageNumbers = [];
let frameCount = 0;
let powerups = [];
let lastPowerupSpawn = 0;
let roundStartTime = 0;
let suddenDeathActive = false;
let ammoPickups = [];
let lastAmmoSpawn = 0;

// --- Settings ---
const settings = {
    map: 0,       // index into MAP_KEYS
    mode: 0,      // 0 = PvP, 1 = PvE
    bestOf: 0,    // 0 = Bo1, 1 = Bo3, 2 = Bo5
    bg: 0,        // index into BG_THEMES
    sound: 0,     // 0 = On, 1 = Off
    lang: 0,      // 0 = English, 1 = Deutsch
    hp: 1,        // index into HP_OPTIONS (default 100)
    puFreq: 1,    // index into PU_FREQ_OPTIONS (default Normal)
    aiDiff: 1,    // index into AI_DIFF_OPTIONS (default Medium)
    gravity: 1,   // index into GRAVITY_OPTIONS (default Normal)
    suddenDeath: 0, // index into SUDDEN_DEATH_OPTIONS (default Off)
    dropThrough: 0, // 0 = On, 1 = Off
    infiniteAmmo: 1, // 0 = On (infinite), 1 = Off (limited) - default limited
    ammoFreq: 1,     // index into AMMO_FREQ_OPTIONS (default Normal)
    p1Skin: 0,       // index into SKIN_OPTIONS (default Cyan)
    p2Skin: 1,       // index into SKIN_OPTIONS (default Red)
};
const BEST_OF_OPTIONS = [1, 3, 5];
const MODE_OPTIONS = ['Player vs Player', 'Player vs AI'];
const HP_OPTIONS = [50, 100, 150, 200];
const PU_FREQ_OPTIONS = [
    { name: 'Off', interval: Infinity },
    { name: 'Normal', interval: 4000 },
    { name: 'Frequent', interval: 2000 },
    { name: 'Chaos', interval: 800 },
];
const AI_DIFF_OPTIONS = [
    { name: 'Easy', thinkInterval: 12, cooldown: 700, accuracy: 0.5 },
    { name: 'Medium', thinkInterval: 8, cooldown: 500, accuracy: 0.7 },
    { name: 'Hard', thinkInterval: 4, cooldown: 350, accuracy: 0.9 },
];
const SOUND_OPTIONS = ['On', 'Off'];
const GRAVITY_OPTIONS = [
    { name: 'Moon', value: 0.3 },
    { name: 'Normal', value: 0.6 },
    { name: 'Heavy', value: 0.9 },
];
const SUDDEN_DEATH_OPTIONS = [
    { name: 'Off', time: 0 },
    { name: 'After 30s', time: 30 },
    { name: 'After 60s', time: 60 },
    { name: 'After 90s', time: 90 },
];
const DROP_THROUGH_OPTIONS = ['On', 'Off'];
const INFINITE_AMMO_OPTIONS = ['On', 'Off'];
const START_AMMO = 0;
const AMMO_PICKUP_AMOUNT = 5;
const AMMO_SPAWN_INTERVAL = 5000; // ms (default, overridden by setting)
const AMMO_FREQ_OPTIONS = [
    { name: 'Slow', interval: 8000 },
    { name: 'Normal', interval: 5000 },
    { name: 'Fast', interval: 3000 },
    { name: 'Very Fast', interval: 1500 },
];
const LANG_OPTIONS = ['English', 'Deutsch'];

// --- Translations ---
const TEXTS = {
    en: {
        subtitle: 'Local 2D Pixel Shooter',
        pressEnter: 'Press ENTER to start',
        pressSpace: 'Press SPACE for settings',
        player1: 'PLAYER 1', player2: 'PLAYER 2',
        move: 'Move:', jump: 'Jump:', drop: 'Drop:', shoot: 'Shoot:',
        settings: 'SETTINGS', system: 'SYSTEM', gameplay: 'GAMEPLAY',
        sysDesc: 'Map, Background, Sound, Colors...',
        gpDesc: 'Mode, HP, Gravity, Sudden Death...',
        selectCat: 'Select a category  |  F to start game  |  ESC back',
        pressH: 'Press H for How to Play',
        arrowChange: '\u2190 \u2192 to change  |  F to start game  |  ESC back',
        mapPreview: 'Map Preview',
        pressEnterEdit: 'Press ENTER to edit',
        lblMap: 'MAP', lblBg: 'BACKGROUND', lblSound: 'SOUND', lblLang: 'LANGUAGE',
        lblControls: 'CONTROLS', lblMode: 'MODE', lblRounds: 'ROUNDS', lblMaxHp: 'MAX HP',
        lblPuFreq: 'PU SPAWN FREQ', lblAiDiff: 'AI DIFFICULTY', lblGravity: 'GRAVITY',
        lblSuddenDeath: 'SUDDEN DEATH', lblDropThrough: 'DROP-THROUGH', lblInfAmmo: 'INFINITE AMMO',
        lblAmmoFreq: 'AMMO SPAWN FREQ',
        lblP1Skin: 'P1 COLOR', lblP2Skin: 'P2 COLOR',
        bestOf: 'Best of ',
        slow: 'Slow', fast: 'Fast', veryFast: 'Very Fast',
        on: 'On', off: 'Off',
        pvp: 'Player vs Player', pve: 'Player vs AI',
        easy: 'Easy', medium: 'Medium', hard: 'Hard',
        moon: 'Moon', normal: 'Normal', heavy: 'Heavy',
        frequent: 'Frequent', chaos: 'Chaos',
        after30: 'After 30s', after60: 'After 60s', after90: 'After 90s',
        keyBindings: 'KEY BINDINGS',
        alreadyUsed: 'already used!', tryAnother: 'Try another key...',
        pressKey: 'Press a key...', enterChange: 'ENTER to change',
        rebindHint: '\u2190/\u2192 switch player  |  \u2191/\u2193 select action  |  ENTER to rebind  |  ESC back',
        moveLeft: 'Move Left', moveRight: 'Move Right',
        howToPlay: 'HOW TO PLAY',
        goalTitle: 'GOAL',
        goal1: 'Defeat your opponent by reducing their HP to 0.',
        goal2: 'In Best of 3/5, win enough rounds to take the match!',
        goal3: 'In Best of 1, a single round decides the winner.',
        controlsTitle: 'CONTROLS',
        controlsDefault: '(default - can be changed in settings)',
        p1Label: 'Player 1:', p2Label: 'Player 2:',
        p1Controls: 'A/D Move  W Jump  S Drop  Space Shoot',
        p2Controls: '\u2190/\u2192 Move  \u2191 Jump  \u2193 Drop  Enter Shoot',
        escMenu: 'ESC = Return to menu at any time',
        mechTitle: 'MECHANICS',
        mech1: '\u2022 Each player starts with configurable HP. Shots deal 10 damage.',
        mech2: '\u2022 Jump on platforms and drop through them (press down).',
        mech3: '\u2022 Power-ups spawn randomly. Walk over them to collect!',
        mech4: '\u2022 Limited ammo mode: start with 0 shots, collect ammo pickups',
        mech5: '  (blue "A" boxes) for +5 ammo. Ammo count shown next to HP bar.',
        puTitle: 'POWER-UPS',
        closeHint: 'Press H or ESC to close',
        winsMatch: 'wins the match!', winsRound: 'wins the round!',
        score: 'Score:', roundStats: 'ROUND STATS',
        shotsFired: 'Shots Fired', hits: 'Hits', accuracy: 'Accuracy',
        damageDone: 'Damage Done', puCollected: 'Power-Ups collected',
        pressRMenu: 'Press R to return to menu',
        pressRNext: 'Press R for next round',
        suddenDeath: 'SUDDEN DEATH',
        blocked: 'BLOCKED',
    },
    de: {
        subtitle: 'Lokaler 2D Pixel Shooter',
        pressEnter: 'ENTER zum Starten',
        pressSpace: 'LEERTASTE f\u00fcr Einstellungen',
        player1: 'SPIELER 1', player2: 'SPIELER 2',
        move: 'Bewegen:', jump: 'Springen:', drop: 'Fallen:', shoot: 'Schie\u00dfen:',
        settings: 'EINSTELLUNGEN', system: 'SYSTEM', gameplay: 'GAMEPLAY',
        sysDesc: 'Karte, Hintergrund, Ton, Farben...',
        gpDesc: 'Modus, HP, Gravitation, Pl\u00f6tzl. Tod...',
        selectCat: 'Kategorie w\u00e4hlen  |  F = Spiel starten  |  ESC zur\u00fcck',
        pressH: 'H f\u00fcr Spielanleitung',
        arrowChange: '\u2190 \u2192 \u00e4ndern  |  F = Spiel starten  |  ESC zur\u00fcck',
        mapPreview: 'Kartenvorschau',
        pressEnterEdit: 'ENTER zum Bearbeiten',
        lblMap: 'KARTE', lblBg: 'HINTERGRUND', lblSound: 'TON', lblLang: 'SPRACHE',
        lblControls: 'STEUERUNG', lblMode: 'MODUS', lblRounds: 'RUNDEN', lblMaxHp: 'MAX HP',
        lblPuFreq: 'PU SPAWN H\u00c4UFIGK.', lblAiDiff: 'KI SCHWIERIGKEIT', lblGravity: 'GRAVITATION',
        lblSuddenDeath: 'PL\u00d6TZL. TOD', lblDropThrough: 'DURCHFALLEN', lblInfAmmo: 'UNENDL. MUNITION',
        lblAmmoFreq: 'MUNI. SPAWN H\u00c4UFIGK.',
        lblP1Skin: 'S1 FARBE', lblP2Skin: 'S2 FARBE',
        bestOf: 'Best of ',
        slow: 'Langsam', fast: 'Schnell', veryFast: 'Sehr schnell',
        on: 'An', off: 'Aus',
        pvp: 'Spieler vs Spieler', pve: 'Spieler vs KI',
        easy: 'Leicht', medium: 'Mittel', hard: 'Schwer',
        moon: 'Mond', normal: 'Normal', heavy: 'Schwer',
        frequent: 'H\u00e4ufig', chaos: 'Chaos',
        after30: 'Nach 30s', after60: 'Nach 60s', after90: 'Nach 90s',
        keyBindings: 'TASTENBELEGUNG',
        alreadyUsed: 'bereits belegt!', tryAnother: 'Andere Taste w\u00e4hlen...',
        pressKey: 'Taste dr\u00fccken...', enterChange: 'ENTER zum \u00c4ndern',
        rebindHint: '\u2190/\u2192 Spieler  |  \u2191/\u2193 Aktion  |  ENTER = \u00e4ndern  |  ESC zur\u00fcck',
        moveLeft: 'Links', moveRight: 'Rechts',
        howToPlay: 'SPIELANLEITUNG',
        goalTitle: 'ZIEL',
        goal1: 'Besiege deinen Gegner, indem du seine HP auf 0 reduzierst.',
        goal2: 'Bei Best of 3/5 gewinne genug Runden f\u00fcr den Sieg!',
        goal3: 'Bei Best of 1 entscheidet eine einzige Runde.',
        controlsTitle: 'STEUERUNG',
        controlsDefault: '(Standard - in Einstellungen \u00e4nderbar)',
        p1Label: 'Spieler 1:', p2Label: 'Spieler 2:',
        p1Controls: 'A/D Bewegen  W Springen  S Fallen  Leertaste Schie\u00dfen',
        p2Controls: '\u2190/\u2192 Bewegen  \u2191 Springen  \u2193 Fallen  Enter Schie\u00dfen',
        escMenu: 'ESC = Zur\u00fcck zum Men\u00fc',
        mechTitle: 'MECHANIKEN',
        mech1: '\u2022 Jeder Spieler startet mit einstellbaren HP. Sch\u00fcsse machen 10 Schaden.',
        mech2: '\u2022 Springe auf Plattformen und falle durch sie hindurch (Runter-Taste).',
        mech3: '\u2022 Power-Ups erscheinen zuf\u00e4llig. Laufe dr\u00fcber zum Einsammeln!',
        mech4: '\u2022 Begrenzte Munition: Starte mit 0 Schuss, sammle Munitions-Pickups',
        mech5: '  (blaue "A" Boxen) f\u00fcr +5 Munition. Anzeige neben der HP-Leiste.',
        puTitle: 'POWER-UPS',
        closeHint: 'H oder ESC zum Schlie\u00dfen',
        winsMatch: 'gewinnt das Match!', winsRound: 'gewinnt die Runde!',
        score: 'Punkte:', roundStats: 'RUNDENSTATISTIK',
        shotsFired: 'Sch\u00fcsse', hits: 'Treffer', accuracy: 'Genauigkeit',
        damageDone: 'Schaden', puCollected: 'Power-Ups gesammelt',
        pressRMenu: 'R = Zur\u00fcck zum Men\u00fc',
        pressRNext: 'R = N\u00e4chste Runde',
        suddenDeath: 'PL\u00d6TZLICHER TOD',
        blocked: 'GEBLOCKT',
    },
};

function T(key) {
    const lang = settings.lang === 0 ? 'en' : 'de';
    return TEXTS[lang][key] || TEXTS.en[key] || key;
}

// --- Settings Persistence (localStorage) ---
const SETTINGS_KEY = 'shoooter2d_settings';

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore storage errors */ }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            for (const key in parsed) {
                if (key in settings) settings[key] = parsed[key];
            }
        }
    } catch (e) { /* ignore parse errors, use defaults */ }
}

const BINDINGS_KEY = 'shoooter2d_bindings';

function saveBindings() {
    try {
        localStorage.setItem(BINDINGS_KEY, JSON.stringify(customBindings));
    } catch (e) { /* ignore storage errors */ }
}

function loadBindings() {
    try {
        const saved = localStorage.getItem(BINDINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.p1) for (const key in parsed.p1) { if (key in customBindings.p1) customBindings.p1[key] = parsed.p1[key]; }
            if (parsed.p2) for (const key in parsed.p2) { if (key in customBindings.p2) customBindings.p2[key] = parsed.p2[key]; }
        }
    } catch (e) { /* ignore parse errors, use defaults */ }
}

loadSettings();

// Settings menu state
let settingsCategory = -1; // -1 = category select, 0 = system, 1 = gameplay
let settingsCursor = 0;
const BG_THEMES = [
    {
        name: 'Night City',
        sky: ['#0a0a1a', '#0f1128', '#141836', '#16213e', '#1a2744'],
        buildingColor: '#0d1525',
        windowColors: ['#2a3a5e', '#1a2744'],
        starColor: '#ffffff',
    },
    {
        name: 'Sunset',
        sky: ['#1a0a2e', '#2d1b4e', '#5e2d53', '#b85450', '#e8844a'],
        buildingColor: '#120820',
        windowColors: ['#ff8844', '#cc6633'],
        starColor: '#ffddaa',
    },
    {
        name: 'Forest',
        sky: ['#0a1a0a', '#0f2818', '#143622', '#1a4a2e', '#1e5e38'],
        buildingColor: '#0a1508',
        windowColors: ['#2a5e3a', '#1a4428'],
        starColor: '#aaffaa',
    },
    {
        name: 'Arctic',
        sky: ['#0a1a2e', '#152840', '#203850', '#2a4a66', '#3a6080'],
        buildingColor: '#0f2035',
        windowColors: ['#4488aa', '#336688'],
        starColor: '#cceeFF',
    },
    {
        name: 'Volcano',
        sky: ['#1a0a0a', '#2e1010', '#441818', '#5e2020', '#802a1a'],
        buildingColor: '#150808',
        windowColors: ['#ff4422', '#aa2211'],
        starColor: '#ffaa88',
    },
];
let showHowToPlay = false;
let roundWins = { p1: 0, p2: 0 };

// --- Key Rebinding ---
let rebindState = null; // null = not rebinding, otherwise { player: 1|2, action: string, step: number }
const KEY_ACTIONS = ['left', 'right', 'jump', 'down', 'shoot'];
const KEY_ACTION_LABELS = { left: 'Move Left', right: 'Move Right', jump: 'Jump', down: 'Drop', shoot: 'Shoot' };
// Custom key bindings (initialized to defaults)
let customBindings = {
    p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', shoot: 'Space' },
    p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', shoot: 'Enter' },
};
loadBindings();
let rebindPlayer = 1; // which player is selected for rebinding
let rebindCursor = 0; // which action is selected
let rebindError = 0;  // timestamp of last error
let rebindErrorKey = ''; // key that caused the error

function getKeyDisplayName(code) {
    const names = {
        'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E', 'KeyF': 'F',
        'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
        'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O', 'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R',
        'KeyS': 'S', 'KeyT': 'T', 'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X',
        'KeyY': 'Y', 'KeyZ': 'Z',
        'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
        'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
        'Space': 'Space', 'Enter': 'Enter', 'ShiftLeft': 'L-Shift', 'ShiftRight': 'R-Shift',
        'ControlLeft': 'L-Ctrl', 'ControlRight': 'R-Ctrl',
        'ArrowUp': '\u2191', 'ArrowDown': '\u2193', 'ArrowLeft': '\u2190', 'ArrowRight': '\u2192',
        'Comma': ',', 'Period': '.', 'Slash': '/', 'Semicolon': ';', 'Quote': "'",
        'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\', 'Minus': '-', 'Equal': '=',
        'Backquote': '`', 'Tab': 'Tab', 'CapsLock': 'Caps',
        'Numpad0': 'Num0', 'Numpad1': 'Num1', 'Numpad2': 'Num2', 'Numpad3': 'Num3',
        'Numpad4': 'Num4', 'Numpad5': 'Num5', 'Numpad6': 'Num6', 'Numpad7': 'Num7',
        'Numpad8': 'Num8', 'Numpad9': 'Num9',
    };
    return names[code] || code;
}

// --- Stats tracking ---
let stats = {
    p1: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
    p2: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
};

// --- Input ---
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
    }

    // --- Start Screen ---
    if (gameState === 'start') {
        if (e.code === 'Enter') {
            // Quick start with current settings
            gameMode = settings.mode === 0 ? 'pvp' : 'pve';
            platforms = MAPS[MAP_KEYS[settings.map]].platforms;
            roundWins = { p1: 0, p2: 0 };
            prerenderBackground();
            resetGame();
        }
        if (e.code === 'Space') {
            gameState = 'settings';
            settingsCursor = 0;
        }
    }

    // --- Settings Screen ---
    else if (gameState === 'settings') {
        if (showHowToPlay) {
            if (e.code === 'KeyH' || e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
                showHowToPlay = false;
            }
        } else if (settingsCategory === -1) {
            // Category selection: System or Gameplay
            if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
                settingsCursor = settingsCursor === 0 ? 1 : 0;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD') {
                settingsCursor = settingsCursor === 0 ? 1 : 0;
            }
            if (e.code === 'Enter' || e.code === 'Space') {
                settingsCategory = settingsCursor;
                settingsCursor = 0;
            }
            if (e.code === 'KeyH') {
                showHowToPlay = true;
            }
            if (e.code === 'Escape') {
                gameState = 'start';
            }
        } else if (settingsCategory === 0) {
            // System settings: Map, Background, Sound, Language, P1 Color, P2 Color, Controls
            const sysCount = 7;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                settingsCursor = (settingsCursor - 1 + sysCount) % sysCount;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                settingsCursor = (settingsCursor + 1) % sysCount;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                if (settingsCursor === 0) settings.map = (settings.map - 1 + MAP_KEYS.length) % MAP_KEYS.length;
                if (settingsCursor === 1) { settings.bg = (settings.bg - 1 + BG_THEMES.length) % BG_THEMES.length; prerenderBackground(); }
                if (settingsCursor === 2) settings.sound = (settings.sound - 1 + SOUND_OPTIONS.length) % SOUND_OPTIONS.length;
                if (settingsCursor === 3) settings.lang = (settings.lang - 1 + LANG_OPTIONS.length) % LANG_OPTIONS.length;
                if (settingsCursor === 4) { settings.p1Skin = (settings.p1Skin - 1 + SKIN_OPTIONS.length) % SKIN_OPTIONS.length; updateSkins(); }
                if (settingsCursor === 5) { settings.p2Skin = (settings.p2Skin - 1 + SKIN_OPTIONS.length) % SKIN_OPTIONS.length; updateSkins(); }
                saveSettings();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                if (settingsCursor === 0) settings.map = (settings.map + 1) % MAP_KEYS.length;
                if (settingsCursor === 1) { settings.bg = (settings.bg + 1) % BG_THEMES.length; prerenderBackground(); }
                if (settingsCursor === 2) settings.sound = (settings.sound + 1) % SOUND_OPTIONS.length;
                if (settingsCursor === 3) settings.lang = (settings.lang + 1) % LANG_OPTIONS.length;
                if (settingsCursor === 4) { settings.p1Skin = (settings.p1Skin + 1) % SKIN_OPTIONS.length; updateSkins(); }
                if (settingsCursor === 5) { settings.p2Skin = (settings.p2Skin + 1) % SKIN_OPTIONS.length; updateSkins(); }
                saveSettings();
            }
            if (e.code === 'Enter' || e.code === 'Space') {
                if (settingsCursor === 6) {
                    gameState = 'rebind';
                    rebindPlayer = 1;
                    rebindCursor = 0;
                    rebindState = null;
                }
            }
            if (e.code === 'KeyH') { showHowToPlay = true; }
            if (e.code === 'Escape') {
                settingsCategory = -1;
                settingsCursor = 0;
            }
        } else if (settingsCategory === 1) {
            // Gameplay settings: Mode, Rounds, HP, Power-Up Freq, AI Difficulty, Gravity, Sudden Death, Drop-Through, Infinite Ammo
            const gpCount = 10;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                settingsCursor = (settingsCursor - 1 + gpCount) % gpCount;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                settingsCursor = (settingsCursor + 1) % gpCount;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                if (settingsCursor === 0) settings.mode = (settings.mode - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length;
                if (settingsCursor === 1) settings.bestOf = (settings.bestOf - 1 + BEST_OF_OPTIONS.length) % BEST_OF_OPTIONS.length;
                if (settingsCursor === 2) settings.hp = (settings.hp - 1 + HP_OPTIONS.length) % HP_OPTIONS.length;
                if (settingsCursor === 3) settings.puFreq = (settings.puFreq - 1 + PU_FREQ_OPTIONS.length) % PU_FREQ_OPTIONS.length;
                if (settingsCursor === 4) settings.aiDiff = (settings.aiDiff - 1 + AI_DIFF_OPTIONS.length) % AI_DIFF_OPTIONS.length;
                if (settingsCursor === 5) settings.gravity = (settings.gravity - 1 + GRAVITY_OPTIONS.length) % GRAVITY_OPTIONS.length;
                if (settingsCursor === 6) settings.suddenDeath = (settings.suddenDeath - 1 + SUDDEN_DEATH_OPTIONS.length) % SUDDEN_DEATH_OPTIONS.length;
                if (settingsCursor === 7) settings.dropThrough = (settings.dropThrough - 1 + DROP_THROUGH_OPTIONS.length) % DROP_THROUGH_OPTIONS.length;
                if (settingsCursor === 8) settings.infiniteAmmo = (settings.infiniteAmmo - 1 + INFINITE_AMMO_OPTIONS.length) % INFINITE_AMMO_OPTIONS.length;
                if (settingsCursor === 9) settings.ammoFreq = (settings.ammoFreq - 1 + AMMO_FREQ_OPTIONS.length) % AMMO_FREQ_OPTIONS.length;
                saveSettings();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                if (settingsCursor === 0) settings.mode = (settings.mode + 1) % MODE_OPTIONS.length;
                if (settingsCursor === 1) settings.bestOf = (settings.bestOf + 1) % BEST_OF_OPTIONS.length;
                if (settingsCursor === 2) settings.hp = (settings.hp + 1) % HP_OPTIONS.length;
                if (settingsCursor === 3) settings.puFreq = (settings.puFreq + 1) % PU_FREQ_OPTIONS.length;
                if (settingsCursor === 4) settings.aiDiff = (settings.aiDiff + 1) % AI_DIFF_OPTIONS.length;
                if (settingsCursor === 5) settings.gravity = (settings.gravity + 1) % GRAVITY_OPTIONS.length;
                if (settingsCursor === 6) settings.suddenDeath = (settings.suddenDeath + 1) % SUDDEN_DEATH_OPTIONS.length;
                if (settingsCursor === 7) settings.dropThrough = (settings.dropThrough + 1) % DROP_THROUGH_OPTIONS.length;
                if (settingsCursor === 8) settings.infiniteAmmo = (settings.infiniteAmmo + 1) % INFINITE_AMMO_OPTIONS.length;
                if (settingsCursor === 9) settings.ammoFreq = (settings.ammoFreq + 1) % AMMO_FREQ_OPTIONS.length;
                saveSettings();
            }
            if (e.code === 'KeyH') { showHowToPlay = true; }
            if (e.code === 'Escape') {
                settingsCategory = -1;
                settingsCursor = 1;
            }
        }
        // Start game from any settings sub-screen with F key
        if (!showHowToPlay && e.code === 'KeyF') {
            gameMode = settings.mode === 0 ? 'pvp' : 'pve';
            platforms = MAPS[MAP_KEYS[settings.map]].platforms;
            roundWins = { p1: 0, p2: 0 };
            showHowToPlay = false;
            settingsCategory = -1;
            prerenderBackground();
            resetGame();
        }
    }

    // --- Key Rebinding Screen ---
    else if (gameState === 'rebind') {
        if (rebindState) {
            // Waiting for key press to assign
            if (e.code === 'Escape') {
                // Cancel rebinding
                rebindState = null;
            } else {
                // Check if key is already used by either player
                const pKey = rebindState.player === 1 ? 'p1' : 'p2';
                const otherKey = rebindState.player === 1 ? 'p2' : 'p1';
                let duplicate = false;
                // Check same player
                for (const action of KEY_ACTIONS) {
                    if (action !== rebindState.action && customBindings[pKey][action] === e.code) {
                        duplicate = true;
                        break;
                    }
                }
                // Check other player
                if (!duplicate) {
                    for (const action of KEY_ACTIONS) {
                        if (customBindings[otherKey][action] === e.code) {
                            duplicate = true;
                            break;
                        }
                    }
                }
                if (duplicate) {
                    // Show error briefly, don't assign
                    rebindError = Date.now();
                    rebindErrorKey = e.code;
                } else {
                    customBindings[pKey][rebindState.action] = e.code;
                    rebindState = null;
                    saveBindings();
                }
            }
        } else {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                rebindCursor = (rebindCursor - 1 + KEY_ACTIONS.length) % KEY_ACTIONS.length;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                rebindCursor = (rebindCursor + 1) % KEY_ACTIONS.length;
            }
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
                rebindPlayer = rebindPlayer === 1 ? 2 : 1;
            }
            if (e.code === 'Enter' || e.code === 'Space') {
                // Start listening for new key
                rebindState = { player: rebindPlayer, action: KEY_ACTIONS[rebindCursor] };
            }
            if (e.code === 'Escape') {
                gameState = 'settings';
            }
        }
    }

    // --- Game Over ---
    if (gameState === 'gameover' && e.code === 'KeyR') {
        const winsNeeded = Math.ceil(BEST_OF_OPTIONS[settings.bestOf] / 2);
        if (roundWins.p1 >= winsNeeded || roundWins.p2 >= winsNeeded) {
            // Match is over, go back to start
            roundWins = { p1: 0, p2: 0 };
            gameState = 'start';
        } else {
            // Next round
            resetGame();
        }
    }

    // --- Escape from game ---
    if ((gameState === 'playing' || gameState === 'gameover' || gameState === 'dying' || gameState === 'roundover') && e.code === 'Escape') {
        // Clear AI virtual keys so they don't persist
        AI.reset();
        if (player2) {
            const c = player2.controls;
            keys[c.left] = false;
            keys[c.right] = false;
            keys[c.jump] = false;
            keys[c.shoot] = false;
            keys[c.down] = false;
        }
        gameMode = null;
        roundWins = { p1: 0, p2: 0 };
        gameState = 'start';
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ============================================
// PIXEL ART SPRITE SYSTEM
// ============================================

// Draw a sprite from a 2D color array
// Each cell is a hex color string or null (transparent)
function drawSprite(sprite, x, y, scale, flipX) {
    const rows = sprite.length;
    const cols = sprite[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = sprite[r][c];
            if (!color) continue;
            ctx.fillStyle = color;
            if (flipX) {
                ctx.fillRect(
                    x + (cols - 1 - c) * scale,
                    y + r * scale,
                    scale,
                    scale
                );
            } else {
                ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
            }
        }
    }
}

// Color aliases for sprite readability
const _ = null; // transparent

// --- PLAYER SKIN / COLOR PALETTES ---
const SKIN_OPTIONS = [
    {
        name: 'Cyan', nameDE: 'Cyan', primary: '#4ecdc4',
        palette: { h: '#2d8a80', H: '#4ecdc4', S: '#3aafa9', s: '#2b7a78', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#3aafa9' },
    },
    {
        name: 'Red', nameDE: 'Rot', primary: '#e94560',
        palette: { h: '#a82040', H: '#e94560', S: '#d63851', s: '#a82040', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#d63851' },
    },
    {
        name: 'Green', nameDE: 'Grün', primary: '#44cc44',
        palette: { h: '#1a7a1a', H: '#44cc44', S: '#33aa33', s: '#228822', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#33aa33' },
    },
    {
        name: 'Purple', nameDE: 'Lila', primary: '#aa55ee',
        palette: { h: '#6622aa', H: '#aa55ee', S: '#9944dd', s: '#7733bb', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#9944dd' },
    },
    {
        name: 'Orange', nameDE: 'Orange', primary: '#ff8833',
        palette: { h: '#bb5511', H: '#ff8833', S: '#ee7722', s: '#cc6611', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#ee7722' },
    },
    {
        name: 'Blue', nameDE: 'Blau', primary: '#4488ff',
        palette: { h: '#2255aa', H: '#4488ff', S: '#3377ee', s: '#2266cc', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#3377ee' },
    },
    {
        name: 'Yellow', nameDE: 'Gelb', primary: '#ffdd00',
        palette: { h: '#aa9400', H: '#ffdd00', S: '#eebb00', s: '#ccaa00', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#eebb00' },
    },
    {
        name: 'Pink', nameDE: 'Pink', primary: '#ff66aa',
        palette: { h: '#cc3377', H: '#ff66aa', S: '#ee5599', s: '#cc3377', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#ee5599' },
    },
    {
        name: 'White', nameDE: 'Weiß', primary: '#eeeeee',
        palette: { h: '#999999', H: '#eeeeee', S: '#cccccc', s: '#aaaaaa', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#555555', b: '#444444', G: '#888888', g: '#666666', V: '#cccccc' },
    },
    {
        name: 'Black', nameDE: 'Schwarz', primary: '#444444',
        palette: { h: '#111111', H: '#444444', S: '#333333', s: '#222222', F: '#f5cba7', f: '#e0ac7e', E: '#ffffff', e: '#1a1a2e', B: '#333333', b: '#222222', G: '#666666', g: '#555555', V: '#333333' },
    },
];

// Current palette references (updated when skin changes)
let P1 = SKIN_OPTIONS[settings.p1Skin || 0].palette;
let P2 = SKIN_OPTIONS[settings.p2Skin || 1].palette;

function makeSprites(C) {
    // Idle frame 1 (16 wide x 20 tall)
    const idle1 = [
        [_,_,_,_,_,C.h,C.h,C.H,C.H,C.h,C.h,_,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.H,C.H,C.H,C.H,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.V,C.H,C.H,C.V,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.E,C.F,C.F,C.E,C.F,C.F,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.e,C.F,C.F,C.e,C.F,C.F,_,_,_,_],
        [_,_,_,_,_,C.f,C.F,C.F,C.F,C.F,C.f,_,_,_,_,_],
        [_,_,_,_,_,_,C.f,C.F,C.F,C.f,_,_,_,_,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,_,_,_,_],
        [_,_,_,C.s,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,C.s,_,_,_],
        [_,_,C.F,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.s,C.F,_,_],
        [_,_,C.F,_,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.s,_,C.F,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,C.S,C.S,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,_,_,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,_,_,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,C.B,C.B,_,_,C.B,C.B,_,_,_,_,_],
        [_,_,_,_,_,C.B,C.B,_,_,C.B,C.B,_,_,_,_,_],
        [_,_,_,_,C.b,C.B,C.B,_,_,C.B,C.B,C.b,_,_,_,_],
        [_,_,_,_,C.b,C.b,C.b,_,_,C.b,C.b,C.b,_,_,_,_],
    ];

    // Walk frame 1
    const walk1 = [
        [_,_,_,_,_,C.h,C.h,C.H,C.H,C.h,C.h,_,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.H,C.H,C.H,C.H,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.V,C.H,C.H,C.V,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.E,C.F,C.F,C.E,C.F,C.F,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.e,C.F,C.F,C.e,C.F,C.F,_,_,_,_],
        [_,_,_,_,_,C.f,C.F,C.F,C.F,C.F,C.f,_,_,_,_,_],
        [_,_,_,_,_,_,C.f,C.F,C.F,C.f,_,_,_,_,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,_,_,_,_],
        [_,_,_,C.s,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,C.s,_,_,_],
        [_,_,C.F,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.s,C.F,_,_],
        [_,_,C.F,_,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.s,_,C.F,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,C.S,C.S,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,_,C.S,C.s,C.s,C.S,_,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,_,_,_,C.S,_,_,_,_,_],
        [_,_,_,_,C.B,C.B,C.B,_,_,C.B,C.B,_,_,_,_,_],
        [_,_,_,_,C.b,C.B,C.B,_,C.B,C.B,C.b,_,_,_,_,_],
        [_,_,_,_,_,C.b,C.b,_,C.b,C.b,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];

    // Walk frame 2
    const walk2 = [
        [_,_,_,_,_,C.h,C.h,C.H,C.H,C.h,C.h,_,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.H,C.H,C.H,C.H,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.V,C.H,C.H,C.V,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.E,C.F,C.F,C.E,C.F,C.F,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.e,C.F,C.F,C.e,C.F,C.F,_,_,_,_],
        [_,_,_,_,_,C.f,C.F,C.F,C.F,C.F,C.f,_,_,_,_,_],
        [_,_,_,_,_,_,C.f,C.F,C.F,C.f,_,_,_,_,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,_,_,_,_],
        [_,_,_,C.s,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,C.s,_,_,_],
        [_,_,C.F,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.s,C.F,_,_],
        [_,_,C.F,_,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.s,_,C.F,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,C.S,C.S,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,C.S,_,C.s,C.S,_,_,_,_,_,_,_],
        [_,_,_,_,_,C.S,_,_,_,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,_,C.B,C.B,_,C.B,C.B,C.B,_,_,_,_,_],
        [_,_,_,_,C.b,C.B,C.B,_,_,C.B,C.B,C.b,_,_,_,_],
        [_,_,_,_,_,C.b,C.b,_,_,_,C.b,C.b,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];

    // Jump frame
    const jump = [
        [_,_,_,_,_,C.h,C.h,C.H,C.H,C.h,C.h,_,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.H,C.H,C.H,C.H,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.h,C.H,C.V,C.H,C.H,C.V,C.H,C.h,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.E,C.F,C.F,C.E,C.F,C.F,_,_,_,_],
        [_,_,_,_,C.F,C.F,C.e,C.F,C.F,C.e,C.F,C.F,_,_,_,_],
        [_,_,_,_,_,C.f,C.F,C.F,C.F,C.F,C.f,_,_,_,_,_],
        [_,_,_,_,_,_,C.f,C.F,C.F,C.f,_,_,_,_,_,_],
        [_,_,C.F,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,C.F,_,_],
        [_,C.F,_,_,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,_,_,C.F,_],
        [C.F,_,_,C.s,C.S,C.S,C.S,C.H,C.S,C.S,C.S,C.S,C.s,_,_,C.F],
        [_,_,_,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.S,C.s,_,_,_],
        [_,_,_,_,C.s,C.S,C.S,C.S,C.S,C.S,C.S,C.s,_,_,_,_],
        [_,_,_,_,_,C.S,C.S,C.S,C.S,C.S,C.S,_,_,_,_,_],
        [_,_,_,_,_,C.s,C.S,C.S,C.S,C.S,C.s,_,_,_,_,_],
        [_,_,_,_,C.s,C.S,_,_,_,_,C.S,C.s,_,_,_,_],
        [_,_,_,C.B,C.B,_,_,_,_,_,_,C.B,C.B,_,_,_],
        [_,_,_,C.B,C.B,_,_,_,_,_,_,C.B,C.B,_,_,_],
        [_,_,C.b,C.b,C.b,_,_,_,_,_,_,C.b,C.b,C.b,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];

    // Gun sprite (drawn separately, 6 wide x 4 tall)
    const gun = [
        [_,C.G,C.G,C.G,C.G,C.g],
        [C.g,C.G,C.G,C.G,C.G,C.G],
        [C.g,C.G,C.G,C.G,C.G,C.G],
        [_,C.g,C.g,C.g,_,_],
    ];

    return { idle: [idle1], walk: [walk1, walk2], jump: [jump], gun };
}

let sprites1 = makeSprites(P1);
let sprites2 = makeSprites(P2);

// Regenerate sprites when skin/palette changes
function updateSkins() {
    P1 = SKIN_OPTIONS[settings.p1Skin].palette;
    P2 = SKIN_OPTIONS[settings.p2Skin].palette;
    sprites1 = makeSprites(P1);
    sprites2 = makeSprites(P2);
}

// ============================================
// PLATFORM SPRITES
// ============================================

// Pixel pattern for platform tiles (8x8 tile)
const PLAT_COLORS = {
    T: '#7b5ea7', // top
    t: '#9370c0', // top highlight
    M: '#533483', // middle
    m: '#4a2d75', // middle shadow
    D: '#3d2066', // dark
};

const platformTile = [
    [PLAT_COLORS.t, PLAT_COLORS.t, PLAT_COLORS.T, PLAT_COLORS.T, PLAT_COLORS.t, PLAT_COLORS.T, PLAT_COLORS.T, PLAT_COLORS.t],
    [PLAT_COLORS.T, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.T],
    [PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M],
    [PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m],
    [PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.M],
    [PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.D, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m],
    [PLAT_COLORS.m, PLAT_COLORS.D, PLAT_COLORS.M, PLAT_COLORS.M, PLAT_COLORS.m, PLAT_COLORS.D, PLAT_COLORS.M, PLAT_COLORS.M],
    [PLAT_COLORS.D, PLAT_COLORS.m, PLAT_COLORS.m, PLAT_COLORS.D, PLAT_COLORS.D, PLAT_COLORS.m, PLAT_COLORS.m, PLAT_COLORS.D],
];

// Ground tile (8x8)
const GND = {
    G: '#4a6741', // grass top
    g: '#3d5636', // grass dark
    D: '#6b4226', // dirt
    d: '#5a3520', // dirt dark
    R: '#7a7a7a', // rock
    r: '#555555', // rock dark
};

const groundTile = [
    [GND.G, GND.g, GND.G, GND.G, GND.g, GND.G, GND.G, GND.g],
    [GND.g, GND.G, GND.G, GND.g, GND.G, GND.g, GND.G, GND.G],
    [GND.D, GND.D, GND.d, GND.D, GND.D, GND.D, GND.d, GND.D],
    [GND.D, GND.d, GND.D, GND.D, GND.R, GND.D, GND.D, GND.d],
    [GND.d, GND.D, GND.D, GND.d, GND.r, GND.R, GND.D, GND.D],
    [GND.D, GND.D, GND.d, GND.D, GND.D, GND.d, GND.D, GND.D],
    [GND.d, GND.D, GND.R, GND.D, GND.d, GND.D, GND.D, GND.d],
    [GND.D, GND.d, GND.r, GND.d, GND.D, GND.D, GND.d, GND.D],
];

// Pre-render tiles to offscreen canvases for performance
function prerenderTile(tile, tileSize) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const offCtx = offCanvas.getContext('2d');
    const pxSize = tileSize / tile.length;
    for (let r = 0; r < tile.length; r++) {
        for (let c = 0; c < tile[r].length; c++) {
            offCtx.fillStyle = tile[r][c];
            offCtx.fillRect(c * pxSize, r * pxSize, pxSize, pxSize);
        }
    }
    return offCanvas;
}

const platTileCanvas = prerenderTile(platformTile, 16);
const groundTileCanvas = prerenderTile(groundTile, 16);

// ============================================
// BULLET SPRITE
// ============================================
const bulletSprite = [
    [_, '#ffaa00', '#ffdd00', '#ffdd00', '#ffaa00', _],
    ['#ff8800', '#ffdd00', '#ffffff', '#ffff88', '#ffdd00', '#ff8800'],
    ['#ff8800', '#ffdd00', '#ffff88', '#ffffff', '#ffdd00', '#ff8800'],
    [_, '#ffaa00', '#ffdd00', '#ffdd00', '#ffaa00', _],
];

// ============================================
// PLATFORMS
// ============================================
// --- MAP DEFINITIONS ---
const MAPS = {
    classic: {
        name: 'Classic',
        platforms: [
            { x: 0, y: 470, w: 800, h: 30, isGround: true },
            { x: 150, y: 370, w: 150, h: 16 },
            { x: 500, y: 370, w: 150, h: 16 },
            { x: 300, y: 270, w: 200, h: 16 },
            { x: 50, y: 180, w: 120, h: 16 },
            { x: 630, y: 180, w: 120, h: 16 },
        ],
    },
    towers: {
        name: 'Towers',
        platforms: [
            { x: 0, y: 470, w: 800, h: 30, isGround: true },
            { x: 30, y: 370, w: 100, h: 16 },
            { x: 670, y: 370, w: 100, h: 16 },
            { x: 30, y: 270, w: 100, h: 16 },
            { x: 670, y: 270, w: 100, h: 16 },
            { x: 30, y: 170, w: 100, h: 16 },
            { x: 670, y: 170, w: 100, h: 16 },
            { x: 300, y: 320, w: 200, h: 16 },
        ],
    },
    pyramid: {
        name: 'Pyramid',
        platforms: [
            { x: 0, y: 470, w: 800, h: 30, isGround: true },
            { x: 50, y: 340, w: 120, h: 16 },
            { x: 630, y: 340, w: 120, h: 16 },
            { x: 200, y: 250, w: 400, h: 16 },
            { x: 320, y: 150, w: 160, h: 16 },
        ],
    },
    chaos: {
        name: 'Chaos',
        platforms: [
            { x: 0, y: 470, w: 800, h: 30, isGround: true },
            { x: 50, y: 400, w: 80, h: 16 },
            { x: 200, y: 350, w: 80, h: 16 },
            { x: 350, y: 300, w: 80, h: 16 },
            { x: 500, y: 350, w: 80, h: 16 },
            { x: 670, y: 400, w: 80, h: 16 },
            { x: 120, y: 240, w: 100, h: 16 },
            { x: 580, y: 240, w: 100, h: 16 },
            { x: 340, y: 180, w: 120, h: 16 },
            { x: 100, y: 140, w: 60, h: 16 },
            { x: 640, y: 140, w: 60, h: 16 },
        ],
    },
};
const MAP_KEYS = Object.keys(MAPS);
let platforms = MAPS.classic.platforms;

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(x, y, color, name, controls, sprites) {
        this.x = x;
        this.y = y;
        this.w = 32; // 16px * PX scale
        this.h = 40; // 20px * PX scale
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.name = name;
        this.controls = controls;
        this.sprites = sprites;
        this.hp = HP_OPTIONS[settings.hp];
        this.facing = controls.facingDefault;
        this.onGround = false;
        this.lastShot = 0;
        this.bullets = [];
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle'; // idle, walk, jump
        this.hitFlash = 0;
        this.muzzleFlash = 0;
        // Power-up state
        this.activePowerups = {}; // type -> expiry timestamp
        this.dropThrough = false; // falling through platform
        this.dropPlatform = null; // which platform to ignore
        this.ammo = START_AMMO; // ammo count (only used when infiniteAmmo is Off)
    }

    update() {
        const wasMoving = this.vx !== 0;
        this.vx = 0;

        if (keys[this.controls.left]) {
            this.vx = -PLAYER_SPEED;
            this.facing = -1;
        }
        if (keys[this.controls.right]) {
            this.vx = PLAYER_SPEED;
            this.facing = 1;
        }

        if (keys[this.controls.jump] && this.onGround) {
            // Scale jump force with gravity so jump height stays proportional
            const gravScale = GRAVITY_OPTIONS[settings.gravity].value / 0.6;
            this.vy = JUMP_FORCE * Math.sqrt(gravScale);
            this.onGround = false;
        }

        // Drop through platform (one-press trigger)
        if (settings.dropThrough === 0 && keys[this.controls.down] && this.onGround && !this.dropPressed) {
            this.dropPressed = true;
            for (const p of platforms) {
                if (p.isGround) continue;
                if (
                    this.x + this.w > p.x &&
                    this.x < p.x + p.w &&
                    Math.abs((this.y + this.h) - p.y) < 3
                ) {
                    this.dropThrough = true;
                    this.dropPlatform = p;
                    this.vy = 2;
                    this.onGround = false;
                    break;
                }
            }
        }
        if (!keys[this.controls.down]) {
            this.dropPressed = false;
        }

        if (keys[this.controls.shoot]) {
            this.shoot();
        }

        // Animation state
        if (!this.onGround) {
            this.state = 'jump';
        } else if (this.vx !== 0) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }

        // Animation timer
        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame++;
        }

        // Hit flash decay
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.muzzleFlash > 0) this.muzzleFlash--;

        this.vy += GRAVITY_OPTIONS[settings.gravity].value;
        this.x += this.vx;

        if (this.x < 0) this.x = 0;
        if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;

        this.y += this.vy;
        this.onGround = false;

        for (const p of platforms) {
            // Skip the platform we're dropping through
            if (this.dropThrough && p === this.dropPlatform) continue;

            if (
                this.x + this.w > p.x &&
                this.x < p.x + p.w &&
                this.y + this.h > p.y &&
                this.y + this.h < p.y + p.h + this.vy + 2 &&
                this.vy >= 0
            ) {
                this.y = p.y - this.h;
                this.vy = 0;
                this.onGround = true;
            }
        }

        // Reset drop-through once we've fully cleared the platform
        if (this.dropThrough && this.dropPlatform) {
            if (this.y > this.dropPlatform.y + this.dropPlatform.h) {
                this.dropThrough = false;
                this.dropPlatform = null;
            }
        }

        if (this.y > canvas.height) {
            this.y = 0;
            this.vy = 0;
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.life--;

            if (b.x < -10 || b.x > canvas.width + 10 || b.life <= 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            let hitPlatform = false;
            for (const p of platforms) {
                if (
                    b.x + b.w > p.x &&
                    b.x < p.x + p.w &&
                    b.y + b.h > p.y &&
                    b.y < p.y + p.h
                ) {
                    hitPlatform = true;
                    spawnParticles(b.x, b.y, '#ffaa00', 4);
                    break;
                }
            }
            if (hitPlatform) {
                this.bullets.splice(i, 1);
            }
        }
    }

    hasPowerup(type) {
        return this.activePowerups[type] && Date.now() < this.activePowerups[type];
    }

    applyPowerup(type) {
        const def = POWERUP_TYPES[type];
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        // Track stats
        if (this === player1) stats.p1.powerupsCollected++;
        else if (this === player2) stats.p2.powerupsCollected++;
        if (type === 'heal') {
            this.hp = Math.min(HP_OPTIONS[settings.hp], this.hp + 40);
            spawnCollectBurst(cx, cy, '#44dd44');
        } else {
            this.activePowerups[type] = Date.now() + def.duration;
            spawnCollectBurst(cx, cy, def.color);
        }
    }

    shoot() {
        const now = Date.now();
        // Check ammo (limited ammo mode)
        if (settings.infiniteAmmo === 1 && this.ammo <= 0) return;
        const isAI = gameMode === 'pve' && this === player2;
        let cooldown = isAI ? AI_DIFF_OPTIONS[settings.aiDiff].cooldown : SHOOT_COOLDOWN;
        if (this.hasPowerup('nocooldown')) {
            cooldown = Math.floor(cooldown * 0.5);
        }
        if (now - this.lastShot < cooldown) return;
        this.lastShot = now;
        this.muzzleFlash = 6;
        if (settings.infiniteAmmo === 1) this.ammo--;

        // Track stats
        if (this === player1) stats.p1.shotsFired++;
        else if (this === player2) stats.p2.shotsFired++;

        this.bullets.push({
            x: this.facing === 1 ? this.x + this.w + 4 : this.x - 14,
            y: this.y + 18,
            w: 12,
            h: 8,
            vx: (this.hasPowerup('rapidfire') ? BULLET_SPEED * 2.5 : BULLET_SPEED) * this.facing,
            life: 80,
        });
    }

    draw() {
        // Choose sprite based on state
        let spriteSet;
        switch (this.state) {
            case 'walk':
                spriteSet = this.sprites.walk;
                break;
            case 'jump':
                spriteSet = this.sprites.jump;
                break;
            default:
                spriteSet = this.sprites.idle;
        }
        const frame = spriteSet[this.animFrame % spriteSet.length];
        const flipX = this.facing === -1;

        // Invincibility blink effect
        const isInvincible = this.hasPowerup('invincible');
        if (isInvincible) {
            // Fast blink between visible and semi-transparent
            if (Math.floor(frameCount / 3) % 2 === 0) {
                ctx.globalAlpha = 0.4;
            }
        }

        // Hit flash effect
        if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
            ctx.globalAlpha = 0.6;
        }

        drawSprite(frame, this.x, this.y, PX, flipX);

        // Draw gun
        const gunSprite = this.sprites.gun;
        const gunOffsetX = flipX ? this.x - 10 : this.x + this.w - 2;
        const gunOffsetY = this.y + 16;
        drawSprite(gunSprite, gunOffsetX, gunOffsetY, PX, flipX);

        // Muzzle flash (enhanced)
        if (this.muzzleFlash > 0) {
            const flashX = flipX ? gunOffsetX - 8 : gunOffsetX + 12;
            const flashIntensity = this.muzzleFlash / 6;
            // Outer glow
            ctx.globalAlpha = 0.4 * flashIntensity;
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(flashX - 4, gunOffsetY - 6, 14, 12);
            ctx.globalAlpha = 1;
            // Bright core
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(flashX, gunOffsetY - 2, 8, 5);
            // Yellow edge
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(flashX + (flipX ? -4 : 8), gunOffsetY - 1, 4, 3);
            // Small sparks
            if (this.muzzleFlash > 3) {
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(flashX + (flipX ? -2 : 10), gunOffsetY - 4, 2, 2);
                ctx.fillRect(flashX + (flipX ? -2 : 10), gunOffsetY + 4, 2, 2);
            }
        }

        ctx.globalAlpha = 1;

        // Invincibility shield glow
        if (isInvincible) {
            ctx.strokeStyle = '#ffdd00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4 + 0.3 * Math.sin(frameCount * 0.15);
            ctx.strokeRect(this.x - 4, this.y - 2, this.w + 8, this.h + 4);
            ctx.globalAlpha = 1;
        }

        // Rapid fire glow on gun
        if (this.hasPowerup('rapidfire')) {
            ctx.fillStyle = '#ff8800';
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameCount * 0.2);
            const glowX = flipX ? this.x - 12 : this.x + this.w;
            ctx.fillRect(glowX, gunOffsetY - 3, 14, 10);
            ctx.globalAlpha = 1;
        }

        // Damage boost glow on player
        if (this.hasPowerup('damage')) {
            ctx.fillStyle = '#ff2244';
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameCount * 0.2);
            const glowX = flipX ? this.x - 12 : this.x + this.w;
            ctx.fillRect(glowX, gunOffsetY - 5, 14, 14);
            // Red outline around player
            ctx.strokeStyle = '#ff2244';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4 + 0.3 * Math.sin(frameCount * 0.18);
            ctx.strokeRect(this.x - 2, this.y, this.w + 4, this.h);
            ctx.globalAlpha = 1;
        }

        // No cooldown lightning effect
        if (this.hasPowerup('nocooldown')) {
            ctx.fillStyle = '#cc44ff';
            ctx.globalAlpha = 0.4 + 0.3 * Math.sin(frameCount * 0.25);
            ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, 2);
            ctx.fillRect(this.x - 2, this.y + this.h, this.w + 4, 2);
            ctx.globalAlpha = 1;
        }

        // HP Bar
        const barW = 36;
        const barH = 5;
        const barX = this.x + this.w / 2 - barW / 2;
        const barY = this.y - 14;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // HP fill
        const hpRatio = Math.max(0, this.hp / HP_OPTIONS[settings.hp]);
        if (hpRatio > 0.5) {
            ctx.fillStyle = '#44cc44';
        } else if (hpRatio > 0.25) {
            ctx.fillStyle = '#cccc44';
        } else {
            ctx.fillStyle = '#cc4444';
        }
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // Border pixels
        ctx.fillStyle = '#ffffff';
        // top/bottom lines
        ctx.fillRect(barX, barY - 1, barW, 1);
        ctx.fillRect(barX, barY + barH, barW, 1);
        // left/right lines
        ctx.fillRect(barX - 1, barY, 1, barH);
        ctx.fillRect(barX + barW, barY, 1, barH);

        // Power-Up timer bars (below HP bar)
        let puBarOffset = 0;
        const now = Date.now();
        for (const [type, expiry] of Object.entries(this.activePowerups)) {
            if (now >= expiry) continue;
            const def = POWERUP_TYPES[type];
            const remaining = expiry - now;
            const total = def.duration;
            const ratio = remaining / total;
            const puBarY = barY + barH + 3 + puBarOffset * 5;
            // Background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(barX - 1, puBarY - 1, barW + 2, 4);
            // Fill
            ctx.fillStyle = def.color;
            ctx.fillRect(barX, puBarY, barW * ratio, 2);
            // Border
            ctx.fillStyle = def.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(barX, puBarY - 1, barW, 1);
            ctx.fillRect(barX, puBarY + 2, barW, 1);
            ctx.globalAlpha = 1;
            puBarOffset++;
        }

        // Ammo counter (limited ammo mode)
        if (settings.infiniteAmmo === 1) {
            const ammoX = barX + barW + 5;
            const ammoColor = this.ammo <= 3 ? '#ff4444' : (this.ammo <= 6 ? '#ffaa00' : '#aaddff');
            ctx.fillStyle = ammoColor;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(this.ammo, ammoX, barY + barH);
        }

        // Name
        ctx.fillStyle = this.color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 18);

        // Bullets
        for (const b of this.bullets) {
            const flip = b.vx < 0;
            drawSprite(bulletSprite, b.x, b.y, PX, flip);

            // Trail
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ffaa00';
            const trailX = flip ? b.x + b.w : b.x - 8;
            ctx.fillRect(trailX, b.y + 2, 8, 4);
            ctx.globalAlpha = 0.2;
            const trail2X = flip ? trailX + 8 : trailX - 8;
            ctx.fillRect(trail2X, b.y + 3, 6, 2);
            ctx.globalAlpha = 1;
        }
    }

    takeDamage(amount) {
        if (this.hasPowerup('invincible')) {
            // Deflect particles
            spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ffdd00', 6);
            damageNumbers.push({
                x: this.x + this.w / 2 + (Math.random() - 0.5) * 20,
                y: this.y - 10,
                vy: -2.5,
                text: T('blocked'),
                color: '#ffdd00',
                life: 35,
                maxLife: 35,
                size: 12,
            });
            return;
        }
        this.hp -= amount;
        this.hitFlash = 10;
        // Spawn damage number
        const dmgColor = amount >= 30 ? '#ff4444' : '#ff8888';
        spawnDamageNumber(this.x + this.w / 2, this.y - 10, amount, dmgColor);
        if (this.hp <= 0) this.hp = 0;
    }
}

// ============================================
// PARTICLES
// ============================================
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 1,
            life: 15 + Math.random() * 15,
            color,
            size: 2 + Math.random() * 2,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.min(1, p.life / 15);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
    }
    ctx.globalAlpha = 1;
}

// --- Damage Numbers ---
function spawnDamageNumber(x, y, amount, color) {
    damageNumbers.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vy: -2.5,
        text: '-' + amount,
        color,
        life: 45,
        maxLife: 45,
        size: amount >= 30 ? 18 : 14,
    });
}

function updateDamageNumbers() {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y += d.vy;
        d.vy += 0.02;
        d.life--;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

function drawDamageNumbers() {
    for (const d of damageNumbers) {
        const alpha = Math.min(1, d.life / 15);
        const scale = d.life > d.maxLife - 5 ? 1.3 : 1;
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(d.size * scale)}px monospace`;
        ctx.textAlign = 'center';
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillText(d.text, d.x + 1, d.y + 1);
        // Text
        ctx.fillStyle = d.color;
        ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
}

// --- Power-Up collect burst ---
function spawnCollectBurst(x, y, color) {
    // Ring of particles outward
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        particles.push({
            x, y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            life: 20 + Math.random() * 10,
            color,
            size: 3,
        });
    }
    // Sparkle upward
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y,
            vx: (Math.random() - 0.5) * 2,
            vy: -3 - Math.random() * 3,
            life: 25 + Math.random() * 15,
            color: '#ffffff',
            size: 2,
        });
    }
}

// ============================================
// AI CONTROLLER
// ============================================
const AI = {
    thinkTimer: 0,
    thinkInterval: 5,
    wantsJump: false,
    wantsShoot: false,
    wantsLeft: false,
    wantsRight: false,
    wantsDown: false,

    // Path state machine
    path: [],       // [{plat, edgeX}] — platforms to climb through
    pathStep: 0,
    pathTarget: null, // serialized target to detect changes
    stuckTimer: 0,   // counts frames without path progress
    giveUpCooldown: 0, // after giving up, fight for a while before trying again
    JUMP_REACH: 110,
    STUCK_LIMIT: 50,
    GIVEUP_COOLDOWN: 120, // ~20 seconds of fighting after giving up

    reset() {
        this.thinkTimer = 0;
        this.wantsJump = false;
        this.wantsShoot = false;
        this.wantsLeft = false;
        this.wantsRight = false;
        this.wantsDown = false;
        this.path = [];
        this.pathStep = 0;
        this.pathTarget = null;
        this.stuckTimer = 0;
        this.giveUpCooldown = 0;
    },

    // Find which platform contains a given point (e.g. where the target is)
    _findPlatformAt(x, y) {
        for (const p of platforms) {
            if (x > p.x - 10 && x < p.x + p.w + 10 && y > p.y - 30 && y < p.y + p.h + 10) {
                return p;
            }
        }
        return null;
    },

    // Which platform is the player standing on?
    _getPlatformOf(player) {
        if (!player.onGround) return null;
        const feetY = player.y + player.h;
        for (const p of platforms) {
            if (
                player.x + player.w > p.x &&
                player.x < p.x + p.w &&
                Math.abs(feetY - p.y) < 5
            ) {
                return p;
            }
        }
        return null;
    },

    // Build a full path (list of platforms) from the AI's current level up to targetY
    _buildPath(startFeetY, targetX, targetY) {
        const path = [];
        let currentY = startFeetY;
        let safety = 10;

        while (targetY < currentY - this.JUMP_REACH && safety-- > 0) {
            let bestPlat = null;
            let bestScore = Infinity;
            for (const p of platforms) {
                if (p.isGround) continue;
                // Reachable: above current position, within jump range
                if (p.y < currentY && p.y > currentY - this.JUMP_REACH) {
                    const platCX = p.x + p.w / 2;
                    // Prefer: close to targetX, and as high as possible
                    const score = Math.abs(platCX - targetX) + (currentY - p.y) * -0.3;
                    if (score < bestScore) {
                        bestScore = score;
                        bestPlat = p;
                    }
                }
            }
            if (!bestPlat) break;
            path.push(bestPlat);
            currentY = bestPlat.y;
        }
        return path;
    },

    update(aiPlayer, humanPlayer) {
        this.thinkTimer++;
        if (this.thinkTimer < AI_DIFF_OPTIONS[settings.aiDiff].thinkInterval) return;
        this.thinkTimer = 0;

        this.wantsLeft = false;
        this.wantsRight = false;
        this.wantsJump = false;
        this.wantsShoot = false;
        this.wantsDown = false;

        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;

        // --- Decide target: power-up first, then human ---
        let targetX, targetY;
        let chasingPowerup = false;

        let closestPU = null;
        let closestDist = Infinity;
        for (const pu of powerups) {
            // Ignore power-ups on the highest platforms (y <= 200)
            if (pu.y < 200) continue;
            const d = Math.hypot(pu.x + pu.w / 2 - aiCX, pu.y + pu.h / 2 - aiCY);
            if (d < closestDist) { closestDist = d; closestPU = pu; }
        }

        if (closestPU) {
            targetX = closestPU.x + closestPU.w / 2;
            targetY = closestPU.y + closestPU.h / 2;
            chasingPowerup = true;
        } else {
            targetX = humanCX;
            targetY = humanCY;
        }

        // --- Plan or follow path ---
        const targetKey = Math.round(targetX / 40) + ',' + Math.round(targetY / 40);
        const needsMultiClimb = targetY < aiFeetY - this.JUMP_REACH;

        // Also detect single-jump situations where platforms are offset horizontally
        const curPlat = this._getPlatformOf(aiPlayer);
        let targetPlat = this._findPlatformAt(targetX, targetY);
        const needsEdgeJump = !needsMultiClimb && curPlat && targetPlat &&
            curPlat !== targetPlat && targetY < aiCY - 30;

        // Decrement give-up cooldown
        if (this.giveUpCooldown > 0) this.giveUpCooldown--;

        if ((needsMultiClimb || needsEdgeJump) && this.giveUpCooldown <= 0) {
            // Replan if target changed or no path
            if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                this.path = needsMultiClimb ? this._buildPath(aiFeetY, targetX, targetY) : [];
                this.pathStep = 0;
                this.pathTarget = targetKey;
                this.stuckTimer = 0;
            }

            // Advance path step if we landed on current target platform
            const oldStep = this.pathStep;
            if (this.pathStep < this.path.length) {
                if (curPlat === this.path[this.pathStep]) {
                    this.pathStep++;
                    this.stuckTimer = 0; // reset on progress
                }
            }
            if (oldStep === this.pathStep) {
                this.stuckTimer++;
            }

            // If stuck too long, give up climbing and fight from current position
            if (this.stuckTimer > this.STUCK_LIMIT) {
                this.path = [];
                this.pathStep = 0;
                this.stuckTimer = 0;
                this.giveUpCooldown = this.GIVEUP_COOLDOWN;
                this._fightHuman(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            } else if (needsEdgeJump && this.path.length === 0 && targetPlat) {
                // Single edge jump (no multi-step path)
                this._climbTo(aiPlayer, targetPlat, targetX);
            } else if (this.pathStep < this.path.length) {
                this._climbTo(aiPlayer, this.path[this.pathStep], targetX);
            } else {
                this._walkTo(aiPlayer, targetX, targetY);
            }
        } else {
            // Target is at same level or same platform
            this.path = [];
            this.pathStep = 0;
            this.pathTarget = null;

            if (chasingPowerup) {
                this._walkTo(aiPlayer, targetX, targetY);
            } else {
                this._fightHuman(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            }
        }

        // --- Always shoot at human if roughly aligned ---
        if (Math.abs(humanCY - aiCY) < 60) {
            if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }
            aiPlayer.facing = humanCX > aiCX ? 1 : -1;
        }

        // --- Drop through platform if target is below ---
        if (settings.dropThrough === 0 && targetY > aiFeetY + 40 && aiPlayer.onGround) {
            for (const p of platforms) {
                if (p.isGround) continue;
                if (
                    aiPlayer.x + aiPlayer.w > p.x &&
                    aiPlayer.x < p.x + p.w &&
                    Math.abs(aiFeetY - p.y) < 3
                ) {
                    this.wantsDown = true;
                    break;
                }
            }
        }

        // --- Dodge bullets ---
        this._dodgeBullets(aiPlayer, humanPlayer);

        this._applyInputs(aiPlayer);
    },

    // Climb to a platform: walk toward it, jump, steer mid-air
    _climbTo(aiPlayer, plat, finalTargetX) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const platCX = plat.x + plat.w / 2;

        if (!aiPlayer.onGround) {
            // Mid-air: steer toward platform center
            if (aiCX < platCX - 15) this.wantsRight = true;
            else if (aiCX > platCX + 15) this.wantsLeft = true;
            return;
        }

        // Check if we're directly under the target platform
        const isUnder = aiCX > plat.x + 15 && aiCX < plat.x + plat.w - 15;

        if (isUnder) {
            // Directly under — jump straight up
            this.wantsJump = true;
            return;
        }

        // Not directly under — check if we CAN walk to be under it
        // (our current platform overlaps horizontally with the target)
        const curPlat = this._getPlatformOf(aiPlayer);
        if (!curPlat) return;

        const overlapLeft = Math.max(curPlat.x, plat.x + 15);
        const overlapRight = Math.min(curPlat.x + curPlat.w, plat.x + plat.w - 15);
        const hasOverlap = overlapLeft < overlapRight;

        if (hasOverlap) {
            // Walk to be under the target platform, then jump
            const walkTarget = Math.max(overlapLeft + 10, Math.min(overlapRight - 10, platCX));
            if (aiCX < walkTarget - 8) this.wantsRight = true;
            else if (aiCX > walkTarget + 8) this.wantsLeft = true;
            else this.wantsJump = true; // close enough, jump
        } else {
            // No horizontal overlap — walk to the edge closest to the target, then jump
            const targetIsRight = platCX > aiCX;
            let edgeX;
            if (targetIsRight) {
                edgeX = curPlat.x + curPlat.w - 10;
            } else {
                edgeX = curPlat.x + 10;
            }

            const atEdge = Math.abs(aiCX - edgeX) < 20;
            if (atEdge) {
                this.wantsJump = true;
                if (targetIsRight) this.wantsRight = true;
                else this.wantsLeft = true;
            } else {
                if (aiCX < edgeX - 5) this.wantsRight = true;
                else if (aiCX > edgeX + 5) this.wantsLeft = true;
            }
        }
    },

    // Walk directly toward a point
    _walkTo(aiPlayer, targetX, targetY) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const dx = targetX - aiCX;

        if (Math.abs(dx) > 10) {
            if (dx > 0) this.wantsRight = true;
            else this.wantsLeft = true;
        }

        // Jump if target is above and we're close horizontally
        if (targetY < aiCY - 40 && aiPlayer.onGround && Math.abs(dx) < 80) {
            this.wantsJump = true;
        }
    },

    _fightHuman(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY) {
        const dx = humanCX - aiCX;
        const dy = humanCY - aiCY;
        const dist = Math.hypot(dx, dy);

        aiPlayer.facing = dx > 0 ? 1 : -1;
        if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
            this.wantsShoot = true;
        }

        if (dist < 80) {
            if (dx > 0) this.wantsLeft = true;
            else this.wantsRight = true;
        } else if (dist > 250) {
            this._walkTo(aiPlayer, humanCX, humanCY);
        } else {
            if (Math.random() < 0.1) {
                if (Math.random() < 0.5) this.wantsLeft = true;
                else this.wantsRight = true;
            }
        }

        // Rare random jump
        if (aiPlayer.onGround && Math.random() < 0.008) {
            this.wantsJump = true;
        }
    },

    _dodgeBullets(aiPlayer, humanPlayer) {
        for (const b of humanPlayer.bullets) {
            const bCY = b.y + b.h / 2;
            const aiCY = aiPlayer.y + aiPlayer.h / 2;
            const dist = Math.abs(b.x - (aiPlayer.x + aiPlayer.w / 2));

            if (dist < 150 && Math.abs(bCY - aiCY) < 30) {
                const heading = b.vx > 0 ? 1 : -1;
                const coming =
                    (heading === 1 && b.x < aiPlayer.x) ||
                    (heading === -1 && b.x > aiPlayer.x + aiPlayer.w);
                if (coming && aiPlayer.onGround) {
                    this.wantsJump = true;
                }
            }
        }
    },

    _applyInputs(aiPlayer) {
        const c = aiPlayer.controls;
        keys[c.left] = this.wantsLeft;
        keys[c.right] = this.wantsRight;
        keys[c.jump] = this.wantsJump;
        keys[c.shoot] = this.wantsShoot;
        keys[c.down] = this.wantsDown;
    },
};

// ============================================
// PLAYERS
// ============================================
let player1, player2;

function createPlayers() {
    updateSkins(); // Ensure sprites match current skin settings
    const p1Color = SKIN_OPTIONS[settings.p1Skin].primary;
    player1 = new Player(100, 400, p1Color, 'Player 1', {
        left: customBindings.p1.left,
        right: customBindings.p1.right,
        jump: customBindings.p1.jump,
        down: customBindings.p1.down,
        shoot: customBindings.p1.shoot,
        facingDefault: 1,
    }, sprites1);

    const p2Name = gameMode === 'pve' ? 'AI' : 'Player 2';
    const p2Color = SKIN_OPTIONS[settings.p2Skin].primary;
    player2 = new Player(650, 400, p2Color, p2Name, {
        left: customBindings.p2.left,
        right: customBindings.p2.right,
        jump: customBindings.p2.jump,
        down: customBindings.p2.down,
        shoot: customBindings.p2.shoot,
        facingDefault: -1,
    }, sprites2);
}

// ============================================
// POWER-UPS
// ============================================
function spawnPowerup() {
    const types = Object.keys(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    // Pick a random platform (not ground)
    const plats = platforms.filter(p => !p.isGround);
    const plat = plats[Math.floor(Math.random() * plats.length)];
    const x = plat.x + Math.random() * (plat.w - POWERUP_SIZE);
    const y = plat.y - POWERUP_SIZE - 4;

    powerups.push({
        x, y,
        w: POWERUP_SIZE,
        h: POWERUP_SIZE,
        type,
        spawnTime: Date.now(),
        bobOffset: Math.random() * Math.PI * 2,
    });
}

function updatePowerups() {
    const now = Date.now();

    // Spawn new power-ups
    const puInterval = PU_FREQ_OPTIONS[settings.puFreq].interval;
    if (now - lastPowerupSpawn > puInterval && powerups.length < 3) {
        spawnPowerup();
        lastPowerupSpawn = now;
    }

    // Remove old power-ups (despawn after 10s)
    for (let i = powerups.length - 1; i >= 0; i--) {
        if (now - powerups[i].spawnTime > 10000) {
            spawnParticles(powerups[i].x + POWERUP_SIZE / 2, powerups[i].y, '#888', 4);
            powerups.splice(i, 1);
        }
    }

    // Check collection by players
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        for (const player of [player1, player2]) {
            if (
                player.x + player.w > pu.x &&
                player.x < pu.x + pu.w &&
                player.y + player.h > pu.y &&
                player.y < pu.y + pu.h
            ) {
                player.applyPowerup(pu.type);
                powerups.splice(i, 1);
                break;
            }
        }
    }
}

function drawPowerups() {
    for (const pu of powerups) {
        const def = POWERUP_TYPES[pu.type];
        const bob = Math.sin(frameCount * 0.08 + pu.bobOffset) * 3;
        const drawY = pu.y + bob;

        // Glow
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(frameCount * 0.1);
        ctx.fillStyle = def.color;
        ctx.fillRect(pu.x - 3, drawY - 3, pu.w + 6, pu.h + 6);
        ctx.globalAlpha = 1;

        // Box background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(pu.x, drawY, pu.w, pu.h);

        // Colored border
        ctx.fillStyle = def.color;
        ctx.fillRect(pu.x, drawY, pu.w, 2); // top
        ctx.fillRect(pu.x, drawY + pu.h - 2, pu.w, 2); // bottom
        ctx.fillRect(pu.x, drawY, 2, pu.h); // left
        ctx.fillRect(pu.x + pu.w - 2, drawY, 2, pu.h); // right

        // Inner color fill
        ctx.fillStyle = def.colorDark;
        ctx.fillRect(pu.x + 2, drawY + 2, pu.w - 4, pu.h - 4);

        // Symbol
        ctx.fillStyle = def.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(def.symbol, pu.x + pu.w / 2, drawY + pu.h / 2 + 4);

        // Despawn blink (last 3 seconds)
        const age = Date.now() - pu.spawnTime;
        if (age > 7000 && Math.floor(Date.now() / 200) % 2) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(pu.x, drawY, pu.w, pu.h);
            ctx.globalAlpha = 1;
        }
    }
}

// ============================================
// AMMO PICKUPS
// ============================================
function spawnAmmoPickup() {
    const plats = platforms.filter(p => !p.isGround);
    const plat = plats[Math.floor(Math.random() * plats.length)];
    const size = 16;
    const x = plat.x + Math.random() * (plat.w - size);
    const y = plat.y - size - 4;
    ammoPickups.push({
        x, y, w: size, h: size,
        spawnTime: Date.now(),
        bobOffset: Math.random() * Math.PI * 2,
    });
}

function updateAmmoPickups() {
    if (settings.infiniteAmmo === 0) return; // infinite ammo = no pickups needed
    const now = Date.now();

    // Spawn new ammo pickups
    const ammoInterval = AMMO_FREQ_OPTIONS[settings.ammoFreq].interval;
    if (now - lastAmmoSpawn > ammoInterval && ammoPickups.length < 2) {
        spawnAmmoPickup();
        lastAmmoSpawn = now;
    }

    // Remove old (despawn after 8s)
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        if (now - ammoPickups[i].spawnTime > 8000) {
            spawnParticles(ammoPickups[i].x + 8, ammoPickups[i].y, '#888', 3);
            ammoPickups.splice(i, 1);
        }
    }

    // Check collection
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const ap = ammoPickups[i];
        for (const player of [player1, player2]) {
            if (
                player.x + player.w > ap.x &&
                player.x < ap.x + ap.w &&
                player.y + player.h > ap.y &&
                player.y < ap.y + ap.h
            ) {
                player.ammo += AMMO_PICKUP_AMOUNT;
                spawnCollectBurst(ap.x + ap.w / 2, ap.y + ap.h / 2, '#aaddff');
                ammoPickups.splice(i, 1);
                break;
            }
        }
    }
}

function drawAmmoPickups() {
    if (settings.infiniteAmmo === 0) return;
    for (const ap of ammoPickups) {
        const bob = Math.sin(frameCount * 0.08 + ap.bobOffset) * 3;
        const drawY = ap.y + bob;
        const color = '#aaddff';
        const colorDark = '#5588aa';

        // Glow
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(frameCount * 0.1);
        ctx.fillStyle = color;
        ctx.fillRect(ap.x - 2, drawY - 2, ap.w + 4, ap.h + 4);
        ctx.globalAlpha = 1;

        // Box
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(ap.x, drawY, ap.w, ap.h);
        ctx.fillStyle = color;
        ctx.fillRect(ap.x, drawY, ap.w, 2);
        ctx.fillRect(ap.x, drawY + ap.h - 2, ap.w, 2);
        ctx.fillRect(ap.x, drawY, 2, ap.h);
        ctx.fillRect(ap.x + ap.w - 2, drawY, 2, ap.h);
        ctx.fillStyle = colorDark;
        ctx.fillRect(ap.x + 2, drawY + 2, ap.w - 4, ap.h - 4);

        // Bullet symbol
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('A', ap.x + ap.w / 2, drawY + ap.h / 2 + 4);

        // Despawn blink
        const age = Date.now() - ap.spawnTime;
        if (age > 5000 && Math.floor(Date.now() / 200) % 2) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ap.x, drawY, ap.w, ap.h);
            ctx.globalAlpha = 1;
        }
    }
}

// ============================================
// COLLISION
// ============================================
function checkBulletHits() {
    const p1Damage = player1.hasPowerup('damage') ? BULLET_DAMAGE * 3 : BULLET_DAMAGE;
    const p2Damage = player2.hasPowerup('damage') ? BULLET_DAMAGE * 3 : BULLET_DAMAGE;

    for (let i = player1.bullets.length - 1; i >= 0; i--) {
        const b = player1.bullets[i];
        if (
            b.x + b.w > player2.x &&
            b.x < player2.x + player2.w &&
            b.y + b.h > player2.y &&
            b.y < player2.y + player2.h
        ) {
            player2.takeDamage(p1Damage);
            stats.p1.hits++;
            stats.p1.damageDone += p1Damage;
            spawnParticles(b.x, b.y, player2.color, 10);
            spawnParticles(b.x, b.y, '#ff8888', 5);
            player1.bullets.splice(i, 1);
        }
    }

    for (let i = player2.bullets.length - 1; i >= 0; i--) {
        const b = player2.bullets[i];
        if (
            b.x + b.w > player1.x &&
            b.x < player1.x + player1.w &&
            b.y + b.h > player1.y &&
            b.y < player1.y + player1.h
        ) {
            player1.takeDamage(p2Damage);
            stats.p2.hits++;
            stats.p2.damageDone += p2Damage;
            spawnParticles(b.x, b.y, player1.color, 10);
            spawnParticles(b.x, b.y, '#88ffee', 5);
            player2.bullets.splice(i, 1);
        }
    }
}

function checkWin() {
    if (player1.hp <= 0) {
        gameState = 'dying';
        winner = player2;
        loser = player1;
        deathTimer = DEATH_DURATION;
        roundWins.p2++;
    } else if (player2.hp <= 0) {
        gameState = 'dying';
        winner = player1;
        loser = player2;
        deathTimer = DEATH_DURATION;
        roundWins.p1++;
    }
}

function updateDeathAnimation() {
    if (!loser) return;
    deathTimer--;

    const cx = loser.x + loser.w / 2;
    const cy = loser.y + loser.h / 2;
    const progress = 1 - deathTimer / DEATH_DURATION; // 0 -> 1

    // Phase 1 (0-0.5): Rapid flashing, small sparks
    if (progress < 0.5) {
        if (frameCount % 3 === 0) {
            spawnParticles(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30, '#ffffff', 2);
        }
        if (frameCount % 6 === 0) {
            spawnParticles(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, loser.color, 3);
        }
    }

    // Phase 2 (0.5-0.8): Growing explosion, more particles
    if (progress >= 0.5 && progress < 0.8) {
        const intensity = (progress - 0.5) / 0.3;
        if (frameCount % 2 === 0) {
            const count = Math.floor(3 + intensity * 8);
            spawnParticles(cx, cy, loser.color, count);
            spawnParticles(cx, cy, '#ffffff', Math.floor(count / 2));
        }
    }

    // Phase 3 (0.8): Final big explosion
    if (deathTimer === Math.floor(DEATH_DURATION * 0.2)) {
        // Big burst
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 30 + Math.random() * 20,
                color: i % 3 === 0 ? '#ffffff' : loser.color,
                size: 3 + Math.random() * 3,
            });
        }
        // Pixel debris
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: cx + (Math.random() - 0.5) * 30,
                y: cy + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 8,
                vy: -4 - Math.random() * 6,
                life: 40 + Math.random() * 30,
                color: i % 2 === 0 ? loser.color : '#ffdd00',
                size: 2 + Math.random() * 4,
            });
        }
    }

    // Transition to gameover
    if (deathTimer <= 0) {
        gameState = 'gameover';
    }
}

function drawDyingPlayer() {
    if (!loser) return;
    const progress = 1 - deathTimer / DEATH_DURATION;

    // Phase 1: Rapid blink
    if (progress < 0.5) {
        if (Math.floor(frameCount / 2) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
        // Red tint flash
        loser.draw();
        ctx.globalAlpha = 0.3 * Math.sin(frameCount * 0.5);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(loser.x - 2, loser.y - 2, loser.w + 4, loser.h + 4);
        ctx.globalAlpha = 1;
    }
    // Phase 2: Shrink and fade
    else if (progress < 0.8) {
        const fade = 1 - (progress - 0.5) / 0.3;
        ctx.globalAlpha = fade;
        loser.draw();
        ctx.globalAlpha = 1;
    }
    // Phase 3: Gone (only particles remain)
}

// ============================================
// DRAWING
// ============================================

function drawTiledRect(tileCanvas, x, y, w, h) {
    const tw = tileCanvas.width;
    const th = tileCanvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let ty = y; ty < y + h; ty += th) {
        for (let tx = x; tx < x + w; tx += tw) {
            ctx.drawImage(tileCanvas, tx, ty);
        }
    }
    ctx.restore();
}

function drawPlatforms() {
    for (const p of platforms) {
        if (p.isGround) {
            drawTiledRect(groundTileCanvas, p.x, p.y, p.w, p.h);
        } else {
            drawTiledRect(platTileCanvas, p.x, p.y, p.w, p.h);
            // Edge highlights
            ctx.fillStyle = '#9370c0';
            ctx.fillRect(p.x, p.y, p.w, 2);
            ctx.fillStyle = '#3d2066';
            ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
        }
    }
}

// Background stars with twinkling
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        size: Math.random() < 0.3 ? 2 : 1,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinkleOffset: Math.random() * Math.PI * 2,
    });
}

// Background city silhouette
const buildings = [];
for (let x = 0; x < 800; x += 30 + Math.random() * 40) {
    const bw = 20 + Math.random() * 35;
    const bh = 40 + Math.random() * 120;
    buildings.push({ x, w: bw, h: bh });
}

function drawBackground() {
    // Sky gradient (pixelated stripes)
    const colors = ['#0a0a1a', '#0f1128', '#141836', '#16213e', '#1a2744'];
    const stripeH = canvas.height / colors.length;
    for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, i * stripeH, canvas.width, stripeH);
    }

    // Stars
    for (const s of stars) {
        const twinkle = Math.sin(frameCount * s.twinkleSpeed + s.twinkleOffset);
        ctx.globalAlpha = 0.3 + 0.4 * (twinkle * 0.5 + 0.5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // City silhouette
    for (const b of buildings) {
        ctx.fillStyle = '#0d1525';
        ctx.fillRect(b.x, 470 - b.h, b.w, b.h);
        // Windows
        ctx.fillStyle = '#1a2744';
        for (let wy = 470 - b.h + 6; wy < 465; wy += 12) {
            for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 8) {
                if (Math.random() > 0.4) {
                    ctx.fillStyle = (Math.random() > 0.7) ? '#2a3a5e' : '#1a2744';
                    ctx.fillRect(wx, wy, 4, 6);
                }
            }
        }
    }
}

// Pre-render background
const bgCanvas = document.createElement('canvas');
bgCanvas.width = canvas.width;
bgCanvas.height = canvas.height;
const bgCtx = bgCanvas.getContext('2d');

function prerenderBackground() {
    const theme = BG_THEMES[settings.bg];
    const colors = theme.sky;
    const stripeH = canvas.height / colors.length;
    for (let i = 0; i < colors.length; i++) {
        bgCtx.fillStyle = colors[i];
        bgCtx.fillRect(0, i * stripeH, canvas.width, stripeH);
    }
    // City silhouette
    for (const b of buildings) {
        bgCtx.fillStyle = theme.buildingColor;
        bgCtx.fillRect(b.x, 470 - b.h, b.w, b.h);
        for (let wy = 470 - b.h + 6; wy < 465; wy += 12) {
            for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 8) {
                bgCtx.fillStyle = (Math.random() > 0.5) ? theme.windowColors[0] : theme.windowColors[1];
                bgCtx.fillRect(wx, wy, 4, 6);
            }
        }
    }
}
prerenderBackground();

function drawBg() {
    ctx.drawImage(bgCanvas, 0, 0);

    // Animated stars on top
    const starColor = BG_THEMES[settings.bg].starColor;
    for (const s of stars) {
        const twinkle = Math.sin(frameCount * s.twinkleSpeed + s.twinkleOffset);
        ctx.globalAlpha = 0.3 + 0.5 * (twinkle * 0.5 + 0.5);
        ctx.fillStyle = starColor;
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;
}

// ============================================
// SCREENS
// ============================================

function drawPixelText(text, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function drawStartScreen() {
    drawBg();
    drawPlatforms();

    // Darken overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title with pulsing glow effect
    const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    const titleSize = 44 + Math.sin(frameCount * 0.03) * 2;
    // Glow layers
    ctx.globalAlpha = 0.15 * pulse;
    ctx.fillStyle = '#e94560';
    ctx.font = `bold ${Math.floor(titleSize + 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SHOOOTER 2D', canvas.width / 2, 102);
    ctx.globalAlpha = 0.1 * pulse;
    ctx.fillText('SHOOOTER 2D', canvas.width / 2 + 1, 103);
    ctx.globalAlpha = 1;
    drawPixelText('SHOOOTER 2D', canvas.width / 2, 100, Math.floor(titleSize), '#e94560');
    drawPixelText(T('subtitle'), canvas.width / 2, 140, 14, '#ffffff');

    // Animated idle sprites on title screen (gentle bob)
    const idleBob = Math.sin(frameCount * 0.06) * 2;
    const p1Frame = sprites1.idle[0];
    const p2Frame = sprites2.idle[0];
    drawSprite(p1Frame, 180, 180 + idleBob, PX, false);
    drawSprite(sprites1.gun, 180 + 30, 196 + idleBob, PX, false);

    drawSprite(p2Frame, 570, 180 - idleBob, PX, true);
    drawSprite(sprites2.gun, 570 - 10, 196 - idleBob, PX, true);

    // Controls boxes
    const p1SkinColor = SKIN_OPTIONS[settings.p1Skin].primary;
    const p2SkinColor = SKIN_OPTIONS[settings.p2Skin].primary;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(120, 230, 220, 118);
    ctx.fillRect(460, 230, 220, 118);

    // Pixel borders
    ctx.fillStyle = p1SkinColor;
    ctx.fillRect(120, 230, 220, 2);
    ctx.fillRect(120, 346, 220, 2);
    ctx.fillStyle = p2SkinColor;
    ctx.fillRect(460, 230, 220, 2);
    ctx.fillRect(460, 346, 220, 2);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';

    const b1 = customBindings.p1;
    const b2 = customBindings.p2;
    const K = getKeyDisplayName;

    ctx.fillStyle = p1SkinColor;
    ctx.fillText(T('player1'), 135, 250);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(T('move') + '      ' + K(b1.left) + ' / ' + K(b1.right), 135, 272);
    ctx.fillText(T('jump') + '      ' + K(b1.jump), 135, 292);
    ctx.fillText(T('drop') + '      ' + K(b1.down), 135, 312);
    ctx.fillText(T('shoot') + '     ' + K(b1.shoot), 135, 332);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = p2SkinColor;
    ctx.fillText(T('player2'), 475, 250);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(T('move') + '      ' + K(b2.left) + ' / ' + K(b2.right), 475, 272);
    ctx.fillText(T('jump') + '      ' + K(b2.jump), 475, 292);
    ctx.fillText(T('drop') + '      ' + K(b2.down), 475, 312);
    ctx.fillText(T('shoot') + '     ' + K(b2.shoot), 475, 332);

    // Power-Up legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(130, 358, 540, 54);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(130, 358, 540, 2);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(T('puTitle'), canvas.width / 2, 375);

    const puTypes = Object.values(POWERUP_TYPES);
    const puCount = puTypes.length;
    const puTotalW = 500;
    const puSpacing = puTotalW / puCount;
    const puStartX = 155 + puSpacing / 2;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < puCount; i++) {
        const px = puStartX + i * puSpacing;
        const py = 388;
        // Mini power-up box
        ctx.fillStyle = puTypes[i].colorDark;
        ctx.fillRect(px - 6, py, 12, 12);
        ctx.fillStyle = puTypes[i].color;
        ctx.fillRect(px - 6, py, 12, 2);
        ctx.fillRect(px - 6, py + 10, 12, 2);
        ctx.fillRect(px - 6, py, 2, 12);
        ctx.fillRect(px + 4, py, 2, 12);
        ctx.font = 'bold 8px monospace';
        ctx.fillText(puTypes[i].symbol, px, py + 9);
        // Label
        ctx.font = '9px monospace';
        ctx.fillStyle = puTypes[i].color;
        ctx.fillText(puTypes[i].description, px, py + 24);
    }

    // Start prompts
    const blink = Math.floor(Date.now() / 400) % 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(150, 424, 500, 52);
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(150, 424, 500, 2);
    ctx.fillRect(150, 474, 500, 2);
    drawPixelText(T('pressEnter'), canvas.width / 2, 444, 16, blink ? '#ffdd00' : '#ffaa00');
    drawPixelText(T('pressSpace'), canvas.width / 2, 466, 11, '#888');
}

function drawSettingsScreen() {
    drawBg();
    drawPlatforms();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (settingsCategory === -1) {
        // --- Category Selection ---
        drawPixelText(T('settings'), canvas.width / 2, 60, 32, '#ffdd00');

        const categories = [
            { name: T('system'), icon: '\u2699', desc: T('sysDesc'), color: '#4ecdc4' },
            { name: T('gameplay'), icon: '\u2694', desc: T('gpDesc'), color: '#e94560' },
        ];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const bx = 120 + i * 290;
            const by = 150;
            const bw = 260;
            const bh = 220;
            const selected = settingsCursor === i;
            const borderCol = selected ? cat.color : '#555';
            const pulse = selected ? Math.sin(Date.now() / 200) * 0.15 + 0.85 : 0.5;

            // Box background
            ctx.fillStyle = selected ? `rgba(${i === 0 ? '78,205,196' : '233,69,96'}, 0.15)` : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(bx, by, bw, bh);
            // Border
            ctx.fillStyle = borderCol;
            ctx.fillRect(bx, by, bw, 3);
            ctx.fillRect(bx, by + bh - 3, bw, 3);
            ctx.fillRect(bx, by, 3, bh);
            ctx.fillRect(bx + bw - 3, by, 3, bh);

            // Icon area
            drawPixelText(cat.icon, bx + bw / 2, by + 60, 36, selected ? cat.color : '#666');
            // Name
            drawPixelText(cat.name, bx + bw / 2, by + 120, 20, selected ? '#ffffff' : '#888');
            // Description
            drawPixelText(cat.desc, bx + bw / 2, by + 160, 9, selected ? '#aaa' : '#555');

            // Selection indicator
            if (selected) {
                const arrowBlink = Math.floor(Date.now() / 300) % 2;
                drawPixelText('\u25B6', bx + bw / 2, by + 195, 14, arrowBlink ? cat.color : '#666');
            }
        }

        const blink = Math.floor(Date.now() / 500) % 2;
        drawPixelText(T('selectCat'), canvas.width / 2, 420, 10, blink ? '#aaa' : '#666');
        drawPixelText(T('pressH'), canvas.width / 2, 440, 10, '#4ecdc4');

    } else if (settingsCategory === 0) {
        // --- System Settings ---
        drawPixelText(T('system'), canvas.width / 2, 60, 28, '#4ecdc4');

        const soundVal = settings.sound === 0 ? T('on') : T('off');
        const skinLang = settings.lang === 0 ? 'name' : 'nameDE';
        const p1SkinName = SKIN_OPTIONS[settings.p1Skin][skinLang];
        const p2SkinName = SKIN_OPTIONS[settings.p2Skin][skinLang];
        const options = [
            { label: T('lblMap'), value: MAPS[MAP_KEYS[settings.map]].name, hasArrows: true },
            { label: T('lblBg'), value: BG_THEMES[settings.bg].name, hasArrows: true },
            { label: T('lblSound'), value: soundVal, hasArrows: true },
            { label: T('lblLang'), value: LANG_OPTIONS[settings.lang], hasArrows: true },
            { label: T('lblP1Skin'), value: p1SkinName, hasArrows: true },
            { label: T('lblP2Skin'), value: p2SkinName, hasArrows: true },
            { label: T('lblControls'), value: T('pressEnterEdit'), hasArrows: false },
        ];

        drawSettingsOptions(options, 78);

        // Skin color preview swatches next to P1/P2 COLOR options
        const spacing = options.length > 9 ? 40 : (options.length > 7 ? 44 : (options.length > 5 ? 48 : 52));
        const boxH = options.length > 9 ? 30 : (options.length > 7 ? 34 : (options.length > 5 ? 36 : 40));
        for (let si = 4; si <= 5; si++) {
            const skinIdx = si === 4 ? settings.p1Skin : settings.p2Skin;
            const skin = SKIN_OPTIONS[skinIdx];
            const sy = 78 + si * spacing;
            const swX = 560;
            const swS = boxH - 8;
            // Color swatch
            ctx.fillStyle = skin.primary;
            ctx.fillRect(swX, sy + 4, swS, swS);
            ctx.fillStyle = '#000';
            ctx.fillRect(swX, sy + 4, swS, 2);
            ctx.fillRect(swX, sy + 4 + swS - 2, swS, 2);
            ctx.fillRect(swX, sy + 4, 2, swS);
            ctx.fillRect(swX + swS - 2, sy + 4, 2, swS);
            // Mini sprite preview
            const previewSprites = si === 4 ? sprites1 : sprites2;
            const previewFrame = previewSprites.idle[0];
            const miniScale = 1;
            const sprX = swX + swS + 8;
            const sprY = sy + 2;
            drawSprite(previewFrame, sprX, sprY, miniScale, false);
        }

        // Map preview
        const previewY = 78 + 7 * spacing + 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(150, previewY, 500, 50);
        ctx.fillStyle = '#444';
        ctx.fillRect(150, previewY, 500, 2);
        ctx.fillRect(150, previewY + 48, 500, 2);
        drawPixelText(T('mapPreview'), canvas.width / 2, previewY + 11, 9, '#888');

        const previewMap = MAPS[MAP_KEYS[settings.map]].platforms;
        const scale = 0.09;
        const offsetX = 210;
        const offsetY = previewY - 22;
        for (const p of previewMap) {
            ctx.fillStyle = p.isGround ? '#8b6914' : '#7755aa';
            ctx.fillRect(offsetX + p.x * scale, offsetY + p.y * scale, Math.max(p.w * scale, 4), Math.max(p.h * scale, 2));
        }

        // Background preview swatch
        const theme = BG_THEMES[settings.bg];
        const swatchX = 540;
        const swatchW = 100;
        for (let i = 0; i < theme.sky.length; i++) {
            ctx.fillStyle = theme.sky[i];
            ctx.fillRect(swatchX, previewY + 4 + i * 8, swatchW, 8);
        }
        ctx.fillStyle = '#444';
        ctx.fillRect(swatchX, previewY + 2, swatchW, 2);
        ctx.fillRect(swatchX, previewY + 44, swatchW, 2);
        ctx.fillRect(swatchX, previewY + 2, 2, 44);
        ctx.fillRect(swatchX + swatchW - 2, previewY + 2, 2, 44);

        const blink = Math.floor(Date.now() / 500) % 2;
        drawPixelText(T('arrowChange'), canvas.width / 2, 480, 9, blink ? '#aaa' : '#666');
        drawPixelText(T('pressH'), canvas.width / 2, 496, 9, '#4ecdc4');

    } else if (settingsCategory === 1) {
        // --- Gameplay Settings ---
        drawPixelText(T('gameplay'), canvas.width / 2, 60, 28, '#e94560');

        const modeVal = settings.mode === 0 ? T('pvp') : T('pve');
        const puVal = [T('off'), T('normal'), T('frequent'), T('chaos')][settings.puFreq];
        const aiVal = [T('easy'), T('medium'), T('hard')][settings.aiDiff];
        const gravVal = [T('moon'), T('normal'), T('heavy')][settings.gravity];
        const sdVal = [T('off'), T('after30'), T('after60'), T('after90')][settings.suddenDeath];
        const dtVal = settings.dropThrough === 0 ? T('on') : T('off');
        const iaVal = settings.infiniteAmmo === 0 ? T('on') : T('off');
        const ammoFVal = [T('slow'), T('normal'), T('fast'), T('veryFast')][settings.ammoFreq];

        const options = [
            { label: T('lblMode'), value: modeVal, hasArrows: true },
            { label: T('lblRounds'), value: T('bestOf') + BEST_OF_OPTIONS[settings.bestOf], hasArrows: true },
            { label: T('lblMaxHp'), value: HP_OPTIONS[settings.hp] + ' HP', hasArrows: true },
            { label: T('lblPuFreq'), value: puVal, hasArrows: true },
            { label: T('lblAiDiff'), value: aiVal, hasArrows: true },
            { label: T('lblGravity'), value: gravVal, hasArrows: true },
            { label: T('lblSuddenDeath'), value: sdVal, hasArrows: true },
            { label: T('lblDropThrough'), value: dtVal, hasArrows: true },
            { label: T('lblInfAmmo'), value: iaVal, hasArrows: true },
            { label: T('lblAmmoFreq'), value: ammoFVal, hasArrows: true },
        ];

        drawSettingsOptions(options, 78);

        const blink = Math.floor(Date.now() / 500) % 2;
        drawPixelText(T('arrowChange'), canvas.width / 2, 490, 9, blink ? '#aaa' : '#666');
        drawPixelText(T('pressH'), canvas.width / 2, 506, 9, '#4ecdc4');
    }

    // How to Play overlay
    if (showHowToPlay) {
        drawHowToPlay();
    }
}

// Helper to draw a list of setting options with cursor highlight
function drawSettingsOptions(options, startY) {
    const spacing = options.length > 9 ? 40 : (options.length > 7 ? 44 : (options.length > 5 ? 48 : 52));
    const boxH = options.length > 9 ? 30 : (options.length > 7 ? 34 : (options.length > 5 ? 36 : 40));
    for (let i = 0; i < options.length; i++) {
        const y = startY + i * spacing;
        const selected = settingsCursor === i;
        const boxColor = selected ? '#ffdd00' : '#555';

        // Box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(150, y, 500, boxH);
        ctx.fillStyle = boxColor;
        ctx.fillRect(150, y, 500, 2);
        ctx.fillRect(150, y + boxH - 2, 500, 2);
        ctx.fillRect(150, y, 2, boxH);
        ctx.fillRect(648, y, 2, boxH);

        // Label + value on same line
        drawPixelText(options[i].label, 240, y + boxH / 2 + 4, 11, selected ? '#ffdd00' : '#888');

        const midY = y + boxH / 2 + 4;
        if (selected && options[i].hasArrows) {
            const arrowBlink = Math.floor(Date.now() / 300) % 2;
            drawPixelText('<', 370, midY, 14, arrowBlink ? '#ffdd00' : '#aa8800');
            drawPixelText('>', 540, midY, 14, arrowBlink ? '#ffdd00' : '#aa8800');
        }
        const isControls = options[i].label === 'CONTROLS';
        const valColor = (isControls && selected) ? '#4ecdc4' : (selected ? '#ffffff' : '#aaa');
        drawPixelText(options[i].value, 455, midY, 12, valColor);
    }
}

function drawRebindScreen() {
    drawBg();
    drawPlatforms();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPixelText(T('keyBindings'), canvas.width / 2, 55, 28, '#ffdd00');

    // Player tabs
    const tab1Selected = rebindPlayer === 1;
    const tab2Selected = rebindPlayer === 2;

    // Player 1 tab
    const p1C = SKIN_OPTIONS[settings.p1Skin].primary;
    const p2C = SKIN_OPTIONS[settings.p2Skin].primary;
    ctx.fillStyle = tab1Selected ? 'rgba(78, 205, 196, 0.2)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(150, 80, 240, 34);
    ctx.fillStyle = tab1Selected ? p1C : '#555';
    ctx.fillRect(150, 80, 240, 2);
    ctx.fillRect(150, 112, 240, 2);
    drawPixelText(T('p1Label'), 270, 102, 14, tab1Selected ? p1C : '#666');

    // Player 2 tab
    ctx.fillStyle = tab2Selected ? 'rgba(233, 69, 96, 0.2)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(410, 80, 240, 34);
    ctx.fillStyle = tab2Selected ? p2C : '#555';
    ctx.fillRect(410, 80, 240, 2);
    ctx.fillRect(410, 112, 240, 2);
    drawPixelText(T('p2Label'), 530, 102, 14, tab2Selected ? p2C : '#666');

    // Arrow hints between tabs
    const arrowBlink = Math.floor(Date.now() / 400) % 2;
    drawPixelText('\u2190 \u2192', 400, 102, 12, arrowBlink ? '#ffdd00' : '#886600');

    // Key bindings list
    const pKey = rebindPlayer === 1 ? 'p1' : 'p2';
    const playerColor = rebindPlayer === 1 ? p1C : p2C;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(150, 125, 500, KEY_ACTIONS.length * 52 + 10);
    ctx.fillStyle = '#444';
    ctx.fillRect(150, 125, 500, 2);
    ctx.fillRect(150, 125 + KEY_ACTIONS.length * 52 + 8, 500, 2);

    for (let i = 0; i < KEY_ACTIONS.length; i++) {
        const action = KEY_ACTIONS[i];
        const y = 145 + i * 52;
        const selected = rebindCursor === i;
        const isRebinding = rebindState && rebindState.action === action && rebindState.player === rebindPlayer;

        // Highlight selected row
        if (selected) {
            ctx.fillStyle = 'rgba(255, 221, 0, 0.1)';
            ctx.fillRect(155, y - 8, 490, 44);
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(155, y - 8, 2, 44);
        }

        // Action label
        const actionLabel = { left: T('moveLeft'), right: T('moveRight'), jump: T('jump'), down: T('drop'), shoot: T('shoot') }[action];
        drawPixelText(actionLabel, 260, y + 10, 14, selected ? '#ffffff' : '#aaa');

        // Current key
        if (isRebinding) {
            const hasError = rebindError && Date.now() - rebindError < 3000;
            if (hasError) {
                const errBlink = Math.floor(Date.now() / 400) % 2;
                drawPixelText(`"${getKeyDisplayName(rebindErrorKey)}" ${T('alreadyUsed')}`, 470, y + 10, 12, errBlink ? '#ff4444' : '#aa2222');
                drawPixelText(T('tryAnother'), 470, y + 28, 9, '#aa6666');
            } else {
                const waitBlink = Math.floor(Date.now() / 300) % 2;
                drawPixelText(T('pressKey'), 470, y + 10, 14, waitBlink ? '#ff4444' : '#aa2222');
            }
        } else {
            const keyName = getKeyDisplayName(customBindings[pKey][action]);
            // Key badge
            const badgeW = Math.max(ctx.measureText(keyName).width + 20, 60);
            ctx.font = 'bold 14px monospace';
            const bw = Math.max(ctx.measureText(keyName).width + 24, 60);
            const bx = 470 - bw / 2;
            ctx.fillStyle = selected ? 'rgba(255, 221, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(bx, y - 4, bw, 28);
            ctx.fillStyle = selected ? '#ffdd00' : '#666';
            ctx.fillRect(bx, y - 4, bw, 2);
            ctx.fillRect(bx, y + 22, bw, 2);
            ctx.fillRect(bx, y - 4, 2, 28);
            ctx.fillRect(bx + bw - 2, y - 4, 2, 28);
            drawPixelText(keyName, 470, y + 14, 14, selected ? playerColor : '#ccc');
        }

        // Edit hint for selected
        if (selected && !isRebinding) {
            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(T('enterChange'), 470, y + 30);
        }
    }

    // Bottom hints
    const blink = Math.floor(Date.now() / 500) % 2;
    drawPixelText(T('rebindHint'), canvas.width / 2, 420, 10, blink ? '#aaa' : '#666');
}

function drawHowToPlay() {
    // Full screen overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    drawPixelText(T('howToPlay'), canvas.width / 2, 45, 28, '#4ecdc4');

    // Content box
    const boxX = 80;
    const boxW = 640;
    ctx.fillStyle = 'rgba(20, 30, 50, 0.95)';
    ctx.fillRect(boxX, 60, boxW, 440);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(boxX, 60, boxW, 2);
    ctx.fillRect(boxX, 498, boxW, 2);

    ctx.textAlign = 'left';
    const x = 110;
    let y = 90;
    const lineH = 19;

    // Goal
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('goalTitle'), x, y);
    y += lineH;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.fillText(T('goal1'), x, y);
    y += lineH;
    ctx.fillText(T('goal2'), x, y);
    y += lineH;
    ctx.fillText(T('goal3'), x, y);
    y += lineH * 1.4;

    // Controls
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('controlsTitle'), x, y);
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(T('controlsDefault'), x + 90, y);
    y += lineH;
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '11px monospace';
    ctx.fillText(T('p1Label'), x, y);
    ctx.fillStyle = '#aaa';
    ctx.fillText(T('p1Controls'), x + 85, y);
    y += lineH;
    ctx.fillStyle = '#e94560';
    ctx.fillText(T('p2Label'), x, y);
    ctx.fillStyle = '#aaa';
    ctx.fillText(T('p2Controls'), x + 85, y);
    y += lineH;
    ctx.fillStyle = '#888';
    ctx.fillText(T('escMenu'), x, y);
    y += lineH * 1.4;

    // Mechanics
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('mechTitle'), x, y);
    y += lineH;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.fillText(T('mech1'), x, y);
    y += lineH;
    ctx.fillText(T('mech2'), x, y);
    y += lineH;
    ctx.fillText(T('mech3'), x, y);
    y += lineH;
    ctx.fillText(T('mech4'), x, y);
    y += lineH;
    ctx.fillText(T('mech5'), x, y);
    y += lineH * 1.4;

    // Power-ups
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('puTitle'), x, y);
    y += lineH + 2;

    const puEntries = Object.values(POWERUP_TYPES);
    for (const pu of puEntries) {
        // Mini icon
        ctx.fillStyle = pu.colorDark;
        ctx.fillRect(x, y - 8, 12, 12);
        ctx.fillStyle = pu.color;
        ctx.fillRect(x, y - 8, 12, 2);
        ctx.fillRect(x, y + 2, 12, 2);
        ctx.fillRect(x, y - 8, 2, 12);
        ctx.fillRect(x + 10, y - 8, 2, 12);
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pu.symbol, x + 6, y + 1);
        ctx.textAlign = 'left';

        ctx.fillStyle = pu.color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(pu.name, x + 20, y);
        ctx.fillStyle = '#aaa';
        ctx.font = '11px monospace';
        ctx.fillText('- ' + pu.description, x + 130, y);
        y += lineH;
    }

    // Close hint
    const closeBlink = Math.floor(Date.now() / 500) % 2;
    drawPixelText(T('closeHint'), canvas.width / 2, 520, 14, closeBlink ? '#4ecdc4' : '#2a8a80');
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const winsNeeded = Math.ceil(BEST_OF_OPTIONS[settings.bestOf] / 2);
    const matchOver = roundWins.p1 >= winsNeeded || roundWins.p2 >= winsNeeded;
    const totalRounds = BEST_OF_OPTIONS[settings.bestOf];

    // Round score display
    if (totalRounds > 1) {
        drawPixelText(`${T('score')} ${roundWins.p1} - ${roundWins.p2}`, canvas.width / 2, 50, 16, '#ffffff');

        // Round dots
        const dotY = 60;
        const dotSpacing = 18;
        const totalDots = totalRounds;
        const startX = canvas.width / 2 - (totalDots - 1) * dotSpacing / 2;
        for (let i = 0; i < totalDots; i++) {
            const dx = startX + i * dotSpacing;
            let color = '#333';
            if (i < roundWins.p1) color = player1.color;
            else if (i >= totalDots - roundWins.p2) color = player2.color;
            ctx.fillStyle = color;
            ctx.fillRect(dx - 4, dotY, 8, 8);
            ctx.fillStyle = '#000';
            ctx.fillRect(dx - 4, dotY, 8, 1);
        }
    }

    // Winner text
    const headerText = matchOver ? `${winner.name} ${T('winsMatch')}` : `${winner.name} ${T('winsRound')}`;
    const headerSize = totalRounds > 1 ? 28 : 38;
    const glowPulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
    ctx.globalAlpha = 0.2 * glowPulse;
    ctx.fillStyle = winner.color;
    ctx.font = `bold ${headerSize + 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(headerText, canvas.width / 2, 102);
    ctx.globalAlpha = 1;
    drawPixelText(headerText, canvas.width / 2, 100, headerSize, winner.color);

    // Trophy (only for match wins)
    if (matchOver || totalRounds === 1) {
        const trophyY = 115;
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(canvas.width / 2 - 12, trophyY, 24, 6);
        ctx.fillRect(canvas.width / 2 - 8, trophyY + 6, 16, 12);
        ctx.fillRect(canvas.width / 2 - 14, trophyY + 4, 4, 8);
        ctx.fillRect(canvas.width / 2 + 10, trophyY + 4, 4, 8);
        ctx.fillRect(canvas.width / 2 - 4, trophyY + 18, 8, 4);
        ctx.fillRect(canvas.width / 2 - 8, trophyY + 22, 16, 4);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(canvas.width / 2 - 4, trophyY + 8, 8, 6);
    }

    // --- Stats Panel ---
    const panelY = 155;
    const panelH = 200;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(60, panelY, 680, panelH);
    ctx.fillStyle = '#444';
    ctx.fillRect(60, panelY, 680, 2);
    ctx.fillRect(60, panelY + panelH - 2, 680, 2);

    drawPixelText(T('roundStats'), canvas.width / 2, panelY + 22, 16, '#ffffff');

    // Divider line
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width / 2 - 1, panelY + 32, 2, panelH - 42);

    // Column headers
    const col1X = 220;
    const col2X = 580;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = player1.color;
    ctx.fillText(player1.name, col1X, panelY + 50);
    ctx.fillStyle = player2.color;
    ctx.fillText(player2.name, col2X, panelY + 50);

    // Stats rows
    const statLabels = [T('shotsFired'), T('hits'), T('accuracy'), T('damageDone'), T('puCollected')];
    const s1 = stats.p1;
    const s2 = stats.p2;
    const acc1 = s1.shotsFired > 0 ? Math.round((s1.hits / s1.shotsFired) * 100) : 0;
    const acc2 = s2.shotsFired > 0 ? Math.round((s2.hits / s2.shotsFired) * 100) : 0;
    const statVals1 = [s1.shotsFired, s1.hits, acc1 + '%', s1.damageDone, s1.powerupsCollected];
    const statVals2 = [s2.shotsFired, s2.hits, acc2 + '%', s2.damageDone, s2.powerupsCollected];

    ctx.font = '11px monospace';
    for (let i = 0; i < statLabels.length; i++) {
        const rowY = panelY + 72 + i * 24;
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(statLabels[i], canvas.width / 2, rowY);
        ctx.fillStyle = '#ddd';
        ctx.fillText('' + statVals1[i], col1X, rowY);
        ctx.fillText('' + statVals2[i], col2X, rowY);

        const v1 = parseFloat(statVals1[i]);
        const v2 = parseFloat(statVals2[i]);
        if (!isNaN(v1) && !isNaN(v2) && v1 !== v2) {
            const betterX = v1 > v2 ? col1X : col2X;
            const betterColor = v1 > v2 ? player1.color : player2.color;
            ctx.fillStyle = betterColor;
            ctx.fillText(v1 > v2 ? '' + statVals1[i] : '' + statVals2[i], betterX, rowY);
        }
    }

    // Bottom prompt
    if (matchOver) {
        drawPixelText(T('pressRMenu'), canvas.width / 2, panelY + panelH + 20, 16, '#ffffff');
    } else {
        drawPixelText(`${T('pressRNext')} (${roundWins.p1} - ${roundWins.p2})`, canvas.width / 2, panelY + panelH + 20, 16, '#ffdd00');
    }
}

// ============================================
// RESET & GAME LOOP
// ============================================
function resetGame() {
    createPlayers();
    AI.reset();
    particles = [];
    damageNumbers = [];
    powerups = [];
    lastPowerupSpawn = Date.now();
    roundStartTime = Date.now();
    suddenDeathActive = false;
    ammoPickups = [];
    lastAmmoSpawn = Date.now();
    gameState = 'playing';
    winner = null;
    loser = null;
    deathTimer = 0;
    stats = {
        p1: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
        p2: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
    };
}

function updateSuddenDeath() {
    const sdOption = SUDDEN_DEATH_OPTIONS[settings.suddenDeath];
    if (sdOption.time === 0) return; // Off

    const elapsed = (Date.now() - roundStartTime) / 1000;
    const remaining = sdOption.time - elapsed;

    if (remaining <= 0 && !suddenDeathActive) {
        suddenDeathActive = true;
    }

    // In sudden death: both players take 1 damage per frame
    if (suddenDeathActive) {
        if (player1.hp > 0) player1.hp -= 0.5;
        if (player2.hp > 0) player2.hp -= 0.5;
        if (player1.hp < 0) player1.hp = 0;
        if (player2.hp < 0) player2.hp = 0;
    }
}

function drawRoundTimer() {
    const sdOption = SUDDEN_DEATH_OPTIONS[settings.suddenDeath];
    if (sdOption.time === 0) return;

    const elapsed = (Date.now() - roundStartTime) / 1000;
    const remaining = Math.max(0, sdOption.time - elapsed);

    if (suddenDeathActive) {
        // Flashing SUDDEN DEATH text
        const flash = Math.floor(Date.now() / 250) % 2;
        drawPixelText(T('suddenDeath'), canvas.width / 2, 30, 14, flash ? '#ff2244' : '#ff8800');
    } else {
        // Timer countdown
        const secs = Math.ceil(remaining);
        const color = secs <= 10 ? '#ff4444' : (secs <= 20 ? '#ffaa00' : '#ffffff');
        drawPixelText(secs + 's', canvas.width / 2, 30, 14, color);
    }
}

function gameLoop() {
    frameCount++;

    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'settings') {
        drawSettingsScreen();
    } else if (gameState === 'rebind') {
        drawRebindScreen();
    } else if (gameState === 'playing') {
        if (gameMode === 'pve') {
            AI.update(player2, player1);
        }
        player1.update();
        player2.update();
        updatePowerups();
        updateAmmoPickups();
        updateSuddenDeath();
        checkBulletHits();
        checkWin();
        updateParticles();
        updateDamageNumbers();

        drawBg();
        drawPlatforms();
        drawPowerups();
        drawAmmoPickups();
        player1.draw();
        player2.draw();
        drawParticles();
        drawDamageNumbers();
        drawRoundTimer();
    } else if (gameState === 'dying') {
        updateDeathAnimation();
        updateParticles();
        updateDamageNumbers();

        drawBg();
        drawPlatforms();
        // Draw the winner normally
        if (winner === player1) { player1.draw(); } else { player2.draw(); }
        // Draw the loser with death effect
        drawDyingPlayer();
        drawParticles();
        drawDamageNumbers();
    } else if (gameState === 'gameover') {
        drawBg();
        drawPlatforms();
        // Only draw the winner (loser has exploded)
        if (winner === player1) { player1.draw(); } else { player2.draw(); }
        updateParticles();
        updateDamageNumbers();
        drawParticles();
        drawDamageNumbers();
        drawGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

createPlayers();
gameLoop();
