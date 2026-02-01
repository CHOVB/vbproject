// Exploration API - Zone exploration and encounter discovery
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { getCharacter } from '@/lib/game/character';
import { explore, getAvailableZones, getExplorationState } from '@/lib/game/exploration';

// Get exploration info (available zones, current position)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('character_id');

    if (!characterId) {
        return NextResponse.json({ success: false, error: 'Need character_id' }, { status: 400 });
    }

    const zones = await getAvailableZones(characterId);
    const state = await getExplorationState(characterId);

    return NextResponse.json({
        success: true,
        current_zone: zones.current,
        explored_zones: zones.explored,
        adjacent_zones: zones.adjacent.map(id => ({ id, name: '???' })), // Hidden until explored
        has_active_encounter: !!state?.activeEncounter,
    });
}

// Explore a zone
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
        const { character_id, zone_id } = body;

        if (!character_id || !zone_id) {
            return NextResponse.json(
                { success: false, error: 'Need character_id and zone_id' },
                { status: 400 }
            );
        }

        // Get character to check level
        const character = await getCharacter(character_id);
        if (!character) {
            return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
        }

        // Explore the zone
        const result = await explore(character_id, zone_id, character.level);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        // Return encounter info (monsters hidden until combat starts)
        const encounter = result.encounter!;

        return NextResponse.json({
            success: true,
            encounter: {
                id: encounter.id,
                type: encounter.type,
                message: encounter.message,
                monster_count: encounter.monsters?.length || 0,
                // Don't expose monster details - discover through combat!
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Exploration failed' }, { status: 500 });
    }
}
