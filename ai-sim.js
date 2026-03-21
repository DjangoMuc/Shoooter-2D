#!/usr/bin/env node
// ============================================
// AI Simulation Framework for SHOOOTER 2D
// Tests different AI models against each other
// ============================================

// --- Simplified physics constants (matching game.js) ---
const GRAVITY = 0.6;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -12;
const BULLET_SPEED = 8;
const BULLET_DAMAGE = 10;
const MAX_HP = 100;
const CANVAS_W = 800;
const CANVAS_H = 500;

// --- Simplified platform layout (Classic mode) ---
function generatePlatforms() {
    return [
        { x: 0, y: CANVAS_H - 20, w: CANVAS_W, h: 20, isGround: true },
        { x: 150, y: 400, w: 120, h: 16 },
        { x: 530, y: 400, w: 120, h: 16 },
        { x: 50, y: 310, w: 100, h: 16 },
        { x: 340, y: 310, w: 120, h: 16 },
        { x: 650, y: 310, w: 100, h: 16 },
        { x: 200, y: 220, w: 130, h: 16 },
        { x: 470, y: 220, w: 130, h: 16 },
        { x: 330, y: 140, w: 140, h: 16 },
        { x: 80, y: 150, w: 80, h: 16 },
        { x: 640, y: 150, w: 80, h: 16 },
    ];
}

// --- Lava Rise platform generation ---
function generateLavaPlatforms(height) {
    const plats = [{ x: 0, y: CANVAS_H - 20, w: CANVAS_W, h: 20, isGround: true }];
    let y = CANVAS_H - 80;
    while (y > -height) {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const w = 60 + Math.random() * 100;
            const x = Math.random() * (CANVAS_W - w);
            plats.push({ x, y, w, h: 16 });
        }
        y -= 50 + Math.random() * 40;
    }
    return plats;
}

// --- Simple Player ---
class SimPlayer {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 30; this.h = 40;
        this.vx = 0; this.vy = 0;
        this.hp = MAX_HP;
        this.onGround = false;
        this.facing = 1;
        this.bullets = [];
        this.lastShot = 0;
        this.doubleJumps = 0;
        this.usedDoubleJump = false;
        this.jumpPressed = false;
        this.activePowerups = [];
        this.standingOn = null;
    }

    hasPowerup(type) {
        return this.activePowerups.some(p => p.type === type && Date.now() < p.until);
    }
}

// --- AI Model Interface ---
// Each model returns: { left, right, jump, shoot, down }
const AI_MODELS = {
    // === EASY: Original dumb AI ===
    easy: {
        name: 'Easy (Original)',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiCY = ai.y + ai.h / 2;
            const humanCX = human.x + human.w / 2;
            const humanCY = human.y + human.h / 2;
            const dx = humanCX - aiCX;
            const dy = humanCY - aiCY;
            const dist = Math.hypot(dx, dy);
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Simple: walk toward human, shoot when aligned
            if (Math.abs(dx) > 30) {
                if (dx > 0) out.right = true;
                else out.left = true;
            }
            if (Math.abs(dy) < 60 && Math.random() < 0.5) {
                out.shoot = true;
            }
            if (dist < 80) {
                out.left = dx > 0; out.right = dx < 0; // retreat
            }
            if (ai.onGround && Math.random() < 0.01) out.jump = true;
            if (humanCY < aiCY - 50 && ai.onGround && Math.abs(dx) < 100) out.jump = true;

            return out;
        }
    },

    // === MEDIUM: Moderate improvements ===
    medium: {
        name: 'Medium (Balanced)',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiCY = ai.y + ai.h / 2;
            const humanCX = human.x + human.w / 2;
            const humanCY = human.y + human.h / 2;
            const dx = humanCX - aiCX;
            const dist = Math.hypot(dx, humanCY - aiCY);
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Maintain optimal distance (100-180)
            if (dist < 100) {
                if (dx > 0) out.left = true; else out.right = true;
            } else if (dist > 200) {
                if (dx > 0) out.right = true; else out.left = true;
            } else {
                if (Math.random() < 0.1) {
                    if (Math.random() < 0.5) out.left = true; else out.right = true;
                }
            }

            // Shoot with better accuracy
            if (Math.abs(humanCY - aiCY) < 60 && Math.random() < 0.7) {
                out.shoot = true;
            }

            // Dodge bullets
            for (const b of human.bullets) {
                const bDist = Math.abs(b.x - aiCX);
                if (bDist < 150 && Math.abs(b.y - aiCY) < 30) {
                    const coming = (b.vx > 0 && b.x < ai.x) || (b.vx < 0 && b.x > ai.x + ai.w);
                    if (coming && ai.onGround) out.jump = true;
                }
            }

            // Climb toward human
            if (humanCY < aiCY - 40 && ai.onGround && Math.abs(dx) < 100) out.jump = true;

            return out;
        }
    },

    // === HARD: Advanced tactics ===
    hard: {
        name: 'Hard (Advanced)',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiCY = ai.y + ai.h / 2;
            const aiFeetY = ai.y + ai.h;
            const humanCX = human.x + human.w / 2;
            const humanCY = human.y + human.h / 2;
            const dx = humanCX - aiCX;
            const dy = humanCY - aiCY;
            const dist = Math.hypot(dx, dy);
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Optimal combat range: 120-200
            if (dist < 60) {
                if (dx > 0) out.left = true; else out.right = true;
                if (ai.onGround && Math.random() < 0.3) out.jump = true;
            } else if (dist < 120) {
                if (dx > 0) out.left = true; else out.right = true;
            } else if (dist > 250) {
                if (dx > 0) out.right = true; else out.left = true;
            } else {
                // Strafe in optimal range
                if (Math.random() < 0.15) {
                    if (Math.random() < 0.5) out.left = true; else out.right = true;
                }
            }

            // High accuracy shooting
            if (Math.abs(dy) < 70 && Math.random() < 0.9) out.shoot = true;

            // Bullet dodge + strafe
            for (const b of human.bullets) {
                const bDist = Math.abs(b.x - aiCX);
                if (bDist < 180 && Math.abs(b.y - aiCY) < 35) {
                    const coming = (b.vx > 0 && b.x < ai.x) || (b.vx < 0 && b.x > ai.x + ai.w);
                    if (coming) {
                        if (ai.onGround) out.jump = true;
                        if (bDist < 100) {
                            if (Math.random() < 0.5) out.left = true; else out.right = true;
                        }
                    }
                }
            }

            // Smart climbing
            if (humanCY < aiCY - 30 && ai.onGround) {
                // Find reachable platform above
                let bestPlat = null;
                let bestDist = Infinity;
                for (const p of platforms) {
                    if (p.isGround) continue;
                    if (p.y < aiFeetY && p.y > aiFeetY - 120) {
                        const d = Math.abs(p.x + p.w / 2 - aiCX);
                        if (d < bestDist) { bestDist = d; bestPlat = p; }
                    }
                }
                if (bestPlat) {
                    const platCX = bestPlat.x + bestPlat.w / 2;
                    if (Math.abs(aiCX - platCX) < 50) out.jump = true;
                    else if (platCX > aiCX) out.right = true;
                    else out.left = true;
                } else if (Math.abs(dx) < 100) {
                    out.jump = true;
                }
            }

            // Jump for height advantage
            if (ai.onGround && Math.random() < 0.02) out.jump = true;

            // Drop through to chase
            if (humanCY > aiCY + 60 && ai.onGround) {
                for (const p of platforms) {
                    if (p.isGround) continue;
                    if (ai.x + ai.w > p.x && ai.x < p.x + p.w && Math.abs(aiFeetY - p.y) < 3) {
                        out.down = true;
                        break;
                    }
                }
            }

            return out;
        }
    },
};

// === LAVA-SPECIFIC AI MODELS ===
const LAVA_AI_MODELS = {
    easy: {
        name: 'Lava Easy',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiFeetY = ai.y + ai.h;
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Simple: always try to go up
            let bestPlat = null;
            let bestDist = Infinity;
            for (const p of platforms) {
                if (p.y >= aiFeetY - 5) continue;
                if (p.y < aiFeetY - 120) continue;
                const d = Math.abs(p.x + p.w / 2 - aiCX);
                if (d < bestDist) { bestDist = d; bestPlat = p; }
            }
            if (bestPlat) {
                const platCX = bestPlat.x + bestPlat.w / 2;
                if (Math.abs(aiCX - platCX) < 40) out.jump = true;
                else if (platCX > aiCX) out.right = true;
                else out.left = true;
            } else if (ai.onGround) {
                out.jump = true;
                if (aiCX < 400) out.right = true; else out.left = true;
            }

            return out;
        }
    },

    medium: {
        name: 'Lava Medium',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiFeetY = ai.y + ai.h;
            const lavaY = state.lavaY;
            const lavaDistance = lavaY - aiFeetY;
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Score platforms
            let bestPlat = null;
            let bestScore = -Infinity;
            for (const p of platforms) {
                if (p.y >= aiFeetY - 5) continue;
                if (p.y < aiFeetY - 120) continue;
                if (p.y > lavaY - 30) continue;
                const vertDist = aiFeetY - p.y;
                const horizDist = Math.abs(p.x + p.w / 2 - aiCX);
                let score = -horizDist * 1.2 + vertDist * 0.5 + p.w * 0.3;
                if (vertDist < 25) score -= 80;
                if (score > bestScore) { bestScore = score; bestPlat = p; }
            }

            if (bestPlat) {
                const platCX = bestPlat.x + bestPlat.w / 2;
                if (!ai.onGround) {
                    if (aiCX < platCX - 10) out.right = true;
                    else if (aiCX > platCX + 10) out.left = true;
                } else {
                    if (Math.abs(aiCX - platCX) < 50) out.jump = true;
                    else if (platCX > aiCX) out.right = true;
                    else out.left = true;
                }
            } else if (ai.onGround) {
                out.jump = true;
                if (aiCX < 400) out.right = true; else out.left = true;
            }

            // Double jump in danger
            if (ai.doubleJumps > 0 && ai.vy > 1 && lavaDistance < 140) {
                out.jump = true;
            }

            return out;
        }
    },

    hard: {
        name: 'Lava Hard (Lookahead)',
        decide(ai, human, platforms, state) {
            const aiCX = ai.x + ai.w / 2;
            const aiFeetY = ai.y + ai.h;
            const lavaY = state.lavaY;
            const lavaDistance = lavaY - aiFeetY;
            const humanCX = human.x + human.w / 2;
            const humanCY = human.y + human.h / 2;
            const out = { left: false, right: false, jump: false, shoot: false, down: false };

            // Score platforms with lookahead
            const candidates = [];
            for (const p of platforms) {
                if (p.y >= aiFeetY - 5) continue;
                if (p.y < aiFeetY - 120) continue;
                if (p.y > lavaY - 30) continue;
                candidates.push(p);
            }

            let bestPlat = null;
            let bestScore = -Infinity;
            for (const p of candidates) {
                const vertDist = aiFeetY - p.y;
                const horizDist = Math.abs(p.x + p.w / 2 - aiCX);
                let score = -horizDist * 1.2 + vertDist * 0.8 + p.w * 0.3;
                if (vertDist < 25) score -= 80;

                // Lookahead: does this platform lead higher?
                for (const p2 of candidates) {
                    if (p2 === p) continue;
                    if (p2.y < p.y && p2.y > p.y - 120) {
                        const h2Dist = Math.abs(p2.x + p2.w/2 - (p.x + p.w/2));
                        if (h2Dist < 300) { score += 30; break; }
                    }
                }

                if (score > bestScore) { bestScore = score; bestPlat = p; }
            }

            if (bestPlat) {
                const platCX = bestPlat.x + bestPlat.w / 2;
                if (!ai.onGround) {
                    if (aiCX < platCX - 10) out.right = true;
                    else if (aiCX > platCX + 10) out.left = true;
                } else {
                    const curPlat = this._getCurrentPlatform(ai, platforms);
                    if (curPlat) {
                        const overlapL = Math.max(curPlat.x, bestPlat.x + 15);
                        const overlapR = Math.min(curPlat.x + curPlat.w, bestPlat.x + bestPlat.w - 15);
                        if (overlapL < overlapR) {
                            const walkTo = Math.max(overlapL + 10, Math.min(overlapR - 10, platCX));
                            if (Math.abs(aiCX - walkTo) < 8) out.jump = true;
                            else if (walkTo > aiCX) out.right = true;
                            else out.left = true;
                        } else {
                            const isRight = platCX > aiCX;
                            const edge = isRight ? curPlat.x + curPlat.w - 10 : curPlat.x + 10;
                            if (Math.abs(aiCX - edge) < 20) {
                                out.jump = true;
                                if (isRight) out.right = true; else out.left = true;
                            } else if (edge > aiCX) out.right = true;
                            else out.left = true;
                        }
                    } else {
                        if (Math.abs(aiCX - platCX) < 50) out.jump = true;
                        else if (platCX > aiCX) out.right = true;
                        else out.left = true;
                    }
                }
            } else if (ai.onGround) {
                out.jump = true;
                if (aiCX < 400) out.right = true; else out.left = true;
            }

            // Smart double jump
            if (ai.doubleJumps > 0 && ai.vy > 0.5) {
                const noPlat = !this._hasPlatformBelow(ai, platforms, 80);
                if (lavaDistance < 160 || (ai.vy > 3 && noPlat)) {
                    out.jump = true;
                }
            }

            // Shoot while safe
            if (lavaDistance > 200 && Math.abs(humanCY - (ai.y + ai.h/2)) < 60) {
                out.shoot = true;
            }

            return out;
        },
        _getCurrentPlatform(player, platforms) {
            if (!player.onGround) return null;
            const feetY = player.y + player.h;
            for (const p of platforms) {
                if (player.x + player.w > p.x && player.x < p.x + p.w && Math.abs(feetY - p.y) < 5) return p;
            }
            return null;
        },
        _hasPlatformBelow(player, platforms, range) {
            const cx = player.x + player.w / 2;
            const feetY = player.y + player.h;
            for (const p of platforms) {
                if (p.y > feetY && p.y < feetY + range && cx > p.x - 10 && cx < p.x + p.w + 10) return true;
            }
            return false;
        }
    },
};

// === SIMULATION ENGINE ===
function simulateClassicMatch(model1, model2, maxFrames = 3000) {
    const platforms = generatePlatforms();
    const p1 = new SimPlayer(200, CANVAS_H - 60);
    const p2 = new SimPlayer(600, CANVAS_H - 60);
    p1.facing = 1; p2.facing = -1;

    for (let frame = 0; frame < maxFrames; frame++) {
        const now = frame * 16.67; // ~60fps

        // AI decisions
        const d1 = model1.decide(p1, p2, platforms, { frame, now });
        const d2 = model2.decide(p2, p1, platforms, { frame, now });

        // Apply inputs for both players
        for (const [player, dec] of [[p1, d1], [p2, d2]]) {
            player.vx = 0;
            if (dec.left) { player.vx = -PLAYER_SPEED; player.facing = -1; }
            if (dec.right) { player.vx = PLAYER_SPEED; player.facing = 1; }

            // Jump
            if (dec.jump && player.onGround) {
                player.vy = JUMP_FORCE;
                player.onGround = false;
            }

            // Gravity
            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            // Clamp to canvas
            if (player.x < 0) player.x = 0;
            if (player.x + player.w > CANVAS_W) player.x = CANVAS_W - player.w;

            // Platform collision
            player.onGround = false;
            player.standingOn = null;
            for (const p of platforms) {
                if (player.x + player.w > p.x && player.x < p.x + p.w &&
                    player.y + player.h > p.y && player.y + player.h < p.y + p.h + player.vy + 2 &&
                    player.vy >= 0) {
                    player.y = p.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.standingOn = p;
                }
            }

            // Shoot
            if (dec.shoot && now - player.lastShot > 300) {
                player.lastShot = now;
                player.bullets.push({
                    x: player.x + (player.facing > 0 ? player.w : 0),
                    y: player.y + player.h / 2 - 3,
                    w: 8, h: 6,
                    vx: BULLET_SPEED * player.facing,
                });
            }
        }

        // Update bullets & check hits
        for (const [shooter, target] of [[p1, p2], [p2, p1]]) {
            for (let i = shooter.bullets.length - 1; i >= 0; i--) {
                const b = shooter.bullets[i];
                b.x += b.vx;
                if (b.x < -10 || b.x > CANVAS_W + 10) {
                    shooter.bullets.splice(i, 1);
                    continue;
                }
                // Hit check
                if (b.x + b.w > target.x && b.x < target.x + target.w &&
                    b.y + b.h > target.y && b.y < target.y + target.h) {
                    target.hp -= BULLET_DAMAGE;
                    shooter.bullets.splice(i, 1);
                }
            }
        }

        if (p1.hp <= 0) return { winner: 2, frames: frame };
        if (p2.hp <= 0) return { winner: 1, frames: frame };
    }

    // Timeout: whoever has more HP wins
    return { winner: p1.hp >= p2.hp ? 1 : 2, frames: maxFrames };
}

function simulateLavaMatch(model1, model2, maxFrames = 6000) {
    const platforms = generateLavaPlatforms(3000);
    const p1 = new SimPlayer(200, CANVAS_H - 60);
    const p2 = new SimPlayer(600, CANVAS_H - 60);
    p1.facing = 1; p2.facing = -1;
    p1.doubleJumps = 0; p2.doubleJumps = 0;

    let lavaY = CANVAS_H;
    const lavaSpeed = 0.3;
    let cameraY = 0;

    for (let frame = 0; frame < maxFrames; frame++) {
        const now = frame * 16.67;
        lavaY -= lavaSpeed + frame * 0.00005; // slowly accelerating lava

        // Camera follows higher player
        const higherY = Math.min(p1.y, p2.y);
        const targetCamY = Math.min(0, -(higherY - 200));
        cameraY += (targetCamY - cameraY) * 0.05;

        const state = { frame, now, lavaY, cameraY };

        const d1 = model1.decide(p1, p2, platforms, state);
        const d2 = model2.decide(p2, p1, platforms, state);

        for (const [player, dec] of [[p1, d1], [p2, d2]]) {
            player.vx = 0;
            if (dec.left) { player.vx = -PLAYER_SPEED; player.facing = -1; }
            if (dec.right) { player.vx = PLAYER_SPEED; player.facing = 1; }

            if (dec.jump) {
                if (player.onGround) {
                    player.vy = JUMP_FORCE;
                    player.onGround = false;
                    player.usedDoubleJump = true;
                } else if (player.doubleJumps > 0 && !player.usedDoubleJump && !player.jumpPressed) {
                    player.vy = JUMP_FORCE * 1.1;
                    player.doubleJumps--;
                    player.usedDoubleJump = true;
                    player.jumpPressed = true;
                }
            } else {
                player.jumpPressed = false;
                if (!player.onGround) player.usedDoubleJump = false;
            }
            if (player.onGround) player.usedDoubleJump = false;

            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            if (player.x < 0) player.x = 0;
            if (player.x + player.w > CANVAS_W) player.x = CANVAS_W - player.w;

            player.onGround = false;
            player.standingOn = null;
            for (const p of platforms) {
                if (player.x + player.w > p.x && player.x < p.x + p.w &&
                    player.y + player.h > p.y && player.y + player.h < p.y + p.h + player.vy + 2 &&
                    player.vy >= 0) {
                    player.y = p.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.standingOn = p;
                }
            }

            // Shoot
            if (dec.shoot && now - player.lastShot > 300) {
                player.lastShot = now;
                player.bullets.push({
                    x: player.x + (player.facing > 0 ? player.w : 0),
                    y: player.y + player.h / 2 - 3, w: 8, h: 6,
                    vx: BULLET_SPEED * player.facing,
                });
            }
        }

        // Bullets
        for (const [shooter, target] of [[p1, p2], [p2, p1]]) {
            for (let i = shooter.bullets.length - 1; i >= 0; i--) {
                const b = shooter.bullets[i];
                b.x += b.vx;
                if (b.x < -10 || b.x > CANVAS_W + 10) { shooter.bullets.splice(i, 1); continue; }
                if (b.x + b.w > target.x && b.x < target.x + target.w &&
                    b.y + b.h > target.y && b.y < target.y + target.h) {
                    target.hp -= BULLET_DAMAGE;
                    const kb = BULLET_SPEED * 0.5 * (b.vx > 0 ? 1 : -1);
                    target.vx += kb;
                    shooter.bullets.splice(i, 1);
                }
            }
        }

        // Lava death
        const p1Dead = p1.y + p1.h > lavaY;
        const p2Dead = p2.y + p2.h > lavaY;

        if (p1Dead && p2Dead) return { winner: 0, frames: frame, height: CANVAS_H - lavaY };
        if (p1Dead) return { winner: 2, frames: frame, height: CANVAS_H - lavaY };
        if (p2Dead) return { winner: 1, frames: frame, height: CANVAS_H - lavaY };
    }

    // Timeout: whoever is higher wins
    return { winner: p1.y < p2.y ? 1 : 2, frames: maxFrames, height: CANVAS_H - lavaY };
}

// === RUN SIMULATIONS ===
function runTournament(simFunc, models, numGames = 200) {
    const names = Object.keys(models);
    const results = {};
    for (const n of names) results[n] = { wins: 0, losses: 0, draws: 0 };

    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const n1 = names[i], n2 = names[j];
            let w1 = 0, w2 = 0, draws = 0;

            for (let g = 0; g < numGames; g++) {
                // Alternate sides for fairness
                const result = g % 2 === 0
                    ? simFunc(models[n1], models[n2])
                    : simFunc(models[n2], models[n1]);

                const winner = g % 2 === 0 ? result.winner : (result.winner === 1 ? 2 : result.winner === 2 ? 1 : 0);
                if (winner === 1) w1++;
                else if (winner === 2) w2++;
                else draws++;
            }

            results[n1].wins += w1;
            results[n1].losses += w2;
            results[n1].draws += draws;
            results[n2].wins += w2;
            results[n2].losses += w1;
            results[n2].draws += draws;

            console.log(`  ${models[n1].name} vs ${models[n2].name}: ${w1}-${w2}-${draws}`);
        }
    }

    return results;
}

// Main
console.log('=== SHOOOTER 2D AI Tournament ===\n');

console.log('--- Classic Mode (200 games per matchup) ---');
const classicResults = runTournament(simulateClassicMatch, AI_MODELS, 200);
console.log('\nClassic Results:');
for (const [name, r] of Object.entries(classicResults)) {
    const total = r.wins + r.losses + r.draws;
    console.log(`  ${AI_MODELS[name].name}: ${r.wins}W/${r.losses}L/${r.draws}D (${(r.wins/total*100).toFixed(1)}% winrate)`);
}

console.log('\n--- Lava Rise Mode (200 games per matchup) ---');
const lavaResults = runTournament(simulateLavaMatch, LAVA_AI_MODELS, 200);
console.log('\nLava Results:');
for (const [name, r] of Object.entries(lavaResults)) {
    const total = r.wins + r.losses + r.draws;
    console.log(`  ${LAVA_AI_MODELS[name].name}: ${r.wins}W/${r.losses}L/${r.draws}D (${(r.wins/total*100).toFixed(1)}% winrate)`);
}

console.log('\n=== RECOMMENDATION ===');
console.log('Easy difficulty  → Easy model (simple walk+shoot, no dodging)');
console.log('Medium difficulty → Medium model (optimal distance, bullet dodge, basic climbing)');
console.log('Hard difficulty  → Hard model (lookahead, smart climbing, strafing, full combat)');
