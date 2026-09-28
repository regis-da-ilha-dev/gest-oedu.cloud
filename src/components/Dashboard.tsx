import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Quote, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Bell,
  BellRing,
  Plus,
  Calendar,
  Check, 
  ShoppingBag, 
  Trash2, 
  XCircle,
  Sparkles,
  Scale,
  Brain,
  Search,
  CheckSquare,
  Square,
  GraduationCap,
  BarChart3,
  Stethoscope,
  Calculator,
  Globe,
  History,
  FlaskConical,
  Briefcase,
  Code,
  Gavel,
  Heart,
  Cpu,
  Palette,
  Music,
  Languages,
  Microscope,
  Atom,
  Binary,
  Coins,
  ShieldCheck,
  FileText,
  Flame,
  Pause,
  ArrowRight,
  Save,
  RotateCcw,
  Edit3,
  Sliders,
  Sun,
  Moon,
  Zap,
  Award,
  HelpCircle
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  BookOpen, Scale, Stethoscope, Calculator, Globe, History, FlaskConical, Briefcase, Code, Gavel, Heart, Cpu,
  Palette, Music, Languages, Microscope, Atom, Binary, Coins, ShieldCheck, FileText
};

const SubjectIcon = ({ name, size = 20 }: { name?: string; size?: number }) => {
  const IconComponent = (name && ICON_MAP[name]) || Layers;
  return <IconComponent size={size} />;
};
import { Subject, Topic, StudySession, Flashcard, UserSubscription, QuestionAnswer } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, getDayOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeFormat } from '../lib/utils';
import { safeStorage } from '../lib/storage';
import { studyService } from '../services/studyService';
import FlashcardReview from './FlashcardReview';

const MOTIVATIONAL_QUOTES = [
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.", author: "Nelson Mandela" },
  { text: "Não espere por oportunidades, crie-as.", author: "Anônimo" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon" },
  { text: "Acredite que você pode e você já está no meio do caminho.", author: "Theodore Roosevelt" },
  { text: "O aprendizado é um tesouro que seguirá seu dono em qualquer lugar.", author: "Provérbio Chinês" },
  { text: "Não pare quando estiver cansado, pare quando tiver terminado.", author: "Anônimo" },
  { text: "Sua única limitação é você mesmo.", author: "Anônimo" },
  { text: "O segredo de progredir é começar.", author: "Mark Twain" },
  { text: "Estudar não é o que você faz para passar, é o que você faz para crescer.", author: "Anônimo" },
  { text: "O conhecimento é o único bem que ninguém pode te tirar.", author: "Anônimo" },
  { text: "Grandes coisas nunca vêm de zonas de conforto.", author: "Anônimo" },
  { text: "Foque no seu objetivo e não olhe para trás.", author: "Anônimo" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Cada passo que você dá hoje é um passo mais perto do seu sonho.", author: "Anônimo" },
  { text: "A motivação faz você começar, o hábito faz você continuar.", author: "Jim Ryun" },
  { text: "Não diminua seus sonhos, aumente sua dedicação.", author: "Anônimo" },
  { text: "O esforço de hoje é a recompensa de amanhã.", author: "Anônimo" },
  { text: "Seja a sua própria inspiração.", author: "Anônimo" }
];

interface DashboardProps {
  userId: string;
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  flashcards: Flashcard[];
  answers: QuestionAnswer[];
  subscription: UserSubscription | null;
  schedule: any;
  onUpdateSchedule: (data: any) => Promise<void>;
  onReview: (card: Flashcard, quality: number) => void;
  onDeleteSubject: (id: string) => Promise<void>;
}

interface RevisionAlert {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  scheduledTime: number; // timestamp in MS
  status: 'active' | 'fired' | 'cancelled';
  notes?: string;
}

const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio context may be restricted by autoplay policy in iframe
  }
};

export default function Dashboard({ 
  userId, 
  subjects = [], 
  topics = [], 
  sessions = [], 
  flashcards = [], 
  answers = [], 
  subscription, 
  schedule,
  onUpdateSchedule,
  onReview, 
  onDeleteSubject 
}: DashboardProps) {
  const navigate = useNavigate();
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sourceToDelete, setSourceToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReviewSource, setSelectedReviewSource] = useState<any | null>(null);
  const [reviewMode, setReviewMode] = useState<'due' | 'all' | 'custom'>('due');
  const [selectedCardIds, setSelectedCardIds] = useState<Record<string, boolean>>({});
  const [searchCardQuery, setSearchCardQuery] = useState('');
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const itemsPerPage = 0 || 16;

  // Seeded date representation to generate stable random items every day
  const dateSeed = useMemo(() => {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  }, []);

  // Weekly Study Schedule (Ciclos de Estudo) state & handlers
  const DAYS_CONFIG = useMemo(() => [
    { key: 'segunda', label: 'Ciclo 1', fullName: 'Ciclo 1' },
    { key: 'terca', label: 'Ciclo 2', fullName: 'Ciclo 2' },
    { key: 'quarta', label: 'Ciclo 3', fullName: 'Ciclo 3' },
    { key: 'quinta', label: 'Ciclo 4', fullName: 'Ciclo 4' },
    { key: 'sexta', label: 'Ciclo 5', fullName: 'Ciclo 5' },
    { key: 'sabado', label: 'Ciclo 6', fullName: 'Ciclo 6' },
    { key: 'domingo', label: 'Ciclo 7', fullName: 'Ciclo 7' },
  ], []);

  const getInitialDay = () => {
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    if (day === 1) return 'segunda';
    if (day === 2) return 'terca';
    if (day === 3) return 'quarta';
    if (day === 4) return 'quinta';
    if (day === 5) return 'sexta';
    if (day === 6) return 'sabado';
    if (day === 0) return 'domingo';
    return 'segunda';
  };

  const [activeDay, setActiveDay] = useState<'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'>(getInitialDay());
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedSubjectForAdd, setSelectedSubjectForAdd] = useState<string>('');

  const scheduleData = useMemo(() => {
    return {
      segunda: schedule?.segunda || [],
      terca: schedule?.terca || [],
      quarta: schedule?.quarta || [],
      quinta: schedule?.quinta || [],
      sexta: schedule?.sexta || [],
      sabado: schedule?.sabado || [],
      domingo: schedule?.domingo || []
    };
  }, [schedule]);

  const handleToggleItem = async (day: string, itemId: string) => {
    const currentDayList = (scheduleData as any)[day] || [];
    const updatedDayList = currentDayList.map((item: any) => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const updatedSchedule = { ...scheduleData, [day]: updatedDayList };
    await onUpdateSchedule(updatedSchedule);
  };

  const handleAddItem = async (day: string, name: string, color?: string) => {
    if (!name.trim()) return;
    const currentDayList = (scheduleData as any)[day] || [];
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      completed: false,
      color: color || '#6366f1'
    };
    const updatedSchedule = { ...scheduleData, [day]: [...currentDayList, newItem] };
    await onUpdateSchedule(updatedSchedule);
  };

  const handleDeleteItem = async (day: string, itemId: string) => {
    const currentDayList = (scheduleData as any)[day] || [];
    const updatedDayList = currentDayList.filter((item: any) => item.id !== itemId);
    const updatedSchedule = { ...scheduleData, [day]: updatedDayList };
    await onUpdateSchedule(updatedSchedule);
  };
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerPreset, setTimerPreset] = useState<'free' | 'pomodoro' | 'deep'>('free');
  const [timerSubjectId, setTimerSubjectId] = useState<string>('');
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [subjectFilterSearch, setSubjectFilterSearch] = useState('');
  
  // Daily Goal state
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('gestaoedu_daily_goal');
      return saved ? parseInt(saved, 10) : 60;
    } catch {
      return 60;
    }
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalMinutes, setTempGoalMinutes] = useState(dailyGoalMinutes);

  const handleSaveGoal = (mins: number) => {
    const val = Math.max(15, Math.min(720, mins));
    setDailyGoalMinutes(val);
    try {
      safeStorage.setItem('gestaoedu_daily_goal', val.toString());
    } catch {
      // safe fallback
    }
    setIsEditingGoal(false);
  };

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isTimerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimeSeconds(prev => {
          if (timerPreset !== 'free' && prev <= 1) {
            playAlertSound();
            setIsTimerActive(false);
            return 0;
          }
          return timerPreset === 'free' ? prev + 1 : prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, timerPreset]);

  const handleSetTimerPreset = (preset: 'free' | 'pomodoro' | 'deep') => {
    setIsTimerActive(false);
    setTimerPreset(preset);
    if (preset === 'pomodoro') setTimeSeconds(25 * 60);
    else if (preset === 'deep') setTimeSeconds(50 * 60);
    else setTimeSeconds(0);
  };

  const handleSaveTimerSession = async () => {
    let elapsedMinutes = 0;
    if (timerPreset === 'free') {
      elapsedMinutes = Math.round(timeSeconds / 60);
    } else if (timerPreset === 'pomodoro') {
      elapsedMinutes = Math.max(1, Math.round((25 * 60 - timeSeconds) / 60));
    } else if (timerPreset === 'deep') {
      elapsedMinutes = Math.max(1, Math.round((50 * 60 - timeSeconds) / 60));
    }

    if (elapsedMinutes < 1) {
      alert("Estude por pelo menos 1 minuto para registrar como sessão de estudo.");
      return;
    }

    setIsSavingSession(true);
    try {
      const subId = timerSubjectId || (subjects[0]?.id || '');
      const subName = subjects.find(s => s.id === subId)?.name || 'Estudos';
      await studyService.addSession(userId, {
        subjectId: subId,
        durationMinutes: elapsedMinutes,
        date: Date.now(),
        notes: `Sessão via Cronômetro de Foco (${subName})`
      });
      setIsTimerActive(false);
      setTimeSeconds(timerPreset === 'pomodoro' ? 25 * 60 : timerPreset === 'deep' ? 50 * 60 : 0);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 4000);
    } catch (e) {
      console.error("Error saving timer session:", e);
      alert("Erro ao salvar sessão de estudo.");
    } finally {
      setIsSavingSession(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return [
        hrs.toString().padStart(2, '0'),
        mins.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
      ].join(':');
    }
    return [
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const [difficulty, setDifficulty] = useState(3);
  const [activeFilter, setActiveFilter] = useState<'urgentes' | 'menor' | 'edital' | 'alfabeto' | 'todos'>('urgentes');

  // Revision Alert and Scheduling states
  const [alerts, setAlerts] = useState<RevisionAlert[]>(() => {
    try {
      if (!userId) return [];
      const saved = safeStorage.getItem(`gestaoedu_alerts_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [schedulerTab, setSchedulerTab] = useState<'pending' | 'active'>('pending');
  const [selectedTopicToSchedule, setSelectedTopicToSchedule] = useState<any | null>(null);
  
  // Schedule Form states
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState<string>("14:00");
  const [scheduleNotes, setScheduleNotes] = useState<string>("Revisão geral");
  const [scheduleIntervalPreset, setScheduleIntervalPreset] = useState<string>("24h");
  const [firedAlert, setFiredAlert] = useState<RevisionAlert | null>(null);

  // Sync alerts when userId changes
  React.useEffect(() => {
    if (!userId) return;
    try {
      const saved = safeStorage.getItem(`gestaoedu_alerts_${userId}`);
      if (saved) {
        setAlerts(JSON.parse(saved));
      } else {
        setAlerts([]);
      }
    } catch {
      // Fallback
    }
  }, [userId]);

  // Sync alerts database with safeStorage
  React.useEffect(() => {
    if (!userId) return;
    try {
      safeStorage.setItem(`gestaoedu_alerts_${userId}`, JSON.stringify(alerts));
    } catch {
      // Fallback
    }
  }, [alerts, userId]);

  // Background Alert Checking Loop (Ticking Engine) - Completely immutable
  React.useEffect(() => {
    const handleCheckAlerts = () => {
      const nowMs = Date.now();
      let newlyFired: RevisionAlert | null = null;
      let hasChange = false;

      const updated = alerts.map(item => {
        if (item.status === 'active' && nowMs >= item.scheduledTime) {
          newlyFired = item;
          hasChange = true;
          return { ...item, status: 'fired' as const };
        }
        return item;
      });

      if (hasChange) {
        setAlerts(updated);
        if (newlyFired) {
          setFiredAlert(newlyFired);
          playAlertSound();
          
          try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`🔔 Hora de Revisar: ${newlyFired.topicName}`, {
                body: `Está na hora de colocar em prática seu estudo de ${newlyFired.subjectName}! (${newlyFired.notes})`,
              });
            }
          } catch {
            // Notification not permitted in iframe sandbox
          }
        }
      }
    };

    const interval = setInterval(handleCheckAlerts, 5000);
    return () => clearInterval(interval);
  }, [alerts]);

  const requestBrowserNotificationPermission = () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch {
      // Not allowed in iframe
    }
  };

  const pendingReviewTopics = useMemo(() => {
    try {
      return (topics || []).filter(t => 
        t && !t.revisionDone && 
        (t.theoryDone || t.exercisesDone || t.lastStudyDate)
      ).map(t => {
        const subject = (subjects || []).find(s => s && s.id === t.subjectId);
        return {
          ...t,
          subjectName: subject?.name || 'Matéria',
          subjectColor: subject?.color || '#6366f1'
        };
      }).sort((a, b) => {
        const dateA = a.lastStudyDate || a.createdAt || 0;
        const dateB = b.lastStudyDate || b.createdAt || 0;
        return dateA - dateB;
      });
    } catch (e) {
      console.error("Error computing pendingReviewTopics:", e);
      return [];
    }
  }, [topics, subjects]);

  const allSuggestedTopics = useMemo(() => {
    try {
      if (pendingReviewTopics.length > 0) return pendingReviewTopics;
      return (topics || []).map(t => {
        const subject = (subjects || []).find(s => s && s.id === t.subjectId);
        return {
          ...t,
          subjectName: subject?.name || 'Matéria',
          subjectColor: subject?.color || '#6366f1'
        };
      });
    } catch (e) {
      console.error("Error computing allSuggestedTopics:", e);
      return [];
    }
  }, [pendingReviewTopics, topics, subjects]);

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicToSchedule) {
      alert("Selecione um tópico.");
      return;
    }
    
    let scheduledTimeMs = Date.now();
    
    if (scheduleIntervalPreset === "24h") {
      scheduledTimeMs = Date.now() + 24 * 60 * 60 * 1000;
    } else if (scheduleIntervalPreset === "3d") {
      scheduledTimeMs = Date.now() + 3 * 24 * 60 * 60 * 1000;
    } else if (scheduleIntervalPreset === "7d") {
      scheduledTimeMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    } else {
      try {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const [year, month, day] = scheduleDate.split("-").map(Number);
        const parsedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        scheduledTimeMs = parsedDate.getTime();
      } catch (err) {
        alert("Data ou hora inválida. Por favor, corrija.");
        return;
      }
    }
    
    if (scheduledTimeMs <= Date.now()) {
      alert("A hora do alerta deve ser no futuro.");
      return;
    }
    
    const newAlert: RevisionAlert = {
      id: Math.random().toString(36).substring(2, 11),
      topicId: selectedTopicToSchedule.id,
      topicName: selectedTopicToSchedule.name,
      subjectName: selectedTopicToSchedule.subjectName || "Assunto",
      subjectColor: selectedTopicToSchedule.subjectColor || "#6366f1",
      scheduledTime: scheduledTimeMs,
      status: 'active',
      notes: scheduleNotes
    };
    
    setAlerts(prev => [newAlert, ...prev]);
    setSelectedTopicToSchedule(null);
    setSchedulerTab('active');
  };

  const now = useMemo(() => new Date(), []);

  const dailyQuote = useMemo(() => {
    try {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const dayOfYear = getDayOfYear(today);
      return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
    } catch (e) {
      return MOTIVATIONAL_QUOTES[0];
    }
  }, [now]);

  const { totalTopics, completedTopics, completionRate } = useMemo(() => {
    const total = (topics || []).length;
    const completed = (topics || []).filter(t => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTopics: total, completedTopics: completed, completionRate: rate };
  }, [topics]);

  const { totalQuestions, correctQuestions, accuracyRate } = useMemo(() => {
    const topicsTotal = (topics || []).reduce((acc, t) => acc + (Number(t.questionsTotal) || 0), 0);
    const topicsCorrect = (topics || []).reduce((acc, t) => acc + (Number(t.questionsCorrect) || 0), 0);
    const bankTotal = (answers || []).length;
    const bankCorrect = (answers || []).filter(a => a.isCorrect).length;
    const total = topicsTotal + bankTotal;
    const correct = topicsCorrect + bankCorrect;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { totalQuestions: total, correctQuestions: correct, accuracyRate: rate };
  }, [topics, answers]);

  const reviewedFlashcards = useMemo(() => (flashcards || []).filter(f => (f.repetition || 0) > 0 || f.lastReviewedAt !== undefined).length, [flashcards]);
  const nowForDue = useMemo(() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, [now]);
  const dueFlashcards = useMemo(() => {
    const dueTime = nowForDue;
    return (flashcards || []).filter(f => (Number(f.nextReviewDate) || 0) <= dueTime).length;
  }, [flashcards, nowForDue]);

  const totalStudyTime = useMemo(() => (sessions || []).reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0), [sessions]);

  // Today's specific performance metrics (Daily Goal & Streak)
  const todayStats = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const todaySessions = (sessions || []).filter(s => {
      try {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === todayMs;
      } catch {
        return false;
      }
    });
    const minutesToday = todaySessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

    const todayAnswers = (answers || []).filter(a => {
      try {
        const d = new Date(a.answeredAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === todayMs;
      } catch {
        return false;
      }
    });
    const questionsToday = todayAnswers.length;
    const correctQuestionsToday = todayAnswers.filter(a => a.isCorrect).length;

    return {
      minutes: minutesToday,
      questions: questionsToday,
      correctQuestions: correctQuestionsToday,
      sessionsCount: todaySessions.length,
      goalPercent: Math.min(100, Math.round((minutesToday / dailyGoalMinutes) * 100))
    };
  }, [sessions, answers, now, dailyGoalMinutes]);

  // 7-day consistency activity heatmap
  const last7DaysData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dTime = d.getTime();

      const daySessions = (sessions || []).filter(s => {
        try {
          const sd = new Date(s.date);
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === dTime;
        } catch { return false; }
      });
      const dayAnswers = (answers || []).filter(a => {
        try {
          const ad = new Date(a.answeredAt);
          ad.setHours(0, 0, 0, 0);
          return ad.getTime() === dTime;
        } catch { return false; }
      });

      const mins = daySessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
      const qCount = dayAnswers.length;

      days.push({
        date: d,
        dayName: format(d, 'EEE', { locale: ptBR }),
        dayNumber: d.getDate(),
        minutes: mins,
        questionsCount: qCount,
        hasActivity: mins > 0 || qCount > 0,
        isToday: i === 0
      });
    }
    return days;
  }, [sessions, answers, now]);

  // Dynamic study streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 45; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkMs = checkDate.getTime();

      const hasSession = (sessions || []).some(s => {
        try {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === checkMs;
        } catch { return false; }
      });

      const hasAnswer = (answers || []).some(a => {
        try {
          const d = new Date(a.answeredAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === checkMs;
        } catch { return false; }
      });

      if (hasSession || hasAnswer) {
        streak++;
      } else {
        if (i === 0) continue; // If no session yet today, keep previous streak
        break;
      }
    }
    return Math.max(streak, 1);
  }, [sessions, answers, now]);

  // Strategic Insights
  const strategicInsights = useMemo(() => {
    // Identify subject needing highest attention
    const subjectMap: Record<string, { total: number; correct: number; name: string; color: string }> = {};
    (subjects || []).forEach(s => {
      subjectMap[s.id] = { total: 0, correct: 0, name: s.name, color: s.color || '#f97316' };
    });
    (topics || []).forEach(t => {
      if (t.subjectId && subjectMap[t.subjectId]) {
        subjectMap[t.subjectId].total += (Number(t.questionsTotal) || 0);
        subjectMap[t.subjectId].correct += (Number(t.questionsCorrect) || 0);
      }
    });

    const evaluated = Object.entries(subjectMap)
      .map(([id, info]) => ({
        id,
        name: info.name,
        color: info.color,
        total: info.total,
        accuracy: info.total > 0 ? Math.round((info.correct / info.total) * 100) : 0
      }))
      .filter(item => item.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy);

    return {
      weakest: evaluated.length > 0 && evaluated[0].accuracy < 70 ? evaluated[0] : null,
      topPriorityTopic: pendingReviewTopics.length > 0 ? pendingReviewTopics[0] : null
    };
  }, [subjects, topics, pendingReviewTopics]);
  
  // Weekly progress
  const weeklyStats = useMemo(() => {
    try {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      const filtered = (sessions || []).filter(s => {
        try {
          const sessionDate = new Date(s.date);
          return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
        } catch (e) {
          return false;
        }
      });
      const time = filtered.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
      return { sessions: filtered, time };
    } catch (e) {
      return { sessions: [], time: 0 };
    }
  }, [sessions, now]);

  const weeklyStudyTime = weeklyStats.time;

  const recentActivity = useMemo(() => {
    try {
      const combined: any[] = [
        ...(sessions || []).map(s => ({ ...s, type: 'session' as const, date: s.date || 0 })),
        ...(answers || []).map(a => ({ ...a, type: 'answer' as const, date: a.answeredAt || 0 }))
      ];
      return combined.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 10);
    } catch (e) {
      console.error("Error computing recent activity:", e);
      return [];
    }
  }, [sessions, answers]);

  const flashcardSources = useMemo(() => {
    try {
      return (subjects || []).map(s => {
        const subjectCards = (flashcards || []).filter(f => f.subjectId === s.id);
        const reviewedCount = subjectCards.filter(f => (f.repetition || 0) > 0 || f.lastReviewedAt !== undefined).length;
        const totalCount = subjectCards.length;
        const pct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;
        const dueCount = subjectCards.filter(f => (Number(f.nextReviewDate) || 0) <= nowForDue).length;
        return {
          id: s.id,
          name: s.name || 'Sem nome',
          color: s.color || '#f97316',
          icon: s.icon,
          count: totalCount,
          reviewedCount,
          pct,
          dueCount
        };
      }).sort((a, b) => b.count - a.count);
    } catch (e) {
      console.error("Error computing flashcard sources:", e);
      return [];
    }
  }, [subjects, flashcards, nowForDue]);

  const filteredAndSortedSources = useMemo(() => {
    let list = [...flashcardSources];
    if (subjectFilterSearch.trim()) {
      const q = subjectFilterSearch.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    if (activeFilter === 'urgentes') {
      list.sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0));
    } else if (activeFilter === 'menor') {
      list.sort((a, b) => (a.pct || 0) - (b.pct || 0));
    } else if (activeFilter === 'edital') {
      // Keep natural order (sorted by count descending from flashcardSources)
    } else if (activeFilter === 'alfabeto') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeFilter === 'todos') {
      // Keep all, natural count order
    }
    return list;
  }, [flashcardSources, activeFilter, subjectFilterSearch]);

  const recommendedAction = useMemo(() => {
    const firstWithCards = flashcardSources.find(s => s.count > 0);
    const count = dueFlashcards > 0 ? dueFlashcards : 323;
    return {
      type: 'flashcards' as const,
      title: '🧠 Fortaleça sua memória hoje!',
      description: `Você tem ${count} flashcards aguardando revisão. Dedicar apenas 5 minutos agora melhora sua retenção em até 150%!`,
      buttonText: 'Revisar Flashcards Agora ⚡',
      icon: Layers,
      colorClass: 'from-amber-50 to-orange-50/60 border-amber-200 text-amber-900',
      badge: 'Revisão Recomendada',
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200/50',
      action: () => {
        if (firstWithCards) {
          handleStartReview(firstWithCards);
        } else {
          navigate('/flashcards');
        }
      }
    };
  }, [dueFlashcards, flashcardSources, navigate]);

  const { totalPages, paginatedSources } = useMemo(() => {
    const total = Math.ceil((flashcardSources?.length || 0) / itemsPerPage);
    const paginated = (flashcardSources || []).slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
    return { totalPages: total, paginatedSources: paginated };
  }, [flashcardSources, currentPage, itemsPerPage]);

  const handleDeleteSource = async () => {
    if (!sourceToDelete || !userId || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteSubject(sourceToDelete.id);
      setSourceToDelete(null);
    } catch (error) {
      console.error("Error deleting source:", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenReviewSelector = (source: any) => {
    const subjectCards = (flashcards || []).filter(f => f && f.subjectId === source.id);
    const dueTime = nowForDue;
    const dueCards = subjectCards.filter(f => (Number(f.nextReviewDate) || 0) <= dueTime);
    
    setSelectedReviewSource(source);
    if (dueCards.length > 0) {
      setReviewMode('due');
    } else {
      setReviewMode('all');
    }
    
    // Initialize custom checkboxes to all selected initially
    const initialSelection: Record<string, boolean> = {};
    subjectCards.forEach(c => {
      initialSelection[c.id] = true;
    });
    setSelectedCardIds(initialSelection);
    setSearchCardQuery('');
  };

  const handleConfirmReview = () => {
    if (!selectedReviewSource) return;
    
    const subjectCards = (flashcards || []).filter(f => f && f.subjectId === selectedReviewSource.id);
    let cardsToReview: typeof flashcards = [];
    
    if (reviewMode === 'due') {
      const dueTime = nowForDue;
      cardsToReview = subjectCards.filter(f => (Number(f.nextReviewDate) || 0) <= dueTime);
    } else if (reviewMode === 'all') {
      cardsToReview = subjectCards;
    } else if (reviewMode === 'custom') {
      cardsToReview = subjectCards.filter(f => selectedCardIds[f.id]);
    }
    
    if (cardsToReview.length > 0) {
      setReviewCards(cardsToReview);
      setIsReviewing(true);
      setSelectedReviewSource(null); // Close modal
    } else {
      alert("Nenhum flashcard selecionado para revisão.");
    }
  };

  const handleStartReview = async (source: typeof flashcardSources[0]) => {
    handleOpenReviewSelector(source);
  };

  const isFreePlan = (subscription?.plan || 'free') === 'free';
  const flashcardsUsed = subscription?.flashcardsCount || 0;
  const flashcardsLimit = 50;
  const usagePercent = Math.min(100, (flashcardsUsed / flashcardsLimit) * 100);

  const panelHeightClass = (showAllSubjects || showAllAlerts || showAllActivity) ? "h-[580px]" : "h-[350px]";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {isFreePlan && (
        <div className={cn(
          "p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all",
          flashcardsUsed >= 40 
            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg shadow-amber-100" 
            : "bg-white border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              flashcardsUsed >= 45 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            )}>
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {flashcardsUsed >= 50 ? "Limite Atingido!" : "Potencialize seus Estudos"}
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                {flashcardsUsed >= 50 
                  ? "Você atingiu o limite de 50 cards. Faça o upgrade para criar cards ilimitados!" 
                  : `Você já criou ${flashcardsUsed} de ${flashcardsLimit} cards permitidos no plano gratuito.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-48">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Uso de Cards</span>
                <span>{flashcardsUsed}/{flashcardsLimit}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out",
                    flashcardsUsed >= 45 ? "bg-red-500" : "bg-orange-500"
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 whitespace-nowrap cursor-pointer"
            >
              Fazer Upgrade
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              Plano de Estudos Ativo
            </span>
            <span className="text-xs font-semibold text-slate-400 capitalize">
              {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, Concurseiro! 🎯
          </h2>
          <p className="text-slate-500 text-sm">Organize seu aprendizado, mantenha a constância e conquiste sua aprovação.</p>
        </div>

        {/* Quick Goal Adjust Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingGoal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-orange-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:bg-orange-50/30"
          >
            <Target size={15} className="text-orange-500" />
            Meta Diária: {dailyGoalMinutes} min
            <Edit3 size={12} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* Daily Goal & Streak Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Daily Goal Progress */}
          <div className="lg:col-span-2 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Meta de Estudo Diária</h4>
                  <p className="text-xs text-slate-400">Progresso de tempo dedicado hoje</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-orange-600">{todayStats.minutes} min</span>
                <span className="text-xs text-slate-400 font-bold"> / {dailyGoalMinutes} min</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    todayStats.goalPercent >= 100 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                      : "bg-gradient-to-r from-orange-500 to-amber-500"
                  )}
                  style={{ width: `${todayStats.goalPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={cn(
                  todayStats.goalPercent >= 100 ? "text-emerald-600 font-black" : "text-slate-500"
                )}>
                  {todayStats.goalPercent >= 100 ? "🎉 Meta diária conquistada! Parabéns!" : `${todayStats.goalPercent}% da meta concluída`}
                </span>
                <span className="text-slate-400">
                  {todayStats.goalPercent < 100 
                    ? `Faltam ${Math.max(0, dailyGoalMinutes - todayStats.minutes)} min` 
                    : `${todayStats.minutes - dailyGoalMinutes} min extras!`}
                </span>
              </div>
            </div>
          </div>

          {/* Today Activity & Streak Counter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Questões Hoje</span>
              <div className="my-1">
                <span className="text-2xl font-black text-slate-800">{todayStats.questions}</span>
                {todayStats.questions > 0 && (
                  <span className="text-[11px] font-bold text-emerald-600 block">
                    {todayStats.correctQuestions} acertos ({Math.round((todayStats.correctQuestions / todayStats.questions) * 100)}%)
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {todayStats.questions > 0 ? "🔥 Ritmo ativo" : "Nenhuma hoje"}
              </span>
            </div>

            <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-100 text-center flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block">Ofensiva Atual</span>
              <div className="flex items-center justify-center gap-1.5 my-1">
                <Flame size={26} className="text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-2xl font-black text-slate-800">{currentStreak}</span>
              </div>
              <span className="text-[10px] font-bold text-orange-700">
                {currentStreak === 1 ? '1 dia de foco' : `${currentStreak} dias seguidos`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Edit Modal */}
      {isEditingGoal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Target size={18} className="text-orange-500" />
                Configurar Meta Diária
              </h3>
              <button onClick={() => setIsEditingGoal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">Defina quantos minutos por dia você deseja dedicar aos seus estudos:</p>
            
            <div className="grid grid-cols-3 gap-2">
              {[30, 45, 60, 90, 120, 180].map(mins => (
                <button
                  key={mins}
                  onClick={() => setTempGoalMinutes(mins)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer",
                    tempGoalMinutes === mins
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="number"
                min="15"
                max="720"
                value={tempGoalMinutes}
                onChange={e => setTempGoalMinutes(parseInt(e.target.value, 10) || 15)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <span className="text-xs font-bold text-slate-400 shrink-0">minutos/dia</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveGoal(tempGoalMinutes)}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-100 transition-all cursor-pointer"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Hub (Atalhos Rápidos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/questions')}
          className="p-3.5 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/20 rounded-2xl shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 group-hover:text-orange-600 transition-colors truncate">Treinar Questões</h4>
            <p className="text-[11px] text-slate-400 font-semibold truncate">Banco com gabarito</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/flashcards')}
          className="p-3.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 rounded-2xl shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Layers size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors truncate">Flashcards</h4>
            <p className="text-[11px] text-slate-400 font-semibold truncate">{dueFlashcards} para revisar</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/pomodoro')}
          className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-2xl shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">Modo Foco</h4>
            <p className="text-[11px] text-slate-400 font-semibold truncate">Pomodoro & Timer</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/stats')}
          className="p-3.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-2xl shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BarChart3 size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors truncate">Estatísticas</h4>
            <p className="text-[11px] text-slate-400 font-semibold truncate">Análise completa</p>
          </div>
        </button>
      </div>

      {/* Strategic Insights & Priority Recommendation */}
      {strategicInsights.weakest ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-200/80 text-orange-900">
                  🎯 Ponto Estratégico de Reforço
                </span>
                <span className="text-[11px] font-bold text-orange-800">Precisão: {strategicInsights.weakest.accuracy}%</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Fortaleça seu desempenho em <span className="text-orange-600 underline decoration-orange-300">{strategicInsights.weakest.name}</span>
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed mt-0.5">
                Identificamos que esta matéria tem margem para acelerar sua pontuação. Resolver 5 a 10 questões agora elevará sua média com rapidez!
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/questions')}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-orange-200 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            Treinar {strategicInsights.weakest.name} <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className={cn(
          "p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm bg-gradient-to-br",
          recommendedAction.colorClass
        )}>
          <div className="flex items-start gap-4">
            <div className="p-2 sm:p-3 bg-white/80 rounded-xl sm:rounded-2xl shadow-sm shrink-0">
              <recommendedAction.icon size={22} className="text-slate-800" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", recommendedAction.badgeColor)}>
                  {recommendedAction.badge}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-950">{recommendedAction.title}</h3>
              <p className="text-xs text-slate-700 max-w-2xl leading-normal">
                {recommendedAction.description}
              </p>
            </div>
          </div>
          <button
            onClick={recommendedAction.action}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 text-white hover:bg-slate-800 active:scale-95 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            {recommendedAction.buttonText}
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          title="Tópicos Concluídos" 
          value={completedTopics > 0 ? `${completedTopics} de ${totalTopics}` : "Começar!"} 
          subtitle={completionRate >= 80 ? "Incrível! Quase lá na meta!" : completionRate >= 50 ? "Mais da metade dominado!" : completionRate > 0 ? `${completionRate}% da jornada trilhada` : "Dê seu primeiro passo hoje!"}
          icon={GraduationCap}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Precisão Geral" 
          value={totalQuestions > 0 ? `${accuracyRate}%` : "—"} 
          subtitle={totalQuestions > 0 ? `${correctQuestions} acertos de ${totalQuestions} questões` : "Responda questões para calibrar"}
          icon={TrendingUp}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard 
          title="Flashcards Memorizados" 
          value={reviewedFlashcards > 0 ? `${reviewedFlashcards} cards` : "0 cards"} 
          subtitle={dueFlashcards > 0 ? `🔥 ${dueFlashcards} pendentes para hoje` : "🎉 Tudo em dia por hoje!"}
          icon={Layers}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard 
          title="Tempo de Estudo" 
          value={totalStudyTime > 0 ? `${totalStudyTime} min (${(totalStudyTime / 60).toFixed(1)}h)` : "0 min"} 
          subtitle={weeklyStudyTime > 0 ? `📈 ${weeklyStudyTime} min (${(weeklyStudyTime / 60).toFixed(1)}h) esta semana` : "Inicie uma sessão hoje!"}
          icon={Clock}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
      </div>

      {/* 7-Day Consistency Heatmap / Habit Strip */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-orange-500 rounded-full" />
            <h4 className="text-sm font-black text-slate-800">Constância dos Últimos 7 Dias</h4>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {last7DaysData.filter(d => d.hasActivity).length} de 7 dias com estudo registrado
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-1">
          {last7DaysData.map((d, i) => (
            <div
              key={i}
              className={cn(
                "p-2.5 sm:p-3 rounded-2xl border text-center transition-all flex flex-col justify-between items-center min-h-[90px]",
                d.isToday 
                  ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/10 shadow-xs" 
                  : d.hasActivity
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-slate-100 bg-slate-50/50"
              )}
            >
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider",
                  d.isToday ? "text-orange-600" : "text-slate-400"
                )}>
                  {d.dayName}
                </span>
                <span className="text-xs font-black text-slate-700 mt-0.5">
                  {d.dayNumber}
                </span>
              </div>

              <div className="my-1">
                {d.hasActivity ? (
                  <Flame size={18} className="text-orange-500 fill-orange-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />
                )}
              </div>

              <div className="text-[10px] font-extrabold text-slate-500">
                {d.minutes > 0 ? `${d.minutes}m` : d.questionsCount > 0 ? `${d.questionsCount}q` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Seção Central: "Foco Diário & Execução" */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Cronograma de Estudos & Foco</h3>
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 shadow-sm">
          {/* Coluna Esquerda: Cronograma Semanal de Segunda a Domingo */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-orange-500 rounded-full" />
                  Minhas Atividades do Ciclo
                </h4>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Ciclo 1 ao 7
                </span>
              </div>

              {/* Seletor de Dias da Semana (Pills) */}
              <div className="flex gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl mb-4 overflow-x-auto no-scrollbar">
                {DAYS_CONFIG.map((day) => {
                  const isActive = activeDay === day.key;
                  const list = (scheduleData as any)[day.key] || [];
                  const completedCount = list.filter((item: any) => item.completed).length;
                  const totalCount = list.length;
                  return (
                    <button
                      key={day.key}
                      onClick={() => setActiveDay(day.key as any)}
                      className={cn(
                        "flex-1 min-w-[64px] py-2 text-xs font-black rounded-xl transition-all text-center relative cursor-pointer",
                        isActive 
                          ? "bg-white text-orange-600 shadow-sm border border-slate-100" 
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                      )}
                    >
                      <div>{day.label}</div>
                      {totalCount > 0 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-xs",
                          completedCount === totalCount ? "bg-emerald-500" : "bg-orange-500"
                        )}>
                          {completedCount}/{totalCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lista de Matérias do Dia Selecionado */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {((scheduleData as any)[activeDay] || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    Nenhuma matéria cadastrada para o {DAYS_CONFIG.find(d => d.key === activeDay)?.fullName}.
                  </div>
                ) : (
                  ((scheduleData as any)[activeDay] || []).map((item: any) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all",
                        item.completed ? "bg-emerald-50/10 border-emerald-100/30" : ""
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                        <input 
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleItem(activeDay, item.id)}
                          className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                        />
                        <span className={cn(
                          "text-sm font-semibold text-slate-700 truncate",
                          item.completed ? "text-slate-400 line-through font-normal" : ""
                        )}>
                          {item.name}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteItem(activeDay, item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="Excluir matéria"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Formulário de Adicionar Matéria */}
            <div className="pt-4 border-t border-slate-100 mt-2">
              <div className="text-xs font-bold text-slate-500 mb-2">
                Adicionar matéria para {DAYS_CONFIG.find(d => d.key === activeDay)?.fullName}
              </div>
              <div className="flex flex-col gap-2">
                {subjects.length > 0 && (
                  <select
                    value={selectedSubjectForAdd}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSubjectForAdd(val);
                      if (val) {
                        const sub = subjects.find(s => s.id === val);
                        if (sub) {
                          setNewSubjectName(sub.name);
                        }
                      }
                    }}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Selecionar de minhas matérias cadastradas --</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Ou digite o nome de outra matéria..."
                    className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const sub = subjects.find(s => s.id === selectedSubjectForAdd);
                        handleAddItem(activeDay, newSubjectName, sub?.color);
                        setNewSubjectName('');
                        setSelectedSubjectForAdd('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const sub = subjects.find(s => s.id === selectedSubjectForAdd);
                      handleAddItem(activeDay, newSubjectName, sub?.color);
                      setNewSubjectName('');
                      setSelectedSubjectForAdd('');
                    }}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-orange-100"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Cronômetro Inteligente com Salvar Sessão */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center space-y-4 flex flex-col justify-center items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cronômetro de Foco</span>
                
                {/* Presets */}
                <div className="flex gap-1 p-0.5 bg-slate-200/60 rounded-xl">
                  <button
                    onClick={() => handleSetTimerPreset('free')}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                      timerPreset === 'free' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                    )}
                  >
                    Livre
                  </button>
                  <button
                    onClick={() => handleSetTimerPreset('pomodoro')}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                      timerPreset === 'pomodoro' ? "bg-white text-orange-600 shadow-xs" : "text-slate-500"
                    )}
                  >
                    25m
                  </button>
                  <button
                    onClick={() => handleSetTimerPreset('deep')}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                      timerPreset === 'deep' ? "bg-white text-orange-600 shadow-xs" : "text-slate-500"
                    )}
                  >
                    50m
                  </button>
                </div>
              </div>

              <div className="text-4xl md:text-5xl font-mono font-black text-slate-800 tracking-wider">
                {formatTime(timeSeconds)}
              </div>

              {/* Subject selector for session saving */}
              {subjects.length > 0 && (
                <div className="w-full">
                  <select
                    value={timerSubjectId}
                    onChange={(e) => setTimerSubjectId(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Vincular a uma Matéria (Opcional)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Timer Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm",
                    isTimerActive 
                      ? "bg-amber-500 hover:bg-amber-600 text-white" 
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  )}
                >
                  {isTimerActive ? (
                    <>
                      <Pause size={14} /> Pausar
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" /> {timeSeconds > 0 ? "Retomar" : "Iniciar Foco"}
                    </>
                  )}
                </button>

                {/* Save Study Session Button */}
                {timeSeconds >= 60 && (
                  <button
                    onClick={handleSaveTimerSession}
                    disabled={isSavingSession}
                    className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {isSavingSession ? 'Salvando...' : 'Salvar Sessão'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsTimerActive(false);
                    setTimeSeconds(timerPreset === 'pomodoro' ? 25 * 60 : timerPreset === 'deep' ? 50 * 60 : 0);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {saveSuccessMsg && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                  ✨ Sessão registrada com sucesso nas suas estatísticas!
                </div>
              )}
            </div>

            {/* Dificuldade do Dia e Streak */}
            <div className="grid grid-cols-2 gap-3">
              {/* Dificuldade */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dificuldade Hoje</span>
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={cn(
                          "flex-1 h-3 rounded transition-all cursor-pointer",
                          level <= difficulty 
                            ? "bg-amber-400 shadow-sm" 
                            : "bg-slate-200 hover:bg-slate-300"
                        )}
                        title={`Nível ${level}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    Nível {difficulty} de 5
                  </div>
                </div>
              </div>

              {/* Ofensiva (Streak) */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col justify-between items-center text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ofensiva</span>
                <div className="flex flex-col items-center justify-center mt-1">
                  <Flame size={26} className="text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 mt-0.5">{currentStreak} dias seguidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Base Expandida: "Central de Flashcards por Matéria" */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Flashcards por Matéria</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">
              {flashcardSources.length} MATÉRIAS
            </span>
          </div>

          {/* Search + Filter Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={subjectFilterSearch}
                onChange={(e) => setSubjectFilterSearch(e.target.value)}
                placeholder="Pesquisar matéria..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 w-full sm:w-44"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'urgentes', label: 'Urgentes' },
                { id: 'menor', label: 'Menor Nível' },
                { id: 'edital', label: 'Por Edital' },
                { id: 'todos', label: 'Todos' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border",
                    activeFilter === f.id
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Static Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 pt-1">
          {filteredAndSortedSources.length > 0 ? (
            (activeFilter === 'todos' ? filteredAndSortedSources : filteredAndSortedSources.slice(0, 8)).map((source) => {
              // Copywriting description of progress
              let statusLabel = "Nenhum card criado.";
              if (source.count > 0) {
                if (source.pct === 100) statusLabel = "✨ Excelente retenção!";
                else if (source.pct >= 70) statusLabel = "🚀 Memorização avançada!";
                else if (source.pct >= 35) statusLabel = "📚 Construindo conexões...";
                else statusLabel = "🌱 Próximo de iniciar!";
              }

              return (
                <div 
                  key={source.id} 
                  onClick={() => !loadingCards && handleStartReview(source)}
                  className={cn(
                    "bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all text-left group cursor-pointer relative overflow-hidden select-none min-h-[210px] h-auto w-full",
                    loadingCards && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: source.color }}
                      >
                        <SubjectIcon name={(source as any).icon} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 leading-snug min-h-[40px] flex items-center break-words">{source.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{source.count} {source.count === 1 ? 'card criado' : 'cards criados'}</p>
                        {source.count > 0 && (
                          <div className="mt-1">
                            {source.dueCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                                <Clock size={10} className="text-amber-600" /> {source.dueCount} para revisar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                <Check size={10} /> Em dia
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSourceToDelete({ id: source.id, name: source.name });
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Matéria"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="text-orange-600 bg-orange-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Play size={12} fill="currentColor" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic retention progress meter */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>Nível de Memorização</span>
                      <span className="font-bold text-slate-600">{source.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-700 ease-out rounded-full" 
                        style={{ 
                          width: `${source.pct}%`, 
                          backgroundColor: source.color,
                          boxShadow: `0 0 -6px ${source.color}40`
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 italic mt-1">{statusLabel}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <Layers className="mx-auto mb-2 opacity-20" size={32} />
              <p className="text-sm">Nenhum flashcard disponível para revisão.</p>
            </div>
          )}
        </div>
      </div>

      {/* Seletor de Flashcards por Matéria */}
      {selectedReviewSource && (() => {
        const subjectCards = (flashcards || []).filter(f => f && f.subjectId === selectedReviewSource.id);
        const dueTime = nowForDue;
        const dueCards = subjectCards.filter(f => (Number(f.nextReviewDate) || 0) <= dueTime);
        const filteredCards = subjectCards.filter(c => {
          if (!searchCardQuery) return true;
          return (c.front || '').toLowerCase().includes(searchCardQuery.toLowerCase()) || 
                 (c.back || '').toLowerCase().includes(searchCardQuery.toLowerCase());
        });

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full h-full sm:h-[90vh] sm:max-h-[650px] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-200 overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: selectedReviewSource.color }}
                  >
                    <SubjectIcon name={selectedReviewSource.icon} size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciar Sessão</span>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">{selectedReviewSource.name}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReviewSource(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <XCircle size={22} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar">
                
                {/* 1. Escolher Modo de Revisão */}
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Selecione o Modo de Estudo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    
                    {/* Modo Inteligente */}
                    <button
                      onClick={() => setReviewMode('due')}
                      className={cn(
                        "rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-row sm:flex-col items-center sm:items-start justify-between p-3.5 sm:p-4 h-auto sm:h-[120px] w-full",
                        reviewMode === 'due' 
                          ? "border-orange-500 bg-orange-50/40 shadow-sm" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between sm:w-full shrink-0">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          reviewMode === 'due' ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                        )}>
                          <Clock size={16} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 sm:mt-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-slate-800">Modo Inteligente</p>
                          {dueCards.length > 0 && (
                            <span className="text-[9px] sm:text-[10px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              {dueCards.length} hoje
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">Apenas agendados para hoje.</p>
                      </div>
                    </button>

                    {/* Todos os Cards */}
                    <button
                      onClick={() => setReviewMode('all')}
                      className={cn(
                        "rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-row sm:flex-col items-center sm:items-start justify-between p-3.5 sm:p-4 h-auto sm:h-[120px] w-full",
                        reviewMode === 'all' 
                          ? "border-orange-500 bg-orange-50/40 shadow-sm" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between sm:w-full shrink-0">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          reviewMode === 'all' ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                        )}>
                          <Layers size={16} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 sm:mt-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-slate-800">Revisão Geral</p>
                          <span className="text-[9px] sm:text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                            {subjectCards.length} cards
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">Estude todos os cards criados.</p>
                      </div>
                    </button>

                    {/* Escolher Específicos */}
                    <button
                      onClick={() => setReviewMode('custom')}
                      className={cn(
                        "rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-row sm:flex-col items-center sm:items-start justify-between p-3.5 sm:p-4 h-auto sm:h-[120px] w-full",
                        reviewMode === 'custom' 
                          ? "border-orange-500 bg-orange-50/40 shadow-sm" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between sm:w-full shrink-0">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          reviewMode === 'custom' ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                        )}>
                          <CheckSquare size={16} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 sm:mt-2">
                        <p className="text-xs font-black text-slate-800">Escolher Cards</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">Selecione os cards manualmente.</p>
                      </div>
                    </button>

                  </div>
                </div>

                {/* 2. Conteúdo Condicional de Acordo com o Modo */}
                {reviewMode === 'due' && (
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Método Spaced Repetition (Agendamento Inteligente)</h4>
                      <p className="text-[12px] text-amber-800 leading-snug mt-1">
                        {dueCards.length > 0 
                          ? `Excelente escolha! Você estudará os ${dueCards.length} cards prontos para revisão hoje. À medida que responder, eles ganharão novas datas de retorno e sumirão da sua fila diária.` 
                          : "Excelente! Você não tem cards agendados para hoje nesta matéria (tudo revisado!). Se deseja estudar assim mesmo, mude para 'Revisão Geral' ou 'Escolher Cards'."}
                      </p>
                    </div>
                  </div>
                )}

                {reviewMode === 'all' && (
                  <div className="bg-orange-50/40 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0 mt-0.5">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-orange-950 uppercase tracking-wide">Treino Livre Completo</h4>
                      <p className="text-[12px] text-orange-900 leading-snug mt-1">
                        Você revisará todos os {subjectCards.length} cards cadastrados nesta matéria. Perfeito para autoavaliação ou preparo para uma prova iminente!
                      </p>
                    </div>
                  </div>
                )}

                {reviewMode === 'custom' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Lista de Cards ({Object.values(selectedCardIds).filter(Boolean).length} Selecionados)</p>
                      
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            const newSelection: Record<string, boolean> = {};
                            subjectCards.forEach(c => { newSelection[c.id] = true; });
                            setSelectedCardIds(newSelection);
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:underline"
                        >
                          Marcar todos
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => {
                            setSelectedCardIds({});
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:underline"
                        >
                          Desmarcar todos
                        </button>
                      </div>
                    </div>

                    {/* Barra de Pesquisa de Cards */}
                    <div className="relative shrink-0">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Pesquisar por termo ou conceito..."
                        value={searchCardQuery}
                        onChange={(e) => setSearchCardQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 rounded-xl text-sm transition-all outline-none"
                      />
                    </div>

                    {/* Scrollable list of cards with selection */}
                    <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-slate-50/30">
                      {filteredCards.length > 0 ? (
                        filteredCards.map((card) => {
                          const isSelected = !!selectedCardIds[card.id];
                          const isCardDue = (Number(card.nextReviewDate) || 0) <= dueTime;
                          return (
                            <div 
                              key={card.id}
                              onClick={() => {
                                setSelectedCardIds(prev => ({
                                  ...prev,
                                  [card.id]: !prev[card.id]
                                }));
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 cursor-pointer transition-all hover:bg-white select-none",
                                isSelected ? "bg-orange-50/20" : ""
                              )}
                            >
                              <div className="flex items-start gap-3 min-w-0 pr-2">
                                <div className="mt-0.5 text-orange-600 shrink-0">
                                  {isSelected ? (
                                    <CheckSquare size={18} className="fill-orange-50" />
                                  ) : (
                                    <Square size={18} className="text-slate-300" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 truncate leading-snug">{card.front || 'Sem texto frontal'}</p>
                                  <p className="text-[10px] text-slate-400 truncate leading-normal mt-0.5">{card.back || 'Sem resposta'}</p>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {isCardDue ? (
                                  <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                                    Revisão
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    Em dia
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-6">Nenhum card encontrado para esta busca.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 shrink-0">
                <button
                  onClick={() => setSelectedReviewSource(null)}
                  className="px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 active:scale-95 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReview}
                  disabled={
                    (reviewMode === 'due' && dueCards.length === 0) || 
                    (reviewMode === 'custom' && Object.values(selectedCardIds).filter(Boolean).length === 0)
                  }
                  style={{ backgroundColor: selectedReviewSource.color }}
                  className="flex-1 py-3 text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all text-sm shadow-md shadow-slate-100 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <Play size={16} fill="currentColor" />
                  Iniciar Prática ({
                    reviewMode === 'due' ? dueCards.length : 
                    reviewMode === 'all' ? subjectCards.length : 
                    Object.values(selectedCardIds).filter(Boolean).length
                  } cards)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {isReviewing && (
        <FlashcardReview 
          cards={reviewCards}
          subjects={subjects}
          onReview={onReview}
          onClose={() => setIsReviewing(false)}
        />
      )}

      {/* Delete Source Confirmation Modal */}
      {sourceToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold">Excluir Matéria</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir a matéria "{sourceToDelete.name}"? Isso removerá permanentemente todos os tópicos e flashcards associados a ela em todas as abas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSourceToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSource}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Triggered Alarm / Alert Overlay Modal */}
      {firedAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200 border border-slate-100 text-center relative overflow-hidden">
            {/* Ambient Top Background Decoration Color Bar */}
            <div className="absolute top-0 inset-x-0 h-2" style={{ backgroundColor: firedAlert.subjectColor }} />
            
            <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 animate-bounce">
              <BellRing size={32} />
            </div>
            
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white mb-2 inline-block" style={{ backgroundColor: firedAlert.subjectColor }}>
              {firedAlert.subjectName}
            </span>
            
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Hora de Revisar!</h3>
            <p className="text-lg font-bold text-orange-600 mb-1">{firedAlert.topicName}</p>
            {firedAlert.notes && (
              <p className="text-sm text-slate-500 italic mb-6">"{firedAlert.notes}"</p>
            )}
            
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  try {
                    await studyService.updateTopic(firedAlert.topicId, { revisionDone: true });
                    setFiredAlert(null);
                    alert("Que excelente! Revisão marcada como concluída no banco de dados!");
                  } catch (err) {
                    console.error("Failed to mark review as done:", err);
                    setFiredAlert(null);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Marcar Como Revisado
              </button>
              
              <button
                onClick={() => {
                  const snoozedTime = Date.now() + 5 * 60 * 1000;
                  const updatedAlerts = alerts.map(a => {
                    if (a.id === firedAlert.id) {
                      return { ...a, scheduledTime: snoozedTime, status: 'active' as const };
                    }
                    return a;
                  });
                  setAlerts(updatedAlerts);
                  setFiredAlert(null);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Soneca (Adiar 5 min)
              </button>
              
              <button
                onClick={() => setFiredAlert(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-500 text-sm font-semibold transition-all"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivational Quote Footer */}
      <footer className="mt-12 pt-8 border-t border-slate-200">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group border border-slate-800">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Quote size={120} />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <p className="text-xl md:text-2xl font-medium italic leading-relaxed text-slate-100">
              "{dailyQuote.text}"
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-orange-400/50" />
              <span className="text-orange-400 font-bold tracking-wide uppercase text-sm">
                {dailyQuote.author}
              </span>
              <div className="h-px w-8 bg-orange-400/50" />
            </div>
          </div>
        </div>
        <p className="text-center text-slate-400 text-xs mt-6">
          © {new Date().getFullYear()} GestãoEdu • Transformando esforço em aprovação.
        </p>
      </footer>
    </div>
  );
}

const StatCard = React.memo(({ title, value, subtitle, icon: Icon, color, bgColor }: any) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div className={cn("p-1.5 sm:p-2 rounded-lg", bgColor, color)}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
      </div>
      <div>
        <p className="text-[11px] sm:text-xs md:text-[15px] font-medium text-slate-500 mb-0.5 sm:mb-1 truncate">{title}</p>
        <h4 className="text-base sm:text-xl md:text-3xl font-black text-slate-900">{value}</h4>
        <p className="text-[10px] sm:text-[14px] text-slate-400 mt-0.5 sm:mt-1 truncate">{subtitle}</p>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
