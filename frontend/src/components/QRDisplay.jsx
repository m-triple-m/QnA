import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

export default function QRDisplay({ value, sessionCode, sessionUrl }) {
  const [copied, setCopied] = useState(false);

  const qrValue = value || sessionUrl || `${window.location.origin}/join/${sessionCode || ''}`;
  const displayCode = sessionCode || (value ? value.split('/').pop() : '');
  const urlToCopy = sessionUrl || qrValue;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      toast.success('Join link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      toast.success('Code copied!');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Scan to Join</h3>
        <p className="text-sm text-gray-500 mt-0.5">Use your phone camera or QR scanner</p>
      </div>

      <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100 flex items-center justify-center">
        {qrValue ? (
          <QRCode
            value={qrValue}
            size={200}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            viewBox="0 0 256 256"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-400">
            No QR Data
          </div>
        )}
      </div>

      {/* Code Text below in large monospace font */}
      {displayCode && (
        <div className="mt-5 text-center w-full">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">
            Game PIN / Code
          </p>
          <div
            onClick={handleCopyCode}
            title="Click to copy code"
            className="cursor-pointer group inline-flex items-center justify-center gap-2 px-6 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition"
          >
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-purple-700">
              {displayCode}
            </span>
          </div>
        </div>
      )}

      {/* Copy Link & Action Buttons */}
      <div className="mt-5 w-full flex flex-col gap-2">
        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Join Link</span>
            </>
          )}
        </Button>

        {urlToCopy && (
          <a
            href={urlToCopy}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-center text-gray-500 hover:text-purple-600 flex items-center justify-center gap-1 mt-1 transition"
          >
            <span>Open participant link in new tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
