'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ParsedQuestion {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

interface ExamUploaderProps {
  onClose: () => void;
  onExamSaved: () => void;
}

type UploadStep = 'select' | 'parsing' | 'preview' | 'saving' | 'done' | 'error';

export default function ExamUploader({ onClose, onExamSaved }: ExamUploaderProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [examName, setExamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [parseProgress, setParseProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.type.includes('pdf') && !selectedFile.name.endsWith('.pdf')) {
      setErrorMsg('Please select a PDF file.');
      setStep('error');
      return;
    }

    setFile(selectedFile);
    setStep('parsing');
    setParseProgress(10);

    try {
      // Dynamic import to keep bundle size small
      const { extractTextFromPdf, parseQuestionsFromText } = await import('@/lib/pdfExamParser');
      
      setParseProgress(30);
      const text = await extractTextFromPdf(selectedFile);
      
      setParseProgress(70);
      const result = parseQuestionsFromText(text);
      
      setParseProgress(100);

      if (result.questions.length === 0) {
        setErrorMsg(
          result.warnings.length > 0
            ? result.warnings.join('\n')
            : 'No questions could be parsed from this PDF. Make sure each question ends with "ANSWER: A/B/C/D".'
        );
        setStep('error');
        return;
      }

      setQuestions(result.questions);
      setWarnings(result.warnings);
      // Default exam name from filename
      setExamName(selectedFile.name.replace('.pdf', '').replace(/_/g, ' '));
      setStep('preview');
    } catch (err) {
      console.error('PDF parsing failed:', err);
      setErrorMsg('Failed to parse the PDF. The file may be corrupted or password-protected.');
      setStep('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleSave = async () => {
    if (!examName.trim()) return;
    setStep('saving');

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: examName.trim(), questions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setStep('done');
      setTimeout(() => {
        onExamSaved();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMsg('Failed to save the exam. Please try again.');
      setStep('error');
    }
  };

  const reset = () => {
    setStep('select');
    setFile(null);
    setQuestions([]);
    setWarnings([]);
    setErrorMsg('');
    setExamName('');
    setParseProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl">
              <Upload className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Exam PDF</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Auto-parse MCQ questions
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* ========== STEP: SELECT FILE ========== */}
          {step === 'select' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Drop your exam PDF here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    or click to browse • Supports standard MCQ format
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP: PARSING ========== */}
          {step === 'parsing' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Processing PDF...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Extracting text and parsing questions
                  </p>
                </div>
              </div>
              <Progress
                value={parseProgress}
                className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-indigo-600"
              />
            </div>
          )}

          {/* ========== STEP: PREVIEW ========== */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                    Questions Found
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    {questions.length}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                    Source File
                  </div>
                  <div className="text-xs font-bold text-blue-800 mt-1 truncate">
                    {file?.name}
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {warnings.length} warning(s)
                  </div>
                  <div className="text-[10px] text-amber-600 max-h-16 overflow-y-auto space-y-0.5">
                    {warnings.slice(0, 5).map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                    {warnings.length > 5 && (
                      <p className="font-bold">... and {warnings.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Questions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sample Questions (first 3)
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {questions.slice(0, 3).map((q) => (
                    <div
                      key={q.id}
                      className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs"
                    >
                      <p className="font-bold text-slate-700 line-clamp-2">
                        {q.id}. {q.question}
                      </p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {Object.entries(q.options).map(([key, val]) => (
                          <span
                            key={key}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              key === q.answer
                                ? 'bg-emerald-100 text-emerald-700 font-bold'
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                          >
                            {key}. {typeof val === 'string' ? val.substring(0, 30) : val}
                            {typeof val === 'string' && val.length > 30 ? '...' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Name Input */}
              <div className="space-y-1.5">
                <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">
                  Exam Name
                </Label>
                <Input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Data Structures Final Exam 2026"
                  className="bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 rounded-xl h-11"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl h-11"
                >
                  Try Another File
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!examName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl h-11 shadow-lg shadow-blue-500/10 disabled:opacity-40"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Save Exam ({questions.length} Qs)
                </Button>
              </div>
            </div>
          )}

          {/* ========== STEP: SAVING ========== */}
          {step === 'saving' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Saving exam...</p>
              <p className="text-xs text-slate-400">Uploading to cloud storage</p>
            </div>
          )}

          {/* ========== STEP: DONE ========== */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="p-3 bg-emerald-100 rounded-full border border-emerald-200">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-slate-900">Exam Saved Successfully!</p>
              <p className="text-xs text-slate-400">
                {questions.length} questions are now available for all users.
              </p>
            </div>
          )}

          {/* ========== STEP: ERROR ========== */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="p-3 bg-rose-100 rounded-full border border-rose-200">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">Something went wrong</p>
                <p className="text-xs text-slate-500 text-center max-w-xs whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
              <Button
                onClick={reset}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl h-11 border border-slate-200"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
