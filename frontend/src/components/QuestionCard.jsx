import React, { useState, useEffect, useRef } from 'react';
import { Check, Send } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getMediaUrl } from '../lib/utils';
import TiltCard from './ui/TiltCard';
import { staggerFadeUp, pulseElement } from '../lib/gsapUtils';

// Kahoot-style vibrant colors for MCQs: red, blue, yellow, green
const MCQ_COLORS = [
  {
    bg: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700',
    border: 'border-rose-600',
    selected: 'ring-4 ring-rose-300 bg-rose-600',
    shape: '▲', // Triangle
  },
  {
    bg: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
    border: 'border-blue-600',
    selected: 'ring-4 ring-blue-300 bg-blue-600',
    shape: '◆', // Diamond
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    border: 'border-amber-600',
    selected: 'ring-4 ring-amber-300 bg-amber-600',
    shape: '●', // Circle
  },
  {
    bg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
    border: 'border-emerald-600',
    selected: 'ring-4 ring-emerald-300 bg-emerald-600',
    shape: '■', // Square
  },
];

export default function QuestionCard({
  question,
  options = [],
  onAnswer,
  answered = false,
  selectedOptionId = null,
  timeLimit = 30,
}) {
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedPollIds, setSelectedPollIds] = useState([]);
  const optionsGridRef = useRef(null);

  useEffect(() => {
    if (!optionsGridRef.current) return;
    staggerFadeUp(optionsGridRef.current, '.option-card-anim', {
      duration: 0.5,
      stagger: 0.08,
      y: 18,
      ease: 'power3.out',
    });
  }, [question?.id]);

  if (!question) return null;

  const handleSelectOption = (optionId, event) => {
    if (answered) return;
    if (event?.currentTarget) {
      pulseElement(event.currentTarget, { scale: 1.05, duration: 0.3 });
    }
    onAnswer({ optionId });
  };

  const handleShortAnswerSubmit = (e) => {
    e?.preventDefault();
    if (answered || !textAnswer.trim()) return;
    onAnswer({ textAnswer: textAnswer.trim() });
  };

  const togglePollOption = (id) => {
    if (answered) return;
    setSelectedPollIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePollSubmit = () => {
    if (answered || selectedPollIds.length === 0) return;
    onAnswer({ optionIds: selectedPollIds, optionId: selectedPollIds[0] });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4 py-2 select-none">
      {/* Media if present */}
      {question.media_url && (
        <div className="w-full max-h-56 mb-4 overflow-hidden rounded-2xl shadow-md flex justify-center bg-black/10">
          <img
            src={getMediaUrl(question.media_url)}
            alt="Question media"
            className="max-h-56 object-contain rounded-xl"
          />
        </div>
      )}

      {/* Question Text */}
      <div className="w-full bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-5 mb-6 text-center border border-gray-100">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug">
          {question.text}
        </h2>
        <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
          {question.type === 'mcq' && 'Multiple Choice'}
          {question.type === 'true_false' && 'True or False'}
          {question.type === 'short_answer' && 'Type your answer'}
          {question.type === 'poll' && 'Live Poll (Select your choices)'}
        </div>
      </div>

      {/* Answer Options Area */}
      <div ref={optionsGridRef} className="w-full">
        {/* MCQ Style Grid (4 colors) */}
        {question.type === 'mcq' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map((opt, idx) => {
              const color = MCQ_COLORS[idx % MCQ_COLORS.length];
              const isSelected = selectedOptionId === opt.id;

              return (
                <TiltCard key={opt.id} maxTilt={3.5} scale={1.015} className="option-card-anim">
                  <button
                    type="button"
                    disabled={answered}
                    onClick={(e) => handleSelectOption(opt.id, e)}
                    className={`w-full min-h-[72px] sm:min-h-[88px] rounded-2xl p-4 text-white font-bold text-lg sm:text-xl shadow-lg
                      flex flex-col justify-between text-left transition-all duration-200 cursor-pointer
                      ${color.bg} ${isSelected ? color.selected + ' scale-[0.98] ring-offset-2' : ''}
                      ${answered && !isSelected ? 'opacity-40 grayscale-[20%]' : ''}
                      active:scale-95`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <span className="text-2xl opacity-80">{color.shape}</span>
                        {opt.text && <span className="break-words leading-tight">{opt.text}</span>}
                      </span>
                      {isSelected && (
                        <span className="bg-white/20 p-2 rounded-full animate-bounce shrink-0">
                          <Check className="w-6 h-6 text-white" />
                        </span>
                      )}
                    </div>

                    {opt.media_url && (
                      <div className="w-full h-28 sm:h-32 mt-2 rounded-xl overflow-hidden bg-black/20 flex items-center justify-center p-1">
                        <img
                          src={getMediaUrl(opt.media_url)}
                          alt={opt.text || `Option ${idx + 1}`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </button>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* True / False (2 large cards) */}
        {question.type === 'true_false' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {options.map((opt, idx) => {
              const isTrue = opt.text.toLowerCase().includes('true');
              const isSelected = selectedOptionId === opt.id;
              const bgClass = isTrue
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-rose-600 hover:bg-rose-700';

              return (
                <TiltCard key={opt.id} maxTilt={3.5} scale={1.015} className="option-card-anim">
                  <button
                    type="button"
                    disabled={answered}
                    onClick={(e) => handleSelectOption(opt.id, e)}
                    className={`w-full min-h-[80px] sm:min-h-[100px] rounded-2xl p-5 text-white font-extrabold text-2xl shadow-xl
                      flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer
                      ${bgClass} ${isSelected ? 'ring-4 ring-white scale-[0.98]' : ''}
                      ${answered && !isSelected ? 'opacity-40' : ''}
                      active:scale-95`}
                  >
                    <span>{opt.text}</span>
                    {isSelected && <Check className="w-7 h-7 text-white animate-bounce" />}
                  </button>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* Short Answer Input */}
        {question.type === 'short_answer' && (
          <form
            onSubmit={handleShortAnswerSubmit}
            className="flex flex-col sm:flex-row gap-3 w-full bg-white/90 p-4 rounded-2xl shadow-xl backdrop-blur-md"
          >
            <Input
              type="text"
              disabled={answered}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="h-14 text-lg font-semibold px-4 flex-1 rounded-xl"
              autoFocus
            />
            <Button
              type="submit"
              disabled={answered || !textAnswer.trim()}
              className="h-14 px-8 text-lg font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white min-h-[48px] flex items-center justify-center gap-2"
            >
              <span>Submit</span>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        )}

        {/* Live Poll with Checkboxes */}
        {question.type === 'poll' && (
          <div className="space-y-3">
            {options.map((opt) => {
              const isChecked = selectedPollIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={answered}
                  onClick={() => togglePollOption(opt.id)}
                  className={`w-full min-h-[56px] px-5 py-3 rounded-xl border-2 flex items-center justify-between text-left font-semibold text-lg transition
                    ${isChecked ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-md' : 'border-gray-200 bg-white text-gray-800 hover:border-purple-300'}
                    ${answered ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    {opt.media_url && (
                      <img
                        src={getMediaUrl(opt.media_url)}
                        alt={opt.text || 'Poll option'}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    <span>{opt.text}</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center transition shrink-0 ml-3
                      ${isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-400 bg-white'}`}
                  >
                    {isChecked && <Check className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
            {!answered && (
              <Button
                onClick={handlePollSubmit}
                disabled={selectedPollIds.length === 0}
                className="w-full h-14 mt-4 font-bold text-lg rounded-xl bg-purple-600 hover:bg-purple-700 text-white min-h-[48px]"
              >
                Submit Poll Vote
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Answered Banner indicator */}
      {answered && (
        <div className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/40 text-white text-sm font-bold backdrop-blur-md animate-pulse">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Answer submitted! Waiting for time up...</span>
        </div>
      )}
    </div>
  );
}
