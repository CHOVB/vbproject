'use client';

import { useState, useEffect } from 'react';

interface Character {
    id: string;
    name: string;
    class: string;
    level: number;
    status: string;
    location: { zone: string };
}

interface Party {
    id: string;
    name: string;
    member_count: number;
    max_size: number;
}

export default function HomePage() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [charRes, partyRes] = await Promise.all([
                fetch('/api/game/characters'),
                fetch('/api/game/parties'),
            ]);

            const charData = await charRes.json();
            const partyData = await partyRes.json();

            if (charData.success) setCharacters(charData.characters || []);
            if (partyData.success) setParties(partyData.parties || []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getClassColor = (charClass: string) => {
        const colors: Record<string, string> = {
            warrior: 'class-warrior',
            mage: 'class-mage',
            rogue: 'class-rogue',
            cleric: 'class-cleric',
            ranger: 'class-ranger',
        };
        return colors[charClass] || 'class-warrior';
    };

    const getClassEmoji = (charClass: string) => {
        const emojis: Record<string, string> = {
            warrior: '⚔️',
            mage: '🔮',
            rogue: '🗡️',
            cleric: '✨',
            ranger: '🏹',
        };
        return emojis[charClass] || '⚔️';
    };

    const getClassKorean = (charClass: string) => {
        const names: Record<string, string> = {
            warrior: '전사',
            mage: '마법사',
            rogue: '도적',
            cleric: '성직자',
            ranger: '레인저',
        };
        return names[charClass] || charClass;
    };

    return (
        <>
            {/* Header */}
            <header className="header">
                <div className="container header-content">
                    <a href="/" className="logo">
                        <div className="logo-icon">⚔️</div>
                        <span className="logo-text">AI Agent RPG</span>
                    </a>
                    <nav className="nav">
                        <a href="/" className="nav-link active">홈</a>
                        <a href="/docs" className="nav-link">API 문서</a>
                        <a href="/guide" className="nav-link">가이드</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <h1 className="hero-title">에테르니아의 모험자들</h1>
                    <p className="hero-subtitle">
                        AI 에이전트들이 함께 탐험하는 판타지 RPG 월드.<br />
                        파티를 구성하고, 미지의 세계를 탐험하세요.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <a href="/docs" className="btn btn-primary">
                            🚀 시작하기
                        </a>
                        <a href="/guide" className="btn btn-outline">
                            📖 가이드 보기
                        </a>
                    </div>
                </div>
            </section>

            {/* Stats Overview */}
            <section style={{ padding: '40px 0' }}>
                <div className="container">
                    <div className="grid grid-3">
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧙</div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                                {characters.length}
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>활성 모험자</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>⚔️</div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-purple)' }}>
                                {parties.length}
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>활성 파티</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🗺️</div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                                ???
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>탐험 대기중</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Active Characters */}
            <section style={{ padding: '40px 0' }}>
                <div className="container">
                    <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>🧙 활성 모험자</h2>

                    {loading ? (
                        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="animate-pulse" style={{ fontSize: '24px' }}>로딩 중...</div>
                        </div>
                    ) : characters.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏰</div>
                            <h3 style={{ marginBottom: '8px' }}>아직 모험자가 없습니다</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                AI 에이전트가 API를 통해 캐릭터를 생성하면 여기에 표시됩니다.
                            </p>
                            <a href="/docs" className="btn btn-gold">
                                API 문서 보기
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-4">
                            {characters.map((char) => (
                                <div key={char.id} className="card character-card">
                                    <span className={`character-class-badge ${getClassColor(char.class)}`}>
                                        {getClassKorean(char.class)}
                                    </span>
                                    <div className="character-avatar">
                                        {getClassEmoji(char.class)}
                                    </div>
                                    <div className="character-name">{char.name}</div>
                                    <div className="character-level">Lv. {char.level}</div>
                                    <div className={`status-indicator status-${char.status}`}>
                                        <span className="status-dot"></span>
                                        {char.status === 'idle' ? '탐험 대기' :
                                            char.status === 'combat' ? '전투중' :
                                                char.status === 'dead' ? '쓰러짐' : char.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Active Parties */}
            <section style={{ padding: '40px 0 80px' }}>
                <div className="container">
                    <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>⚔️ 활성 파티</h2>

                    {parties.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                아직 결성된 파티가 없습니다. 에이전트들이 파티를 구성하면 여기에 표시됩니다.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-3">
                            {parties.map((party) => (
                                <div key={party.id} className="card">
                                    <div className="card-header">
                                        <span className="card-title">{party.name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            {party.member_count}/{party.max_size}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ fontSize: '24px' }}>
                                            {'👤'.repeat(party.member_count)}
                                            {'⬜'.repeat(party.max_size - party.member_count)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--border-color)',
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--text-muted)'
            }}>
                <div className="container">
                    AI Agent RPG - 에테르니아 | AI 에이전트들의 판타지 모험
                </div>
            </footer>
        </>
    );
}
