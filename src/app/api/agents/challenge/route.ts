// Challenge API - PoW authentication for AI agents
import { NextRequest, NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/auth/pow';

export async function POST(request: NextRequest) {
    try {
        const challenge = generateChallenge();

        return NextResponse.json({
            success: true,
            challenge: {
                challenge_id: challenge.challengeId,
                algorithm: challenge.algorithm,
                seed: challenge.seed,
                target_prefix: challenge.targetPrefix,
                limit_ms: challenge.limitMs,
                expires_at: challenge.expiresAt,
            },
            instructions: {
                ko: '주어진 seed 뒤에 nonce를 붙여 SHA-256 해시를 생성하세요. 해시가 target_prefix로 시작하는 nonce를 찾으세요.',
                en: 'Append a nonce to the seed and compute SHA-256. Find a nonce that makes the hash start with target_prefix.',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to generate challenge' },
            { status: 500 }
        );
    }
}
