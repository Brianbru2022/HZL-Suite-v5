import React, { useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import type { ItemLibrary, Project, TradePackage } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';
import { feedbackError } from '../../utils/feedback';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';

interface AskAiModalProps {
  isOpen: boolean;
  project: Project | null;
  libraries: ItemLibrary[];
  trades: TradePackage[];
  activeBillId?: string | null;
  onClose: () => void;
  showToast: (opts: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
}

const STARTERS = [
  'What is the total value of this project?',
  'Which sections in the active bill still need trade allocation?',
  'How many trades have invited contractors but no returns yet?',
  'Summarise the current cost plan and contingency basis.',
];

function loadGeminiService() {
  return import('../../services/geminiService');
}

export const AskAiModal: React.FC<AskAiModalProps> = ({
  isOpen,
  project,
  libraries,
  trades,
  activeBillId,
  onClose,
  showToast,
}) => {
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const { preference: spellcheckPreference } = useSpellcheckPreference();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;

    setQuestion(prompt);
    setIsLoading(true);
    try {
      const { askWorkspaceQuestion } = await loadGeminiService();
      const result = await askWorkspaceQuestion(prompt, project, libraries, trades, activeBillId);
      if ('error' in result) {
        showToast({ type: 'error', message: feedbackError('Ask AI', result.error, 'Please try the question again.') });
        return;
      }
      setAnswer(result.data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60">
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden"
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="workspace-chip mb-3">
                <Bot className="h-3.5 w-3.5" />
                Ask AI
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Ask about this workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Ask questions about the current project, active bill, trade setup, cost plan, libraries, or tender position.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close Ask AI">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-surface-900/92">
          <div className="space-y-6">
            <div className="workspace-sidebar p-5">
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Your question
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  spellCheck={spellcheckPreference.enabled}
                  lang={spellcheckPreference.language}
                  placeholder="Ask something like: Which sections in this bill are still commercially incomplete?"
                  className="workspace-input mt-3 min-h-[120px] resize-y"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => {
                      setQuestion(starter);
                      void handleAsk(starter);
                    }}
                    className="workspace-secondary-btn px-3 py-2 text-xs"
                  >
                    {starter}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleAsk()}
                  disabled={isLoading || !question.trim()}
                  className="workspace-primary-btn px-4 py-2.5 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Ask AI
                </button>
              </div>
            </div>

            <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-5 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Answer</div>
              {answer ? (
                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {answer}
                </div>
              ) : (
                <div className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ask a question to get a project-aware answer from the current workspace data.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
