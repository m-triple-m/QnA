import React, { useEffect, useRef, useState } from 'react';
import WordCloud from 'wordcloud';

// Vibrant neon color palette for canvas rendering
const CANVAS_COLORS = [
  '#34d399', // Emerald
  '#22d3ee', // Cyan
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#38bdf8', // Sky Blue
  '#fbbf24', // Yellow Gold
  '#2dd4bf', // Teal
];

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export default function WordCloudRenderer({
  words = [], // Array of { text, count, isCorrect, voters, ... }
  isAnswerRevealed = false,
  onHoverItem,
  onClickItem,
  shape = 'circle', // 'circle' | 'cardioid' | 'diamond' | 'square' | 'triangle' | 'star'
  rotateRatio = 0.25,
  minCanvasHeight = 440,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 440 });

  // Map of lowercase word -> item object for quick lookup
  const wordMapRef = useRef(new Map());

  // Handle Container Resize with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(300, Math.floor(width));
        const h = Math.max(minCanvasHeight, Math.floor(height || minCanvasHeight));
        setCanvasDimensions({ width: w, height: h });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [minCanvasHeight]);

  // Run WordCloud library layout on the canvas
  useEffect(() => {
    if (!canvasRef.current || !WordCloud.isSupported) return;

    const canvas = canvasRef.current;
    const { width, height } = canvasDimensions;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    const map = new Map();
    words.forEach((w) => {
      map.set(w.text.toLowerCase().trim(), w);
    });
    wordMapRef.current = map;

    if (words.length === 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width, height);
      return;
    }

    // Find max count to scale weights
    const maxCount = words.reduce((max, w) => Math.max(max, w.count || 1), 1);

    // Format list for wordcloud library: [ [wordText, weight], ... ]
    const formattedList = words.map((w) => [w.text, Math.max(w.count, 1)]);

    // Call wordcloud library
    try {
      WordCloud(canvas, {
        list: formattedList,
        gridSize: Math.max(6, Math.round(width / 120)),
        weightFactor: (size) => {
          // Responsive dynamic weight factor
          const baseSize = Math.max(16, Math.floor(Math.min(width, height) / 22));
          const scaleRange = Math.max(28, Math.floor(Math.min(width, height) / 10));
          const ratio = Math.pow(size / maxCount, 0.85); // smooth logarithmic curve
          return baseSize + ratio * scaleRange;
        },
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '900',
        color: (word) => {
          const item = wordMapRef.current.get(word.toLowerCase().trim());
          if (isAnswerRevealed && item) {
            if (item.isCorrect) return '#10b981'; // Neon Emerald
            return 'rgba(148, 163, 184, 0.35)'; // Muted Slate
          }
          const idx = Math.abs(stringHash(word)) % CANVAS_COLORS.length;
          return CANVAS_COLORS[idx];
        },
        rotateRatio: rotateRatio,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        shape: shape,
        ellipticity: 0.7,
        drawOutOfBound: false,
        shrinkToFit: true,
        hover: (item, dimension, event) => {
          if (!item) {
            canvas.style.cursor = 'default';
            if (onHoverItem) onHoverItem(null);
            return;
          }
          canvas.style.cursor = 'pointer';
          const itemObj = wordMapRef.current.get(item[0].toLowerCase().trim());
          if (onHoverItem && itemObj) onHoverItem(itemObj);
        },
        click: (item, dimension, event) => {
          if (!item) {
            if (onClickItem) onClickItem(null);
            return;
          }
          const itemObj = wordMapRef.current.get(item[0].toLowerCase().trim());
          if (onClickItem && itemObj) onClickItem(itemObj);
        },
      });
    } catch (err) {
      console.error('WordCloud render error:', err);
    }

    return () => {
      WordCloud.stop();
    };
  }, [words, canvasDimensions, isAnswerRevealed, shape, rotateRatio, onHoverItem, onClickItem]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] flex items-center justify-center relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="transition-all duration-300 max-w-full"
        style={{
          width: `${canvasDimensions.width}px`,
          height: `${canvasDimensions.height}px`,
        }}
      />
    </div>
  );
}
