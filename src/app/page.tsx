"use client";

import React, { useState, useEffect, useCallback } from "react";
import CbtWelcome, { UploadedExamMeta } from "@/components/CbtWelcome";
import CbtExam from "@/components/CbtExam";
import CbtResults from "@/components/CbtResults";
import questionsData from "@/data/questions.json";

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

export default function Home() {
  const [phase, setPhase] = useState<ExamPhase>("welcome");
  const [examMode, setExamMode] = useState<ExamMode>("exam");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [finalAnswers, setFinalAnswers] = useState<Record<number, string>>({});

  // Uploaded exams from Vercel Blob
  const [uploadedExams, setUploadedExams] = useState<UploadedExamMeta[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  const questions: Question[] = questionsData as Question[];

  // Fetch uploaded exams on mount
  const fetchUploadedExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await fetch("/api/exams");
      if (res.ok) {
        const data = await res.json();
        setUploadedExams(data.exams || []);
      }
    } catch (err) {
      console.error("Failed to fetch uploaded exams:", err);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadedExams();
  }, [fetchUploadedExams]);

  const handleStart = (
    mode: ExamMode,
    selectedQs: Question[]
  ) => {
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
      <CbtWelcome
        onStart={handleStart}
        questions={questions}
        uploadedExams={uploadedExams}
        onRefreshExams={fetchUploadedExams}
        loadingExams={loadingExams}
      />
    );
  }

  if (phase === "exam") {
    return (
      <CbtExam
        questions={activeQuestions}
        mode={examMode}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    );
  }

  return (
    <CbtResults
      questions={activeQuestions}
      answers={finalAnswers}
      onRetake={handleRetake}
    />
  );
}
