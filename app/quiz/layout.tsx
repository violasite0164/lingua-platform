import { Press_Start_2P } from 'next/font/google';

/**
 * 英語測驗：8-bit 像素字體（僅 /quiz）
 * @see https://fonts.google.com/specimen/Press+Start+2P
 */
const pressStart2p = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start-2p',
});

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`quiz-font-pixel ${pressStart2p.variable} ${pressStart2p.className}`}
    >
      {children}
    </div>
  );
}
