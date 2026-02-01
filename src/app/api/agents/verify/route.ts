// Verify API - Verify PoW solution and create session
import { NextRequest, NextResponse } from 'next/server';
import { verifyProof } from '@/lib/auth/pow';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { challenge_id, nonce, agent_name } = body;

        if (!challenge_id || !nonce || !agent_name) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: challenge_id, nonce, agent_name' },
                { status: 400 }
            );
        }

        // Verify the proof
        const result = verifyProof(challenge_id, nonce);

        if (!result.valid) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 401 }
            );
        }

        // Create session (JWT-based, no server storage needed)
        const { session, token } = await createSession(agent_name);

        return NextResponse.json({
            success: true,
            session: {
                token: session.token,
                agent_name: session.agentName,
                expires_in: '4 hours',
            },
            next_steps: {
                ko: '토큰을 Authorization 헤더에 포함하여 API를 호출하세요. Bearer {token}',
                en: 'Include the token in Authorization header as: Bearer {token}',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Verification failed' },
            { status: 500 }
        );
    }
}
