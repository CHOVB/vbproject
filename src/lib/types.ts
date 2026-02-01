// Game Types for AI Agent RPG

export interface Character {
    id: string;
    name: string;
    agentId: string;
    class: CharacterClass;
    level: number;
    exp: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    stats: CharacterStats;
    skills: string[];
    inventory: InventoryItem[];
    guildId: string | null;
    location: Location;
    status: CharacterStatus;
    createdAt: number;
    lastActiveAt: number;
}

export type CharacterClass =
    | 'warrior'   // 전사 - 높은 HP, 물리 공격
    | 'mage'      // 마법사 - 높은 MP, 마법 공격
    | 'rogue'     // 도적 - 높은 DEX, 크리티컬
    | 'cleric'    // 성직자 - 힐러, 버프
    | 'ranger';   // 레인저 - 밸런스형

export interface CharacterStats {
    str: number;  // 힘 - 물리 공격력
    dex: number;  // 민첩 - 회피, 선공
    int: number;  // 지능 - 마법 공격력
    wis: number;  // 지혜 - 마법 방어력
    cha: number;  // 매력 - 상점 할인, 동료 버프
    luk: number;  // 운 - 크리티컬, 드랍률
}

export type CharacterStatus = 'idle' | 'combat' | 'dead' | 'resting';

export interface Location {
    zone: string;     // 지역 ID
    x: number;
    y: number;
}

export interface InventoryItem {
    itemId: string;
    quantity: number;
}

// Party System
export interface Party {
    id: string;
    name: string;
    leaderId: string;
    memberIds: string[];
    maxSize: number;
    createdAt: number;
}

// Combat System
export interface CombatSession {
    id: string;
    type: 'pve' | 'pvp';
    participantIds: string[];
    enemyIds: string[];
    turnOrder: string[];
    currentTurn: number;
    status: 'active' | 'victory' | 'defeat' | 'fled';
    log: CombatLogEntry[];
    createdAt: number;
}

export interface CombatLogEntry {
    timestamp: number;
    actorId: string;
    action: string;
    targetId: string | null;
    damage: number | null;
    message: string;
}

// Monster/Enemy
export interface Monster {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    expReward: number;
    drops: { itemId: string; chance: number }[];
}

// World Events
export interface WorldEvent {
    id: string;
    type: 'spawn' | 'quest' | 'raid' | 'weather';
    title: string;
    description: string;
    zone: string;
    startTime: number;
    endTime: number;
    participants: string[];
}

// Agent Authentication (PoW based)
export interface AgentSession {
    id: string;
    agentName: string;
    characterId: string | null;
    token: string;
    lastHeartbeat: number;
    isVerified: boolean;
    createdAt: number;
}

export interface PoWChallenge {
    challengeId: string;
    seed: string;
    targetPrefix: string;
    algorithm: 'sha256';
    limitMs: number;
    createdAt: number;
    expiresAt: number;
}

// Activity Feed
export interface FeedPost {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    content: string;
    postType: 'chat' | 'combat_log' | 'achievement' | 'quest';
    upvotes: number;
    downvotes: number;
    comments: FeedComment[];
    createdAt: number;
}

export interface FeedComment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    parentId: string | null;
    createdAt: number;
}
