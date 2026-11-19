'use strict';

/**
 * Escape a CSV cell value: wrap in quotes and escape internal quotes.
 * @param {*} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV export for a completed session.
 *
 * Expected shape of sessionData:
 * {
 *   questions: [{ id, text, order_index }],       // sorted by order_index
 *   participants: [
 *     {
 *       id,
 *       nickname,
 *       score,
 *       answers: [
 *         {
 *           question_id,
 *           is_correct,          // boolean
 *           text_answer,         // string | null
 *           Option: { text }     // null for open-ended
 *         }
 *       ]
 *     }
 *   ]   // will be sorted by score desc inside this function
 * }
 *
 * @param {object} sessionData
 * @returns {string} CSV text
 */
function exportSessionCSV(sessionData) {
  const { questions = [], participants = [] } = sessionData;

  // Sort questions by order_index
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);

  // Sort participants by score descending
  const ranked = [...participants].sort((a, b) => b.score - a.score);

  // Build header row
  const questionHeaders = sortedQuestions.map((q, i) => escapeCSV(`Q${i + 1}: ${q.text}`));
  const header = ['Rank', 'Nickname', 'Score', ...questionHeaders].join(',');

  // Build data rows
  const rows = ranked.map((participant, index) => {
    const rank = index + 1;

    // Index participant's answers by question_id for quick lookup
    const answerMap = {};
    for (const ans of participant.answers || []) {
      answerMap[ans.question_id] = ans;
    }

    const questionCells = sortedQuestions.map((q) => {
      const ans = answerMap[q.id];
      if (!ans) return escapeCSV('—');

      // For MCQ/true_false show option text + correct/wrong label
      if (ans.Option && ans.Option.text) {
        const label = ans.is_correct ? 'correct' : 'wrong';
        return escapeCSV(`${ans.Option.text} (${label})`);
      }

      // For short_answer / poll show text answer
      if (ans.text_answer) {
        const label = ans.is_correct ? 'correct' : 'wrong';
        return escapeCSV(`${ans.text_answer} (${label})`);
      }

      return escapeCSV('no answer');
    });

    return [
      escapeCSV(rank),
      escapeCSV(participant.nickname),
      escapeCSV(participant.score),
      ...questionCells,
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}

module.exports = { exportSessionCSV };
