// World Exploration System - Discover encounters through exploration

import { v4 as uuidv4 } from 'uuid';
import { Monster, Character, WorldEvent } from '../types';
import { saveData, loadData } from '../db/json-store';

const EXPLORATION_FILE = 'exploration.json';

// Zone definitions (hidden from players until explored)
const ZONES = {
    town_plaza: { name: '시작의 마을', level: 0, dangerLevel: 0 },
    goblin_forest: { name: '미지의 숲', level: 1, dangerLevel: 2 },
    skeleton_dungeon: { name: '고대 던전', level: 5, dangerLevel: 5 },
    orc_camp: { name: '야영지', level: 5, dangerLevel: 4 },
    dragon_peak: { name: '용의 봉우리', level: 10, dangerLevel: 8 },
    dark_cave: { name: '어둠의 동굴', level: 3, dangerLevel: 3 },
};

// Monster pool (internal - not exposed to API)
const MONSTER_POOL = [
    { weight: 30, minLevel: 1, template: { name: '???', baseHp: 30, baseAtk: 8, baseDef: 2, baseExp: 20 } },
    { weight: 25, minLevel: 1, template: { name: '???', baseHp: 20, baseAtk: 5, baseDef: 1, baseExp: 10 } },
    { weight: 20, minLevel: 3, template: { name: '???', baseHp: 40, baseAtk: 12, baseDef: 3, baseExp: 35 } },
    { weight: 15, minLevel: 5, template: { name: '???', baseHp: 80, baseAtk: 15, baseDef: 5, baseExp: 60 } },
    { weight: 5, minLevel: 10, template: { name: '???', baseHp: 200, baseAtk: 25, baseDef: 10, baseExp: 200 } },
];

interface ExplorationState {
    characterId: string;
    currentZone: string;
    exploredZones: string[];
    discoveredMonsters: string[]; // Monster names you've encountered
    activeEncounter: Encounter | null;
}

interface Encounter {
    id: string;
    type: 'monster' | 'treasure' | 'event' | 'nothing';
    monsters?: GeneratedMonster[];
    treasureId?: string;
    eventId?: string;
    message: string;
    createdAt: number;
}

interface GeneratedMonster {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    expReward: number;
}

interface ExplorationStore {
    states: Record<string, ExplorationState>;
}

/**
 * Start exploring a zone
 */
export async function explore(
    characterId: string,
    zoneId: string,
    characterLevel: number
): Promise<{ success: boolean; encounter?: Encounter; error?: string }> {
    const zone = ZONES[zoneId as keyof typeof ZONES];
    if (!zone) {
        return { success: false, error: '알 수 없는 지역입니다.' };
    }

    // Check level requirement
    if (characterLevel < zone.level) {
        return {
            success: false,
            error: `레벨이 부족합니다. 최소 Lv.${zone.level} 필요.`
        };
    }

    const store = await loadData<ExplorationStore>(EXPLORATION_FILE) || { states: {} };

    // Get or create exploration state
    let state = store.states[characterId];
    if (!state) {
        state = {
            characterId,
            currentZone: 'town_plaza',
            exploredZones: ['town_plaza'],
            discoveredMonsters: [],
            activeEncounter: null,
        };
    }

    // Update zone
    state.currentZone = zoneId;
    if (!state.exploredZones.includes(zoneId)) {
        state.exploredZones.push(zoneId);
    }

    // Generate random encounter based on danger level
    const encounter = generateEncounter(zoneId, zone.dangerLevel, characterLevel, state);
    state.activeEncounter = encounter;

    store.states[characterId] = state;
    await saveData(EXPLORATION_FILE, store);

    return { success: true, encounter };
}

/**
 * Generate a random encounter
 */
function generateEncounter(
    zoneId: string,
    dangerLevel: number,
    characterLevel: number,
    state: ExplorationState
): Encounter {
    const roll = Math.random() * 100;

    // Safe zone - no encounters in town
    if (zoneId === 'town_plaza') {
        return {
            id: uuidv4(),
            type: 'nothing',
            message: '평화로운 마을 광장입니다. 모험을 떠나보세요.',
            createdAt: Date.now(),
        };
    }

    // Encounter chance based on danger level
    const monsterChance = dangerLevel * 10; // 10% per danger level
    const treasureChance = 5;
    const eventChance = 10;

    if (roll < monsterChance) {
        // Monster encounter
        const monsters = generateMonsters(dangerLevel, characterLevel);

        return {
            id: uuidv4(),
            type: 'monster',
            monsters,
            message: `${monsters.length > 1 ? '적들이' : '적이'} 나타났다!`,
            createdAt: Date.now(),
        };
    } else if (roll < monsterChance + treasureChance) {
        // Treasure found
        return {
            id: uuidv4(),
            type: 'treasure',
            treasureId: 'random_treasure',
            message: '숨겨진 보물을 발견했다!',
            createdAt: Date.now(),
        };
    } else if (roll < monsterChance + treasureChance + eventChance) {
        // Random event
        const events = [
            '오래된 비석을 발견했다. 무언가 적혀있다...',
            '저 멀리서 이상한 소리가 들린다.',
            '바닥에 떨어진 지도 조각을 발견했다.',
            '신비로운 기운이 느껴진다.',
        ];
        return {
            id: uuidv4(),
            type: 'event',
            eventId: 'random_event',
            message: events[Math.floor(Math.random() * events.length)],
            createdAt: Date.now(),
        };
    }

    // Nothing happens
    const quietMessages = [
        '조용한 길이다. 계속 탐험해보자.',
        '아무 일도 일어나지 않았다.',
        '발자국 소리만 울린다.',
        '잠시 쉬어가도 좋을 것 같다.',
    ];
    return {
        id: uuidv4(),
        type: 'nothing',
        message: quietMessages[Math.floor(Math.random() * quietMessages.length)],
        createdAt: Date.now(),
    };
}

/**
 * Generate monsters for an encounter (hidden stats until combat)
 */
function generateMonsters(dangerLevel: number, characterLevel: number): GeneratedMonster[] {
    const count = Math.min(1 + Math.floor(Math.random() * dangerLevel / 3), 3);
    const monsters: GeneratedMonster[] = [];

    // Filter available monsters by level
    const available = MONSTER_POOL.filter(m => characterLevel >= m.minLevel);
    if (available.length === 0) return [];

    for (let i = 0; i < count; i++) {
        // Weighted random selection
        const totalWeight = available.reduce((sum, m) => sum + m.weight, 0);
        let roll = Math.random() * totalWeight;

        let selected = available[0];
        for (const m of available) {
            roll -= m.weight;
            if (roll <= 0) {
                selected = m;
                break;
            }
        }

        // Generate monster with level variance
        const levelVariance = Math.floor(Math.random() * 3) - 1;
        const monsterLevel = Math.max(1, characterLevel + levelVariance);
        const scaling = 1 + (monsterLevel - 1) * 0.1;

        monsters.push({
            id: uuidv4(),
            name: selected.template.name, // Hidden until identified
            level: monsterLevel,
            hp: Math.floor(selected.template.baseHp * scaling),
            maxHp: Math.floor(selected.template.baseHp * scaling),
            attack: Math.floor(selected.template.baseAtk * scaling),
            defense: Math.floor(selected.template.baseDef * scaling),
            expReward: Math.floor(selected.template.baseExp * scaling),
        });
    }

    return monsters;
}

/**
 * Get exploration state for a character
 */
export async function getExplorationState(characterId: string): Promise<ExplorationState | null> {
    const store = await loadData<ExplorationStore>(EXPLORATION_FILE);
    return store?.states[characterId] || null;
}

/**
 * Get available zones (only explored zones are known)
 */
export async function getAvailableZones(characterId: string): Promise<{
    current: string;
    explored: { id: string; name: string }[];
    adjacent: string[];
}> {
    const state = await getExplorationState(characterId);

    const current = state?.currentZone || 'town_plaza';
    const explored = (state?.exploredZones || ['town_plaza']).map(id => ({
        id,
        name: ZONES[id as keyof typeof ZONES]?.name || '???',
    }));

    // Adjacent zones (simplified - in real game this would be a proper map)
    const adjacency: Record<string, string[]> = {
        town_plaza: ['goblin_forest', 'dark_cave'],
        goblin_forest: ['town_plaza', 'orc_camp', 'skeleton_dungeon'],
        dark_cave: ['town_plaza', 'skeleton_dungeon'],
        skeleton_dungeon: ['goblin_forest', 'dark_cave', 'dragon_peak'],
        orc_camp: ['goblin_forest', 'dragon_peak'],
        dragon_peak: ['skeleton_dungeon', 'orc_camp'],
    };

    return {
        current,
        explored,
        adjacent: adjacency[current] || [],
    };
}

/**
 * Reveal monster identity after combat
 */
export async function revealMonster(
    characterId: string,
    monsterName: string
): Promise<void> {
    const store = await loadData<ExplorationStore>(EXPLORATION_FILE) || { states: {} };

    if (store.states[characterId]) {
        if (!store.states[characterId].discoveredMonsters.includes(monsterName)) {
            store.states[characterId].discoveredMonsters.push(monsterName);
            await saveData(EXPLORATION_FILE, store);
        }
    }
}
