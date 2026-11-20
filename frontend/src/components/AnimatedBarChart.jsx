import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3, AlignLeft, BarChart2, ArrowDownUp, Trophy } from 'lucide-react';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// High-contrast neon color palette for chart bars
const BAR_COLORS = [
  { fill: 'rgba(168, 85, 247, 0.85)', border: '#c084fc' }, // Purple
  { fill: 'rgba(6, 182, 212, 0.85)', border: '#22d3ee' },  // Cyan
  { fill: 'rgba(16, 185, 129, 0.85)', border: '#34d399' }, // Emerald
  { fill: 'rgba(245, 158, 11, 0.85)', border: '#fbbf24' }, // Amber
  { fill: 'rgba(236, 72, 153, 0.85)', border: '#f472b6' }, // Pink
  { fill: 'rgba(99, 102, 241, 0.85)', border: '#818cf8' }, // Indigo
  { fill: 'rgba(244, 63, 94, 0.85)', border: '#fb7185' },  // Rose
  { fill: 'rgba(59, 130, 246, 0.85)', border: '#60a5fa' }, // Blue
];

const CORRECT_BAR_COLOR = {
  fill: 'rgba(16, 185, 129, 0.95)',
  border: '#34d399',
};

const MUTED_BAR_COLOR = {
  fill: 'rgba(100, 116, 139, 0.35)',
  border: 'rgba(148, 163, 184, 0.5)',
};

export default function AnimatedBarChart({
  items = [], // Array of { text, count (or votes), isCorrect, voters: [] }
  totalCount = 0,
  isAnswerRevealed = false,
  isDark = true,
  onBarClick = null,
  showControls = true,
}) {
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'
  const [sortBy, setSortBy] = useState('votes'); // 'votes' | 'default'

  // Prepare & sort data
  const processedItems = useMemo(() => {
    let list = items.map((it, idx) => ({
      text: it.text || `Item ${idx + 1}`,
      count: Number(it.count !== undefined ? it.count : it.votes || 0),
      isCorrect: Boolean(it.isCorrect),
      voters: it.voters || [],
      originalIndex: idx,
    }));

    if (sortBy === 'votes') {
      list.sort((a, b) => b.count - a.count);
    }
    return list;
  }, [items, sortBy]);

  const totalVotes = useMemo(() => {
    if (totalCount > 0) return totalCount;
    return processedItems.reduce((acc, curr) => acc + curr.count, 0);
  }, [processedItems, totalCount]);

  // ChartJS Data config
  const chartData = useMemo(() => {
    const labels = processedItems.map((it) => it.text);
    const counts = processedItems.map((it) => it.count);

    const backgroundColors = processedItems.map((it, idx) => {
      if (isAnswerRevealed) {
        return it.isCorrect ? CORRECT_BAR_COLOR.fill : MUTED_BAR_COLOR.fill;
      }
      return BAR_COLORS[idx % BAR_COLORS.length].fill;
    });

    const borderColors = processedItems.map((it, idx) => {
      if (isAnswerRevealed) {
        return it.isCorrect ? CORRECT_BAR_COLOR.border : MUTED_BAR_COLOR.border;
      }
      return BAR_COLORS[idx % BAR_COLORS.length].border;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Votes',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: orientation === 'horizontal' ? 36 : 48,
        },
      ],
    };
  }, [processedItems, orientation, isAnswerRevealed]);

  // ChartJS Options with smooth animations
  const chartOptions = useMemo(() => {
    const isHorizontal = orientation === 'horizontal';

    return {
      indexAxis: isHorizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(168, 85, 247, 0.4)',
          borderWidth: 1.5,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          cornerRadius: 12,
          titleFont: {
            size: 14,
            weight: 'bold',
            family: 'Inter, system-ui, sans-serif',
          },
          bodyFont: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              const pct = totalVotes > 0 ? Math.round((val / totalVotes) * 100) : 0;
              const item = processedItems[context.dataIndex];
              const correctTag = item?.isCorrect && isAnswerRevealed ? ' ✓ (CORRECT)' : '';
              return ` ${val} votes (${pct}%)${correctTag}`;
            },
            afterBody: function (context) {
              const item = processedItems[context[0].dataIndex];
              if (item?.voters && item.voters.length > 0) {
                const voterNames = item.voters
                  .slice(0, 5)
                  .map((v) => (typeof v === 'object' ? v.nickname : v))
                  .join(', ');
                const extra = item.voters.length > 5 ? ` +${item.voters.length - 5} more` : '';
                return `Voters: ${voterNames}${extra}`;
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            tickColor: 'transparent',
          },
          ticks: {
            color: isDark ? '#94a3b8' : '#64748b',
            font: {
              family: 'Inter, system-ui, sans-serif',
              weight: 'bold',
              size: 11,
            },
            precision: 0,
            beginAtZero: true,
          },
        },
        y: {
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            tickColor: 'transparent',
          },
          ticks: {
            color: isDark ? '#f1f5f9' : '#1e293b',
            font: {
              family: 'Inter, system-ui, sans-serif',
              weight: 'bold',
              size: 12,
            },
            autoSkip: false,
          },
        },
      },
      onClick: (event, elements) => {
        if (!elements || elements.length === 0 || !onBarClick) return;
        const clickedIndex = elements[0].index;
        const item = processedItems[clickedIndex];
        if (item) onBarClick(item);
      },
    };
  }, [orientation, processedItems, totalVotes, isAnswerRevealed, isDark, onBarClick]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Chart Toolbar Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span>Interactive Animated Bar Chart</span>
            <span>·</span>
            <span className="font-mono text-purple-300">{totalVotes} Total Votes</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy((s) => (s === 'votes' ? 'default' : 'votes'))}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition"
              title="Toggle Sort Order"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>{sortBy === 'votes' ? 'Ranked Highest' : 'Original Order'}</span>
            </button>

            {/* Orientation Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/10 text-xs font-bold">
              <button
                onClick={() => setOrientation('horizontal')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  orientation === 'horizontal' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:text-white'
                }`}
                title="Horizontal Bars"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Horizontal</span>
              </button>
              <button
                onClick={() => setOrientation('vertical')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  orientation === 'vertical' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:text-white'
                }`}
                title="Vertical Columns"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vertical</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Canvas Container */}
      <div className="w-full h-[360px] sm:h-[420px] rounded-2xl bg-black/30 border border-white/10 p-4 sm:p-6 backdrop-blur-md relative shadow-inner">
        {processedItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart2 className="w-12 h-12 mb-2 opacity-30 text-purple-400" />
            <p className="font-bold text-base">No responses recorded yet</p>
            <p className="text-xs text-gray-500 mt-0.5">Bars will animate live as votes come in!</p>
          </div>
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
