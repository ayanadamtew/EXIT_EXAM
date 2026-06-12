'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GraduationCap, FileText, Settings, Upload, BookOpen, Loader2, Trash2 } from 'lucide-react';
import ExamUploader from '@/components/ExamUploader';

interface Question {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

export interface UploadedExamMeta {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface CbtWelcomeProps {
  onStart: (mode: 'exam' | 'exercise', selectedQs: Question[]) => void;
  questions: Question[];
  uploadedExams: UploadedExamMeta[];
  onRefreshExams: () => void;
  loadingExams: boolean;
}

export default function CbtWelcome({ onStart, questions, uploadedExams, onRefreshExams, loadingExams }: CbtWelcomeProps) {
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'exam' | 'exercise'>('exam');
  const [chunksCount, setChunksCount] = useState<number>(1);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number>(0);
  const [showUploader, setShowUploader] = useState(false);

  // Exam source: 'default' or an uploaded exam URL
  const [examSource, setExamSource] = useState<string>('default');
  const [uploadedQuestions, setUploadedQuestions] = useState<Question[] | null>(null);
  const [loadingUploadedQs, setLoadingUploadedQs] = useState(false);

  // Active question set based on exam source
  const activeQuestions = examSource === 'default' ? questions : (uploadedQuestions || []);

  // Generate chunks based on chunksCount
  const getChunks = () => {
    if (activeQuestions.length === 0) return [{ name: 'No Questions', start: 0, end: 0 }];
    if (chunksCount === 1) {
      return [{ name: 'Full Exam (All Questions)', start: 0, end: activeQuestions.length }];
    }
    const chunks = [];
    const size = chunksCount === 2 ? 150 : chunksCount === 3 ? 100 : 50;

    const actualChunks = Math.ceil(activeQuestions.length / size);
    for (let i = 0; i < actualChunks; i++) {
      const start = i * size;
      const end = i === actualChunks - 1 ? activeQuestions.length : (i + 1) * size;
      chunks.push({
        name: `Chunk ${i + 1} (${end - start} Questions)`,
        start,
        end
      });
    }
    return chunks;
  };

  const currentChunks = getChunks();
  const activeChunkIdx = selectedChunkIdx >= currentChunks.length ? 0 : selectedChunkIdx;
  const activeChunk = currentChunks[activeChunkIdx];
  const activeChunkQuestionsCount = activeChunk.end - activeChunk.start;

  // 1.5 minutes (90 seconds) per question, converted to minutes
  const activeTimeMinutes = Math.round((activeChunkQuestionsCount * 90) / 60);

  // Load uploaded exam questions when source changes
  const handleExamSourceChange = async (source: string) => {
    setExamSource(source);
    setChunksCount(1);
    setSelectedChunkIdx(0);

    if (source === 'default') {
      setUploadedQuestions(null);
      return;
    }

    // Find the uploaded exam meta
    const exam = uploadedExams.find((e) => e.id === source);
    if (!exam) return;

    setLoadingUploadedQs(true);
    try {
      const res = await fetch(`/api/exams?url=${encodeURIComponent(exam.url)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setUploadedQuestions(data);
    } catch {
      setError('Failed to load the selected exam.');
      setExamSource('default');
      setUploadedQuestions(null);
    } finally {
      setLoadingUploadedQs(false);
    }
  };

  const handleDeleteExam = async (exam: UploadedExamMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${exam.name}"? This cannot be undone.`)) return;

    try {
      await fetch('/api/exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: exam.url }),
      });
      if (examSource === exam.id) {
        setExamSource('default');
        setUploadedQuestions(null);
      }
      onRefreshExams();
    } catch {
      setError('Failed to delete the exam.');
    }
  };

  const handleStart = () => {
    if (activeQuestions.length === 0) {
      setError('No questions available for this exam.');
      return;
    }
    setError('');

    const selectedQs = activeQuestions.slice(activeChunk.start, activeChunk.end);
    onStart(mode, selectedQs);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 my-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/10 border border-blue-200">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-blue-600 uppercase">Jimma University</h1>
          </div>
        </div>

        {/* ===== Exam Selector Card ===== */}
        <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-200/30 rounded-2xl overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Select Exam</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploader(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-1.5 text-xs font-bold"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload New Exam
            </Button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Default Exam Card */}
              <button
                onClick={() => handleExamSourceChange('default')}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  examSource === 'default'
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  {examSource === 'default' && (
                    <span className="text-[9px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-slate-800">Mock Exit Exam — Round 2</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {questions.length} Questions • Default
                  </p>
                </div>
              </button>

              {/* Uploaded Exams */}
              {uploadedExams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => handleExamSourceChange(exam.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 relative group cursor-pointer ${
                    examSource === exam.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleExamSourceChange(exam.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Upload className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {examSource === exam.id && (
                        <span className="text-[9px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                          Selected
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteExam(exam, e)}
                        className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{exam.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Uploaded • {new Date(parseInt(exam.uploadedAt)).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading state */}
              {loadingExams && (
                <div className="flex items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200">
                  <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ===== Main Config Card ===== */}
        <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="text-center border-b border-slate-100 pb-6 bg-slate-50/50">
            <CardTitle className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {examSource === 'default'
                ? 'Mock Exit Examination — Round 2'
                : uploadedExams.find((e) => e.id === examSource)?.name || 'Uploaded Exam'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium text-base mt-2">
              {examSource === 'default'
                ? 'BSc in Software Engineering Program (June 2026)'
                : `${activeQuestions.length} Questions Available`}
            </CardDescription>
          </CardHeader>

          {/* Loading overlay for uploaded exam */}
          {loadingUploadedQs && (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <span className="text-sm font-bold text-slate-500">Loading exam questions...</span>
            </div>
          )}

          {!loadingUploadedQs && (
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Left Column: Mode & Setup */}
              <div className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-600" />
                    Select Mode
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode('exam')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${mode === 'exam'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <span className="font-bold text-sm">Exam Mode</span>
                      <span className="text-[10px] text-slate-400 mt-1">Countdown & Warnings</span>
                    </button>
                    <button
                      onClick={() => setMode('exercise')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${mode === 'exercise'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <span className="font-bold text-sm">Exercise Mode</span>
                      <span className="text-[10px] text-slate-400 mt-1">Practice & Instant Answers</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Chunking & Start */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* Question Division Setup */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Question Range & Division
                  </h3>
                  <div className="space-y-3">
                    {/* Select Chunks Division */}
                    <div className="space-y-1">
                      <Label htmlFor="chunks-select" className="text-slate-600 text-xs font-bold uppercase tracking-wider">Number of Chunks</Label>
                      <select
                        id="chunks-select"
                        value={chunksCount}
                        onChange={(e) => {
                          setChunksCount(parseInt(e.target.value, 10));
                          setSelectedChunkIdx(0);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="1">Full Exam ({activeQuestions.length} Questions)</option>
                        <option value="2">2 Chunks (~{Math.ceil(activeQuestions.length / 2)} Questions each)</option>
                        <option value="3">3 Chunks (~{Math.ceil(activeQuestions.length / 3)} Questions each)</option>
                        <option value="6">6 Chunks (~{Math.ceil(activeQuestions.length / 6)} Questions each)</option>
                      </select>
                    </div>

                    {/* Select Chunk Part */}
                    {chunksCount > 1 && (
                      <div className="space-y-1 animate-fadeIn">
                        <Label htmlFor="chunk-part-select" className="text-slate-600 text-xs font-bold uppercase tracking-wider">Select Chunk Part</Label>
                        <select
                          id="chunk-part-select"
                          value={activeChunkIdx}
                          onChange={(e) => setSelectedChunkIdx(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {currentChunks.map((chunk, idx) => (
                            <option key={idx} value={idx}>
                              Part {idx + 1}: Questions {chunk.start + 1} - {chunk.end}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic specs summary based on chunk & mode choice */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Questions</div>
                    <div className="text-lg font-black text-slate-800">{activeChunkQuestionsCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time Limit</div>
                    <div className="text-lg font-black text-slate-800">
                      {activeTimeMinutes} mins
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center animate-shake">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleStart}
                  disabled={loadingUploadedQs || activeQuestions.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 text-base flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Start Examination
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <ExamUploader
          onClose={() => setShowUploader(false)}
          onExamSaved={() => {
            setShowUploader(false);
            onRefreshExams();
          }}
        />
      )}
    </div>
  );
}
