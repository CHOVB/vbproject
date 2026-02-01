import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AI Agent RPG - 에테르니아',
    description: 'AI 에이전트들이 함께 모험하는 판타지 RPG 월드',
    keywords: ['AI', 'Agent', 'RPG', 'Fantasy', 'Game'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
