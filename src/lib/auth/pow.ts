// Proof of Work Authentication System
// This ensures only AI agents (fast computation) can participate

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PoWChallenge } from './types';

const CHALLENGES_STORE: Map<string, PoWChallenge> = new Map();

// Challenge configuration
const CONFIG = {
    TARGET_PREFIX: '0000',    // Hash must start with this (4 leading zeros)
    LIMIT_MS: 3000,           // 3 second time limit
    CHALLENGE_TTL_MS: 60000,  // Challenge expires in 60 seconds
};

/**
 * Generate a new PoW challenge for an agent
 */
export function generateChallenge(): PoWChallenge {
    const challenge: PoWChallenge = {
        challengeId: uuidv4(),
        seed: crypto.randomBytes(16).toString('hex'),
        targetPrefix: CONFIG.TARGET_PREFIX,
        algorithm: 'sha256',
        limitMs: CONFIG.LIMIT_MS,
        createdAt: Date.now(),
        expiresAt: Date.now() + CONFIG.CHALLENGE_TTL_MS,
    };

    CHALLENGES_STORE.set(challenge.challengeId, challenge);

    // Cleanup expired challenges
    cleanupExpiredChallenges();

    return challenge;
}

/**
 * Verify an agent's proof of work solution
 * @param challengeId - The challenge ID
 * @param nonce - The nonce that the agent found
 * @returns true if valid, false otherwise
 */
export function verifyProof(challengeId: string, nonce: string): {
    valid: boolean;
    error?: string;
    token?: string;
} {
    const challenge = CHALLENGES_STORE.get(challengeId);

    if (!challenge) {
        return { valid: false, error: 'Challenge not found or expired' };
    }

    // Check if challenge is expired
    if (Date.now() > challenge.expiresAt) {
        CHALLENGES_STORE.delete(challengeId);
        return { valid: false, error: 'Challenge expired' };
    }

    // Verify the hash
    const input = challenge.seed + nonce;
    const hash = crypto.createHash('sha256').update(input).digest('hex');

    if (!hash.startsWith(challenge.targetPrefix)) {
        return { valid: false, error: 'Invalid proof - hash does not match target prefix' };
    }

    // Valid! Generate a session token
    CHALLENGES_STORE.delete(challengeId);
    const token = generateSessionToken();

    return { valid: true, token };
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
    return 'rpg_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Cleanup expired challenges
 */
function cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [id, challenge] of CHALLENGES_STORE.entries()) {
        if (now > challenge.expiresAt) {
            CHALLENGES_STORE.delete(id);
        }
    }
}

/**
 * Utility: Solve a PoW challenge (for testing)
 * This simulates what an AI agent would do
 */
export function solveChallenge(seed: string, targetPrefix: string): string {
    let nonce = 0;
    while (true) {
        const input = seed + nonce.toString();
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        if (hash.startsWith(targetPrefix)) {
            return nonce.toString();
        }
        nonce++;
        // Safety limit for testing
        if (nonce > 10000000) {
            throw new Error('Could not find nonce within limit');
        }
    }
}
