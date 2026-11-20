import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import sound from '@/lib/sound';
import toast from 'react-hot-toast';

export default function SoundToggle({ className = '', showLabel = false, isDark = false }) {
  const [enabled, setEnabled] = useState(sound.isEnabled());

  useEffect(() => {
    setEnabled(sound.isEnabled());
  }, []);

  const handleToggle = () => {
    const nextState = sound.toggle();
    setEnabled(nextState);
    if (nextState) {
      toast.success('Sound effects enabled 🔊', { duration: 1500, id: 'sound-toggle' });
    } else {
      toast('Sound effects muted 🔇', { duration: 1500, id: 'sound-toggle' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-xl transition flex items-center gap-2 text-xs font-semibold ${
        enabled
          ? isDark
            ? 'bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          : isDark
          ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200'
      } ${className}`}
      title={enabled ? 'Sound Effects: ON (Click to mute)' : 'Sound Effects: MUTED (Click to unmute)'}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
      ) : (
        <VolumeX className="w-4 h-4 text-red-400" />
      )}
      {showLabel && <span>{enabled ? 'Audio On' : 'Muted'}</span>}
    </button>
  );
}
