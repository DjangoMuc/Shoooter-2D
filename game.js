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
let gameState = 'start'; // 'start', 'playing', 'dying', 'gameover'
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
    if (gameState === 'start' && e.code === 'Digit1') {
        gameMode = 'pvp';
        resetGame();
    }
    if (gameState === 'start' && e.code === 'Digit2') {
        gameMode = 'pve';
        resetGame();
    }
    if (gameState === 'gameover' && e.code === 'KeyR') {
        resetGame(); // keeps current gameMode
    }
    if ((gameState === 'playing' || gameState === 'gameover' || gameState === 'dying') && e.code === 'Escape') {
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

// --- PLAYER 1 SPRITES (Cyan/Teal Ranger) ---
const P1 = {
    h: '#2d8a80', // hair/helmet dark
    H: '#4ecdc4', // helmet bright
    S: '#3aafa9', // suit
    s: '#2b7a78', // suit shadow
    F: '#f5cba7', // face/skin
    f: '#e0ac7e', // skin shadow
    E: '#ffffff', // eye white
    e: '#1a1a2e', // eye pupil
    B: '#555555', // boots
    b: '#444444', // boots shadow
    G: '#888888', // gun
    g: '#666666', // gun dark
    V: '#3aafa9', // visor
};

// --- PLAYER 2 SPRITES (Red Ranger) ---
const P2 = {
    h: '#a82040', // hair/helmet dark
    H: '#e94560', // helmet bright
    S: '#d63851', // suit
    s: '#a82040', // suit shadow
    F: '#f5cba7', // face/skin
    f: '#e0ac7e', // skin shadow
    E: '#ffffff', // eye white
    e: '#1a1a2e', // eye pupil
    B: '#555555', // boots
    b: '#444444', // boots shadow
    G: '#888888', // gun
    g: '#666666', // gun dark
    V: '#d63851', // visor
};

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

const sprites1 = makeSprites(P1);
const sprites2 = makeSprites(P2);

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
const platforms = [
    { x: 0, y: 470, w: 800, h: 30, isGround: true },
    { x: 150, y: 370, w: 150, h: 16 },
    { x: 500, y: 370, w: 150, h: 16 },
    { x: 300, y: 270, w: 200, h: 16 },
    { x: 50, y: 180, w: 120, h: 16 },
    { x: 630, y: 180, w: 120, h: 16 },
];

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
        this.hp = MAX_HP;
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
            this.vy = JUMP_FORCE;
            this.onGround = false;
        }

        // Drop through platform (one-press trigger)
        if (keys[this.controls.down] && this.onGround && !this.dropPressed) {
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

        this.vy += GRAVITY;
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
            this.hp = Math.min(MAX_HP, this.hp + 40);
            spawnCollectBurst(cx, cy, '#44dd44');
        } else {
            this.activePowerups[type] = Date.now() + def.duration;
            spawnCollectBurst(cx, cy, def.color);
        }
    }

    shoot() {
        const now = Date.now();
        const isAI = gameMode === 'pve' && this === player2;
        let cooldown = isAI ? AI_SHOOT_COOLDOWN : SHOOT_COOLDOWN;
        if (this.hasPowerup('nocooldown')) {
            cooldown = Math.floor(cooldown * 0.5);
        }
        if (now - this.lastShot < cooldown) return;
        this.lastShot = now;
        this.muzzleFlash = 6;

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
        const hpRatio = Math.max(0, this.hp / MAX_HP);
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
                text: 'BLOCKED',
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
        if (this.thinkTimer < this.thinkInterval) return;
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
            this.wantsShoot = true;
            aiPlayer.facing = humanCX > aiCX ? 1 : -1;
        }

        // --- Drop through platform if target is below ---
        if (targetY > aiFeetY + 40 && aiPlayer.onGround) {
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
        this.wantsShoot = true;

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
    player1 = new Player(100, 400, '#4ecdc4', 'Player 1', {
        left: 'KeyA',
        right: 'KeyD',
        jump: 'KeyW',
        down: 'KeyS',
        shoot: 'Space',
        facingDefault: 1,
    }, sprites1);

    const p2Name = gameMode === 'pve' ? 'AI' : 'Player 2';
    player2 = new Player(650, 400, '#e94560', p2Name, {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        jump: 'ArrowUp',
        down: 'ArrowDown',
        shoot: 'Enter',
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
    if (now - lastPowerupSpawn > POWERUP_SPAWN_INTERVAL && powerups.length < 3) {
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
            spawnParticles(b.x, b.y, '#e94560', 10);
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
            spawnParticles(b.x, b.y, '#4ecdc4', 10);
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
    } else if (player2.hp <= 0) {
        gameState = 'dying';
        winner = player1;
        loser = player2;
        deathTimer = DEATH_DURATION;
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
    const origCtx = ctx;
    // Temporarily swap context
    const savedCtx = ctx;
    // We need to draw to bgCanvas
    const colors = ['#0a0a1a', '#0f1128', '#141836', '#16213e', '#1a2744'];
    const stripeH = canvas.height / colors.length;
    for (let i = 0; i < colors.length; i++) {
        bgCtx.fillStyle = colors[i];
        bgCtx.fillRect(0, i * stripeH, canvas.width, stripeH);
    }
    // City silhouette
    for (const b of buildings) {
        bgCtx.fillStyle = '#0d1525';
        bgCtx.fillRect(b.x, 470 - b.h, b.w, b.h);
        for (let wy = 470 - b.h + 6; wy < 465; wy += 12) {
            for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 8) {
                bgCtx.fillStyle = (Math.random() > 0.5) ? '#2a3a5e' : '#1a2744';
                bgCtx.fillRect(wx, wy, 4, 6);
            }
        }
    }
}
prerenderBackground();

function drawBg() {
    ctx.drawImage(bgCanvas, 0, 0);

    // Animated stars on top
    for (const s of stars) {
        const twinkle = Math.sin(frameCount * s.twinkleSpeed + s.twinkleOffset);
        ctx.globalAlpha = 0.3 + 0.5 * (twinkle * 0.5 + 0.5);
        ctx.fillStyle = '#ffffff';
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
    drawPixelText('Choose your mode!', canvas.width / 2, 140, 14, '#ffffff');

    // Animated idle sprites on title screen (gentle bob)
    const idleBob = Math.sin(frameCount * 0.06) * 2;
    const p1Frame = sprites1.idle[0];
    const p2Frame = sprites2.idle[0];
    drawSprite(p1Frame, 180, 180 + idleBob, PX, false);
    drawSprite(sprites1.gun, 180 + 30, 196 + idleBob, PX, false);

    drawSprite(p2Frame, 570, 180 - idleBob, PX, true);
    drawSprite(sprites2.gun, 570 - 10, 196 - idleBob, PX, true);

    // Controls boxes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(120, 230, 220, 118);
    ctx.fillRect(460, 230, 220, 118);

    // Pixel borders
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(120, 230, 220, 2);
    ctx.fillRect(120, 346, 220, 2);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(460, 230, 220, 2);
    ctx.fillRect(460, 346, 220, 2);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('PLAYER 1', 135, 250);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('Move:      A / D', 135, 272);
    ctx.fillText('Jump:      W', 135, 292);
    ctx.fillText('Drop:      S', 135, 312);
    ctx.fillText('Shoot:     Space', 135, 332);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#e94560';
    ctx.fillText('PLAYER 2', 475, 250);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('Move:      \u2190 / \u2192', 475, 272);
    ctx.fillText('Jump:      \u2191', 475, 292);
    ctx.fillText('Drop:      \u2193', 475, 312);
    ctx.fillText('Shoot:     Enter', 475, 332);

    // Power-Up legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(130, 358, 540, 54);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(130, 358, 540, 2);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('POWER-UPS', canvas.width / 2, 375);

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

    // Mode selection
    const blink = Math.floor(Date.now() / 500) % 2;

    // Mode 1: PvP
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(30, 424, 360, 32);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(30, 424, 360, 2);
    ctx.fillRect(30, 454, 360, 2);
    drawPixelText('Press 1 for Player vs Player', 210, 446, 12, blink ? '#4ecdc4' : '#88ffee');

    // Mode 2: PvE
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(410, 424, 360, 32);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(410, 424, 360, 2);
    ctx.fillRect(410, 454, 360, 2);
    drawPixelText('Press 2 for Player vs AI', 590, 446, 12, blink ? '#e94560' : '#ff8888');
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Winner text with pulsing glow
    const glowPulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
    ctx.globalAlpha = 0.2 * glowPulse;
    ctx.fillStyle = winner.color;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner.name} wins!`, canvas.width / 2, 102);
    ctx.globalAlpha = 1;
    drawPixelText(`${winner.name} wins!`, canvas.width / 2, 100, 38, winner.color);

    // Trophy pixel art
    const trophyY = 120;
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(canvas.width / 2 - 12, trophyY, 24, 6);
    ctx.fillRect(canvas.width / 2 - 8, trophyY + 6, 16, 12);
    ctx.fillRect(canvas.width / 2 - 14, trophyY + 4, 4, 8);
    ctx.fillRect(canvas.width / 2 + 10, trophyY + 4, 4, 8);
    ctx.fillRect(canvas.width / 2 - 4, trophyY + 18, 8, 4);
    ctx.fillRect(canvas.width / 2 - 8, trophyY + 22, 16, 4);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(canvas.width / 2 - 4, trophyY + 8, 8, 6);

    // --- Stats Panel ---
    const panelY = 170;
    const panelH = 200;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(60, panelY, 680, panelH);
    // Border
    ctx.fillStyle = '#444';
    ctx.fillRect(60, panelY, 680, 2);
    ctx.fillRect(60, panelY + panelH - 2, 680, 2);

    drawPixelText('MATCH STATS', canvas.width / 2, panelY + 22, 16, '#ffffff');

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
    const statLabels = ['Shots Fired', 'Hits', 'Accuracy', 'Damage Done', 'Power-Ups collected'];
    const s1 = stats.p1;
    const s2 = stats.p2;
    const acc1 = s1.shotsFired > 0 ? Math.round((s1.hits / s1.shotsFired) * 100) : 0;
    const acc2 = s2.shotsFired > 0 ? Math.round((s2.hits / s2.shotsFired) * 100) : 0;
    const statVals1 = [s1.shotsFired, s1.hits, acc1 + '%', s1.damageDone, s1.powerupsCollected];
    const statVals2 = [s2.shotsFired, s2.hits, acc2 + '%', s2.damageDone, s2.powerupsCollected];

    ctx.font = '11px monospace';
    for (let i = 0; i < statLabels.length; i++) {
        const rowY = panelY + 72 + i * 24;
        // Label (center)
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(statLabels[i], canvas.width / 2, rowY);
        // P1 value
        ctx.fillStyle = '#ddd';
        ctx.textAlign = 'center';
        ctx.fillText('' + statVals1[i], col1X, rowY);
        // P2 value
        ctx.fillText('' + statVals2[i], col2X, rowY);

        // Highlight the better stat
        const v1 = parseFloat(statVals1[i]);
        const v2 = parseFloat(statVals2[i]);
        if (!isNaN(v1) && !isNaN(v2) && v1 !== v2) {
            const betterX = v1 > v2 ? col1X : col2X;
            const betterColor = v1 > v2 ? player1.color : player2.color;
            ctx.fillStyle = betterColor;
            ctx.fillText(v1 > v2 ? '' + statVals1[i] : '' + statVals2[i], betterX, rowY);
        }
    }

    drawPixelText('Press R to restart', canvas.width / 2, panelY + panelH + 20, 16, '#ffffff');
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
    gameState = 'playing';
    winner = null;
    loser = null;
    deathTimer = 0;
    stats = {
        p1: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
        p2: { shotsFired: 0, hits: 0, damageDone: 0, powerupsCollected: 0 },
    };
}

function gameLoop() {
    frameCount++;

    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'playing') {
        if (gameMode === 'pve') {
            AI.update(player2, player1);
        }
        player1.update();
        player2.update();
        updatePowerups();
        checkBulletHits();
        checkWin();
        updateParticles();
        updateDamageNumbers();

        drawBg();
        drawPlatforms();
        drawPowerups();
        player1.draw();
        player2.draw();
        drawParticles();
        drawDamageNumbers();
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
