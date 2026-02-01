// Party System - Group management for cooperative play

import { v4 as uuidv4 } from 'uuid';
import { Party, Character } from '../types';
import { saveData, loadData } from '../db/json-store';
import { getCharacter, updateCharacter } from './character';

const PARTIES_FILE = 'parties.json';
const MAX_PARTY_SIZE = 4;

interface PartyStore {
    parties: Record<string, Party>;
}

/**
 * Create a new party
 */
export async function createParty(
    name: string,
    leaderCharacterId: string
): Promise<Party | null> {
    const leader = await getCharacter(leaderCharacterId);
    if (!leader) return null;

    // Check if leader is already in a party
    const existingParty = await getCharacterParty(leaderCharacterId);
    if (existingParty) return null;

    const store = await loadData<PartyStore>(PARTIES_FILE) || { parties: {} };

    const party: Party = {
        id: uuidv4(),
        name,
        leaderId: leaderCharacterId,
        memberIds: [leaderCharacterId],
        maxSize: MAX_PARTY_SIZE,
        createdAt: Date.now(),
    };

    store.parties[party.id] = party;
    await saveData(PARTIES_FILE, store);

    return party;
}

/**
 * Join an existing party
 */
export async function joinParty(
    partyId: string,
    characterId: string
): Promise<{ success: boolean; error?: string }> {
    const character = await getCharacter(characterId);
    if (!character) {
        return { success: false, error: 'Character not found' };
    }

    // Check if already in a party
    const existingParty = await getCharacterParty(characterId);
    if (existingParty) {
        return { success: false, error: 'Already in a party' };
    }

    const store = await loadData<PartyStore>(PARTIES_FILE);
    if (!store || !store.parties[partyId]) {
        return { success: false, error: 'Party not found' };
    }

    const party = store.parties[partyId];

    // Check party size
    if (party.memberIds.length >= party.maxSize) {
        return { success: false, error: 'Party is full' };
    }

    // Add member
    party.memberIds.push(characterId);
    await saveData(PARTIES_FILE, store);

    return { success: true };
}

/**
 * Leave a party
 */
export async function leaveParty(characterId: string): Promise<{ success: boolean; error?: string }> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    if (!store) return { success: false, error: 'No parties exist' };

    // Find the party this character is in
    let foundPartyId: string | null = null;
    for (const [partyId, party] of Object.entries(store.parties)) {
        if (party.memberIds.includes(characterId)) {
            foundPartyId = partyId;
            break;
        }
    }

    if (!foundPartyId) {
        return { success: false, error: 'Not in a party' };
    }

    const party = store.parties[foundPartyId];

    // Remove member
    party.memberIds = party.memberIds.filter(id => id !== characterId);

    // If leader left, assign new leader or disband
    if (party.leaderId === characterId) {
        if (party.memberIds.length > 0) {
            party.leaderId = party.memberIds[0];
        } else {
            // Disband party
            delete store.parties[foundPartyId];
            await saveData(PARTIES_FILE, store);
            return { success: true };
        }
    }

    await saveData(PARTIES_FILE, store);
    return { success: true };
}

/**
 * Get party by ID
 */
export async function getParty(partyId: string): Promise<Party | null> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    return store?.parties[partyId] || null;
}

/**
 * Get the party a character belongs to
 */
export async function getCharacterParty(characterId: string): Promise<Party | null> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    if (!store) return null;

    for (const party of Object.values(store.parties)) {
        if (party.memberIds.includes(characterId)) {
            return party;
        }
    }

    return null;
}

/**
 * Get all parties
 */
export async function getAllParties(): Promise<Party[]> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    return store ? Object.values(store.parties) : [];
}

/**
 * Get party members with character details
 */
export async function getPartyMembers(partyId: string): Promise<Character[]> {
    const party = await getParty(partyId);
    if (!party) return [];

    const members: Character[] = [];
    for (const memberId of party.memberIds) {
        const char = await getCharacter(memberId);
        if (char) members.push(char);
    }

    return members;
}

/**
 * Disband a party (leader only)
 */
export async function disbandParty(
    partyId: string,
    requesterId: string
): Promise<{ success: boolean; error?: string }> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    if (!store || !store.parties[partyId]) {
        return { success: false, error: 'Party not found' };
    }

    const party = store.parties[partyId];

    // Only leader can disband
    if (party.leaderId !== requesterId) {
        return { success: false, error: 'Only party leader can disband' };
    }

    delete store.parties[partyId];
    await saveData(PARTIES_FILE, store);

    return { success: true };
}

/**
 * Transfer party leadership
 */
export async function transferLeadership(
    partyId: string,
    currentLeaderId: string,
    newLeaderId: string
): Promise<{ success: boolean; error?: string }> {
    const store = await loadData<PartyStore>(PARTIES_FILE);
    if (!store || !store.parties[partyId]) {
        return { success: false, error: 'Party not found' };
    }

    const party = store.parties[partyId];

    // Verify current leader
    if (party.leaderId !== currentLeaderId) {
        return { success: false, error: 'Only current leader can transfer' };
    }

    // Verify new leader is in party
    if (!party.memberIds.includes(newLeaderId)) {
        return { success: false, error: 'New leader must be in party' };
    }

    party.leaderId = newLeaderId;
    await saveData(PARTIES_FILE, store);

    return { success: true };
}
