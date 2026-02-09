'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ProgressBar from './ProgressBar';
import Quiz from './Quiz';
import Certificate from './Certificate';
import CommandTest from './CommandTest';
import CodeTest from './CodeTest';
import LessonContent from './LessonContent';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

type Lesson = { id: string; title: string; content: string; minutes: number };
type Module = { id: string; title: string; lessons: Lesson[] };
type Course = { id: string; title: string; description: string; modules: Module[] };

function storageKey(courseId: string) {
  return `studyProgress_${courseId}`;
}

export default function CourseModal({
  course,
  initialCurrentLessonId,
  initialCompleted,
  onClose,
  onMarkComplete,
  onNavigateNext,
  onNavigatePrev,
  quizQuestions,
  onFinishQuiz,
  finalScore,
  userName,
  userId,
}: {
  course: Course;
  initialCurrentLessonId: string | null;
  initialCompleted: Record<string, boolean>;
  onClose: () => void;
  onMarkComplete: (id: string) => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  quizQuestions: any[];
  onFinishQuiz: (score: number) => void;
  finalScore: number | null;
  userName: string;
  userId: string | null;
}) {
  // checklist state for intercambio items
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`${storageKey(course.id)}_checklist`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const saveChecklist = (next: Record<string, boolean>) => {
    setChecklistState(next);
    try { localStorage.setItem(`${storageKey(course.id)}_checklist`, JSON.stringify(next)); } catch {}
  };

  const parseChecklist = (text: string) => {
    const lines = text.split('\n');
    const items: string[] = [];
    for (const l of lines) {
      const m = l.match(/^\s*\d+º\s*-?\s*(.*)/);
      if (m && m[1]) items.push(m[1].trim());
    }
    return items;
  };
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialCurrentLessonId);
  const [completed, setCompleted] = useState<Record<string, boolean>>(initialCompleted || {});
  const [visible, setVisible] = useState(false);

  // load remote progress from Firestore when modal opens and userId available
  useEffect(() => {
    let mounted = true;
    const loadRemote = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'studyProgress', `${userId}_${course.id}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (!mounted) return;
          if (data.completed) setCompleted(data.completed);
          if (data.currentLessonId) setCurrentLessonId(data.currentLessonId);
        }
      } catch (err) {
        console.error('Erro ao carregar progresso remoto:', err);
      }
    };
    loadRemote();
    return () => { mounted = false; };
  }, [userId, course.id]);

  useEffect(() => {
    setCurrentLessonId(initialCurrentLessonId);
    setCompleted(initialCompleted || {});
  }, [initialCurrentLessonId, initialCompleted]);

  // animate in
  useEffect(() => { setVisible(true); return () => setVisible(false); }, []);

  const lessonsFlat = useMemo(() => course.modules.flatMap(m => m.lessons), [course]);
  const currentIndex = lessonsFlat.findIndex(l => l.id === currentLessonId);

  useEffect(() => {
    // persist
    const payload = { completed, currentLessonId };
    localStorage.setItem(storageKey(course.id), JSON.stringify(payload));

    // persist to Firestore as well (if user logged)
    const saveRemote = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'studyProgress', `${userId}_${course.id}`);
        await setDoc(docRef, { completed, currentLessonId, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error('Erro ao salvar progresso remoto:', err);
      }
    };
    saveRemote();
  }, [completed, currentLessonId, course.id]);

  const markCompleteLocal = (id: string) => {
    setCompleted(s => ({ ...s, [id]: true }));
    onMarkComplete(id);
  };

  const handleNext = () => {
    if (currentIndex < lessonsFlat.length - 1) {
      setCurrentLessonId(lessonsFlat[currentIndex + 1].id);
      onNavigateNext();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentLessonId(lessonsFlat[currentIndex - 1].id);
      onNavigatePrev();
    }
  };

  const computePercent = () => {
    const total = lessonsFlat.length;
    const done = Object.values(completed).filter(Boolean).length;
    return Math.round((done / total) * 100) || 0;
  };

  const lesson = lessonsFlat.find(l => l.id === currentLessonId) || lessonsFlat[0];

  // support multiple exercises per lesson (backwards-compatible with single `exercise`)
  const [exerciseState, setExerciseState] = useState<Record<string, number>>({});
  const getExercises = (l: any) => {
    if (!l) return [];
    if (Array.isArray(l.exercises)) return l.exercises;
    if (l.exercise) return [l.exercise];
    return [];
  };
  const handleExerciseSuccess = (lessonId: string) => {
    setExerciseState(prev => {
      const nextCount = (prev[lessonId] || 0) + 1;
      return { ...prev, [lessonId]: nextCount };
    });
  };


  // breadcrumbs: course > module > lesson
  const currentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson?.id));

  function ChecklistInteractive({ lesson, courseId }: { lesson: Lesson; courseId: string }) {
    const items = parseChecklist(lesson.content);
    if (!items.length) return null;

    return (
      <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
        <h4 className="font-semibold mb-2">Checklist Intercâmbio — Diagnóstico</h4>
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const key = `${lesson.id}_${idx}`;
            const checked = !!checklistState[key];
            return (
              <li key={key} className="flex items-start gap-3">
                <input type="checkbox" checked={checked} onChange={() => {
                  const next = { ...checklistState, [key]: !checked };
                  saveChecklist(next);
                }} className="mt-1" />
                <div className={`text-sm ${checked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{it}</div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1 bg-sky-600 rounded text-sm" onClick={() => {
            const next: Record<string, boolean> = {};
            items.forEach((_, i) => next[`${lesson.id}_${i}`] = true);
            saveChecklist(next);
          }}>Marcar todos</button>
          <button className="px-3 py-1 bg-zinc-700 rounded text-sm" onClick={() => { saveChecklist({}); }}>Limpar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className={`relative w-full sm:w-11/12 md:w-10/12 lg:w-3/4 max-h-[90vh] bg-zinc-900 rounded-lg shadow-2xl ring-1 ring-zinc-800 overflow-hidden transform transition-all duration-300 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-6'}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <nav className="text-xs text-zinc-400">
              <span className="text-zinc-200 font-medium">{course.title}</span>
              {currentModule && <span className="mx-2">/</span>}
              {currentModule && <span>{currentModule.title}</span>}
              {lesson && <><span className="mx-2">/</span><span className="text-sky-300">{lesson.title}</span></>}
            </nav>
            <h2 className="text-lg sm:text-2xl font-bold mt-1">{course.title}</h2>
            <p className="text-xs text-zinc-400 mt-1">{course.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block w-40">
              <ProgressBar percent={computePercent()} />
              <p className="text-xs text-zinc-400 mt-1 text-right">{computePercent()}%</p>
            </div>
            <button onClick={() => { localStorage.setItem(storageKey(course.id), JSON.stringify({ completed, currentLessonId })); onClose(); }} className="px-3 py-2 bg-zinc-700 rounded">Checkpoint</button>
            <button onClick={() => { localStorage.removeItem(storageKey(course.id)); setCompleted({}); setCurrentLessonId(lessonsFlat[0]?.id||null); }} className="px-3 py-2 bg-red-600 rounded">Reset</button>
            <button onClick={onClose} aria-label="Fechar" className="ml-2 text-zinc-300 hover:text-white">✕</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar modules - sticky */}
          <aside className="lg:col-span-3 bg-zinc-800 p-4 overflow-y-auto max-h-[72vh] border-r border-zinc-800">
            {course.modules.map(m => (
              <div key={m.id} className="mb-4">
                <h3 className="font-semibold mb-2">{m.title}</h3>
                <div className="space-y-1">
                  {m.lessons.map(l => (
                    <button key={l.id} onClick={() => setCurrentLessonId(l.id)} className={`block w-full text-left p-2 rounded ${completed[l.id]? 'bg-green-600/10 border border-green-600':'hover:bg-zinc-700'}`}>
                      <div className="flex justify-between">
                        <span className="font-medium">{l.title}</span>
                        <span className="text-xs text-zinc-400">{l.minutes}m</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Main lesson content - scrollable */}
          <main className="lg:col-span-6 p-6 overflow-y-auto max-h-[72vh]">
            <div className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-2">{lesson.title}</h3>
              <div className="text-sm text-zinc-200 mt-3">
                <LessonContent text={lesson.content} />
              </div>

              {/* Interactive checklist for intercambio module */}
              {currentModule?.id === 'intercambio-checklist' && (
                <ChecklistInteractive lesson={lesson} courseId={course.id} />
              )}

              {(() => {
                const exercises = getExercises(lesson as any);
                const completedCount = exerciseState[lesson.id] || 0;
                if (!exercises.length) return null;
                if (completedCount >= exercises.length) {
                  return (
                    <div className="mt-4 p-3 bg-green-900/10 rounded border border-green-800 text-sm">Todas as atividades desta lição foram concluídas.</div>
                  );
                }
                const currentExercise = exercises[completedCount];
                return (
                  <div className="mt-4">
                    {currentExercise.type === 'command' ? (
                      <CommandTest
                        title={currentExercise.title}
                        instructions={currentExercise.instructions}
                        expectedIncludes={currentExercise.expectedIncludes || []}
                        expectedRegexes={currentExercise.expectedRegexes || []}
                        onSuccess={() => {
                          handleExerciseSuccess(lesson.id);
                          // if that was the last exercise, mark lesson complete
                          if (completedCount + 1 >= exercises.length) markCompleteLocal(lesson.id);
                        }}
                      />
                    ) : (
                      <CodeTest
                        title={currentExercise.title}
                        instructions={currentExercise.instructions}
                        requiredSnippets={currentExercise.expectedIncludes || []}
                        requiredRegexes={currentExercise.expectedRegexes || []}
                        language={currentExercise.language}
                        onSuccess={() => {
                          handleExerciseSuccess(lesson.id);
                          if (completedCount + 1 >= exercises.length) markCompleteLocal(lesson.id);
                        }}
                      />
                    )}
                  </div>
                );
              })()}

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => markCompleteLocal(lesson.id)} className="px-4 py-2 bg-green-600 rounded">Marcar como concluído</button>
                <button onClick={handlePrev} disabled={currentIndex<=0} className="px-3 py-2 bg-zinc-700 rounded disabled:opacity-50">Anterior</button>
                <button onClick={handleNext} disabled={currentIndex>=lessonsFlat.length-1} className="px-3 py-2 bg-sky-500 rounded disabled:opacity-50">Próximo</button>
              </div>
            </div>
          </main>

          {/* Right column: quiz/certificate/notes */}
          <aside className="lg:col-span-3 bg-zinc-800 p-4 overflow-y-auto max-h-[72vh] border-l border-zinc-800">
            <div className="mb-4">
              <h4 className="font-semibold">Prova Final</h4>
              <p className="text-xs text-zinc-400">A prova final é liberada somente quando todas as lições do curso estiverem concluídas. Nota mínima: 70%.</p>
            </div>

            <div className="mb-4">
              {computePercent() === 100 ? (
                <Quiz questions={quizQuestions} onFinish={onFinishQuiz} />
              ) : (
                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-sm">
                  <p className="font-medium">Prova bloqueada</p>
                  <p className="text-xs text-zinc-400 mt-1">Conclua todas as lições para desbloquear o exame final. Progresso atual: <strong>{computePercent()}%</strong>.</p>
                </div>
              )}
            </div>

            {finalScore !== null && finalScore >= 70 && (
              <div className="mt-2">
                <p className="text-green-400">Aprovado! Gere seu certificado abaixo.</p>
                <div className="mt-2"><Certificate studentName={userName} courseTitle={course.title} /></div>
              </div>
            )}

            <div className="mt-6 text-xs text-zinc-400">
              <p className="font-medium mb-1">Notas rápidas</p>
              <p>Use o botão <strong>Checkpoint</strong> para salvar o progresso e voltar depois.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
