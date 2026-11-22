import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';
import {
  X, Minimize2, Maximize2, Copy, Check,
  QrCode, Move
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DraggableQRCode({
  qrData,
  code,
  isOpen = true,
  onClose,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset img error on qrData change
  useEffect(() => {
    setImgError(false);
  }, [qrData]);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${code || ''}`
    : `/join/${code || ''}`;

  const handleCopyLink = (e) => {
    e?.stopPropagation?.();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.08}
          initial={{ opacity: 0, scale: 0.85, x: 0, y: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
          whileDrag={{ scale: 1.03, zIndex: 10000 }}
          layout
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          style={{
            position: 'fixed',
            top: 80,
            right: 24,
            touchAction: 'none',
          }}
          className="z-[9999] select-none cursor-grab active:cursor-grabbing"
        >
          <motion.div
            layout
            className={`bg-slate-900/95 border-2 border-purple-500/60 text-white backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl transition-shadow ${
              isMinimized ? 'w-52 p-2.5 shadow-purple-950/40' : 'w-64 p-4 shadow-purple-950/60'
            }`}
          >
            {/* Top Header / Drag Grip Bar */}
            <div
              className="flex items-center justify-between pb-2 border-b border-white/10"
              title="Click and drag anywhere to move this QR code"
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-300 pointer-events-none">
                <Move className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider font-extrabold">
                  {isMinimized ? `PIN: ${code || '...'}` : 'Draggable QR'}
                </span>
              </div>

              <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                {/* Minimize / Maximize button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized((v) => !v);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                  title={isMinimized ? 'Expand QR Code' : 'Collapse to Mini Badge'}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close button */}
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                    title="Hide QR Code"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded View */}
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-3 flex flex-col items-center text-center"
              >
                {/* The QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-xl inline-flex items-center justify-center border border-gray-200 w-44 h-44">
                  {qrData && !imgError ? (
                    <img
                      src={qrData}
                      alt={`QR Code PIN ${code}`}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : code ? (
                    <QRCode
                      value={joinUrl}
                      size={152}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 256 256"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                      <QrCode className="w-12 h-12 animate-pulse text-purple-600" />
                      <span className="text-[10px] text-gray-600 font-bold">Generating QR...</span>
                    </div>
                  )}
                </div>

                {/* PIN Code Pill */}
                <div className="mt-3 w-full bg-purple-500/20 border border-purple-500/40 py-1.5 px-3 rounded-xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-1.5 pl-0.5 pointer-events-none">
                    <span className="text-[10px] uppercase font-black text-gray-400">PIN:</span>
                    <span className="font-mono text-lg font-black text-purple-200 tracking-wider">
                      {code || '------'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs transition flex items-center gap-1"
                    title="Copy Join Link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-bold">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between w-full text-[10px] text-gray-400 font-mono px-1 pointer-events-none">
                  <span className="truncate max-w-[170px]">{joinUrl}</span>
                  <span className="text-purple-400 font-sans text-[9px] uppercase font-bold tracking-tight">drag anywhere</span>
                </div>
              </motion.div>
            )}

            {/* Minimized Pill View */}
            {isMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between pt-1 text-xs"
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  <div className="w-6 h-6 bg-white rounded-md p-0.5 shadow flex items-center justify-center">
                    {qrData && !imgError ? (
                      <img src={qrData} alt="Mini QR" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-4 h-4 text-purple-700" />
                    )}
                  </div>
                  <span className="font-mono font-black text-purple-200 text-sm tracking-wide">
                    {code || '------'}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs transition"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
