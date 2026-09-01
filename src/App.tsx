/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut, User, browserPopupRedirectResolver } from 'firebase/auth';
import { auth, googleProvider, addFirestoreErrorListener } from './lib/firebase';
import { studyService } from './services/studyService';
import { Subject, Topic, StudySession, Flashcard, UserSubscription, Question, QuestionAnswer, UserProfile } from './types';
import { CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';

import Dashboard from './components/Dashboard';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import FlashcardList from './components/FlashcardList';
const QuestionBank = React.lazy(() => import('./components/QuestionBank'));
import Pricing from './components/Pricing';
import StudySessionList from './components/StudySessionList';
import PomodoroTimer from './components/PomodoroTimer';
import PerformanceCharts from './components/PerformanceCharts';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import Support from './components/Support';
import Store from './components/Store';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function App() {
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = addFirestoreErrorListener((err) => {
      // Ignore permission denied/insufficient permissions errors during auth states
      const isPermissionError = err.message.includes('permissions') || 
                               err.message.includes('permission-denied') || 
                               err.message.includes('insufficient');
      if (isPermissionError) {
        console.warn("Ignoring subscription permission error to prevent crash:", err.message);
        return;
      }
      setAsyncError(err);
    });
    return () => unsub();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const navigate = useNavigate();
  const [preselectedTopicId, setPreselectedTopicId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const processingRef = useRef(false);
  const profileEnsuredRef = useRef<string | null>(null);

  const computedUserRole = user?.email === 'oeditordeimagens@gmail.com'
    ? 'admin'
    : (userProfile?.role || 'user');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    // Ensure user profile exists
    if (user.email && profileEnsuredRef.current !== user.uid) {
      studyService.ensureUserProfile(user.uid, user.email, user.displayName || 'Usuário', user.photoURL || undefined)
        .then(() => {
          profileEnsuredRef.current = user.uid;
        })
        .catch((err) => {
          console.error("Error ensuring user profile:", err);
        });
    }

    // Subscriptions
    const unsubscribeProfile = studyService.subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      setLoadingProfile(false);
    });
    const unsubSubjects = studyService.subscribeToSubjects(user.uid, setSubjects);
    const unsubAllSubjects = studyService.subscribeToAllSubjects(setAllSubjects);
    const unsubAllTopics = studyService.subscribeToAllTopics(setAllTopics);
    const unsubTopics = studyService.subscribeToTopics(user.uid, setTopics);
    const unsubSessions = studyService.subscribeToSessions(user.uid, setSessions);
    const unsubFlashcards = studyService.subscribeToFlashcards(user.uid, setFlashcards);
    const unsubAnswers = studyService.subscribeToUserAnswers(user.uid, setAnswers);
    const unsubSub = studyService.subscribeToSubscription(user.uid, setSubscription);
    const unsubSchedule = studyService.subscribeToSchedule(user.uid, setSchedule);

    return () => {
      unsubscribeProfile();
      unsubSubjects();
      unsubAllSubjects();
      unsubAllTopics();
      unsubTopics();
      unsubSessions();
      unsubFlashcards();
      unsubAnswers();
      unsubSub();
      unsubSchedule();
    };
  }, [user]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success !== 'true' || !user || processingRef.current) return;

    const planId = searchParams.get('planId');

    const processPurchase = async () => {
      processingRef.current = true;
      console.log("🛍️ Processing purchase success...", { planId });
      
      try {
        if (planId) {
          console.log("💳 Processing plan upgrade:", planId);
          await studyService.updatePlan(user.uid, planId as any);
          setSuccessMessage(`Seu plano foi atualizado para ${planId.toUpperCase()} com sucesso!`);
          setShowSuccessModal(true);
        }
        
        // Always try to clear params if we got success=true
        setTimeout(() => {
          setSearchParams({}, { replace: true });
        }, 100);
      } catch (err) {
        console.error("❌ Error processing purchase/upgrade:", err);
        alert("Erro ao processar sua compra. Por favor, contate o suporte.");
      } finally {
        // We don't reset processingRef.current to false here because we want to prevent
        // re-processing even if the effect re-runs before the params are cleared.
        // It will be reset on manual triggers or session changes if needed.
      }
    };

    processPurchase();
  }, [searchParams, user, setSearchParams]);

  const handleStudyTopic = (topicId: string) => {
    setPreselectedTopicId(topicId);
    navigate('/history');
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setLoginError(null);
    console.log("🚀 Starting Google Login process...");
    
    try {
      // Pass browserPopupRedirectResolver to bypass iframe popup constraints
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      console.log("✅ Login successful");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      console.log("Error code:", error.code);
      
      if (error.code === 'auth/popup-blocked') {
        setLoginError("O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site e tente novamente.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setLoginError("A requisição foi cancelada. Isso pode ocorrer se você clicar várias vezes seguidas. Tente novamente devagar.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("A janela de login foi fechada antes da conclusão. Se a janela não abriu, verifique se há um bloqueador de pop-ups ativo.");
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        setLoginError("O login via pop-up não é suportado neste ambiente ou navegador (comum em modo privado ou navegadores antigos).");
      } else {
        setLoginError(`Erro ao tentar entrar (${error.code || 'erro desconhecido'}). Por favor, tente novamente.`);
      }

      // Auto-clear error after 10 seconds to avoid looking "stuck"
      setTimeout(() => setLoginError(null), 10000);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (asyncError) {
    return <ErrorFallback error={asyncError} />;
  }

  if (loading || (user && loadingProfile && !userProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando GestãoEdu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Auth 
        onLogin={handleLogin} 
        onClearError={() => setLoginError(null)}
        isLoading={isLoggingIn} 
        error={loginError} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <Layout 
        user={user} 
        userProfile={userProfile}
        subscription={subscription}
        onLogout={handleLogout}
        onSwitchToFree={() => studyService.updatePlan(user.uid, 'free', null)}
      >
          <Routes>
            <Route path="/" element={
              <Dashboard 
                userId={user.uid}
                subjects={subjects} 
                topics={topics} 
                sessions={sessions} 
                flashcards={flashcards} 
                answers={answers}
                subscription={subscription}
                schedule={schedule}
                onUpdateSchedule={(data: any) => studyService.updateSchedule(user.uid, data)}
                onReview={studyService.reviewFlashcard}
                onDeleteSubject={(id) => studyService.deleteSubject(id)}
              />
            } />
            <Route path="/subjects" element={
              <SubjectList 
                subjects={subjects} 
                onAdd={(name, color, icon) => studyService.addSubject(user.uid, name, color, icon)}
                onDelete={(id) => studyService.deleteSubject(id)}
                onEdit={(id, name, color, icon) => studyService.updateSubject(id, { name, color, icon })}
                onSelect={(id) => {
                  setSelectedSubjectId(id);
                  navigate('/flashcards');
                }}
              />
            } />
            <Route path="/topics" element={
              <TopicList 
                topics={topics} 
                subjects={subjects}
                userRole={computedUserRole}
                onAdd={(topic) => studyService.addTopic(user.uid, topic)}
                onBulkAdd={(newTopics) => studyService.bulkAddTopics(user.uid, newTopics)}
                onAddSubject={(name, color) => studyService.addSubject(user.uid, name, color)}
                onDelete={(id) => studyService.deleteTopic(id)}
                onUpdate={(id, updates) => studyService.updateTopic(id, updates)}
                onBulkUpdateTopicsSubject={(topicIds, newSubjectId) => studyService.bulkUpdateTopicsSubject(topicIds, newSubjectId)}
                onBulkUpdateTopicsPosition={(topicIds, newPosition) => studyService.bulkUpdateTopicsPosition(topicIds, newPosition)}
                onBulkDeleteTopics={(topicIds) => studyService.bulkDeleteTopics(topicIds)}
                onRenameCargo={(oldPosition, newPosition) => studyService.renameCargo(user.uid, oldPosition, newPosition)}
                onCleanupDuplicatesAndEmpty={() => studyService.cleanupDuplicatesAndEmpty(user.uid)}
                onStudy={handleStudyTopic}
              />
            } />
            <Route path="/flashcards" element={
              <FlashcardList 
                flashcards={flashcards}
                subjects={subjects}
                allSubjects={allSubjects}
                topics={topics}
                allTopics={allTopics}
                subscription={subscription}
                userRole={computedUserRole}
                onAdd={(card) => studyService.addFlashcard(user.uid, card)}
                onAddMany={(cards) => studyService.addFlashcards(user.uid, cards)}
                onDelete={(id) => studyService.deleteFlashcard(user.uid, id)}
                onBulkDelete={(ids) => studyService.bulkDeleteFlashcards(user.uid, ids)}
                onBulkUpdate={(ids, updates) => studyService.bulkUpdateFlashcards(user.uid, ids, updates)}
                onUpdate={(id, updates) => studyService.updateFlashcard(id, updates)}
                onReview={(card, quality) => studyService.reviewFlashcard(card, quality)}
                initialSubjectId={selectedSubjectId || undefined}
                onClearAI={() => {
                  setSelectedSubjectId(null);
                }}
              />
            } />
            <Route path="/questions" element={
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-500 font-medium">Carregando Banco de Questões...</p>
                </div>
              }>
                <QuestionBank 
                  answers={answers}
                  subjects={subjects}
                  topics={topics}
                  subscription={subscription}
                  userRole={computedUserRole}
                  onAddQuestion={async (q) => {
                    await studyService.addQuestion({ ...q, authorId: user.uid });
                  }}
                  onBulkAddQuestions={async (qs) => {
                    const questionsWithAuthor = qs.map(q => ({ ...q, authorId: user.uid }));
                    await studyService.bulkAddQuestions(questionsWithAuthor);
                  }}
                  onUpdateQuestion={(id, updates) => studyService.updateQuestion(id, updates)}
                  onDeleteQuestion={(id) => studyService.deleteQuestion(id)}
                  onBulkDeleteQuestions={(ids) => studyService.bulkDeleteQuestions(ids)}
                  onBulkUpdateQuestions={(ids, updates) => studyService.bulkUpdateQuestions(ids, updates)}
                  userId={user.uid}
                  onRecordResult={(question, isCorrect) => studyService.recordQuestionResult(user.uid, question, isCorrect)}
                  onSaveAnswer={(questionId, optionIndex, isCorrect) => studyService.saveQuestionAnswer(user.uid, questionId, optionIndex, isCorrect)}
                />
              </React.Suspense>
            } />
            <Route path="/pricing" element={
              <Pricing 
                subscription={subscription} 
                userId={user.uid}
                onUpgrade={(plan) => studyService.updatePlan(user.uid, plan)} 
              />
            } />
            <Route path="/admin" element={computedUserRole === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />} />
            <Route path="/store" element={<Store userProfile={userProfile} />} />
            <Route path="/history" element={
              <StudySessionList 
                sessions={sessions}
                subjects={subjects}
                topics={topics}
                answers={answers}
                onAdd={(session) => studyService.addSession(user.uid, session)}
                onDelete={(id) => studyService.deleteSession(id)}
                preselectedTopicId={preselectedTopicId}
                onClearPreselected={() => setPreselectedTopicId(null)}
              />
            } />
            <Route path="/timer" element={<PomodoroTimer />} />
            <Route path="/stats" element={<PerformanceCharts subjects={subjects} topics={topics} sessions={sessions} flashcards={flashcards} answers={answers} subscription={subscription} />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

      </Layout>

      {/* Purchase Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 fade-in duration-300">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto relative z-10">
                <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-500 delay-150" />
              </div>
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-600 p-2 rounded-full animate-bounce">
                <Sparkles size={20} />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Excelente escolha!</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {successMessage || 'Sua transação foi concluída com sucesso.'}
              <br /><br />
              Aproveite todos os novos recursos liberados para potencializar seus estudos!
            </p>
            
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/');
              }}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
            >
              Ir para o Dashboard
              <BookOpen size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

