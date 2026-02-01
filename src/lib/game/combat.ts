// Combat System - Turn-based fantasy RPG combat

import { v4 as uuidv4 } from 'uuid';
import { Character, CombatSession, CombatLogEntry, Monster } from '../types';
import { saveData, loadData } from '../db/json-store';
import { applyDamage, getCharacter, setCharacterStatus } from './character';
import { awardExp, calculateMonsterExp } from './exp-system';

const COMBATS_FILE = 'combats.json';

interface CombatStore {
    sessions: Record<string, CombatSession>;
}

// Monster templates
const MONSTER_TEMPLATES: Record<string, Omit<Monster, 'id'>> = {
    goblin: {
        name: '고블린',
        level: 1,
        hp: 30,
        maxHp: 30,
        attack: 8,
        defense: 2,
        expReward: 20,
        drops: [{ itemId: 'gold_coin', chance: 0.5 }, { itemId: 'goblin_ear', chance: 0.3 }],
    },
    orc: {
        name: '오크 전사',
        level: 5,
        hp: 80,
        maxHp: 80,
        attack: 15,
        defense: 5,
        expReward: 60,
        drops: [{ itemId: 'gold_coin', chance: 0.7 }, { itemId: 'orc_tusk', chance: 0.2 }],
    },
    skeleton: {
        name: '해골 병사',
        level: 3,
        hp: 40,
        maxHp: 40,
        attack: 12,
        defense: 3,
        expReward: 35,
        drops: [{ itemId: 'bone_fragment', chance: 0.6 }, { itemId: 'rusty_sword', chance: 0.1 }],
    },
    dragon_whelp: {
        name: '어린 용',
        level: 10,
        hp: 200,
        maxHp: 200,
        attack: 25,
        defense: 10,
        expReward: 200,
        drops: [{ itemId: 'dragon_scale', chance: 0.3 }, { itemId: 'fire_gem', chance: 0.1 }],
    },
    slime: {
        name: '슬라임',
        level: 1,
        hp: 20,
        maxHp: 20,
        attack: 5,
        defense: 1,
        expReward: 10,
        drops: [{ itemId: 'slime_jelly', chance: 0.8 }],
    },
};

/**
 * Create a monster instance from template
 */
export function spawnMonster(templateId: string): Monster | null {
    const template = MONSTER_TEMPLATES[templateId];
    if (!template) return null;

    return {
        id: uuidv4(),
        ...template,
    };
}

/**
 * Start a new combat session
 */
export async function startCombat(
    characterIds: string[],
    monsterTemplateIds: string[]
): Promise<CombatSession | null> {
    // Validate characters exist and are not already in combat
    const characters: Character[] = [];
    for (const charId of characterIds) {
        const char = await getCharacter(charId);
        if (!char) return null;
        if (char.status === 'combat' || char.status === 'dead') return null;
        characters.push(char);
    }

    // Spawn monsters
    const monsters: Monster[] = [];
    for (const templateId of monsterTemplateIds) {
        const monster = spawnMonster(templateId);
        if (monster) monsters.push(monster);
    }
    if (monsters.length === 0) return null;

    // Calculate turn order based on DEX
    const turnOrder = calculateTurnOrder(characters, monsters);

    // Create combat session
    const store = await loadData<CombatStore>(COMBATS_FILE) || { sessions: {} };

    const session: CombatSession = {
        id: uuidv4(),
        type: 'pve',
        participantIds: characterIds,
        enemyIds: monsters.map(m => m.id),
        turnOrder,
        currentTurn: 0,
        status: 'active',
        log: [],
        createdAt: Date.now(),
    };

    // Store monsters in session (we'll need to track their HP)
    (session as any).monsters = monsters;

    store.sessions[session.id] = session;
    await saveData(COMBATS_FILE, store);

    // Set characters to combat status
    for (const charId of characterIds) {
        await setCharacterStatus(charId, 'combat');
    }

    // Add combat start log
    session.log.push({
        timestamp: Date.now(),
        actorId: 'system',
        action: 'combat_start',
        targetId: null,
        damage: null,
        message: `전투 시작! ${characters.map(c => c.name).join(', ')} vs ${monsters.map(m => m.name).join(', ')}`,
    });

    return session;
}

/**
 * Calculate turn order based on DEX stats
 */
function calculateTurnOrder(characters: Character[], monsters: Monster[]): string[] {
    const entities = [
        ...characters.map(c => ({ id: c.id, dex: c.stats.dex, type: 'character' })),
        ...monsters.map(m => ({ id: m.id, dex: Math.floor(m.attack / 2), type: 'monster' })), // Monsters use attack/2 as DEX
    ];

    // Sort by DEX descending (with some randomness)
    entities.sort((a, b) => (b.dex + Math.random() * 3) - (a.dex + Math.random() * 3));

    return entities.map(e => e.id);
}

/**
 * Execute an attack action
 */
export async function executeAttack(
    combatId: string,
    attackerId: string,
    targetId: string
): Promise<{
    success: boolean;
    damage?: number;
    log?: CombatLogEntry;
    combatEnded?: boolean;
    result?: 'victory' | 'defeat' | 'ongoing';
}> {
    const store = await loadData<CombatStore>(COMBATS_FILE);
    if (!store || !store.sessions[combatId]) {
        return { success: false };
    }

    const session = store.sessions[combatId];
    if (session.status !== 'active') {
        return { success: false };
    }

    // Check if it's the attacker's turn
    const currentTurnId = session.turnOrder[session.currentTurn % session.turnOrder.length];
    if (currentTurnId !== attackerId) {
        return { success: false };
    }

    // Get attacker and target info
    const monsters: Monster[] = (session as any).monsters || [];
    const attacker = session.participantIds.includes(attackerId)
        ? await getCharacter(attackerId)
        : monsters.find(m => m.id === attackerId);

    const target = session.participantIds.includes(targetId)
        ? await getCharacter(targetId)
        : monsters.find(m => m.id === targetId);

    if (!attacker || !target) {
        return { success: false };
    }

    // Calculate damage
    const attackerAttack = 'stats' in attacker ? attacker.stats.str * 2 + 10 : attacker.attack;
    const targetDefense = 'stats' in target ? Math.floor(attacker.stats.str / 2) : target.defense;

    // Add some randomness (+/- 20%)
    const baseDamage = Math.max(1, attackerAttack - targetDefense);
    const variance = 0.2;
    const damage = Math.floor(baseDamage * (1 - variance + Math.random() * variance * 2));

    // Apply damage
    const attackerName = 'name' in attacker ? (attacker as Character).name : (attacker as Monster).name;
    const targetName = 'name' in target && 'agentId' in target ? (target as Character).name : (target as Monster).name;

    if (session.participantIds.includes(targetId)) {
        // Target is a character
        await applyDamage(targetId, damage);
    } else {
        // Target is a monster
        const monster = monsters.find(m => m.id === targetId);
        if (monster) {
            monster.hp = Math.max(0, monster.hp - damage);
        }
    }

    // Create log entry
    const logEntry: CombatLogEntry = {
        timestamp: Date.now(),
        actorId: attackerId,
        action: 'attack',
        targetId,
        damage,
        message: `${attackerName}이(가) ${targetName}에게 ${damage} 데미지를 입혔다!`,
    };
    session.log.push(logEntry);

    // Move to next turn
    session.currentTurn++;

    // Check for combat end
    const { ended, result } = await checkCombatEnd(session, monsters);

    if (ended) {
        session.status = result;

        // Process combat end
        if (result === 'victory') {
            await processCombatVictory(session, monsters);
        } else if (result === 'defeat') {
            await processCombatDefeat(session);
        }
    }

    // Save updated session
    (session as any).monsters = monsters;
    store.sessions[combatId] = session;
    await saveData(COMBATS_FILE, store);

    return {
        success: true,
        damage,
        log: logEntry,
        combatEnded: ended,
        result: ended ? result : 'ongoing',
    };
}

/**
 * Check if combat has ended
 */
async function checkCombatEnd(
    session: CombatSession,
    monsters: Monster[]
): Promise<{ ended: boolean; result: 'victory' | 'defeat' | 'ongoing' }> {
    // Check if all monsters are dead
    const allMonstersDead = monsters.every(m => m.hp <= 0);
    if (allMonstersDead) {
        return { ended: true, result: 'victory' };
    }

    // Check if all characters are dead
    let allCharactersDead = true;
    for (const charId of session.participantIds) {
        const char = await getCharacter(charId);
        if (char && char.hp > 0) {
            allCharactersDead = false;
            break;
        }
    }
    if (allCharactersDead) {
        return { ended: true, result: 'defeat' };
    }

    return { ended: false, result: 'ongoing' };
}

/**
 * Process victory rewards
 */
async function processCombatVictory(session: CombatSession, monsters: Monster[]): Promise<void> {
    const totalExp = monsters.reduce((sum, m) => sum + m.expReward, 0);
    const inParty = session.participantIds.length > 1;

    for (const charId of session.participantIds) {
        const char = await getCharacter(charId);
        if (char && char.hp > 0) {
            await awardExp(charId, char, totalExp / session.participantIds.length, inParty);
            await setCharacterStatus(charId, 'idle');
        }
    }

    session.log.push({
        timestamp: Date.now(),
        actorId: 'system',
        action: 'victory',
        targetId: null,
        damage: null,
        message: `승리! ${totalExp} 경험치 획득!`,
    });
}

/**
 * Process defeat
 */
async function processCombatDefeat(session: CombatSession): Promise<void> {
    session.log.push({
        timestamp: Date.now(),
        actorId: 'system',
        action: 'defeat',
        targetId: null,
        damage: null,
        message: '패배... 모든 파티원이 쓰러졌다.',
    });
}

/**
 * Get combat session
 */
export async function getCombatSession(combatId: string): Promise<CombatSession | null> {
    const store = await loadData<CombatStore>(COMBATS_FILE);
    return store?.sessions[combatId] || null;
}

/**
 * Get available monsters for spawning
 */
export function getAvailableMonsters(): string[] {
    return Object.keys(MONSTER_TEMPLATES);
}

/**
 * Get monster info
 */
export function getMonsterInfo(templateId: string): Omit<Monster, 'id'> | null {
    return MONSTER_TEMPLATES[templateId] || null;
}
