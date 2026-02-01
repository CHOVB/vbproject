// JWT-based Session Management for Serverless
// Tokens are self-contained, no server storage needed

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { AgentSession } from '../types';

// Secret key for JWT signing (in production, use environment variable)
const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'ai-agent-rpg-secret-key-2024-ethernia'
);

const SESSION_TTL_HOURS = 4;

interface SessionPayload extends JWTPayload {
    sessionId: string;
    agentName: string;
    characterId?: string;
}

/**
 * Create a new agent session after successful PoW verification
 * Returns a JWT token containing all session info
 */
export async function createSession(agentName: string): Promise<{ session: AgentSession; token: string }> {
    const sessionId = uuidv4();
    const now = Date.now();

    const session: AgentSession = {
        id: sessionId,
        agentName,
        characterId: null,
        token: '', // Will be set below
        lastHeartbeat: now,
        isVerified: true,
        createdAt: now,
    };

    // Create JWT token with session info embedded
    const token = await new SignJWT({
        sessionId,
        agentName,
    } as SessionPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_HOURS}h`)
        .sign(SECRET_KEY);

    session.token = token;

    return { session, token };
}

/**
 * Validate a session token (JWT verification)
 * No server storage needed - all info is in the token
 */
export async function validateSession(token: string): Promise<AgentSession | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        const sessionPayload = payload as SessionPayload;

        // Token is valid, reconstruct session
        return {
            id: sessionPayload.sessionId,
            agentName: sessionPayload.agentName,
            characterId: sessionPayload.characterId || null,
            token,
            lastHeartbeat: Date.now(),
            isVerified: true,
            createdAt: ((payload as JWTPayload).iat || 0) * 1000,
        };
    } catch (error) {
        // Token invalid or expired
        return null;
    }
}

/**
 * Update session with character ID (creates new token)
 */
export async function linkCharacter(token: string, characterId: string): Promise<string | null> {
    const session = await validateSession(token);
    if (!session) return null;

    // Create new token with character ID
    const newToken = await new SignJWT({
        sessionId: session.id,
        agentName: session.agentName,
        characterId,
    } as SessionPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_HOURS}h`)
        .sign(SECRET_KEY);

    return newToken;
}

/**
 * Heartbeat - just validate token (JWT auto-checks expiry)
 */
export async function updateHeartbeat(token: string): Promise<boolean> {
    const session = await validateSession(token);
    return session !== null;
}

/**
 * Invalidate session (for JWT, client just discards token)
 */
export async function invalidateSession(token: string): Promise<void> {
    // JWT is stateless - client should discard token
    // In production, could add to a blacklist
}

/**
 * Get active sessions (not available in stateless mode)
 */
export async function getActiveSessions(): Promise<AgentSession[]> {
    // JWT is stateless - can't list sessions without external storage
    return [];
}
