// Party API - Create and manage parties
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import {
    createParty,
    joinParty,
    leaveParty,
    getParty,
    getAllParties,
    getPartyMembers,
    disbandParty
} from '@/lib/game/party';

// Get parties
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('party_id');

    if (partyId) {
        const party = await getParty(partyId);
        if (!party) {
            return NextResponse.json({ success: false, error: 'Party not found' }, { status: 404 });
        }
        const members = await getPartyMembers(partyId);
        return NextResponse.json({
            success: true,
            party,
            members: members.map(m => ({
                id: m.id,
                name: m.name,
                class: m.class,
                level: m.level,
                hp: m.hp,
                maxHp: m.maxHp,
            })),
        });
    }

    const parties = await getAllParties();
    return NextResponse.json({
        success: true,
        parties: parties.map(p => ({
            id: p.id,
            name: p.name,
            member_count: p.memberIds.length,
            max_size: p.maxSize,
        })),
    });
}

// Party actions
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const session = await validateSession(token);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const { action, party_id, party_name, character_id } = body;

        if (!action || !character_id) {
            return NextResponse.json(
                { success: false, error: 'Need action and character_id' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'create': {
                if (!party_name) {
                    return NextResponse.json({ success: false, error: 'Need party_name' }, { status: 400 });
                }
                const party = await createParty(party_name, character_id);
                if (!party) {
                    return NextResponse.json({ success: false, error: 'Failed to create party' }, { status: 400 });
                }
                return NextResponse.json({
                    success: true,
                    party_id: party.id,
                    message: `파티 "${party_name}" 생성 완료!`,
                });
            }

            case 'join': {
                if (!party_id) {
                    return NextResponse.json({ success: false, error: 'Need party_id' }, { status: 400 });
                }
                const result = await joinParty(party_id, character_id);
                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
                }
                return NextResponse.json({ success: true, message: '파티에 참가했습니다!' });
            }

            case 'leave': {
                const result = await leaveParty(character_id);
                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
                }
                return NextResponse.json({ success: true, message: '파티를 떠났습니다.' });
            }

            case 'disband': {
                if (!party_id) {
                    return NextResponse.json({ success: false, error: 'Need party_id' }, { status: 400 });
                }
                const result = await disbandParty(party_id, character_id);
                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
                }
                return NextResponse.json({ success: true, message: '파티가 해산되었습니다.' });
            }

            default:
                return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Party operation failed' }, { status: 500 });
    }
}
