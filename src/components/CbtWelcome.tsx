'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Timer, Award, HelpCircle, CheckCircle, FileText, User, Settings, Check } from 'lucide-react';

interface Question {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

interface CbtWelcomeProps {
  onStart: (name: string, id: string, mode: 'exam' | 'exercise', selectedQs: Question[]) => void;
  questions: Question[];
}

export default function CbtWelcome({ onStart, questions }: CbtWelcomeProps) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'exam' | 'exercise'>('exam');
  const [chunksCount, setChunksCount] = useState<number>(1); // 1 = full, 2 = 150 each, 3 = 100 each, 6 = 50 each
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number>(0);

  // Generate chunks based on chunksCount
  const getChunks = () => {
    if (chunksCount === 1) {
      return [{ name: 'Full Exam (All Questions)', start: 0, end: questions.length }];
    }
    const chunks = [];
    const size = chunksCount === 2 ? 150 : chunksCount === 3 ? 100 : 50;

    for (let i = 0; i < chunksCount; i++) {
      const start = i * size;
      // Last chunk takes all remaining questions to handle 301 cleanly
      const end = i === chunksCount - 1 ? questions.length : (i + 1) * size;
      chunks.push({
        name: `Chunk ${i + 1} (${end - start} Questions)`,
        start,
        end
      });
    }
    return chunks;
  };

  const currentChunks = getChunks();
  // Ensure selectedChunkIdx is within bounds when chunksCount changes
  const activeChunkIdx = selectedChunkIdx >= currentChunks.length ? 0 : selectedChunkIdx;
  const activeChunk = currentChunks[activeChunkIdx];
  const activeChunkQuestionsCount = activeChunk.end - activeChunk.start;

  // 1.5 minutes (90 seconds) per question, converted to minutes
  const activeTimeMinutes = Math.round((activeChunkQuestionsCount * 90) / 60);

  const handleStart = () => {
    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!studentId.trim()) {
      setError('Please enter your Student ID.');
      return;
    }
    setError('');

    // Slice active questions
    const selectedQs = questions.slice(activeChunk.start, activeChunk.end);
    onStart(name.trim(), studentId.trim(), mode, selectedQs);
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

        <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="text-center border-b border-slate-100 pb-6 bg-slate-50/50">
            <CardTitle className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Mock Exit Examination — Round 2
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium text-base mt-2">
              BSc in Software Engineering Program (June 2026)
            </CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Left Column: Info & Setup */}
            <div className="space-y-6">
              {/* Candidate Details */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Candidate Details
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="candidate-name" className="text-slate-600 text-xs font-bold uppercase tracking-wider">Candidate Full Name</Label>
                    <Input
                      id="candidate-name"
                      placeholder="e.g. Ayuda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="candidate-id" className="text-slate-600 text-xs font-bold uppercase tracking-wider">Student ID Number</Label>
                    <Input
                      id="candidate-id"
                      placeholder="you dont have enter correct id and name"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>

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
                      <option value="1">Full Exam (301 Questions)</option>
                      <option value="2">2 Chunks (~150 Questions each)</option>
                      <option value="3">3 Chunks (~100 Questions each)</option>
                      <option value="6">6 Chunks (~50 Questions each)</option>
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 text-base flex items-center justify-center gap-2"
              >
                Start Examination
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
