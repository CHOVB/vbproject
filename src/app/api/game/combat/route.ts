// Combat API - Start and manage combat sessions
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import {
    startCombat,
    executeAttack,
    getCombatSession,
    getAvailableMonsters,
    getMonsterInfo
} from '@/lib/game/combat';
import { getCharacter } from '@/lib/game/character';

// Get combat session or list available monsters
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const combatId = searchParams.get('combat_id');
    const listMonsters = searchParams.get('list_monsters');

    if (listMonsters === 'true') {
        const monsterIds = getAvailableMonsters();
        const monsters = monsterIds.map(id => ({
            id,
            ...getMonsterInfo(id),
        }));
        return NextResponse.json({ success: true, monsters });
    }

    if (combatId) {
        const session = await getCombatSession(combatId);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Combat not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, combat: session });
    }

    return NextResponse.json({ success: false, error: 'Specify combat_id or list_monsters=true' }, { status: 400 });
}

// Start new combat or perform action
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
        const { action, character_id, combat_id, target_id, monster_ids } = body;

        // Start new combat
        if (action === 'start') {
            if (!character_id || !monster_ids || !Array.isArray(monster_ids)) {
                return NextResponse.json(
                    { success: false, error: 'Need character_id and monster_ids array' },
                    { status: 400 }
                );
            }

            const combat = await startCombat([character_id], monster_ids);
            if (!combat) {
                return NextResponse.json(
                    { success: false, error: 'Failed to start combat. Check character status.' },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                success: true,
                combat_id: combat.id,
                status: combat.status,
                turn_order: combat.turnOrder,
                current_turn: combat.currentTurn,
                log: combat.log,
                message: '전투가 시작되었습니다!',
            });
        }

        // Execute attack
        if (action === 'attack') {
            if (!combat_id || !character_id || !target_id) {
                return NextResponse.json(
                    { success: false, error: 'Need combat_id, character_id, and target_id' },
                    { status: 400 }
                );
            }

            const result = await executeAttack(combat_id, character_id, target_id);
            if (!result.success) {
                return NextResponse.json(
                    { success: false, error: 'Attack failed. Not your turn or invalid target.' },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                success: true,
                damage: result.damage,
                log: result.log,
                combat_ended: result.combatEnded,
                result: result.result,
            });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Combat operation failed' }, { status: 500 });
    }
}
