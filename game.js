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
        duration: 0,
        description: '+40 HP',
        weight: 2,
    },
    invincible: {
        name: 'Shield',
        color: '#ffdd00',
        colorDark: '#aa8800',
        symbol: 'S',
        duration: 5000,
        description: '5s invincible',
        weight: 1,
    },
    rapidfire: {
        name: 'Rapid Bullets',
        color: '#ff8800',
        colorDark: '#aa5500',
        symbol: 'F',
        duration: 6000,
        description: '6s rapid bullets',
        weight: 1.5,
    },
    nocooldown: {
        name: 'Half Cooldown',
        color: '#cc44ff',
        colorDark: '#7722aa',
        symbol: '!',
        duration: 4000,
        description: '4s half cooldown',
        weight: 1.5,
    },
    damage: {
        name: 'More Damage',
        color: '#ff2244',
        colorDark: '#aa1133',
        symbol: 'D',
        duration: 6000,
        description: '6s 3x damage',
        weight: 1,
    },
    extralife: {
        name: 'Extra Life',
        color: '#ff66aa',
        colorDark: '#aa3366',
        symbol: '\u2665',
        duration: 0,
        description: '+1 Life',
        weight: 1.5,
        lavaOnly: true,
    },
    doublejump: {
        name: 'Double Jump',
        color: '#66ddff',
        colorDark: '#3388aa',
        symbol: '\u2191',
        duration: 0,
        description: '+1 Double Jump',
        weight: 2,
    },
    noknockback: {
        name: 'No Knockback',
        color: '#aaaaaa',
        colorDark: '#666666',
        symbol: 'K',
        duration: 5000,
        description: '5s no knockback',
        weight: 1.5,
    },
    speedboost: {
        name: 'Speed Boost',
        color: '#44ffaa',
        colorDark: '#22aa66',
        symbol: '>',
        duration: 10000,
        description: '10s +50% speed',
        weight: 1.5,
    },
    superjump: {
        name: 'Super Jump',
        color: '#ffff44',
        colorDark: '#aaaa22',
        symbol: '^',
        duration: 8000,
        description: '8s +35% jump',
        weight: 1.5,
    },
    swap: {
        name: 'Swap',
        color: '#ff66ff',
        colorDark: '#aa33aa',
        symbol: '\u21C4',
        duration: 0,
        description: 'Swap positions [E]',
        weight: 0.3,
    },
    lavafreeze: {
        name: 'Lava Freeze',
        color: '#88ddff',
        colorDark: '#4488aa',
        symbol: '*',
        duration: 0,
        description: '5s lava stop',
        weight: 1.5,
        lavaOnly: true,
    },
    platspawn: {
        name: 'Platform',
        color: '#bb88ff',
        colorDark: '#7744aa',
        symbol: '_',
        duration: 0,
        description: '+1 Platform [\u2193]',
        weight: 1.5,
        lavaOnly: true,
    },
    invert: {
        name: 'Invert',
        color: '#ff4488',
        colorDark: '#aa2255',
        symbol: '?',
        duration: 15000,
        description: '15s invert enemy',
        weight: 0.8,
    },
    megaknockback: {
        name: 'Mega Knockback',
        color: '#ff6633',
        colorDark: '#aa3311',
        symbol: 'K',
        duration: 8000,
        description: '8s 3x knockback',
        weight: 1.2,
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
    gameMode: 0,     // index into GAME_MODE_OPTIONS (0=Classic, 1=One Shot, 2=King of the Hill, 3=Tag, 4=Lava Rise)
    tagWinRule: 0,   // 0 = not "it" at end wins, 1 = shortest time as "it" wins
    tagDuration: 1,  // index into TAG_DURATION_OPTIONS (default 60s)
    knockback: 1,    // index into KNOCKBACK_OPTIONS (default Normal)
    lavaLives: 1,    // index into LAVA_LIVES_OPTIONS (default 3 lives)
    lavaStartSpeed: 1, // index into LAVA_START_SPEED_OPTIONS (default Normal)
    lavaAccel: 1,      // index into LAVA_ACCEL_OPTIONS (default Normal)
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
    { name: 'Easy', thinkInterval: 10, cooldown: 600, accuracy: 0.45, dodgeChance: 0.3, climbSkill: 0.5, combatIQ: 0.3 },
    { name: 'Medium', thinkInterval: 6, cooldown: 450, accuracy: 0.7, dodgeChance: 0.6, climbSkill: 0.75, combatIQ: 0.6 },
    { name: 'Hard', thinkInterval: 3, cooldown: 300, accuracy: 0.92, dodgeChance: 0.9, climbSkill: 1.0, combatIQ: 1.0 },
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

const LAVA_START_SPEED_OPTIONS = [
    { name: 'Slow', nameDE: 'Langsam', speed: 0.15 },
    { name: 'Normal', nameDE: 'Normal', speed: 0.3 },
    { name: 'Fast', nameDE: 'Schnell', speed: 0.5 },
    { name: 'Very Fast', nameDE: 'Sehr Schnell', speed: 0.8 },
];

const LAVA_ACCEL_OPTIONS = [
    { name: 'Slow', nameDE: 'Langsam', accel: 0.0001 },
    { name: 'Normal', nameDE: 'Normal', accel: 0.0002 },
    { name: 'Fast', nameDE: 'Schnell', accel: 0.0004 },
    { name: 'Extreme', nameDE: 'Extrem', accel: 0.0008 },
];

// --- Tag Mode State ---
let tagState = {
    tagger: null,         // reference to the player who is "it"
    p1Time: 0,            // ms player1 was "it"
    p2Time: 0,            // ms player2 was "it"
    lastTagSwitch: 0,     // timestamp of last tag switch
    lastSwitch: 0,        // debounce timestamp for tag switching
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
    windZones: [],         // array of { x, y, w, h, strength, particles[] }
    freezeUntil: 0,        // timestamp when lava freeze ends
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
        mech6: '\u2022 Ice platforms: slippery! You slide and keep momentum.',
        mech7: '\u2022 Bounce platforms: launch you high into the air.',
        mech8: '\u2022 Wind zones (Lava Rise): push you sideways mid-air.',
        modesTitle: 'GAME MODES',
        mode1: '\u2022 Classic: Reduce enemy HP to 0. Best of X rounds.',
        mode2: '\u2022 One Shot: 1 HP each, one hit kills! No heal power-ups.',
        mode3: '\u2022 King of the Hill: Hold the glowing zone to score points.',
        mode4: '\u2022 Tag: Avoid being the tagger! Lowest time wins.',
        mode5: '\u2022 Lava Rise: Climb upward as lava rises. Last alive wins!',
        puTitle: 'POWER-UPS',
        closeHint: 'Press H or ESC to close',
        winsMatch: 'wins the match!', winsRound: 'wins the round!',
        score: 'Score:', roundStats: 'ROUND STATS',
        shotsFired: 'Shots Fired', hits: 'Hits', accuracy: 'Accuracy',
        damageDone: 'Damage Done', puCollected: 'Power-Ups collected',
        timeAsTagger: 'Time as Tagger', lastTagger: 'Last Tagger',
        hillTime: 'Hill Time', hillScore: 'Hill Score',
        deaths: 'Deaths',
        lavaRise: 'Lava Rise', lblLavaLives: 'LIVES', lblLavaStartSpeed: 'LAVA START SPEED', lblLavaAccel: 'LAVA RISING ACCEL.', livesLeft: 'Lives',
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
        mech6: '\u2022 Eis-Plattformen: rutschig! Man gleitet und beh\u00e4lt Schwung.',
        mech7: '\u2022 Trampolin-Plattformen: schleudern dich hoch in die Luft.',
        mech8: '\u2022 Windzonen (Lava Rise): schieben dich seitlich in der Luft.',
        modesTitle: 'SPIELMODI',
        mode1: '\u2022 Klassisch: Reduziere gegnerische HP auf 0. Best of X Runden.',
        mode2: '\u2022 Ein Schuss: 1 HP, ein Treffer t\u00f6tet! Keine Heil-Power-Ups.',
        mode3: '\u2022 K\u00f6nig d. H\u00fcgels: Halte die leuchtende Zone f\u00fcr Punkte.',
        mode4: '\u2022 Fangen: Vermeide es, F\u00e4nger zu sein! K\u00fcrzeste Zeit gewinnt.',
        mode5: '\u2022 Steigende Lava: Klettere nach oben w\u00e4hrend Lava steigt!',
        puTitle: 'POWER-UPS',
        closeHint: 'H oder ESC zum Schlie\u00dfen',
        winsMatch: 'gewinnt das Match!', winsRound: 'gewinnt die Runde!',
        score: 'Punkte:', roundStats: 'RUNDENSTATISTIK',
        shotsFired: 'Sch\u00fcsse', hits: 'Treffer', accuracy: 'Genauigkeit',
        damageDone: 'Schaden', puCollected: 'Power-Ups gesammelt',
        timeAsTagger: 'Zeit als F\u00e4nger', lastTagger: 'Letzter F\u00e4nger',
        hillTime: 'Zeit auf H\u00fcgel', hillScore: 'H\u00fcgel-Punkte',
        deaths: 'Tode',
        lavaRise: 'Steigende Lava', lblLavaLives: 'LEBEN', lblLavaStartSpeed: 'LAVA-STARTEMPO', lblLavaAccel: 'LAVA-BESCHL.', livesLeft: 'Leben',
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
        const ssOpt = LAVA_START_SPEED_OPTIONS[settings.lavaStartSpeed];
        const ssVal = settings.lang === 1 && ssOpt.nameDE ? ssOpt.nameDE : ssOpt.name;
        items.push({ key: 'lavaStartSpeed', label: T('lblLavaStartSpeed'), value: ssVal, hasArrows: true });
        const acOpt = LAVA_ACCEL_OPTIONS[settings.lavaAccel];
        const acVal = settings.lang === 1 && acOpt.nameDE ? acOpt.nameDE : acOpt.name;
        items.push({ key: 'lavaAccel', label: T('lblLavaAccel'), value: acVal, hasArrows: true });
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
        case 'lavaStartSpeed': settings.lavaStartSpeed = cycle(settings.lavaStartSpeed, LAVA_START_SPEED_OPTIONS.length); break;
        case 'lavaAccel': settings.lavaAccel = cycle(settings.lavaAccel, LAVA_ACCEL_OPTIONS.length); break;
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
let htpScroll = 0;
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
    // Block P2 keyboard input when playing against AI
    if (gameMode === 'pve' && gameState === 'playing' && player2) {
        const c = player2.controls;
        if (e.code === c.left || e.code === c.right || e.code === c.jump || e.code === c.down || e.code === c.shoot) {
            e.preventDefault();
            return;
        }
    }
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
                htpScroll = 0;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') htpScroll += 30;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') htpScroll = Math.max(0, htpScroll - 30);
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
        this.standingOn = null;
        this.lastShot = 0;
        this.bullets = [];
        this.animFrame = 0;
        this.animTimer = 0;
        this.state = 'idle'; // idle, walk, jump
        this.hitFlash = 0;
        this.muzzleFlash = 0;
        // Power-up state
        this.activePowerups = {}; // type -> expiry timestamp
        this.doubleJumps = 0; // stackable double jump charges
        this.jumpPressed = false; // for double jump edge detection
        this.usedDoubleJump = false; // prevent double jump while holding from ground
        this.platformCharges = 0; // stackable platform spawn charges
        this.platSpawnPressed = false; // edge detection for platform spawn
        this.swapCharges = 0; // stackable swap charges
        this.swapPressed = false; // edge detection for swap activation
        this.invertedUntil = 0; // timestamp when invert wears off
        this.dropPressed = false; // edge detection for drop-through
        this.dropThrough = false; // falling through platform
        this.dropPlatform = null; // which platform to ignore
        this.slidOffPlatform = null; // ice platform we slid off (ignore collision until clear)
        this.ammo = START_AMMO; // ammo count (only used when infiniteAmmo is Off)
        this.knockbackVx = 0; // horizontal knockback velocity (decays over time)
    }

    update() {
        const wasMoving = this.vx !== 0;
        const prevVx = this.vx; // save for ice sliding
        const onIce = this.standingOn && this.standingOn.ice;
        this.vx = 0;

        // AI in Lava Rise gets a small speed boost
        const isLavaAI = settings.gameMode === 4 && gameMode === 'pve' && this === player2;
        let speed = isLavaAI ? PLAYER_SPEED * 1.2 : PLAYER_SPEED;
        // Speed boost powerup: +50% movement speed
        if (this.hasPowerup('speedboost')) speed *= 1.5;

        // Invert controls check
        const inverted = this.invertedUntil && Date.now() < this.invertedUntil;
        const leftKey = inverted ? this.controls.right : this.controls.left;
        const rightKey = inverted ? this.controls.left : this.controls.right;
        const jumpKey = inverted ? this.controls.down : this.controls.jump;
        const downKey = inverted ? this.controls.jump : this.controls.down;

        if (keys[leftKey]) {
            this.vx = -speed;
            this.facing = -1;
        }
        if (keys[rightKey]) {
            this.vx = speed;
            this.facing = 1;
        }

        // Ice platform sliding: very slippery! Accelerate while moving, slide when stopping
        if (onIce) {
            const inputVx = this.vx;
            if (inputVx !== 0) {
                // Moving on ice: slowly accelerate, keep most momentum
                this.vx = inputVx * 0.15 + prevVx * 0.93;
            } else {
                // Not pressing anything: coast with very high momentum
                this.vx = prevVx * 0.985;
                if (Math.abs(this.vx) < 0.2) this.vx = 0;
            }
            const maxIce = speed * 1.6;
            this.vx = Math.max(-maxIce, Math.min(maxIce, this.vx));
        }

        // Apply knockback (decays with friction)
        this.vx += this.knockbackVx;
        this.knockbackVx *= 0.85; // friction decay
        if (Math.abs(this.knockbackVx) < 0.2) this.knockbackVx = 0;

        if (keys[jumpKey]) {
            if (this.onGround) {
                // Normal ground jump (hold to auto-jump on landing)
                const gravScale = GRAVITY_OPTIONS[settings.gravity].value / 0.6;
                const jumpMult = isLavaAI ? 1.12 : 1;
                const sjMult = this.hasPowerup('superjump') ? 1.35 : 1;
                this.vy = JUMP_FORCE * Math.sqrt(gravScale) * jumpMult * sjMult;
                this.onGround = false;
                this.usedDoubleJump = true; // block double jump while holding from ground
            } else if (!this.onGround && this.doubleJumps > 0 && !this.usedDoubleJump && !this.jumpPressed && !this._nearPlatformBelow()) {
                // Double jump (mid-air, requires fresh key press, not near a platform)
                const gravScale = GRAVITY_OPTIONS[settings.gravity].value / 0.6;
                const jumpMult = isLavaAI ? 1.12 : 1;
                const sjMult = this.hasPowerup('superjump') ? 1.35 : 1;
                this.vy = JUMP_FORCE * Math.sqrt(gravScale) * jumpMult * 1.1 * sjMult;
                this.doubleJumps--;
                this.usedDoubleJump = true;
                this.jumpPressed = true;
                // Visual burst
                spawnParticles(this.x + this.w / 2, this.y + this.h, '#66ddff', 6);
            }
        } else {
            this.jumpPressed = false;
            // Only allow double jump after releasing key mid-air
            if (!this.onGround) this.usedDoubleJump = false;
        }
        // Reset double jump lock on landing
        if (this.onGround) this.usedDoubleJump = false;

        // Drop through platform (one-press trigger)
        if (settings.dropThrough === 0 && keys[downKey] && this.onGround && !this.dropPressed) {
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
        if (!keys[downKey]) {
            this.dropPressed = false;
            this.platSpawnPressed = false;
        }

        // Platform spawn: press down while in air (Lava Rise, with charges)
        // Must be truly airborne (not dropping through a platform)
        if (settings.gameMode === 4 && this.platformCharges > 0 && !this.onGround && !this.dropThrough && keys[downKey] && !this.platSpawnPressed) {
            this.platSpawnPressed = true;
            this.dropPressed = true; // prevent immediate drop-through on landing
            this.platformCharges--;
            // Spawn a temporary platform below the player's feet
            const pw = 100;
            const px = Math.max(0, Math.min(800 - pw, this.x + this.w / 2 - pw / 2));
            const py = this.y + this.h + 20;
            const newPlat = { x: px, y: py, w: pw, h: 16, temporary: true, spawnTime: Date.now() };
            platforms.push(newPlat);
            spawnParticles(px + pw / 2, py, '#bb88ff', 8);
        }

        // Swap activation: press dedicated swap key (P1: E, P2: RShift)
        const swapKey = this === player1 ? 'KeyE' : 'ShiftRight';
        if (this.swapCharges > 0 && keys[swapKey] && !this.swapPressed) {
            this.swapPressed = true;
            this.swapCharges--;
            const other = this === player1 ? player2 : player1;
            const tmpX = this.x, tmpY = this.y;
            this.x = other.x; this.y = other.y;
            other.x = tmpX; other.y = tmpY;
            // Swap velocities too for fairness
            const tmpVx = this.vx, tmpVy = this.vy;
            this.vx = other.vx; this.vy = other.vy;
            other.vx = tmpVx; other.vy = tmpVy;
            spawnParticles(this.x + 16, this.y + 20, '#ff66ff', 12);
            spawnParticles(other.x + 16, other.y + 20, '#ff66ff', 12);
        }
        if (!keys[swapKey]) this.swapPressed = false;

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

        // Apply wind zone force (Lava Rise mode)
        if (settings.gameMode === 4 && lavaState.windZones) {
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;
            for (const wz of lavaState.windZones) {
                if (cx > wz.x && cx < wz.x + wz.w && cy > wz.y && cy < wz.y + wz.h) {
                    // Stronger wind on normal ground (no ice sliding to counteract)
                    const onNormalGround = this.onGround && this.standingOn && !this.standingOn.ice;
                    const windMult = onNormalGround ? 2.0 : 1.0;
                    this.vx += wz.strength * windMult;
                }
            }
        }

        this.vy += GRAVITY_OPTIONS[settings.gravity].value;
        this.x += this.vx;

        if (this.x < 0) this.x = 0;
        if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;

        // Detect sliding off an ice platform before vertical collision
        if (this._prevStandingOn && this._prevStandingOn.ice) {
            const pp = this._prevStandingOn;
            const centerX = this.x + this.w / 2;
            if (centerX <= pp.x || centerX >= pp.x + pp.w) {
                // Player center slid past the edge - mark platform to ignore
                this.slidOffPlatform = pp;
            }
        }

        this.y += this.vy;
        this.onGround = false;
        this.standingOn = null; // track which platform we're standing on

        // Clear slidOff once player is well below the platform
        if (this.slidOffPlatform) {
            if (this.y > this.slidOffPlatform.y + this.slidOffPlatform.h + 20) {
                this.slidOffPlatform = null;
            }
        }

        for (const p of platforms) {
            // Skip the platform we're dropping through
            if (this.dropThrough && p === this.dropPlatform) continue;
            // Skip the ice platform we just slid off
            if (this.slidOffPlatform && p === this.slidOffPlatform) continue;

            if (
                this.x + this.w > p.x &&
                this.x < p.x + p.w &&
                this.y + this.h > p.y &&
                this.y + this.h < p.y + p.h + this.vy + 2 &&
                this.vy >= 0
            ) {
                this.y = p.y - this.h;
                if (p.bounce) {
                    // Bounce platform: launch upward!
                    const gravScale = GRAVITY_OPTIONS[settings.gravity].value / 0.6;
                    this.vy = JUMP_FORCE * Math.sqrt(gravScale) * 1.6;
                    this.onGround = false;
                    p.bounceAnim = 8; // visual feedback
                } else {
                    this.vy = 0;
                    this.onGround = true;
                    this.standingOn = p;
                    this.slidOffPlatform = null; // landed on something else, clear
                }
            }
        }

        this._prevStandingOn = this.standingOn;

        // Reset drop-through once we've fully cleared the platform
        if (this.dropThrough && this.dropPlatform) {
            if (this.y > this.dropPlatform.y + this.dropPlatform.h) {
                this.dropThrough = false;
                this.dropPlatform = null;
                // Allow continuous drop-through while holding down
                if (keys[downKey]) this.dropPressed = false;
            }
        }

        // Frozen lava acts as walkable ground
        if (settings.gameMode === 4 && lavaState.freezeUntil && Date.now() < lavaState.freezeUntil) {
            const frozenY = lavaState.lavaY;
            if (
                this.y + this.h > frozenY &&
                this.y + this.h < frozenY + 20 &&
                this.vy >= 0
            ) {
                this.y = frozenY - this.h;
                this.vy = 0;
                this.onGround = true;
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

    _nearPlatformBelow() {
        // Check if player is falling and close above a platform (within 25px)
        if (this.vy < 0) return false; // going up, not about to land
        const feetY = this.y + this.h;
        for (const p of platforms) {
            if (p.bounce) continue; // bounce pads are fine
            if (this.x + this.w > p.x && this.x < p.x + p.w &&
                feetY <= p.y && feetY + 25 > p.y) {
                return true;
            }
        }
        return false;
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
        } else if (type === 'extralife') {
            // Add 1 life (Lava Rise only)
            if (this === player1) lavaState.p1Lives++;
            else if (this === player2) lavaState.p2Lives++;
            spawnCollectBurst(cx, cy, def.color);
        } else if (type === 'doublejump') {
            // Stackable: add 1 double jump charge
            this.doubleJumps++;
            spawnCollectBurst(cx, cy, def.color);
        } else if (type === 'swap') {
            // Stackable: add 1 swap charge to inventory
            this.swapCharges++;
            spawnCollectBurst(cx, cy, def.color);
        } else if (type === 'lavafreeze') {
            // Freeze lava for 5 seconds
            lavaState.freezeUntil = Date.now() + 5000;
            spawnCollectBurst(cx, cy, def.color);
        } else if (type === 'platspawn') {
            // Stackable: add 1 platform spawn charge
            this.platformCharges++;
            spawnCollectBurst(cx, cy, def.color);
        } else if (type === 'invert') {
            // Invert the OTHER player's controls for 30 seconds
            const other = this === player1 ? player2 : player1;
            other.invertedUntil = Date.now() + POWERUP_TYPES.invert.duration;
            spawnCollectBurst(cx, cy, def.color);
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

        // Inverted controls red blink
        const isInverted = this.invertedUntil && Date.now() < this.invertedUntil;

        drawSprite(frame, this.x, this.y, PX, flipX);

        // Red overlay blink when inverted
        if (isInverted && Math.floor(frameCount / 8) % 2 === 0) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#ff2244';
            ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
            ctx.globalAlpha = 1;
        }

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

        // Inverted controls effect (pink/red swirl)
        if (this.invertedUntil && Date.now() < this.invertedUntil) {
            ctx.fillStyle = '#ff4488';
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameCount * 0.3);
            ctx.fillRect(this.x - 1, this.y - 4, this.w + 2, 4);
            ctx.fillRect(this.x - 1, this.y + this.h, this.w + 2, 4);
            ctx.globalAlpha = 1;
            // "?" above player
            ctx.fillStyle = '#ff4488';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('?', this.x + this.w / 2, this.y - 16);
        }

        // Super jump glow effect (yellow glow at feet)
        if (this.hasPowerup('superjump')) {
            ctx.fillStyle = '#ffff44';
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameCount * 0.2);
            ctx.fillRect(this.x - 1, this.y + this.h - 6, this.w + 2, 6);
            ctx.globalAlpha = 1;
        }

        // No knockback shield effect
        if (this.hasPowerup('noknockback')) {
            ctx.fillStyle = '#aaaaaa';
            ctx.globalAlpha = 0.25 + 0.15 * Math.sin(frameCount * 0.15);
            ctx.fillRect(this.x - 3, this.y - 3, this.w + 6, this.h + 6);
            ctx.globalAlpha = 1;
        }

        // Speed boost trail effect
        if (this.hasPowerup('speedboost')) {
            ctx.fillStyle = '#44ffaa';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(this.x - 4 * this.facing, this.y + this.h - 6, 4, 6);
            ctx.fillRect(this.x - 8 * this.facing, this.y + this.h - 4, 3, 4);
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

        // Double jump charges indicator (persistent, shown as icons)
        if (this.doubleJumps > 0) {
            const djY = barY + barH + 3 + puBarOffset * 5;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const label = 'x' + this.doubleJumps;
            const djText = '\u2191' + label;
            // Small background for readability
            const tw = ctx.measureText(djText).width;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(this.x + this.w / 2 - tw / 2 - 2, djY - 2, tw + 4, 9);
            ctx.fillStyle = '#66ddff';
            ctx.fillText(djText, this.x + this.w / 2, djY + 5);
        }

        // Platform spawn charges indicator
        if (this.platformCharges > 0) {
            const pcY = barY + barH + 3 + puBarOffset * 5 + (this.doubleJumps > 0 ? 11 : 0);
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const pcText = '_x' + this.platformCharges;
            const pcW = ctx.measureText(pcText).width;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(this.x + this.w / 2 - pcW / 2 - 2, pcY - 2, pcW + 4, 9);
            ctx.fillStyle = '#bb88ff';
            ctx.fillText(pcText, this.x + this.w / 2, pcY + 5);
        }

        // Swap charges indicator
        if (this.swapCharges > 0) {
            const scY = barY + barH + 3 + puBarOffset * 5 + (this.doubleJumps > 0 ? 11 : 0) + (this.platformCharges > 0 ? 11 : 0);
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const swapLabel = this === player1 ? '⇄x' + this.swapCharges + ' [E]' : '⇄x' + this.swapCharges + ' [R⇧]';
            const scW = ctx.measureText(swapLabel).width;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(this.x + this.w / 2 - scW / 2 - 2, scY - 2, scW + 4, 9);
            ctx.fillStyle = '#ff66ff';
            ctx.fillText(swapLabel, this.x + this.w / 2, scY + 5);
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
    JUMP_REACH: 130,
    STUCK_LIMIT: 40,
    GIVEUP_COOLDOWN: 80, // shorter cooldown, try again sooner

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
        let currentX = targetX; // track horizontal position too
        let safety = 15; // more steps allowed

        while (targetY < currentY - this.JUMP_REACH && safety-- > 0) {
            let bestPlat = null;
            let bestScore = Infinity;
            for (const p of platforms) {
                if (p.isGround) continue;
                if (p.breakable && p.breakTimer > 0) continue; // skip breaking platforms
                // Reachable: above current position, within jump range
                // Use slightly expanded range for diagonal jumps
                const reach = this.JUMP_REACH + 20;
                if (p.y < currentY && p.y > currentY - reach) {
                    const platCX = p.x + p.w / 2;
                    // Score: prefer close to us and high
                    let score = Math.abs(platCX - currentX) * 0.7 + Math.abs(platCX - targetX) * 0.3;
                    score += (currentY - p.y) * -0.5; // higher = better
                    if (p.breakable) score += 50; // avoid breakable
                    if (p.bounce) score -= 20; // bouncy is good
                    if (score < bestScore) {
                        bestScore = score;
                        bestPlat = p;
                    }
                }
            }
            if (!bestPlat) break;
            path.push(bestPlat);
            currentX = bestPlat.x + bestPlat.w / 2;
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

        // --- Decide target: ammo (if needed) > valuable power-up > human ---
        let targetX, targetY;
        let chasingPowerup = false;

        // Prioritize ammo pickups when low on ammo
        let closestAmmo = null;
        let closestAmmoDist = Infinity;
        if (settings.infiniteAmmo === 1 && aiPlayer.ammo <= 2) {
            for (const ap of ammoPickups) {
                const d = Math.hypot(ap.x + ap.w / 2 - aiCX, ap.y + ap.h / 2 - aiCY);
                if (d < closestAmmoDist) { closestAmmoDist = d; closestAmmo = ap; }
            }
        }

        // Smart power-up selection: prioritize by value, not just distance
        let bestPU = null;
        let bestPUScore = -Infinity;
        const isOneShot = settings.gameMode === 1;
        for (const pu of powerups) {
            const d = Math.hypot(pu.x + pu.w / 2 - aiCX, pu.y + pu.h / 2 - aiCY);
            if (d > 350) continue; // too far, not worth chasing

            let value = 1;
            // Value power-ups based on game state
            if (pu.type === 'heal' && !isOneShot) value = aiPlayer.hp < 60 ? 5 : 1;
            else if (pu.type === 'invincible') value = isOneShot ? 6 : 3;
            else if (pu.type === 'damage') value = 3;
            else if (pu.type === 'megaknockback') value = 2.5;
            else if (pu.type === 'rapidfire') value = 2;
            else if (pu.type === 'nocooldown') value = 2;
            else if (pu.type === 'noknockback') value = 1.5;
            else if (pu.type === 'speedboost') value = 1.5;
            else if (pu.type === 'doublejump') value = 1;
            else if (pu.type === 'superjump') value = 1;
            else if (pu.type === 'swap') value = 0.8;
            else if (pu.type === 'invert') value = 2;
            // Skip lava-only PUs in non-lava modes
            if (pu.type === 'extralife' || pu.type === 'lavafreeze' || pu.type === 'platspawn') continue;

            const score = value * 100 - d;
            if (score > bestPUScore) { bestPUScore = score; bestPU = pu; }
        }

        // When out of ammo, prioritize ammo pickups over everything
        if (closestAmmo && (aiPlayer.ammo <= 0 || !bestPU)) {
            targetX = closestAmmo.x + closestAmmo.w / 2;
            targetY = closestAmmo.y + closestAmmo.h / 2;
            chasingPowerup = true;
        } else if (bestPU && bestPUScore > 0) {
            targetX = bestPU.x + bestPU.w / 2;
            targetY = bestPU.y + bestPU.h / 2;
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

            // Shoot to switch tagger via bullet (very aggressive)
            if (Math.abs(dy) < 80 && Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy) {
                this.wantsShoot = true;
            }

            // Predict where human is going and intercept
            const humanVx = humanPlayer.vx || 0;
            const predictX = humanCX + humanVx * 15; // predict 15 frames ahead
            const interceptX = (predictX + humanCX) / 2; // move toward predicted position

            // Chase: walk toward human (or intercept point)
            const chaseX = dist < 150 ? humanCX : interceptX;
            const chaseDx = chaseX - aiCX;
            if (Math.abs(chaseDx) > 10) {
                if (chaseDx > 0) this.wantsRight = true;
                else this.wantsLeft = true;
            }

            // If human is above, climb toward them
            if (humanCY < aiCY - 40) {
                const targetKey = 'tag_chase_' + Math.round(humanCX / 40) + ',' + Math.round(humanCY / 40);
                const needsMultiClimb = humanCY < aiFeetY - this.JUMP_REACH;
                const curPlat2 = this._getPlatformOf(aiPlayer);
                const targetPlat = this._findPlatformAt(humanCX, humanCY);
                const needsEdgeJump = !needsMultiClimb && curPlat2 && targetPlat &&
                    curPlat2 !== targetPlat && humanCY < aiCY - 30;

                if ((needsMultiClimb || needsEdgeJump) && this.giveUpCooldown <= 0) {
                    if (this.pathTarget !== targetKey || (this.path.length === 0 && needsMultiClimb)) {
                        this.path = needsMultiClimb ? this._buildPath(aiFeetY, humanCX, humanCY) : [];
                        this.pathStep = 0;
                        this.pathTarget = targetKey;
                        this.stuckTimer = 0;
                    }
                    const oldStep = this.pathStep;
                    if (this.pathStep < this.path.length) {
                        if (curPlat2 === this.path[this.pathStep]) { this.pathStep++; this.stuckTimer = 0; }
                    }
                    if (oldStep === this.pathStep) this.stuckTimer++;

                    if (this.stuckTimer > this.STUCK_LIMIT) {
                        this.path = []; this.pathStep = 0; this.stuckTimer = 0;
                        this.giveUpCooldown = 40;
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

            // Jump to close the gap if close and on ground
            if (dist < 120 && dist > 40 && aiPlayer.onGround && Math.random() < 0.1) {
                this.wantsJump = true;
            }

            // If human is below, drop down immediately
            if (settings.dropThrough === 0 && humanCY > aiFeetY + 30 && aiPlayer.onGround) {
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

            // Shoot at human to switch tagger onto them (very aggressive shooting while fleeing)
            if (Math.abs(dy) < 80 && Math.random() < AI_DIFF_OPTIONS[settings.aiDiff].accuracy * 1.2) {
                this.wantsShoot = true;
            }

            // Predict human approach direction
            const humanVx = humanPlayer.vx || 0;
            const humanApproaching = (dx > 0 && humanVx < -1) || (dx < 0 && humanVx > 1) || dist < 150;

            // Calculate best flee direction (away from human, away from walls)
            let fleeDir = dx > 0 ? -1 : 1; // opposite of human
            // Avoid getting cornered
            if (aiCX < 80 && fleeDir < 0) fleeDir = 1;
            if (aiCX > canvas.width - 80 && fleeDir > 0) fleeDir = -1;

            if (dist < 120 || (dist < 200 && humanApproaching)) {
                // Close or approaching: run + jump evasion
                if (fleeDir > 0) this.wantsRight = true;
                else this.wantsLeft = true;

                if (dist < 80 && aiPlayer.onGround) {
                    this.wantsJump = true; // emergency jump
                }
            } else if (dist < 300) {
                // Medium distance: try to get to a different vertical level
                const curPlat2 = this._getPlatformOf(aiPlayer);
                const sameLevel = Math.abs(aiCY - humanCY) < 50;

                if (sameLevel) {
                    // Find best escape platform (far from human, reachable)
                    let bestPlat = null;
                    let bestScore = -Infinity;
                    for (const p of platforms) {
                        if (p.isGround || p === curPlat2) continue;
                        const pCX = p.x + p.w / 2;
                        const dFromHuman = Math.hypot(pCX - humanCX, p.y - humanCY);
                        const dFromAI = Math.hypot(pCX - aiCX, p.y - aiCY);
                        if (dFromAI > 250) continue; // too far to reach
                        const score = dFromHuman * 1.5 - dFromAI;
                        if (score > bestScore) { bestScore = score; bestPlat = p; }
                    }

                    if (bestPlat) {
                        const platCX = bestPlat.x + bestPlat.w / 2;
                        if (bestPlat.y < aiCY) {
                            this._climbTo(aiPlayer, bestPlat, platCX);
                        } else if (settings.dropThrough === 0 && bestPlat.y > aiFeetY) {
                            this.wantsDown = true;
                        }
                    } else {
                        if (fleeDir > 0) this.wantsRight = true;
                        else this.wantsLeft = true;
                    }
                } else {
                    // Different level: maintain position, random movement
                    if (Math.random() < 0.08) {
                        if (Math.random() < 0.5) this.wantsLeft = true;
                        else this.wantsRight = true;
                    }
                }
            }
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

        // Check if AI is on the hill
        const onHill = kothState.currentHolder === aiPlayer;
        const accuracy = AI_DIFF_OPTIONS[settings.aiDiff].accuracy;

        if (onHill) {
            // Only collect PUs and ammo when already on the hill
            for (const pu of powerups) {
                const d = Math.hypot(pu.x + pu.w/2 - aiCX, pu.y + pu.h/2 - aiCY);
                if (d < 80) {
                    const puX = pu.x + pu.w / 2;
                    if (Math.abs(puX - aiCX) > 10) {
                        if (puX > aiCX) this.wantsRight = true;
                        else this.wantsLeft = true;
                    }
                    break;
                }
            }
            // ON THE HILL: defensive positioning + aggressive shooting
            const dxHill = hillCX - aiCX;

            // Stay centered but allow slight repositioning to dodge
            if (Math.abs(dxHill) > 30) {
                if (dxHill > 0) this.wantsRight = true;
                else this.wantsLeft = true;
            }

            // Always face and shoot at enemy (very aggressive)
            aiPlayer.facing = humanCX > aiCX ? 1 : -1;
            if (Math.random() < accuracy * 1.1) {
                this.wantsShoot = true;
            }

            // Jump to dodge incoming bullets while staying on hill
            this._dodgeBullets(aiPlayer, humanPlayer);

            // If enemy is climbing up, shoot them down
            if (humanCY < aiCY && Math.abs(humanCX - hillCX) < hillPlat.w) {
                // Enemy approaching from below - shoot aggressively
                this.wantsShoot = true;
            }
        } else {
            // NOT ON HILL: follow pre-programmed route step by step
            const curPlat = this._getPlatformOf(aiPlayer);

            if (!curPlat) {
                // In the air — steer toward last known target or hill
                const tgt = this._kothTarget || hillPlat;
                const tgtCX = tgt.x + tgt.w / 2;
                if (aiCX < tgtCX - 15) this.wantsRight = true;
                else if (aiCX > tgtCX + 15) this.wantsLeft = true;
            } else {
                // On a platform — find next step and climb to it
                const nextPlat = this._kothNextStep(curPlat, hillPlat, aiCX, aiFeetY);
                if (nextPlat && nextPlat !== curPlat) {
                    this._kothTarget = nextPlat; // remember for air steering
                    this._climbTo(aiPlayer, nextPlat, nextPlat.x + nextPlat.w / 2);
                } else {
                    // No next step found — walk toward hill
                    this._walkTo(aiPlayer, hillCX, hillCY);
                    if (aiPlayer.onGround && hillCY < aiCY - 30) {
                        this.wantsJump = true;
                    }
                }
            }

            // Shoot at enemy while climbing
            if (Math.abs(humanCY - aiCY) < 70) {
                aiPlayer.facing = humanCX > aiCX ? 1 : -1;
                if (Math.random() < accuracy * 0.7) {
                    this.wantsShoot = true;
                }
            }

            this._dodgeBullets(aiPlayer, humanPlayer);
        }
    },

    // KOTH: Pre-programmed route to the hill.
    // Summit map layout:
    //   Ground (y=470)
    //   Left:  (20,390) → (160,320) → (40,250) → Center(280,280) → Hill(320,180)
    //   Right: (660,390) → (540,320) → (670,250) → Center(280,280) → Hill(320,180)
    //   Flanking: (80,160) and (640,160) can reach hill directly
    _kothNextStep(curPlat, hillPlat, aiCX, aiFeetY) {
        if (!curPlat) return hillPlat;
        if (curPlat === hillPlat || curPlat.isHill) return hillPlat;

        const py = curPlat.y;
        const px = curPlat.x;
        const pw = curPlat.w;
        const pcx = px + pw / 2;

        // Find platforms by approximate position
        const findPlat = (tx, ty, tolerance) => {
            tolerance = tolerance || 30;
            return platforms.find(p => Math.abs(p.y - ty) < tolerance && Math.abs(p.x + p.w/2 - tx) < tolerance + p.w/2);
        };

        // On ground (y~470): go to nearest first step
        if (curPlat.isGround || py > 440) {
            // Pick left or right path based on AI position
            if (aiCX < 400) {
                return findPlat(80, 390, 40) || findPlat(400, 280, 80); // left step 1
            } else {
                return findPlat(720, 390, 40) || findPlat(400, 280, 80); // right step 1
            }
        }

        // Left path step 1 (20,390,w=120) → step 2 (160,320)
        if (py > 370 && py < 410 && pcx < 400) {
            return findPlat(210, 320, 40);
        }
        // Right path step 1 (660,390,w=120) → step 2 (540,320)
        if (py > 370 && py < 410 && pcx >= 400) {
            return findPlat(590, 320, 40);
        }

        // Left path step 2 (160,320) → step 3 (40,250)
        if (py > 300 && py < 340 && pcx < 400) {
            return findPlat(85, 250, 40);
        }
        // Right path step 2 (540,320) → step 3 (670,250)
        if (py > 300 && py < 340 && pcx >= 400) {
            return findPlat(715, 250, 40);
        }

        // Left path step 3 (40,250) → center (280,280) or directly to hill
        if (py > 230 && py < 270 && pcx < 200) {
            return findPlat(400, 280, 80) || hillPlat;
        }
        // Right path step 3 (670,250) → center (280,280) or directly to hill
        if (py > 230 && py < 270 && pcx > 600) {
            return findPlat(400, 280, 80) || hillPlat;
        }

        // Center platform (280,280,w=240) → hill (320,180)
        if (py > 260 && py < 300 && pcx > 250 && pcx < 550) {
            return hillPlat;
        }

        // Flanking platforms (80,160) or (640,160) → hill directly
        if (py > 140 && py < 180) {
            return hillPlat;
        }

        // Fallback: find closest platform that is higher and closer to hill
        let best = null;
        let bestScore = Infinity;
        for (const p of platforms) {
            if (p === curPlat || p.isGround) continue;
            if (p.y >= py) continue; // must be higher
            const dist = Math.abs(p.x + p.w/2 - aiCX) + Math.abs(p.y - py) * 0.5;
            const hillDist = Math.abs(p.x + p.w/2 - (hillPlat.x + hillPlat.w/2)) + Math.abs(p.y - hillPlat.y);
            const score = dist + hillDist * 0.3;
            if (score < bestScore) { bestScore = score; best = p; }
        }
        return best || hillPlat;
    },

    // Lava Rise AI: climb upward, fight when safe, stay on screen
    _updateLava(aiPlayer, humanPlayer) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY = aiPlayer.y + aiPlayer.h / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const humanCX = humanPlayer.x + humanPlayer.w / 2;
        const humanCY = humanPlayer.y + humanPlayer.h / 2;

        // --- Screen boundaries (world coords) ---
        const screenTop = -lavaState.cameraY;
        const screenBottom = 500 - lavaState.cameraY;

        // --- Lava danger assessment ---
        const lavaDistance = lavaState.lavaY - aiFeetY;
        const criticalZone = lavaDistance < 80;
        const dangerZone = lavaDistance < 160;
        const safeZone = lavaDistance > 220;

        // --- Look-ahead: find the 3 best climb targets (multi-step planning) ---
        const climbTargets = this._findClimbTargets(aiPlayer, aiFeetY, screenTop, 3);
        const climbTarget = climbTargets.length > 0 ? climbTargets[0] : null;

        if (this.giveUpCooldown > 0) this.giveUpCooldown--;

        // --- Use inventory power-ups intelligently ---
        this._useLavaInventory(aiPlayer, humanPlayer, lavaDistance, criticalZone);

        // --- While in the air: steer toward current target, smart double jump ---
        if (!aiPlayer.onGround) {
            this._lavaAirControl(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, climbTarget);
            return;
        }
        this._djRelease = false;

        // --- ON GROUND: flee breakable platform if it's breaking ---
        if (aiPlayer.standingOn && aiPlayer.standingOn.breakable && aiPlayer.standingOn.breakTimer > 0) {
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, true);
            } else {
                this.wantsJump = true;
                if (aiCX < 400) this.wantsRight = true;
                else this.wantsLeft = true;
            }
            return;
        }

        // --- STUCK DETECTION: If no climbTarget, explore sideways to find a path ---
        if (!climbTarget && aiPlayer.standingOn) {
            // Walk to the edge of the current platform to find platforms from a different position
            const curPlat = aiPlayer.standingOn;
            if (!this._exploreDir) this._exploreDir = 1;
            if (!this._exploreTimer) this._exploreTimer = 0;
            this._exploreTimer++;

            // Switch direction periodically
            if (this._exploreTimer > 60) {
                this._exploreDir *= -1;
                this._exploreTimer = 0;
            }

            // Walk to edge in explore direction
            const targetEdge = this._exploreDir > 0 ? curPlat.x + curPlat.w - 15 : curPlat.x + 15;
            if (Math.abs(aiCX - targetEdge) > 10) {
                if (targetEdge > aiCX) this.wantsRight = true;
                else this.wantsLeft = true;
            } else {
                // At edge: try jumping off to reach something
                if (dangerZone) {
                    this.wantsJump = true;
                    if (this._exploreDir > 0) this.wantsRight = true;
                    else this.wantsLeft = true;
                }
            }

            // If in danger and stuck with no target, use emergency resources
            if (dangerZone && aiPlayer.platformCharges > 0) {
                this.wantsJump = true;
                if (aiCX < 400) this.wantsRight = true;
                else this.wantsLeft = true;
            }
        } else {
            this._exploreTimer = 0;
        }

        // --- ON GROUND: Nearby power-up collection (only useful ones) ---
        const puTarget = this._findUsefulPowerup(aiPlayer, aiFeetY, screenTop);
        if (puTarget && !criticalZone) {
            const puCX = puTarget.x + puTarget.w / 2;
            const puCY = puTarget.y + puTarget.h / 2;
            const puDist = Math.hypot(puCX - aiCX, puCY - aiCY);
            if (puDist < 150 || (safeZone && puDist < 250)) {
                const puPlat = this._findPlatformAt(puCX, puCY + 20);
                if (puPlat && puPlat === aiPlayer.standingOn) {
                    this._walkTo(aiPlayer, puCX, puCY);
                } else if (puPlat) {
                    this._navigateToPlat(aiPlayer, puPlat, false);
                }
            }
        }

        // --- PRIORITY 1: Critical lava danger → climb NOW or use emergency ---
        if (criticalZone) {
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, true);
            } else {
                // PANIC MODE: jump + platform spawn + double jump
                this.wantsJump = true;
                // Jump toward center of screen (more platforms there usually)
                if (aiCX < 400) this.wantsRight = true;
                else this.wantsLeft = true;
                // Spawn platform if we have charges
                if (aiPlayer.platformCharges > 0) {
                    this.wantsDown = true;
                }
            }
            this._dodgeBullets(aiPlayer, humanPlayer);
            return;
        }

        // --- PRIORITY 2: Danger zone → climb urgently, shoot if easy ---
        if (dangerZone) {
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, true);
            }
            // Aggressive combat while climbing
            this._lavaShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, 0.5);
            this._dodgeBullets(aiPlayer, humanPlayer);
            return;
        }

        // --- PRIORITY 3: Comfortable → climb steadily + full combat ---
        if (climbTarget && !safeZone) {
            this._navigateToPlat(aiPlayer, climbTarget, false);
        }

        // --- Full combat layer ---
        if (safeZone) {
            // Very safe: aggressive combat, always keep climbing too
            if (climbTarget) {
                this._navigateToPlat(aiPlayer, climbTarget, false);
            }
            const humanDist = Math.hypot(humanCX - aiCX, humanCY - aiCY);
            const humanOnSameLevel = Math.abs(humanCY - aiCY) < 60;

            if (humanOnSameLevel && humanDist < 350) {
                this._fightHuman(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);
            } else {
                this._lavaShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, 1.0);
            }
        } else {
            this._lavaShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, 0.7);
        }

        this._dodgeBullets(aiPlayer, humanPlayer);
    },

    // Smart air control for lava mode
    _lavaAirControl(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, climbTarget) {
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        const lavaDistAir = lavaState.lavaY - aiFeetY;

        // When falling, find the best landable platform to steer toward
        if (aiPlayer.vy > 0) {
            // Look for platforms below and slightly above to land on
            let bestLand = null;
            let bestLandScore = -Infinity;
            for (const p of platforms) {
                // Platforms we can land on: below us but above lava
                if (p.y < aiFeetY - 5) continue; // above our feet
                if (p.y > aiFeetY + 200) continue; // too far below
                if (p.y > lavaState.lavaY - 20) continue; // in lava
                const hDist = Math.abs(p.x + p.w/2 - aiCX);
                if (hDist > 200) continue; // too far sideways
                let score = -hDist * 1.0 + p.w * 0.5;
                if (p.y < aiFeetY + 50) score += 50; // prefer close platforms
                if (p.breakable && p.breakTimer > 0) score -= 500;
                if (score > bestLandScore) { bestLandScore = score; bestLand = p; }
            }

            if (bestLand) {
                const platCX = bestLand.x + bestLand.w / 2;
                if (aiCX < platCX - 8) this.wantsRight = true;
                else if (aiCX > platCX + 8) this.wantsLeft = true;
            } else if (climbTarget) {
                // No landable platform - steer toward climb target
                const platCX = climbTarget.x + climbTarget.w / 2;
                if (aiCX < platCX - 10) this.wantsRight = true;
                else if (aiCX > platCX + 10) this.wantsLeft = true;
            }
        } else if (climbTarget) {
            // Rising: steer toward climb target
            const platCX = climbTarget.x + climbTarget.w / 2;
            if (aiCX < platCX - 10) this.wantsRight = true;
            else if (aiCX > platCX + 10) this.wantsLeft = true;
        }

        // Shoot while airborne
        this._opportunisticShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY);

        // Smart double jump usage
        if (aiPlayer.doubleJumps > 0 && aiPlayer.vy > 0.5) {
            const hasPlatBelow = this._hasPlatformBelow(aiPlayer, 70);
            // Use double jump when: near lava, OR falling fast with nothing below
            const needsDJ = lavaDistAir < 160 || (aiPlayer.vy > 3 && !hasPlatBelow);

            if (needsDJ) {
                if (this._djRelease) {
                    this.wantsJump = true;
                    this._djRelease = false;
                } else {
                    this.wantsJump = false;
                    this._djRelease = true;
                }
            }
        }

        // Spawn platform mid-air as last resort
        if (aiPlayer.platformCharges > 0 && aiPlayer.vy > 2) {
            if (!this._hasPlatformBelow(aiPlayer, 50) && lavaDistAir < 100) {
                this.wantsDown = true;
            }
        }
    },

    // Check if there's a platform below within reach
    _hasPlatformBelow(aiPlayer, range) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiFeetY = aiPlayer.y + aiPlayer.h;
        for (const p of platforms) {
            if (p.y > aiFeetY && p.y < aiFeetY + range &&
                aiCX > p.x - 10 && aiCX < p.x + p.w + 10) {
                return true;
            }
        }
        return false;
    },

    // Use inventory items (swap, platform spawn) intelligently
    _useLavaInventory(aiPlayer, humanPlayer, lavaDistance, critical) {
        // Use swap if human is higher and we're in danger
        if (aiPlayer.swapCharges > 0) {
            const humanFeetY = humanPlayer.y + humanPlayer.h;
            const aiFeetY = aiPlayer.y + aiPlayer.h;
            // Swap if human is significantly higher (>100px) and we're in danger
            if (humanFeetY < aiFeetY - 100 && lavaDistance < 120) {
                const swapKey = aiPlayer === player1 ? 'KeyE' : 'ShiftRight';
                keys[swapKey] = true;
            }
        }
    },

    // Find power-ups that are actually useful in lava mode
    _findUsefulPowerup(aiPlayer, aiFeetY, screenTop) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const usefulTypes = ['extralife', 'doublejump', 'superjump', 'invincible', 'speedboost',
                             'platspawn', 'lavafreeze', 'heal', 'megaknockback', 'damage'];
        let best = null;
        let bestDist = Infinity;

        for (const pu of powerups) {
            if (!usefulTypes.includes(pu.type)) continue;
            // Skip if too far below or above screen
            if (pu.y > lavaState.lavaY - 20) continue;
            if (pu.y < screenTop) continue;
            // Skip if too far above us (don't go backwards)
            if (pu.y < aiFeetY - 150) continue;

            const dist = Math.hypot(pu.x + pu.w/2 - aiCX, pu.y + pu.h/2 - (aiFeetY - aiPlayer.h/2));

            // Prioritize by type
            let priority = 1;
            if (pu.type === 'extralife') priority = 0.3; // very valuable
            if (pu.type === 'doublejump') priority = 0.4;
            if (pu.type === 'lavafreeze') priority = 0.5;
            if (pu.type === 'platspawn') priority = 0.5;
            if (pu.type === 'superjump') priority = 0.6;

            const effectiveDist = dist * priority;
            if (effectiveDist < bestDist) {
                bestDist = effectiveDist;
                best = pu;
            }
        }
        return best;
    },

    // Lava-mode shooting with configurable aggression
    _lavaShoot(aiPlayer, humanPlayer, aiCX, aiCY, humanCX, humanCY, aggrMult) {
        const dy = Math.abs(humanCY - aiCY);
        const dx = humanCX - aiCX;
        const accuracy = AI_DIFF_OPTIONS[settings.aiDiff].accuracy * aggrMult;

        if (dy < 50) {
            aiPlayer.facing = dx > 0 ? 1 : -1;
            if (Math.random() < accuracy) this.wantsShoot = true;
        } else if (humanCY > aiCY && dy < 120 && Math.abs(dx) < 80) {
            aiPlayer.facing = dx > 0 ? 1 : -1;
            if (Math.random() < accuracy * 0.4) this.wantsShoot = true;
        }
    },

    // Find the N best reachable platforms above AI (multi-step lookahead)
    _findClimbTargets(aiPlayer, aiFeetY, screenTop, count) {
        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        let jumpReach = this.JUMP_REACH;

        // WAYPOINT NAVIGATION: If standing on a structure platform, follow the pre-built path
        if (aiPlayer.standingOn && aiPlayer.standingOn.nextWaypoint) {
            let wp = aiPlayer.standingOn.nextWaypoint;
            // Skip breakable platforms that are already breaking
            while (wp && wp.breakable && wp.breakTimer > 0 && wp.nextWaypoint) {
                wp = wp.nextWaypoint;
            }
            // Only follow if waypoint is above lava and on screen
            if (wp && wp.y < lavaState.lavaY - 30 && wp.y >= screenTop) {
                return [wp];
            }
        }

        // First pass: standard reach. If nothing found, expand search radius.
        let candidates = [];
        for (let attempt = 0; attempt < 2; attempt++) {
            candidates = [];
            const reach = attempt === 0 ? jumpReach : jumpReach + 50; // expanded on second try
            for (const p of platforms) {
                if (p.y >= aiFeetY - 10) continue;
                if (p.y < aiFeetY - reach - 30) continue;
                if (p.y > lavaState.lavaY - 30) continue;
                if (p.y < screenTop + 10) continue;
                candidates.push(p);
            }
            if (candidates.length > 0) {
                if (attempt === 1) jumpReach = reach; // use expanded reach for scoring
                break;
            }
        }
        if (candidates.length === 0) return [];

        // Score each platform with lookahead: does it connect to higher platforms?
        const scored = [];
        for (const p of candidates) {
            if (p.y >= aiFeetY - 10) continue; // strict check for actual targets
            if (p.y < aiFeetY - jumpReach) continue;

            const vertDist = aiFeetY - p.y;
            const horizDist = Math.abs(p.x + p.w / 2 - aiCX);

            let score = 0;
            score -= horizDist * 1.2;
            score += vertDist * 0.8; // prefer higher platforms more
            score += p.w * 0.3;
            if (vertDist < 25) score -= 80;
            if (p.breakable) score -= 60;
            if (p.breakable && p.breakTimer > 0) score -= 500;
            if (p.bounce) score += 80; // bounce pads are amazing shortcuts
            if (p.ice) score -= 20;

            // LOOKAHEAD: Check if this platform connects to higher platforms
            let hasUpwardPath = false;
            for (const p2 of candidates) {
                if (p2 === p) continue;
                if (p2.y < p.y && p2.y > p.y - jumpReach) {
                    const h2Dist = Math.abs(p2.x + p2.w / 2 - (p.x + p.w / 2));
                    if (h2Dist < 300) { // reachable from this platform
                        hasUpwardPath = true;
                        // Extra bonus for platforms that lead to good chains
                        score += 30;
                        if (p2.bounce) score += 20;
                        break;
                    }
                }
            }
            // Penalty for dead-end platforms (no upward path)
            if (!hasUpwardPath && vertDist < jumpReach * 0.7) score -= 40;

            // Bonus for platforms with powerups on them
            for (const pu of powerups) {
                if (Math.abs(pu.x + pu.w/2 - (p.x + p.w/2)) < p.w/2 + 10 &&
                    Math.abs(pu.y - p.y) < 30) {
                    score += 50;
                }
            }

            // Difficulty-based noise: Easy AI makes worse choices
            const climbSkill = AI_DIFF_OPTIONS[settings.aiDiff].climbSkill;
            score += (1 - climbSkill) * (Math.random() * 200 - 100);

            scored.push({ plat: p, score });
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(s => s.plat);
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

            const stuckLimit = urgent ? 20 : this.STUCK_LIMIT;
            if (this.stuckTimer > stuckLimit) {
                this.path = [];
                this.pathStep = 0;
                this.stuckTimer = 0;
                this.giveUpCooldown = urgent ? 8 : 25;
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
        const diff = AI_DIFF_OPTIONS[settings.aiDiff];
        const combatIQ = diff.combatIQ;

        aiPlayer.facing = dx > 0 ? 1 : -1;

        // Shoot with accuracy
        if (Math.abs(dy) < 70 && Math.random() < diff.accuracy) {
            this.wantsShoot = true;
        }

        // Combat IQ affects positioning strategy
        if (combatIQ > 0.5) {
            // Medium/Hard: maintain optimal distance
            const optimalMin = 120;
            const optimalMax = 200;

            if (dist < 60) {
                if (dx > 0) this.wantsLeft = true;
                else this.wantsRight = true;
                if (aiPlayer.onGround && Math.random() < 0.3) this.wantsJump = true;
            } else if (dist < optimalMin) {
                if (dx > 0) this.wantsLeft = true;
                else this.wantsRight = true;
            } else if (dist > optimalMax + 50) {
                this._walkTo(aiPlayer, humanCX, humanCY);
            } else {
                // Strafe - more with higher IQ
                if (Math.random() < 0.1 + combatIQ * 0.1) {
                    if (Math.random() < 0.5) this.wantsLeft = true;
                    else this.wantsRight = true;
                }
            }
        } else {
            // Easy: simple walk toward human, no distancing
            if (dist > 150) {
                if (dx > 0) this.wantsRight = true;
                else this.wantsLeft = true;
            } else if (dist < 50) {
                if (dx > 0) this.wantsLeft = true;
                else this.wantsRight = true;
            }
        }

        // Jump tactics - scaled by combatIQ
        if (aiPlayer.onGround) {
            if (humanCY < aiCY - 60 && Math.abs(dx) < 150 && Math.random() < 0.05 + combatIQ * 0.1) {
                this.wantsJump = true;
            } else if (Math.random() < 0.005 + combatIQ * 0.02) {
                this.wantsJump = true;
            }
        }

        // Drop through to chase human below (Medium/Hard only)
        if (combatIQ > 0.4 && settings.dropThrough === 0 && humanCY > aiCY + 60 && aiPlayer.onGround) {
            for (const p of platforms) {
                if (p.isGround) continue;
                if (aiPlayer.x + aiPlayer.w > p.x && aiPlayer.x < p.x + p.w &&
                    Math.abs((aiPlayer.y + aiPlayer.h) - p.y) < 3) {
                    this.wantsDown = true;
                    break;
                }
            }
        }

        // Smart power-up use (Hard only)
        if (combatIQ > 0.8 && aiPlayer.swapCharges > 0 && humanPlayer.hp > aiPlayer.hp * 2) {
            const swapKey = aiPlayer === player1 ? 'KeyE' : 'ShiftRight';
            keys[swapKey] = true;
        }
    },

    _dodgeBullets(aiPlayer, humanPlayer) {
        const diff = AI_DIFF_OPTIONS[settings.aiDiff];
        // Difficulty-based dodge chance - Easy AI barely dodges
        if (Math.random() > diff.dodgeChance) return;

        const aiCX = aiPlayer.x + aiPlayer.w / 2;
        const aiCY2 = aiPlayer.y + aiPlayer.h / 2;

        for (const b of humanPlayer.bullets) {
            const bCY = b.y + b.h / 2;
            const dist = Math.abs(b.x - aiCX);

            if (dist < 180 && Math.abs(bCY - aiCY2) < 35) {
                const heading = b.vx > 0 ? 1 : -1;
                const coming =
                    (heading === 1 && b.x < aiPlayer.x) ||
                    (heading === -1 && b.x > aiPlayer.x + aiPlayer.w);
                if (coming) {
                    if (aiPlayer.onGround) {
                        this.wantsJump = true;
                    }
                    if (dist < 100) {
                        if (Math.random() < 0.5) this.wantsLeft = true;
                        else this.wantsRight = true;
                    }
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
    // Extra life only in Lava Rise mode
    if (settings.gameMode !== 4) types = types.filter(t => !POWERUP_TYPES[t].lavaOnly);
    if (types.length === 0) return;
    // Weighted selection based on each powerup's weight
    let totalWeight = 0;
    for (const t of types) totalWeight += (POWERUP_TYPES[t].weight || 1);
    let roll = Math.random() * totalWeight;
    let type = types[0];
    for (const t of types) {
        roll -= (POWERUP_TYPES[t].weight || 1);
        if (roll <= 0) { type = t; break; }
    }
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
        if (!powerups[i].permanent && now - powerups[i].spawnTime > 10000) {
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
            // Apply knockback (blocked by noknockback powerup)
            if (!player2.hasPowerup('noknockback')) {
                const kb1 = KNOCKBACK_OPTIONS[settings.knockback].force;
                const kbMult1 = player1.hasPowerup('megaknockback') ? 3 : 1;
                if (kb1 > 0) {
                    player2.knockbackVx += (b.vx > 0 ? 1 : -1) * kb1 * kbMult1;
                    player2.vy -= kb1 * 0.5 * kbMult1;
                }
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
            // Apply knockback (blocked by noknockback powerup)
            if (!player1.hasPowerup('noknockback')) {
                const kb2 = KNOCKBACK_OPTIONS[settings.knockback].force;
                const kbMult2 = player2.hasPowerup('megaknockback') ? 3 : 1;
                if (kb2 > 0) {
                    player1.knockbackVx += (b.vx > 0 ? 1 : -1) * kb2 * kbMult2;
                    player1.vy -= kb2 * 0.5 * kbMult2;
                }
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
            // Both die simultaneously: random winner (truly fair)
            gameState = 'dying';
            if (Math.random() < 0.5) {
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
            player1.bullets = [];
            player1.activePowerups = {};
            player1.doubleJumps = 0;
            player1.platformCharges = 0;
            player1.swapCharges = 0;
            player1.invertedUntil = 0;
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
            player2.bullets = [];
            player2.activePowerups = {};
            player2.doubleJumps = 0;
            player2.platformCharges = 0;
            player2.swapCharges = 0;
            player2.invertedUntil = 0;
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
            player1.bullets = [];
            player1.activePowerups = {};
            player1.doubleJumps = 0;
            player1.platformCharges = 0;
            player1.swapCharges = 0;
            player1.invertedUntil = 0;
            tagState.lastSwitch = Date.now();
        }
        if (player2.hp <= 0) {
            stats.p2.deaths++;
            player2.hp = HP_OPTIONS[settings.hp];
            player2.x = 650;
            player2.y = 400;
            player2.vx = 0;
            player2.vy = 0;
            player2.knockbackVx = 0;
            player2.bullets = [];
            player2.activePowerups = {};
            player2.doubleJumps = 0;
            player2.platformCharges = 0;
            player2.swapCharges = 0;
            player2.invertedUntil = 0;
            tagState.lastSwitch = Date.now();
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
        } else if (p.breakable) {
            // Breakable platform: reddish/orange with accelerating wobble
            const breakProgress = p.breakTimer > 0 ? 1 - (p.breakTimer / 150) : 0; // 0 = just started, 1 = about to break
            const wobbleStrength = breakProgress * breakProgress * 6; // quadratic ramp: slow start, strong end
            const wobbleSpeed = 0.1 + breakProgress * 0.4; // faster oscillation over time
            const wobbleX = p.breakTimer > 0 ? Math.sin(Date.now() * wobbleSpeed) * wobbleStrength : 0;
            const wobbleY = p.breakTimer > 0 ? Math.cos(Date.now() * wobbleSpeed * 1.3) * wobbleStrength * 0.4 : 0;
            const dx = p.x + wobbleX;
            const dy = p.y + wobbleY;
            // Draw cracked/reddish platform
            ctx.fillStyle = p.breakTimer > 0 ? '#8b3a1a' : '#a04520';
            ctx.fillRect(dx, dy, p.w, p.h);
            // Crack lines
            ctx.fillStyle = '#5a2010';
            for (let cx = dx + 12; cx < dx + p.w - 8; cx += 18 + Math.sin(cx) * 6) {
                ctx.fillRect(cx, dy + 3, 8, 2);
                ctx.fillRect(cx + 4, dy + 8, 6, 2);
            }
            // Edge highlights (orange tint)
            ctx.fillStyle = '#d4703a';
            ctx.fillRect(dx, dy, p.w, 2);
            ctx.fillStyle = '#5a2010';
            ctx.fillRect(dx, dy + p.h - 2, p.w, 2);
        } else if (p.moving) {
            // Moving platform: blueish/cyan
            ctx.fillStyle = '#2a5a8a';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            // Arrow indicators
            ctx.fillStyle = '#5aafdf';
            ctx.fillRect(p.x, p.y, p.w, 2);
            ctx.fillStyle = '#1a3a5a';
            ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
            // Direction arrows
            ctx.fillStyle = '#5aafdf';
            if (p.moving.axis === 'h') {
                // Horizontal arrows: ◄ ►
                const midY = p.y + p.h / 2;
                ctx.fillRect(p.x + 4, midY - 1, 6, 2);
                ctx.fillRect(p.x + p.w - 10, midY - 1, 6, 2);
            } else {
                // Vertical arrows: ▲ ▼
                const midX = p.x + p.w / 2;
                ctx.fillRect(midX - 1, p.y + 4, 2, 6);
                ctx.fillRect(midX - 1, p.y + p.h - 10, 2, 6);
            }
        } else if (p.bounce) {
            // Bounce/trampoline platform: bright green with spring coils
            const squish = p.bounceAnim ? Math.max(0, p.bounceAnim) : 0;
            const sy = p.y + squish; // squishes down on bounce
            const sh = p.h - squish;
            ctx.fillStyle = '#2a9a2a';
            ctx.fillRect(p.x, sy, p.w, sh);
            // Spring coil marks
            ctx.fillStyle = '#5aff5a';
            ctx.fillRect(p.x, sy, p.w, 2);
            for (let sx = p.x + 8; sx < p.x + p.w - 8; sx += 14) {
                ctx.fillStyle = '#1a6a1a';
                ctx.fillRect(sx, sy + 4, 3, sh - 6);
                ctx.fillRect(sx + 5, sy + 2, 3, sh - 4);
            }
            // Bright top edge
            ctx.fillStyle = '#7fff7f';
            ctx.fillRect(p.x, sy, p.w, 1);
            ctx.fillStyle = '#1a5a1a';
            ctx.fillRect(p.x, sy + sh - 2, p.w, 2);
        } else if (p.ice) {
            // Ice platform: light blue / white with shine
            ctx.fillStyle = '#a8d8ea';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            // Shiny highlight
            ctx.fillStyle = '#d4f0ff';
            ctx.fillRect(p.x, p.y, p.w, 3);
            // Sparkle marks
            ctx.fillStyle = '#ffffff';
            for (let ix = p.x + 6; ix < p.x + p.w - 6; ix += 20 + Math.sin(ix * 0.3) * 5) {
                ctx.fillRect(ix, p.y + 1, 4, 1);
                ctx.fillRect(ix + 2, p.y + 4, 2, 1);
            }
            // Bottom edge
            ctx.fillStyle = '#6aafc8';
            ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
        } else if (p.temporary) {
            // Temporary spawned platform: purple with fading blink
            const age = Date.now() - p.spawnTime;
            const blink = age > 6000 ? (Math.floor(Date.now() / 150) % 2 ? 0.3 : 0.8) : 0.8;
            ctx.globalAlpha = blink;
            ctx.fillStyle = '#9966cc';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#bb88ff';
            ctx.fillRect(p.x, p.y, p.w, 2);
            ctx.fillStyle = '#6633aa';
            ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
            // Sparkle dots
            ctx.fillStyle = '#ddaaff';
            for (let sx = p.x + 8; sx < p.x + p.w - 8; sx += 16) {
                ctx.fillRect(sx, p.y + 6, 2, 2);
            }
            ctx.globalAlpha = 1;
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
    ctx.fillRect(120, 225, 220, 100);
    ctx.fillRect(460, 225, 220, 100);

    // Pixel borders
    ctx.fillStyle = p1SkinColor;
    ctx.fillRect(120, 225, 220, 2);
    ctx.fillRect(120, 323, 220, 2);
    ctx.fillStyle = p2SkinColor;
    ctx.fillRect(460, 225, 220, 2);
    ctx.fillRect(460, 323, 220, 2);

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';

    const b1 = customBindings.p1;
    const b2 = customBindings.p2;
    const K = getKeyDisplayName;

    ctx.fillStyle = p1SkinColor;
    ctx.fillText(T('player1'), 135, 242);
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(T('move') + '      ' + K(b1.left) + ' / ' + K(b1.right), 135, 260);
    ctx.fillText(T('jump') + '      ' + K(b1.jump), 135, 277);
    ctx.fillText(T('drop') + '      ' + K(b1.down), 135, 294);
    ctx.fillText(T('shoot') + '     ' + K(b1.shoot), 135, 311);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = p2SkinColor;
    ctx.fillText(T('player2'), 475, 242);
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(T('move') + '      ' + K(b2.left) + ' / ' + K(b2.right), 475, 260);
    ctx.fillText(T('jump') + '      ' + K(b2.jump), 475, 277);
    ctx.fillText(T('drop') + '      ' + K(b2.down), 475, 294);
    ctx.fillText(T('shoot') + '     ' + K(b2.shoot), 475, 311);

    // Power-Up legend (two rows)
    let puTypes = Object.entries(POWERUP_TYPES).filter(([k, v]) => !v.lavaOnly || settings.gameMode === 4);
    // One Shot mode: exclude heal (never spawns)
    if (settings.gameMode === 1) puTypes = puTypes.filter(([k]) => k !== 'heal');
    const puCount = puTypes.length;
    // Calculate spawn percentages
    let filtTotalWeight = 0;
    for (const [, pu] of puTypes) filtTotalWeight += (pu.weight || 1);

    // Split into rows of max 5
    const rowSize = 5;
    const numRows = Math.ceil(puCount / rowSize);
    const legendH = 18 + numRows * 26;
    const legendY = 332;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(100, legendY, 600, legendH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(100, legendY, 600, 2);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(T('puTitle'), canvas.width / 2, legendY + 15);

    function drawPuEntry(pu, px, py) {
        ctx.fillStyle = pu.colorDark;
        ctx.fillRect(px - 6, py, 12, 12);
        ctx.fillStyle = pu.color;
        ctx.fillRect(px - 6, py, 12, 2);
        ctx.fillRect(px - 6, py + 10, 12, 2);
        ctx.fillRect(px - 6, py, 2, 12);
        ctx.fillRect(px + 4, py, 2, 12);
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pu.symbol, px, py + 9);
        const pct = Math.round((pu.weight || 1) / filtTotalWeight * 100);
        ctx.font = '7px monospace';
        ctx.fillStyle = pu.color;
        ctx.fillText(pu.description + ' (' + pct + '%)', px, py + 22);
    }

    // Render rows
    const rowW = 560;
    let idx = 0;
    for (let r = 0; r < numRows; r++) {
        const rowCount = Math.min(rowSize, puCount - idx);
        const spacing = rowW / rowCount;
        const startX = 120 + spacing / 2;
        const rowY = legendY + 20 + r * 26;
        for (let i = 0; i < rowCount; i++) {
            const [, pu] = puTypes[idx++];
            drawPuEntry(pu, startX + i * spacing, rowY);
        }
    }

    // Start prompts
    const blink = Math.floor(Date.now() / 400) % 2;
    const promptY = legendY + legendH + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(150, promptY, 500, 44);
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(150, promptY, 500, 2);
    ctx.fillRect(150, promptY + 42, 500, 2);
    drawPixelText(T('pressEnter'), canvas.width / 2, promptY + 16, 16, blink ? '#ffdd00' : '#ffaa00');
    drawPixelText(T('pressSpace'), canvas.width / 2, promptY + 34, 11, '#888');
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

    // Title (fixed, not scrolled)
    drawPixelText(T('howToPlay'), canvas.width / 2, 35, 28, '#4ecdc4');

    // Content box
    const boxX = 80;
    const boxW = 640;
    const boxTop = 52;
    const boxBottom = 470;
    const boxH = boxBottom - boxTop;
    ctx.fillStyle = 'rgba(20, 30, 50, 0.95)';
    ctx.fillRect(boxX, boxTop, boxW, boxH);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(boxX, boxTop, boxW, 2);
    ctx.fillRect(boxX, boxBottom - 2, boxW, 2);

    // Clip to content box for scrolling
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX, boxTop + 2, boxW, boxH - 4);
    ctx.clip();

    ctx.textAlign = 'left';
    const x = 110;
    const lineH = 18;
    let y = boxTop + 22 - htpScroll;

    // --- GOAL ---
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('goalTitle'), x, y);
    y += lineH;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.fillText(T('goal1'), x, y); y += lineH;
    ctx.fillText(T('goal2'), x, y); y += lineH;
    ctx.fillText(T('goal3'), x, y); y += lineH * 1.3;

    // --- CONTROLS ---
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
    ctx.fillText(T('p1Controls'), x + 85, y); y += lineH;
    ctx.fillStyle = '#e94560';
    ctx.fillText(T('p2Label'), x, y);
    ctx.fillStyle = '#aaa';
    ctx.fillText(T('p2Controls'), x + 85, y); y += lineH;
    ctx.fillStyle = '#888';
    ctx.fillText(T('escMenu'), x, y); y += lineH * 1.3;

    // --- MECHANICS ---
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('mechTitle'), x, y); y += lineH;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.fillText(T('mech1'), x, y); y += lineH;
    ctx.fillText(T('mech2'), x, y); y += lineH;
    ctx.fillText(T('mech3'), x, y); y += lineH;
    ctx.fillText(T('mech4'), x, y); y += lineH;
    ctx.fillText(T('mech5'), x, y); y += lineH;
    ctx.fillText(T('mech6'), x, y); y += lineH;
    ctx.fillText(T('mech7'), x, y); y += lineH;
    ctx.fillText(T('mech8'), x, y); y += lineH * 1.3;

    // --- GAME MODES ---
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('modesTitle'), x, y); y += lineH;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.fillText(T('mode1'), x, y); y += lineH;
    ctx.fillText(T('mode2'), x, y); y += lineH;
    ctx.fillText(T('mode3'), x, y); y += lineH;
    ctx.fillText(T('mode4'), x, y); y += lineH;
    ctx.fillText(T('mode5'), x, y); y += lineH * 1.3;

    // --- POWER-UPS ---
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(T('puTitle'), x, y); y += lineH + 2;

    const puEntries = Object.entries(POWERUP_TYPES);
    for (const [key, pu] of puEntries) {
        // Only draw if in visible range (optimization)
        if (y > boxTop - 20 && y < boxBottom + 20) {
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
            const extra = pu.lavaOnly ? ' [Lava Rise]' : '';
            ctx.fillText('- ' + pu.description + extra, x + 140, y);
        }
        y += lineH;
    }

    // Total content height for scroll limit
    const totalContentH = (y + htpScroll) - (boxTop + 22) + 20;
    const maxScroll = Math.max(0, totalContentH - boxH + 20);
    if (htpScroll > maxScroll) htpScroll = maxScroll;

    ctx.restore();

    // Scroll indicator arrows
    if (htpScroll > 0) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲', canvas.width / 2, boxTop + 14);
    }
    if (htpScroll < maxScroll) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼', canvas.width / 2, boxBottom - 6);
    }

    // Close hint (fixed at bottom)
    const closeBlink = Math.floor(Date.now() / 500) % 2;
    const scrollHint = settings.lang === 0 ? 'H/ESC close  |  ↑/↓ scroll' : 'H/ESC schließen  |  ↑/↓ scrollen';
    drawPixelText(scrollHint, canvas.width / 2, 488, 12, closeBlink ? '#4ecdc4' : '#2a8a80');
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
        { // Trampoline launch - bounce pad sends you high
            height: 350,
            platforms: [
                { x: 150, y: 0, w: 500 },              // wide start
                { x: 320, y: -30, w: 120, bounce: true }, // bounce pad center
                { x: 100, y: -250, w: 200 },            // left landing high up
                { x: 500, y: -250, w: 200 },            // right landing high up
                { x: 250, y: -350, w: 300 },            // exit
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
        { // Crumbling staircase - some steps are breakable
            height: 350,
            platforms: [
                { x: 200, y: 0, w: 400 },
                { x: 400, y: -70, w: 160 },
                { x: 250, y: -70, w: 120, breakable: true },  // breakable shortcut
                { x: 500, y: -150, w: 140 },
                { x: 300, y: -230, w: 130 },
                { x: 150, y: -230, w: 120, breakable: true },
                { x: 250, y: -350, w: 300 },
            ],
        },
        { // Sliding platforms - horizontal movers
            height: 320,
            platforms: [
                { x: 200, y: 0, w: 400 },
                { x: 350, y: -80, w: 130, moving: { axis: 'h', speed: 0.02, range: 80 } },
                { x: 200, y: -160, w: 140 },
                { x: 450, y: -240, w: 120, moving: { axis: 'h', speed: 0.025, range: -70 } },
                { x: 250, y: -320, w: 300 },
            ],
        },
        { // Bounce zigzag - alternating bounce pads
            height: 400,
            platforms: [
                { x: 200, y: 0, w: 400 },                   // wide start
                { x: 150, y: -30, w: 100, bounce: true },    // bounce left
                { x: 450, y: -200, w: 180 },                 // landing right
                { x: 550, y: -230, w: 100, bounce: true },   // bounce right
                { x: 150, y: -400, w: 200 },                 // landing left
                { x: 450, y: -400, w: 200 },                 // landing right
            ],
        },
        { // Ice bridge - slippery crossing
            height: 300,
            platforms: [
                { x: 150, y: 0, w: 200 },                   // safe start
                { x: 400, y: -70, w: 300, ice: true },       // long ice bridge
                { x: 100, y: -150, w: 300, ice: true },      // ice bridge back
                { x: 450, y: -230, w: 200 },                 // safe landing
                { x: 250, y: -300, w: 300 },                 // exit
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
        { // Two paths: left zigzag climb vs right express elevator
            height: 550,
            platforms: [
                // Base: split left / right
                { x: 50, y: 0, w: 280 },               // base left
                { x: 470, y: 0, w: 280 },              // base right
                // LEFT PATH: zigzag jump & run (left side of screen)
                { x: 30, y: -75, w: 150 },
                { x: 220, y: -150, w: 130 },
                { x: 50, y: -225, w: 140 },
                { x: 220, y: -300, w: 130 },
                { x: 50, y: -375, w: 150 },
                { x: 200, y: -450, w: 140 },
                // RIGHT PATH: express elevator (travels ~500px up!)
                { x: 570, y: -250, w: 130, moving: { axis: 'v', speed: 0.012, range: 250 } },
                { x: 500, y: -500, w: 160 },           // landing at top after elevator
                // Merge at top
                { x: 200, y: -550, w: 400 },           // exit
            ],
        },
        { // Crumble bridge: breakable platforms force you to keep moving
            height: 300,
            platforms: [
                { x: 50, y: 0, w: 200 },               // safe start
                { x: 300, y: 0, w: 150, breakable: true },  // breakable!
                { x: 520, y: 0, w: 200 },              // safe end
                { x: 550, y: -80, w: 140 },            // step up right
                { x: 200, y: -80, w: 200, breakable: true }, // breakable!
                { x: 30, y: -80, w: 130 },             // safe left
                { x: 50, y: -170, w: 150 },            // step up
                { x: 300, y: -230, w: 200, breakable: true }, // breakable!
                { x: 550, y: -230, w: 150 },           // safe right
                { x: 250, y: -300, w: 300 },           // exit
            ],
        },
        { // Moving bridge: horizontal platforms swing back and forth
            height: 320,
            platforms: [
                { x: 100, y: 0, w: 600 },              // wide start
                { x: 200, y: -80, w: 140, moving: { axis: 'h', speed: 0.03, range: 120 } },
                { x: 500, y: -160, w: 130, moving: { axis: 'h', speed: 0.025, range: -100 } },
                { x: 200, y: -240, w: 140, moving: { axis: 'h', speed: 0.035, range: 90 } },
                { x: 250, y: -320, w: 300 },           // exit
            ],
        },
        { // Double elevator: two vertical platforms, one up one down
            height: 380,
            platforms: [
                { x: 100, y: 0, w: 250 },              // start left
                { x: 450, y: 0, w: 250 },              // start right
                // Left elevator goes up
                { x: 150, y: -20, w: 120, moving: { axis: 'v', speed: 0.018, range: -120 } },
                { x: 50, y: -190, w: 200 },            // mid-left landing
                // Right elevator goes up (offset phase)
                { x: 550, y: -100, w: 120, moving: { axis: 'v', speed: 0.02, range: -130 } },
                { x: 500, y: -280, w: 200 },           // mid-right landing
                // Breakable shortcut bridge in center
                { x: 300, y: -190, w: 160, breakable: true },
                { x: 250, y: -380, w: 300 },           // exit
            ],
        },
        { // Chaos: only moving platforms, single winding path through the madness
            height: 560,
            platforms: [
                // Entry base (stable)
                { x: 250, y: 0, w: 300 },
                // Step 1: swing right → must time jump
                { x: 480, y: -80, w: 110, moving: { axis: 'h', speed: 0.03, range: 100 } },
                // Step 2: vertical bobber on right side
                { x: 600, y: -170, w: 110, moving: { axis: 'v', speed: 0.025, range: 35 } },
                // Step 3: swing left across screen
                { x: 350, y: -255, w: 120, moving: { axis: 'h', speed: 0.022, range: -120 } },
                // Step 4: vertical bobber on left side
                { x: 80, y: -340, w: 110, moving: { axis: 'v', speed: 0.028, range: 30 } },
                // Step 5: fast swing back right
                { x: 250, y: -420, w: 100, moving: { axis: 'h', speed: 0.035, range: 130 } },
                // Step 6: elevator up in center
                { x: 340, y: -480, w: 120, moving: { axis: 'v', speed: 0.02, range: -40 } },
                // Exit (stable)
                { x: 220, y: -560, w: 360 },
            ],
        },
        { // Trampoline Tower: massive climb through bounce pads only
            height: 1500,
            platforms: [
                // Base
                { x: 200, y: 0, w: 400 },                      // wide start
                // Bounce 1: center
                { x: 300, y: -30, w: 130, bounce: true },
                // Bounce 2: slightly right
                { x: 420, y: -280, w: 120, bounce: true },
                // Bounce 3: slightly left
                { x: 250, y: -530, w: 120, bounce: true },
                // Bounce 4: center-right
                { x: 400, y: -780, w: 120, bounce: true },
                // Bounce 5: center-left
                { x: 270, y: -1030, w: 120, bounce: true },
                // Bounce 6: center
                { x: 350, y: -1280, w: 120, bounce: true },
                // Exit
                { x: 200, y: -1500, w: 400 },                   // wide exit
            ],
        },
        { // Twin Towers (U-shape): two separate towers, one ends early, other continues to exit
            height: 1100,
            platforms: [
                // Base: wide U-bottom connecting both sides
                { x: 30, y: 0, w: 740 },

                // === LEFT TOWER (x: 30-220) ===
                { x: 50, y: -75, w: 170 },
                { x: 30, y: -150, w: 160 },
                { x: 60, y: -225, w: 170 },
                { x: 30, y: -300, w: 160 },
                { x: 50, y: -375, w: 170 },
                { x: 30, y: -450, w: 160 },
                { x: 60, y: -525, w: 170 },
                { x: 30, y: -600, w: 160 },
                { x: 50, y: -675, w: 170 },
                { x: 30, y: -750, w: 160 },
                { x: 50, y: -825, w: 180 },          // LEFT TOWER ENDS (~100m)

                // === RIGHT TOWER (x: 570-770) ===
                { x: 580, y: -75, w: 170 },
                { x: 610, y: -150, w: 160 },
                { x: 580, y: -225, w: 170 },
                { x: 610, y: -300, w: 160 },
                { x: 580, y: -375, w: 170 },
                { x: 610, y: -450, w: 160 },
                { x: 580, y: -525, w: 170 },
                { x: 610, y: -600, w: 160 },
                { x: 580, y: -675, w: 170 },
                { x: 610, y: -750, w: 160 },
                { x: 580, y: -825, w: 170 },
                // Right tower continues alone
                { x: 600, y: -900, w: 160 },
                { x: 570, y: -975, w: 180 },
                // Bridge to exit
                { x: 350, y: -1040, w: 220 },
                // Exit
                { x: 200, y: -1100, w: 400 },
            ],
        },
        { // Reward Tower: tall tower + short tower with good powerup on top, must descend to cross
            height: 700,
            platforms: [
                // Base connecting both towers
                { x: 50, y: 0, w: 700 },

                // === SHORT TOWER (left side, 3 levels, ~250px high) ===
                { x: 80, y: -80, w: 180 },
                { x: 60, y: -160, w: 200 },
                { x: 80, y: -250, w: 180, goodPowerup: 3 },

                // === TALL TOWER (right side, continues to exit) ===
                { x: 530, y: -80, w: 180 },
                { x: 510, y: -170, w: 200 },
                { x: 530, y: -260, w: 180 },
                { x: 510, y: -350, w: 200 },
                { x: 530, y: -440, w: 180 },
                { x: 510, y: -530, w: 200 },
                { x: 530, y: -620, w: 180 },

                // Exit from tall tower
                { x: 250, y: -700, w: 350 },
            ],
        },
        { // Wind Corridor: narrow icy climb with strong sidewind pushing you off
            height: 1100,
            platforms: [
                // Base
                { x: 250, y: 0, w: 300 },
                // Narrow ice platforms zigzagging up through the wind
                { x: 280, y: -80, w: 200, ice: true },
                { x: 320, y: -160, w: 180, ice: true },
                { x: 260, y: -240, w: 200, ice: true },
                { x: 310, y: -320, w: 180, ice: true },
                { x: 270, y: -400, w: 200, ice: true },
                { x: 320, y: -480, w: 180, ice: true },
                { x: 260, y: -560, w: 200, ice: true },
                { x: 300, y: -640, w: 180, ice: true },
                { x: 280, y: -720, w: 200, ice: true },
                { x: 310, y: -800, w: 180, ice: true },
                { x: 270, y: -880, w: 200, ice: true },
                { x: 300, y: -960, w: 180, ice: true },
                { x: 550, y: -1040, w: 180, ice: true },
                // Exit
                { x: 200, y: -1100, w: 400 },
            ],
            // Wind zones: 3 layers alternating direction, strong!
            windZones: [
                { x: 100, y: -370, w: 600, h: 370, strength: 1.4 },    // layer 1: wind pushes right
                { x: 100, y: -730, w: 600, h: 360, strength: -1.4 },   // layer 2: wind pushes left
                { x: 100, y: -1100, w: 600, h: 370, strength: 1.4 },   // layer 3: wind pushes right again
            ],
        },
        { // Ice gauntlet: slippery bridges with gaps
            height: 350,
            platforms: [
                { x: 30, y: 0, w: 250 },                     // safe start
                { x: 350, y: 0, w: 250, ice: true },          // ice section
                { x: 650, y: -70, w: 120 },                   // step up right
                { x: 250, y: -70, w: 350, ice: true },        // long ice bridge back
                { x: 30, y: -150, w: 160 },                   // safe left
                { x: 300, y: -230, w: 350, ice: true },       // ice bridge
                { x: 250, y: -350, w: 300 },                  // exit
            ],
        },
        { // Double Carousel: 4 sub-carousels orbiting a master center, each with 4 platforms
            height: 550,
            platforms: [
                // Entry base
                { x: 200, y: 0, w: 400 },
                // --- 16 carousel platforms (4 sub-carousels × 4 platforms each) ---
                // Sub-carousel 0 (starts at top of master orbit)
                { x: 370, y: -300, w: 80, carousel: { master: 0 , sub: 0 } },
                { x: 370, y: -300, w: 80, carousel: { master: 0 , sub: 1 } },
                { x: 370, y: -300, w: 80, carousel: { master: 0 , sub: 2 } },
                { x: 370, y: -300, w: 80, carousel: { master: 0 , sub: 3 } },
                // Sub-carousel 1 (starts at right of master orbit)
                { x: 370, y: -300, w: 80, carousel: { master: 1 , sub: 0 } },
                { x: 370, y: -300, w: 80, carousel: { master: 1 , sub: 1 } },
                { x: 370, y: -300, w: 80, carousel: { master: 1 , sub: 2 } },
                { x: 370, y: -300, w: 80, carousel: { master: 1 , sub: 3 } },
                // Sub-carousel 2 (starts at bottom of master orbit)
                { x: 370, y: -300, w: 80, carousel: { master: 2 , sub: 0 } },
                { x: 370, y: -300, w: 80, carousel: { master: 2 , sub: 1 } },
                { x: 370, y: -300, w: 80, carousel: { master: 2 , sub: 2 } },
                { x: 370, y: -300, w: 80, carousel: { master: 2 , sub: 3 } },
                // Sub-carousel 3 (starts at left of master orbit)
                { x: 370, y: -300, w: 80, carousel: { master: 3 , sub: 0 } },
                { x: 370, y: -300, w: 80, carousel: { master: 3 , sub: 1 } },
                { x: 370, y: -300, w: 80, carousel: { master: 3 , sub: 2 } },
                { x: 370, y: -300, w: 80, carousel: { master: 3 , sub: 3 } },
                // Exit platform
                { x: 200, y: -550, w: 400 },
            ],
        },
    ],
};

function generateLavaPlatformRow(y) {
    const count = Math.random() < 0.4 ? 3 : 2;
    const baseW = 90 + Math.random() * 70; // 90-160
    const time = lavaState.framesSinceStart / 60;
    const mirror = Math.random() < 0.5; // 50% chance to mirror row horizontally
    for (let i = 0; i < count; i++) {
        const sectionW = (800 - 30) / count;
        const w = baseW + Math.random() * 20;
        let x = 15 + i * sectionW + Math.random() * Math.max(0, sectionW - w);
        x = Math.max(5, Math.min(x, 795 - w));
        if (mirror) x = 800 - x - w; // mirror horizontally
        const plat = {
            x, y, w, h: 16,
        };
        // Breakable chance increases over time: 20% after 10s, max 30%
        const breakChance = time > 10 ? Math.min(0.3, 0.2 + (time - 10) * 0.002) : 0;
        if (Math.random() < breakChance) {
            plat.breakable = true;
            plat.breakTimer = 0;
        }
        // Ice chance: 15% after 20s, up to 25%
        if (!plat.breakable) {
            const iceChance = time > 20 ? Math.min(0.25, 0.15 + (time - 20) * 0.001) : 0;
            if (Math.random() < iceChance) {
                plat.ice = true;
            }
        }
        platforms.push(plat);
    }
}

// Place a pre-built structure at a given base Y, optionally mirrored
let _structIdCounter = 0;
function placeStructure(structure, baseY) {
    const mirror = Math.random() < 0.5; // 50% chance to mirror horizontally
    const structId = ++_structIdCounter;
    const structPlats = []; // collect all platforms of this structure
    for (let pi = 0; pi < structure.platforms.length; pi++) {
        const p = structure.platforms[pi];
        const x = mirror ? (800 - p.x - p.w) : p.x;
        const plat = { x, y: baseY + p.y, w: p.w, h: 16, structId, structOrder: pi };
        // Bounce platforms from structure definition
        if (p.bounce) {
            plat.bounce = true;
        }
        // Ice platforms from structure definition or random chance
        if (p.ice) {
            plat.ice = true;
        } else if (!p.bounce && !p.moving && !p.breakable && !p.goodPowerup && !p.carousel) {
            const time = lavaState.framesSinceStart / 60;
            const iceChance = time > 20 ? Math.min(0.2, 0.12 + (time - 20) * 0.001) : 0;
            if (Math.random() < iceChance) plat.ice = true;
        }
        // Breakable: defined in structure or random chance (less in endgame)
        if (!p.bounce && !plat.ice && !p.goodPowerup && !p.carousel) {
            const time = lavaState.framesSinceStart / 60;
            const breakChance = time > 150 ? 0.12 : 0.2;
            if (p.breakable || (!p.moving && Math.random() < breakChance)) {
                plat.breakable = true;
                plat.breakTimer = 0;
            }
        }
        if (p.moving) {
            const axis = p.moving.axis;
            // Mirror horizontal movement direction for mirrored structures
            const originX = mirror ? (800 - p.x - p.w) : p.x;
            plat.moving = {
                axis: axis,
                speed: p.moving.speed,
                range: p.moving.range,
                originX: originX,
                originY: baseY + p.y,
                phase: Math.random() * Math.PI * 2, // random start phase
            };
        }
        if (p.carousel) {
            // Carousel in carousel: sub-carousels orbit master center, platforms orbit sub-center
            const masterCenterX = mirror ? (800 - 400) : 400; // center of structure
            const masterCenterY = baseY + (-300); // vertical center of structure
            const masterRadius = 190; // radius of outer carousel
            const subRadius = 55; // radius of each sub-carousel
            const masterSpeed = 0.008; // rotation speed of outer carousel
            const subSpeed = 0.02; // rotation speed of inner carousels (faster!)
            plat.carousel = {
                masterCenterX,
                masterCenterY,
                masterRadius,
                subRadius,
                masterSpeed,
                subSpeed: mirror ? -subSpeed : subSpeed,
                masterPhase: (p.carousel.master / 4) * Math.PI * 2, // evenly spaced
                subPhase: (p.carousel.sub / 4) * Math.PI * 2, // evenly spaced
            };
            // No breakable/ice for carousel platforms
            plat.breakable = false;
            plat.ice = false;
        }
        platforms.push(plat);
        structPlats.push(plat);

        // Spawn guaranteed good powerups on marked platforms
        if (p.goodPowerup) {
            const goodTypes = ['invincible', 'damage', 'extralife', 'doublejump', 'superjump', 'megaknockback'];
            const count = typeof p.goodPowerup === 'number' ? p.goodPowerup : 1;
            for (let gpi = 0; gpi < count; gpi++) {
                const type = goodTypes[Math.floor(Math.random() * goodTypes.length)];
                const spacing = plat.w / (count + 1);
                powerups.push({
                    x: plat.x + spacing * (gpi + 1) - POWERUP_SIZE / 2,
                    y: plat.y - POWERUP_SIZE - 4,
                    w: POWERUP_SIZE,
                    h: POWERUP_SIZE,
                    type,
                    spawnTime: Date.now(),
                    bobOffset: Math.random() * Math.PI * 2,
                    permanent: true,
                });
            }
        }
    }
    // Build AI waypoint chain: sort structure platforms by Y descending (bottom to top),
    // then link each platform to the next one above it
    structPlats.sort((a, b) => b.y - a.y); // bottom first
    for (let i = 0; i < structPlats.length - 1; i++) {
        structPlats[i].nextWaypoint = structPlats[i + 1];
    }
    // Spawn structure-defined wind zones
    if (structure.windZones) {
        for (const wz of structure.windZones) {
            const wzX = mirror ? (800 - wz.x - wz.w) : wz.x;
            const str = mirror ? -wz.strength : wz.strength;
            const particles = [];
            for (let i = 0; i < 16; i++) {
                particles.push({
                    x: Math.random() * wz.w,
                    y: Math.random() * wz.h,
                    speed: 0.5 + Math.random() * 1.5,
                });
            }
            lavaState.windZones.push({
                x: wzX, y: baseY + wz.y, w: wz.w, h: wz.h,
                strength: str, particles,
            });
        }
    }
}

function pickStructure() {
    const time = lavaState.framesSinceStart / 60; // seconds elapsed
    let pool;
    if (time < 30) {
        pool = LAVA_STRUCTURES.easy;
    } else if (time < 55) {
        pool = Math.random() < 0.4 ? LAVA_STRUCTURES.easy : LAVA_STRUCTURES.medium;
    } else if (time < 85) {
        pool = Math.random() < 0.3 ? LAVA_STRUCTURES.medium : LAVA_STRUCTURES.hard;
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
    const startSpeed = LAVA_START_SPEED_OPTIONS[settings.lavaStartSpeed].speed;
    const accelRate = LAVA_ACCEL_OPTIONS[settings.lavaAccel].accel;
    lavaState.lavaSpeed = startSpeed + lavaState.framesSinceStart * accelRate;

    // Rise lava (decrease Y = move up in world space) - unless frozen
    const frozen = lavaState.freezeUntil && Date.now() < lavaState.freezeUntil;
    if (!frozen) {
        lavaState.lavaY -= lavaState.lavaSpeed;
    }

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

    // Generate wind zones (mid-endgame: after 60 seconds)
    const timeS = lavaState.framesSinceStart / 60;
    if (timeS > 60) {
        // Spawn new wind zone every ~8 seconds, keep max 4 active
        const windInterval = 480; // frames
        if (lavaState.framesSinceStart % windInterval === 0 && lavaState.windZones.length < 4) {
            const wzW = 150 + Math.random() * 200; // 150-350px wide
            const wzH = 200 + Math.random() * 200; // 200-400px tall
            const wzX = Math.random() * (800 - wzW);
            const wzY = worldTopY - 100 - Math.random() * 300; // above visible area
            // Strength increases over time: 0.4-1.2 px/frame
            const maxStr = Math.min(1.2, 0.4 + (timeS - 60) * 0.005);
            const str = (0.4 + Math.random() * (maxStr - 0.4)) * (Math.random() < 0.5 ? 1 : -1);
            // Create particles for visual effect
            const particles = [];
            for (let i = 0; i < 12; i++) {
                particles.push({
                    x: Math.random() * wzW,
                    y: Math.random() * wzH,
                    speed: 0.5 + Math.random() * 1.5,
                });
            }
            lavaState.windZones.push({ x: wzX, y: wzY, w: wzW, h: wzH, strength: str, particles });
        }
    }
    // Remove temporary platforms after 8 seconds
    const now = Date.now();
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].temporary && now - platforms[i].spawnTime > 8000) {
            // Unseat players standing on it
            for (const pl of [player1, player2]) {
                if (pl.standingOn === platforms[i]) {
                    pl.standingOn = null;
                    pl.onGround = false;
                }
            }
            spawnParticles(platforms[i].x + platforms[i].w / 2, platforms[i].y, '#bb88ff', 6);
            platforms.splice(i, 1);
        }
    }

    // Remove wind zones that are below lava
    for (let i = lavaState.windZones.length - 1; i >= 0; i--) {
        if (lavaState.windZones[i].y > lavaState.lavaY + 50) {
            lavaState.windZones.splice(i, 1);
        }
    }
    // Animate wind particles
    for (const wz of lavaState.windZones) {
        for (const pt of wz.particles) {
            pt.x += wz.strength * pt.speed;
            if (wz.strength > 0 && pt.x > wz.w) pt.x = 0;
            if (wz.strength < 0 && pt.x < 0) pt.x = wz.w;
            pt.y += 0.3 + Math.random() * 0.2;
            if (pt.y > wz.h) pt.y = 0;
        }
    }

    // Update bounce platform animations
    for (const p of platforms) {
        if (p.bounceAnim && p.bounceAnim > 0) p.bounceAnim--;
    }

    // Update moving platforms
    for (const p of platforms) {
        if (p.moving) {
            const m = p.moving;
            const t = lavaState.framesSinceStart * m.speed + m.phase;
            if (m.axis === 'h') {
                p.x = m.originX + Math.sin(t) * m.range;
            } else {
                p.y = m.originY + Math.sin(t) * m.range;
            }
        }
        if (p.carousel) {
            const c = p.carousel;
            const t = lavaState.framesSinceStart;
            // Master orbit: sub-carousel center position
            const masterAngle = t * c.masterSpeed + c.masterPhase;
            const subCenterX = c.masterCenterX + Math.cos(masterAngle) * c.masterRadius;
            const subCenterY = c.masterCenterY + Math.sin(masterAngle) * c.masterRadius;
            // Sub orbit: platform position around sub-carousel center
            const subAngle = t * c.subSpeed + c.subPhase;
            p.x = subCenterX + Math.cos(subAngle) * c.subRadius - p.w / 2;
            p.y = subCenterY + Math.sin(subAngle) * c.subRadius;
        }
    }

    // Update breakable platforms (check if players are standing on them)
    const players = [player1, player2];
    for (let i = platforms.length - 1; i >= 0; i--) {
        const p = platforms[i];
        if (!p.breakable) continue;
        // Check if any player is standing on this platform
        let playerOnIt = false;
        for (const pl of players) {
            if (pl.standingOn === p) playerOnIt = true;
        }
        if (playerOnIt && p.breakTimer === 0) {
            p.breakTimer = 150; // 2.5 seconds at 60fps
        }
        if (p.breakTimer > 0) {
            p.breakTimer--;
            if (p.breakTimer <= 0) {
                // Platform breaks! Remove it
                // Unseat any players standing on it
                for (const pl of players) {
                    if (pl.standingOn === p) {
                        pl.standingOn = null;
                        pl.onGround = false;
                    }
                }
                platforms.splice(i, 1);
                continue;
            }
        }
    }

    // Move players standing on moving/carousel platforms
    for (const pl of players) {
        if (pl.standingOn && pl.standingOn.moving) {
            const m = pl.standingOn.moving;
            const t = lavaState.framesSinceStart * m.speed + m.phase;
            const tPrev = (lavaState.framesSinceStart - 1) * m.speed + m.phase;
            if (m.axis === 'h') {
                const dx = Math.sin(t) * m.range - Math.sin(tPrev) * m.range;
                pl.x += dx;
            } else {
                const dy = Math.sin(t) * m.range - Math.sin(tPrev) * m.range;
                pl.y += dy;
            }
        }
        if (pl.standingOn && pl.standingOn.carousel) {
            const c = pl.standingOn.carousel;
            const t = lavaState.framesSinceStart;
            const tPrev = t - 1;
            // Current position
            const masterAngle = t * c.masterSpeed + c.masterPhase;
            const subCX = c.masterCenterX + Math.cos(masterAngle) * c.masterRadius;
            const subCY = c.masterCenterY + Math.sin(masterAngle) * c.masterRadius;
            const subAngle = t * c.subSpeed + c.subPhase;
            const curX = subCX + Math.cos(subAngle) * c.subRadius;
            const curY = subCY + Math.sin(subAngle) * c.subRadius;
            // Previous position
            const masterAnglePrev = tPrev * c.masterSpeed + c.masterPhase;
            const subCXp = c.masterCenterX + Math.cos(masterAnglePrev) * c.masterRadius;
            const subCYp = c.masterCenterY + Math.sin(masterAnglePrev) * c.masterRadius;
            const subAnglePrev = tPrev * c.subSpeed + c.subPhase;
            const prevX = subCXp + Math.cos(subAnglePrev) * c.subRadius;
            const prevY = subCYp + Math.sin(subAnglePrev) * c.subRadius;
            pl.x += curX - prevX;
            pl.y += curY - prevY;
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
    const frozen = lavaState.freezeUntil && Date.now() < lavaState.freezeUntil;
    if (player.hp <= 0 || (!frozen && player.y + player.h > lavaState.lavaY)) {
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
        player.activePowerups = {};
        player.doubleJumps = 0;
        player.platformCharges = 0;
        player.swapCharges = 0;
        player.invertedUntil = 0;
        player.jumpPressed = false;
        player.usedDoubleJump = false;
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

function drawWindZones() {
    if (!lavaState.windZones) return;
    for (const wz of lavaState.windZones) {
        // Semi-transparent background tint
        const dir = wz.strength > 0 ? 1 : -1;
        const alpha = Math.min(0.12, Math.abs(wz.strength) * 0.1);
        ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
        ctx.fillRect(wz.x, wz.y, wz.w, wz.h);

        // Border lines (dashed look)
        ctx.fillStyle = 'rgba(150, 200, 255, 0.25)';
        ctx.fillRect(wz.x, wz.y, wz.w, 2);
        ctx.fillRect(wz.x, wz.y + wz.h - 2, wz.w, 2);
        ctx.fillRect(wz.x, wz.y, 2, wz.h);
        ctx.fillRect(wz.x + wz.w - 2, wz.y, 2, wz.h);

        // Wind streak particles
        ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
        for (const pt of wz.particles) {
            const px = wz.x + pt.x;
            const py = wz.y + pt.y;
            // Draw a small streak in wind direction
            const len = 8 + Math.abs(wz.strength) * 6;
            ctx.fillRect(px, py, len * dir, 2);
        }

        // Direction arrow indicators (at edges)
        ctx.fillStyle = 'rgba(180, 220, 255, 0.4)';
        const arrowY = wz.y + wz.h / 2;
        if (dir > 0) {
            // Right arrows
            for (let ay = wz.y + 30; ay < wz.y + wz.h - 30; ay += 60) {
                ctx.fillRect(wz.x + wz.w - 20, ay - 3, 12, 2);
                ctx.fillRect(wz.x + wz.w - 20, ay + 1, 12, 2);
                ctx.fillRect(wz.x + wz.w - 10, ay - 1, 4, 2);
            }
        } else {
            // Left arrows
            for (let ay = wz.y + 30; ay < wz.y + wz.h - 30; ay += 60) {
                ctx.fillRect(wz.x + 8, ay - 3, 12, 2);
                ctx.fillRect(wz.x + 8, ay + 1, 12, 2);
                ctx.fillRect(wz.x + 6, ay - 1, 4, 2);
            }
        }
    }
}

function drawLava() {
    const lY = lavaState.lavaY;
    const frozen = lavaState.freezeUntil && Date.now() < lavaState.freezeUntil;

    if (frozen) {
        // Frozen lava: blue/grey, no waves
        const gradient = ctx.createLinearGradient(0, lY - 50, 0, lY);
        gradient.addColorStop(0, 'rgba(100, 150, 255, 0)');
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, lY - 50, 800, 50);

        // Flat frozen surface
        ctx.fillStyle = '#334466';
        ctx.fillRect(0, lY, 800, 600);
        ctx.fillStyle = '#5588bb';
        ctx.fillRect(0, lY, 800, 6);
        // Ice cracks
        ctx.fillStyle = '#77aadd';
        for (let x = 0; x < 800; x += 30) {
            ctx.fillRect(x + 5, lY + 2, 12, 2);
        }
        // "FROZEN" text
        const remaining = Math.ceil((lavaState.freezeUntil - Date.now()) / 1000);
        ctx.fillStyle = '#aaddff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FROZEN ' + remaining + 's', 400, lY + 20);
    } else {
        // Normal lava glow above surface
        const gradient = ctx.createLinearGradient(0, lY - 50, 0, lY);
        gradient.addColorStop(0, 'rgba(255, 68, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 68, 0, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, lY - 50, 800, 50);

        // Wavy lava surface
        for (let x = 0; x < 800; x += 4) {
            const wave = Math.sin(x * 0.05 + frameCount * 0.1) * 4;
            const wave2 = Math.sin(x * 0.08 + frameCount * 0.06) * 2;
            ctx.fillStyle = '#cc2200';
            ctx.fillRect(x, lY + wave + wave2, 4, 600);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(x, lY + wave + wave2, 4, 6);
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

    // Height meter: show how far above starting point (in meters)
    const heightPixels = Math.max(0, 500 - lavaState.lavaY);
    const heightMeters = Math.floor(heightPixels / 8); // ~8 pixels per meter
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ ' + heightMeters + 'm', 400, 16);
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
            lavaSpeed: LAVA_START_SPEED_OPTIONS[settings.lavaStartSpeed].speed,
            cameraY: 0,
            nextPlatformY: 0,
            p1Lives: lives,
            p2Lives: lives,
            framesSinceStart: 0,
            useStructures: false,
            windZones: [],
            freezeUntil: 0,
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
            drawWindZones();
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
            drawWindZones();
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
            drawWindZones();
            drawLava();
            ctx.restore();
        }
        drawGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

createPlayers();
gameLoop();
