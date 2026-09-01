import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Edit2, Play, Download, Sparkles, Layers, AlertCircle, ChevronRight, ChevronLeft, ChevronDown, Image as ImageIcon, PlusCircle, X, Upload, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Lock, ShoppingBag, Scissors, FolderOpen, ArrowLeft, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Topic, Flashcard, UserSubscription } from '../types';
import { cn, sanitizeText, preventHyphenBreak } from '../lib/utils';
import { studyService } from '../services/studyService';
import FlashcardReview from './FlashcardReview';
import Papa from 'papaparse';
import MultiSelect from './MultiSelect';
import { auth } from '../lib/firebase';
import RichTextEditor from './RichTextEditor';
import { PMMA_FLASHCARDS, PMMA_SUBJECT_NAME } from '../data/pmmaEstatutoData';

export function formatTextQuotesAndExamples(html: any): string {
  if (html === null || html === undefined) return '';
  
  let strVal = '';
  try {
    strVal = String(html);
  } catch (e) {
    return '';
  }

  if (!strVal) return '';
  let formatted = strVal;
  
  // Substitui parágrafos inteiros iniciados e terminados por aspas por blockquotes elegantes
  formatted = formatted.replace(
    /<p>(\s*[“"'«（])(.*?)([”"'»）]\s*)<\/p>/gi, 
    '<blockquote>$2</blockquote>'
  );
  
  return preventHyphenBreak(formatted);
}

interface FlashcardListProps {
  flashcards: Flashcard[];
  allFlashcards?: Flashcard[];
  subjects: Subject[];
  allSubjects?: Subject[];
  topics: Topic[];
  allTopics?: Topic[];
  subscription: UserSubscription | null;
  onAdd: (card: Partial<Flashcard>) => Promise<void>;
  onAddMany: (cards: Partial<Flashcard>[]) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Flashcard>) => void;
  onReview: (card: Flashcard, quality: number) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkUpdate?: (ids: string[], updates: Partial<Flashcard>) => Promise<void>;
  initialSubjectId?: string | null;
  initialTopicId?: string | null;
  onClearAI?: () => void;
  userRole?: string;
}

export default function FlashcardList({ 
  flashcards, allFlashcards: initialAllFlashcards = [], subjects, allSubjects = [], topics, allTopics = [], subscription, onAdd, onAddMany, onDelete, onUpdate, onReview, onBulkDelete, onBulkUpdate,
  initialSubjectId, initialTopicId, onClearAI, userRole
}: FlashcardListProps) {
  const navigate = useNavigate();
  const [activeSource, setActiveSource] = useState<'mine' | 'bank'>('mine');
  const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>(initialAllFlashcards);
  const [bankLimit, setBankLimit] = useState(500);
  const [loadingAllCards, setLoadingAllCards] = useState(false);
  const [openBankSubjectId, setOpenBankSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSource !== 'bank') return;
    
    setLoadingAllCards(true);
    const unsubscribe = studyService.subscribeToAllFlashcards((data) => {
      setAllFlashcards(data);
      setLoadingAllCards(false);
    }, bankLimit);
    return () => unsubscribe();
  }, [activeSource, bankLimit]);

  const handleLoadMore = () => {
    setBankLimit(prev => prev + 30);
  };
  const [isAdding, setIsAdding] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const isAdmin = userRole === 'admin';
  const isCollaborator = userRole === 'colaborador';
  const isStaff = isAdmin || isCollaborator;

  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [cardLimits, setCardLimits] = useState<Record<string, number>>({});

  const getSubjectCardLimit = (subjectId: string) => {
    return cardLimits[subjectId] || 6;
  };

  const handleShowMoreCards = (subjectId: string, totalCount: number) => {
    setCardLimits(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || 6) + 12
    }));
  };
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjectId ? [initialSubjectId] : []);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState<Partial<Flashcard>>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'nextReviewDate' | 'subject' | 'front' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjects([initialSubjectId]);
    }
  }, [initialSubjectId]);
  
  const planLimits = {
    free: 50,
    pro: 1000,
    elite: Infinity
  };
  const currentPlan = subscription?.plan || 'free';
  const currentLimit = planLimits[currentPlan as keyof typeof planLimits];
  const isOverLimit = flashcards.length > currentLimit;
  const cardLimitReached = flashcards.length >= currentLimit;

  const [newCard, setNewCard] = useState({
    front: '',
    back: '',
    explanation: '',
    imageUrl: '',
    caption: '',
    subjectId: subjects[0]?.id || '',
    topicId: '',
  });

  const visibleFlashcards = useMemo(() => {
    let sourceCards = activeSource === 'mine' ? flashcards : allFlashcards;
    
    // Always include PMMA_FLASHCARDS preset cards if not already present
    const pmmaMapped: Flashcard[] = PMMA_FLASHCARDS.map((f, idx) => ({
      id: `pmma_preset_fc_${idx}`,
      uid: 'system',
      interval: 0,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewDate: Date.now(),
      ...f,
      createdAt: Date.now() - idx * 1000
    }));
    const existingFronts = new Set((sourceCards || []).map(c => (c.front || '').trim().toLowerCase()));
    const newPmmaFc = pmmaMapped.filter(f => !existingFronts.has(f.front.trim().toLowerCase()));
    sourceCards = [...(sourceCards || []), ...newPmmaFc];

    if (activeSource === 'bank') {
      // Filter duplicates by content in the Bank view to keep it clean and optimized
      const uniqueCards: Flashcard[] = [];
      const seen = new Set<string>();
      
      sourceCards.forEach(card => {
        const frontText = card && card.front ? String(card.front).trim().toLowerCase() : '';
        const backText = card && card.back ? String(card.back).trim().toLowerCase() : '';
        const key = `${frontText}|${backText}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCards.push(card);
        }
      });
      sourceCards = uniqueCards;
    }

    if (currentPlan === 'elite' || activeSource === 'bank') return sourceCards;
    return sourceCards;
  }, [flashcards, allFlashcards, activeSource, currentPlan, currentLimit]);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []); // Only once per mount to keep it stable during concurrent rendering pass

  const dueCards = useMemo(() => {
    if (activeSource === 'bank') return [];
    return visibleFlashcards.filter(card => card && card.nextReviewDate && card.nextReviewDate <= now);
  }, [visibleFlashcards, now, activeSource]);

  const subjectMap = useMemo(() => new Map((subjects || []).map(s => [s.id, s.name || ''])), [subjects]);

  const filteredCards = useMemo(() => {
    const filtered = visibleFlashcards.filter(card => {
      if (!card) return false;
      const front = card.front || '';
      const back = card.back || '';
      const matchesSearch = front.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           back.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = card.subjectId && (selectedSubjects.length === 0 || selectedSubjects.includes(card.subjectId));
      const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(card.topicId || '');
      return matchesSearch && matchesSubject && matchesTopic;
    });

    return [...filtered].sort((a, b) => {
      if (!a || !b) return 0;
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        case 'nextReviewDate':
          comparison = (a.nextReviewDate || 0) - (b.nextReviewDate || 0);
          break;
        case 'subject':
          const subjectA = (a.subjectId ? subjectMap.get(a.subjectId) : '') || '';
          const subjectB = (b.subjectId ? subjectMap.get(b.subjectId) : '') || '';
          comparison = subjectA.localeCompare(subjectB);
          break;
        case 'front':
          comparison = (a.front || '').localeCompare(b.front || '');
          break;
        case 'status':
          const isDueA = (Number(a.nextReviewDate) || 0) <= now ? 1 : 0;
          const isDueB = (Number(b.nextReviewDate) || 0) <= now ? 1 : 0;
          comparison = isDueB - isDueA; // Due cards first
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [visibleFlashcards, searchTerm, selectedSubjects, selectedTopics, sortBy, sortOrder, subjectMap, now]);

  const groupedCards = useMemo(() => {
    const groups: { [key: string]: Flashcard[] } = {};
    filteredCards.forEach(card => {
      if (card && card.subjectId) {
        if (!groups[card.subjectId]) {
          groups[card.subjectId] = [];
        }
        groups[card.subjectId].push(card);
      }
    });
    return groups;
  }, [filteredCards]);

  const isAlreadyImported = useCallback((bankCard: Flashcard) => {
    if (!bankCard || !bankCard.front || !bankCard.back) return false;
    const bFront = String(bankCard.front).trim().toLowerCase();
    const bBack = String(bankCard.back).trim().toLowerCase();
    return flashcards.some(c => {
      if (!c || !c.front || !c.back) return false;
      return String(c.front).trim().toLowerCase() === bFront && 
             String(c.back).trim().toLowerCase() === bBack;
    });
  }, [flashcards]);

  const bankSubjectCardsSummary = useMemo(() => {
    if (activeSource !== 'bank') return [];

    const map = new Map<string, {
      subject: Subject | undefined;
      subjectId: string;
      totalCards: Flashcard[];
      unimportedCards: Flashcard[];
      importedCount: number;
    }>();

    visibleFlashcards.forEach(card => {
      if (!card || !card.subjectId) return;

      const front = card.front || '';
      const back = card.back || '';
      const matchesSearch = !searchTerm || 
        front.toLowerCase().includes(searchTerm.toLowerCase()) || 
        back.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubjectFilter = selectedSubjects.length === 0 || selectedSubjects.includes(card.subjectId);

      if (!matchesSearch || !matchesSubjectFilter) return;

      let entry = map.get(card.subjectId);
      if (!entry) {
        const sub = allSubjects.find(s => s.id === card.subjectId);
        entry = {
          subject: sub,
          subjectId: card.subjectId,
          totalCards: [],
          unimportedCards: [],
          importedCount: 0
        };
        map.set(card.subjectId, entry);
      }

      entry.totalCards.push(card);
      if (isAlreadyImported(card)) {
        entry.importedCount++;
      } else {
        entry.unimportedCards.push(card);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.subject?.name || 'Sem Matéria';
      const nameB = b.subject?.name || 'Sem Matéria';
      return nameA.localeCompare(nameB);
    });
  }, [activeSource, visibleFlashcards, allSubjects, flashcards, searchTerm, selectedSubjects, isAlreadyImported]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await studyService.uploadImage(file, 'flashcards');
      setNewCard(prev => ({ ...prev, imageUrl: url }));
    } catch (error: any) {
      console.error("Upload failed:", error);
      setUploadError(error.message || "Falha no upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCard.front && newCard.back && newCard.subjectId) {
      try {
        await onAdd(newCard);
        setIsAdding(false);
        setNewCard({
          front: '',
          back: '',
          explanation: '',
          imageUrl: '',
          caption: '',
          subjectId: selectedSubjects.length === 1 ? selectedSubjects[0] : (subjects[0]?.id || ''),
          topicId: '',
        });
      } catch (error: any) {
        console.error("Error adding card:", error);
        alert(error.message || "Erro ao adicionar card.");
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedCards.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleBulkUpdate = async () => {
    if (selectedCards.length === 0 || !onBulkUpdate) return;
    try {
      await onBulkUpdate(selectedCards, bulkUpdates);
      setIsBulkEditing(false);
      setBulkUpdates({});
      setSelectedCards([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error updating cards:", error);
    }
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    try {
      await onUpdate(editingCard.id, editingCard);
      if (activeSource === 'bank') {
        setAllFlashcards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...editingCard } : c));
      }
      setEditingCard(null);
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };

  const confirmBulkDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (cardToDelete) {
        await onDelete(cardToDelete);
        setCardToDelete(null);
      } else if (onBulkDelete) {
        await onBulkDelete(selectedCards);
      } else {
        // Fallback to sequential if onBulkDelete is not provided
        for (const id of selectedCards) {
          await onDelete(id);
        }
      }
      setSelectedCards([]);
      setIsSelectionMode(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error in delete operation:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCardSelection = (id: string) => {
    setSelectedCards(prev => 
      prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
    );
  };

  const handleSelectAllBank = () => {
    const unimportedBankCards = allFlashcards.filter(card => !isAlreadyImported(card));
    const unimportedIds = unimportedBankCards.map(c => c.id);
    
    if (selectedCards.length === unimportedIds.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(unimportedIds);
    }
  };

  const handleSelectSubjectBank = (subjectId: string) => {
    const unimportedCardsInSubject = allFlashcards.filter(card => 
      card.subjectId === subjectId && !isAlreadyImported(card)
    );
    const subjectCardIds = unimportedCardsInSubject.map(c => c.id);
    
    setSelectedCards(prev => {
      const allSelected = subjectCardIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !subjectCardIds.includes(id));
      } else {
        const next = [...prev];
        subjectCardIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      }
    });
  };

  const handleSelectSubjectMine = (subjectId: string) => {
    const cardsInSubject = flashcards.filter(card => card.subjectId === subjectId);
    const subjectCardIds = cardsInSubject.map(c => c.id);
    
    setSelectedCards(prev => {
      const allSelected = subjectCardIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !subjectCardIds.includes(id));
      } else {
        const next = [...prev];
        subjectCardIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      }
    });
  };

  const handleBankImport = async (card: Flashcard) => {
    if (cardLimitReached) {
      alert("Você atingiu o limite de flashcards do seu plano. Faça o upgrade para continuar!");
      return;
    }

    if (isAlreadyImported(card)) {
      alert("Este flashcard já está em sua coleção!");
      return;
    }
    
    try {
      setImportProgress({ current: 0, total: 1, status: 'Preparando importação...' });
      setIsImporting(true);
      setImportSummary(null);
      
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const bankSubject = allSubjects.find(s => s.id === card.subjectId);
      if (!bankSubject) throw new Error("Matéria original não encontrada.");
      
      const sName = bankSubject.name;
      const sNorm = sName.toLowerCase().trim();
      
      let subjectId = '';
      const existingSubject = subjects.find(s => s.name.toLowerCase().trim() === sNorm);
      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        subjectId = await studyService.getOrCreateSubject(currentUid, sName, bankSubject.color, bankSubject.icon);
      }

      let topicId = '';
      if (card.topicId) {
        const bankTopic = allTopics.find(t => t.id === card.topicId);
        if (bankTopic) {
          const tName = bankTopic.name;
          const tNorm = tName.toLowerCase().trim();
          const existingTopic = topics.find(t => t.subjectId === subjectId && t.name.toLowerCase().trim() === tNorm);
          if (existingTopic) {
            topicId = existingTopic.id;
          } else {
            topicId = await studyService.getOrCreateTopic(currentUid, subjectId, tName);
          }
        }
      }

      await onAdd({
        front: card.front,
        back: card.back,
        explanation: card.explanation,
        imageUrl: card.imageUrl,
        caption: card.caption,
        subjectId,
        topicId
      });
      
      setIsImporting(false);
      alert("Flashcard adicionado à sua coleção!");
    } catch (err: any) {
      setIsImporting(false);
      alert(err.message || "Erro ao adicionar.");
    }
  };

  const handleBulkBankImport = async () => {
    if (selectedCards.length === 0) return;
    
    let cardsToImport = (activeSource === 'mine' ? flashcards : allFlashcards).filter(c => selectedCards.includes(c.id));
    if (cardsToImport.length === 0) return;

    // Filter out already imported cards to be safe
    const actualNewCards = cardsToImport.filter(c => !isAlreadyImported(c));
    const alreadyImportedCount = cardsToImport.length - actualNewCards.length;

    if (actualNewCards.length === 0) {
      alert("Todos os cards selecionados já estão em sua coleção!");
      setSelectedCards([]);
      setIsSelectionMode(false);
      return;
    }

    if (flashcards.length + actualNewCards.length > currentLimit) {
      alert(`Opa! Importar esses ${actualNewCards.length} cards ultrapassaria seu limite de ${currentLimit} cards do plano atual.`);
      return;
    }

    setIsImporting(true);
    setImportSummary(null);
    setImportProgress({ current: 0, total: actualNewCards.length, status: 'Iniciando importação em lote...' });

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const importedCards: Partial<Flashcard>[] = [];
    const errors: string[] = [];
    const successLogs: string[] = [];
    let skipped = alreadyImportedCount;
    
    const subjectCache: Record<string, string> = {};
    const topicCache: Record<string, string> = {};

    try {
      for (let i = 0; i < actualNewCards.length; i++) {
        const card = actualNewCards[i];
        setImportProgress({ current: i + 1, total: actualNewCards.length, status: `Processando card ${i + 1} de ${actualNewCards.length}...` });
        
        try {
          const bankSubject = allSubjects.find(s => s.id === card.subjectId);
          if (!bankSubject) throw new Error("Matéria não encontrada");
          
          const sName = bankSubject.name;
          const sNorm = sName.toLowerCase().trim();
          
          let subjectId = subjectCache[sNorm];
          if (!subjectId) {
            const existing = subjects.find(s => s.name.toLowerCase().trim() === sNorm);
            if (existing) {
              subjectId = existing.id;
            } else {
              subjectId = await studyService.getOrCreateSubject(currentUid, sName, bankSubject.color, bankSubject.icon);
            }
            subjectCache[sNorm] = subjectId;
          }

          let topicId = '';
          if (card.topicId) {
            const bankTopic = allTopics.find(t => t.id === card.topicId);
            if (bankTopic) {
              const tName = bankTopic.name;
              const tNorm = tName.toLowerCase().trim();
              const topicKey = `${subjectId}:${tNorm}`;
              topicId = topicCache[topicKey];
              if (!topicId) {
                const existing = topics.find(t => t.subjectId === subjectId && t.name.toLowerCase().trim() === tNorm);
                if (existing) {
                  topicId = existing.id;
                } else {
                  topicId = await studyService.getOrCreateTopic(currentUid, subjectId, tName);
                }
                topicCache[topicKey] = topicId;
              }
            }
          }

          importedCards.push({
            front: card.front,
            back: card.back,
            explanation: card.explanation,
            imageUrl: card.imageUrl,
            caption: card.caption,
            subjectId,
            topicId,
            isPublic: false // Users always import as private
          });
          successLogs.push(`Card ${i + 1}: Pronto para salvar.`);
        } catch (e: any) {
          errors.push(`Card ${i + 1}: Erro - ${e.message}`);
          skipped++;
        }
      }

      if (importedCards.length > 0) {
        setImportProgress(prev => ({ ...prev, status: `Salvando ${importedCards.length} cards...` }));
        await onAddMany(importedCards);
        
        if (alreadyImportedCount > 0) {
          successLogs.push(`${alreadyImportedCount} cards já existiam e foram pulados.`);
        }

        setImportSummary({
          success: importedCards.length,
          skipped,
          errors: [...errors, ...successLogs]
        });
      } else {
        setImportSummary({ success: 0, skipped, errors });
      }
    } catch (error: any) {
      console.error("Bulk import error:", error);
      setImportSummary({ success: 0, skipped: actualNewCards.length, errors: [error.message] });
    } finally {
      setIsImporting(false);
      setSelectedCards([]);
      setIsSelectionMode(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Frente', 'Verso', 'Explicação', 'Matéria', 'Tópico', 'Próxima Revisão'];
    const rows = flashcards.map(card => {
      const subject = subjects.find(s => s.id === card.subjectId)?.name || '';
      const topic = topics.find(t => t.id === card.topicId)?.name || '';
      const nextReview = new Date(card.nextReviewDate).toLocaleDateString();
      return [
        `"${card.front.replace(/"/g, '""')}"`,
        `"${card.back.replace(/"/g, '""')}"`,
        `"${(card.explanation || '').replace(/"/g, '""')}"`,
        `"${subject}"`,
        `"${topic}"`,
        `"${nextReview}"`
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([`sep=;\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flashcards_edutrack_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const template = studyService.getFlashcardCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_flashcards.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsImporting(true);
    setImportSummary(null);
    setImportProgress({ current: 0, total: 0, status: 'Processando arquivo CSV...' });

    const mappedKeys: Record<string, string> = {};
    const getValue = (row: any, keysArray: string[]) => {
      const rowKeys = Object.keys(row);
      if (rowKeys.length === 0) return '';
      
      const cleanKey = (k: string) => k.replace(/[\ufeff'"“”]/g, '').trim().toLowerCase();
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const cacheId = keysArray[0]; // e.g. 'frente', 'verso', 'materia'

      if (mappedKeys[cacheId] !== undefined) {
        const physicalKey = mappedKeys[cacheId];
        return physicalKey ? sanitizeText(row[physicalKey]?.toString() || '').replace(/^['"]:|['"]$/g, '').trim() : '';
      }

      // Step 1: Try exact match of cleaned headers
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
          if (ck.length > 50) return false; // Prevent matching long content body
          const normCk = normalize(ck);
          return normCk.includes(normKey) || normKey.includes(normCk);
        });
        if (found) {
          mappedKeys[cacheId] = found;
          return sanitizeText(row[found]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
        }
      }

      // Step 3: Positional / Index-based mapping fallback
      if (cacheId === 'frente' && rowKeys.length >= 2) {
        mappedKeys[cacheId] = rowKeys[0];
        return sanitizeText(row[rowKeys[0]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
      }
      if (cacheId === 'verso' && rowKeys.length >= 2) {
        mappedKeys[cacheId] = rowKeys[1];
        return sanitizeText(row[rowKeys[1]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
      }
      if (cacheId === 'materia') {
        if (rowKeys.length >= 4) {
          mappedKeys[cacheId] = rowKeys[3];
          return sanitizeText(row[rowKeys[3]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
        }
      }
      if (cacheId === 'explicação') {
        if (rowKeys.length >= 3) {
          mappedKeys[cacheId] = rowKeys[2];
          return sanitizeText(row[rowKeys[2]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
        }
      }
      if (cacheId === 'topico') {
        if (rowKeys.length >= 5) {
          mappedKeys[cacheId] = rowKeys[4];
          return sanitizeText(row[rowKeys[4]]?.toString() || '').replace(/^['"]|['"]$/g, '').trim();
        }
      }

      mappedKeys[cacheId] = '';
      return '';
    };

    // Use FileReader to handle encoding issues
    const reader = new FileReader();
    reader.onload = (event) => {
      console.log("CSV file loaded into memory.");
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let text = '';
      
      try {
        text = decoder.decode(arrayBuffer);
        console.log("Decoded text as UTF-8");
      } catch (err) {
        console.log("UTF-8 decoding failed, falling back to ISO-8859-1");
        const isoDecoder = new TextDecoder('iso-8859-1');
        text = isoDecoder.decode(arrayBuffer);
      }

      // Strip BOM character if present
      text = text.replace(/^\uFEFF/, '').trim();

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

      if (!delimiter) {
        // Safe-detect common delimiters on the first line
        const testLine = text.split(/[\r\n]+/)[0] || '';
        const delimitersToTest = [';', ',', '\t', '|'];
        let bestDelim = '';
        let maxCount = 0;
        for (const delim of delimitersToTest) {
          const count = (testLine.match(new RegExp('\\' + delim, 'g')) || []).length;
          if (count > maxCount) {
            maxCount = count;
            bestDelim = delim;
          }
        }
        if (bestDelim) {
          delimiter = bestDelim;
          console.log("Safe auto-detected delimiter on first line:", delimiter);
        }
      }

      console.log("Starting PapaParse with delimiter:", delimiter || "auto");
      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        delimiter: delimiter || '', 
        transformHeader: (header) => header.replace(/[\ufeff'"“”]/g, '').trim(),
        complete: async (results) => {
          console.log("PapaParse complete. Rows found:", results.data.length);
          let data = results.data as any[];
          const cardsToImport: Partial<Flashcard>[] = [];
          const errors: string[] = [];
          const successLogs: string[] = [];
          let skipped = 0;
          
          if (data.length === 0) {
            setImportSummary({ success: 0, skipped: 0, errors: ["O arquivo CSV parece estar vazio ou não contém cabeçalhos válidos."] });
            setIsImporting(false);
            return;
          }

          const firstRow = data[0];
          const keys = Object.keys(firstRow);
          
          // Se detectarmos apenas uma coluna, pode ser que o separador esteja errado no CSV do usuário
          // Tentaremos processar mesmo assim, pois o getValue lidará com buscas parciais se possível,
          // mas idealmente avisamos se estiver vazio.
          if (keys.length === 0) {
            setImportSummary({ success: 0, skipped: 0, errors: ["O arquivo CSV não contém colunas detectáveis."] });
            setIsImporting(false);
            return;
          }

          // Caso especial: Se tudo estiver em uma coluna só, o PapaParse pode ter falhado em separar.
          if (keys.length === 1) {
            console.log("Detectada apenas uma coluna. Tentando extrair delimitador interno...");
            const firstHeader = keys[0];
            const potentialDelimiters = [';', ',', '|', '\t'];
            let detectedDelim = '';
            
            for (const d of potentialDelimiters) {
              if (firstHeader.includes(d)) {
                detectedDelim = d;
                break;
              }
            }

            if (detectedDelim) {
              console.log(`Delimitador '${detectedDelim}' detectado dentro da coluna única. Re-processando dados...`);
              // Transformar os dados para que as chaves sejam as partes do cabeçalho original e limpas de aspas
              const newKeys = firstHeader.split(detectedDelim).map(k => k.replace(/[\ufeff'"“”]/g, '').trim());
              const newData = data.map(row => {
                const values = row[firstHeader]?.toString().split(detectedDelim) || [];
                const newRow: any = {};
                newKeys.forEach((key, index) => {
                  newRow[key] = values[index]?.toString().replace(/^['"]|['"]$/g, '').trim() || '';
                });
                return newRow;
              });
              
              // Atualizar referências para o loop de processamento
              // @ts-ignore
              data = newData;
            }
          }

          setImportProgress({ current: 0, total: data.length, status: 'Analisando registros...' });
          
      // Check for duplication against existing collection before adding to the import list
      const isDuplicate = (front: string, back: string, sId: string) => {
        if (!front || !back) return false;
        const f = String(front).trim().toLowerCase();
        const b = String(back).trim().toLowerCase();
        return flashcards.some(c => 
          c && c.front && c.back &&
          String(c.front).trim().toLowerCase() === f && 
          String(c.back).trim().toLowerCase() === b && 
          c.subjectId === sId
        );
      };

      const subjectCache: Record<string, string> = {};
      const topicCache: Record<string, string> = {};
      const seenInThisImport = new Set<string>();

      try {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) throw new Error('Usuário não autenticado.');

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2; // +1 header, +1 index
          setImportProgress({ 
            current: i + 1, 
            total: data.length, 
            status: `Processando linha ${rowNum}...` 
          });

          const front = getValue(row, ['frente', 'front', 'pergunta', 'question', 'enunciado', 'pergunta/conceito', 'texto', 'texto da frente']);
          const back = getValue(row, ['verso', 'back', 'resposta', 'answer', 'gabarito', 'verso/definição', 'verso/definicao', 'resposta do verso', 'definicao', 'definição']);
          let subjectName = getValue(row, ['materia', 'matéria', 'subject', 'disciplina', 'matéria/disciplina', 'materia/disciplina', 'cadeira', 'área', 'area', 'campo']);
          const topicName = getValue(row, ['topico', 'tópico', 'topic', 'assunto', 'tema', 'subtopico', 'subtópico']);

          if (front && back) {
            if (!subjectName) {
              subjectName = 'Geral';
            }
            try {
              // Resolve subject with normalization
              const sNorm = subjectName.toLowerCase().trim();
              let subjectId = subjectCache[sNorm];
              if (!subjectId) {
                const existing = subjects.find(s => s.name.toLowerCase().trim() === sNorm);
                if (existing) {
                  subjectId = existing.id;
                } else {
                  subjectId = await studyService.getOrCreateSubject(currentUid, subjectName);
                }
                subjectCache[sNorm] = subjectId;
              }

              // Deduplication check
              if (isDuplicate(front, back, subjectId)) {
                skipped++;
                continue;
              }

              const importKey = `${front.trim().toLowerCase()}|${back.trim().toLowerCase()}|${subjectId}`;
              if (seenInThisImport.has(importKey)) {
                skipped++;
                continue;
              }
              seenInThisImport.add(importKey);

              // Resolve topic with normalization
              let topicId = '';
              if (topicName) {
                const tNorm = topicName.toLowerCase().trim();
                const topicKey = `${subjectId}:${tNorm}`;
                topicId = topicCache[topicKey];
                if (!topicId) {
                  const existing = topics.find(t => t.subjectId === subjectId && t.name.toLowerCase().trim() === tNorm);
                  if (existing) {
                    topicId = existing.id;
                  } else {
                    topicId = await studyService.getOrCreateTopic(currentUid, subjectId, topicName);
                  }
                  topicCache[topicKey] = topicId;
                }
              }

              cardsToImport.push({
                front,
                back,
                subjectId,
                topicId,
                explanation: getValue(row, ['explicação', 'explicacao', 'explanation', 'comentário', 'comentario']),
                isPublic: isStaff // Automatically make public if staff is importing
              });
              successLogs.push(`Linha ${rowNum}: "${front.substring(0, 20)}..." pronto.`);
            } catch (e: any) {
              errors.push(`Linha ${rowNum}: Erro técnico - ${e.message}`);
              skipped++;
            }
          } else {
                skipped++;
                const missing = [];
                if (!front) missing.push('Frente');
                if (!back) missing.push('Verso');
                errors.push(`Linha ${rowNum}: Dados incompletos (${missing.join(', ')})`);
              }
            }

            if (cardsToImport.length > 0) {
              setImportProgress(prev => ({ ...prev, status: `Salvando ${cardsToImport.length} flashcards no banco...` }));
              await onAddMany(cardsToImport);
              setImportSummary({
                success: cardsToImport.length,
                skipped,
                errors: [...errors, ...successLogs]
              });
            } else {
              setImportSummary({
                success: 0,
                skipped,
                errors: [...errors, 'Nenhum flashcard válido para importar.']
              });
            }
          } catch (error: any) {
            console.error('Import error:', error);
            let errorMessage = error.message || 'Erro crítico durante a importação.';
            try {
              const parsed = JSON.parse(errorMessage);
              if (parsed.error) errorMessage = `Erro no Banco de Dados: ${parsed.error}`;
            } catch (e) { /* not json */ }

            setImportSummary({
              success: 0,
              skipped: data.length,
              errors: [errorMessage]
            });
          } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        },
        error: (error) => {
          console.error('Parse error:', error);
          setImportSummary({
            success: 0,
            skipped: 0,
            errors: ['Erro ao processar a estrutura do arquivo CSV.']
          });
          setIsImporting(false);
        }
      });
    };

    reader.onerror = () => {
      setImportSummary({ success: 0, skipped: 0, errors: ['Erro ao ler o arquivo físico.'] });
      setIsImporting(false);
    };

    reader.readAsArrayBuffer(file);
  };

  if (isReviewing) {
    return (
      <FlashcardReview 
        cards={dueCards} 
        subjects={subjects}
        onReview={onReview} 
        onClose={() => setIsReviewing(false)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Usage Warning */}
      {currentPlan === 'free' && (
        <div className={cn(
          "p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all",
          (subscription?.flashcardsCount || 0) >= 40 
            ? "bg-amber-50 border-amber-200 shadow-sm" 
            : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              (subscription?.flashcardsCount || 0) >= 45 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            )}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {(subscription?.flashcardsCount || 0) >= 50 
                  ? "Limite de Flashcards Atingido" 
                  : "Uso do Plano Gratuito"}
              </h4>
              <p className="text-xs text-slate-500">
                Você usou <span className="font-bold text-slate-900">{subscription?.flashcardsCount || 0}</span> de <span className="font-bold text-slate-900">50</span> cards disponíveis.
              </p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xs w-full">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  (subscription?.flashcardsCount || 0) >= 45 ? "bg-red-500" : "bg-indigo-600"
                )}
                style={{ width: `${Math.min(100, ((subscription?.flashcardsCount || 0) / 50) * 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
          >
            Fazer Upgrade
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-4 md:pb-6 border-b border-slate-100">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Flashcards</h2>
            <p className="text-slate-500 text-sm">Memorize conceitos importantes com repetição espaçada.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
            <button 
              onClick={() => {
                setActiveSource('mine');
                setOpenBankSubjectId(null);
              }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                activeSource === 'mine' 
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Meus Cards
            </button>
            <button 
              onClick={() => {
                if (currentPlan === 'free') {
                  alert("O Banco de Flashcards está disponível apenas para membros Pro e Elite.");
                  navigate('/pricing');
                  return;
                }
                setActiveSource('bank');
                setIsSelectionMode(true);
                setOpenBankSubjectId(null);
              }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2",
                activeSource === 'bank' 
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShoppingBag size={16} />
              Banco de Cards
              {currentPlan === 'free' && <Lock size={12} className="text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {(activeSource === 'mine' || activeSource === 'bank') && (
          <>
            {activeSource === 'mine' && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBulkImport}
                accept=".csv"
                className="hidden"
              />
            )}
            {isSelectionMode ? (
              <>
                <span className="text-sm font-medium text-slate-600">{selectedCards.length} selecionados</span>
                {activeSource === 'mine' && (
                  <>
                    <button
                      onClick={() => setIsBulkEditing(true)}
                      disabled={selectedCards.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      <Edit2 size={16} />
                      Editar Selecionados
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedCards.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Excluir Selecionados
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    const cardsToSelect = activeSource === 'mine' 
                      ? flashcards 
                      : allFlashcards.filter(card => !isAlreadyImported(card));
                    
                    const cardIds = cardsToSelect.map(c => c.id);
                    if (selectedCards.length === cardIds.length) {
                      setSelectedCards([]);
                    } else {
                      setSelectedCards(cardIds);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                >
                  {selectedCards.length > 0 ? "Limpar Seleção" : "Selecionar Tudo"}
                </button>
                {activeSource === 'bank' && (
                  <button
                    onClick={handleBulkBankImport}
                    disabled={selectedCards.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    <PlusCircle size={16} />
                    Importar Selecionados
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedCards([]);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  <Layers size={16} />
                  {activeSource === 'bank' ? 'Selecionar em Lote' : 'Gerenciar Cards'}
                </button>
                {activeSource === 'mine' && (
                  <>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all shadow-sm"
                      title="Baixar modelo CSV"
                    >
                      <Download size={18} className="text-slate-500" />
                      Modelo
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (cardLimitReached) {
                            setImportSummary({
                              success: 0,
                              skipped: 0,
                              errors: ["Limite de 50 flashcards atingido no plano gratuito. Faça o upgrade para continuar importando sua coleção!"]
                            });
                            return;
                          }
                          fileInputRef.current?.click();
                        }}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Upload size={18} />
                        {isImporting ? 'Importando...' : 'Importar CSV'}
                      </button>
                      <button
                        onClick={() => setShowImportInfo(!showImportInfo)}
                        className="absolute -top-2 -right-2 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 shadow-sm transition-colors"
                        title="Formato do CSV"
                      >
                        <AlertCircle size={12} />
                      </button>
                      
                      {showImportInfo && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Formato do CSV</h4>
                            <button onClick={() => setShowImportInfo(false)} className="text-slate-400 hover:text-slate-600">
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">
                            O arquivo deve conter as seguintes colunas (em qualquer ordem):
                          </p>
                          <ul className="space-y-1.5">
                            <li className="text-[11px] flex items-center gap-2 text-slate-700">
                              <div className="w-1 h-1 rounded-full bg-indigo-500" />
                              <span className="font-bold">frente</span>: Pergunta/Conceito
                            </li>
                            <li className="text-[11px] flex items-center gap-2 text-slate-700">
                              <div className="w-1 h-1 rounded-full bg-indigo-500" />
                              <span className="font-bold">verso</span>: Resposta/Definição
                            </li>
                            <li className="text-[11px] flex items-center gap-2 text-slate-700">
                              <div className="w-1 h-1 rounded-full bg-indigo-500" />
                              <span className="font-bold">materia</span>: Nome da Matéria
                            </li>
                            <li className="text-[11px] flex items-center gap-2 text-slate-700">
                              <div className="w-1 h-1 rounded-full bg-indigo-500" />
                              <span className="font-bold">topico</span>: Nome do Tópico (opcional)
                            </li>
                          </ul>
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 italic">
                              * Matérias e tópicos novos serão criados automaticamente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Download size={18} />
                      Exportar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          const msg = "Deseja realizar uma varredura para corrigir erros de codificação (caracteres estranhos) nos flashcards? \n\nIsso corrige caracteres como 'Ã¡' para 'á' que ocorrem em importações CSV. Legendas e hífens legítimos serão preservados.";
                          if (confirm(msg)) {
                            try {
                              await studyService.sanitizeAllFlashcards();
                              alert("Varredura concluída com sucesso!");
                            } catch (e) {
                              alert("Erro ao realizar varredura.");
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                        title="Corrigir erros de codificação em todos os flashcards"
                      >
                        <Scissors size={18} />
                        Corrigir Codificação
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (cardLimitReached) {
                          alert("Você atingiu o limite de 50 flashcards do plano gratuito. Faça o upgrade para continuar criando!");
                          return;
                        }
                        setIsAdding(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={20} />
                      Novo Card
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {(isImporting || importSummary) && (
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
                    <Upload size={24} className="animate-bounce" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {importSummary ? 'Resultado da Importação' : 'Importando Flashcards'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {importSummary 
                      ? `${importSummary.success} flashcards processados com sucesso.`
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
                        <AlertCircle size={12} />
                        Logs de Processamento
                      </p>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-2 p-1">
                        {(() => {
                           const logs = importSummary.errors;
                           const successes = logs.filter(l => l.includes('pronto') || l.includes('adicionados') || l.includes('preparada'));
                           const failures = logs.filter(l => !l.includes('pronto') && !l.includes('adicionados') && !l.includes('preparada'));
                           
                           return (
                             <>
                               {successes.length > 5 ? (
                                 <div className="flex gap-2 text-xs p-2 rounded-lg border text-green-600 bg-green-50/50 border-green-100">
                                   <span className="font-bold min-w-[14px]">✓</span>
                                   <span className="leading-relaxed">{successes.length} flashcards processados com sucesso.</span>
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

      {/* Review Banner */}
      {activeSource === 'mine' && dueCards.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Layers size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sessão de Revisão Disponível</h3>
              <p className="text-indigo-100">Você tem {dueCards.length} cards prontos para revisar hoje.</p>
            </div>
          </div>
          <button
            onClick={() => setIsReviewing(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-sm hover:scale-105 active:scale-95"
          >
            <Play size={20} fill="currentColor" />
            Começar Agora
          </button>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="grid grid-cols-2 md:flex md:flex-row items-center gap-2 md:gap-4 w-full">
        <div className="relative col-span-2 md:flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" size={14} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 md:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs md:text-sm bg-white"
          />
        </div>

        <div className="col-span-1 w-full md:w-64">
          <MultiSelect 
            options={(() => {
              const currentSubs = activeSource === 'mine' ? subjects : allSubjects;
              const opts = currentSubs.map(s => ({ id: s.id, name: s.name }));
              if (!opts.some(o => o.id === PMMA_SUBJECT_NAME || o.name === PMMA_SUBJECT_NAME)) {
                opts.unshift({ id: PMMA_SUBJECT_NAME, name: PMMA_SUBJECT_NAME });
              }
              return opts;
            })()}
            selected={selectedSubjects}
            onChange={setSelectedSubjects}
            placeholder="Materias"
          />
        </div>

        <div className="relative col-span-1 w-full md:w-48">
          <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" size={14} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full pl-8 pr-8 py-1.5 md:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none text-xs md:text-sm font-medium"
          >
            <option value="createdAt">Data Criação</option>
            <option value="nextReviewDate">Próxima Revisão</option>
            <option value="subject">Matéria</option>
            <option value="status">Status</option>
            <option value="front">Texto</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp size={14} className="md:w-4 md:h-4" /> : <ArrowDown size={14} className="md:w-4 md:h-4" />}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Frente (Pergunta/Conceito)</label>
                <RichTextEditor
                  value={newCard.front}
                  onChange={(val) => setNewCard({ ...newCard, front: val })}
                  placeholder="Ex: O que é o Princípio da Dignidade da Pessoa Humana?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Verso (Resposta/Definição)</label>
                <RichTextEditor
                  value={newCard.back}
                  onChange={(val) => setNewCard({ ...newCard, back: val })}
                  placeholder="Ex: É um valor supremo que atrai o conteúdo de todos os direitos fundamentais..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matéria</label>
                <select
                  value={newCard.subjectId}
                  onChange={(e) => setNewCard({ ...newCard, subjectId: e.target.value, topicId: '' })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tópico (Opcional)</label>
                <select
                  value={newCard.topicId}
                  onChange={(e) => setNewCard({ ...newCard, topicId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">Nenhum tópico</option>
                  {topics.filter(t => t.subjectId === newCard.subjectId).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Explicação/Gabarito Comentado (Opcional)</label>
                <RichTextEditor
                  value={newCard.explanation || ''}
                  onChange={(val) => setNewCard({ ...newCard, explanation: val })}
                  placeholder="Dicas ou comentários adicionais"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Upload de Imagem (Opcional)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="url"
                        value={newCard.imageUrl}
                        onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                    <label className={cn(
                      "flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}>
                      <PlusCircle size={18} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                  </div>
                  {newCard.imageUrl && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                      <img src={newCard.imageUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setNewCard(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {isUploading && <p className="text-[10px] text-indigo-600 mt-1 animate-pulse">Fazendo upload...</p>}
                  {uploadError && <p className="text-[10px] text-red-600 mt-1">{uploadError}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Legenda da Imagem</label>
                <input
                  type="text"
                  value={newCard.caption}
                  onChange={(e) => setNewCard({ ...newCard, caption: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Esquema de Direito Penal"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                Salvar Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Excluir Flashcards?</h3>
            <p className="text-slate-500 text-center mb-8">
              {cardToDelete 
                ? "Tem certeza que deseja excluir este flashcard? Esta ação é permanente."
                : `Tem certeza que deseja excluir ${selectedCards.length} flashcards selecionados? Esta ação é permanente.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCardToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards View Section */}
      <div className="space-y-8">
        {/* BANK SOURCE VIEW */}
        {activeSource === 'bank' && (
          <>
            {/* OVERVIEW MODE: SHOW ONLY SUBJECTS AND CARD COUNTS */}
            {openBankSubjectId === null && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingBag size={20} className="text-indigo-600" />
                      Matérias no Banco de Cards
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Selecione uma matéria inteira ou abra para visualizar, editar e selecionar cards individuais para importar.
                    </p>
                  </div>
                  {bankSubjectCardsSummary.length > 0 && (
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                      {bankSubjectCardsSummary.length} {bankSubjectCardsSummary.length === 1 ? 'matéria disponível' : 'matérias disponíveis'}
                    </span>
                  )}
                </div>

                {bankSubjectCardsSummary.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bankSubjectCardsSummary.map(item => {
                      const subjectName = item.subject?.name || 'Sem Matéria';
                      const color = item.subject?.color || '#6366f1';
                      const isFullyImported = item.unimportedCards.length === 0 && item.totalCards.length > 0;
                      
                      const isSubjectSelected = item.unimportedCards.length > 0 && 
                        item.unimportedCards.every(c => selectedCards.includes(c.id));

                      return (
                        <div 
                          key={item.subjectId}
                          className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between relative group"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                                  style={{ backgroundColor: `${color}15`, color: color }}
                                >
                                  <BookOpen size={20} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {subjectName}
                                  </h4>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {item.totalCards.length} {item.totalCards.length === 1 ? 'card no total' : 'cards no total'}
                                  </span>
                                </div>
                              </div>

                              {!isFullyImported && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectSubjectBank(item.subjectId)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0",
                                    isSubjectSelected
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                                  )}
                                  title={isSubjectSelected ? "Desmarcar matéria" : "Selecionar todos desta matéria"}
                                >
                                  <CheckCircle2 size={14} />
                                  {isSubjectSelected ? "Selecionado" : "Selecionar"}
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {isFullyImported ? (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  Matéria Completa ({item.importedCount} salvos)
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                                    {item.unimportedCards.length} novos para importar
                                  </span>
                                  {item.importedCount > 0 && (
                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                      {item.importedCount} na sua coleção
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => setOpenBankSubjectId(item.subjectId)}
                              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-200/60 hover:border-indigo-200"
                            >
                              <FolderOpen size={15} />
                              Abrir Matéria ({item.totalCards.length} cards)
                              <ChevronRight size={14} className="ml-auto text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
                    <ShoppingBag className="mx-auto mb-4 opacity-20 text-slate-400" size={48} />
                    <p className="font-bold text-slate-700">Nenhuma matéria encontrada no Banco.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou os filtros aplicados.</p>
                  </div>
                )}
              </div>
            )}

            {/* OPENED SUBJECT DETAILED VIEW */}
            {openBankSubjectId !== null && (() => {
              const openedSubject = allSubjects.find(s => s.id === openBankSubjectId);
              const cardsInOpenedSubject = visibleFlashcards.filter(c => c.subjectId === openBankSubjectId);
              const unimportedInSubject = cardsInOpenedSubject.filter(c => !isAlreadyImported(c));
              const allSelected = unimportedInSubject.length > 0 && unimportedInSubject.every(c => selectedCards.includes(c.id));

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setOpenBankSubjectId(null)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold shrink-0"
                      >
                        <ArrowLeft size={16} />
                        Voltar para Matérias
                      </button>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: openedSubject?.color || '#6366f1' }}
                          />
                          {openedSubject?.name || 'Sem Matéria'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {cardsInOpenedSubject.length} {cardsInOpenedSubject.length === 1 ? 'card' : 'cards'} nesta matéria ({unimportedInSubject.length} disponíveis para importar)
                        </p>
                      </div>
                    </div>

                    {unimportedInSubject.length > 0 && (
                      <button
                        onClick={() => handleSelectSubjectBank(openBankSubjectId)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto",
                          allSelected
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                        )}
                      >
                        <CheckCircle2 size={16} />
                        {allSelected ? "Remover Seleção da Matéria" : "Selecionar Todos os Cards"}
                      </button>
                    )}
                  </div>

                  {cardsInOpenedSubject.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cardsInOpenedSubject.map((card) => {
                        const isSelected = selectedCards.includes(card.id);
                        const alreadyImported = isAlreadyImported(card);
                        const isFlipped = flippedCards[card.id] || false;

                        return (
                          <div key={card.id} className="relative perspective-1000 h-[360px] w-full group">
                            <div className="absolute top-3 right-3.5 flex flex-row items-center gap-1.5 z-50">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCard(card);
                                }}
                                className="w-7 h-7 rounded-lg bg-white/95 backdrop-blur border border-slate-200/75 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors"
                                title="Editar Card"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>

                            <motion.div 
                              animate={{ rotateY: isFlipped ? 180 : 0 }}
                              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                              onClick={() => {
                                if (!alreadyImported) {
                                  toggleCardSelection(card.id);
                                } else {
                                  setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                                }
                              }}
                              className="relative w-full h-full preserve-3d cursor-pointer"
                            >
                              <div 
                                className={cn(
                                  "absolute inset-0 backface-hidden bg-white rounded-[2rem] border border-slate-200/80 shadow-md flex flex-col p-6 sm:p-8 justify-between transition-all duration-300 hover:shadow-lg",
                                  !isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none",
                                  isSelected ? "ring-4 ring-indigo-500/20 border-indigo-500 bg-indigo-50/5" : "",
                                  alreadyImported ? "opacity-65 bg-slate-50 border-slate-200" : ""
                                )}
                              >
                                <div className="flex items-center justify-between w-full mb-3 select-none">
                                  <div>
                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                      {openedSubject?.name || 'Matéria'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 pr-8">
                                    {!alreadyImported && (
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                        isSelected 
                                          ? "bg-indigo-600 border-indigo-600 text-white" 
                                          : "bg-white border-slate-300 hover:border-slate-400"
                                      )}>
                                        {isSelected && <CheckCircle2 size={13} className="stroke-[3]" />}
                                      </div>
                                    )}
                                    {alreadyImported && (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle2 size={11} className="text-emerald-500" />
                                        Salvo
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 overflow-y-auto custom-scrollbar py-2">
                                  <div 
                                    className="text-slate-800 text-[15px] sm:text-[17px] font-normal leading-relaxed text-center w-full ql-editor !p-0 rich-text-content flashcard-front-content"
                                    dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.front || '') }}
                                  />

                                  {card.imageUrl && (
                                    <div className="mt-3 relative h-20 w-fit max-w-[150px] rounded-xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                      <img src={card.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 text-center text-slate-400 font-bold text-[9px] uppercase tracking-widest shrink-0 transition-opacity opacity-50 group-hover:opacity-100 flex items-center justify-between select-none">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                                    }}
                                    className="text-indigo-600 hover:underline flex items-center gap-1 text-[10px]"
                                  >
                                    Ver Resposta <ChevronRight size={10} />
                                  </button>

                                  {!alreadyImported && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBankImport(card);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg font-bold text-[10px] transition-all"
                                    >
                                      Importar
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div 
                                className={cn(
                                  "absolute inset-0 backface-hidden rotate-y-180 bg-[#f3faf6] rounded-[2rem] border border-[#bfeadd] shadow-md flex flex-col p-6 sm:p-8 justify-between transition-all duration-300",
                                  isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                                )}
                              >
                                <div className="flex items-center justify-between w-full mb-3 select-none">
                                  <span className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Gabarito & Comentário</span>
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full">Verso</span>
                                </div>

                                <div className="flex-1 flex flex-col justify-start text-left w-full overflow-y-auto custom-scrollbar py-1">
                                  <div className="mb-4">
                                    <div className="text-[#0e6231] font-bold text-[13px] sm:text-sm uppercase tracking-wide mb-1.5 flex items-center gap-1.5 select-none">
                                      <div className="w-1 h-3 bg-[#107c41] rounded-full" />
                                      Resposta:
                                    </div>
                                    <div 
                                      className="text-slate-800 text-[15px] sm:text-[16px] font-normal leading-relaxed w-full ql-editor !p-0 rich-text-content flashcard-back-content force-visible-text text-left"
                                      dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.back || '') }}
                                    />
                                  </div>
                                  
                                  {card.explanation && (
                                    <div className="mt-2 pt-3 border-t border-emerald-200/55 w-full text-left">
                                      <div className="text-[#0e6231] font-bold text-[13px] sm:text-sm uppercase tracking-wide mb-1.5 flex items-center gap-1.5 select-none">
                                        <div className="w-1 h-3 bg-[#107c41] rounded-full" />
                                        Comentário:
                                      </div>
                                      <div 
                                        className="text-slate-700 text-[14px] sm:text-[15px] font-normal leading-relaxed ql-editor !p-0 rich-text-content force-visible-text text-left"
                                        dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.explanation || '') }}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 text-center text-emerald-700/60 font-medium text-[9px] uppercase tracking-widest shrink-0 flex items-center justify-center gap-1 select-none">
                                  <Sparkles size={9} className="text-emerald-500/70" /> Toque para virar
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
                      <p>Nenhum card nesta matéria.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* USER'S CARDS SOURCE VIEW (MINE) */}
        {activeSource === 'mine' && (
          Object.keys(groupedCards).length > 0 ? (
            Object.entries(groupedCards)
              .sort(([idA], [idB]) => {
                const nameA = subjects.find(s => s.id === idA)?.name || '';
                const nameB = subjects.find(s => s.id === idB)?.name || '';
                return nameA.localeCompare(nameB);
              })
              .map(([subjectId, cards]) => {
                const subject = subjects.find(s => s.id === subjectId);

                return (
                  <div key={subjectId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-1 h-6 rounded-full" 
                          style={{ backgroundColor: subject?.color || '#6366f1' }}
                        />
                        <h3 className="text-lg font-bold text-slate-800">{subject?.name || 'Sem Matéria'}</h3>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                        </span>
                      </div>

                      {isSelectionMode && (
                        <button
                          onClick={() => handleSelectSubjectMine(subjectId)}
                          className={cn(
                            "text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all",
                            cards.every(c => selectedCards.includes(c.id))
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          )}
                        >
                          {cards.every(c => selectedCards.includes(c.id)) ? "Remover Matéria" : "Selecionar Matéria"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cards.slice(0, getSubjectCardLimit(subjectId)).map((card) => {
                        const isDue = card.nextReviewDate <= now;
                        const isSelected = selectedCards.includes(card.id);
                        const isFlipped = flippedCards[card.id] || false;

                        return (
                          <div key={card.id} className="relative perspective-1000 h-[340px] sm:h-[360px] w-full group">
                            {!isSelectionMode && (
                              <div className="absolute top-3 right-3.5 flex flex-row items-center gap-1.5 z-50 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCard(card);
                                  }}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/95 backdrop-blur border border-slate-200/75 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Tem certeza que deseja excluir este flashcard?')) {
                                      onDelete(card.id);
                                    }
                                  }}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/95 backdrop-blur border border-slate-200/75 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-white transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}

                            <motion.div 
                              animate={{ rotateY: isFlipped ? 180 : 0 }}
                              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                              onClick={() => {
                                if (isSelectionMode) {
                                  toggleCardSelection(card.id);
                                } else {
                                  setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                                }
                              }}
                              className="relative w-full h-full preserve-3d cursor-pointer"
                            >
                              <div 
                                className={cn(
                                  "absolute inset-0 backface-hidden bg-white rounded-[2rem] border border-slate-200/80 shadow-md flex flex-col p-6 sm:p-8 justify-between transition-all duration-300 hover:shadow-lg",
                                  !isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none",
                                  isSelected ? "ring-4 ring-indigo-500/20 border-indigo-500 bg-indigo-50/5" : ""
                                )}
                              >
                                <div className="flex items-center justify-between w-full mb-3 select-none">
                                  <div>
                                    {(() => {
                                      const color = subject?.color || '#6366f1';
                                      return (
                                        <div 
                                          className="px-3 py-1 border rounded-full font-bold shadow-sm"
                                          style={{
                                            backgroundColor: `${color}10`,
                                            borderColor: `${color}20`,
                                            color: color
                                          }}
                                        >
                                          <span className="text-[9px] uppercase tracking-wider leading-none">
                                            {subject?.name || 'Matéria'}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isDue && (
                                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/65 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Revisar
                                      </span>
                                    )}
                                    {isSelectionMode && (
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                        isSelected 
                                          ? "bg-indigo-600 border-indigo-600 text-white" 
                                          : "bg-white border-slate-300 hover:border-slate-400"
                                      )}>
                                        {isSelected && <CheckCircle2 size={13} className="stroke-[3]" />}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 overflow-y-auto custom-scrollbar py-2">
                                  <div 
                                    className="text-slate-800 text-[16px] sm:text-[18px] font-normal leading-relaxed text-center w-full ql-editor !p-0 rich-text-content flashcard-front-content"
                                    dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.front || '') }}
                                  />

                                  {card.imageUrl && (
                                    <div className="mt-3 relative h-20 w-fit max-w-[150px] rounded-xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                      <img src={card.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 text-center text-slate-400 font-bold text-[9px] uppercase tracking-widest shrink-0 transition-opacity opacity-50 group-hover:opacity-100 flex items-center justify-center gap-1 select-none">
                                  Toque para virar <ChevronRight size={10} className="text-slate-300" />
                                </div>
                              </div>

                              <div 
                                className={cn(
                                  "absolute inset-0 backface-hidden rotate-y-180 bg-[#f3faf6] rounded-[2rem] border border-[#bfeadd] shadow-md flex flex-col p-6 sm:p-8 justify-between transition-all duration-300",
                                  isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                                )}
                              >
                                <div className="flex items-center justify-between w-full mb-3 select-none">
                                  <span className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Gabarito & Comentário</span>
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full">Verso</span>
                                </div>

                                <div className="flex-1 flex flex-col justify-start text-left w-full overflow-y-auto custom-scrollbar py-1">
                                  <div className="mb-4">
                                    <div className="text-[#0e6231] font-bold text-[13px] sm:text-sm uppercase tracking-wide mb-1.5 flex items-center gap-1.5 select-none">
                                      <div className="w-1 h-3 bg-[#107c41] rounded-full" />
                                      Resposta:
                                    </div>
                                    <div 
                                      className="text-slate-800 text-[15px] sm:text-[16px] font-normal leading-relaxed w-full ql-editor !p-0 rich-text-content flashcard-back-content force-visible-text text-left"
                                      dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.back || '') }}
                                    />
                                  </div>
                                  
                                  {card.explanation && (
                                    <div className="mt-2 pt-3 border-t border-emerald-200/55 w-full text-left">
                                      <div className="text-[#0e6231] font-bold text-[13px] sm:text-sm uppercase tracking-wide mb-1.5 flex items-center gap-1.5 select-none">
                                        <div className="w-1 h-3 bg-[#107c41] rounded-full" />
                                        Comentário:
                                      </div>
                                      <div 
                                        className="text-slate-700 text-[14px] sm:text-[15px] font-normal leading-relaxed ql-editor !p-0 rich-text-content force-visible-text text-left"
                                        dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(card.explanation || '') }}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 text-center text-emerald-700/60 font-medium text-[9px] uppercase tracking-widest shrink-0 flex items-center justify-center gap-1 select-none">
                                  <Sparkles size={9} className="text-emerald-500/70" /> Toque para voltar
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                    {cards.length > getSubjectCardLimit(subjectId) && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => handleShowMoreCards(subjectId, cards.length)}
                          className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-600 font-bold rounded-2xl transition-all shadow-sm text-xs flex items-center gap-2"
                        >
                          <span>Mostrar mais (+{cards.length - getSubjectCardLimit(subjectId)} cards nesta matéria)</span>
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
              <Layers className="mx-auto mb-4 opacity-20" size={48} />
              <p>Nenhum flashcard encontrado.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="mt-4 text-indigo-600 font-medium hover:underline"
              >
                Crie seu primeiro card agora
              </button>
            </div>
          )
        )}
      </div>

      {/* Floating import action bar for Bank mode */}
      {activeSource === 'bank' && selectedCards.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-300 max-w-xl w-11/12">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-400" />
              {selectedCards.length} {selectedCards.length === 1 ? 'card selecionado' : 'cards selecionados'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              Prontos para serem adicionados à sua coleção
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedCards([])}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleBulkBankImport}
              disabled={isImporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={16} />
              {isImporting ? 'Importando...' : 'Importar Cards'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Editar Flashcard</h3>
              <button 
                onClick={() => setEditingCard(null)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCard} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Matéria</label>
                  <select
                    value={editingCard.subjectId}
                    onChange={(e) => setEditingCard({ ...editingCard, subjectId: e.target.value, topicId: '' })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    required
                  >
                    {(activeSource === 'bank' ? allSubjects : subjects).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tópico (Opcional)</label>
                  <select
                    value={editingCard.topicId}
                    onChange={(e) => setEditingCard({ ...editingCard, topicId: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  >
                    <option value="">Sem Tópico</option>
                    {(activeSource === 'bank' ? allTopics : topics).filter(t => t.subjectId === editingCard.subjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Frente (Pergunta/Conceito)</label>
                <RichTextEditor
                  value={editingCard.front}
                  onChange={(val) => setEditingCard({ ...editingCard, front: val })}
                  placeholder="Pergunta ou conceito principal..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Verso (Resposta/Definição)</label>
                <RichTextEditor
                  value={editingCard.back}
                  onChange={(val) => setEditingCard({ ...editingCard, back: val })}
                  placeholder="Resposta ou definição detalhada..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Explicação ou Comentário</label>
                <RichTextEditor
                  value={editingCard.explanation || ''}
                  onChange={(val) => setEditingCard({ ...editingCard, explanation: val })}
                  placeholder="Informações adicionais ou dicas..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Edit2 size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Edição em Massa</h3>
              </div>
              <button 
                onClick={() => setIsBulkEditing(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500">
                Você selecionou <span className="font-bold text-slate-900">{selectedCards.length}</span> cards. 
                As alterações abaixo serão aplicadas a todos eles.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mudar Matéria para:</label>
                  <select
                    onChange={(e) => setBulkUpdates({ ...bulkUpdates, subjectId: e.target.value, topicId: '' })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  >
                    <option value="">Não alterar</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mudar Tópico para:</label>
                  <select
                    disabled={!bulkUpdates.subjectId}
                    onChange={(e) => setBulkUpdates({ ...bulkUpdates, topicId: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium disabled:opacity-50"
                  >
                    <option value="">Não alterar</option>
                    <option value="">Sem Tópico</option>
                    {bulkUpdates.subjectId && topics.filter(t => t.subjectId === bulkUpdates.subjectId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setIsBulkEditing(false);
                    setBulkUpdates({});
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={Object.keys(bulkUpdates).length === 0}
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
                >
                  Aplicar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
