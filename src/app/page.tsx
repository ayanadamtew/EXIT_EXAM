"use client";

import React, { useState } from "react";
import CbtWelcome from "@/components/CbtWelcome";
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
      <CbtWelcome
        onStart={handleStart}
        questions={questions}
      />
    );
  }

  if (phase === "exam") {
    return (
      <CbtExam
        questions={activeQuestions}
        studentName={studentName}
        studentId={studentId}
        mode={examMode}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    );
  }

  return (
    <CbtResults
      questions={activeQuestions}
      studentName={studentName}
      studentId={studentId}
      answers={finalAnswers}
      onRetake={handleRetake}
    />
  );
}
