'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface TimerProps {
  endTime: number;
  onExpire?: () => void;
  onWarning?: (secondsLeft: number) => void;
}

export default function Timer({ endTime, onExpire, onWarning }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const lastWarningRef = useRef<number>(-1);
  const hasExpiredRef = useRef(false);

  const stableOnWarning = useCallback((secs: number) => {
    onWarning?.(secs);
  }, [onWarning]);

  useEffect(() => {
    hasExpiredRef.current = false;
    lastWarningRef.current = -1;
  }, [endTime]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = endTime - now;
      if (difference <= 0) {
        setTimeLeft(0);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onExpire) onExpire();
        }
        return;
      }
      const secs = Math.ceil(difference / 1000);
      setTimeLeft(secs);

      // Trigger warning for last 5 seconds
      if (secs <= 5 && secs > 0 && secs !== lastWarningRef.current) {
        lastWarningRef.current = secs;
        stableOnWarning(secs);
      }
    };

    calculateTimeLeft(); // Initial calc
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire, stableOnWarning]);

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
  const isCritical = timeLeft <= 5;

  return (
    <div className="flex justify-center my-4">
      <div className={`px-6 py-3 rounded-full font-mono text-3xl font-bold border transition-colors ${
        isCritical
          ? 'bg-red-950/80 text-red-400 border-red-500 animate-heartbeat-pulse shadow-[0_0_25px_rgba(239,68,68,0.4)]'
          : isWarning 
            ? 'bg-red-950/80 text-red-400 border-red-500 animate-pulse' 
            : 'bg-gray-900 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
      }`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  );
}
