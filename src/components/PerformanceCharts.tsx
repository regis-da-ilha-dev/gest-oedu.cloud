import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, LineChart, Line, Legend, AreaChart, Area, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Subject, Topic, StudySession, Flashcard, UserSubscription, QuestionAnswer, Question } from '../types';
import { Lock, Star, TrendingUp, Zap, CheckCircle2, XCircle, Target, Clock, BookOpen, Brain, Activity, Gauge, Flame, Trophy, BarChart3, Sparkles, List } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format, startOfDay, subDays, eachDayOfInterval, isSameDay, startOfMonth, eachMonthOfInterval, endOfMonth, isAfter, subMonths } from 'date-fns';
import { cn } from '../lib/utils';
import { studyService } from '../services/studyService';

interface PerformanceChartsProps {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  flashcards: Flashcard[];
  answers: QuestionAnswer[];
  subscription: UserSubscription | null;
  questions?: Question[];
}

interface ResizeContainerProps {
  children: (width: number, height: number) => React.ReactNode;
  height: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChartErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chart rendering error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full w-full flex items-center justify-center text-slate-400 italic text-xs p-4">
          Erro ao renderizar o gráfico.
        </div>
      );
    }
    return this.props.children;
  }
}

const DISTINCT_SUBJECT_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#0284c7', // Sky
  '#ca8a04', // Yellow-gold
];

const ResizeContainer = ({ children, height }: ResizeContainerProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rAFId: number;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const w = Math.floor(width);
      if (w > 0) {
        cancelAnimationFrame(rAFId);
        rAFId = requestAnimationFrame(() => {
          setDimensions((prev) => {
            if (prev && prev.width === w && prev.height === height) {
              return prev;
            }
            return { width: w, height };
          });
        });
      }
    });

    resizeObserver.observe(container);
    return () => {
      cancelAnimationFrame(rAFId);
      resizeObserver.disconnect();
    };
  }, [height]);

  return (
    <div ref={containerRef} className="w-full" style={{ height: `${height}px` }}>
      {dimensions && dimensions.width > 0 ? children(dimensions.width, dimensions.height) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

const VelocimeterGauge = ({ value }: { value: number }) => {
  const angle = 180 - (Math.max(0, Math.min(100, value)) / 100) * 180;
  const radian = Math.PI / 180;
  const radius = 62;
  const cx = 100;
  const cy = 100;
  const x = cx + radius * Math.cos(angle * radian);
  const y = cy - radius * Math.sin(angle * radian);
  
  // Calculate dynamic position for the percentage label:
  // Placed on the outer side (radius 88) and slightly clockwise/to the right of the needle (angle - 15)
  const labelAngle = Math.max(10, Math.min(170, angle - 15));
  const labelRadius = 88;
  const lx = cx + labelRadius * Math.cos(labelAngle * radian);
  const ly = cy - labelRadius * Math.sin(labelAngle * radian);
  
  return (
    <div className="relative w-full max-w-[210px] mx-auto flex flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-full">
        {/* Background Grey Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="251"
          strokeDashoffset={251 - (251 * Math.max(0, Math.min(100, value))) / 100}
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff9600" /> {/* Duolingo Orange */}
            <stop offset="60%" stopColor="#facc15" /> {/* Canary Yellow */}
            <stop offset="100%" stopColor="#22c55e" /> {/* Duolingo Green */}
          </linearGradient>
        </defs>
        
        {/* Target meta indicator */}
        <line x1="140" y1="32" x2="147" y2="25" stroke="#1e293b" strokeWidth="2.5" />
        <text x="145" y="18" textAnchor="middle" className="text-[9px] font-black fill-slate-500 font-sans tracking-tight">META: 85%</text>

        {/* Center pivot point */}
        <circle cx="100" cy="100" r="10" fill="#475569" className="shadow-sm" />
        <circle cx="100" cy="100" r="5" fill="#ffffff" />
        
        {/* Arrow needle */}
        <line
          x1="100"
          y1="100"
          x2={x}
          y2={y}
          stroke="#475569"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Dynamic percentage label positioned beautifully outside to the right of the needle */}
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dy="0.35em"
          className="text-[13px] font-black fill-indigo-600 font-sans tracking-tight select-none"
        >
          {Math.round(value)}%
        </text>
      </svg>
    </div>
  );
};

const PerformanceCharts = React.memo(({ subjects, topics, sessions, flashcards, answers, subscription, questions: initialQuestions }: PerformanceChartsProps) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [accuracyViewMode, setAccuracyViewMode] = useState<'radar' | 'bars'>('bars');
  const [hoveredRadarItem, setHoveredRadarItem] = useState<any | null>(null);
  
  useEffect(() => {
    setIsMounted(true);
    
    if (initialQuestions && initialQuestions.length > 0) {
      return;
    }
    
    const unsubscribe = studyService.subscribeToQuestions(setQuestions);
    return () => {
      unsubscribe();
    };
  }, [initialQuestions]);

  const isElite = subscription?.plan === 'elite';
  const now = useMemo(() => new Date(), []);

  // Map to find which question belongs to which subject
  const questionToSubjectMap = useMemo(() => {
    const map = new Map<string, string>();
    (questions || []).forEach(q => {
      if (q && q.id && q.subjectId) {
        map.set(q.id, q.subjectId);
      }
    });
    return map;
  }, [questions]);

  // Map to find which question belongs to which topic
  const questionToTopicMap = useMemo(() => {
    const map = new Map<string, string>();
    (questions || []).forEach(q => {
      if (q && q.id && q.topicId) {
        map.set(q.id, q.topicId);
      }
    });
    return map;
  }, [questions]);

  // Map to find which topic belongs to which position
  const topicToPositionMap = useMemo(() => {
    const map = new Map<string, string>();
    (topics || []).forEach(t => {
      if (t && t.id && t.position) {
        map.set(t.id, t.position);
      }
    });
    return map;
  }, [topics]);

  // Map to find which question belongs to which position
  const questionToPositionMap = useMemo(() => {
    const map = new Map<string, string>();
    (questions || []).forEach(q => {
      if (q && q.id && q.position) {
        map.set(q.id, q.position);
      }
    });
    return map;
  }, [questions]);

  // Extract unique available positions
  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    (questions || []).forEach(q => {
      if (q && q.position && q.position.trim()) {
        set.add(q.position.trim());
      }
    });
    (topics || []).forEach(t => {
      if (t && t.position && t.position.trim()) {
        set.add(t.position.trim());
      }
    });
    return Array.from(set).sort();
  }, [questions, topics]);

  // Filtered lists based on chosen subject and position
  const filteredSessions = useMemo(() => {
    let list = sessions || [];
    if (selectedSubjectId !== 'all') {
      list = list.filter(s => s && s.subjectId === selectedSubjectId);
    }
    if (selectedPosition !== 'all') {
      list = list.filter(s => s && topicToPositionMap.get(s.topicId) === selectedPosition);
    }
    return list;
  }, [sessions, selectedSubjectId, selectedPosition, topicToPositionMap]);

  const filteredAnswers = useMemo(() => {
    let list = answers || [];
    if (selectedSubjectId !== 'all') {
      list = list.filter(a => a && questionToSubjectMap.get(a.questionId) === selectedSubjectId);
    }
    if (selectedPosition !== 'all') {
      list = list.filter(a => a && questionToPositionMap.get(a.questionId) === selectedPosition);
    }
    return list;
  }, [answers, selectedSubjectId, selectedPosition, questionToSubjectMap, questionToPositionMap]);

  const filteredTopics = useMemo(() => {
    let list = topics || [];
    if (selectedSubjectId !== 'all') {
      list = list.filter(t => t && t.subjectId === selectedSubjectId);
    }
    if (selectedPosition !== 'all') {
      list = list.filter(t => t && t.position === selectedPosition);
    }
    return list;
  }, [topics, selectedSubjectId, selectedPosition]);

  const filteredFlashcards = useMemo(() => {
    let list = flashcards || [];
    if (selectedSubjectId !== 'all') {
      list = list.filter(f => f && f.subjectId === selectedSubjectId);
    }
    if (selectedPosition !== 'all') {
      list = list.filter(f => f && f.topicId && topicToPositionMap.get(f.topicId) === selectedPosition);
    }
    return list;
  }, [flashcards, selectedSubjectId, selectedPosition, topicToPositionMap]);

  // Custom label for Pie Chart
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    if (
      cx === undefined || cy === undefined || outerRadius === undefined || midAngle === undefined || 
      cx === null || cy === null || outerRadius === null || midAngle === null ||
      isNaN(cx) || isNaN(cy) || isNaN(outerRadius) || isNaN(midAngle)
    ) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (isNaN(x) || isNaN(y)) return null;

    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10" fontWeight="bold">
        {name.length > 15 ? `${name.substring(0, 13)}...` : name}: {value}h
      </text>
    );
  };

  // Unified Questions Summary Stats (combines interactive bank answers + study session history)
  const questionSummaryStats = useMemo(() => {
    const bankTotal = (filteredAnswers || []).length;
    const bankHits = (filteredAnswers || []).filter(a => a && a.isCorrect).length;
    const bankErrors = bankTotal - bankHits;

    const validSessions = (filteredSessions || []).filter(Boolean);
    const sessionTotal = validSessions.reduce((acc, s) => acc + (Number(s.questionsTotal) || 0), 0);
    const sessionHits = validSessions.reduce((acc, s) => acc + (Number(s.questionsCorrect) || 0), 0);
    const sessionErrors = Math.max(0, sessionTotal - sessionHits);

    const validTopics = (filteredTopics || []).filter(Boolean);
    const topicTotal = validTopics.reduce((acc, t) => acc + (Number(t.questionsTotal) || 0), 0);
    const topicHits = validTopics.reduce((acc, t) => acc + (Number(t.questionsCorrect) || 0), 0);

    const combinedTotal = bankTotal + sessionTotal;
    let totalHits = bankHits + sessionHits;

    const total = Math.max(combinedTotal, topicTotal);
    if (total === topicTotal && topicTotal > 0 && combinedTotal < topicTotal) {
      totalHits = topicHits;
    }

    const totalErrors = Math.max(0, total - totalHits);
    const accuracy = total > 0 ? Number(((totalHits / total) * 100).toFixed(1)) : 0;

    return {
      total,
      hits: totalHits,
      errors: totalErrors,
      accuracy,
      bankTotal,
      bankHits,
      bankErrors,
      sessionTotal,
      sessionHits,
      sessionErrors
    };
  }, [filteredAnswers, filteredSessions, filteredTopics]);

  // KPI Calculations
  const kpis = React.useMemo(() => {
    try {
      const validAnswers = (filteredAnswers || []).filter((a): a is QuestionAnswer => !!(a && a.answeredAt));
      const validSessions = (filteredSessions || []).filter(Boolean);
      const validTopics = (filteredTopics || []).filter(Boolean);
      const validQuestions = (questions || []).filter((q): q is Question => !!(q && q.id));

      // 1. Efficiency
      const totalMinutes = validSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
      const totalHours = totalMinutes / 60;
      
      // Average Questions per active day
      const answerDays = validAnswers.map(a => {
        const d = new Date(a.answeredAt);
        return isNaN(d.getTime()) ? 'invalid' : format(d, 'yyyy-MM-dd');
      });
      const sessionDays = validSessions.map(s => {
        const d = new Date(s.date);
        return isNaN(d.getTime()) ? 'invalid' : format(d, 'yyyy-MM-dd');
      });
      const uniqueDays = new Set([...answerDays, ...sessionDays].filter(d => d !== 'invalid')).size;
      const avgQuestionsPerDay = uniqueDays > 0 ? questionSummaryStats.total / uniqueDays : 0;
      
      // Burn down / velocity: Topics completed per hour of study
      const completedTopicsCount = validTopics.filter(t => t.status === 'completed').length;
      const topicsPerHour = totalHours > 0 ? completedTopicsCount / totalHours : 0;

      // 2. Efficacy
      const hits = questionSummaryStats.hits;
      const totalAns = questionSummaryStats.total;
      const overallAccuracy = questionSummaryStats.accuracy;

      // Retention: Answers in topics/subjects studied long ago
      const answerSubjectMap = new Map<string, string>();
      validQuestions.forEach(q => {
        if (q.id && q.subjectId) {
          answerSubjectMap.set(q.id, q.subjectId);
        }
      });

      const thirtyDaysAgo = subDays(now, 30).getTime();
      
      const activeSubjectIds = new Set(
        validSessions.filter(s => s && s.date > thirtyDaysAgo).map(s => s.subjectId)
      );

      const retentionAnswers = validAnswers.filter(a => {
        const subjectId = answerSubjectMap.get(a.questionId);
        return subjectId && !activeSubjectIds.has(subjectId);
      });

      const retentionHits = retentionAnswers.filter(a => a.isCorrect).length;
      const retentionRate = retentionAnswers.length > 0 ? (retentionHits / retentionAnswers.length) * 100 : overallAccuracy;

      // evolution: last 7 days accuracy vs previous 7 days (or overall)
      const sevenDaysAgo = subDays(now, 7).getTime();
      const fourteenDaysAgo = subDays(now, 14).getTime();

      const last7Days = validAnswers.filter(a => a.answeredAt > sevenDaysAgo);
      const prev7Days = validAnswers.filter(a => a.answeredAt > fourteenDaysAgo && a.answeredAt <= sevenDaysAgo);

      const last7Accuracy = last7Days.length > 0 ? (last7Days.filter(a => a.isCorrect).length / last7Days.length) * 100 : overallAccuracy;
      const prev7Accuracy = prev7Days.length > 0 ? (prev7Days.filter(a => a.isCorrect).length / prev7Days.length) * 100 : overallAccuracy;
      
      const accuracyEvolution = last7Accuracy - prev7Accuracy;

      return {
        totalHours,
        totalMinutes,
        totalSessions: validSessions.length,
        avgQuestionsPerDay,
        topicsPerHour,
        overallAccuracy,
        retentionRate,
        accuracyEvolution,
        totalAns
      };
    } catch (e) {
      console.error("Error calculating KPIs:", e);
      return {
        totalHours: 0,
        totalMinutes: 0,
        totalSessions: 0,
        avgQuestionsPerDay: 0,
        topicsPerHour: 0,
        overallAccuracy: 0,
        retentionRate: 0,
        accuracyEvolution: 0,
        totalAns: 0
      };
    }
  }, [filteredSessions, filteredAnswers, filteredTopics, now, questions]);

  // Distinct color mapping for subjects so each subject has a unique, vibrant color
  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const usedColors = new Set<string>();
    const validSubjects = (subjects || []).filter(s => s && s.id);

    validSubjects.forEach((sub, idx) => {
      if (sub.color && sub.color !== '#6366f1' && !usedColors.has(sub.color)) {
        map.set(sub.id, sub.color);
        usedColors.add(sub.color);
      } else {
        const paletteColor = DISTINCT_SUBJECT_COLORS.find(c => !usedColors.has(c)) || DISTINCT_SUBJECT_COLORS[idx % DISTINCT_SUBJECT_COLORS.length];
        map.set(sub.id, paletteColor);
        usedColors.add(paletteColor);
      }
    });

    return map;
  }, [subjects]);

  // Data for Subject/Topic Distribution (Pie Chart)
  const subjectDistributionData = React.useMemo(() => {
    try {
      if (selectedSubjectId === 'all') {
        const validSubjects = (subjects || []).filter(s => s && s.id);
        const validSessions = (filteredSessions || []).filter(s => s && s.subjectId);
        return validSubjects.map(subject => {
          const subjectSessions = validSessions.filter(s => s.subjectId === subject.id);
          const totalMinutes = subjectSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
          const totalHours = Number((totalMinutes / 60).toFixed(1));
          return {
            name: String(subject.name || 'Sem nome'),
            value: totalHours,
            minutes: totalMinutes,
            color: subjectColorMap.get(subject.id) || '#6366f1'
          };
        }).filter(d => d.value > 0);
      } else {
        // Show by topic within the selected subject
        const validTopics = (filteredTopics || []).filter(t => t && t.subjectId === selectedSubjectId);
        const validSessions = (filteredSessions || []).filter(s => s && s.topicId);
        
        return validTopics.map((topic, idx) => {
          const topicSessions = validSessions.filter(s => s.topicId === topic.id);
          const totalMinutes = topicSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
          const totalHours = Number((totalMinutes / 60).toFixed(1));
          return {
            name: String(topic.name || 'Sem nome'),
            value: totalHours,
            minutes: totalMinutes,
            color: DISTINCT_SUBJECT_COLORS[idx % DISTINCT_SUBJECT_COLORS.length]
          };
        }).filter(d => d.value > 0);
      }
    } catch (e) {
      console.error("Error computing distribution data:", e);
      return [];
    }
  }, [subjects, filteredTopics, filteredSessions, selectedSubjectId, subjectColorMap]);

  // Data for Accuracy by Subject or Topic (Bar Chart)
  const accuracyData = React.useMemo(() => {
    try {
      if (selectedSubjectId === 'all') {
        const validSubjects = (subjects || []).filter(s => s && s.id);
        return validSubjects.map(subject => {
          // 1. Question Bank interactive answers
          const subjectAnswers = filteredAnswers.filter(a => questionToSubjectMap.get(a.questionId) === subject.id);
          const qaTotal = subjectAnswers.length;
          const qaHits = subjectAnswers.filter(a => a.isCorrect).length;

          // 2. Topic level stored stats
          const subjectTopics = (filteredTopics || []).filter(t => t && t.subjectId === subject.id);
          const topicTotal = subjectTopics.reduce((acc, t) => acc + (Number(t.questionsTotal) || 0), 0);
          const topicHits = subjectTopics.reduce((acc, t) => acc + (Number(t.questionsCorrect) || 0), 0);

          // 3. Study session stats
          const subjectSessions = (filteredSessions || []).filter(s => s && s.subjectId === subject.id);
          const sessionTotal = subjectSessions.reduce((acc, s) => acc + (Number(s.questionsTotal) || 0), 0);
          const sessionHits = subjectSessions.reduce((acc, s) => acc + (Number(s.questionsCorrect) || 0), 0);

          const totalQuestions = Math.max(qaTotal, topicTotal, sessionTotal);
          let correctQuestions = qaHits;
          if (totalQuestions === topicTotal && topicTotal > 0) {
            correctQuestions = topicHits;
          } else if (totalQuestions === sessionTotal && sessionTotal > 0) {
            correctQuestions = sessionHits;
          }

          const accuracy = totalQuestions > 0 ? Number(((correctQuestions / totalQuestions) * 100).toFixed(1)) : 0;
          return {
            name: String(subject.name || 'Sem nome'),
            accuracy,
            color: subjectColorMap.get(subject.id) || '#6366f1',
            total: totalQuestions,
            hits: correctQuestions
          };
        }).filter(d => d.total > 0);
      } else {
        // Show accuracy by Topic
        const validTopics = (filteredTopics || []).filter(t => t && t.subjectId === selectedSubjectId);
        
        return validTopics.map((topic, idx) => {
          const topicAnswers = filteredAnswers.filter(a => questionToTopicMap.get(a.questionId) === topic.id);
          const qaTotal = topicAnswers.length;
          const qaHits = topicAnswers.filter(a => a.isCorrect).length;

          const topicTotal = Number(topic.questionsTotal) || 0;
          const topicHits = Number(topic.questionsCorrect) || 0;

          const topicSessions = (filteredSessions || []).filter(s => s && s.topicId === topic.id);
          const sessionTotal = topicSessions.reduce((acc, s) => acc + (Number(s.questionsTotal) || 0), 0);
          const sessionHits = topicSessions.reduce((acc, s) => acc + (Number(s.questionsCorrect) || 0), 0);

          const totalQuestions = Math.max(qaTotal, topicTotal, sessionTotal);
          let correctQuestions = qaHits;
          if (totalQuestions === topicTotal && topicTotal > 0) {
            correctQuestions = topicHits;
          } else if (totalQuestions === sessionTotal && sessionTotal > 0) {
            correctQuestions = sessionHits;
          }

          const accuracy = totalQuestions > 0 ? Number(((correctQuestions / totalQuestions) * 100).toFixed(1)) : 0;
          return {
            name: String(topic.name || 'Sem nome'),
            accuracy,
            color: DISTINCT_SUBJECT_COLORS[idx % DISTINCT_SUBJECT_COLORS.length],
            total: totalQuestions,
            hits: correctQuestions
          };
        }).filter(d => d.total > 0);
      }
    } catch (e) {
      console.error("Error computing accuracy data:", e);
      return [];
    }
  }, [subjects, filteredTopics, filteredAnswers, filteredSessions, questionToSubjectMap, questionToTopicMap, selectedSubjectId, subjectColorMap]);

  // Data for Flashcards
  const flashcardData = React.useMemo(() => {
    try {
      if (selectedSubjectId === 'all') {
        const validSubjects = (subjects || []).filter(s => s && s.id);
        const validFlashcards = (filteredFlashcards || []).filter(f => f && f.subjectId);
        return validSubjects.map(subject => {
          const subjectFlashcards = validFlashcards.filter(f => f.subjectId === subject.id);
          const reviewedCount = subjectFlashcards.filter(f => (Number(f.repetition) || 0) > 0 || f.lastReviewedAt !== undefined).length;
          return {
            name: String(subject.name || 'Sem nome'),
            count: Number(subjectFlashcards.length),
            reviewed: Number(reviewedCount),
            color: String(subject.color || '#6366f1')
          };
        }).filter(d => d.count > 0);
      } else {
        const validTopics = (filteredTopics || []).filter(t => t && t.subjectId === selectedSubjectId);
        const validFlashcards = (filteredFlashcards || []).filter(f => f && f.topicId);
        const subject = (subjects || []).find(s => s.id === selectedSubjectId);
        const baseColor = subject?.color || '#6366f1';
        
        return validTopics.map(topic => {
          const topicFlashcards = validFlashcards.filter(f => f.topicId === topic.id);
          const reviewedCount = topicFlashcards.filter(f => (Number(f.repetition) || 0) > 0 || f.lastReviewedAt !== undefined).length;
          return {
            name: String(topic.name || 'Sem nome'),
            count: Number(topicFlashcards.length),
            reviewed: Number(reviewedCount),
            color: baseColor
          };
        }).filter(d => d.count > 0);
      }
    } catch (e) {
      console.error("Error computing flashcard data:", e);
      return [];
    }
  }, [subjects, filteredTopics, filteredFlashcards, selectedSubjectId]);

  // Data for Question Performance Over Time (Historical - Monthly)
  const questionPerformanceData = React.useMemo(() => {
    try {
      const validAnswers = (filteredAnswers || []).filter(a => a && a.answeredAt);
      if (validAnswers.length === 0) return [];

      let minTimestamp = now.getTime();
      validAnswers.forEach(a => {
        const ts = Number(a.answeredAt);
        if (!isNaN(ts) && ts < minTimestamp) {
          minTimestamp = ts;
        }
      });

      let startDate = startOfMonth(new Date(minTimestamp));
      const endDate = startOfMonth(now);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return [];
      }
      
      if (startDate > endDate) {
        startDate = endDate;
      }
      
      const monthInterval = eachMonthOfInterval({
        start: startDate,
        end: endDate
      });

      const answersByMonth: Record<string, { hits: number; misses: number }> = {};
      
      validAnswers.forEach(a => {
        if (!a.answeredAt) return;
        const date = new Date(a.answeredAt);
        if (isNaN(date.getTime())) return;
        
        const monthStr = format(date, 'MM/yyyy');
        if (!answersByMonth[monthStr]) {
          answersByMonth[monthStr] = { hits: 0, misses: 0 };
        }
        if (a.isCorrect) {
          answersByMonth[monthStr].hits++;
        } else {
          answersByMonth[monthStr].misses++;
        }
      });

      return monthInterval.map(date => {
        const monthStr = format(date, 'MM/yyyy');
        const stats = answersByMonth[monthStr] || { hits: 0, misses: 0 };

        return {
          date: format(date, 'MMM/yy', { locale: ptBR }),
          hits: stats.hits,
          misses: stats.misses,
          total: stats.hits + stats.misses,
          accuracy: (stats.hits + stats.misses) > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0
        };
      });
    } catch (e) {
      console.error("Error computing question performance data:", e);
      return [];
    }
  }, [filteredAnswers, now]);

  const totalQuestionStats = React.useMemo(() => {
    try {
      const validAnswers = (filteredAnswers || []).filter(Boolean);
      const hits = validAnswers.filter(a => a.isCorrect).length;
      const misses = validAnswers.filter(a => !a.isCorrect).length;
      const total = hits + misses;
      const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
      return { hits, misses, total, accuracy };
    } catch (e) {
      console.error("Error calculating total question stats:", e);
      return { hits: 0, misses: 0, total: 0, accuracy: 0 };
    }
  }, [filteredAnswers]);

  // Study hours per day (last 7 days consistency)
  const dailyConsistencyData = React.useMemo(() => {
    try {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const last7DaysInterval = eachDayOfInterval({
        start: subDays(now, 6),
        end: now
      });
      
      return last7DaysInterval.map(date => {
        const dayName = days[date.getDay()];
        const daySessions = (filteredSessions || []).filter(s => {
          const sDate = new Date(s.date);
          return !isNaN(sDate.getTime()) && isSameDay(sDate, date);
        });
        const totalMinutes = daySessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
        const hours = Number((totalMinutes / 60).toFixed(1));
        return {
          day: dayName,
          dateStr: format(date, 'dd/MM'),
          hours,
          minutes: totalMinutes
        };
      });
    } catch (e) {
      console.error("Error calculating daily consistency:", e);
      return [];
    }
  }, [filteredSessions, now]);

  // Radar/Spider web chart data: accuracy by subject or topic
  const radarData = React.useMemo(() => {
    try {
      if (selectedSubjectId === 'all') {
        const validSubjects = (subjects || []).filter(s => s && s.id);
        return validSubjects.map(subject => {
          const subjectAnswers = filteredAnswers.filter(a => questionToSubjectMap.get(a.questionId) === subject.id);
          const qaTotal = subjectAnswers.length;
          const qaHits = subjectAnswers.filter(a => a.isCorrect).length;

          const subjectTopics = (filteredTopics || []).filter(t => t && t.subjectId === subject.id);
          const topicTotal = subjectTopics.reduce((acc, t) => acc + (Number(t.questionsTotal) || 0), 0);
          const topicHits = subjectTopics.reduce((acc, t) => acc + (Number(t.questionsCorrect) || 0), 0);

          const subjectSessions = (filteredSessions || []).filter(s => s && s.subjectId === subject.id);
          const sessionTotal = subjectSessions.reduce((acc, s) => acc + (Number(s.questionsTotal) || 0), 0);
          const sessionHits = subjectSessions.reduce((acc, s) => acc + (Number(s.questionsCorrect) || 0), 0);

          const totalQuestions = Math.max(qaTotal, topicTotal, sessionTotal);
          let correctQuestions = qaHits;
          if (totalQuestions === topicTotal && topicTotal > 0) {
            correctQuestions = topicHits;
          } else if (totalQuestions === sessionTotal && sessionTotal > 0) {
            correctQuestions = sessionHits;
          }

          const accuracy = totalQuestions > 0 ? Number(((correctQuestions / totalQuestions) * 100).toFixed(1)) : 0;
          return {
            subject: subject.name.length > 15 ? `${subject.name.substring(0, 12)}...` : subject.name,
            fullName: subject.name,
            accuracy,
            total: totalQuestions,
            hits: correctQuestions,
            color: subjectColorMap.get(subject.id) || '#3b82f6'
          };
        }).filter(d => d.total > 0);
      } else {
        const validTopics = (filteredTopics || []).filter(t => t && t.subjectId === selectedSubjectId);
        return validTopics.map((topic, idx) => {
          const topicAnswers = filteredAnswers.filter(a => questionToTopicMap.get(a.questionId) === topic.id);
          const qaTotal = topicAnswers.length;
          const qaHits = topicAnswers.filter(a => a.isCorrect).length;

          const topicTotal = Number(topic.questionsTotal) || 0;
          const topicHits = Number(topic.questionsCorrect) || 0;

          const topicSessions = (filteredSessions || []).filter(s => s && s.topicId === topic.id);
          const sessionTotal = topicSessions.reduce((acc, s) => acc + (Number(s.questionsTotal) || 0), 0);
          const sessionHits = topicSessions.reduce((acc, s) => acc + (Number(s.questionsCorrect) || 0), 0);

          const totalQuestions = Math.max(qaTotal, topicTotal, sessionTotal);
          let correctQuestions = qaHits;
          if (totalQuestions === topicTotal && topicTotal > 0) {
            correctQuestions = topicHits;
          } else if (totalQuestions === sessionTotal && sessionTotal > 0) {
            correctQuestions = sessionHits;
          }

          const accuracy = totalQuestions > 0 ? Number(((correctQuestions / totalQuestions) * 100).toFixed(1)) : 0;
          return {
            subject: topic.name.length > 15 ? `${topic.name.substring(0, 12)}...` : topic.name,
            fullName: topic.name,
            accuracy,
            total: totalQuestions,
            hits: correctQuestions,
            color: DISTINCT_SUBJECT_COLORS[idx % DISTINCT_SUBJECT_COLORS.length]
          };
        }).filter(d => d.total > 0);
      }
    } catch (e) {
      console.error("Error computing radar data:", e);
      return [];
    }
  }, [subjects, filteredTopics, filteredAnswers, filteredSessions, questionToSubjectMap, questionToTopicMap, selectedSubjectId, subjectColorMap]);

  // Monthly performance data merging study hours & question accuracy
  const monthlyPerformanceData = React.useMemo(() => {
    try {
      const validSessions = (filteredSessions || []).filter(s => s && s.date);
      const validAnswers = (filteredAnswers || []).filter(a => a && a.answeredAt);
      
      let minTimestamp = now.getTime();
      validSessions.forEach(s => { if (s.date < minTimestamp) minTimestamp = s.date; });
      validAnswers.forEach(a => { if (Number(a.answeredAt) < minTimestamp) minTimestamp = Number(a.answeredAt); });
      
      let startDate = startOfMonth(subMonths(now, 5));
      if (minTimestamp < now.getTime()) {
        startDate = startOfMonth(new Date(minTimestamp));
      }
      const endDate = startOfMonth(now);
      
      const monthInterval = eachMonthOfInterval({
        start: startDate,
        end: endDate
      });
      
      const hoursByMonth: Record<string, number> = {};
      validSessions.forEach(s => {
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return;
        const key = format(d, 'yyyy-MM');
        hoursByMonth[key] = (hoursByMonth[key] || 0) + (Number(s.durationMinutes) || 0);
      });

      const answersByMonth: Record<string, { hits: number; total: number }> = {};
      validAnswers.forEach(a => {
        const d = new Date(a.answeredAt);
        if (isNaN(d.getTime())) return;
        const key = format(d, 'yyyy-MM');
        if (!answersByMonth[key]) answersByMonth[key] = { hits: 0, total: 0 };
        answersByMonth[key].total++;
        if (a.isCorrect) answersByMonth[key].hits++;
      });

      return monthInterval.map(date => {
        const key = format(date, 'yyyy-MM');
        const totalMinutes = hoursByMonth[key] || 0;
        const hours = Number((totalMinutes / 60).toFixed(1));
        
        const ans = answersByMonth[key] || { hits: 0, total: 0 };
        const accuracy = ans.total > 0 ? Math.round((ans.hits / ans.total) * 100) : 0;
        
        return {
          month: format(date, 'MMM', { locale: ptBR }).toUpperCase(),
          hours,
          minutes: totalMinutes,
          accuracy
        };
      });
    } catch (e) {
      console.error("Error calculating monthly performance:", e);
      return [];
    }
  }, [filteredSessions, filteredAnswers, now]);

  // Return null or loading if not mounted to avoid Recharts measuring issues during concurrent render
  if (!isMounted) return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 select-none">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estatísticas de Desempenho</h2>
          <p className="text-slate-500">Analise seu progresso, eficácia e eficiência nos estudos.</p>
        </div>
        {!isElite && (
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border-2 border-b-4 border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer"
          >
            <Star size={16} className="text-indigo-500" fill="currentColor" />
            Liberar Estatísticas Elite
          </button>
        )}
      </header>

      {/* Filter Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Filtros de Análise</h4>
            <p className="text-xs text-slate-400">Análise profunda por matéria, cargo ou visão consolidada</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition-all"
            >
              <option value="all">📚 Todas as Matérias</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition-all"
            >
              <option value="all">💼 Todos os Cargos</option>
              {availablePositions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Study Time Stats Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Resumo de Tempo</h4>
              <p className="text-xs text-slate-400">Dedicação total de tempo de estudos</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Minutos</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
                {kpis.totalMinutes}m
              </span>
            </div>
            
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
              <span className="text-[10px] font-black text-indigo-600/80 uppercase tracking-wider block">Horas</span>
              <span className="text-xl sm:text-2xl font-black text-indigo-600 mt-1 block">
                {kpis.totalHours.toFixed(1)}h
              </span>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
              <span className="text-[10px] font-black text-blue-600/80 uppercase tracking-wider block">Sessões</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 mt-1 block">
                {kpis.totalSessions}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Média por Sessão:</span>
            <span className="text-indigo-600 font-extrabold">
              {kpis.totalSessions > 0 ? Math.round(kpis.totalMinutes / kpis.totalSessions) : 0} min
            </span>
          </div>
        </div>

        {/* Questions Stats Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Resumo de Questões</h4>
                <p className="text-xs text-slate-400">Histórico de Sessões + Banco Interativo</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Feito</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 block">
                  {questionSummaryStats.total}
                </span>
              </div>
              
              <div className="p-2.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
                <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-wider block">Acertos</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 block">
                  {questionSummaryStats.hits}
                </span>
              </div>

              <div className="p-2.5 bg-rose-50/50 rounded-2xl border border-rose-100 text-center">
                <span className="text-[10px] font-black text-rose-600/80 uppercase tracking-wider block">Erros</span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5 block">
                  {questionSummaryStats.errors}
                </span>
              </div>
            </div>

            {/* Breakdown between session logs & interactive bank */}
            <div className="bg-slate-50/90 p-2.5 rounded-2xl border border-slate-100 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-600 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shrink-0"></span>
                  Histórico (Sessões):
                </span>
                <span className="font-extrabold text-slate-800">
                  {questionSummaryStats.sessionTotal} ({questionSummaryStats.sessionHits} acertos | {questionSummaryStats.sessionErrors} erros)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                  Banco Interativo:
                </span>
                <span className="font-extrabold text-slate-800">
                  {questionSummaryStats.bankTotal} ({questionSummaryStats.bankHits} acertos | {questionSummaryStats.bankErrors} erros)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Taxa de Precisão Geral:</span>
            <span className="text-emerald-600 font-extrabold text-sm">
              {questionSummaryStats.accuracy}%
            </span>
          </div>
        </div>

        {/* Flashcards Stats Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Resumo de Flashcards</h4>
              <p className="text-xs text-slate-400">Revisões e memorização</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Criado</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
                {filteredFlashcards.length}
              </span>
            </div>
            
            <div className="p-3 bg-green-50/50 rounded-2xl border border-green-100 text-center">
              <span className="text-[10px] font-black text-green-600/80 uppercase tracking-wider block">Revisados</span>
              <span className="text-xl sm:text-2xl font-black text-green-600 mt-1 block">
                {filteredFlashcards.filter(f => (Number(f.repetition) || 0) > 0 || f.lastReviewedAt !== undefined).length}
              </span>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 text-center">
              <span className="text-[10px] font-black text-amber-600/80 uppercase tracking-wider block">Pendentes</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">
                {filteredFlashcards.length - filteredFlashcards.filter(f => (Number(f.repetition) || 0) > 0 || f.lastReviewedAt !== undefined).length}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Progresso de Revisão:</span>
            <span className="text-indigo-600 font-extrabold">
              {filteredFlashcards.length > 0 ? Math.round((filteredFlashcards.filter(f => (Number(f.repetition) || 0) > 0 || f.lastReviewedAt !== undefined).length / filteredFlashcards.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: KPIs DE DESEMPENHO */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
              <Trophy size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
              KPIs de Desempenho
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Qualidade vs Quantidade</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Efficacy (Quality) */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">KPIs de Eficácia (Qualidade)</span>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1 mb-6">
                Eficácia: Taxa de Acerto Geral
              </h4>
            </div>

            <div className="py-2">
              <VelocimeterGauge value={kpis.overallAccuracy} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-200/60">
              <div className="p-3 bg-white rounded-xl border-2 border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Retenção</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">
                  {Math.round(kpis.retentionRate)}%
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border-2 border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Domínio</span>
                <span className="text-lg font-black text-indigo-600 mt-1 block">
                  {Math.round(Math.min(100, kpis.overallAccuracy * 0.9 + kpis.topicsPerHour * 10))}%
                </span>
              </div>
            </div>
          </div>

          {/* Efficiency (Quantity) */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">KPIs de Eficiência (Quantidade)</span>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1 mb-4">
                Eficiência: Constância de Horas
              </h4>
            </div>

            <div className="h-[220px] flex items-center justify-center">
              {dailyConsistencyData.length > 0 ? (
                <ResizeContainer height={220}>
                  {(width, height) => (
                    <ChartErrorBoundary>
                      <LineChart data={dailyConsistencyData} width={width} height={height} margin={{ top: 20, right: 20, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                          formatter={(value: any, name: any, props: any) => [`${props.payload.minutes} min (${value}h)`, 'Tempo de Estudo']}
                        />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="#ff9600"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#ff9600', strokeWidth: 0 }}
                          activeDot={{ r: 8, fill: '#ff9600', strokeWidth: 2, stroke: '#ffffff' }}
                          isAnimationActive={false}
                        >
                          <LabelList dataKey="hours" position="top" style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} formatter={((val: any, index: any) => {
                            const mins = dailyConsistencyData[index]?.minutes;
                            return val > 0 ? (mins !== undefined ? `${mins}m` : `${Math.round(val * 60)}m`) : '';
                          }) as any} />
                        </Line>
                      </LineChart>
                    </ChartErrorBoundary>
                  )}
                </ResizeContainer>
              ) : (
                <div className="text-slate-400 italic text-xs">Sem dados suficientes</div>
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-slate-400 font-bold">Distribuição de estudo nos últimos 7 dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ANÁLISE POR DISCIPLINA */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
              <Brain size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
              Análise por Disciplina
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Tempo vs Precisão</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Time Distribution Donut */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Distribuição de Tempo por Matéria (horas)</span>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1 mb-4">
                Distribuição de Tempo
              </h4>
            </div>

            <div className="flex-1 py-4">
              {subjectDistributionData.length > 0 ? (
                (() => {
                  const sortedData = [...subjectDistributionData].sort((a, b) => b.value - a.value);
                  const totalSum = sortedData.reduce((acc, d) => acc + d.value, 0);
                  
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-full">
                      <div className="relative w-[180px] h-[180px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={sortedData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              isAnimationActive={false}
                            >
                              {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#ff9600'} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total</span>
                          <span className="text-base font-black text-indigo-600 mt-0.5">{sortedData.reduce((acc, d) => acc + d.minutes, 0)} min</span>
                          <span className="text-[10px] font-bold text-slate-400">({totalSum.toFixed(1)}h)</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 max-w-[240px] w-full text-xs font-sans max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin">
                        {sortedData.map((item, idx) => {
                          const pct = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : '0';
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-100/60 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-slate-700 font-extrabold truncate" title={item.name}>{item.name}</span>
                              </div>
                              <span className="text-slate-500 font-bold shrink-0 text-[11px]">{item.minutes} min ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-[180px] flex items-center justify-center text-slate-400 italic text-xs">
                  Sem dados suficientes
                </div>
              )}
            </div>
          </div>

          {/* Radar Chart accuracy */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Precisão por Matéria (%)</span>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1">
                  Precisão por Matéria
                </h4>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl">
                <button
                  onClick={() => setAccuracyViewMode('bars')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1",
                    accuracyViewMode === 'bars'
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <List size={11} />
                  <span>Lista</span>
                </button>
                <button
                  onClick={() => setAccuracyViewMode('radar')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1",
                    accuracyViewMode === 'radar'
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Activity size={11} />
                  <span>Radar</span>
                </button>
              </div>
            </div>

            {radarData.length > 0 ? (
              accuracyViewMode === 'bars' ? (
                <div className="h-[220px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                  {[...radarData]
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .map((item: any, idx) => {
                      const percentage = item.accuracy;
                      let progressColor = "bg-rose-500";
                      let textColor = "text-rose-600";
                      let bgColor = "bg-rose-50";
                      if (percentage >= 75) {
                        progressColor = "bg-emerald-500";
                        textColor = "text-emerald-600";
                        bgColor = "bg-emerald-50";
                      } else if (percentage >= 50) {
                        progressColor = "bg-amber-500";
                        textColor = "text-amber-600";
                        bgColor = "bg-amber-50";
                      }

                      return (
                        <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 max-w-[70%]">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-extrabold text-slate-700 truncate" title={item.fullName}>
                                {item.fullName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-slate-400">
                                {item.hits}/{item.total} acertos
                              </span>
                              <span className={cn("px-1.5 py-0.5 rounded-md font-black text-[10px]", bgColor, textColor)}>
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="h-[220px] w-full flex items-center justify-center relative">
                    <ResizeContainer height={220}>
                      {(width, height) => (
                        <ChartErrorBoundary>
                          <RadarChart 
                            cx="50%" 
                            cy="50%" 
                            outerRadius="75%" 
                            data={radarData} 
                            width={width} 
                            height={height}
                            onMouseMove={(state: any) => {
                              if (state && state.activePayload && state.activePayload.length > 0) {
                                setHoveredRadarItem(state.activePayload[0].payload);
                              } else {
                                setHoveredRadarItem(null);
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredRadarItem(null);
                            }}
                          >
                            <PolarGrid stroke="#cbd5e1" strokeWidth={1.5} />
                            <PolarAngleAxis dataKey="subject" tick={false} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                            <Tooltip
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                backgroundColor: '#1e293b',
                                color: '#ffffff',
                                fontSize: '11px'
                              }}
                              itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                              labelStyle={{ color: '#ffffff', fontWeight: 'extrabold', marginBottom: '4px' }}
                              formatter={(value: any) => [`${value}%`, 'Precisão']}
                              labelFormatter={(label: any) => {
                                const found = radarData.find(d => d.subject === label);
                                return found ? `${found.fullName} (${found.hits}/${found.total} acertos)` : label;
                              }}
                            />
                            <Radar name="Precisão" dataKey="accuracy" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} isAnimationActive={false} />
                          </RadarChart>
                        </ChartErrorBoundary>
                      )}
                    </ResizeContainer>
                  </div>

                  {/* Detalhes do item focado ao passar o mouse */}
                  <div className="w-full mt-2 min-h-[44px] flex items-center justify-center">
                    {hoveredRadarItem ? (
                      <div className="bg-white px-4 py-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2.5 max-w-full text-center transition-all duration-200 animate-fade-in">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoveredRadarItem.color }} />
                        <span className="text-xs font-extrabold text-slate-700 truncate max-w-[150px] sm:max-w-[220px]" title={hoveredRadarItem.fullName}>
                          {hoveredRadarItem.fullName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({hoveredRadarItem.hits}/{hoveredRadarItem.total} acertos)
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0",
                          hoveredRadarItem.accuracy >= 75 ? "bg-emerald-50 text-emerald-600" :
                          hoveredRadarItem.accuracy >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {hoveredRadarItem.accuracy}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-bold text-center italic flex items-center gap-1.5 select-none">
                        <Sparkles size={12} className="text-amber-500 animate-pulse shrink-0" />
                        Passe o mouse ou toque nos pontos do gráfico para ver detalhes
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 italic text-xs">
                Sem dados suficientes
              </div>
            )}

            <div className="mt-4 text-center border-t border-slate-100/60 pt-2.5">
              <span className="text-xs text-slate-400 font-bold">Desempenho de acertos por área temática</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EVOLUÇÃO E REVISÃO */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
              Evolução e Revisão
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Histórico de estudo & Flashcards</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly Historical Performance */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Desempenho Histórico Mensal</span>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1 mb-4">
                Gráfico de Linhas | Barras de Horas
              </h4>
            </div>

            <div className="h-[240px] flex items-center justify-center">
              {monthlyPerformanceData.length > 0 ? (
                <ResizeContainer height={240}>
                  {(width, height) => (
                    <ChartErrorBoundary>
                      <ComposedChart data={monthlyPerformanceData} width={width} height={height} margin={{ top: 20, right: -10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip formatter={(value: any, name: any, props: any) => {
                          if (name === "Horas Estudadas") {
                            return [`${props.payload.minutes} min (${value}h)`, name];
                          }
                          return [value, name];
                        }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar yAxisId="left" dataKey="hours" name="Horas Estudadas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive={false} />
                        <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Média de Acertos (%)" stroke="#ff9600" strokeWidth={3.5} dot={{ r: 5, fill: '#ff9600', strokeWidth: 0 }} activeDot={{ r: 7 }} isAnimationActive={false} />
                      </ComposedChart>
                    </ChartErrorBoundary>
                  )}
                </ResizeContainer>
              ) : (
                <div className="text-slate-400 italic text-xs">Sem dados suficientes</div>
              )}
            </div>
          </div>

          {/* Flashcards Total vs Revisados */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Flashcards: Total vs Revisados</span>
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mt-1 mb-2">
                Flashcards por Matéria (Total vs Revisados)
              </h4>
              <p className="text-xs text-slate-400 mb-4">Mostrando até 8 disciplinas simultâneas. Role para ver as demais.</p>
            </div>

            {/* Sticky Legend outside the scroll area */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500 mb-3 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#22c55e]" />
                <span>Revisados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#cbd5e1]" />
                <span>Pendente</span>
              </div>
            </div>

            <div className="w-full">
              {flashcardData.length > 0 ? (
                (() => {
                  const chartData = flashcardData.map(item => ({
                    ...item,
                    displayName: item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name,
                    pending: Math.max(0, item.count - item.reviewed)
                  }));

                  // If there are more than 8 items, we enable vertical scrollbar
                  const hasScroll = chartData.length > 8;
                  const innerHeight = Math.max(240, chartData.length * 34);

                  return (
                    <div className={cn("w-full pr-1", hasScroll ? "max-h-[280px] overflow-y-auto custom-scrollbar" : "")}>
                      <ResizeContainer height={innerHeight}>
                        {(width, height) => (
                          <ChartErrorBoundary>
                            <BarChart layout="vertical" data={chartData} width={width} height={height} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                              <YAxis dataKey="displayName" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} width={80} />
                              <Tooltip />
                              <Bar dataKey="reviewed" name="Revisados" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                              <Bar dataKey="pending" name="Pendente" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ChartErrorBoundary>
                        )}
                      </ResizeContainer>
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 italic text-xs h-[240px] flex items-center justify-center">Nenhum flashcard criado ainda.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PerformanceCharts.displayName = 'PerformanceCharts';

export default PerformanceCharts;
