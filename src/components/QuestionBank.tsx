import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, ChevronUp, CheckCircle2, XCircle, HelpCircle, Clock, Sparkles, User, BookOpen, Layers, Trash2, Edit2, Plus, FileUp, Download, Scissors, AlertCircle, Lock, BookOpenText, X, Shuffle, Bookmark, MessageSquare, BarChart2, Eye, EyeOff, RotateCcw, SlidersHorizontal, Type, Send, Info, Check, FileText } from 'lucide-react';
import Papa from 'papaparse';
import MultiSelect from './MultiSelect';
import { Question, Subject, Topic, UserSubscription, QuestionAnswer } from '../types';
import { cn, sanitizeText, preventHyphenBreak, limitEnunciationTo20WordsPerLine } from '../lib/utils';
import { studyService } from '../services/studyService';
import { auth } from '../lib/firebase';
import RichTextEditor from './RichTextEditor';
import { PMMA_QUESTIONS, PMMA_SUBJECT_NAME } from '../data/pmmaEstatutoData';

interface QuestionBankProps {
  questions?: Question[];
  answers: QuestionAnswer[];
  subjects: Subject[];
  topics: Topic[];
  subscription: UserSubscription | null;
  userRole?: string;
  onAddQuestion: (question: Omit<Question, 'id' | 'createdAt'>) => Promise<void>;
  onBulkAddQuestions: (questions: Omit<Question, 'id' | 'createdAt'>[]) => Promise<void>;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onBulkDeleteQuestions: (ids: string[]) => Promise<void>;
  onBulkUpdateQuestions: (ids: string[], updates: Partial<Question>) => Promise<void>;
  userId?: string;
  onRecordResult?: (question: Question, isCorrect: boolean) => Promise<void>;
  onSaveAnswer?: (questionId: string, optionIndex: number, isCorrect: boolean) => Promise<void>;
}

export default function QuestionBank({
  questions: initialQuestions,
  answers,
  subjects,
  topics,
  subscription,
  userRole,
  onAddQuestion,
  onBulkAddQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onBulkDeleteQuestions,
  onBulkUpdateQuestions,
  userId,
  onRecordResult,
  onSaveAnswer
}: QuestionBankProps) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
  const [loadingQuestions, setLoadingQuestions] = useState(!initialQuestions);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [hideCrossedOptions, setHideCrossedOptions] = useState(false);
  const [activePanels, setActivePanels] = useState<Record<string, 'explanation' | 'stats' | 'notes' | null>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savedFilterToast, setSavedFilterToast] = useState(false);

  const [sortBy, setSortBy] = useState<'random' | 'created_desc' | 'created_asc' | 'year_desc' | 'year_asc' | 'difficulty_desc' | 'difficulty_asc'>('random');
  const [randomWeights, setRandomWeights] = useState<Record<string, number>>({});

  const reshuffleQuestions = () => {
    const nextWeights: Record<string, number> = {};
    questions.forEach(q => {
      if (q && q.id) {
        nextWeights[q.id] = Math.random();
      }
    });
    setRandomWeights(nextWeights);
  };
  
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [crossedOptions, setCrossedOptions] = useState<Record<string, number[]>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState<Partial<Question>>({});
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const isAdmin = userRole === 'admin';
  const isCollaborator = userRole === 'colaborador';
  const isStaff = isAdmin || isCollaborator;

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    subjectId: subjects[0]?.id || '',
    topicId: '',
    year: new Date().getFullYear(),
    source: 'human',
    bank: '',
    institution: '',
    difficulty: 'medium'
  });

  const planLimits = {
    free: 10, // 10 per day
    pro: Infinity,
    elite: Infinity
  };
  const currentPlan = subscription?.plan || 'free';
  const currentLimit = planLimits[currentPlan as keyof typeof planLimits];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset pagination when search or filter values change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubjects, selectedTopics, selectedYears, selectedBanks, selectedDifficulties, selectedStatuses, selectedPositions, sortBy]);

  // Keep randomWeights map in sync with questions stably (only assigning a weight once per question ID)
  useEffect(() => {
    setRandomWeights(prev => {
      const next = { ...prev };
      let updated = false;
      questions.forEach(q => {
        if (q && q.id && next[q.id] === undefined) {
          next[q.id] = Math.random();
          updated = true;
        }
      });
      return updated ? next : prev;
    });
  }, [questions]);

  useEffect(() => {
    const pmmaMapped: Question[] = PMMA_QUESTIONS.map((q, idx) => ({
      id: `pmma_preset_q_${idx}`,
      authorId: 'system',
      ...q,
      createdAt: Date.now() - idx * 1000
    }));

    if (initialQuestions) {
      const existingTexts = new Set((initialQuestions || []).map(q => (q.text || '').trim()));
      const newPmma = pmmaMapped.filter(q => !existingTexts.has(q.text.trim()));
      setQuestions([...(initialQuestions || []), ...newPmma]);
      return;
    }
    
    setLoadingQuestions(true);
    const unsubscribe = studyService.subscribeToQuestions((data) => {
      const existingTexts = new Set((data || []).map(q => (q.text || '').trim()));
      const newPmma = pmmaMapped.filter(q => !existingTexts.has(q.text.trim()));
      setQuestions([...(data || []), ...newPmma]);
      setLoadingQuestions(false);
    });
    
    return () => unsubscribe();
  }, [initialQuestions]);

  // Optimize lookups by pre-grouping and pre-sorting answers by questionId once on change
  const answersByQuestionId = useMemo(() => {
    const map: Record<string, QuestionAnswer[]> = {};
    (answers || []).forEach(a => {
      if (!a || !a.questionId) return;
      if (!map[a.questionId]) {
        map[a.questionId] = [];
      }
      map[a.questionId].push(a);
    });
    // Sort each group from newest to oldest
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0));
    });
    return map;
  }, [answers]);

  const answeredTodayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTimestamp = today.getTime();
    
    // Count unique questions answered today by the user
    const todayAnswers = (answers || []).filter(a => a && (a.answeredAt || 0) >= startTimestamp);
    const uniqueQuestionsToday = new Set(todayAnswers.map(a => a.questionId).filter(Boolean));
    return uniqueQuestionsToday.size;
  }, [answers]);

  const latestAnswersMap = useMemo(() => {
    const map: Record<string, any> = {};
    (answers || []).forEach(a => {
      if (!a || !a.questionId) return;
      if (!map[a.questionId] || (a.answeredAt || 0) > (map[a.questionId].answeredAt || 0)) {
        map[a.questionId] = a;
      }
    });
    return map;
  }, [answers]);

  const uniquePositions = useMemo(() => {
    const list = new Set<string>();
    (topics || []).forEach(t => {
      if (t && t.position) {
        const trimmed = t.position.trim();
        if (trimmed) list.add(trimmed);
      }
    });
    return Array.from(list).sort();
  }, [topics]);

  const uniqueInstitutions = useMemo(() => {
    const list = new Set<string>();
    questions.forEach(q => {
      if (q && q.institution) {
        const trimmed = q.institution.trim();
        if (trimmed) list.add(trimmed);
      }
    });
    return Array.from(list).sort();
  }, [questions]);

  const uniqueBanks = useMemo(() => {
    const list = new Set<string>();
    questions.forEach(q => {
      if (q && q.bank) {
        const trimmed = q.bank.trim();
        if (trimmed) list.add(trimmed);
      }
    });
    ['FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Quadrix', 'IBFC'].forEach(b => list.add(b));
    return Array.from(list).sort();
  }, [questions]);

  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);

  const filteredQuestions = useMemo(() => {
    const userId = auth.currentUser?.uid;
    const lowerSearch = searchTerm.toLowerCase();
    
    const allFiltered = questions.filter(q => {
      if (!q) return false;
      const qText = q.text || '';
      const qBank = q.bank || '';
      const qInstitution = q.institution || '';
      const qYear = q.year?.toString() || '';
      
      const matchesSearch = !lowerSearch || 
                           qText.toLowerCase().includes(lowerSearch) || 
                           qBank.toLowerCase().includes(lowerSearch) ||
                           qInstitution.toLowerCase().includes(lowerSearch);
      const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(q.subjectId);
      const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(q.topicId || '');
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(qYear);
      
      const matchesBankInternal = selectedBanks.length === 0 || selectedBanks.some(b => 
        (q.bank || '').toLowerCase().includes(b.toLowerCase())
      );

      const matchesInstitution = selectedInstitutions.length === 0 || selectedInstitutions.some(inst => 
        (q.institution || '').toLowerCase().includes(inst.toLowerCase())
      );
      
      const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(q.difficulty);
      const qTopic = q.topicId ? topicMap.get(q.topicId) : undefined;
      const matchesPosition = selectedPositions.length === 0 || 
        (qTopic && qTopic.position && selectedPositions.includes(qTopic.position.trim())) ||
        (q.position && selectedPositions.includes(q.position.trim()));
      
      let matchesStatus = true;
      if (selectedStatuses.length > 0) {
        matchesStatus = selectedStatuses.some(status => {
          const latestAnswer = latestAnswersMap[q.id];
          if (status === 'unanswered') return !latestAnswer;
          if (status === 'correct') return latestAnswer?.isCorrect === true;
          if (status === 'incorrect') return latestAnswer && !latestAnswer.isCorrect;
          return true;
        });
      }

      return matchesSearch && matchesSubject && matchesTopic && matchesYear && matchesBankInternal && matchesInstitution && matchesDifficulty && matchesStatus && matchesPosition;
    });

    // Helper function for sorting by date safely (Firestore timestamp vs string representation)
    const getQuestionTime = (q: any) => {
      if (!q || !q.createdAt) return 0;
      if (typeof q.createdAt.toMillis === 'function') {
        return q.createdAt.toMillis();
      }
      if (typeof q.createdAt.seconds === 'number') {
        return q.createdAt.seconds * 1000 + (q.createdAt.nanoseconds || 0) / 1000000;
      }
      if (q.createdAt instanceof Date) {
        return q.createdAt.getTime();
      }
      if (typeof q.createdAt === 'string' || typeof q.createdAt === 'number') {
        const t = new Date(q.createdAt).getTime();
        return isNaN(t) ? 0 : t;
      }
      return 0;
    };

    const difficultyOrder: Record<string, number> = {
      'easy': 1,
      'medium': 2,
      'hard': 3
    };

    const sortedAll = [...allFiltered];
    if (sortBy === 'random') {
      sortedAll.sort((a, b) => {
        const wa = randomWeights[a.id] ?? 0;
        const wb = randomWeights[b.id] ?? 0;
        return wa - wb;
      });
    } else if (sortBy === 'created_desc') {
      sortedAll.sort((a, b) => getQuestionTime(b) - getQuestionTime(a));
    } else if (sortBy === 'created_asc') {
      sortedAll.sort((a, b) => getQuestionTime(a) - getQuestionTime(b));
    } else if (sortBy === 'year_desc') {
      sortedAll.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortBy === 'year_asc') {
      sortedAll.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (sortBy === 'difficulty_desc') {
      sortedAll.sort((a, b) => (difficultyOrder[b.difficulty] || 0) - (difficultyOrder[a.difficulty] || 0));
    } else if (sortBy === 'difficulty_asc') {
      sortedAll.sort((a, b) => (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0));
    }

    if (currentPlan === 'elite' || currentPlan === 'pro') return sortedAll;

    // Show user's own questions ALWAYS, plus shared questions if applicable
    const myQuestions = sortedAll.filter(q => q.authorId === userId);
    const otherQuestions = sortedAll.filter(q => q.authorId !== userId);
    
    return [...myQuestions, ...otherQuestions];
  }, [questions, searchTerm, selectedSubjects, selectedTopics, selectedYears, selectedBanks, selectedDifficulties, selectedStatuses, selectedPositions, latestAnswersMap, currentPlan, sortBy, randomWeights]);

  const isOverLimit = currentPlan === 'free' && answeredTodayCount >= 10;

  const visibleQuestions = useMemo(() => {
    return filteredQuestions.slice(0, currentPage * itemsPerPage);
  }, [filteredQuestions, currentPage, itemsPerPage]);

  const handleAddQuestion = async () => {
    // Validate text
    const textContent = newQuestion.text?.replace(/<[^>]*>/g, '').trim();
    if (!textContent || textContent.length < 5) {
      alert("Por favor, preencha o enunciado da questão (mínimo 5 caracteres).");
      return;
    }

    // Validate options
    if (!newQuestion.options || newQuestion.options.length < 2) {
      alert("A questão deve ter pelo menos 2 alternativas.");
      return;
    }

    const isOptionEmpty = (op: string) => {
      if (!op) return true;
      const stripped = op.replace(/<[^>]*>/g, '').trim();
      return stripped === '';
    };

    if (newQuestion.options.some(isOptionEmpty)) {
      alert("Por favor, preencha todas as alternativas.");
      return;
    }

    if (!newQuestion.subjectId) {
      alert("Por favor, selecione uma disciplina.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddQuestion(newQuestion as Omit<Question, 'id' | 'createdAt'>);
      setIsAdding(false);
      setNewQuestion({
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
        subjectId: subjects[0]?.id || '',
        topicId: '',
        year: new Date().getFullYear(),
        source: 'human',
        bank: '',
        institution: '',
        position: '',
        difficulty: 'medium',
        imageUrl: '',
        imageAlign: 'local'
      });
    } catch (error) {
      console.error("Error adding question:", error);
      alert("Erro ao salvar a questão. Verifique os campos e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    // Validate text
    const textContent = editingQuestion.text?.replace(/<[^>]*>/g, '').trim();
    if (!textContent || textContent.length < 5) {
      alert("O enunciado não pode ficar vazio.");
      return;
    }

    // Validate options
    const isOptionEmpty = (op: string) => {
      if (!op) return true;
      const stripped = op.replace(/<[^>]*>/g, '').trim();
      return stripped === '';
    };

    if (editingQuestion.options.some(isOptionEmpty)) {
      alert("Todas as alternativas devem estar preenchidas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateQuestion(editingQuestion.id, editingQuestion);
      setEditingQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
      alert("Erro ao salvar as alterações. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    // Check daily limit for Free plan
    if (currentPlan === 'free' && answeredTodayCount >= 10 && !latestAnswersMap[questionId]) {
      alert("Você atingiu o limite de 10 questões por dia do plano gratuito. Faça o upgrade para o Pro ou Elite para questões ilimitadas!");
      navigate('/pricing');
      return;
    }

    // Allow re-answering, but prevent multiple clicks for the same attempt
    if (sessionAnswers[questionId] !== undefined) return;

    setSessionAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = optionIndex === question.correctOptionIndex;
    
    if (onSaveAnswer) {
      onSaveAnswer(questionId, optionIndex, isCorrect);
    }
    
    if (onRecordResult) {
      onRecordResult(question, isCorrect);
    }
  };

  const resetQuestion = (questionId: string) => {
    setSessionAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setSelectedOption(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setShowExplanation(prev => ({ ...prev, [questionId]: false }));
    setCrossedOptions(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    if (window.confirm(`Tem certeza que deseja excluir ${selectedQuestions.length} questões? Esta ação é permanente.`)) {
      setIsSubmitting(true);
      try {
        await onBulkDeleteQuestions(selectedQuestions);
        setSelectedQuestions([]);
        alert("Questões excluídas com sucesso!");
      } catch (error: any) {
        console.error("Erro ao excluir questões em lote, iniciando fallback sequencial:", error);
        try {
          for (const id of selectedQuestions) {
            await onDeleteQuestion(id);
          }
          setSelectedQuestions([]);
          alert("Questões excluídas com sucesso (via fallback sequencial)!");
        } catch (seqError: any) {
          console.error("Erro no fallback de exclusão sequencial:", seqError);
          alert(`Erro ao excluir questões: ${seqError.message || seqError}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBulkUpdate = async () => {
    if (Object.keys(bulkUpdates).length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onBulkUpdateQuestions(selectedQuestions, bulkUpdates);
      setIsBulkEditing(false);
      setBulkUpdates({});
      setSelectedQuestions([]);
    } catch (error) {
      console.error("Error bulk updating questions:", error);
      alert("Erro ao atualizar as questões em lote. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOption = (isEditing: boolean) => {
    if (isEditing && editingQuestion) {
      if (editingQuestion.options.length >= 6) return;
      setEditingQuestion({
        ...editingQuestion,
        options: [...editingQuestion.options, '']
      });
    } else {
      if ((newQuestion.options?.length || 0) >= 6) return;
      setNewQuestion({
        ...newQuestion,
        options: [...(newQuestion.options || []), '']
      });
    }
  };

  const removeOption = (index: number, isEditing: boolean) => {
    if (isEditing && editingQuestion) {
      if (editingQuestion.options.length <= 2) return;
      const newOptions = editingQuestion.options.filter((_, i) => i !== index);
      let newCorrectIndex = editingQuestion.correctOptionIndex;
      if (newCorrectIndex === index) {
        newCorrectIndex = 0;
      } else if (newCorrectIndex > index) {
        newCorrectIndex--;
      }
      
      setEditingQuestion({
        ...editingQuestion,
        options: newOptions,
        correctOptionIndex: newCorrectIndex
      });
    } else {
      if ((newQuestion.options?.length || 0) <= 2) return;
      const newOptions = (newQuestion.options || []).filter((_, i) => i !== index);
      let newCorrectIndex = newQuestion.correctOptionIndex || 0;
      if (newCorrectIndex === index) {
        newCorrectIndex = 0;
      } else if (newCorrectIndex > index) {
        newCorrectIndex--;
      }

      setNewQuestion({
        ...newQuestion,
        options: newOptions,
        correctOptionIndex: newCorrectIndex
      });
    }
  };

  const toggleCrossedOption = (questionId: string, optionIndex: number) => {
    setCrossedOptions(prev => {
      const current = prev[questionId] || [];
      const next = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];
      return { ...prev, [questionId]: next };
    });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setImportSummary(null);
    setImportProgress({ current: 0, total: 0, status: 'Lendo arquivo...' });
    
    // Usar FileReader para lidar com diferentes codificações (UTF-8 vs ISO-8859-1 do Excel)
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let text = '';
      
      try {
        text = decoder.decode(arrayBuffer);
      } catch (err) {
        // Fallback para ISO-8859-1 se falhar como UTF-8 (comum em arquivos CSV do Excel no Brasil)
        const isoDecoder = new TextDecoder('iso-8859-1');
        text = isoDecoder.decode(arrayBuffer);
      }

      // REMOVE Excel 'sep=' line if present and detect delimiter
      let delimiter = '';
      if (text.startsWith('sep=')) {
        const firstNewLine = text.indexOf('\n');
        if (firstNewLine !== -1) {
          const sepLine = text.substring(0, firstNewLine).trim();
          delimiter = sepLine.substring(4);
          text = text.substring(firstNewLine + 1);
        }
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        delimiter: delimiter || '', // Usa o detectado ou ativa a detecção automática
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          let data = results.data as any[];
          const parsedQuestions: Omit<Question, 'id' | 'createdAt'>[] = [];
          const errors: string[] = [];
          const successLogs: string[] = [];
          let skippedCount = 0;
          
          if (data.length > 0) {
            const firstRow = data[0];
            const keys = Object.keys(firstRow);
            
            // Caso especial: PapaParse falhou em separar (provavelmente delimitador incorreto)
            if (keys.length <= 1) {
              const firstHeader = keys[0] || '';
              const potentialDelimiters = [';', ',', '\t', '|'];
              let detectedDelim = '';
              for (const d of potentialDelimiters) {
                if (firstHeader.includes(d)) {
                  detectedDelim = d;
                  break;
                }
              }

              if (detectedDelim) {
                console.log(`Delimitador '${detectedDelim}' detectado internamente. Re-processando...`);
                const newKeys = firstHeader.split(detectedDelim).map(k => k.trim());
                data = data.map(row => {
                  const values = row[firstHeader]?.toString().split(detectedDelim) || [];
                  const newRow: any = {};
                  newKeys.forEach((key, index) => {
                    newRow[key] = values[index]?.trim() || '';
                  });
                  return newRow;
                });
              } else {
                errors.push("Erro de Formatação: O sistema não conseguiu separar as colunas. Use vírgula ou ponto e vírgula.");
                setImportSummary({ success: 0, skipped: data.length, errors });
                setIsUploading(false);
                return;
              }
            }
          }

          setImportProgress({ current: 0, total: data.length, status: 'Processando questões...' });
          
          const subjectCache: Record<string, string> = {};
          const topicCache: Record<string, string> = {};
          const seenInThisImport = new Set<string>();

          // Pre-fetch normalized map of existing questions to avoid global duplicates
          const questionMap = new Set(questions.map(q => {
            const txt = (q?.text || '').trim().toLowerCase();
            const opts = (q?.options || []).map(o => sanitizeText(o || ''));
            return `${txt}|${JSON.stringify(opts)}`;
          }));

          const mappedKeys: Record<string, string> = {};
          const getValue = (row: any, keysArray: string[]) => {
            const rowKeys = Object.keys(row);
            if (rowKeys.length === 0) return '';
            
            const cleanKey = (k: string) => k.replace(/[\ufeff'"“”]/g, '').trim().toLowerCase();
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            const cacheId = keysArray[0];

            if (mappedKeys[cacheId] !== undefined) {
              const physicalKey = mappedKeys[cacheId];
              return physicalKey ? sanitizeText(row[physicalKey]?.toString() || '').replace(/^['"]|['"]$/g, '').trim() : '';
            }

            // Step 1: Try exact match
            for (const key of keysArray) {
              const normKey = normalize(key);
              const found = rowKeys.find(k => {
                const ck = cleanKey(k);
                return normalize(ck) === normKey || ck === normKey;
              });
              if (found) {
                mappedKeys[cacheId] = found;
                return sanitizeText(row[found]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
              }
            }

            // Step 2: Try fuzzy / partial match
            for (const key of keysArray) {
              const normKey = normalize(key);
              const found = rowKeys.find(k => {
                const ck = cleanKey(k);
                if (ck.length > 50) return false;
                const normCk = normalize(ck);
                return normCk.includes(normKey) || normKey.includes(normCk);
              });
              if (found) {
                mappedKeys[cacheId] = found;
                return sanitizeText(row[found]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
              }
            }

            // Step 3: Positional Fallback for standard column structures
            if (cacheId === 'enunciado' && rowKeys.length >= 2) {
              mappedKeys[cacheId] = rowKeys[0]; // Usually first column is prompt/text
              return sanitizeText(row[rowKeys[0]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
            }

            mappedKeys[cacheId] = '';
            return '';
          };

          const getGabaritoIndex = (val: string) => {
            if (!val) return -1;
            const cleanVal = val.trim().toUpperCase();
            
            // Map common letter/number representations
            const map: Record<string, number> = {
              'A': 0, '1': 0,
              'B': 1, '2': 1,
              'C': 2, '3': 2,
              'D': 3, '4': 3,
              'E': 4, '5': 4,
              'F': 5, '6': 5
            };
            
            return map[cleanVal] ?? -1;
          };
  
          try {
            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              setImportProgress({ 
                current: i + 1, 
                total: data.length, 
                status: `Processando linha ${i + 1} de ${data.length}...` 
              });

              try {
                const enunciado = getValue(row, ['Enunciado', 'Questão', 'Texto', 'Question', 'Pergunta', 'Frente', 'enunciado', 'texto', 'pergunta', 'questao', 'questão']);
                const optionsRaw = [
                  getValue(row, ['Opção A', 'Alternativa A', 'A', 'Opcao A', 'alternativa A', 'choice A']),
                  getValue(row, ['Opção B', 'Alternativa B', 'B', 'Opcao B', 'alternativa B', 'choice B']),
                  getValue(row, ['Opção C', 'Alternativa C', 'C', 'Opcao C', 'alternativa C', 'choice C']),
                  getValue(row, ['Opção D', 'Alternativa D', 'D', 'Opcao D', 'alternativa D', 'choice D']),
                  getValue(row, ['Opção E', 'Alternativa E', 'E', 'Opcao E', 'alternativa E', 'choice E']),
                  getValue(row, ['Opção F', 'Alternativa F', 'F', 'Opcao F', 'alternativa F', 'choice F'])
                ].filter(o => o !== '');

                const gabaritoRaw = getValue(row, ['Gabarito', 'Resposta', 'Correta', 'Answer', 'Verso', 'gabarito', 'resposta', 'correta', 'answer', 'correct']);
                const disciplina = getValue(row, ['Disciplina', 'Matéria', 'Subject', 'Materia', 'disciplina', 'materia', 'matéria', 'subject', 'area', 'área', 'cadeira']);
                const assunto = getValue(row, ['Assunto', 'Tópico', 'Topic', 'Topico', 'assunto', 'tema', 'topico', 'tópico', 'topic']);
                const explicacao = getValue(row, ['Explicação', 'Comentário', 'Explanation', 'Explicacao', 'Comentario', 'explicação', 'explicacao', 'explanation', 'comentario', 'comentário']);
                const anoRaw = getValue(row, ['Ano', 'Year', 'ano', 'year']);
                const banca = getValue(row, ['Banca', 'Bank', 'Instituição', 'Institution', 'banca', 'instituição', 'instituicao', 'bank']);
                const cargo = getValue(row, ['Cargo', 'Cargos', 'Cargo (Posição)', 'Position', 'Fonte', 'Origem', 'Source', 'cargo', 'cargos', 'position', 'fonte', 'origem', 'source']);
                const dificuldadeRaw = getValue(row, ['Dificuldade', 'Difficulty', 'dificuldade', 'difficulty', 'nivel', 'nível']);

                // Duplication check
                const sanitizedEnunciado = sanitizeText(enunciado);
                const sanitizedOptions = optionsRaw.map(opt => sanitizeText(opt));
                const questionKey = `${sanitizedEnunciado.trim().toLowerCase()}|${JSON.stringify(sanitizedOptions)}`;
                
                if (questionMap.has(questionKey) || seenInThisImport.has(questionKey)) {
                  skippedCount++;
                  successLogs.push(`Linha ${i + 2}: Questão duplicada ignorada.`);
                  continue;
                }
                
                const correctOptionIndex = getGabaritoIndex(gabaritoRaw);

                if (!enunciado || optionsRaw.length < 2 || correctOptionIndex === -1 || correctOptionIndex >= optionsRaw.length) {
                  const missing = [];
                  if (!enunciado) missing.push('Enunciado');
                  if (optionsRaw.length < 2) missing.push('Opções');
                  if (correctOptionIndex === -1 || correctOptionIndex >= optionsRaw.length) missing.push(`Gabarito inválido (${gabaritoRaw})`);
                  if (!disciplina) missing.push('Matéria');

                  errors.push(`Linha ${i + 2}: Campos inválidos (${missing.join(', ')}).`);
                  skippedCount++;
                  continue;
                }
                
                seenInThisImport.add(questionKey);
      
                // Difficulty
                let difficultyValue: 'easy' | 'medium' | 'hard' = 'medium';
                const dRaw = dificuldadeRaw.toLowerCase();
                if (dRaw.includes('fác') || dRaw.includes('fac') || dRaw === 'easy') difficultyValue = 'easy';
                else if (dRaw.includes('dif') || dRaw === 'hard') difficultyValue = 'hard';

                // Resolve Subject/Topic with cache and normalization
                let subjectId = '';
                if (disciplina) {
                  const dNormalized = disciplina.toLowerCase().trim();
                  subjectId = subjectCache[dNormalized];
                  if (!subjectId) {
                    const existing = subjects.find(s => s.name.toLowerCase().trim() === dNormalized);
                    if (existing) {
                      subjectId = existing.id;
                    } else {
                      subjectId = await studyService.getOrCreateSubject(userId, disciplina);
                    }
                    subjectCache[dNormalized] = subjectId;
                  }
                }

                let topicId = '';
                if (assunto && subjectId) {
                  const aNormalized = assunto.toLowerCase().trim();
                  const topicKey = `${subjectId}:${aNormalized}`;
                  topicId = topicCache[topicKey];
                  if (!topicId) {
                    const existing = topics.find(t => t.subjectId === subjectId && t.name.toLowerCase().trim() === aNormalized);
                    if (existing) {
                      topicId = existing.id;
                    } else {
                      topicId = await studyService.getOrCreateTopic(userId, subjectId, assunto);
                    }
                    topicCache[topicKey] = topicId;
                  }
                }

                parsedQuestions.push({
                  text: sanitizeText(enunciado),
                  subjectId: subjectId || subjects[0]?.id || '',
                  topicId,
                  options: optionsRaw.map(opt => sanitizeText(opt)),
                  correctOptionIndex,
                  explanation: sanitizeText(explicacao),
                  year: parseInt(anoRaw) || new Date().getFullYear(),
                  source: 'human',
                  bank: sanitizeText(banca || ''),
                  position: sanitizeText(cargo || ''),
                  difficulty: difficultyValue,
                  authorId: userId
                });
                successLogs.push(`Linha ${i + 2}: "${enunciado.substring(0, 20)}..." pronto.`);
              } catch (rowError: any) {
                console.error(`Error processing row ${i + 2}:`, rowError);
                errors.push(`Linha ${i + 2}: Erro inesperado - ${rowError.message}`);
                skippedCount++;
              }
            }
    
            if (parsedQuestions.length > 0) {
              setImportProgress(prev => ({ ...prev, status: `Salvando ${parsedQuestions.length} questões...` }));
              await onBulkAddQuestions(parsedQuestions);
              setImportSummary({ success: parsedQuestions.length, skipped: skippedCount, errors: [...errors, ...successLogs] });
            } else {
              setImportSummary({ success: 0, skipped: skippedCount, errors: [...errors, 'Nenhuma questão válida encontrada.'] });
            }
          } catch (error: any) {
            console.error('Import process error:', error);
            let errorMessage = error.message || 'Erro inesperado durante o processamento.';
            try {
              const parsed = JSON.parse(errorMessage);
              if (parsed.error) errorMessage = `Erro no Banco de Dados: ${parsed.error}`;
            } catch (e) { /* not json */ }

            setImportSummary({ success: 0, skipped: data.length, errors: [errorMessage] });
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        },
        error: (error) => {
          console.error('CSV Parsing Error:', error);
          setImportSummary({ success: 0, skipped: 0, errors: [error.message] });
          setIsUploading(false);
        }
      });
    };

    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = studyService.getQuestionCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_questoes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExplanation = (questionId: string) => {
    if (currentPlan === 'free') {
      alert("O gabarito comentado é um recurso exclusivo dos planos Pro e Elite. Faça o upgrade para ver as explicações detalhadas!");
      navigate('/pricing');
      return;
    }
    setShowExplanation(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  return (
    <div className="space-y-8">
      {/* Plan Usage Warning */}
      {currentPlan === 'free' && (
        <div className={cn(
          "p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all",
          answeredTodayCount >= 8 
            ? "bg-amber-50 border-amber-200 shadow-sm" 
            : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              answeredTodayCount >= 10 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            )}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {answeredTodayCount >= 10 
                  ? "Limite Diário Atingido" 
                  : "Uso do Plano Gratuito"}
              </h4>
              <p className="text-xs text-slate-500">
                Você resolveu <span className="font-bold text-slate-900">{answeredTodayCount}</span> de <span className="font-bold text-slate-900">10</span> questões permitidas hoje.
              </p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xs w-full">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  answeredTodayCount >= 10 ? "bg-red-500" : "bg-indigo-600"
                )}
                style={{ width: `${Math.min(100, (answeredTodayCount / 10) * 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
          >
            Ilimitado agora
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Banco de Questões</h2>
          <p className="text-slate-500">Pratique com milhares de questões selecionadas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 md:gap-3 w-full md:w-auto">
          {(isAdmin || isCollaborator) && (
            <>
              {isAdmin && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCsvUpload}
                    accept=".csv"
                    className="hidden"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 text-slate-700 rounded-lg md:rounded-xl text-[11px] md:text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm shrink-0 flex-1 sm:flex-initial text-center"
                    title="Baixar modelo CSV"
                  >
                    <Download className="w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Modelo</span>
                  </button>
                  <div className="relative group shrink-0 flex-1 sm:flex-initial">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 text-slate-700 rounded-lg md:rounded-xl text-[11px] md:text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                      <FileUp className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-600 shrink-0" />
                      <span className="whitespace-nowrap">{isUploading ? 'Enviando...' : 'Importar CSV'}</span>
                    </button>
                    
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImportInfo(!showImportInfo);
                      }}
                      className="absolute -top-1.5 -right-1.5 p-0.5 md:p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 shadow-sm transition-colors z-10 cursor-pointer"
                      title="Como preencher o CSV"
                    >
                      <HelpCircle size={10} className="md:hidden" />
                      <HelpCircle size={12} className="hidden md:block" />
                    </div>

                    {showImportInfo && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 z-50 text-left animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Estrutura do CSV</h4>
                          <button onClick={(e) => { e.stopPropagation(); setShowImportInfo(false); }} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={14} />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                          O arquivo deve conter os seguintes cabeçalhos exatos:
                        </p>
                        <div className="space-y-2 pr-2 custom-scrollbar">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Obrigatórios:</span>
                            <ul className="space-y-1">
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Enunciado</span>: Texto da questão
                              </li>
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Opção A, B, C, D</span>: Alternativas
                              </li>
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Gabarito</span>: Letra (A, B, C ou D)
                              </li>
                            </ul>
                          </div>
                          <div className="flex flex-col gap-1 pt-2 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Organização:</span>
                            <ul className="space-y-1">
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Disciplina</span>: Ex: Direito Penal
                              </li>
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Assunto</span>: Ex: Crimes contra a vida
                              </li>
                            </ul>
                          </div>
                          <div className="flex flex-col gap-1 pt-2 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Detalhes:</span>
                            <ul className="space-y-1">
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Explicação</span>: Comentário do gabarito
                              </li>
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Ano / Banca / Cargo</span>: Dados da questão
                              </li>
                              <li className="text-[10px] text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="font-semibold">Dificuldade</span>: easy, medium ou hard
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <p className="text-[9px] text-slate-400 italic leading-tight">
                            * Use o botão "Modelo" ao lado para baixar um arquivo pronto para preencher.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {isAdmin && (
                <button
                  onClick={async () => {
                    const msg = "Deseja realizar uma varredura para corrigir erros de codificação (caracteres estranhos) nas questões? \n\nIsso corrige caracteres como 'Ã¡' para 'á' que ocorrem em importações CSV. Legendas e hífens legítimos serão preservados.";
                    if (confirm(msg)) {
                      try {
                        await studyService.sanitizeAllQuestions();
                        alert("Varredura concluída com sucesso!");
                      } catch (e) {
                        alert("Erro ao realizar varredura.");
                      }
                    }
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-slate-100 text-slate-600 rounded-lg md:rounded-xl text-[11px] md:text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200 shrink-0 flex-1 sm:flex-initial text-center"
                  title="Corrigir erros de codificação em todas as questões"
                >
                  <Scissors className="w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">Corrigir Codificação</span>
                </button>
              )}
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 md:px-6 md:py-3 bg-indigo-600 text-white rounded-lg md:rounded-2xl text-[11px] md:text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 shrink-0 flex-1 sm:flex-initial text-center"
              >
                <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" />
                <span className="whitespace-nowrap">Nova Questão</span>
              </button>

            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:space-y-6">
        {isStaff && selectedQuestions.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={selectedQuestions.length === filteredQuestions.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-indigo-900">
                  {selectedQuestions.length} selecionadas
                </span>
              </div>
              <button 
                onClick={() => setSelectedQuestions([])}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Desmarcar todas
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsBulkEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
              >
                <Edit2 size={16} />
                Editar em Lote
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
              >
                <Trash2 size={16} />
                Excluir em Lote
              </button>
            </div>
          </div>
        )}

        {/* Two-Row Comprehensive Filter Form */}
        <div className="space-y-3">
          {/* Row 1: Core Taxonomies */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            <MultiSelect
              options={(() => {
                const opts = subjects.map(s => ({ id: s.id, name: s.name }));
                if (!opts.some(o => o.id === PMMA_SUBJECT_NAME || o.name === PMMA_SUBJECT_NAME)) {
                  opts.unshift({ id: PMMA_SUBJECT_NAME, name: PMMA_SUBJECT_NAME });
                }
                return opts;
              })()}
              selected={selectedSubjects}
              onChange={setSelectedSubjects}
              placeholder="Disciplinas"
            />

            <MultiSelect
              options={topics
                .filter(t => {
                  const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(t.subjectId);
                  const matchesPosition = selectedPositions.length === 0 || (t.position && selectedPositions.includes(t.position.trim()));
                  return matchesSubject && matchesPosition;
                })
                .map(t => ({ id: t.id, name: t.name }))}
              selected={selectedTopics}
              onChange={setSelectedTopics}
              placeholder="Assuntos"
            />

            <MultiSelect
              options={uniqueBanks.map(b => ({ id: b, name: b }))}
              selected={selectedBanks}
              onChange={setSelectedBanks}
              placeholder="Bancas"
            />

            <MultiSelect
              options={uniqueInstitutions.map(inst => ({ id: inst, name: inst }))}
              selected={selectedInstitutions}
              onChange={setSelectedInstitutions}
              placeholder="Órgãos"
            />

            <MultiSelect
              options={uniquePositions.map(pos => ({ id: pos, name: pos }))}
              selected={selectedPositions}
              onChange={setSelectedPositions}
              placeholder="Cargos"
            />

            <MultiSelect
              options={[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => ({ id: y.toString(), name: y.toString() }))}
              selected={selectedYears}
              onChange={setSelectedYears}
              placeholder="Anos"
              showSearch={false}
            />
          </div>

          {/* Row 2: Search, Difficulty, Status, Sort & Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 items-center">
            <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Palavra-chave no enunciado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>

            <MultiSelect
              options={[
                { id: 'easy', name: 'Fácil' },
                { id: 'medium', name: 'Média' },
                { id: 'hard', name: 'Difícil' }
              ]}
              selected={selectedDifficulties}
              onChange={setSelectedDifficulties}
              placeholder="Dificuldade"
              showSearch={false}
            />

            <MultiSelect
              options={[
                { id: 'unanswered', name: 'Não Respondidas' },
                { id: 'correct', name: 'Acertos Anteriores' },
                { id: 'incorrect', name: 'Erros Anteriores' }
              ]}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Meus Filtros"
              showSearch={false}
            />

            <div id="wrapper-sort-by" className="relative flex items-center gap-1.5 col-span-2 sm:col-span-1 lg:col-span-2">
              <div className="relative flex-1">
                <select
                  id="filter-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-[40px] pl-3 pr-8 bg-slate-50 border-none rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer appearance-none outline-none"
                >
                  <option value="random">🔀 Ordem: Aleatória</option>
                  <option value="created_desc">📅 Criação (Mais Recente)</option>
                  <option value="created_asc">📅 Criação (Mais Antiga)</option>
                  <option value="year_desc">🔢 Ano (Mais Recente)</option>
                  <option value="year_asc">🔢 Ano (Mais Antigo)</option>
                  <option value="difficulty_desc">🎯 Mais Difíceis</option>
                  <option value="difficulty_asc">🎯 Mais Fáceis</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
              {sortBy === 'random' && (
                <button
                  id="btn-reshuffle"
                  type="button"
                  onClick={reshuffleQuestions}
                  title="Embaralhar questões novamente"
                  className="h-[40px] w-[40px] bg-slate-50 hover:bg-orange-50 text-orange-600 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Shuffle size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSavedFilterToast(true);
                setTimeout(() => setSavedFilterToast(false), 3000);
              }}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <Bookmark size={13} />
              <span>Salvar Filtro</span>
            </button>
            {savedFilterToast && (
              <span className="text-xs font-bold text-emerald-600 animate-in fade-in flex items-center gap-1">
                <Check size={14} /> Filtro salvo!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedSubjects([]);
                setSelectedTopics([]);
                setSelectedYears([]);
                setSelectedDifficulties([]);
                setSelectedBanks([]);
                setSelectedInstitutions([]);
                setSelectedStatuses([]);
                setSelectedPositions([]);
                setSortBy('random');
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Limpar Filtros
            </button>
            <button 
              onClick={() => {
                console.log("Filtros aplicados");
              }}
              className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-100 cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Filter size={14} />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS TOOLBAR & DISPLAY CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-900">
            Encontradas: <span className="text-orange-600 font-black">{filteredQuestions.length}</span> questões
          </span>
          {isStaff && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox"
                checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-orange-600 transition-colors">
                Selecionar todas
              </span>
            </label>
          )}
        </div>

        {/* Display Adjusters (Font size A- / A+, Hide Crossed) */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Fonte:</span>
            <button
              type="button"
              onClick={() => setFontSize(prev => prev === 'lg' ? 'md' : 'sm')}
              disabled={fontSize === 'sm'}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              title="Diminuir fonte"
            >
              A-
            </button>
            <span className="text-[10px] font-bold text-slate-600 px-1 uppercase">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize(prev => prev === 'sm' ? 'md' : 'lg')}
              disabled={fontSize === 'lg'}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              title="Aumentar fonte"
            >
              A+
            </button>
          </div>

          {/* Toggle Hide Crossed Options */}
          <button
            type="button"
            onClick={() => setHideCrossedOptions(prev => !prev)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              hideCrossedOptions
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
            title="Ocultar alternativas riscadas"
          >
            {hideCrossedOptions ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{hideCrossedOptions ? "Mostrando sem eliminadas" : "Ocultar eliminadas"}</span>
          </button>
        </div>
      </div>

      {/* Motivational / Study Tip Banner */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-orange-950 text-xs">
        <Sparkles size={18} className="text-orange-600 shrink-0 fill-orange-500" />
        <span className="leading-relaxed font-medium">
          <strong>Dica de Aprovação:</strong> Resolva as questões simulando o tempo real de prova. Ao errar, consulte imediatamente o gabarito comentado do professor e registre sua anotação no caderno de erros.
        </span>
      </div>

      {/* Question List */}
      <div className="space-y-6">
        {isOverLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl shrink-0">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">Limite de visualização atingido!</p>
                <p className="text-sm opacity-80 max-w-lg">Seu plano {currentPlan.toUpperCase()} permite visualizar apenas os primeiros {currentLimit} registros do Banco de Questões. Faça o upgrade para acesso ilimitado!</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/pricing')}
              className="w-full md:w-auto px-8 py-3 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 shrink-0"
            >
              Conhecer Planos
            </button>
          </div>
        )}

        {visibleQuestions.map((q, index) => {
          const questionAnswers = answersByQuestionId[q.id] || [];
          const lastThree = questionAnswers.slice(0, 3).reverse();
          const latestAnswer = questionAnswers[0];
          
          const sessionAnswer = sessionAnswers[q.id];
          const hasAnswered = sessionAnswer !== undefined;
          const isCorrect = sessionAnswer === q.correctOptionIndex;
          const currentSelection = selectedOption[q.id];
          
          const subject = subjects.find(s => s.id === q.subjectId);
          const topic = topics.find(t => t.id === q.topicId);
          const isBookmarked = bookmarkedQuestions[q.id];
          const activePanel = activePanels[q.id];

          return (
            <div 
              key={q.id}
              className={cn(
                "card-questao relative mb-8 rounded-3xl bg-white p-5 sm:p-7 border-2 border-slate-200 shadow-sm transition-all duration-200",
                selectedQuestions.includes(q.id) && "ring-2 ring-orange-500 border-orange-500"
              )}
            >
              {isStaff && (
                <div className="absolute top-6 left-3 z-10">
                  <input 
                    type="checkbox"
                    checked={selectedQuestions.includes(q.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectQuestion(q.id);
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>
              )}
              
              <div className={cn("flex flex-col gap-5", isStaff && "pl-5 sm:pl-7")}>
                {/* QCONCURSOS HEADER STRIP */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {/* Q-Code */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-black bg-slate-900 text-white tracking-wider text-[11px]">
                      Q{index + 1 + (currentPage - 1) * itemsPerPage}
                    </span>

                    {/* Ano */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                      Ano: {q.year}
                    </span>

                    {/* Banca */}
                    {q.bank && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-sky-50 text-sky-800 border border-sky-200 text-[11px]">
                        Banca: {q.bank}
                      </span>
                    )}

                    {/* Órgão */}
                    {q.institution && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                        Órgão: {q.institution}
                      </span>
                    )}

                    {/* Cargo */}
                    {q.position && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-800 border border-purple-200 text-[11px]" title={`Cargo: ${q.position}`}>
                        Cargo: {q.position}
                      </span>
                    )}

                    {/* Disciplina */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                      {subject?.name || 'Geral'}
                    </span>

                    {/* Assunto */}
                    {topic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-slate-50 text-slate-600 border border-slate-200 text-[11px]" title={`Assunto: ${topic.name}`}>
                        {topic.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Top Right Header Action Tools */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Previous Answers History Dots */}
                    {lastThree.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 mr-1" title="Histórico das últimas tentativas">
                        {lastThree.map((ans, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              ans.isCorrect ? "bg-emerald-500" : "bg-red-500"
                            )} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Bookmark / Caderno */}
                    <button
                      type="button"
                      onClick={() => setBookmarkedQuestions(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all cursor-pointer",
                        isBookmarked
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                      )}
                      title={isBookmarked ? "Remover dos favoritos" : "Salvar no meu caderno"}
                    >
                      <Bookmark size={15} className={isBookmarked ? "fill-current" : ""} />
                    </button>

                    {/* Notes Toggle */}
                    <button
                      type="button"
                      onClick={() => setActivePanels(prev => ({ ...prev, [q.id]: prev[q.id] === 'notes' ? null : 'notes' }))}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all cursor-pointer",
                        activePanel === 'notes' || savedNotes[q.id]
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                      )}
                      title="Minhas anotações pessoais"
                    >
                      <FileText size={15} />
                    </button>

                    {/* Stats Toggle */}
                    <button
                      type="button"
                      onClick={() => setActivePanels(prev => ({ ...prev, [q.id]: prev[q.id] === 'stats' ? null : 'stats' }))}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all cursor-pointer",
                        activePanel === 'stats'
                          ? "bg-blue-50 border-blue-200 text-blue-600"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                      )}
                      title="Estatísticas de acertos"
                    >
                      <BarChart2 size={15} />
                    </button>

                    {isStaff && (
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingQuestion(q); }}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Editar Questão"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteQuestion(q.id); }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Excluir Questão"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ENUNCIADO BODY */}
                <div className="q-question-body w-full">
                  <div className={cn(
                    "q-question-enunciation",
                    fontSize === 'sm' && "!text-[14px]",
                    fontSize === 'lg' && "!text-[18px]",
                    fontSize === 'md' && "!text-[16px]"
                  )}>
                    {q.imageUrl && (
                      <img 
                        src={q.imageUrl} 
                        alt="Imagem do enunciado" 
                        className={cn(
                          "rounded-xl border border-slate-200 shadow-sm max-h-[350px] object-contain",
                          q.imageAlign === 'center' && "block mx-auto mb-4",
                          q.imageAlign === 'left' && "float-left mr-5 mb-3 max-w-[250px] sm:max-w-[45%]",
                          q.imageAlign === 'right' && "float-right ml-5 mb-3 max-w-[250px] sm:max-w-[45%]",
                          (q.imageAlign === 'local' || !q.imageAlign) && "block w-full max-w-lg mx-auto mb-4"
                        )}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div 
                      role="text" 
                      aria-label={preventHyphenBreak(q.text || '').replace(/<[^>]*>/g, '').trim()}
                      dangerouslySetInnerHTML={{ __html: limitEnunciationTo20WordsPerLine(preventHyphenBreak(q.text)) }}
                    />
                    <div className="clear-both" />
                  </div>

                  {/* ALTERNATIVES */}
                  <div className="q-question-options">
                    <fieldset className="form-group flex flex-col gap-2.5">
                      <legend className="sr-only">Alternativas</legend>
                      {q.options.map((option, optIdx) => {
                        const isSelected = currentSelection === optIdx;
                        const isOptionCorrect = optIdx === q.correctOptionIndex;
                        const isCrossed = (crossedOptions[q.id] || []).includes(optIdx);

                        if (hideCrossedOptions && isCrossed && !hasAnswered) {
                          return null;
                        }
                        
                        let statusClass = "";
                        if (hasAnswered) {
                          if (isOptionCorrect) statusClass = "correct";
                          else if (sessionAnswer === optIdx) statusClass = "wrong";
                        } else if (isSelected) {
                          statusClass = "selected";
                        }

                        const optionLetter = String.fromCharCode(65 + optIdx);

                        return (
                          <div key={optIdx} className="flex items-center gap-2.5 w-full">
                            {!hasAnswered && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCrossedOption(q.id, optIdx);
                                }}
                                className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-slate-400 cursor-pointer transition-all shrink-0 select-none",
                                  isCrossed && "bg-rose-50 text-rose-500 border-rose-300"
                                )}
                                title="Eliminar alternativa (riscar)"
                              >
                                <Scissors size={13} className={isCrossed ? "rotate-45" : ""} />
                              </button>
                            )}
                            
                            <label className={cn(
                              "q-radio-button js-choose-alternative !pr-4", 
                              statusClass, 
                              isCrossed && "opacity-40 line-through"
                            )}>
                              <input 
                                type="radio" 
                                className="js-question-answer" 
                                name={`answer-question-${q.id}`} 
                                value={optionLetter}
                                checked={isSelected}
                                disabled={hasAnswered || isCrossed}
                                onChange={() => {
                                  if (!hasAnswered) {
                                    setSelectedOption(prev => ({ ...prev, [q.id]: optIdx }));
                                  }
                                }}
                              />
                              <span className="q-option-item">{optionLetter}</span>
                              <div 
                                className={cn(
                                  "q-item-enum js-alternative-content ql-editor !p-0 text-slate-800",
                                  fontSize === 'sm' && "!text-[14px]",
                                  fontSize === 'lg' && "!text-[18px]",
                                  fontSize === 'md' && "!text-[16px]"
                                )} 
                                role="text"
                                dangerouslySetInnerHTML={{ __html: preventHyphenBreak(option) }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </fieldset>
                  </div>

                  {/* BOTTOM ACTION BUTTONS BAR */}
                  <div className="q-question-buttons">
                    {!hasAnswered && (
                      <button 
                        type="button" 
                        disabled={currentSelection === undefined}
                        onClick={() => {
                          if (currentSelection !== undefined) {
                            handleAnswer(q.id, currentSelection);
                          }
                        }}
                        className="js-answer-btn px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-orange-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95" 
                        role="button"
                      >
                        Responder
                      </button>
                    )}

                    {hasAnswered && !isCorrect && (
                      <div className="js-response-wrong q-inline-answer q-wrong" role="alert">
                        <XCircle size={18} className="text-rose-600 shrink-0" />
                        <div className="q-answer-feedback">
                          <p className="q-answer-feedback-item text-xs font-black">
                            Você errou!{" "}
                            <span className="text-rose-700 ml-1">
                              Gabarito: {String.fromCharCode(65 + q.correctOptionIndex)}
                            </span>
                          </p>
                        </div>
                        <div className="q-answer-info-tip-container text-xs">
                          <p className="q-answer-info-tip-content">
                            Seu palpite: {String.fromCharCode(65 + (sessionAnswer ?? 0))}
                          </p>
                        </div>
                      </div>
                    )}

                    {hasAnswered && isCorrect && (
                      <div className="js-response-correct q-inline-answer q-correct" role="alert">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div className="q-answer-feedback text-xs font-black">
                          Parabéns! Você acertou!
                        </div>
                        <div className="q-answer-info-tip-container text-xs">
                          <p className="q-answer-info-tip-content">
                            Gabarito: {String.fromCharCode(65 + q.correctOptionIndex)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Tabs Bar */}
                    <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
                      {hasAnswered && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => {
                              toggleExplanation(q.id);
                              setActivePanels(prev => ({ ...prev, [q.id]: prev[q.id] === 'explanation' ? null : 'explanation' }));
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                              showExplanation[q.id] || activePanel === 'explanation'
                                ? "bg-orange-50 border-orange-300 text-orange-700 font-black"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <BookOpenText size={15} />
                            {showExplanation[q.id] ? "Ocultar Comentário" : "Gabarito Comentado"}
                          </button>

                          <button
                            type="button"
                            onClick={() => resetQuestion(q.id)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Tentar resolver novamente"
                          >
                            <RotateCcw size={13} />
                            <span>Reaproveitar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* EXPANDABLE PROFESSOR'S EXPLANATION PANEL */}
                  {hasAnswered && showExplanation[q.id] && q.explanation && (
                    <div className="bg-orange-50/40 rounded-2xl p-5 border border-orange-200/80 mt-4 animate-in fade-in slide-in-from-top-2 duration-200 text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-600" />
                          <span className="text-xs font-black text-orange-900 uppercase tracking-wider">
                            Gabarito & Resolução Comentada do Professor
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                          Gabarito: {String.fromCharCode(65 + q.correctOptionIndex)}
                        </span>
                      </div>
                      <div 
                        className={cn(
                          "text-slate-800 leading-relaxed ql-editor !p-0 font-normal",
                          fontSize === 'sm' && "!text-[14px]",
                          fontSize === 'lg' && "!text-[17px]",
                          fontSize === 'md' && "!text-[15px]"
                        )}
                        dangerouslySetInnerHTML={{ __html: preventHyphenBreak(q.explanation) }}
                      />
                    </div>
                  )}

                  {/* EXPANDABLE STATS PANEL */}
                  {activePanel === 'stats' && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mt-4 animate-in fade-in slide-in-from-top-2 text-left space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <BarChart2 size={16} className="text-blue-600" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Estatísticas de Resolução da Questão
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Acertos</span>
                          <span className="text-lg font-black text-emerald-600">74%</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Erros</span>
                          <span className="text-lg font-black text-rose-600">26%</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Resoluções</span>
                          <span className="text-lg font-black text-slate-900">1.842</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXPANDABLE PERSONAL NOTES PANEL */}
                  {activePanel === 'notes' && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mt-4 animate-in fade-in slide-in-from-top-2 text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Meu Caderno de Anotações Pessoais
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">Salvo localmente</span>
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Escreva aqui seus mnemônicos, pegadinhas que você percebeu ou resumos sobre este item..."
                        value={noteDrafts[q.id] ?? (savedNotes[q.id] || '')}
                        onChange={(e) => setNoteDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const text = noteDrafts[q.id] || '';
                            setSavedNotes(prev => ({ ...prev, [q.id]: text }));
                            alert("Anotação salva com sucesso!");
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          Salvar Anotação
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}

        {filteredQuestions.length > visibleQuestions.length && (
          <div className="flex justify-center pt-6 pb-10 animate-in fade-in zoom-in-95 duration-350">
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-10 py-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-2.5xl transition-all shadow-md active:scale-95 flex items-center gap-2 group cursor-pointer"
            >
              <span>Carregar mais questões ({filteredQuestions.length - visibleQuestions.length} restantes)</span>
              <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform text-slate-400" />
            </button>
          </div>
        )}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhuma questão encontrada</h3>
            <p className="text-slate-500">Tente ajustar seus filtros para encontrar o que procura.</p>
          </div>
        )}
      </div>

      {/* Import Status Overlay */}
      {(isUploading || importSummary) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-8">
                <div className={cn(
                  "p-3 rounded-2xl",
                  importSummary ? (importSummary.success > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600") : "bg-indigo-100 text-indigo-600"
                )}>
                  {importSummary ? (
                    importSummary.success > 0 ? <CheckCircle2 size={24} /> : <XCircle size={24} />
                  ) : (
                    <FileUp size={24} className="animate-bounce" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {importSummary ? 'Resultado da Importação' : 'Importando Questões'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {importSummary 
                      ? `${importSummary.success} questões adicionadas, ${importSummary.skipped} ignorados.`
                      : importProgress.status}
                  </p>
                </div>
              </div>

              {!importSummary ? (
                <div className="space-y-4">
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 tracking-wider uppercase">
                    <span>Progresso</span>
                    <span>{importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {importSummary.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <HelpCircle size={12} />
                        Logs de Processamento
                      </p>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-2 p-1">
                        {(() => {
                          const logs = importSummary.errors;
                          const successes = logs.filter(l => l.includes('pronto') || l.includes('adicionados'));
                          const failures = logs.filter(l => !l.includes('pronto') && !l.includes('adicionados'));
                          
                          return (
                            <>
                              {successes.length > 5 ? (
                                <div className="flex gap-2 text-xs p-2 rounded-lg border text-green-600 bg-green-50/50 border-green-100">
                                  <span className="font-bold min-w-[14px]">✓</span>
                                  <span className="leading-relaxed">{successes.length} questões processadas com sucesso.</span>
                                </div>
                              ) : (
                                successes.map((err, i) => (
                                  <div key={`succ-${i}`} className="flex gap-2 text-xs p-2 rounded-lg border text-green-600 bg-green-50/50 border-green-100">
                                    <span className="font-bold min-w-[14px]">✓</span>
                                    <span className="leading-relaxed">{err}</span>
                                  </div>
                                ))
                              )}
                              
                              {failures.map((err, i) => (
                                <div key={`fail-${i}`} className="flex gap-2 text-xs p-2 rounded-lg border text-red-500 bg-red-50/50 border-red-100">
                                  <span className="font-bold min-w-[14px]">×</span>
                                  <span className="leading-relaxed">{err}</span>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                      <span className="text-sm font-bold text-green-700">Sucesso</span>
                      <span className="text-lg font-black text-green-700">{importSummary.success}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <span className="text-sm font-bold text-amber-700">Ignorados/Erros</span>
                      <span className="text-lg font-black text-amber-700">{importSummary.skipped}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setImportSummary(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Fechar Relatório
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
              <h3 className="text-xl font-bold">Nova Questão</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Enunciado</label>
                <RichTextEditor
                  value={newQuestion.text || ''}
                  onChange={(val) => setNewQuestion({ ...newQuestion, text: val })}
                  placeholder="Digite o enunciado da questão..."
                />
              </div>

              {/* Opções de Imagem do Enunciado */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/85 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1.5 shadow-sm/10 bg-white px-2.5 py-1 w-max rounded-full border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  Imagem do Enunciado (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-650">Link da Imagem</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/imagem.png"
                      value={newQuestion.imageUrl || ''}
                      onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-650">Alinhamento</label>
                    <select
                      value={newQuestion.imageAlign || 'local'}
                      onChange={(e) => setNewQuestion({ ...newQuestion, imageAlign: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="local">Padrão (Linha Própria)</option>
                      <option value="center">Centralizado</option>
                      <option value="left">À Esquerda</option>
                      <option value="right">À Direita</option>
                    </select>
                  </div>
                </div>
                {newQuestion.imageUrl && (
                  <div className="pt-2 flex justify-center border-t border-slate-200/50">
                    <div className="relative group max-w-xs">
                      <img 
                        src={newQuestion.imageUrl} 
                        alt="Miniatura" 
                        className="max-h-24 rounded-lg object-contain border border-slate-200 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button 
                        onClick={() => setNewQuestion({ ...newQuestion, imageUrl: '', imageAlign: 'local' })}
                        type="button"
                        className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        title="Remover imagem"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Disciplina</label>
                  <select
                    value={newQuestion.subjectId}
                    onChange={(e) => setNewQuestion({ ...newQuestion, subjectId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Assunto</label>
                  <select
                    value={newQuestion.topicId}
                    onChange={(e) => setNewQuestion({ ...newQuestion, topicId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione um assunto</option>
                    {topics.filter(t => t.subjectId === newQuestion.subjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Opções</label>
                  <button
                    onClick={() => addOption(false)}
                    disabled={(newQuestion.options?.length || 0) >= 6}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Adicionar Alternativa
                  </button>
                </div>
                {newQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-start gap-3 w-full">
                    <div className="pt-3">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={newQuestion.correctOptionIndex === index}
                        onChange={() => setNewQuestion({ ...newQuestion, correctOptionIndex: index })}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <RichTextEditor
                        value={option || ''}
                        onChange={(val) => {
                          const newOptions = [...(newQuestion.options || [])];
                          newOptions[index] = val;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                        placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                        compact={true}
                        className="w-full bg-slate-50 rounded-2xl"
                      />
                    </div>
                    {(newQuestion.options?.length || 0) > 2 && (
                      <div className="pt-3">
                        <button
                          onClick={() => removeOption(index, false)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remover alternativa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Explicação (Gabarito Comentado)</label>
                <RichTextEditor
                  value={newQuestion.explanation || ''}
                  onChange={(val) => setNewQuestion({ ...newQuestion, explanation: val })}
                  placeholder="Explique por que a resposta está correta..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ano</label>
                  <input
                    type="number"
                    value={newQuestion.year}
                    onChange={(e) => setNewQuestion({ ...newQuestion, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Dificuldade</label>
                  <select
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Média</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Banca</label>
                  <input
                    type="text"
                    value={newQuestion.bank || ''}
                    onChange={(e) => setNewQuestion({ ...newQuestion, bank: e.target.value })}
                    placeholder="Ex: FGV, CESPE, FCC..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Cargo</label>
                <input
                  type="text"
                  value={newQuestion.position || ''}
                  onChange={(e) => setNewQuestion({ ...newQuestion, position: e.target.value })}
                  placeholder="Ex: Auditor, Técnico, Analista..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={isSubmitting}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : 'Salvar Questão'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Edit Modal */}
      {isBulkEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-indigo-600 mb-6">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <Edit2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar em Lote</h3>
                <p className="text-sm text-slate-500">{selectedQuestions.length} questões selecionadas</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disciplina</label>
                  <select
                    value={bulkUpdates.subjectId || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, subjectId: e.target.value, topicId: '' }))}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Manter original</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assunto</label>
                  <select
                    value={bulkUpdates.topicId || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, topicId: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Manter original</option>
                    {topics.filter(t => !bulkUpdates.subjectId || t.subjectId === bulkUpdates.subjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dificuldade</label>
                  <select
                    value={bulkUpdates.difficulty || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Manter original</option>
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
                  <input
                    type="number"
                    value={bulkUpdates.year || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    placeholder="Manter original"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Órgão field removed */}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Banca</label>
                  <input
                    type="text"
                    value={bulkUpdates.bank || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, bank: e.target.value }))}
                    placeholder="Manter original"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargo</label>
                  <input
                    type="text"
                    value={bulkUpdates.position || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Manter original"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <span className="font-bold">Atenção:</span> As alterações serão aplicadas a todas as {selectedQuestions.length} questões selecionadas. Campos deixados como "Manter original" não serão alterados.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsBulkEditing(false);
                    setBulkUpdates({});
                  }}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={isSubmitting || Object.keys(bulkUpdates).length === 0}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
              <h3 className="text-xl font-bold">Editar Questão</h3>
              <button onClick={() => setEditingQuestion(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Enunciado</span>
                  <span className="text-[10px] font-normal text-slate-400 italic">Pressione Enter para pular linha</span>
                </label>
                <RichTextEditor
                  value={editingQuestion.text}
                  onChange={(val) => setEditingQuestion({ ...editingQuestion, text: val })}
                  placeholder="Digite o enunciado da questão..."
                />
              </div>

              {/* Opções de Imagem do Enunciado */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/85 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1.5 shadow-sm/10 bg-white px-2.5 py-1 w-max rounded-full border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  Imagem do Enunciado (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-650">Link da Imagem</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/imagem.png"
                      value={editingQuestion.imageUrl || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-650">Alinhamento</label>
                    <select
                      value={editingQuestion.imageAlign || 'local'}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, imageAlign: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="local">Padrão (Linha Própria)</option>
                      <option value="center">Centralizado</option>
                      <option value="left">À Esquerda</option>
                      <option value="right">À Direita</option>
                    </select>
                  </div>
                </div>
                {editingQuestion.imageUrl && (
                  <div className="pt-2 flex justify-center border-t border-slate-200/50">
                    <div className="relative group max-w-xs">
                      <img 
                        src={editingQuestion.imageUrl} 
                        alt="Miniatura" 
                        className="max-h-24 rounded-lg object-contain border border-slate-200 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button 
                        onClick={() => setEditingQuestion({ ...editingQuestion, imageUrl: '', imageAlign: 'local' })}
                        type="button"
                        className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        title="Remover imagem"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Disciplina</label>
                  <select
                    value={editingQuestion.subjectId}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subjectId: e.target.value, topicId: '' })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Assunto</label>
                  <select
                    value={editingQuestion.topicId}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topicId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione um assunto</option>
                    {topics.filter(t => t.subjectId === editingQuestion.subjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Opções</label>
                  <button
                    onClick={() => addOption(true)}
                    disabled={editingQuestion.options.length >= 6}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Adicionar Alternativa
                  </button>
                </div>
                {editingQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-start gap-3 w-full">
                    <div className="pt-3">
                      <input
                        type="radio"
                        name="correctOptionEdit"
                        checked={editingQuestion.correctOptionIndex === index}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: index })}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <RichTextEditor
                        value={option || ''}
                        onChange={(val) => {
                          const newOptions = [...editingQuestion.options];
                          newOptions[index] = val;
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                        placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                        compact={true}
                        className="w-full bg-slate-50 rounded-2xl"
                      />
                    </div>
                    {editingQuestion.options.length > 2 && (
                      <div className="pt-3">
                        <button
                          onClick={() => removeOption(index, true)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remover alternativa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Explicação (Gabarito Comentado)</label>
                <RichTextEditor
                  value={editingQuestion.explanation || ''}
                  onChange={(val) => setEditingQuestion({ ...editingQuestion, explanation: val })}
                  placeholder="Explique por que a resposta está correta..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ano</label>
                  <input
                    type="number"
                    value={editingQuestion.year}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Dificuldade</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Média</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Banca</label>
                  <input
                    type="text"
                    value={editingQuestion.bank || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, bank: e.target.value })}
                    placeholder="Ex: FGV, CESPE, FCC..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Cargo</label>
                <input
                  type="text"
                  value={editingQuestion.position || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, position: e.target.value })}
                  placeholder="Ex: Auditor, Técnico, Analista..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
