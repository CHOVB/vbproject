// Experience and Level System

import { Character, CharacterStats } from '../types';
import { updateCharacter } from './character';

// EXP required per level (using exponential formula)
const BASE_EXP = 100;
const EXP_MULTIPLIER = 1.5;

/**
 * Calculate EXP required for a specific level
 */
export function expForLevel(level: number): number {
    return Math.floor(BASE_EXP * Math.pow(EXP_MULTIPLIER, level - 1));
}

/**
 * Calculate total EXP required to reach a level from level 1
 */
export function totalExpForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += expForLevel(i);
    }
    return total;
}

/**
 * Calculate what level a character should be based on total EXP
 */
export function levelFromExp(totalExp: number): number {
    let level = 1;
    let expNeeded = 0;
    while (totalExp >= expNeeded + expForLevel(level)) {
        expNeeded += expForLevel(level);
        level++;
        if (level > 100) break; // Cap at level 100
    }
    return level;
}

// EXP rewards for various activities
export const EXP_REWARDS = {
    MONSTER_KILL_BASE: 20,
    QUEST_COMPLETE_BASE: 100,
    PVP_WIN: 50,
    POST_CREATE: 5,
    COMMENT_CREATE: 2,
    PARTY_BONUS_PERCENT: 20, // 20% bonus when in party
} as const;

// Stat increases per level by class
const STAT_GROWTH: Record<string, Partial<CharacterStats>> = {
    warrior: { str: 3, dex: 1, int: 0, wis: 1, cha: 1, luk: 1 },
    mage: { str: 0, dex: 1, int: 3, wis: 2, cha: 1, luk: 0 },
    rogue: { str: 1, dex: 3, int: 1, wis: 0, cha: 1, luk: 2 },
    cleric: { str: 1, dex: 1, int: 1, wis: 3, cha: 1, luk: 0 },
    ranger: { str: 2, dex: 2, int: 1, wis: 1, cha: 1, luk: 1 },
};

// HP/MP increases per level
const VITAL_GROWTH: Record<string, { hp: number; mp: number }> = {
    warrior: { hp: 15, mp: 3 },
    mage: { hp: 5, mp: 15 },
    rogue: { hp: 8, mp: 5 },
    cleric: { hp: 8, mp: 12 },
    ranger: { hp: 10, mp: 6 },
};

export interface LevelUpResult {
    newLevel: number;
    statGains: Partial<CharacterStats>;
    hpGain: number;
    mpGain: number;
    newSkills: string[];
}

/**
 * Award EXP to a character and handle level ups
 */
export async function awardExp(
    characterId: string,
    character: Character,
    amount: number,
    inParty: boolean = false
): Promise<{
    expGained: number;
    levelUps: LevelUpResult[];
}> {
    // Apply party bonus
    const bonusMultiplier = inParty ? 1 + (EXP_REWARDS.PARTY_BONUS_PERCENT / 100) : 1;
    const expGained = Math.floor(amount * bonusMultiplier);

    const newExp = character.exp + expGained;
    const newLevel = levelFromExp(newExp);
    const levelUps: LevelUpResult[] = [];

    // Process each level up
    let currentLevel = character.level;
    let updatedStats = { ...character.stats };
    let updatedMaxHp = character.maxHp;
    let updatedMaxMp = character.maxMp;

    while (currentLevel < newLevel) {
        currentLevel++;
        const growth = STAT_GROWTH[character.class] || STAT_GROWTH.ranger;
        const vitalGrowth = VITAL_GROWTH[character.class] || VITAL_GROWTH.ranger;

        // Apply stat growth
        const statGains: Partial<CharacterStats> = {};
        for (const [stat, gain] of Object.entries(growth)) {
            if (gain && gain > 0) {
                const statKey = stat as keyof CharacterStats;
                updatedStats[statKey] += gain;
                statGains[statKey] = gain;
            }
        }

        // Apply vital growth
        updatedMaxHp += vitalGrowth.hp;
        updatedMaxMp += vitalGrowth.mp;

        // Check for new skills
        const newSkills = getSkillsForLevel(character.class, currentLevel);

        levelUps.push({
            newLevel: currentLevel,
            statGains,
            hpGain: vitalGrowth.hp,
            mpGain: vitalGrowth.mp,
            newSkills,
        });
    }

    // Update character
    const updatedSkills = [...character.skills];
    for (const lvlUp of levelUps) {
        for (const skill of lvlUp.newSkills) {
            if (!updatedSkills.includes(skill)) {
                updatedSkills.push(skill);
            }
        }
    }

    await updateCharacter(characterId, {
        exp: newExp,
        level: newLevel,
        stats: updatedStats,
        maxHp: updatedMaxHp,
        maxMp: updatedMaxMp,
        hp: Math.min(character.hp + (updatedMaxHp - character.maxHp), updatedMaxHp), // Heal on level up
        mp: Math.min(character.mp + (updatedMaxMp - character.maxMp), updatedMaxMp),
        skills: updatedSkills,
    });

    return { expGained, levelUps };
}

/**
 * Get skills unlocked at a specific level
 */
function getSkillsForLevel(characterClass: string, level: number): string[] {
    const SKILL_UNLOCKS: Record<string, Record<number, string[]>> = {
        warrior: {
            5: ['power_strike'],
            10: ['whirlwind'],
            15: ['battle_cry'],
            20: ['berserker_rage'],
        },
        mage: {
            5: ['lightning_bolt'],
            10: ['meteor'],
            15: ['mana_shield'],
            20: ['time_stop'],
        },
        rogue: {
            5: ['smoke_bomb'],
            10: ['assassinate'],
            15: ['shadow_step'],
            20: ['death_mark'],
        },
        cleric: {
            5: ['group_heal'],
            10: ['resurrection'],
            15: ['divine_shield'],
            20: ['holy_judgment'],
        },
        ranger: {
            5: ['multi_shot'],
            10: ['beast_tame'],
            15: ['camouflage'],
            20: ['rain_of_arrows'],
        },
    };

    return SKILL_UNLOCKS[characterClass]?.[level] || [];
}

/**
 * Calculate EXP from monster kill
 */
export function calculateMonsterExp(monsterLevel: number, characterLevel: number): number {
    const levelDiff = monsterLevel - characterLevel;
    let multiplier = 1.0;

    if (levelDiff > 5) multiplier = 1.5;      // Much higher level monster
    else if (levelDiff > 2) multiplier = 1.2; // Higher level monster
    else if (levelDiff < -5) multiplier = 0.2; // Much lower level monster
    else if (levelDiff < -2) multiplier = 0.5; // Lower level monster

    return Math.floor(EXP_REWARDS.MONSTER_KILL_BASE * monsterLevel * multiplier);
}
