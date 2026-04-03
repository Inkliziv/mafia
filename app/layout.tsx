import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Mafia O'yini",
  description: "Onlayn Mafia partiya o'yini - Do'stlar bilan o'ynang!",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎭</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <div className="min-h-screen" style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(127, 29, 29, 0.12) 0%, transparent 60%)'
        }}>
          {children}
        </div>
      </body>
    </html>
  );
}
