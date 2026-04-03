'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface QRCodeDisplayProps {
  url: string;
  roomId: string;
}

export default function QRCodeDisplay({ url, roomId }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-gray-100">
        <QRCodeSVG 
          value={url} 
          size={200}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"Q"}
        />
      </div>
      
      <div className="mt-6 w-full relative">
        <div className="bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between p-3">
          <span className="font-mono text-xl tracking-widest font-bold text-white ml-2">
            {roomId}
          </span>
          <button
            onClick={copyUrl}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
          >
            {copied ? `✅ ${t('qr_copied')}` : `📋 ${t('qr_copy')}`}
          </button>
        </div>
        <p className="mt-2 text-center text-sm text-gray-400">
           {t('qr_desc')}
        </p>
      </div>
    </div>
  );
}
