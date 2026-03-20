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
    gameMode: 0,     // index into GAME_MODE_OPTIONS (0=Classic, 1=One Shot, 2=King of the Hill, 3=Tag)
    tagWinRule: 0,   // 0 = not "it" at end wins, 1 = shortest time as "it" wins
    tagDuration: 1,  // index into TAG_DURATION_OPTIONS (default 60s)
    knockback: 1,    // index into KNOCKBACK_OPTIONS (default Normal)
    lavaLives: 1,    // index into LAVA_LIVES_OPTIONS (default 3 lives)
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
const AMMO_PICKUP_AMOUNT = 10;
const AMMO_SPAWN_INTERVAL = 5000; // ms (default, overridden by setting)
const AMMO_FREQ_OPTIONS = [
    { name: 'Slow', interval: 8000 },
    { name: 'Normal', interval: 5000 },
    { name: 'Fast', interval: 3000 },
    { name: 'Very Fast', interval: 1500 },
];
const LANG_OPTIONS = ['English', 'Deutsch'];

// --- Game Mode Options ---
const GAME_MODE_OPTIONS = [
    { name: 'Classic', nameDE: 'Klassisch', desc: 'Reduce HP to 0', descDE: 'HP auf 0 reduzieren' },
    { name: 'One Shot', nameDE: 'Ein Schuss', desc: 'One hit = kill', descDE: 'Ein Treffer = Tod' },
    { name: 'King of the Hill', nameDE: 'König des Hügels', desc: 'Hold the hill', descDE: 'Hügel halten' },
    { name: 'Tag', nameDE: 'Fangen', desc: "Don't be it!", descDE: 'Nicht Fänger sein!' },
    { name: 'Lava Rise', nameDE: 'Steigende Lava', desc: 'Outrun the lava!', descDE: 'Fliehe vor der Lava!' },
];
const TAG_WIN_RULE_OPTIONS = [
    { name: 'Not It', nameDE: 'Nicht Fänger' },
    { name: 'Least Time', nameDE: 'Kürzeste Zeit' },
];
const TAG_DURATION_OPTIONS = [
    { name: '30s', time: 30 },
    { name: '60s', time: 60 },
    { name: '90s', time: 90 },
    { name: '120s', time: 120 },
];

const KNOCKBACK_OPTIONS = [
    { name: 'Off', nameDE: 'Aus', force: 0 },
    { name: 'Light', nameDE: 'Leicht', force: 3 },
    { name: 'Normal', nameDE: 'Normal', force: 6 },
    { name: 'Heavy', nameDE: 'Stark', force: 14 },
    { name: 'Extreme', nameDE: 'Extrem', force: 24 },
];

const LAVA_LIVES_OPTIONS = [
    { name: '1', lives: 1 },
    { name: '3', lives: 3 },
    { name: '5', lives: 5 },
    { name: '10', lives: 10 },
];

// --- Tag Mode State ---
let tagState = {
    tagger: null,         // reference to the player who is "it"
    p1Time: 0,            // ms player1 was "it"
    p2Time: 0,            // ms player2 was "it"
    lastTagSwitch: 0,     // timestamp of last tag switch
    roundEndTime: 0,      // when the round ends
};

// --- King of the Hill State ---
let kothState = {
    p1Score: 0,           // seconds player1 held the hill
    p2Score: 0,           // seconds player2 held the hill
    scoreToWin: 30,       // seconds needed to win
    hillZone: null,       // { x, y, w, h } - the capture zone
    currentHolder: null,  // who is on the hill
    holdStart: 0,         // when current holder started holding
};

let lavaState = {
    lavaY: 500,           // world Y of lava surface
    lavaSpeed: 0.3,       // pixels per frame
    cameraY: 0,           // camera offset (positive = scrolled up)
    nextPlatformY: 0,     // Y level to generate next platform row
    p1Lives: 3,
    p2Lives: 3,
    framesSinceStart: 0,
    useStructures: false,  // switch to pre-built structures after ~30s
};

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
        lblGameMode: 'GAME MODE', lblTagWinRule: 'TAG WIN RULE', lblTagDuration: 'TAG DURATION', lblKnockback: 'KNOCKBACK',
        notIt: 'Not It', leastTime: 'Least Time', light: 'Light', extreme: 'Extreme',
        classic: 'Classic', oneShot: 'One Shot', koth: 'King of the Hill', tag: 'Tag',
        tagTagger: 'TAGGER', tagTime: 'Time as Tagger',
        kothHold: 'HOLD THE HILL!', kothScore: 'Hill Score',
        tagEnded: 'TIME UP!',
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
        timeAsTagger: 'Time as Tagger', lastTagger: 'Last Tagger',
        hillTime: 'Hill Time', hillScore: 'Hill Score',
        deaths: 'Deaths',
        lavaRise: 'Lava Rise', lblLavaLives: 'LIVES', livesLeft: 'Lives',
        yes: 'Yes', no: 'No',
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
        lblGameMode: 'SPIELMODUS', lblTagWinRule: 'FANGEN SIEGREGEL', lblTagDuration: 'FANGEN DAUER', lblKnockback: 'R\u00dcCKSTOSS',
        notIt: 'Nicht F\u00e4nger', leastTime: 'K\u00fcrzeste Zeit', light: 'Leicht', extreme: 'Extrem',
        classic: 'Klassisch', oneShot: 'Ein Schuss', koth: 'K\u00f6nig d. H\u00fcgels', tag: 'Fangen',
        tagTagger: 'F\u00c4NGER', tagTime: 'Zeit als F\u00e4nger',
        kothHold: 'HALTE DEN H\u00dcGEL!', kothScore: 'H\u00fcgel-Punkte',
        tagEnded: 'ZEIT UM!',
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
        timeAsTagger: 'Zeit als F\u00e4nger', lastTagger: 'Letzter F\u00e4nger',
        hillTime: 'Zeit auf H\u00fcgel', hillScore: 'H\u00fcgel-Punkte',
        deaths: 'Tode',
        lavaRise: 'Steigende Lava', lblLavaLives: 'LEBEN', livesLeft: 'Leben',
        yes: 'Ja', no: 'Nein',
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

// --- Dynamic Gameplay Settings (depends on selected game mode) ---
function getGameplaySettingsItems() {
    const gm = settings.gameMode;
    const modeVal = settings.lang === 0 ? GAME_MODE_OPTIONS[gm].name : GAME_MODE_OPTIONS[gm].nameDE;
    const pvpVal = settings.mode === 0 ? T('pvp') : T('pve');
    const puVal = [T('off'), T('normal'), T('frequent'), T('chaos')][settings.puFreq];
    const aiVal = [T('easy'), T('medium'), T('hard')][settings.aiDiff];
    const gravVal = [T('moon'), T('normal'), T('heavy')][settings.gravity];
    const sdVal = [T('off'), T('after30'), T('after60'), T('after90')][settings.suddenDeath];
    const dtVal = settings.dropThrough === 0 ? T('on') : T('off');
    const iaVal = settings.infiniteAmmo === 0 ? T('on') : T('off');
    const ammoFVal = [T('slow'), T('normal'), T('fast'), T('veryFast')][settings.ammoFreq];

    // Always-present items
    const items = [
        { key: 'gameMode', label: T('lblGameMode'), value: modeVal, hasArrows: true },
        { key: 'mode', label: T('lblMode'), value: pvpVal, hasArrows: true },
    ];

    // Mode-specific items
    if (gm === 3) {
        // Tag mode: add tag-specific settings
        const twrVal = settings.lang === 0 ? TAG_WIN_RULE_OPTIONS[settings.tagWinRule].name : TAG_WIN_RULE_OPTIONS[settings.tagWinRule].nameDE;
        items.push({ key: 'tagWinRule', label: T('lblTagWinRule'), value: twrVal, hasArrows: true });
        items.push({ key: 'tagDuration', label: T('lblTagDuration'), value: TAG_DURATION_OPTIONS[settings.tagDuration].name, hasArrows: true });
    }

    if (gm === 4) {
        const llVal = LAVA_LIVES_OPTIONS[settings.lavaLives].name;
        items.push({ key: 'lavaLives', label: T('lblLavaLives'), value: llVal, hasArrows: true });
    }

    // Rounds (all modes)
    items.push({ key: 'bestOf', label: T('lblRounds'), value: T('bestOf') + BEST_OF_OPTIONS[settings.bestOf], hasArrows: true });

    if (gm === 0 || gm === 1 || gm === 4) {
        // Classic, One Shot & Lava Rise: HP settings
        items.push({ key: 'hp', label: T('lblMaxHp'), value: HP_OPTIONS[settings.hp] + ' HP', hasArrows: true });
    }

    // Common settings for all modes
    items.push({ key: 'puFreq', label: T('lblPuFreq'), value: puVal, hasArrows: true });
    items.push({ key: 'aiDiff', label: T('lblAiDiff'), value: aiVal, hasArrows: true });
    items.push({ key: 'gravity', label: T('lblGravity'), value: gravVal, hasArrows: true });

    if (gm === 0 || gm === 1) {
        // Classic & One Shot: sudden death
        items.push({ key: 'suddenDeath', label: T('lblSuddenDeath'), value: sdVal, hasArrows: true });
    }

    // Knockback for all modes except One Shot
    if (gm !== 1) {
        const kbOpt = KNOCKBACK_OPTIONS[settings.knockback];
        const kbVal = settings.lang === 0 ? kbOpt.name : kbOpt.nameDE;
        items.push({ key: 'knockback', label: T('lblKnockback'), value: kbVal, hasArrows: true });
    }

    items.push({ key: 'dropThrough', label: T('lblDropThrough'), value: dtVal, hasArrows: true });
    items.push({ key: 'infiniteAmmo', label: T('lblInfAmmo'), value: iaVal, hasArrows: true });
    items.push({ key: 'ammoFreq', label: T('lblAmmoFreq'), value: ammoFVal, hasArrows: true });

    return items;
}

function handleGameplaySettingChange(key, dir) {
    const cycle = (val, len) => (val + dir + len) % len;
    switch (key) {
        case 'gameMode': {
            settings.gameMode = cycle(settings.gameMode, GAME_MODE_OPTIONS.length);
            // Clamp map index to available maps for the new game mode
            const avMapsForMode = getAvailableMaps();
            if (settings.map >= avMapsForMode.length) settings.map = 0;
            break;
        }
        case 'mode': settings.mode = cycle(settings.mode, MODE_OPTIONS.length); break;
        case 'bestOf': settings.bestOf = cycle(settings.bestOf, BEST_OF_OPTIONS.length); break;
        case 'hp': settings.hp = cycle(settings.hp, HP_OPTIONS.length); break;
        case 'puFreq': settings.puFreq = cycle(settings.puFreq, PU_FREQ_OPTIONS.length); break;
        case 'aiDiff': settings.aiDiff = cycle(settings.aiDiff, AI_DIFF_OPTIONS.length); break;
        case 'gravity': settings.gravity = cycle(settings.gravity, GRAVITY_OPTIONS.length); break;
        case 'suddenDeath': settings.suddenDeath = cycle(settings.suddenDeath, SUDDEN_DEATH_OPTIONS.length); break;
        case 'dropThrough': settings.dropThrough = cycle(settings.dropThrough, DROP_THROUGH_OPTIONS.length); break;
        case 'infiniteAmmo': settings.infiniteAmmo = cycle(settings.infiniteAmmo, INFINITE_AMMO_OPTIONS.length); break;
        case 'ammoFreq': settings.ammoFreq = cycle(settings.ammoFreq, AMMO_FREQ_OPTIONS.length); break;
        case 'tagWinRule': settings.tagWinRule = cycle(settings.tagWinRule, TAG_WIN_RULE_OPTIONS.length); break;
        case 'tagDuration': settings.tagDuration = cycle(settings.tagDuration, TAG_DURATION_OPTIONS.length); break;
        case 'knockback': settings.knockback = cycle(settings.knockback, KNOCKBACK_OPTIONS.length); break;
        case 'lavaLives': settings.lavaLives = cycle(settings.lavaLives, LAVA_LIVES_OPTIONS.length); break;
    }
}

// Get available maps for current game mode
function getAvailableMaps() {
    if (settings.gameMode === 2) {
        // King of the Hill: only the Summit map
        return [KOTH_MAP_KEY];
    }
    if (settings.gameMode === 4) {
        return ['lava_procedural'];
    }
    // All other modes: the 4 standard maps
    return MAP_KEYS.filter(k => k !== KOTH_MAP_KEY && k !== 'lava_procedural');
}

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
let settingsScroll = 0;   // scroll offset for gameplay settings
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
    p1: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0, deaths: 0 },
    p2: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0, deaths: 0 },
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
            const avMaps = getAvailableMaps();
            const mapIdx = Math.min(settings.map, avMaps.length - 1);
            if (settings.gameMode !== 4) {
                platforms = MAPS[avMaps[mapIdx]].platforms;
            }
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
                settingsScroll = 0;
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
                const avMaps = getAvailableMaps();
                if (settingsCursor === 0) settings.map = (settings.map - 1 + avMaps.length) % avMaps.length;
                if (settingsCursor === 1) { settings.bg = (settings.bg - 1 + BG_THEMES.length) % BG_THEMES.length; prerenderBackground(); }
                if (settingsCursor === 2) settings.sound = (settings.sound - 1 + SOUND_OPTIONS.length) % SOUND_OPTIONS.length;
                if (settingsCursor === 3) settings.lang = (settings.lang - 1 + LANG_OPTIONS.length) % LANG_OPTIONS.length;
                if (settingsCursor === 4) { settings.p1Skin = (settings.p1Skin - 1 + SKIN_OPTIONS.length) % SKIN_OPTIONS.length; updateSkins(); }
                if (settingsCursor === 5) { settings.p2Skin = (settings.p2Skin - 1 + SKIN_OPTIONS.length) % SKIN_OPTIONS.length; updateSkins(); }
                saveSettings();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                const avMaps = getAvailableMaps();
                if (settingsCursor === 0) settings.map = (settings.map + 1) % avMaps.length;
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
            // Gameplay settings - dynamic based on game mode
            const gpItems = getGameplaySettingsItems();
            const gpCount = gpItems.length;
            // Clamp cursor to valid range (items can change when gameMode changes)
            if (settingsCursor >= gpCount) { settingsCursor = gpCount - 1; settingsScroll = Math.max(0, gpCount - Math.floor((460 - 78) / 48)); }
            const maxVis = Math.floor((460 - 78) / 48); // must match drawSettingsOptions
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                settingsCursor = (settingsCursor - 1 + gpCount) % gpCount;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                settingsCursor = (settingsCursor + 1) % gpCount;
            }
            // Auto-scroll to keep cursor visible
            if (settingsCursor < settingsScroll) settingsScroll = settingsCursor;
            if (settingsCursor >= settingsScroll + maxVis) settingsScroll = settingsCursor - maxVis + 1;
            // Wrap-around: cursor jumps from last to first or vice versa
            if (settingsCursor === 0 && settingsScroll > 0) settingsScroll = 0;
            if (settingsCursor === gpCount - 1) settingsScroll = Math.max(0, gpCount - maxVis);

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                const item = gpItems[settingsCursor];
                if (item) {
                    handleGameplaySettingChange(item.key, -1);
                    // Reset scroll when game mode changes (item list changes)
                    if (item.key === 'gameMode') { settingsCursor = 0; settingsScroll = 0; }
                }
                saveSettings();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                const item = gpItems[settingsCursor];
                if (item) {
                    handleGameplaySettingChange(item.key, 1);
                    if (item.key === 'gameMode') { settingsCursor = 0; settingsScroll = 0; }
                }
                saveSettings();
            }
            if (e.code === 'KeyH') { showHowToPlay = true; }
            if (e.code === 'Escape') {
                settingsCategory = -1;
                settingsCursor = 1;
                settingsScroll = 0;
            }
        }
        // Start game from any settings sub-screen with F key
        if (!showHowToPlay && e.code === 'KeyF') {
            gameMode = settings.mode === 0 ? 'pvp' : 'pve';
            const avMaps = getAvailableMaps();
            const mapIdx = Math.min(settings.map, avMaps.length - 1);
            if (settings.gameMode !== 4) {
                platforms = MAPS[avMaps[mapIdx]].platforms;
            }
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
            // Match over, back to menu
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
    lava_procedural: {
        name: 'Lava Rise',
        platforms: [], // not used, platforms are generated procedurally
    },
    koth_summit: {
        name: 'Summit',
        platforms: [
            { x: 0, y: 470, w: 800, h: 30, isGround: true },
            // Left side ascent
            { x: 20, y: 390, w: 120, h: 16 },
            { x: 160, y: 320, w: 100, h: 16 },
            { x: 40, y: 250, w: 90, h: 16 },
            // Right side ascent
            { x: 660, y: 390, w: 120, h: 16 },
            { x: 540, y: 320, w: 100, h: 16 },
            { x: 670, y: 250, w: 90, h: 16 },
            // Center hill / summit
            { x: 280, y: 280, w: 240, h: 16 },
            { x: 320, y: 180, w: 160, h: 16, isHill: true },  // THE HILL (capture zone)
            // Side platforms for flanking
            { x: 80, y: 160, w: 80, h: 16 },
            { x: 640, y: 160, w: 80, h: 16 },
        ],
    },
};
const MAP_KEYS = Object.keys(MAPS);
const KOTH_MAP_KEY = 'koth_summit';
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
        this.knockbackVx = 0; // horizontal knockback velocity (decays over time)
    }

    update() {
        const wasMoving = this.vx !== 0;
        this.vx = 0;

        // AI in Lava Rise gets a small speed boost
        const isLavaAI = settings.gameMode === 4 && gameMode === 'pve' && this === player2;
        const speed = isLavaAI ? PLAYER_SPEED * 1.2 : PLAYER_SPEED;

        if (keys[this.controls.left]) {
            this.vx = -speed;
            this.facing = -1;
        }
        if (keys[this.controls.right]) {
            this.vx = speed;
            this.facing = 1;
        }

        // Apply knockback (decays with friction)
        this.vx += this.knockbackVx;
        this.knockbackVx *= 0.85; // friction decay
        if (Math.abs(this.knockbackVx) < 0.2) this.knockbackVx = 0;

        if (keys[this.controls.jump] && this.onGround) {
            // Scale jump force with gravity so jump height stays proportional
            const gravScale = GRAVITY_OPTIONS[settings.gravity].value / 0.6;
            // AI in Lava Rise jumps slightly higher
            const jumpMult = isLavaAI ? 1.12 : 1;
            this.vy = JUMP_FORCE * Math.sqrt(gravScale) * jumpMult;
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

        if (settings.gameMode !== 4) {
            if (this.y > canvas.height) {
                this.y = 0;
                this.vy = 0;
            }
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

            // In lava mode, also cull bullets far from camera view
            if (settings.gameMode === 4) {
                const screenY = b.y + lavaState.cameraY;
                if (screenY < -50 || screenY > 550) {
                    this.bullets.splice(i, 1);
                    continue;
                }
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

        // --- Lava Rise: special AI behavior ---
        if (settings.gameMode === 4) {
            this._updateLava(aiPlayer, humanPlayer);
            this._applyInputs(aiPlayer);
            return;
        }

        // --- King of the Hill: special AI behavior ---
        if (settings.gameMode === 2) {
            this._updateKOTH(aiPlayer, humanPlayer);
            this._applyInputs(aiPlayer);
            return;
        }

        // --- Tag mode: special AI behavior ---
        if (settings.gameMode === 3) {
            this._updateTag(aiPlayer, humanPlayer);
            this._applyInputs(aiPlayer);
            return;
        }

        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;

        // --- Decide target: ammo (if needed) > power-up > human ---
        let targetX, targetY;
        let chasingPowerup = false;

        // Prioritize ammo pickups when low on ammo
        let closestAmmo = null;
        let closestAmmoDist = Infinity;
        if (settings.infiniteAmmo === 1 && aiPlayer.ammo <= 2) {
            for (const ap of ammoPickups) {
                if (ap.y < 200) continue; // ignore ammo on highest platforms
                const d = Math.hypot(ap.x + ap.w / 2 - aiCX, ap.y + ap.h / 2 - aiCY);
                if (d < closestAmmoDist) { closestAmmoDist = d; closestAmmo = ap; }
            }
        }

        let closestPU = null;
        let closestDist = Infinity;
        for (const pu of powerups) {
            // Ignore power-ups on the highest platforms (y <= 200)
            if (pu.y < 200) continue;
            const d = Math.hypot(pu.x + pu.w / 2 - aiCX, pu.y + pu.h / 2 - aiCY);
            if (d < closestDist) { closestDist = d; closestPU = pu; }
        }

        // When out of ammo, prioritize ammo pickups over everything
        if (closestAmmo && (aiPlayer.ammo <= 0 || !closestPU)) {
            targetX = closestAmmo.x + closestAmmo.w / 2;
            targetY = closestAmmo.y + closestAmmo.h / 2;
            chasingPowerup = true;
        } else if (closestPU) {
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

    // Tag AI: flee when not tagger, chase when tagger
    _updateTag(aiPlayer, humanPlayer) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;
        const dx = humanCX - aiCX;
        const dy = humanCY - aiCY;
        const dist = Math.hypot(dx, dy);

        const isTagger = tagState.tagger === aiPlayer;

        // --- Seek ammo pickups when low on ammo ---
        if (settings.infiniteAmmo === 1 && aiPlayer.ammo <= 0 && ammoPickups.length > 0) {
            let closestAmmo = null;
            let closestAmmoDist = Infinity;
            for (const ap of ammoPickups) {
                if (ap.y < 200) continue; // ignore ammo on highest platforms
                const d = Math.hypot(ap.x + ap.w / 2 - aiCX, ap.y + ap.h / 2 - aiCY);
                if (d < closestAmmoDist) { closestAmmoDist = d; closestAmmo = ap; }
            }
            if (closestAmmo) {
                const ammoX = closestAmmo.x + closestAmmo.w / 2;
                const ammoY = closestAmmo.y + closestAmmo.h / 2;
                const needsMultiClimb = ammoY < aiFeetY - this.JUMP_REACH;
                const curPlat = this._getPlatformOf(aiPlayer);
                const targetPlat = this._findPlatformAt(ammoX, ammoY);
                const needsEdgeJump = !needsMultiClimb && curPlat && targetPlat &&
                    curPlat !== targetPlat && ammoY < aiCY - 30;

                if (needsMultiClimb || needsEdgeJump) {
                    const targetKey = 'ammo_' + Math.round(ammoX / 40) + ',' + Math.round(ammoY / 40);
                    if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                        this.path = needsMultiClimb ? this._buildPath(aiFeetY, ammoX, ammoY) : [];
                        this.pathStep = 0;
                        this.pathTarget = targetKey;
                        this.stuckTimer = 0;
                    }
                    const oldStep = this.pathStep;
                    if (this.pathStep < this.path.length) {
                        if (curPlat === this.path[this.pathStep]) { this.pathStep++; this.stuckTimer = 0; }
                    }
                    if (oldStep === this.pathStep) this.stuckTimer++;
                    if (this.stuckTimer > this.STUCK_LIMIT) {
                        this.path = []; this.pathStep = 0; this.stuckTimer = 0;
                        this.giveUpCooldown = 30;
                    } else if (needsEdgeJump && this.path.length === 0 && targetPlat) {
                        this._climbTo(aiPlayer, targetPlat, ammoX);
                    } else if (this.pathStep < this.path.length) {
                        this._climbTo(aiPlayer, this.path[this.pathStep], ammoX);
                    } else {
                        this._walkTo(aiPlayer, ammoX, ammoY);
                    }
                } else {
                    this._walkTo(aiPlayer, ammoX, ammoY);
                }
                if (this.giveUpCooldown > 0) this.giveUpCooldown--;
                this._dodgeBullets(aiPlayer, humanPlayer);
                return; // prioritize ammo over tag behavior
            }
        }

        if (isTagger) {
            // AI IS THE TAGGER: chase the human aggressively
            aiPlayer.facing = dx > 0 ? 1 : -1;

            // Shoot to switch tagger via bullet
            if (Math.abs(dy) < 60 && Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }

            // Chase: walk toward human
            if (Math.abs(dx) > 15) {
                if (dx > 0) this.wantsRight = true;
                else this.wantsLeft = true;
            }

            // If human is above, climb toward them (reuse standard pathfinding)
            if (humanCY < aiCY - 50) {
                const targetKey = 'tag_chase_' + Math.round(humanCX / 40) + ',' + Math.round(humanCY / 40);
                const needsMultiClimb = humanCY < aiFeetY - this.JUMP_REACH;
                const curPlat = this._getPlatformOf(aiPlayer);
                const targetPlat = this._findPlatformAt(humanCX, humanCY);
                const needsEdgeJump = !needsMultiClimb && curPlat && targetPlat &&
                    curPlat !== targetPlat && humanCY < aiCY - 30;

                if ((needsMultiClimb || needsEdgeJump) && this.giveUpCooldown <= 0) {
                    if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                        this.path = needsMultiClimb ? this._buildPath(aiFeetY, humanCX, humanCY) : [];
                        this.pathStep = 0;
                        this.pathTarget = targetKey;
                        this.stuckTimer = 0;
                    }
                    const oldStep = this.pathStep;
                    if (this.pathStep < this.path.length) {
                        if (curPlat === this.path[this.pathStep]) { this.pathStep++; this.stuckTimer = 0; }
                    }
                    if (oldStep === this.pathStep) this.stuckTimer++;

                    if (this.stuckTimer > this.STUCK_LIMIT) {
                        this.path = []; this.pathStep = 0; this.stuckTimer = 0;
                        this.giveUpCooldown = 60;
                    } else if (needsEdgeJump && this.path.length === 0 && targetPlat) {
                        this._climbTo(aiPlayer, targetPlat, humanCX);
                    } else if (this.pathStep < this.path.length) {
                        this._climbTo(aiPlayer, this.path[this.pathStep], humanCX);
                    } else {
                        this._walkTo(aiPlayer, humanCX, humanCY);
                    }
                } else if (this.giveUpCooldown <= 0) {
                    this._walkTo(aiPlayer, humanCX, humanCY);
                }
            }

            // If human is below, drop down
            if (settings.dropThrough === 0 && humanCY > aiFeetY + 50 && aiPlayer.onGround) {
                for (const p of platforms) {
                    if (p.isGround) continue;
                    if (aiPlayer.x + aiPlayer.w > p.x && aiPlayer.x < p.x + p.w && Math.abs(aiFeetY - p.y) < 3) {
                        this.wantsDown = true;
                        break;
                    }
                }
            }
        } else {
            // AI IS NOT THE TAGGER: flee and evade!
            aiPlayer.facing = dx > 0 ? 1 : -1;

            // Shoot at human to switch tagger onto them
            if (Math.abs(dy) < 60 && Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }

            // FLEE: run away from human
            if (dist < 200) {
                // Close: run in opposite direction
                if (dx > 0) this.wantsLeft = true;
                else this.wantsRight = true;

                // Jump to evade if very close
                if (dist < 100 && aiPlayer.onGround) {
                    this.wantsJump = true;
                }
            } else if (dist < 350) {
                // Medium distance: try to get to a different vertical level
                const curPlat = this._getPlatformOf(aiPlayer);
                const humanPlat = this._findPlatformAt(humanCX, humanCY + 20);
                const samePlatform = curPlat && humanPlat && curPlat === humanPlat;
                const sameLevel = Math.abs(aiCY - humanCY) < 40;

                if (samePlatform || sameLevel) {
                    // Same platform/level: jump to a different one
                    // Find nearest platform that is NOT the human's platform
                    let bestPlat = null;
                    let bestDist = Infinity;
                    for (const p of platforms) {
                        if (p.isGround || p === curPlat) continue;
                        const pCX = p.x + p.w / 2;
                        const pCY = p.y;
                        const dFromHuman = Math.hypot(pCX - humanCX, pCY - humanCY);
                        const dFromAI = Math.hypot(pCX - aiCX, pCY - aiCY);
                        // Prefer platforms far from human but reachable by AI
                        if (dFromAI < 200 && dFromHuman > 150) {
                            const score = dFromAI - dFromHuman * 0.5;
                            if (score < bestDist) { bestDist = score; bestPlat = p; }
                        }
                    }

                    if (bestPlat) {
                        const platCX = bestPlat.x + bestPlat.w / 2;
                        if (bestPlat.y < aiCY) {
                            // Platform is above: climb to it
                            this._climbTo(aiPlayer, bestPlat, platCX);
                        } else if (settings.dropThrough === 0 && bestPlat.y > aiFeetY) {
                            // Platform is below: drop through
                            this.wantsDown = true;
                        }
                    } else {
                        // No good platform found: just run away
                        if (dx > 0) this.wantsLeft = true;
                        else this.wantsRight = true;
                    }
                } else {
                    // Different level: stay and maintain distance
                    if (Math.random() < 0.05) {
                        if (Math.random() < 0.5) this.wantsLeft = true;
                        else this.wantsRight = true;
                    }
                }
            }

            // Near canvas edges: don't get cornered
            if (aiCX < 60) this.wantsRight = true;
            if (aiCX > canvas.width - 60) this.wantsLeft = true;
        }

        if (this.giveUpCooldown > 0) this.giveUpCooldown--;

        // Always dodge bullets
        this._dodgeBullets(aiPlayer, humanPlayer);
    },

    // KOTH AI: climb to the hill and hold it, shoot enemies off
    _updateKOTH(aiPlayer, humanPlayer) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;

        // Find the hill platform
        const hillPlat = platforms.find(p => p.isHill);
        if (!hillPlat) return;

        const hillCX = hillPlat.x + hillPlat.w / 2;
        const hillCY = hillPlat.y;

        // --- Seek ammo pickups when out of ammo ---
        if (settings.infiniteAmmo === 1 && aiPlayer.ammo <= 0 && ammoPickups.length > 0) {
            let closestAmmo = null;
            let closestAmmoDist = Infinity;
            for (const ap of ammoPickups) {
                if (ap.y < 200) continue; // ignore ammo on highest platforms
                const d = Math.hypot(ap.x + ap.w / 2 - aiCX, ap.y + ap.h / 2 - aiCY);
                if (d < closestAmmoDist) { closestAmmoDist = d; closestAmmo = ap; }
            }
            if (closestAmmo) {
                const ammoX = closestAmmo.x + closestAmmo.w / 2;
                const ammoY = closestAmmo.y + closestAmmo.h / 2;
                const needsMultiClimb = ammoY < aiFeetY - this.JUMP_REACH;
                const curPlat = this._getPlatformOf(aiPlayer);
                const targetPlat = this._findPlatformAt(ammoX, ammoY);
                const needsEdgeJump = !needsMultiClimb && curPlat && targetPlat &&
                    curPlat !== targetPlat && ammoY < aiCY - 30;

                if (needsMultiClimb || needsEdgeJump) {
                    const targetKey = 'ammo_' + Math.round(ammoX / 40) + ',' + Math.round(ammoY / 40);
                    if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                        this.path = needsMultiClimb ? this._buildPath(aiFeetY, ammoX, ammoY) : [];
                        this.pathStep = 0;
                        this.pathTarget = targetKey;
                        this.stuckTimer = 0;
                    }
                    const oldStep = this.pathStep;
                    if (this.pathStep < this.path.length) {
                        if (curPlat === this.path[this.pathStep]) { this.pathStep++; this.stuckTimer = 0; }
                    }
                    if (oldStep === this.pathStep) this.stuckTimer++;
                    if (this.stuckTimer > this.STUCK_LIMIT) {
                        this.path = []; this.pathStep = 0; this.stuckTimer = 0;
                        this.giveUpCooldown = 30;
                    } else if (needsEdgeJump && this.path.length === 0 && targetPlat) {
                        this._climbTo(aiPlayer, targetPlat, ammoX);
                    } else if (this.pathStep < this.path.length) {
                        this._climbTo(aiPlayer, this.path[this.pathStep], ammoX);
                    } else {
                        this._walkTo(aiPlayer, ammoX, ammoY);
                    }
                } else {
                    this._walkTo(aiPlayer, ammoX, ammoY);
                }
                // Still shoot if aligned while going for ammo
                if (Math.abs(humanCY - aiCY) < 60) {
                    aiPlayer.facing = humanCX > aiCX ? 1 : -1;
                }
                if (this.giveUpCooldown > 0) this.giveUpCooldown--;
                this._dodgeBullets(aiPlayer, humanPlayer);
                return; // prioritize ammo over hill
            }
        }

        // Check if AI is on the hill
        const onHill = kothState.currentHolder === aiPlayer;

        if (onHill) {
            // ON THE HILL: stay centered, shoot at enemy
            const dx = hillCX - aiCX;
            if (Math.abs(dx) > 20) {
                if (dx > 0) this.wantsRight = true;
                else this.wantsLeft = true;
            }

            // Always face and shoot at enemy
            aiPlayer.facing = humanCX > aiCX ? 1 : -1;
            if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }
        } else {
            // NOT ON HILL: pathfind to the hill platform
            const targetX = hillCX;
            const targetY = hillCY;
            const needsMultiClimb = targetY < aiFeetY - this.JUMP_REACH;

            // Decrement give-up cooldown
            if (this.giveUpCooldown > 0) this.giveUpCooldown--;

            const curPlat = this._getPlatformOf(aiPlayer);
            const targetPlat = hillPlat;
            const needsEdgeJump = !needsMultiClimb && curPlat && curPlat !== targetPlat && targetY < aiCY - 30;

            if ((needsMultiClimb || needsEdgeJump) && this.giveUpCooldown <= 0) {
                const targetKey = 'hill';
                if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                    this.path = needsMultiClimb ? this._buildPath(aiFeetY, targetX, targetY) : [];
                    this.pathStep = 0;
                    this.pathTarget = targetKey;
                    this.stuckTimer = 0;
                }

                const oldStep = this.pathStep;
                if (this.pathStep < this.path.length) {
                    if (curPlat === this.path[this.pathStep]) {
                        this.pathStep++;
                        this.stuckTimer = 0;
                    }
                }
                if (oldStep === this.pathStep) this.stuckTimer++;

                if (this.stuckTimer > this.STUCK_LIMIT) {
                    this.path = [];
                    this.pathStep = 0;
                    this.stuckTimer = 0;
                    this.giveUpCooldown = 60; // shorter cooldown, keep trying
                } else if (needsEdgeJump && this.path.length === 0) {
                    this._climbTo(aiPlayer, targetPlat, targetX);
                } else if (this.pathStep < this.path.length) {
                    this._climbTo(aiPlayer, this.path[this.pathStep], targetX);
                } else {
                    this._walkTo(aiPlayer, targetX, targetY);
                }
            } else {
                this.path = [];
                this.pathStep = 0;
                this._walkTo(aiPlayer, targetX, targetY);
            }

            // Shoot at enemy if roughly aligned while climbing
            if (Math.abs(humanCY - aiCY) < 60) {
                aiPlayer.facing = humanCX > aiCX ? 1 : -1;
                if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy * 0.5) {
                    this.wantsShoot = true;
                }
            }
        }

        // Dodge bullets even in KOTH
        this._dodgeBullets(aiPlayer, humanPlayer);
    },

    // Lava Rise AI: climb upward, fight when safe, stay on screen
    _updateLava(aiPlayer, humanPlayer) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;

        // --- Screen boundaries (world coords) ---
        const screenTop = -lavaState.cameraY;         // world Y of screen top
        const screenBottom = 500 - lavaState.cameraY;  // world Y of screen bottom
        const tooHighUp = aiCY < screenTop + 40;       // AI near top edge of screen

        // --- Lava danger assessment ---
        const lavaDistance = lavaState.lavaY - aiFeetY;
        const criticalZone = lavaDistance < 70;
        const dangerZone = lavaDistance < 140;
        const safeZone = lavaDistance > 250;

        if (this.giveUpCooldown > 0) this.giveUpCooldown--;

        // --- While in the air: just steer toward current target, don't pick new ones ---
        if (!aiPlayer.onGround) {
            // Mid-air: only steer toward platform we're already jumping to
            // (_climbTo handles mid-air steering via wantsLeft/wantsRight)
            // Just shoot opportunistically while airborne
            this._opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            return;
        }

        // --- ON GROUND: find climb target and make decisions ---
        let climbTarget = this._findBestClimbTarget(aiPlayer, aiFeetY, screenTop);

        // --- PRIORITY 1: Don't go off-screen at the top ---
        if (tooHighUp) {
            // Stay put, don't climb further. Just fight.
            this._opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            this._dodgeBullets(aiPlayer, humanPlayer);
            return;
        }

        // --- PRIORITY 2: Critical lava danger → climb NOW ---
        if (criticalZone) {
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, true);
            } else {
                // Panic jump
                this.wantsJump = true;
                if (aiCX < 400) this.wantsRight = true;
                else this.wantsLeft = true;
            }
            this._dodgeBullets(aiPlayer, humanPlayer);
            return;
        }

        // --- PRIORITY 3: Danger zone → climb urgently, shoot if easy ---
        if (dangerZone) {
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, true);
            }
            // Quick shot only if perfectly aligned
            if (Math.abs(humanCY - aiCY) < 40) {
                aiPlayer.facing = humanCX > aiCX ? 1 : -1;
                if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy * 0.4) {
                    this.wantsShoot = true;
                }
            }
            this._dodgeBullets(aiPlayer, humanPlayer);
            return;
        }

        // --- PRIORITY 4: Safe → climb + actively fight ---
        // Always keep climbing as the base action
        if (climbTarget) {
            this._navigateToPlat(aiPlayer, climbTarget, false);
        }

        // Layer on combat: shoot at human when aligned
        if (safeZone) {
            // Very safe: full combat mode alongside climbing
            const humanDist = Math.hypot(humanCX - aiCX, humanCY - aiCY);
            const humanOnSameLevel = Math.abs(humanCY - aiCY) < 60;

            if (humanOnSameLevel && humanDist < 300) {
                aiPlayer.facing = (humanCX > aiCX) ? 1 : -1;
                if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                    this.wantsShoot = true;
                }
            } else {
                this._opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            }
        } else {
            this._opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
        }

        this._dodgeBullets(aiPlayer, humanPlayer);
    },

    // Find the closest reachable platform above AI in lava mode
    // Only considers platforms within a single jump reach
    _findBestClimbTarget(aiPlayer, aiFeetY, screenTop) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const jumpReach = this.JUMP_REACH;
        const candidates = [];
        for (const p of platforms) {
            if (p.y >= aiFeetY - 10) continue;           // skip at or below feet
            if (p.y < aiFeetY - jumpReach) continue;      // skip beyond single jump reach
            if (p.y > lavaState.lavaY - 30) continue;     // skip near lava
            if (p.y < screenTop + 20) continue;            // skip above screen top
            candidates.push(p);
        }
        if (candidates.length === 0) return null;

        // Pick the nearest platform: closest combined vertical + horizontal distance
        let best = null;
        let bestScore = -Infinity;
        for (const p of candidates) {
            const vertDist = aiFeetY - p.y; // how far above (positive)
            const horizDist = Math.abs(p.x + p.w / 2 - aiCX);

            // Prefer: close horizontally, reasonable height, wide platforms
            let score = 0;
            score -= horizDist * 1.5;         // strongly prefer close horizontal
            score += vertDist * 0.5;          // slight preference for higher
            score += p.w * 0.3;              // wider = easier to land on
            if (vertDist < 30) score -= 100; // too close below, not worth it

            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }
        return best;
    },

    // Navigate to a platform using pathfinding (lava mode helper)
    _navigateToPlat(aiPlayer, targetPlat, urgent) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const targetX = targetPlat.x + targetPlat.w / 2;
        const targetY = targetPlat.y;
        const curPlat = this._getPlatformOf(aiPlayer);

        // Check if already on this platform
        if (curPlat === targetPlat) return;

        const needsMultiClimb = targetY < aiFeetY - this.JUMP_REACH;
        const needsEdgeJump = !needsMultiClimb && curPlat && targetPlat &&
            curPlat !== targetPlat && targetY < aiCY - 30;

        if ((needsMultiClimb || needsEdgeJump) && this.giveUpCooldown <= 0) {
            const targetKey = 'lava_' + Math.round(targetX / 40) + ',' + Math.round(targetY / 40);
            if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                this.path = needsMultiClimb ? this._buildPath(aiFeetY, targetX, targetY) : [];
                this.pathStep = 0;
                this.pathTarget = targetKey;
                this.stuckTimer = 0;
            }

            const oldStep = this.pathStep;
            if (this.pathStep < this.path.length) {
                if (curPlat === this.path[this.pathStep]) {
                    this.pathStep++;
                    this.stuckTimer = 0;
                }
            }
            if (oldStep === this.pathStep) this.stuckTimer++;

            const stuckLimit = urgent ? 25 : this.STUCK_LIMIT; // shorter patience when urgent
            if (this.stuckTimer > stuckLimit) {
                this.path = [];
                this.pathStep = 0;
                this.stuckTimer = 0;
                this.giveUpCooldown = urgent ? 10 : 30;
                // If urgent and stuck, try jumping toward any higher platform
                if (urgent && aiPlayer.onGround) {
                    this.wantsJump = true;
                    if (targetX > aiCX) this.wantsRight = true;
                    else this.wantsLeft = true;
                }
            } else if (needsEdgeJump && this.path.length === 0 && targetPlat) {
                this._climbTo(aiPlayer, targetPlat, targetX);
            } else if (this.pathStep < this.path.length) {
                this._climbTo(aiPlayer, this.path[this.pathStep], targetX);
            } else {
                this._walkTo(aiPlayer, targetX, targetY);
            }
        } else if (this.giveUpCooldown <= 0) {
            this._walkTo(aiPlayer, targetX, targetY);
            // If on ground and target is above, try jumping
            if (aiPlayer.onGround && targetY < aiCY - 30) {
                if (Math.abs(aiCX - targetX) < 100) {
                    this.wantsJump = true;
                }
            }
        }
    },

    // Shoot at human when it doesn't interfere with movement
    _opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY) {
        const dy = Math.abs(humanCY - aiCY);
        const dx = humanCX - aiCX;
        // Only shoot if roughly on same horizontal plane
        if (dy < 50) {
            aiPlayer.facing = dx > 0 ? 1 : -1;
            if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }
        }
        // Also shoot downward at human if they're below and close horizontally
        else if (humanCY > aiCY && dy < 100 && Math.abs(dx) < 60) {
            aiPlayer.facing = dx > 0 ? 1 : -1;
            if (Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy * 0.3) {
                this.wantsShoot = true;
            }
        }
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
    let types = Object.keys(POWERUP_TYPES);
    // One Shot mode: no heal powerups
    if (settings.gameMode === 1) types = types.filter(t => t !== 'heal');
    if (types.length === 0) return;
    const type = types[Math.floor(Math.random() * types.length)];
    // Pick a random platform (not ground, not below lava)
    const plats = platforms.filter(p => !p.isGround && (settings.gameMode !== 4 || p.y < lavaState.lavaY - 30));
    if (plats.length === 0) return;
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
    const plats = platforms.filter(p => !p.isGround && (settings.gameMode !== 4 || p.y < lavaState.lavaY - 30));
    if (plats.length === 0) return;
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
            // Apply knockback
            const kb1 = KNOCKBACK_OPTIONS[settings.knockback].force;
            if (kb1 > 0) {
                player2.knockbackVx += (b.vx > 0 ? 1 : -1) * kb1;
                player2.vy -= kb1 * 0.5;
            }
            stats.p1.hits++;
            stats.p1.damageDone += p1Damage;
            spawnParticles(b.x, b.y, player2.color, 10);
            spawnParticles(b.x, b.y, '#ff8888', 5);
            player1.bullets.splice(i, 1);
            // Tag mode: bullet hit switches tagger
            if (settings.gameMode === 3 && tagState.tagger === player1 && Date.now() - (tagState.lastSwitch || 0) > 500) {
                tagState.tagger = player2;
                tagState.lastSwitch = Date.now();
            }
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
            // Apply knockback
            const kb2 = KNOCKBACK_OPTIONS[settings.knockback].force;
            if (kb2 > 0) {
                player1.knockbackVx += (b.vx > 0 ? 1 : -1) * kb2;
                player1.vy -= kb2 * 0.5;
            }
            stats.p2.hits++;
            stats.p2.damageDone += p2Damage;
            spawnParticles(b.x, b.y, player1.color, 10);
            spawnParticles(b.x, b.y, '#88ffee', 5);
            player2.bullets.splice(i, 1);
            // Tag mode: bullet hit switches tagger
            if (settings.gameMode === 3 && tagState.tagger === player2 && Date.now() - (tagState.lastSwitch || 0) > 500) {
                tagState.tagger = player1;
                tagState.lastSwitch = Date.now();
            }
        }
    }
}

function checkWin() {
    const gm = settings.gameMode;

    // Classic (0) and One Shot (1): HP-based win
    if (gm === 0 || gm === 1) {
        const p1Dead = player1.hp <= 0;
        const p2Dead = player2.hp <= 0;
        if (p1Dead && p2Dead) {
            // Both die simultaneously: whoever has more HP remaining wins (or P2 if truly tied)
            gameState = 'dying';
            if (player1.hp > player2.hp) {
                winner = player1; loser = player2; roundWins.p1++;
            } else {
                winner = player2; loser = player1; roundWins.p2++;
            }
            deathTimer = DEATH_DURATION;
        } else if (p1Dead) {
            gameState = 'dying';
            winner = player2;
            loser = player1;
            deathTimer = DEATH_DURATION;
            roundWins.p2++;
        } else if (p2Dead) {
            gameState = 'dying';
            winner = player1;
            loser = player2;
            deathTimer = DEATH_DURATION;
            roundWins.p1++;
        }
    }

    // King of the Hill (2): score-based win
    if (gm === 2) {
        if (kothState.p1Score >= kothState.scoreToWin) {
            gameState = 'gameover';
            winner = player1;
            loser = player2;
            roundWins.p1++;
        } else if (kothState.p2Score >= kothState.scoreToWin) {
            gameState = 'gameover';
            winner = player2;
            loser = player1;
            roundWins.p2++;
        }
        // Also check HP death (respawn in KOTH instead of game over)
        if (player1.hp <= 0) {
            stats.p1.deaths++;
            player1.hp = HP_OPTIONS[settings.hp];
            player1.x = 100;
            player1.y = 400;
            player1.vx = 0;
            player1.vy = 0;
            player1.knockbackVx = 0;
            spawnParticles(player1.x + 16, player1.y + 20, player1.color, 15);
        }
        if (player2.hp <= 0) {
            stats.p2.deaths++;
            player2.hp = HP_OPTIONS[settings.hp];
            player2.x = 650;
            player2.y = 400;
            player2.vx = 0;
            player2.vy = 0;
            player2.knockbackVx = 0;
            spawnParticles(player2.x + 16, player2.y + 20, player2.color, 15);
            // Reset AI pathfinding so it replans from new position
            if (gameMode === 'pve') {
                AI.path = [];
                AI.pathStep = 0;
                AI.pathTarget = null;
                AI.stuckTimer = 0;
                AI.giveUpCooldown = 10; // small delay before replanning
            }
        }
    }

    // Tag (3): time-based win
    if (gm === 3) {
        const now = Date.now();
        // Update tagger time
        if (tagState.tagger === player1) {
            tagState.p1Time += now - tagState.lastTagSwitch;
        } else {
            tagState.p2Time += now - tagState.lastTagSwitch;
        }
        tagState.lastTagSwitch = now;

        // Check tag (players touching each other) - with debounce
        const touching = player1.x + player1.w > player2.x &&
                         player1.x < player2.x + player2.w &&
                         player1.y + player1.h > player2.y &&
                         player1.y < player2.y + player2.h;
        if (touching && now - (tagState.lastSwitch || 0) > 500) {
            // Switch tagger (500ms cooldown to prevent rapid switching)
            tagState.tagger = tagState.tagger === player1 ? player2 : player1;
            tagState.lastSwitch = now;
        }

        // Check time up
        if (now >= tagState.roundEndTime) {
            if (settings.tagWinRule === 0) {
                // "Not It" wins: whoever is NOT the tagger wins
                winner = tagState.tagger === player1 ? player2 : player1;
                loser = tagState.tagger;
            } else {
                // "Least Time" wins
                winner = tagState.p1Time <= tagState.p2Time ? player1 : player2;
                loser = winner === player1 ? player2 : player1;
            }
            roundWins[winner === player1 ? 'p1' : 'p2']++;
            gameState = 'gameover';
        }

        // Respawn on death in tag mode
        if (player1.hp <= 0) {
            stats.p1.deaths++;
            player1.hp = HP_OPTIONS[settings.hp];
            player1.x = 100;
            player1.y = 400;
            player1.vx = 0;
            player1.vy = 0;
            player1.knockbackVx = 0;
        }
        if (player2.hp <= 0) {
            stats.p2.deaths++;
            player2.hp = HP_OPTIONS[settings.hp];
            player2.x = 650;
            player2.y = 400;
            player2.vx = 0;
            player2.vy = 0;
            player2.knockbackVx = 0;
            // Reset AI pathfinding so it replans from new position
            if (gameMode === 'pve') {
                AI.path = [];
                AI.pathStep = 0;
                AI.pathTarget = null;
                AI.stuckTimer = 0;
                AI.giveUpCooldown = 10;
            }
        }
    }

    // Lava Rise (4): lives-based
    if (gm === 4) {
        const p1Dead = lavaState.p1Lives <= 0;
        const p2Dead = lavaState.p2Lives <= 0;
        if (p1Dead && p2Dead) {
            // Both out of lives simultaneously: whoever had fewer deaths wins
            if (stats.p1.deaths < stats.p2.deaths) {
                winner = player1; loser = player2; roundWins.p1++;
            } else {
                winner = player2; loser = player1; roundWins.p2++;
            }
            gameState = 'dying';
            deathTimer = DEATH_DURATION;
        } else if (p1Dead) {
            gameState = 'dying';
            winner = player2; loser = player1;
            deathTimer = DEATH_DURATION;
            roundWins.p2++;
        } else if (p2Dead) {
            gameState = 'dying';
            winner = player1; loser = player2;
            deathTimer = DEATH_DURATION;
            roundWins.p1++;
        }
    }
}

// --- King of the Hill Update ---
function updateKOTH() {
    if (settings.gameMode !== 2 || !kothState.hillZone) return;
    const hz = kothState.hillZone;

    // Check who is on the hill
    const p1OnHill = player1.x + player1.w > hz.x && player1.x < hz.x + hz.w &&
                     player1.y + player1.h > hz.y && player1.y < hz.y + hz.h;
    const p2OnHill = player2.x + player2.w > hz.x && player2.x < hz.x + hz.w &&
                     player2.y + player2.h > hz.y && player2.y < hz.y + hz.h;

    if (p1OnHill && !p2OnHill) {
        kothState.currentHolder = player1;
        kothState.p1Score += 1 / 60; // ~1 point per second at 60fps
    } else if (p2OnHill && !p1OnHill) {
        kothState.currentHolder = player2;
        kothState.p2Score += 1 / 60;
    } else {
        kothState.currentHolder = null; // contested or empty
    }
}

// --- Draw KOTH HUD ---
function drawKOTHHud() {
    if (settings.gameMode !== 2 || !kothState.hillZone) return;
    const hz = kothState.hillZone;

    // Draw hill zone indicator
    const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.25;
    let zoneColor = 'rgba(255, 255, 255, ' + pulse + ')';
    if (kothState.currentHolder === player1) zoneColor = 'rgba(78, 205, 196, ' + (pulse + 0.1) + ')';
    if (kothState.currentHolder === player2) zoneColor = 'rgba(233, 69, 96, ' + (pulse + 0.1) + ')';

    ctx.fillStyle = zoneColor;
    ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
    // Zone border
    ctx.fillStyle = kothState.currentHolder ? kothState.currentHolder.color : '#666';
    ctx.fillRect(hz.x, hz.y, hz.w, 2);
    ctx.fillRect(hz.x, hz.y + hz.h - 2, hz.w, 2);
    ctx.fillRect(hz.x, hz.y, 2, hz.h);
    ctx.fillRect(hz.x + hz.w - 2, hz.y, 2, hz.h);

    // Crown icon on the hill
    const crownX = hz.x + hz.w / 2;
    const crownY = hz.y + 10;
    const crownBob = Math.sin(Date.now() / 500) * 2;
    drawPixelText('\u265A', crownX, crownY + crownBob, 16, '#ffdd00');

    // Score bars at top
    const barW = 150;
    const barH = 16;
    const maxScore = kothState.scoreToWin;

    // P1 score (left)
    const p1Ratio = Math.min(1, kothState.p1Score / maxScore);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 10, barW + 2, barH + 2);
    ctx.fillStyle = SKIN_OPTIONS[settings.p1Skin].primary;
    ctx.fillRect(21, 11, barW * p1Ratio, barH);
    drawPixelText(Math.floor(kothState.p1Score) + '/' + maxScore, 20 + barW / 2, 12 + barH / 2 + 2, 10, '#fff');

    // P2 score (right)
    const p2Ratio = Math.min(1, kothState.p2Score / maxScore);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(canvas.width - barW - 22, 10, barW + 2, barH + 2);
    ctx.fillStyle = SKIN_OPTIONS[settings.p2Skin].primary;
    ctx.fillRect(canvas.width - barW - 21, 11, barW * p2Ratio, barH);
    drawPixelText(Math.floor(kothState.p2Score) + '/' + maxScore, canvas.width - 22 - barW / 2, 12 + barH / 2 + 2, 10, '#fff');

    // "HOLD THE HILL" text
    drawPixelText(T('kothHold'), canvas.width / 2, 22, 12, '#ffdd00');
}

// --- Draw Tag HUD ---
function drawTagHud() {
    if (settings.gameMode !== 3) return;
    const now = Date.now();
    const remaining = Math.max(0, (tagState.roundEndTime - now) / 1000);
    const secs = Math.ceil(remaining);

    // Timer
    const timerColor = secs <= 10 ? '#ff4444' : (secs <= 20 ? '#ffaa00' : '#ffffff');
    drawPixelText(secs + 's', canvas.width / 2, 22, 16, timerColor);

    // Tagger indicator - glow around the tagger
    if (tagState.tagger) {
        const t = tagState.tagger;
        const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
        ctx.fillRect(t.x - 4, t.y - 4, t.w + 8, t.h + 8);
        // "TAGGER" label above
        drawPixelText(T('tagTagger'), t.x + t.w / 2, t.y - 24, 8, '#ff4444');
    }

    // Time as tagger display
    const p1Secs = Math.floor(tagState.p1Time / 1000);
    const p2Secs = Math.floor(tagState.p2Time / 1000);
    const p1C = SKIN_OPTIONS[settings.p1Skin].primary;
    const p2C = SKIN_OPTIONS[settings.p2Skin].primary;
    drawPixelText(p1Secs + 's', 60, 22, 12, p1C);
    drawPixelText(p2Secs + 's', canvas.width - 60, 22, 12, p2C);
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
        const avMaps = getAvailableMaps();
        const mapIdx = Math.min(settings.map, avMaps.length - 1);
        const options = [
            { label: T('lblMap'), value: MAPS[avMaps[mapIdx]].name, hasArrows: true },
            { label: T('lblBg'), value: BG_THEMES[settings.bg].name, hasArrows: true },
            { label: T('lblSound'), value: soundVal, hasArrows: true },
            { label: T('lblLang'), value: LANG_OPTIONS[settings.lang], hasArrows: true },
            { label: T('lblP1Skin'), value: p1SkinName, hasArrows: true },
            { label: T('lblP2Skin'), value: p2SkinName, hasArrows: true },
            { label: T('lblControls'), value: T('pressEnterEdit'), hasArrows: false },
        ];

        drawSettingsOptions(options, 78);

        // Skin color preview swatches next to P1/P2 COLOR options
        const spacing = 48;
        const boxH = 36;
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
        const previewY = 78 + options.length * spacing + 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(150, previewY, 500, 50);
        ctx.fillStyle = '#444';
        ctx.fillRect(150, previewY, 500, 2);
        ctx.fillRect(150, previewY + 48, 500, 2);
        drawPixelText(T('mapPreview'), canvas.width / 2, previewY + 11, 9, '#888');

        const previewMap = MAPS[avMaps[mapIdx]].platforms;
        const isLargeMap = previewMap.some(p => p.x + p.w > 850 || p.y + p.h > 500);
        const scale = isLargeMap ? 0.07 : 0.09;
        const offsetX = isLargeMap ? 220 : 210;
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
        // --- Gameplay Settings (dynamic based on game mode) ---
        drawPixelText(T('gameplay'), canvas.width / 2, 60, 28, '#e94560');

        const gpItems = getGameplaySettingsItems();
        const options = gpItems.map(item => ({ label: item.label, value: item.value, hasArrows: item.hasArrows }));

        drawSettingsOptions(options, 78, true);

        // Show game mode description
        const gmDesc = settings.lang === 0 ? GAME_MODE_OPTIONS[settings.gameMode].desc : GAME_MODE_OPTIONS[settings.gameMode].descDE;
        drawPixelText(gmDesc, canvas.width / 2, 470, 9, '#888');

        const blink = Math.floor(Date.now() / 500) % 2;
        drawPixelText(T('arrowChange'), canvas.width / 2, 486, 9, blink ? '#aaa' : '#666');
        drawPixelText(T('pressH'), canvas.width / 2, 500, 9, '#4ecdc4');
    }

    // How to Play overlay
    if (showHowToPlay) {
        drawHowToPlay();
    }
}

// Helper to draw a list of setting options with cursor highlight
function drawSettingsOptions(options, startY, useScroll) {
    const spacing = 48;
    const boxH = 36;
    const maxVisible = Math.floor((460 - startY) / spacing);

    // Determine visible range
    let scrollOff = 0;
    let visStart = 0;
    let visEnd = options.length;
    if (useScroll && options.length > maxVisible) {
        scrollOff = settingsScroll;
        visStart = scrollOff;
        visEnd = Math.min(options.length, scrollOff + maxVisible);
    }

    for (let vi = visStart; vi < visEnd; vi++) {
        const drawIdx = vi - visStart;
        const y = startY + drawIdx * spacing;
        const selected = settingsCursor === vi;
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
        drawPixelText(options[vi].label, 240, y + boxH / 2 + 4, 11, selected ? '#ffdd00' : '#888');

        const midY = y + boxH / 2 + 4;
        if (selected && options[vi].hasArrows) {
            const arrowBlink = Math.floor(Date.now() / 300) % 2;
            drawPixelText('<', 370, midY, 14, arrowBlink ? '#ffdd00' : '#aa8800');
            drawPixelText('>', 540, midY, 14, arrowBlink ? '#ffdd00' : '#aa8800');
        }
        const isControls = options[vi].label === 'CONTROLS';
        const valColor = (isControls && selected) ? '#4ecdc4' : (selected ? '#ffffff' : '#aaa');
        drawPixelText(options[vi].value, 455, midY, 12, valColor);
    }

    // Scroll indicators
    if (useScroll && options.length > maxVisible) {
        const arrowPulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
        if (scrollOff > 0) {
            ctx.globalAlpha = arrowPulse;
            drawPixelText('\u25B2', canvas.width / 2, startY - 8, 10, '#ffdd00');
            ctx.globalAlpha = 1;
        }
        if (visEnd < options.length) {
            ctx.globalAlpha = arrowPulse;
            drawPixelText('\u25BC', canvas.width / 2, startY + maxVisible * spacing + 4, 10, '#ffdd00');
            ctx.globalAlpha = 1;
        }
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
    const gm = settings.gameMode;
    const extraRows = (gm === 3) ? 3 : (gm === 2 || gm === 4) ? 2 : 0;
    const panelY = 155;
    const panelH = 200 + extraRows * 24;
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

    // Stats rows - dynamic based on game mode
    const s1 = stats.p1;
    const s2 = stats.p2;
    const acc1 = s1.shotsFired > 0 ? Math.round((s1.hits / s1.shotsFired) * 100) : 0;
    const acc2 = s2.shotsFired > 0 ? Math.round((s2.hits / s2.shotsFired) * 100) : 0;

    // Base stats (all modes)
    const statLabels = [T('shotsFired'), T('hits'), T('accuracy'), T('damageDone'), T('puCollected')];
    const statVals1 = [s1.shotsFired, s1.hits, acc1 + '%', s1.damageDone, s1.powerupsCollected];
    const statVals2 = [s2.shotsFired, s2.hits, acc2 + '%', s2.damageDone, s2.powerupsCollected];

    // Tag mode: add tagger stats + deaths
    if (settings.gameMode === 3) {
        statLabels.push(T('deaths'));
        statVals1.push(s1.deaths);
        statVals2.push(s2.deaths);
        const p1Secs = Math.floor(tagState.p1Time / 1000);
        const p2Secs = Math.floor(tagState.p2Time / 1000);
        const p1WasTagger = tagState.tagger === player1;
        statLabels.push(T('timeAsTagger'));
        statVals1.push(p1Secs + 's');
        statVals2.push(p2Secs + 's');
        statLabels.push(T('lastTagger'));
        statVals1.push(p1WasTagger ? T('yes') : T('no'));
        statVals2.push(p1WasTagger ? T('no') : T('yes'));
    }

    // KOTH mode: add hill stats + deaths
    if (settings.gameMode === 2) {
        statLabels.push(T('deaths'));
        statVals1.push(s1.deaths);
        statVals2.push(s2.deaths);
        statLabels.push(T('hillScore'));
        statVals1.push(Math.floor(kothState.p1Score) + '/' + kothState.scoreToWin);
        statVals2.push(Math.floor(kothState.p2Score) + '/' + kothState.scoreToWin);
    }

    // Lava Rise mode: add deaths + lives left
    if (settings.gameMode === 4) {
        statLabels.push(T('deaths'));
        statVals1.push(s1.deaths);
        statVals2.push(s2.deaths);
        statLabels.push(T('livesLeft'));
        statVals1.push(lavaState.p1Lives);
        statVals2.push(lavaState.p2Lives);
    }

    ctx.font = '11px monospace';
    for (let i = 0; i < statLabels.length; i++) {
        const rowY = panelY + 72 + i * 24;
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(statLabels[i], canvas.width / 2, rowY);
        ctx.fillStyle = '#ddd';
        ctx.fillText('' + statVals1[i], col1X, rowY);
        ctx.fillText('' + statVals2[i], col2X, rowY);

        // "Last Tagger": highlight the "No" player in their color
        if (statLabels[i] === T('lastTagger')) {
            const noIsP1 = statVals1[i] === T('no');
            const highlightX = noIsP1 ? col1X : col2X;
            const highlightColor = noIsP1 ? player1.color : player2.color;
            ctx.fillStyle = highlightColor;
            ctx.fillText(noIsP1 ? '' + statVals1[i] : '' + statVals2[i], highlightX, rowY);
        } else {
            const v1 = parseFloat(statVals1[i]);
            const v2 = parseFloat(statVals2[i]);
            if (!isNaN(v1) && !isNaN(v2) && v1 !== v2) {
                // For "Time as Tagger": lower is better
                const lowerIsBetter = statLabels[i] === T('timeAsTagger') || statLabels[i] === T('deaths');
                const p1Better = lowerIsBetter ? v1 < v2 : v1 > v2;
                const betterX = p1Better ? col1X : col2X;
                const betterColor = p1Better ? player1.color : player2.color;
                ctx.fillStyle = betterColor;
                ctx.fillText(p1Better ? '' + statVals1[i] : '' + statVals2[i], betterX, rowY);
            }
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
// LAVA RISE MODE
// ============================================

// --- Pre-built lava structures ---
// Each structure: { height: total Y span, platforms: [{x, y, w}] }
// y values are relative offsets from the structure's base (0 = bottom, negative = up)
// Structures are designed with 1-2 paths and increasingly hard jumps

const LAVA_STRUCTURES = {
    // --- EASY structures (used early, 2 paths, generous platforms) ---
    easy: [
        { // Wide zigzag - 2 clear paths
            height: 280,
            platforms: [
                { x: 50, y: 0, w: 250 },
                { x: 500, y: 0, w: 250 },
                { x: 250, y: -70, w: 300 },
                { x: 50, y: -140, w: 200 },
                { x: 550, y: -140, w: 200 },
                { x: 200, y: -210, w: 400 },
                { x: 100, y: -280, w: 250 },
                { x: 500, y: -280, w: 200 },
            ],
        },
        { // Double staircase - left and right paths
            height: 300,
            platforms: [
                { x: 100, y: 0, w: 600 },
                { x: 50, y: -75, w: 180 },
                { x: 570, y: -75, w: 180 },
                { x: 200, y: -150, w: 160 },
                { x: 440, y: -150, w: 160 },
                { x: 50, y: -225, w: 180 },
                { x: 570, y: -225, w: 180 },
                { x: 250, y: -300, w: 300 },
            ],
        },
        { // Funnel - wide at bottom, narrows
            height: 280,
            platforms: [
                { x: 30, y: 0, w: 340 },
                { x: 430, y: 0, w: 340 },
                { x: 100, y: -70, w: 250 },
                { x: 450, y: -70, w: 250 },
                { x: 200, y: -140, w: 400 },
                { x: 280, y: -210, w: 240 },
                { x: 300, y: -280, w: 200 },
            ],
        },
    ],
    // --- MEDIUM structures (1-2 paths, tighter jumps, max ~130px edge gap) ---
    medium: [
        { // Zigzag center - weaves through the middle
            height: 350,
            platforms: [
                { x: 200, y: 0, w: 400 },
                { x: 420, y: -80, w: 140 },
                { x: 240, y: -160, w: 140 },
                { x: 420, y: -240, w: 130 },
                { x: 250, y: -320, w: 130 },
                { x: 300, y: -350, w: 200 },
            ],
        },
        { // Staircase right - climbing right side
            height: 380,
            platforms: [
                { x: 200, y: 0, w: 300 },
                { x: 400, y: -75, w: 150 },
                { x: 500, y: -155, w: 140 },
                { x: 350, y: -230, w: 150 },
                { x: 200, y: -305, w: 140 },
                { x: 300, y: -380, w: 200 },
            ],
        },
        { // Bottleneck - two paths merge in center
            height: 320,
            platforms: [
                { x: 100, y: 0, w: 250 },
                { x: 450, y: 0, w: 250 },
                { x: 200, y: -80, w: 160 },
                { x: 440, y: -80, w: 160 },
                { x: 300, y: -160, w: 200 },
                { x: 200, y: -240, w: 140 },
                { x: 460, y: -240, w: 140 },
                { x: 280, y: -320, w: 240 },
            ],
        },
        { // S-curve - smooth alternating path
            height: 360,
            platforms: [
                { x: 250, y: 0, w: 300 },
                { x: 430, y: -80, w: 140 },
                { x: 300, y: -155, w: 130 },
                { x: 180, y: -230, w: 130 },
                { x: 330, y: -300, w: 130 },
                { x: 300, y: -360, w: 200 },
            ],
        },
    ],
    // --- HARD structures (horizontal traversal, must run across to find the way up) ---
    hard: [
        { // Long bridge left-to-right: run all the way right, jump up, run back left
            height: 300,
            platforms: [
                { x: 30, y: 0, w: 740 },             // full-width bridge
                { x: 620, y: -75, w: 150 },           // step up on the right
                { x: 30, y: -150, w: 740 },            // full-width bridge back
                { x: 30, y: -225, w: 150 },            // step up on the left
                { x: 200, y: -300, w: 400 },           // exit platform
            ],
        },
        { // Corridor with gaps: run across, hop gaps, step up at the end
            height: 350,
            platforms: [
                { x: 30, y: 0, w: 280 },              // start left
                { x: 400, y: 0, w: 130 },             // middle stepping stone
                { x: 620, y: 0, w: 150 },             // right end
                { x: 580, y: -80, w: 140 },           // step up right
                { x: 250, y: -80, w: 240 },           // run back left-center
                { x: 30, y: -80, w: 130 },            // left end
                { x: 30, y: -170, w: 150 },           // step up left
                { x: 250, y: -170, w: 130 },          // stepping stone
                { x: 480, y: -170, w: 290 },          // run right
                { x: 620, y: -255, w: 150 },          // step up right
                { x: 200, y: -350, w: 400 },          // exit bridge
            ],
        },
        { // Switchback shelves: wide ledges alternating sides
            height: 350,
            platforms: [
                { x: 30, y: 0, w: 550 },              // long ledge from left
                { x: 520, y: -80, w: 120 },           // small step up right end
                { x: 220, y: -160, w: 550 },          // long ledge from right
                { x: 220, y: -240, w: 120 },          // small step up left end
                { x: 250, y: -350, w: 300 },          // exit
            ],
        },
        { // Maze run: multiple horizontal layers with single gaps
            height: 380,
            platforms: [
                { x: 30, y: 0, w: 350 },              // left half
                { x: 480, y: 0, w: 290 },             // right half (gap at 380-480)
                { x: 600, y: -80, w: 170 },           // step up far right
                { x: 100, y: -160, w: 650 },          // long run left
                { x: 30, y: -240, w: 150 },           // step up far left
                { x: 30, y: -310, w: 300 },           // run right
                { x: 430, y: -310, w: 340 },          // continue right (gap at 330-430)
                { x: 250, y: -380, w: 300 },          // exit
            ],
        },
        { // U-turn: run right, step up, run all the way back left
            height: 280,
            platforms: [
                { x: 30, y: 0, w: 740 },              // full bridge
                { x: 600, y: -70, w: 170 },           // step up right corner
                { x: 30, y: -140, w: 740 },           // full bridge back
                { x: 30, y: -210, w: 170 },           // step up left corner
                { x: 200, y: -280, w: 400 },          // exit
            ],
        },
    ],
};

function generateLavaPlatformRow(y) {
    const count = Math.random() < 0.4 ? 3 : 2;
    const baseW = 90 + Math.random() * 70; // 90-160
    for (let i = 0; i < count; i++) {
        const sectionW = (800 - 30) / count;
        const w = baseW + Math.random() * 20;
        const x = 15 + i * sectionW + Math.random() * Math.max(0, sectionW - w);
        platforms.push({
            x: Math.max(5, Math.min(x, 795 - w)),
            y, w, h: 16,
        });
    }
}

// Place a pre-built structure at a given base Y, optionally mirrored
function placeStructure(structure, baseY) {
    const mirror = Math.random() < 0.5; // 50% chance to mirror horizontally
    for (const p of structure.platforms) {
        const x = mirror ? (800 - p.x - p.w) : p.x;
        platforms.push({ x, y: baseY + p.y, w: p.w, h: 16 });
    }
}

function pickStructure() {
    const time = lavaState.framesSinceStart / 60; // seconds elapsed
    let pool;
    if (time < 40) {
        pool = LAVA_STRUCTURES.easy;
    } else if (time < 90) {
        // Mix easy and medium
        pool = Math.random() < 0.4 ? LAVA_STRUCTURES.easy : LAVA_STRUCTURES.medium;
        pool = [pool[Math.floor(Math.random() * pool.length)]];
        return pool[0];
    } else if (time < 150) {
        // Mix medium and hard
        pool = Math.random() < 0.3 ? LAVA_STRUCTURES.medium : LAVA_STRUCTURES.hard;
        pool = [pool[Math.floor(Math.random() * pool.length)]];
        return pool[0];
    } else {
        pool = LAVA_STRUCTURES.hard;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

function initLavaPlatforms() {
    platforms = [];
    // Wide starting platform
    platforms.push({ x: 50, y: 460, w: 700, h: 16 });
    // Generate initial rows with simple random platforms
    let y = 370;
    let lastY = 370;
    while (y > -100) {
        generateLavaPlatformRow(y);
        lastY = y;
        y -= 65 + Math.random() * 20;
    }
    lavaState.nextPlatformY = lastY;
    lavaState.useStructures = false; // start with random, switch to structures later
}

function updateLavaMode() {
    lavaState.framesSinceStart++;

    // Increase lava speed over time
    lavaState.lavaSpeed = 0.3 + lavaState.framesSinceStart * 0.0002;

    // Rise lava (decrease Y = move up in world space)
    lavaState.lavaY -= lavaState.lavaSpeed;

    // Update camera to follow lava (keep lava near screen bottom)
    lavaState.cameraY = Math.max(0, 480 - lavaState.lavaY);

    // Switch to structures after ~30 seconds
    if (!lavaState.useStructures && lavaState.framesSinceStart > 1800) {
        lavaState.useStructures = true;
    }

    // Generate new platforms/structures above as camera scrolls up
    const worldTopY = -lavaState.cameraY;
    while (lavaState.nextPlatformY > worldTopY - 400) {
        if (lavaState.useStructures) {
            // Place a pre-built structure
            const struct = pickStructure();
            const gap = 70 + Math.random() * 15; // gap between structures
            lavaState.nextPlatformY -= gap;
            placeStructure(struct, lavaState.nextPlatformY);
            lavaState.nextPlatformY -= struct.height;
        } else {
            // Random rows (early game)
            const gap = 65 + Math.random() * 20;
            lavaState.nextPlatformY -= gap;
            generateLavaPlatformRow(lavaState.nextPlatformY);
        }
    }

    // Remove platforms that are below lava (cleanup)
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y > lavaState.lavaY + 50) {
            platforms.splice(i, 1);
        }
    }

    // Remove powerups and ammo pickups below lava
    for (let i = powerups.length - 1; i >= 0; i--) {
        if (powerups[i].y > lavaState.lavaY) powerups.splice(i, 1);
    }
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        if (ammoPickups[i].y > lavaState.lavaY) ammoPickups.splice(i, 1);
    }

    // Check if players touch lava
    checkLavaDeath(player1, 'p1');
    checkLavaDeath(player2, 'p2');
}

function checkLavaDeath(player, pKey) {
    if (player.hp <= 0 || player.y + player.h > lavaState.lavaY) {
        // Player died
        const livesKey = pKey === 'p1' ? 'p1Lives' : 'p2Lives';
        stats[pKey].deaths++;
        lavaState[livesKey]--;

        if (lavaState[livesKey] <= 0) {
            // Out of lives - check for game over
            return; // handled in checkWin
        }

        // Respawn on the highest visible platform
        player.hp = HP_OPTIONS[settings.hp];
        const worldTopY = -lavaState.cameraY;
        const screenBottom = worldTopY + 500;
        // Find the highest platform that is on screen and above the lava
        let bestPlat = null;
        for (const p of platforms) {
            if (p.y > lavaState.lavaY - 30) continue; // skip platforms near/below lava
            if (p.y < worldTopY) continue;              // skip platforms above screen
            if (p.y > screenBottom) continue;            // skip platforms below screen
            if (!bestPlat || p.y < bestPlat.y) {
                bestPlat = p;
            }
        }
        if (bestPlat) {
            player.x = bestPlat.x + Math.random() * Math.max(0, bestPlat.w - player.w);
            player.y = bestPlat.y - player.h;
        } else {
            // Fallback: spawn at top of screen (should rarely happen)
            player.y = worldTopY + 30;
            player.x = 100 + Math.random() * 600;
        }
        player.vx = 0;
        player.vy = 0;
        player.knockbackVx = 0;
        player.bullets = [];
        spawnParticles(player.x + 16, player.y + 20, player.color, 15);

        // Reset AI if player2
        if (pKey === 'p2' && gameMode === 'pve') {
            AI.path = [];
            AI.pathStep = 0;
            AI.pathTarget = null;
            AI.stuckTimer = 0;
            AI.giveUpCooldown = 10;
        }
    }
}

function drawLava() {
    const lY = lavaState.lavaY;
    // Lava glow above surface
    const gradient = ctx.createLinearGradient(0, lY - 50, 0, lY);
    gradient.addColorStop(0, 'rgba(255, 68, 0, 0)');
    gradient.addColorStop(1, 'rgba(255, 68, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, lY - 50, 800, 50);

    // Wavy lava surface
    for (let x = 0; x < 800; x += 4) {
        const wave = Math.sin(x * 0.05 + frameCount * 0.1) * 4;
        const wave2 = Math.sin(x * 0.08 + frameCount * 0.06) * 2;
        // Deep red/orange lava body
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(x, lY + wave + wave2, 4, 600);
        // Bright surface
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(x, lY + wave + wave2, 4, 6);
        // Yellow highlight on surface
        if ((x + Math.floor(frameCount * 2)) % 16 < 8) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x, lY + wave + wave2, 4, 3);
        }
    }
    // Bright yellow crust spots
    ctx.fillStyle = '#ffdd00';
    ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.05) * 0.3;
    for (let x = 0; x < 800; x += 24) {
        const wave = Math.sin(x * 0.03 + frameCount * 0.07) * 3;
        ctx.fillRect(x + 4, lY + wave + 8, 8, 4);
    }
    ctx.globalAlpha = 1;
}

function drawLavaHud() {
    // Draw lives at top of screen
    const spacing = 14;

    // P1 lives - top left
    ctx.fillStyle = player1.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(player1.name, 10, 16);
    for (let i = 0; i < lavaState.p1Lives; i++) {
        const hx = 10 + i * spacing;
        const hy = 22;
        // Draw small heart
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(hx + 1, hy, 3, 2);
        ctx.fillRect(hx + 5, hy, 3, 2);
        ctx.fillRect(hx, hy + 2, 9, 3);
        ctx.fillRect(hx + 1, hy + 5, 7, 2);
        ctx.fillRect(hx + 2, hy + 7, 5, 1);
        ctx.fillRect(hx + 3, hy + 8, 3, 1);
    }

    // P2 lives - top right
    ctx.fillStyle = player2.color;
    ctx.textAlign = 'right';
    ctx.fillText(player2.name, 790, 16);
    for (let i = 0; i < lavaState.p2Lives; i++) {
        const hx = 780 - i * spacing;
        const hy = 22;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(hx + 1, hy, 3, 2);
        ctx.fillRect(hx + 5, hy, 3, 2);
        ctx.fillRect(hx, hy + 2, 9, 3);
        ctx.fillRect(hx + 1, hy + 5, 7, 2);
        ctx.fillRect(hx + 2, hy + 7, 5, 1);
        ctx.fillRect(hx + 3, hy + 8, 3, 1);
    }

    // Lava speed / height indicator
    const elapsed = Math.floor(lavaState.framesSinceStart / 60);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mins + ':' + (secs < 10 ? '0' : '') + secs, 400, 16);
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
        p1: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0, deaths: 0 },
        p2: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0, deaths: 0 },
    };

    // One Shot mode: set HP to 1
    if (settings.gameMode === 1) {
        player1.hp = 1;
        player2.hp = 1;
    }

    // King of the Hill mode: init KOTH state
    if (settings.gameMode === 2) {
        const hillPlat = platforms.find(p => p.isHill);
        kothState = {
            p1Score: 0,
            p2Score: 0,
            scoreToWin: 30,
            hillZone: hillPlat ? { x: hillPlat.x, y: hillPlat.y - 50, w: hillPlat.w, h: 50 } : null,
            currentHolder: null,
            holdStart: Date.now(),
        };
    }

    // Tag mode: init tag state
    if (settings.gameMode === 3) {
        const duration = TAG_DURATION_OPTIONS[settings.tagDuration].time;
        tagState = {
            tagger: player1,  // Player 1 starts as "it"
            p1Time: 0,
            p2Time: 0,
            lastTagSwitch: Date.now(),
            lastSwitch: 0,    // debounce timestamp for tag switching
            roundEndTime: Date.now() + duration * 1000,
        };
    }

    // Lava Rise mode: init lava state
    if (settings.gameMode === 4) {
        const lives = LAVA_LIVES_OPTIONS[settings.lavaLives].lives;
        lavaState = {
            lavaY: 500,
            lavaSpeed: 0.3,
            cameraY: 0,
            nextPlatformY: 0,
            p1Lives: lives,
            p2Lives: lives,
            framesSinceStart: 0,
            useStructures: false,
        };
        initLavaPlatforms();
        // Position players on the wide starting platform
        player1.x = 250;
        player1.y = 420;
        player2.x = 500;
        player2.y = 420;
    }
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
        if (settings.gameMode === 0 || settings.gameMode === 1) updateSuddenDeath();
        if (settings.gameMode === 2) updateKOTH();
        if (settings.gameMode === 4) updateLavaMode();
        checkBulletHits();
        checkWin();
        updateParticles();
        updateDamageNumbers();

        drawBg();
        if (settings.gameMode === 4) {
            ctx.save();
            ctx.translate(0, lavaState.cameraY);
        }
        drawPlatforms();
        if (settings.gameMode === 2) drawKOTHHud(); // draw hill zone before players
        drawPowerups();
        drawAmmoPickups();
        player1.draw();
        player2.draw();
        drawParticles();
        drawDamageNumbers();
        if (settings.gameMode === 4) {
            drawLava();
            ctx.restore();
            drawLavaHud();
        }
        if (settings.gameMode === 0 || settings.gameMode === 1) drawRoundTimer();
        if (settings.gameMode === 3) drawTagHud();
    } else if (gameState === 'dying') {
        updateDeathAnimation();
        updateParticles();
        updateDamageNumbers();

        drawBg();
        if (settings.gameMode === 4) {
            ctx.save();
            ctx.translate(0, lavaState.cameraY);
        }
        drawPlatforms();
        // Draw the winner normally
        if (winner === player1) { player1.draw(); } else { player2.draw(); }
        // Draw the loser with death effect
        drawDyingPlayer();
        drawParticles();
        drawDamageNumbers();
        if (settings.gameMode === 4) {
            drawLava();
            ctx.restore();
            drawLavaHud();
        }
    } else if (gameState === 'gameover') {
        drawBg();
        if (settings.gameMode === 4) {
            ctx.save();
            ctx.translate(0, lavaState.cameraY);
        }
        drawPlatforms();
        if (settings.gameMode === 2 || settings.gameMode === 3) {
            // KOTH, Tag: both players alive, draw both
            player1.draw();
            player2.draw();
            if (settings.gameMode === 2) drawKOTHHud();
        } else if (settings.gameMode === 4) {
            // Lava Rise: loser went through death animation, only draw winner
            if (winner === player1) { player1.draw(); } else { player2.draw(); }
        } else {
            // Classic/One Shot: only draw the winner (loser has exploded)
            if (winner === player1) { player1.draw(); } else { player2.draw(); }
        }
        updateParticles();
        updateDamageNumbers();
        drawParticles();
        drawDamageNumbers();
        if (settings.gameMode === 4) {
            drawLava();
            ctx.restore();
        }
        drawGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

createPlayers();
gameLoop();
