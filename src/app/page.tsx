"use client";

import React, { useState } from "react";
import CbtWelcome from "@/components/CbtWelcome";
import CbtExam from "@/components/CbtExam";
import CbtResults from "@/components/CbtResults";
import questionsData from "@/data/questions.json";
import { Monitor, Smartphone } from "lucide-react";

interface Question {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

type ExamPhase = "welcome" | "exam" | "results";
type ExamMode = "exam" | "exercise";

function MobileBlocker() {
  return (
    <div className="fixed inset-0 z-[9999] flex md:hidden items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
        {/* Icon */}
        <div className="relative">
          <div className="p-5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-lg shadow-blue-500/20">
            <Monitor className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 bg-rose-500 rounded-full shadow-md">
            <Smartphone className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">
            Desktop Only
          </h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            This Computer-Based Testing platform is designed for desktop and laptop screens only. Please open this page on a <strong className="text-slate-700">PC or Laptop</strong> to take the exam.
          </p>
        </div>

        {/* Info Card */}
        <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <p className="text-blue-800 text-xs font-bold uppercase tracking-wider">Why?</p>
          <ul className="text-blue-700 text-xs font-medium space-y-1 text-left list-disc list-inside">
            <li>The exam interface requires a wide screen</li>
            <li>Question navigation needs a sidebar panel</li>
            <li>Better focus and readability on larger displays</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Jimma University — CBT Platform
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<ExamPhase>("welcome");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [examMode, setExamMode] = useState<ExamMode>("exam");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [finalAnswers, setFinalAnswers] = useState<Record<number, string>>({});

  const questions: Question[] = questionsData as Question[];

  const handleStart = (
    name: string,
    id: string,
    mode: ExamMode,
    selectedQs: Question[]
  ) => {
    setStudentName(name);
    setStudentId(id);
    setExamMode(mode);
    setActiveQuestions(selectedQs);
    setPhase("exam");
  };

  const handleFinish = (answers: Record<number, string>, _flagged: number[]) => {
    setFinalAnswers(answers);
    setPhase("results");
  };

  const handleRetake = () => {
    setFinalAnswers({});
    setPhase("welcome");
  };

  const handleExit = () => {
    setPhase("welcome");
  };

  if (phase === "welcome") {
    return (
      <>
        <MobileBlocker />
        <CbtWelcome
          onStart={handleStart}
          questions={questions}
        />
      </>
    );
  }

  if (phase === "exam") {
    return (
      <>
        <MobileBlocker />
        <CbtExam
          questions={activeQuestions}
          studentName={studentName}
          studentId={studentId}
          mode={examMode}
          onFinish={handleFinish}
          onExit={handleExit}
        />
      </>
    );
  }

  return (
    <>
      <MobileBlocker />
      <CbtResults
        questions={activeQuestions}
        studentName={studentName}
        studentId={studentId}
        answers={finalAnswers}
        onRetake={handleRetake}
      />
    </>
  );
}
