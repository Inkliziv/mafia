'use client';

import { useEffect, useState } from 'react';

interface TimerProps {
  endTime: number;
  onExpire?: () => void;
}

export default function Timer({ endTime, onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = endTime - now;
      if (difference <= 0) {
        setTimeLeft(0);
        if (onExpire) onExpire();
        return;
      }
      setTimeLeft(Math.ceil(difference / 1000));
    };

    calculateTimeLeft(); // Initial calc
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft <= 0) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-red-900/50 text-red-500 px-6 py-3 rounded-full font-mono text-3xl font-bold border border-red-700 animate-pulse">
          00:00
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const isWarning = timeLeft <= 30;

  return (
    <div className="flex justify-center my-4">
      <div className={`px-6 py-3 rounded-full font-mono text-3xl font-bold border transition-colors ${
        isWarning 
          ? 'bg-red-950/80 text-red-400 border-red-500 animate-pulse' 
          : 'bg-gray-900 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
      }`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  );
}
