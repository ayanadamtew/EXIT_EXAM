'use client';

import React, { useState, useEffect } from 'react';
import { renderQuestion } from '@/lib/questionFormatter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Trash2,
  Menu,
  X,
  Timer,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

interface CbtExamProps {
  questions: Question[];
  studentName: string;
  studentId: string;
  mode: 'exam' | 'exercise';
  onFinish: (answers: Record<number, string>, flagged: number[]) => void;
  onExit: () => void;
}

export default function CbtExam({
  questions,
  studentName,
  studentId,
  mode,
  onFinish,
  onExit,
}: CbtExamProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  
  // Calculate time limit: 1.5 minutes (90 seconds) per question in chunk
  const calculatedTimeLimit = questions.length * 90;
  const [timeLeft, setTimeLeft] = useState(calculatedTimeLimit);

  const [showTimer, setShowTimer] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarningToast, setShowTabWarningToast] = useState(false);

  // Dialog states
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);

  // Load state from localStorage on mount (Auto-save recover)
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`cbt_${studentId}_answers`);
    const savedFlagged = localStorage.getItem(`cbt_${studentId}_flagged`);
    const savedTime = localStorage.getItem(`cbt_${studentId}_time`);
    const savedIdx = localStorage.getItem(`cbt_${studentId}_idx`);

    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedFlagged) setFlagged(JSON.parse(savedFlagged));
    if (savedIdx) setCurrentIdx(parseInt(savedIdx, 10));
    
    if (savedTime) {
      const parsedTime = parseInt(savedTime, 10);
      if (parsedTime > 0) setTimeLeft(parsedTime);
    } else {
      setTimeLeft(calculatedTimeLimit);
    }
  }, [studentId, calculatedTimeLimit]);

  // Save state on changes (Auto-save)
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`cbt_${studentId}_answers`, JSON.stringify(answers));
    }
  }, [answers, studentId]);

  useEffect(() => {
    localStorage.setItem(`cbt_${studentId}_flagged`, JSON.stringify(flagged));
  }, [flagged, studentId]);

  useEffect(() => {
    localStorage.setItem(`cbt_${studentId}_idx`, currentIdx.toString());
  }, [currentIdx, studentId]);

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        localStorage.setItem(`cbt_${studentId}_time`, next.toString());
        if (next <= 0) {
          clearInterval(timer);
          setShowTimeUpAlert(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [studentId]);

  // Tab blur detection (exam security - Exam Mode only)
  useEffect(() => {
    if (mode !== 'exam') return;

    const handleBlur = () => {
      setTabWarnings((prev) => prev + 1);
      setShowTabWarningToast(true);
      setTimeout(() => setShowTabWarningToast(false), 5000);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [mode]);

  // Format time (HH:MM:SS or MM:SS)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeQuestion = questions[currentIdx];

  const handleAnswerSelect = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: value,
    }));
  };

  const clearAnswer = () => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[activeQuestion.id];
      return updated;
    });
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      if (prev.includes(activeQuestion.id)) {
        return prev.filter((id) => id !== activeQuestion.id);
      } else {
        return [...prev, activeQuestion.id];
      }
    });
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Get list of unique categories
  const categories = ['all', ...Array.from(new Set(questions.map((q) => q.category)))];

  // Filter questions for grid navigation
  const filteredQuestions = questions.filter(
    (q) => categoryFilter === 'all' || q.category === categoryFilter
  );

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flagged.length;
  const unansweredCount = questions.length - answeredCount;

  // Clean local storage and submit
  const handleFinalSubmit = () => {
    localStorage.removeItem(`cbt_${studentId}_answers`);
    localStorage.removeItem(`cbt_${studentId}_flagged`);
    localStorage.removeItem(`cbt_${studentId}_time`);
    localStorage.removeItem(`cbt_${studentId}_idx`);
    onFinish(answers, flagged);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExitConfirm(true)}
            className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Exam</span>
          </Button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold text-slate-900">
              Candidate: {studentName} ({studentId})
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Mode: {mode === 'exam' ? 'Official Exam' : 'Practice Exercise'}
            </span>
          </div>
        </div>

        {/* Floating Timer in center */}
        <div className="flex items-center gap-3 bg-slate-100 border border-slate-200/80 px-4 py-1.5 rounded-full">
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">
              Time Left:
            </span>
            <span
              className={`font-mono text-sm font-bold tracking-widest ${
                timeLeft < 300 ? 'text-rose-600 animate-pulse' : 'text-slate-800'
              }`}
            >
              {showTimer ? formatTime(timeLeft) : '••:••:••'}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowTimer(!showTimer)}
            className="h-7 w-7 text-slate-500 hover:text-slate-950 rounded-full hover:bg-slate-200"
          >
            {showTimer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div>
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 h-9 rounded-lg shadow-sm"
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Progress Bar Container */}
      <div className="bg-slate-100/50 border-b border-slate-200/80 px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 text-xs font-semibold text-slate-500">
        <div className="flex-1 max-w-xl flex items-center gap-3">
          <Progress value={(answeredCount / questions.length) * 100} className="h-1.5 bg-slate-200 [&>div]:bg-blue-600" />
          <span className="shrink-0 text-slate-600">{Math.round((answeredCount / questions.length) * 100)}% Complete</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-slate-800 font-bold">{answeredCount}</span> / <span>{questions.length} Answered</span>
        </div>
      </div>

      {/* Security Warnings Count (Exam Mode only) */}
      {mode === 'exam' && tabWarnings > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 text-center text-xs py-1.5 font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Attention: Tab blur warnings triggered: {tabWarnings}. Please stay on this tab to avoid potential disqualification.
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 flex min-h-0">
        {/* Question Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col bg-slate-50">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-black text-slate-900">Question {activeQuestion.id}</span>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-500 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-full">
                    {activeQuestion.category}
                  </Badge>
                  {mode === 'exercise' && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] font-bold uppercase py-0.5 px-2 rounded-full">
                      Exercise Mode
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  Original PDF ID: #{activeQuestion.originalId} | Marked out of 1.00
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFlag}
                  className={`border-slate-200 h-9 px-3 rounded-lg flex items-center gap-1.5 ${
                    flagged.includes(activeQuestion.id)
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 bg-white'
                  }`}
                >
                  <Flag className="h-4 w-4 fill-current" />
                  <span className="hidden sm:inline">
                    {flagged.includes(activeQuestion.id) ? 'Flagged' : 'Flag Question'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Question Text */}
            <Card className="border-slate-200/80 bg-white shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-6">
                {renderQuestion(activeQuestion.question)}

                {/* Multiple Choice Options */}
                <RadioGroup
                  value={answers[activeQuestion.id] || ''}
                  onValueChange={handleAnswerSelect}
                  className="space-y-3"
                >
                  {Object.entries(activeQuestion.options).map(([key, value]) => {
                    const isSelected = answers[activeQuestion.id] === key;
                    const isCorrect = key === activeQuestion.answer;
                    
                    // Style states for Exercise mode feedback
                    let containerStyle = 'bg-white border-slate-200 hover:bg-slate-50/55 hover:border-slate-350';
                    let textStyle = 'text-slate-700';

                    if (mode === 'exercise' && answers[activeQuestion.id]) {
                      // If user selected this option
                      if (isSelected) {
                        if (isCorrect) {
                          containerStyle = 'bg-emerald-50 border-emerald-500 shadow-sm';
                          textStyle = 'text-emerald-950 font-semibold';
                        } else {
                          containerStyle = 'bg-rose-50 border-rose-500 shadow-sm';
                          textStyle = 'text-rose-950';
                        }
                      } else {
                        // Highlight the correct one even if user didn't pick it
                        if (isCorrect) {
                          containerStyle = 'bg-emerald-50/70 border-emerald-400 border-dashed';
                          textStyle = 'text-emerald-900 font-semibold';
                        }
                      }
                    } else if (isSelected) {
                      // Normal selected style (Exam Mode)
                      containerStyle = 'bg-blue-50/60 border-blue-500/80 shadow-sm';
                    }

                    return (
                      <div
                        key={key}
                        onClick={() => handleAnswerSelect(key)}
                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${containerStyle}`}
                      >
                        <RadioGroupItem
                          value={key}
                          id={`option-${key}`}
                          className="mt-1 border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor={`option-${key}`}
                          className={`text-sm md:text-base cursor-pointer flex-1 leading-relaxed ${textStyle}`}
                        >
                          <span className="font-extrabold text-blue-600 mr-2">{key}.</span>
                          {value}
                        </Label>

                        {/* Exercise Mode Icon Indicators */}
                        {mode === 'exercise' && answers[activeQuestion.id] && (
                          <div className="ml-auto shrink-0 self-center">
                            {isSelected && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                            {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-600" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* Exercise mode feedback info box */}
                {mode === 'exercise' && answers[activeQuestion.id] && (
                  <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 animate-fadeIn ${
                    answers[activeQuestion.id] === activeQuestion.answer
                      ? 'bg-emerald-50/40 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50/40 border-rose-200 text-rose-800'
                  }`}>
                    {answers[activeQuestion.id] === activeQuestion.answer ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Correct!</span> You have selected the correct option <strong>{activeQuestion.answer}</strong>.
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Incorrect response.</span> The correct answer is <strong>{activeQuestion.answer}</strong>. Read the choices to understand why it is correct.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navigation Controls footer */}
          <div className="max-w-4xl mx-auto w-full border-t border-slate-200 mt-auto pt-4 pb-2 flex items-center justify-between gap-4 shrink-0">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentIdx === 0}
              className="border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded-xl h-10 px-4 flex items-center gap-1.5"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous page
            </Button>

            <Button
              variant="ghost"
              onClick={clearAnswer}
              disabled={!answers[activeQuestion.id]}
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:pointer-events-none rounded-xl h-10 px-4 flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Clear answer
            </Button>

            <Button
              variant="outline"
              onClick={nextQuestion}
              disabled={currentIdx === questions.length - 1}
              className="border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded-xl h-10 px-4 flex items-center gap-1.5"
            >
              Next page
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </main>

        {/* Right Sidebar Question Navigation Palette */}
        <aside
          className={`shrink-0 w-80 border-l border-slate-200 bg-white flex flex-col transition-all duration-300 z-30 min-h-0 overflow-hidden ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0 shadow-2xl'
          } lg:relative lg:translate-x-0`}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Exam Navigation</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Filtering options */}
          <div className="p-4 border-b border-slate-100 space-y-2">
            <Label htmlFor="category-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Filter Category
            </Label>
            <select
              id="category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories ({questions.length})</option>
              {categories.filter(c => c !== 'all').map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({questions.filter((q) => q.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Color-coding Legend */}
          <div className="px-4 py-2 border-b border-slate-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-600 inline-block" />
              <span className="text-slate-600">Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
              <span>Flagged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-slate-200 inline-block bg-white" />
              <span className="text-slate-600">Unanswered</span>
            </div>
          </div>

          {/* Question Navigator Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/30">
            <div className="grid grid-cols-5 gap-2">
              {filteredQuestions.map((q) => {
                const isCurrent = q.id === activeQuestion.id;
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged.includes(q.id);

                let btnClass = 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50';
                if (isCurrent) {
                  btnClass = 'bg-blue-600 text-white border-blue-500 shadow-sm';
                } else if (isFlagged) {
                  btnClass = 'bg-rose-500 text-white border-rose-400 shadow-sm';
                } else if (isAnswered) {
                  btnClass = 'bg-slate-600 text-white border-slate-500 shadow-sm';
                }

                // Find actual global questions array index
                const globalIdx = questions.findIndex((gq) => gq.id === q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(globalIdx)}
                    className={`h-9 rounded-lg border text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center relative ${btnClass}`}
                  >
                    <span>{q.id}</span>
                    {isFlagged && isAnswered && !isCurrent && (
                      <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats & Finish button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-400">
              <div className="bg-white rounded-lg p-1.5 border border-slate-200">
                <span className="block text-slate-800 text-sm font-black mb-0.5">{answeredCount}</span>
                Answered
              </div>
              <div className="bg-white rounded-lg p-1.5 border border-slate-200">
                <span className="block text-rose-500 text-sm font-black mb-0.5">{flaggedCount}</span>
                Flagged
              </div>
              <div className="bg-white rounded-lg p-1.5 border border-slate-200">
                <span className="block text-slate-500 text-sm font-black mb-0.5">{unansweredCount}</span>
                Remaining
              </div>
            </div>

            <Button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold py-2 rounded-xl text-xs tracking-wider uppercase"
            >
              Finish attempt...
            </Button>
          </div>
        </aside>
      </div>

      {/* Floating button for mobile sidebar toggle */}
      <Button
        size="icon"
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 lg:hidden z-30 h-11 w-11 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Tab Warning Toast popup */}
      {showTabWarningToast && (
        <div className="fixed bottom-4 left-4 z-50 bg-rose-600 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-bounce">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Warning: Leaving the exam tab is recorded! Stay focused.</span>
        </div>
      )}

      {/* ============ DIALOGS ============ */}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-800 rounded-2xl max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto bg-amber-500/10 p-3 rounded-full border border-amber-500/20 w-fit">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center text-slate-900">Submit Examination?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm text-center">
              Are you sure you want to conclude and submit your exam paper? You will not be able to change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-400">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="block text-slate-800 text-lg font-black">{answeredCount}</span>
              Answered
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="block text-rose-500 text-lg font-black">{flaggedCount}</span>
              Flagged
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="block text-slate-500 text-lg font-black">{unansweredCount}</span>
              Unanswered
            </div>
          </div>
          <AlertDialogFooter className="sm:justify-between gap-2">
            <AlertDialogCancel className="border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalSubmit}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex-1 font-bold"
            >
              Submit & Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-800 rounded-2xl max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto bg-rose-500/10 p-3 rounded-full border border-rose-500/20 w-fit">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center text-slate-900">Leave Examination?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm text-center">
              Leaving the exam environment will submit your current answers as-is and close the testing console. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between gap-2 pt-2">
            <AlertDialogCancel className="border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onExit}
              className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex-1 font-bold"
            >
              Exit & Lose Unsaved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time's Up Alert */}
      <AlertDialog open={showTimeUpAlert}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-800 rounded-2xl max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto bg-rose-500/10 p-3 rounded-full border border-rose-500/20 w-fit">
              <Timer className="h-6 w-6 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center text-slate-900">Time's Up!</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm text-center">
              Your allotted time has expired. The application has automatically saved and finalized your exam paper.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleFinalSubmit}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
            >
              Go to Results
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
