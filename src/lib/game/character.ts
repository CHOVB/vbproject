// Character Management System

import { v4 as uuidv4 } from 'uuid';
import { Character, CharacterClass, CharacterStats, CharacterStatus } from '../types';
import { saveData, loadData } from '../db/json-store';

const CHARACTERS_FILE = 'characters.json';

interface CharacterStore {
    characters: Record<string, Character>;
}

// Base stats by class
const CLASS_BASE_STATS: Record<CharacterClass, CharacterStats> = {
    warrior: { str: 14, dex: 10, int: 6, wis: 8, cha: 8, luk: 8 },
    mage: { str: 6, dex: 8, int: 14, wis: 12, cha: 8, luk: 6 },
    rogue: { str: 8, dex: 14, int: 8, wis: 6, cha: 10, luk: 12 },
    cleric: { str: 8, dex: 8, int: 10, wis: 14, cha: 10, luk: 6 },
    ranger: { str: 10, dex: 12, int: 8, wis: 10, cha: 8, luk: 10 },
};

// Class-specific HP/MP multipliers
const CLASS_VITALS: Record<CharacterClass, { hpBase: number; mpBase: number }> = {
    warrior: { hpBase: 120, mpBase: 30 },
    mage: { hpBase: 60, mpBase: 120 },
    rogue: { hpBase: 80, mpBase: 50 },
    cleric: { hpBase: 80, mpBase: 100 },
    ranger: { hpBase: 90, mpBase: 60 },
};

// Default starting skills by class
const CLASS_SKILLS: Record<CharacterClass, string[]> = {
    warrior: ['slash', 'shield_bash'],
    mage: ['fireball', 'ice_shard'],
    rogue: ['backstab', 'poison_blade'],
    cleric: ['heal', 'bless'],
    ranger: ['arrow_shot', 'trap_set'],
};

/**
 * Create a new character for an agent
 */
export async function createCharacter(
    agentId: string,
    name: string,
    characterClass: CharacterClass
): Promise<Character> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE) || { characters: {} };

    const baseStats = CLASS_BASE_STATS[characterClass];
    const vitals = CLASS_VITALS[characterClass];

    const character: Character = {
        id: uuidv4(),
        name,
        agentId,
        class: characterClass,
        level: 1,
        exp: 0,
        hp: vitals.hpBase,
        maxHp: vitals.hpBase,
        mp: vitals.mpBase,
        maxMp: vitals.mpBase,
        stats: { ...baseStats },
        skills: [...CLASS_SKILLS[characterClass]],
        inventory: [],
        guildId: null,
        location: { zone: 'town_plaza', x: 0, y: 0 },
        status: 'idle',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
    };

    store.characters[character.id] = character;
    await saveData(CHARACTERS_FILE, store);

    return character;
}

/**
 * Get a character by ID
 */
export async function getCharacter(characterId: string): Promise<Character | null> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    return store?.characters[characterId] || null;
}

/**
 * Get character by agent ID
 */
export async function getCharacterByAgent(agentId: string): Promise<Character | null> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    if (!store) return null;

    for (const char of Object.values(store.characters)) {
        if (char.agentId === agentId) return char;
    }
    return null;
}

/**
 * Update character data
 */
export async function updateCharacter(
    characterId: string,
    updates: Partial<Character>
): Promise<Character | null> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    if (!store || !store.characters[characterId]) return null;

    store.characters[characterId] = {
        ...store.characters[characterId],
        ...updates,
        lastActiveAt: Date.now(),
    };

    await saveData(CHARACTERS_FILE, store);
    return store.characters[characterId];
}

/**
 * Update character status
 */
export async function setCharacterStatus(
    characterId: string,
    status: CharacterStatus
): Promise<void> {
    await updateCharacter(characterId, { status });
}

/**
 * Apply damage to character
 */
export async function applyDamage(
    characterId: string,
    damage: number
): Promise<{ hp: number; isDead: boolean }> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    if (!store || !store.characters[characterId]) {
        throw new Error('Character not found');
    }

    const char = store.characters[characterId];
    char.hp = Math.max(0, char.hp - damage);
    char.status = char.hp <= 0 ? 'dead' : char.status;
    char.lastActiveAt = Date.now();

    await saveData(CHARACTERS_FILE, store);

    return { hp: char.hp, isDead: char.hp <= 0 };
}

/**
 * Heal character
 */
export async function healCharacter(
    characterId: string,
    amount: number
): Promise<{ hp: number }> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    if (!store || !store.characters[characterId]) {
        throw new Error('Character not found');
    }

    const char = store.characters[characterId];
    char.hp = Math.min(char.maxHp, char.hp + amount);
    if (char.status === 'dead' && char.hp > 0) {
        char.status = 'idle';
    }
    char.lastActiveAt = Date.now();

    await saveData(CHARACTERS_FILE, store);

    return { hp: char.hp };
}

/**
 * Get all characters (for leaderboard, etc.)
 */
export async function getAllCharacters(): Promise<Character[]> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    return store ? Object.values(store.characters) : [];
}

/**
 * Get characters by location/zone
 */
export async function getCharactersInZone(zone: string): Promise<Character[]> {
    const store = await loadData<CharacterStore>(CHARACTERS_FILE);
    if (!store) return [];

    return Object.values(store.characters).filter(c => c.location.zone === zone);
}
