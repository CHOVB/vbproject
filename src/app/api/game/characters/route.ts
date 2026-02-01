// Character API - Create and manage characters
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { createCharacter, getAllCharacters, getCharacter } from '@/lib/game/character';
import { CharacterClass } from '@/lib/types';

// Get all characters or specific character
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('id');

    if (characterId) {
        const character = await getCharacter(characterId);
        if (!character) {
            return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, character });
    }

    const characters = await getAllCharacters();
    return NextResponse.json({
        success: true,
        characters: characters.map(c => ({
            id: c.id,
            name: c.name,
            class: c.class,
            level: c.level,
            status: c.status,
            location: c.location,
        })),
        total: characters.length,
    });
}

// Create a new character
export async function POST(request: NextRequest) {
    try {
        // Validate auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const session = await validateSession(token);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 });
        }

        const body = await request.json();
        const { name, character_class } = body;

        if (!name || !character_class) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, character_class' },
                { status: 400 }
            );
        }

        const validClasses: CharacterClass[] = ['warrior', 'mage', 'rogue', 'cleric', 'ranger'];
        if (!validClasses.includes(character_class)) {
            return NextResponse.json(
                { success: false, error: `Invalid class. Choose from: ${validClasses.join(', ')}` },
                { status: 400 }
            );
        }

        const character = await createCharacter(session.id, name, character_class);

        return NextResponse.json({
            success: true,
            character: {
                id: character.id,
                name: character.name,
                class: character.class,
                level: character.level,
                hp: character.hp,
                mp: character.mp,
                stats: character.stats,
                skills: character.skills,
                location: character.location,
            },
            message: `${name} 캐릭터가 생성되었습니다! 모험을 시작하세요.`,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to create character' },
            { status: 500 }
        );
    }
}
