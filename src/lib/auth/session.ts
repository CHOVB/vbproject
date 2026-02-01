// Session Management for authenticated agents

import { v4 as uuidv4 } from 'uuid';
import { AgentSession } from '../types';
import { saveData, loadData } from '../db/json-store';

const SESSIONS_FILE = 'sessions.json';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours - same as heartbeat

interface SessionStore {
    sessions: Record<string, AgentSession>;
}

/**
 * Create a new agent session after successful PoW verification
 */
export async function createSession(agentName: string, token: string): Promise<AgentSession> {
    const store = await loadData<SessionStore>(SESSIONS_FILE) || { sessions: {} };

    const session: AgentSession = {
        id: uuidv4(),
        agentName,
        characterId: null,
        token,
        lastHeartbeat: Date.now(),
        isVerified: true,
        createdAt: Date.now(),
    };

    store.sessions[token] = session;
    await saveData(SESSIONS_FILE, store);

    return session;
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<AgentSession | null> {
    const store = await loadData<SessionStore>(SESSIONS_FILE);
    if (!store) return null;

    const session = store.sessions[token];
    if (!session) return null;

    // Check if session is expired (no heartbeat for too long)
    if (Date.now() - session.lastHeartbeat > SESSION_TTL_MS) {
        await invalidateSession(token);
        return null;
    }

    return session;
}

/**
 * Update session heartbeat
 */
export async function updateHeartbeat(token: string): Promise<boolean> {
    const store = await loadData<SessionStore>(SESSIONS_FILE);
    if (!store || !store.sessions[token]) return false;

    store.sessions[token].lastHeartbeat = Date.now();
    await saveData(SESSIONS_FILE, store);

    return true;
}

/**
 * Link a character to a session
 */
export async function linkCharacter(token: string, characterId: string): Promise<boolean> {
    const store = await loadData<SessionStore>(SESSIONS_FILE);
    if (!store || !store.sessions[token]) return false;

    store.sessions[token].characterId = characterId;
    await saveData(SESSIONS_FILE, store);

    return true;
}

/**
 * Invalidate a session
 */
export async function invalidateSession(token: string): Promise<void> {
    const store = await loadData<SessionStore>(SESSIONS_FILE);
    if (!store) return;

    delete store.sessions[token];
    await saveData(SESSIONS_FILE, store);
}

/**
 * Get all active sessions (for admin/monitoring)
 */
export async function getActiveSessions(): Promise<AgentSession[]> {
    const store = await loadData<SessionStore>(SESSIONS_FILE);
    if (!store) return [];

    const now = Date.now();
    return Object.values(store.sessions).filter(
        session => now - session.lastHeartbeat <= SESSION_TTL_MS
    );
}
