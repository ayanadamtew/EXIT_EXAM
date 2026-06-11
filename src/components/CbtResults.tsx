'use client';

import React, { useState } from 'react';
import { renderQuestion } from '@/lib/questionFormatter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

interface Question {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

interface CbtResultsProps {
  questions: Question[];
  studentName: string;
  studentId: string;
  answers: Record<number, string>;
  onRetake: () => void;
}

export default function CbtResults({
  questions,
  studentName,
  studentId,
  answers,
  onRetake,
}: CbtResultsProps) {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [expandedQs, setExpandedQs] = useState<number[]>([]);

  // Calculate scores
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  // Track category statistics
  const categoryStats: Record<string, { total: number; correct: number }> = {};

  questions.forEach((q) => {
    // Initialize category stats if not present
    if (!categoryStats[q.category]) {
      categoryStats[q.category] = { total: 0, correct: 0 };
    }
    categoryStats[q.category].total += 1;

    const userAns = answers[q.id];
    if (!userAns) {
      unansweredCount += 1;
    } else if (userAns.trim().toUpperCase() === q.answer.trim().toUpperCase()) {
      correctCount += 1;
      categoryStats[q.category].correct += 1;
    } else {
      incorrectCount += 1;
    }
  });

  const totalQuestions = questions.length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const isPassed = scorePercent >= 50;

  // Toggle question details expansion in review list
  const toggleQExpansion = (id: number) => {
    setExpandedQs((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  const toggleAllExpansion = () => {
    if (expandedQs.length === questions.length) {
      setExpandedQs([]);
    } else {
      setExpandedQs(questions.map((q) => q.id));
    }
  };

  // Filter the review list
  const filteredReview = questions.filter((q) => {
    const userAns = answers[q.id];
    const isCorrect = userAns && userAns.trim().toUpperCase() === q.answer.trim().toUpperCase();

    if (reviewFilter === 'correct') return isCorrect;
    if (reviewFilter === 'incorrect') return userAns && !isCorrect;
    if (reviewFilter === 'unanswered') return !userAns;
    return true;
  });

  const getQuestionStatus = (q: Question) => {
    const userAns = answers[q.id];
    if (!userAns) return 'unanswered';
    if (userAns.trim().toUpperCase() === q.answer.trim().toUpperCase()) return 'correct';
    return 'incorrect';
  };

  // Calculate duration string based on question count: exactly 36 seconds per question
  const activeTimeMinutes = Math.round((totalQuestions * 36) / 60);
  const durationString = activeTimeMinutes >= 60 
    ? `${Math.floor(activeTimeMinutes / 60)}h ${activeTimeMinutes % 60}m`
    : `${activeTimeMinutes} mins`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 md:p-8 relative overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full z-10 space-y-8 my-4">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Examination Results</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Candidate: <span className="text-slate-900 font-bold">{studentName}</span> | ID: <span className="text-slate-900 font-bold">{studentId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={onRetake}
              className="border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex-1 md:flex-none flex items-center gap-2 h-11"
            >
              <RefreshCw className="h-4 w-4" />
              Retake Exam
            </Button>
            <Button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex-1 md:flex-none flex items-center gap-2 h-11 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Overview Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Circular Chart Card */}
          <Card className="border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center p-6 md:col-span-1">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* SVG Radial Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`fill-none transition-all duration-1000 ${
                    isPassed ? 'stroke-emerald-500' : 'stroke-rose-500'
                  }`}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - scorePercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900">{scorePercent}%</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Score</span>
              </div>
            </div>
            <div className="text-center mt-4 space-y-1">
              <Badge
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  isPassed
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                {isPassed ? 'PASS' : 'FAIL'}
              </Badge>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Passing mark requirement: 50%
              </p>
            </div>
          </Card>

          {/* Quick Metrics Grid */}
          <Card className="border-slate-200 bg-white shadow-sm md:col-span-2 p-6 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Correct Answers
                </span>
                <span className="text-3xl font-black text-slate-900">{correctCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">out of {totalQuestions} questions</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  Incorrect Answers
                </span>
                <span className="text-3xl font-black text-slate-900">{incorrectCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">out of {totalQuestions} questions</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  Unanswered
                </span>
                <span className="text-3xl font-black text-slate-900">{unansweredCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">skipped questions</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Award className="h-4 w-4 text-blue-500" />
                  Max Duration
                </span>
                <span className="text-3xl font-black text-slate-900">{durationString}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Time limit allowed</span>
              </div>
            </div>

            <div className="border-t border-slate-100 mt-6 pt-4 text-xs text-slate-400 font-medium">
              * Official Computer-Based Exit Examination report generated for student ID {studentId}.
            </div>
          </Card>
        </div>

        {/* Category Performance Card */}
        <Card className="border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-black text-slate-900">Performance by Category</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(categoryStats).map(([catName, stats]) => {
              const catPercent = Math.round((stats.correct / stats.total) * 100);
              const catPassed = catPercent >= 50;
              return (
                <div key={catName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{catName}</span>
                    <span className={catPassed ? 'text-emerald-600' : 'text-rose-600'}>
                      {stats.correct}/{stats.total} ({catPercent}%)
                    </span>
                  </div>
                  <Progress
                    value={catPercent}
                    className={`h-2 bg-slate-100 border border-slate-200/50 ${
                      catPassed
                        ? '[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500'
                        : '[&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-orange-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Answer Review Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900">Detailed Answer Review</h3>
            </div>

            {/* Answer Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((filter) => {
                const isActive = reviewFilter === filter;
                let count = totalQuestions;
                if (filter === 'correct') count = correctCount;
                if (filter === 'incorrect') count = incorrectCount;
                if (filter === 'unanswered') count = unansweredCount;

                return (
                  <Button
                    key={filter}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => setReviewFilter(filter)}
                    className={`h-8 rounded-lg text-xs font-bold capitalize ${
                      isActive
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-white'
                    }`}
                  >
                    {filter} ({count})
                  </Button>
                );
              })}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleAllExpansion}
                className="h-8 rounded-lg text-xs font-bold border border-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
              >
                {expandedQs.length === questions.length ? 'Collapse All' : 'Expand All'}
              </Button>
            </div>
          </div>

          {/* List of reviewed questions */}
          <div className="space-y-4">
            {filteredReview.map((q) => {
              const status = getQuestionStatus(q);
              const isExpanded = expandedQs.includes(q.id);
              const userAns = answers[q.id] || 'None';

              let cardBorder = 'border-slate-200 bg-white shadow-sm';
              let statusBadge = null;

              if (status === 'correct') {
                cardBorder = 'border-emerald-200 bg-emerald-50/20';
                statusBadge = (
                  <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase py-0.5 px-2 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Correct
                  </Badge>
                );
              } else if (status === 'incorrect') {
                cardBorder = 'border-rose-200 bg-rose-50/20';
                statusBadge = (
                  <Badge className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold uppercase py-0.5 px-2 rounded-full flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Incorrect
                  </Badge>
                );
              } else {
                cardBorder = 'border-slate-200 bg-slate-50/30';
                statusBadge = (
                  <Badge className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-extrabold uppercase py-0.5 px-2 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Unanswered
                  </Badge>
                );
              }

              return (
                <Card
                  key={q.id}
                  className={`border transition-all duration-200 overflow-hidden ${cardBorder}`}
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => toggleQExpansion(q.id)}
                    className="p-4 md:p-5 flex items-start justify-between gap-4 cursor-pointer select-none hover:bg-slate-55"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Question {q.id}</span>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-500 text-[9px] font-bold py-0 px-2 rounded-full">
                          {q.category}
                        </Badge>
                        {statusBadge}
                      </div>
                      <p className="text-slate-600 text-sm font-medium line-clamp-1">
                        {q.question}
                      </p>
                    </div>
                    <div className="text-slate-400 mt-1 shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-4 text-sm bg-white">
                      {renderQuestion(q.question)}

                      <div className="grid grid-cols-1 gap-2.5">
                        {Object.entries(q.options).map(([key, val]) => {
                          const isCorrectOpt = key === q.answer;
                          const isUserSelected = key === userAns;

                          let optBorder = 'border-slate-150 bg-white';
                          let icon = null;

                          if (isCorrectOpt) {
                            optBorder = 'border-emerald-300 bg-emerald-50/20 text-emerald-700';
                            icon = <CheckCircle className="h-4 w-4 text-emerald-600" />;
                          } else if (isUserSelected && !isCorrectOpt) {
                            optBorder = 'border-rose-300 bg-rose-50/20 text-rose-700';
                            icon = <XCircle className="h-4 w-4 text-rose-600" />;
                          }

                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold ${optBorder}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`font-black uppercase mr-1 ${isCorrectOpt ? 'text-emerald-600' : 'text-slate-500'}`}>{key}.</span>
                                <span className="text-slate-700">{val}</span>
                              </div>
                              {icon}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 text-xs font-bold border-t border-slate-100 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>Your answer:</span>
                          <span
                            className={
                              status === 'correct'
                                ? 'text-emerald-600'
                                : status === 'incorrect'
                                ? 'text-rose-600'
                                : 'text-slate-505'
                            }
                          >
                            {userAns === 'None' ? 'Unanswered' : `${userAns} (${q.options[userAns] || ''})`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Correct answer:</span>
                          <span className="text-emerald-600">
                            {q.answer} ({q.options[q.answer]})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredReview.length === 0 && (
              <div className="text-slate-400 text-center py-12 border border-dashed border-slate-200 rounded-2xl font-bold bg-white">
                No questions found with this status filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
