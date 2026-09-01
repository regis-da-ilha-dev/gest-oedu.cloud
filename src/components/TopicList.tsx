import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Target, 
  Trash2, 
  Edit2, 
  Search, 
  Filter, 
  RotateCcw, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  BarChart2, 
  CheckSquare, 
  HelpCircle, 
  Award, 
  Dribbble, 
  ArrowRight,
  Bookmark,
  Share2,
  Layers,
  X,
  Check,
  RefreshCw,
  Briefcase,
  Settings
} from 'lucide-react';
import { Subject, Topic } from '../types';
import { cn } from '../lib/utils';
import { EDITAL_PRESETS, EditalPreset, PresetSubject } from '../data/editalPresets';

interface TopicListProps {
  topics: Topic[];
  subjects: Subject[];
  userRole?: string;
  onAdd: (topic: Partial<Topic>) => void;
  onBulkAdd?: (topics: Partial<Topic>[]) => void;
  onAddSubject?: (name: string, color: string) => Promise<string | undefined>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Topic>) => void;
  onBulkUpdateTopicsSubject?: (topicIds: string[], newSubjectId: string) => Promise<void>;
  onBulkUpdateTopicsPosition?: (topicIds: string[], newPosition: string) => Promise<void>;
  onBulkDeleteTopics?: (topicIds: string[]) => Promise<void>;
  onRenameCargo?: (oldPosition: string, newPosition: string) => Promise<void>;
  onCleanupDuplicatesAndEmpty?: () => Promise<void>;
  onStudy: (id: string) => void;
  onGenerateFlashcards?: (topicId: string, subjectId: string) => void;
}

export default function TopicList({ 
  topics = [], 
  subjects = [], 
  userRole, 
  onAdd, 
  onBulkAdd, 
  onAddSubject,
  onDelete,
  onUpdate,
  onBulkUpdateTopicsSubject,
  onBulkUpdateTopicsPosition,
  onBulkDeleteTopics,
  onRenameCargo,
  onCleanupDuplicatesAndEmpty,
  onStudy
}: TopicListProps) {
  // Views: 'verticalizado' (grouped by subject cards), 'table' (flat searchable table), or 'biblioteca' (ready syllabus templates map/import)
  const [viewMode, setViewMode] = useState<'verticalizado' | 'table' | 'biblioteca'>('verticalizado');
  
  // Multi-selection states
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [bulkActionSubjectId, setBulkActionSubjectId] = useState<string>('');
  const [bulkActionPosition, setBulkActionPosition] = useState<string>('');
  
  // Modals / Panels
  const [isManagingCargos, setIsManagingCargos] = useState(false);
  const [editingCargoName, setEditingCargoName] = useState<string | null>(null);
  const [tempCargoEditName, setTempCargoEditName] = useState('');
  const [isSavingCargoName, setIsSavingCargoName] = useState(false);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all'); // Filter by target position (Cargo)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempPosition, setTempPosition] = useState(''); // Edit existing topic's Cargo
  const [tempInstitution, setTempInstitution] = useState(''); // Edit existing topic's Órgão
  
  // Confirms / Modals
  const [topicToReset, setTopicToReset] = useState<Topic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Contest Presets states
  const [selectedPresetId, setSelectedPresetId] = useState<string>(EDITAL_PRESETS[0]?.id || '');
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [isImportingPreset, setIsImportingPreset] = useState(false);

  // Editable Contest Presets state (stored in LocalStorage)
  const [presetsList, setPresetsList] = useState<EditalPreset[]>(() => {
    const saved = localStorage.getItem('sde_custom_presets_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EditalPreset[];
        const merged = [...parsed];
        EDITAL_PRESETS.forEach(staticPreset => {
          if (!merged.some(p => p.id === staticPreset.id)) {
            merged.push(staticPreset);
          }
        });
        return merged;
      } catch (e) {
        console.error("Error loading custom presets, falling back to static:", e);
      }
    }
    return EDITAL_PRESETS;
  });

  // State to manage preset metadata editing in a modal
  const [isEditingPresetMeta, setIsEditingPresetMeta] = useState(false);
  const [presetMetaForm, setPresetMetaForm] = useState({
    title: '',
    institution: '',
    banca: '',
    difficulty: 'Médio' as 'Médio' | 'Superior',
    description: ''
  });

  // Inline editing states for preset subjects and topics
  const [editingPresetSubjectName, setEditingPresetSubjectName] = useState<{subjectIndex: number, name: string} | null>(null);
  const [editingPresetTopicName, setEditingPresetTopicName] = useState<{subjectIndex: number, topicIndex: number, name: string} | null>(null);
  const [newPresetTopicName, setNewPresetTopicName] = useState<Record<number, string>>({}); // subjectIndex -> input string
  const [isAddingPresetSubject, setIsAddingPresetSubject] = useState(false);
  const [newPresetSubjectName, setNewPresetSubjectName] = useState('');

  // Bulk Add form state
  const [bulkSubjectId, setBulkSubjectId] = useState(subjects[0]?.id || '');
  const [bulkText, setBulkText] = useState('');
  const [bulkPosition, setBulkPosition] = useState(''); // Custom cargo for bulk add
  const [bulkInstitution, setBulkInstitution] = useState(''); // Custom órgão for bulk add

  // Inline Questions Edit State
  const [editingQuestionsId, setEditingQuestionsId] = useState<string | null>(null);
  const [tempQuestionsCorrect, setTempQuestionsCorrect] = useState<number>(0);
  const [tempQuestionsTotal, setTempQuestionsTotal] = useState<number>(0);

  // Collapsible Subjects
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    subjects.forEach((sub, idx) => {
      // Keep the first subject open by default for a friendly start
      initial[sub.id] = idx === 0;
    });
    return initial;
  });

  const [newTopic, setNewTopic] = useState({
    name: '',
    subjectId: subjects[0]?.id || '',
    questionsTotal: 0,
    questionsCorrect: 0,
    position: '', // Custom position target (Cargo)
    institution: '', // Custom institution target (Órgão)
  });

  const subjectMap = useMemo(() => new Map((subjects || []).map(s => [s.id, s])), [subjects]);

  const handleEditName = (topic: Topic) => {
    setEditingId(topic.id);
    setTempName(topic.name);
    setTempPosition(topic.position || '');
    setTempInstitution(topic.institution || '');
  };

  const saveNameEdit = (id: string) => {
    if (tempName.trim()) {
      onUpdate(id, { 
        name: tempName,
        position: tempPosition.trim() || undefined,
        institution: tempInstitution.trim() || undefined
      });
    }
    setEditingId(null);
  };

  const cancelNameEdit = () => {
    setEditingId(null);
  };

  const handleResetCycle = (topic: Topic) => {
    onUpdate(topic.id, {
      status: 'pending',
      theoryDone: false,
      exercisesDone: false,
      revisionDone: false,
      questionsTotal: 0,
      questionsCorrect: 0
    });
    setTopicToReset(null);
  };

  const handleDeleteTopic = (topic: Topic) => {
    setTopicToDelete(topic);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(topicToDelete.id);
      setTopicToDelete(null);
    } catch (error) {
      console.error("Error deleting topic:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartQuestionsEdit = (topic: Topic) => {
    setEditingQuestionsId(topic.id);
    setTempQuestionsCorrect(topic.questionsCorrect || 0);
    setTempQuestionsTotal(topic.questionsTotal || 0);
  };

  const saveQuestionsEdit = (id: string) => {
    onUpdate(id, {
      questionsCorrect: Number(tempQuestionsCorrect || 0),
      questionsTotal: Number(tempQuestionsTotal || 0)
    });
    setEditingQuestionsId(null);
  };

  const toggleSubjectExpand = (subId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    subjects.forEach(sub => {
      next[sub.id] = true;
    });
    setExpandedSubjects(next);
  };

  const collapseAll = () => {
    setExpandedSubjects({});
  };

  const toggleSelectTopic = (id: string) => {
    setSelectedTopicIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (topicsToToggle: Topic[]) => {
    const idsToToggle = topicsToToggle.map(t => t.id);
    const allSelected = idsToToggle.every(id => selectedTopicIds.includes(id));
    if (allSelected) {
      setSelectedTopicIds(prev => prev.filter(id => !idsToToggle.includes(id)));
    } else {
      setSelectedTopicIds(prev => Array.from(new Set([...prev, ...idsToToggle])));
    }
  };

  const handleBulkUpdateSubject = async () => {
    if (!bulkActionSubjectId) return;
    if (selectedTopicIds.length === 0) return;
    if (!onBulkUpdateTopicsSubject) return;

    setIsUpdatingBulk(true);
    try {
      await onBulkUpdateTopicsSubject(selectedTopicIds, bulkActionSubjectId);
      setSelectedTopicIds([]);
      setBulkActionSubjectId('');
    } catch (error) {
      console.error("Erro ao atualizar disciplinas em lote:", error);
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleBulkUpdatePosition = async () => {
    if (selectedTopicIds.length === 0) return;
    if (!onBulkUpdateTopicsPosition) return;

    setIsUpdatingBulk(true);
    try {
      await onBulkUpdateTopicsPosition(selectedTopicIds, bulkActionPosition.trim() || '');
      setSelectedTopicIds([]);
      setBulkActionPosition('');
    } catch (error) {
      console.error("Erro ao atualizar cargos em lote:", error);
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTopicIds.length === 0) return;
    if (!onBulkDeleteTopics) return;

    setIsUpdatingBulk(true);
    try {
      await onBulkDeleteTopics(selectedTopicIds);
      setSelectedTopicIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error("Erro ao deletar tópicos em lote:", error);
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleRenameCargoAction = async (oldName: string, newName: string) => {
    if (!oldName.trim() || !newName.trim()) return;
    if (!onRenameCargo) return;

    setIsSavingCargoName(true);
    try {
      await onRenameCargo(oldName, newName);
      setEditingCargoName(null);
    } catch (error) {
      console.error("Erro ao renomear cargo:", error);
    } finally {
      setIsSavingCargoName(false);
    }
  };

  const handleCleanupAction = async () => {
    if (!onCleanupDuplicatesAndEmpty) return;
    setIsCleaningUp(true);
    try {
      await onCleanupDuplicatesAndEmpty();
      setShowCleanupConfirm(false);
    } catch (error) {
      console.error("Erro ao limpar e organizar edital:", error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const uniquePositions = useMemo(() => {
    const list = new Set<string>();
    (topics || []).forEach(t => {
      if (t.position) {
        list.add(t.position);
      }
    });
    return Array.from(list);
  }, [topics]);

  const filteredTopics = useMemo(() => {
    return (topics || []).filter(topic => {
      const matchesSearch = (topic.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === 'all' || topic.subjectId === selectedSubject;
      const matchesPosition = selectedPosition === 'all' || topic.position === selectedPosition;
      return matchesSearch && matchesSubject && matchesPosition;
    });
  }, [topics, searchTerm, selectedSubject, selectedPosition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopic.name.trim() && newTopic.subjectId) {
      onAdd({
        ...newTopic,
        position: newTopic.position.trim() || undefined,
        institution: newTopic.institution.trim() || undefined
      });
      setNewTopic({ 
        name: '', 
        subjectId: subjects[0]?.id || '',
        questionsTotal: 0, 
        questionsCorrect: 0,
        position: '',
        institution: ''
      });
      setIsAdding(false);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSubjectId || !bulkText.trim()) return;

    const lines = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length > 0 && onBulkAdd) {
      const newTopicsList = lines.map(name => ({
        name,
        subjectId: bulkSubjectId,
        questionsTotal: 0,
        questionsCorrect: 0,
        position: bulkPosition.trim() || undefined,
        institution: bulkInstitution.trim() || undefined
      }));
      onBulkAdd(newTopicsList);
      setIsBulkAdding(false);
      setBulkText('');
      setBulkPosition('');
      setBulkInstitution('');
    }
  };

  // Sync custom presets to LocalStorage when they change
  useEffect(() => {
    localStorage.setItem('sde_custom_presets_v2', JSON.stringify(presetsList));
  }, [presetsList]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presetsList.find(p => p.id === presetId);
    if (!preset) return;

    const initialMapping: Record<string, string> = {};
    preset.subjects.forEach(presetSub => {
      // Find matching existing subject by name
      const existingMatch = subjects.find(
        s => s.name.toLowerCase().trim() === presetSub.name.toLowerCase().trim()
      );
      if (existingMatch) {
        initialMapping[presetSub.name] = existingMatch.id;
      } else {
        initialMapping[presetSub.name] = 'create'; // default to create new subject
      }
    });
    setMappingState(initialMapping);
  };

  const handleImportPreset = async () => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset || isImportingPreset) return;

    setIsImportingPreset(true);
    try {
      const allNewTopicsToInsert: Partial<Topic>[] = [];

      for (const presetSub of preset.subjects) {
        let mappedId = mappingState[presetSub.name];
        
        // If mapping is set to create new subject
        if (!mappedId || mappedId === 'create') {
          if (onAddSubject) {
            // Check if there is an exact match already first to avoid duplicated subject names
            const exactSubject = subjects.find(s => s.name.toLowerCase().trim() === presetSub.name.toLowerCase().trim());
            if (exactSubject) {
              mappedId = exactSubject.id;
            } else {
              const newId = await onAddSubject(presetSub.name, presetSub.color);
              if (newId) {
                mappedId = newId;
              } else {
                const fallbackSub = subjects[0];
                mappedId = fallbackSub?.id;
              }
            }
          } else {
            const fallbackSub = subjects[0];
            mappedId = fallbackSub?.id;
          }
        }

        if (mappedId) {
          // Prepare topics for insertion
          presetSub.topics.forEach(topicName => {
            allNewTopicsToInsert.push({
              name: topicName,
              subjectId: mappedId,
              questionsTotal: 0,
              questionsCorrect: 0,
              status: 'pending',
              theoryDone: false,
              exercisesDone: false,
              revisionDone: false,
              position: preset.title,
              institution: preset.institution
            });
          });
        }
      }

      if (allNewTopicsToInsert.length > 0 && onBulkAdd) {
        await onBulkAdd(allNewTopicsToInsert);
        alert("Edital Verticalizado importado com sucesso! Suas matérias e tópicos foram mapeados nos seus estudos.");
        setViewMode('verticalizado');
      } else {
        alert("Nenhum tópico foi importado. Verifique se você possui matérias cadastradas.");
      }
    } catch (error) {
      console.error("Erro ao importar edital:", error);
      alert("Ocorreu um erro ao importar o edital.");
    } finally {
      setIsImportingPreset(false);
    }
  };

  // Helper to update the selected preset inside the presets list
  const updateCurrentPresetObj = (updatedPreset: EditalPreset) => {
    setPresetsList(prev => prev.map(p => p.id === updatedPreset.id ? updatedPreset : p));
  };

  // Open the general metadata editor for selected preset
  const handleOpenPresetMetaEdit = (preset: EditalPreset) => {
    setPresetMetaForm({
      title: preset.title,
      institution: preset.institution,
      banca: preset.banca,
      difficulty: preset.difficulty,
      description: preset.description || ''
    });
    setIsEditingPresetMeta(true);
  };

  // Save general metadata
  const handleSavePresetMeta = () => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset) return;
    const updated: EditalPreset = {
      ...preset,
      title: presetMetaForm.title.trim() || preset.title,
      institution: presetMetaForm.institution.trim() || preset.institution,
      banca: presetMetaForm.banca.trim() || preset.banca,
      difficulty: presetMetaForm.difficulty,
      description: presetMetaForm.description.trim()
    };
    updateCurrentPresetObj(updated);
    setIsEditingPresetMeta(false);
  };

  // Create a brand new custom preset template
  const handleCreateNewPreset = () => {
    const newId = `custom-preset-${Date.now()}`;
    const newPreset: EditalPreset = {
      id: newId,
      title: 'Novo Concurso Prova',
      institution: 'ÓRGÃO',
      banca: 'QUALQUER',
      difficulty: 'Superior',
      description: 'Modelo de edital personalizado feito sob medida por você.',
      subjects: [
        {
          name: 'Nova Disciplina',
          color: '#4f46e5',
          icon: 'BookOpen',
          topics: ['Exemplo de conteúdo programático 01', 'Exemplo de conteúdo programático 02']
        }
      ]
    };
    setPresetsList(prev => [...prev, newPreset]);
    setSelectedPresetId(newId);
    
    // Set initial mappings
    const initialMapping: Record<string, string> = { 'Nova Disciplina': 'create' };
    setMappingState(initialMapping);
  };

  // Delete an entire preset from custom library (only if not protected)
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente deletar este edital predefinido da sua biblioteca? Esta ação não pode ser desfeita.")) return;
    const newList = presetsList.filter(p => p.id !== presetId);
    setPresetsList(newList);
    if (selectedPresetId === presetId && newList.length > 0) {
      setSelectedPresetId(newList[0].id);
    }
  };

  // Revert a built-in preconfigured preset to its original state
  const handleRestorePresetToDefault = (presetId: string) => {
    const original = EDITAL_PRESETS.find(p => p.id === presetId);
    if (!original) {
      alert("Este edital não é um modelo padrão do sistema e não pode ser restaurado.");
      return;
    }
    if (window.confirm(`Deseja restaurar o edital "${original.title}" para as disciplinas e tópicos originais do sistema? Suas alterações serão substituídas.`)) {
      setPresetsList(prev => prev.map(p => p.id === presetId ? JSON.parse(JSON.stringify(original)) : p));
    }
  };

  // Add subject to a preset
  const handleAddPresetSubject = (name: string) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset) return;
    if (!name || !name.trim()) return;

    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const updatedSubjects = [...preset.subjects, {
      name: name.trim(),
      color: randomColor,
      icon: 'BookOpen',
      topics: []
    }];

    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });

    setMappingState(prev => ({ ...prev, [name.trim()]: 'create' }));
  };

  // Edit preset subject name
  const handleEditPresetSubjectName = (subjectIndex: number, newName: string) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset) return;
    if (!newName.trim()) return;

    const oldName = preset.subjects[subjectIndex].name;
    const updatedSubjects = preset.subjects.map((sub, idx) => {
      if (idx === subjectIndex) {
        return { ...sub, name: newName.trim() };
      }
      return sub;
    });

    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });

    setMappingState(prev => {
      const copy = { ...prev };
      const val = copy[oldName] || 'create';
      delete copy[oldName];
      copy[newName.trim()] = val;
      return copy;
    });
  };

  // Delete preset subject
  const handleDeletePresetSubject = (subjectIndex: number) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset) return;
    const subName = preset.subjects[subjectIndex].name;
    if (!window.confirm(`Deseja remover a matéria "${subName}" e todos os seus tópicos programados deste edital?`)) return;

    const updatedSubjects = preset.subjects.filter((_, idx) => idx !== subjectIndex);
    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });
  };

  // Add a topic to a preset subject
  const handleAddPresetTopic = (subjectIndex: number, topicName: string) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset || !topicName.trim()) return;

    const updatedSubjects = preset.subjects.map((sub, idx) => {
      if (idx === subjectIndex) {
        return {
          ...sub,
          topics: [...sub.topics, topicName.trim()]
        };
      }
      return sub;
    });

    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });
  };

  // Edit preset topic name
  const handleEditPresetTopicName = (subjectIndex: number, topicIndex: number, newTopicName: string) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset || !newTopicName.trim()) return;

    const updatedSubjects = preset.subjects.map((sub, idx) => {
      if (idx === subjectIndex) {
        const updatedTopics = sub.topics.map((t, tIdx) => tIdx === topicIndex ? newTopicName.trim() : t);
        return { ...sub, topics: updatedTopics };
      }
      return sub;
    });

    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });
  };

  // Delete topic from preset subject
  const handleDeletePresetTopic = (subjectIndex: number, topicIndex: number) => {
    const preset = presetsList.find(p => p.id === selectedPresetId);
    if (!preset) return;

    const updatedSubjects = preset.subjects.map((sub, idx) => {
      if (idx === subjectIndex) {
        const updatedTopics = sub.topics.filter((_, tIdx) => tIdx !== topicIndex);
        return { ...sub, topics: updatedTopics };
      }
      return sub;
    });

    updateCurrentPresetObj({
      ...preset,
      subjects: updatedSubjects
    });
  };

  // Initialize mapping when switching to library view
  useEffect(() => {
    if (viewMode === 'biblioteca' && selectedPresetId) {
      const preset = presetsList.find(p => p.id === selectedPresetId);
      if (preset) {
        const initialMapping: Record<string, string> = { ...mappingState };
        let changed = false;
        preset.subjects.forEach(presetSub => {
          if (!initialMapping[presetSub.name]) {
            const existingMatch = subjects.find(
              s => s.name.toLowerCase().trim() === presetSub.name.toLowerCase().trim()
            );
            initialMapping[presetSub.name] = existingMatch ? existingMatch.id : 'create';
            changed = true;
          }
        });
        if (changed) {
          setMappingState(initialMapping);
        }
      }
    }
  }, [viewMode, selectedPresetId, subjects, presetsList]);

  // Compile stats for each subject based on current filtered topics
  const statsBySubject = useMemo(() => {
    const stats: Record<string, {
      total: number;
      studied: number;
      completed: number;
      theoryCount: number;
      exercisesCount: number;
      revisionCount: number;
      questionsTotalSum: number;
      questionsCorrectSum: number;
      accuracy: number;
      progressPercent: number;
    }> = {};

    subjects.forEach(sub => {
      const subTopics = filteredTopics.filter(t => t.subjectId === sub.id);
      const total = subTopics.length;
      const studied = subTopics.filter(t => t.status !== 'pending').length;
      const completed = subTopics.filter(t => t.status === 'completed').length;
      const theoryCount = subTopics.filter(t => t.theoryDone).length;
      const exercisesCount = subTopics.filter(t => t.exercisesDone).length;
      const revisionCount = subTopics.filter(t => t.revisionDone).length;
      const questionsTotalSum = subTopics.reduce((acc, t) => acc + (t.questionsTotal || 0), 0);
      const questionsCorrectSum = subTopics.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
      const accuracy = questionsTotalSum > 0 ? Math.round((questionsCorrectSum / questionsTotalSum) * 100) : 0;
      
      // Calculate progress percentage of topics. Each topic has 3 checkpoints (theory, practical, revision).
      const maxPoints = total * 3;
      const earnedPoints = theoryCount + exercisesCount + revisionCount;
      const progressPercent = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

      stats[sub.id] = {
        total,
        studied,
        completed,
        theoryCount,
        exercisesCount,
        revisionCount,
        questionsTotalSum,
        questionsCorrectSum,
        accuracy,
        progressPercent
      };
    });

    return stats;
  }, [filteredTopics, subjects]);

  // Overall Global Stats for the Verticalized Edital (based on active filters)
  const globalStats = useMemo(() => {
    const totalTopics = filteredTopics.length;
    if (totalTopics === 0) return { overallProgress: 0, theoryProgress: 0, exercisesProgress: 0, revisionProgress: 0, hitRate: 0, totalTopics: 0 };
    
    const theoryDoneCount = filteredTopics.filter(t => t.theoryDone).length;
    const exercisesDoneCount = filteredTopics.filter(t => t.exercisesDone).length;
    const revisionDoneCount = filteredTopics.filter(t => t.revisionDone).length;
    const globalPoints = totalTopics * 3;
    const earnedPoints = theoryDoneCount + exercisesDoneCount + revisionDoneCount;
    
    const questionsTotalSum = filteredTopics.reduce((acc, t) => acc + (t.questionsTotal || 0), 0);
    const questionsCorrectSum = filteredTopics.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);

    return {
      overallProgress: Math.round((earnedPoints / globalPoints) * 100),
      theoryProgress: Math.round((theoryDoneCount / totalTopics) * 100),
      exercisesProgress: Math.round((exercisesDoneCount / totalTopics) * 100),
      revisionProgress: Math.round((revisionDoneCount / totalTopics) * 100),
      hitRate: questionsTotalSum > 0 ? Math.round((questionsCorrectSum / questionsTotalSum) * 100) : 0,
      totalTopics
    };
  }, [filteredTopics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
      case 'in-progress': return 'text-amber-700 bg-amber-50 border-amber-200/60';
      default: return 'text-slate-500 bg-slate-150/60 border-slate-200/40';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in-progress': return 'Estudando';
      default: return 'Pendente';
    }
  };

  return (
    <div className="space-y-6">
      {/* 📊 Global Progress Dashboard Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-indigo-950/40">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-400/20 text-indigo-200">
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {selectedPosition !== 'all' 
                  ? `Cargo: ${selectedPosition}` 
                  : selectedSubject !== 'all' 
                    ? `Matéria: ${subjects.find(s => s.id === selectedSubject)?.name || ''}` 
                    : 'Edital Completo'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Estudo Verticalizado</h1>
            <p className="text-slate-300 text-sm max-w-xl">
              {selectedPosition !== 'all'
                ? `Monitore o progresso do edital filtrado especificamente para o cargo "${selectedPosition}".`
                : 'Monitore a cobertura de cada matéria do edital em tempo real. Marque cada etapa vencida e visualize o progresso do seu aprendizado de ponta a ponta.'}
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 w-full lg:w-auto justify-around lg:justify-start">
            <div className="text-center space-y-1">
              <span className="text-xs text-indigo-200 block uppercase font-bold tracking-wider">
                {selectedPosition !== 'all' ? 'Progresso do Cargo' : 'Edital Completo'}
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                {globalStats.overallProgress}%
              </span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="text-center space-y-1">
              <span className="text-xs text-indigo-200 block uppercase font-bold tracking-wider">Média de Acertos</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-indigo-300">
                {globalStats.hitRate}%
              </span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="text-center space-y-1">
              <span className="text-xs text-indigo-200 block uppercase font-bold tracking-wider">Tópicos Ativos</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-white">
                {globalStats.totalTopics}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown progress rows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Matéria Teórica Absorvida
              </span>
              <span>{globalStats.theoryProgress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${globalStats.theoryProgress}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Bateria de Exercícios
              </span>
              <span>{globalStats.exercisesProgress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${globalStats.exercisesProgress}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Ciclo de Revisões
              </span>
              <span>{globalStats.revisionProgress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${globalStats.revisionProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View mode switcher tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
          <button
            onClick={() => setViewMode('verticalizado')}
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all",
              viewMode === 'verticalizado' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BarChart2 size={14} className="text-indigo-600" />
            Edital Verticalizado
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all",
              viewMode === 'table' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BookOpen size={14} className="text-indigo-600" />
            Lista de Tópicos (Planilha)
          </button>
          <button
            onClick={() => setViewMode('biblioteca')}
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all",
              viewMode === 'biblioteca' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Bookmark size={14} className="text-amber-500" />
            Biblioteca de Editais
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {onCleanupDuplicatesAndEmpty && (
            <button
              onClick={() => setShowCleanupConfirm(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-1.5 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold text-xs rounded-xl transition-all shadow-sm"
              title="Mesclar tópicos/matérias duplicados e remover matérias vazias"
            >
              <Sparkles size={14} className="text-rose-500 animate-pulse" />
              <span>Limpar Duplicados</span>
            </button>
          )}
          {onBulkAdd && (
            <button
              onClick={() => {
                if (subjects.length > 0) {
                  setBulkSubjectId(subjects[0].id);
                }
                setIsBulkAdding(true);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-1.5 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-all"
            >
              <RotateCcw size={15} className="rotate-90" />
              Importar em Lote
            </button>
          )}
          <button
            onClick={() => {
              if (subjects.length > 0) {
                setNewTopic(prev => ({ ...prev, subjectId: subjects[0].id }));
              }
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/10"
          >
            <Plus size={16} />
            Novo Tópico
          </button>
        </div>
      </div>

      {/* Filters (Search & Subject Filter or Collapse controls depending on view mode) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Buscar tópicos por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        
        {uniquePositions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none bg-white min-w-[180px] transition-all font-bold text-slate-700"
              >
                <option value="all">Filtro: Todos os Cargos</option>
                {uniquePositions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => setIsManagingCargos(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl transition-all shadow-sm"
              title="Gerenciar e renomear cargos cadastrados"
            >
              <Briefcase size={14} className="text-slate-400" />
              <span>Gerenciar Cargos</span>
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none bg-white min-w-[200px] transition-all font-medium text-slate-700"
            >
              <option value="all">Filtro: Todas as Matérias</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {viewMode === 'verticalizado' && (
            <>
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl bg-white transition-all whitespace-nowrap"
              >
                Expandir Todas
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl bg-white transition-all whitespace-nowrap"
              >
                Recolher Todas
              </button>
            </>
          )}
        </div>
      </div>

      {/* 📥 Popup Modal: Bulk importer for topics */}
      {isBulkAdding && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 text-indigo-600 mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <RotateCcw size={22} className="rotate-90 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Importação Verticalizada em Lote</h3>
                <p className="text-xs text-slate-500">Adicione os conteúdos programáticos do edital em segundos</p>
              </div>
            </div>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Selecione o Grupo/Matéria</label>
                  <select
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white text-sm"
                    required
                  >
                    <option value="">-- Escolha uma matéria cadastrada --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Cole a relação de conteúdos (um por linha)</label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Exemplo:&#10;Teoria Geral do Estado e dos Direitos&#10;Organização dos Poderes Constituídos&#10;Controle de Constitucionalidade no Brasil&#10;Garantias Processuais e Remédios`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-sans text-sm placeholder:text-slate-400"
                  required
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Você pode abrir o edital oficial em PDF do seu concurso, copiar o texto com a lista de tópicos da matéria, colar aqui e clicar em salvar. Nós cuidamos do resto!
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkAdding(false)}
                  className="px-4 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!bulkSubjectId || !bulkText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-50"
                >
                  Importar Conteúdo verticalizado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 Popup Modal: Simple manual Single Topic Add */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nome do Tópico</label>
                <input
                  type="text"
                  value={newTopic.name}
                  onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                  placeholder="Ex: Teoria Geral dos Direitos Fundamentais"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Matéria</label>
                <select
                  value={newTopic.subjectId}
                  onChange={(e) => setNewTopic({ ...newTopic, subjectId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white text-sm"
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
              >
                Salvar Tópico
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mode 1: 📊 BEAUTIFUL EDITAL VERTICALIZADO GRAPHS & COMPONENT CARDS */}
      {viewMode === 'verticalizado' && (
        <div className="space-y-6">
          {subjects.map((sub) => {
            const stats = statsBySubject[sub.id] || {
              total: 0, studied: 0, completed: 0, progressPercent: 0,
              theoryCount: 0, exercisesCount: 0, revisionCount: 0,
              questionsTotalSum: 0, questionsCorrectSum: 0, accuracy: 0
            };
            const isExpanded = !!expandedSubjects[sub.id];

            // Filter topics belonging to this subject and searching matching ones
            const subTopics = topics.filter(t => t.subjectId === sub.id && 
              (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
              (selectedPosition === 'all' || t.position === selectedPosition)
            );

            if ((searchTerm || selectedPosition !== 'all') && subTopics.length === 0) return null; // hide irrelevant cards during search or filtering

            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300"
                id={`verticalizado-subject-${sub.id}`}
              >
                {/* Subject Header Board */}
                <div 
                  onClick={() => toggleSubjectExpand(sub.id)} 
                  className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm"
                      style={{ backgroundColor: sub.color || '#4f46e5' }}
                    >
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                        {sub.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-500">
                        <span>{stats.total === 1 ? '1 Tópico' : `${stats.total} Tópicos`}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Média acertos: <strong className="text-slate-700">{stats.accuracy}%</strong></span>
                        {stats.studied > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-emerald-600 font-medium">Iniciado</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress bar & Expand controller */}
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none text-right space-y-1.5 md:min-w-[160px]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">Progresso</span>
                        <span className="font-extrabold text-indigo-600">{stats.progressPercent}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${stats.progressPercent}%`, 
                            backgroundColor: sub.color || '#4f46e5' 
                          }} 
                        />
                      </div>
                    </div>
                    <div className="p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50/50 hover:bg-slate-100/80 transition-colors">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded content: Content items structure list */}
                {isExpanded && (
                  <div className="bg-slate-50/30 border-t border-slate-50">
                    {subTopics.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150/60 p-2 text-slate-500 font-bold uppercase tracking-wider">
                              <th className="px-4 py-3 w-10 text-center">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                  checked={subTopics.length > 0 && subTopics.every(t => selectedTopicIds.includes(t.id))}
                                  onChange={() => toggleSelectAll(subTopics)}
                                />
                              </th>
                              <th className="px-6 py-3 font-extrabold text-[10px] w-5/12">Tópico</th>
                              <th className="px-4 py-3 font-extrabold text-[10px] text-center w-2/12">Teoria</th>
                              <th className="px-4 py-3 font-extrabold text-[10px] text-center w-2/12">Exercícios</th>
                              <th className="px-4 py-3 font-extrabold text-[10px] text-center w-2/12">Revisão</th>
                              <th className="px-4 py-3 font-extrabold text-[10px] text-center w-2/12">Resoluções</th>
                              <th className="px-6 py-3 font-extrabold text-[10px] text-right w-1/12">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {subTopics.map((topic) => {
                              const accuracyValue = topic.questionsTotal > 0 
                                ? Math.round((topic.questionsCorrect / topic.questionsTotal) * 100) 
                                : 0;

                              return (
                                <tr key={topic.id} className="hover:bg-indigo-50/10 transition-colors group">
                                  {/* Checkbox col */}
                                  <td className="px-4 py-3.5 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                      checked={selectedTopicIds.includes(topic.id)}
                                      onChange={() => toggleSelectTopic(topic.id)}
                                    />
                                  </td>
                                  {/* Topic Name */}
                                  <td className="px-6 py-3.5">
                                    <div className="flex flex-col gap-1 pr-4">
                                      {editingId === topic.id ? (
                                        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-md my-1 shadow-sm">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500">Nome do Tópico</label>
                                            <input
                                              type="text"
                                              value={tempName}
                                              onChange={(e) => setTempName(e.target.value)}
                                              className="px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full font-bold"
                                              autoFocus
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                              <label className="text-[9px] font-black uppercase text-slate-500">Órgão / Instituição</label>
                                              <input
                                                type="text"
                                                value={tempInstitution}
                                                onChange={(e) => setTempInstitution(e.target.value)}
                                                placeholder="Ex: INSS"
                                                className="px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                                              />
                                            </div>
                                            <div className="space-y-0.5">
                                              <label className="text-[9px] font-black uppercase text-slate-500">Cargo Estudado</label>
                                              <input
                                                type="text"
                                                value={tempPosition}
                                                onChange={(e) => setTempPosition(e.target.value)}
                                                placeholder="Ex: Técnico"
                                                className="px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex justify-end gap-1.5 pt-1">
                                            <button 
                                              type="button"
                                              onClick={cancelNameEdit}
                                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-extrabold"
                                            >
                                              Cancelar
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => saveNameEdit(topic.id)}
                                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold"
                                            >
                                              Salvar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <span className="font-bold text-slate-800 text-[13px]">{topic.name}</span>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={cn(
                                              "px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide border uppercase", 
                                              getStatusColor(topic.status)
                                            )}>
                                              {getStatusLabel(topic.status)}
                                            </span>
                                            {topic.institution && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide bg-rose-50 text-rose-700 border border-rose-100 uppercase">
                                                Órgão: {topic.institution}
                                              </span>
                                            )}
                                            {topic.position && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                                                Cargo: {topic.position}
                                              </span>
                                            )}
                                            {topic.lastStudyDate && (
                                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 ml-1 select-none">
                                                <Clock size={11} /> 
                                                estudado {new Date(topic.lastStudyDate).toLocaleDateString('pt-BR')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Checkbox columns: Teoria */}
                                  <td className="px-4 py-3.5 text-center">
                                    <button 
                                      onClick={() => onUpdate(topic.id, { theoryDone: !topic.theoryDone })}
                                      className={cn(
                                        "p-2 rounded-xl transition-all border inline-flex items-center justify-center", 
                                        topic.theoryDone 
                                          ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                                          : "text-slate-350 bg-white hover:bg-slate-50 border-slate-200"
                                      )}
                                      title={topic.theoryDone ? "Teoria Concluída" : "Marcar Teoria Estudada"}
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                  </td>

                                  {/* Checkbox columns: Exercicios */}
                                  <td className="px-4 py-3.5 text-center">
                                    <button 
                                      onClick={() => onUpdate(topic.id, { exercisesDone: !topic.exercisesDone })}
                                      className={cn(
                                        "p-2 rounded-xl transition-all border inline-flex items-center justify-center", 
                                        topic.exercisesDone 
                                          ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                                          : "text-slate-355 bg-white hover:bg-slate-50 border-slate-200"
                                      )}
                                      title={topic.exercisesDone ? "Exercícios Concluídos" : "Marcar Exercícios Praticados"}
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                  </td>

                                  {/* Checkbox columns: Revisao */}
                                  <td className="px-4 py-3.5 text-center">
                                    <button 
                                      onClick={() => onUpdate(topic.id, { revisionDone: !topic.revisionDone })}
                                      className={cn(
                                        "p-2 rounded-xl transition-all border inline-flex items-center justify-center", 
                                        topic.revisionDone 
                                          ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                                          : "text-slate-350 bg-white hover:bg-slate-50 border-slate-200"
                                      )}
                                      title={topic.revisionDone ? "Revisão Concluída" : "Marcar Revisão Realizada"}
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                  </td>

                                  {/* Questions Hit Ratio Column with Instant Inline Textbox */}
                                  <td className="px-4 py-3.5 text-center">
                                    {editingQuestionsId === topic.id ? (
                                      <div className="flex items-center justify-center gap-1 bg-indigo-50/50 p-1 rounded-xl border border-indigo-200 w-36 mx-auto">
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Acertos"
                                          value={tempQuestionsCorrect}
                                          onChange={(e) => setTempQuestionsCorrect(Math.max(0, parseInt(e.target.value) || 0))}
                                          className="w-11 py-0.5 text-xs text-center font-bold text-indigo-900 border border-indigo-200 rounded-lg outline-none bg-white"
                                          title="Acertos"
                                          autoFocus
                                        />
                                        <span className="text-slate-400 font-bold">/</span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Total"
                                          value={tempQuestionsTotal}
                                          onChange={(e) => setTempQuestionsTotal(Math.max(0, parseInt(e.target.value) || 0))}
                                          className="w-11 py-0.5 text-xs text-center font-bold text-indigo-900 border border-indigo-200 rounded-lg outline-none bg-white"
                                          title="Total respondido"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveQuestionsEdit(topic.id);
                                          }}
                                        />
                                        <button
                                          onClick={() => saveQuestionsEdit(topic.id)}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-1 rounded-md"
                                          type="button"
                                        >
                                          OK
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        onClick={() => handleStartQuestionsEdit(topic)}
                                        className="inline-flex flex-col items-center cursor-pointer hover:bg-indigo-100/40 px-3 py-1.5 rounded-xl border border-transparent hover:border-indigo-150 transition-all min-w-[80px]"
                                        title="Clique para lançar questões resolvidas"
                                      >
                                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                                          {topic.questionsCorrect || 0}/{topic.questionsTotal || 0}
                                        </span>
                                        <span className={cn(
                                          "text-[10px] font-black", 
                                          accuracyValue >= 75 ? "text-emerald-600" : accuracyValue >= 50 ? "text-amber-600" : "text-rose-600"
                                        )}>
                                          {accuracyValue}%
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="px-6 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => onStudy(topic.id)}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Registrar Estudo Avançado"
                                      >
                                        <BookOpen size={14} />
                                      </button>
                                      <button 
                                        onClick={() => setTopicToReset(topic)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Resetar Tópico / Novo Ciclo de Estudo"
                                      >
                                        <RotateCcw size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleEditName(topic)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Renomear Tópico"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteTopic(topic)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Excluir Tópico permanentemente"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        <p className="text-xs">Nenhum estudo verticalizado cadastrado nesta matéria. Crie tópicos acima para iniciar.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mode 2: 📋 FULL SPREADSHEET TÓPICOS LIST (CURRENT LIST GRID FOR RAPID SCROLLING) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250/60 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      checked={filteredTopics.length > 0 && filteredTopics.every(t => selectedTopicIds.includes(t.id))}
                      onChange={() => toggleSelectAll(filteredTopics)}
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-extrabold tracking-wider w-4/12">Tópico</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold tracking-wider w-2/12">Status</th>
                  <th className="px-4 py-4 text-[10px] font-extrabold tracking-wider text-center w-1/12">Teoria</th>
                  <th className="px-4 py-4 text-[10px] font-extrabold tracking-wider text-center w-1/12">Exercícios</th>
                  <th className="px-4 py-4 text-[10px] font-extrabold tracking-wider text-center w-1/12">Revisão</th>
                  <th className="px-4 py-4 text-[10px] font-extrabold tracking-wider text-center w-2/12">Questões</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold tracking-wider text-right w-1/12">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTopics.map((topic) => {
                  const subject = subjectMap.get(topic.subjectId);
                  const accuracy = topic.questionsTotal > 0 
                    ? Math.round((topic.questionsCorrect / topic.questionsTotal) * 100) 
                    : 0;

                  return (
                    <tr key={topic.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Checkbox col */}
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          checked={selectedTopicIds.includes(topic.id)}
                          onChange={() => toggleSelectTopic(topic.id)}
                        />
                      </td>
                      {/* Name col */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {editingId === topic.id ? (
                            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-md my-1 shadow-sm">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500">Nome do Tópico</label>
                                <input
                                  type="text"
                                  value={tempName}
                                  onChange={(e) => setTempName(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full font-bold"
                                  autoFocus
                                />
                              </div>
                              {/* Órgão and Cargo inputs removed */}
                              <div className="flex justify-end gap-1.5 pt-1">
                                <button 
                                  type="button"
                                  onClick={cancelNameEdit}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-extrabold"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => saveNameEdit(topic.id)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 text-[13px]">{topic.name}</span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject?.color || '#ccc' }} />
                                  {subject?.name}
                                </span>
                                {/* Badges for Órgão and Cargo removed */}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status indicator button */}
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            const nextStatus = topic.status === 'pending' ? 'in-progress' : topic.status === 'in-progress' ? 'completed' : 'pending';
                            onUpdate(topic.id, { status: nextStatus });
                          }}
                          className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all shadow-sm/5", getStatusColor(topic.status))}
                        >
                          {getStatusLabel(topic.status)}
                        </button>
                      </td>

                      {/* Check Teoria */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => onUpdate(topic.id, { theoryDone: !topic.theoryDone })}
                          className={cn("p-1.5 rounded-lg transition-colors border", topic.theoryDone ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-slate-350 bg-white border-slate-200 hover:bg-slate-50")}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>

                      {/* Check Exercicios */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => onUpdate(topic.id, { exercisesDone: !topic.exercisesDone })}
                          className={cn("p-1.5 rounded-lg transition-colors border", topic.exercisesDone ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-slate-350 bg-white border-slate-200 hover:bg-slate-50")}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>

                      {/* Check Revisao */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => onUpdate(topic.id, { revisionDone: !topic.revisionDone })}
                          className={cn("p-1.5 rounded-lg transition-colors border", topic.revisionDone ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-slate-350 bg-white border-slate-200 hover:bg-slate-50")}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>

                      {/* Inline questions count */}
                      <td className="px-4 py-4 text-center">
                        {editingQuestionsId === topic.id ? (
                          <div className="flex items-center justify-center gap-1 bg-indigo-50/50 p-1.5 rounded-xl border border-indigo-200 w-36 mx-auto">
                            <input
                              type="number"
                              min="0"
                              placeholder="Acertos"
                              value={tempQuestionsCorrect}
                              onChange={(e) => setTempQuestionsCorrect(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-11 py-0.5 text-xs text-center font-bold text-indigo-900 border border-indigo-250 rounded-lg outline-none bg-white"
                              title="Acertos"
                              autoFocus
                            />
                            <span className="text-slate-400 font-bold">/</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Total"
                              value={tempQuestionsTotal}
                              onChange={(e) => setTempQuestionsTotal(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-11 py-0.5 text-xs text-center font-bold text-indigo-900 border border-indigo-250 rounded-lg outline-none bg-white"
                              title="Total respondido"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveQuestionsEdit(topic.id);
                              }}
                            />
                            <button
                              onClick={() => saveQuestionsEdit(topic.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold p-1 rounded-md"
                              type="button"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleStartQuestionsEdit(topic)}
                            className="inline-flex flex-col items-center cursor-pointer hover:bg-indigo-100/40 px-3 py-1.5 rounded-xl border border-transparent hover:border-indigo-150 transition-all min-w-[80px]"
                            title="Clique para lançar questões resolvidas"
                          >
                            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                              {topic.questionsCorrect || 0}/{topic.questionsTotal || 0}
                            </span>
                            <span className={cn(
                              "text-[10px] font-black", 
                              accuracy >= 75 ? "text-emerald-600" : accuracy >= 50 ? "text-amber-600" : "text-rose-600"
                            )}>
                              {accuracy}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* General actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onStudy(topic.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Registrar Estudo Avançado"
                          >
                            <BookOpen size={15} />
                          </button>
                          <button 
                            onClick={() => setTopicToReset(topic)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Reiniciar Ciclo"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button 
                            onClick={() => handleEditName(topic)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar Nome"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTopic(topic)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTopics.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <p>Nenhum tópico encontrado.</p>
            </div>
          )}
        </div>
      )}
      {viewMode === 'biblioteca' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-800">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-bold text-amber-400 mb-4 animate-pulse">
                <Sparkles size={12} />
                Editais Customizáveis e Importações Ilimitadas
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                Biblioteca de Editais Verticalizados
              </h2>
              <p className="text-slate-350 text-xs sm:text-sm leading-relaxed font-medium">
                Escolha o edital de concurso desejado para carregar a estrutura de disciplinas. <strong className="text-white font-extrabold text-indigo-400">Agora você pode alterar, adicionar ou remover matérias e tópicos livremente antes de importar!</strong> Mapeie cada conteúdo em sua conta ou use matérias novas criadas automaticamente.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8 select-none">
              <Bookmark size={300} className="text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Preset Contest Selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Concursos Disponíveis</h3>
                <button
                  type="button"
                  onClick={handleCreateNewPreset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 rounded-xl transition-all border border-indigo-200 hover:border-indigo-300 shadow-sm/5 shrink-0"
                >
                  <Plus size={13} />
                  Criar Edital
                </button>
              </div>

              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {presetsList.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  const totalTopics = preset.subjects.reduce((acc, s) => acc + s.topics.length, 0);
                  const isCustom = preset.id.startsWith('custom-preset-');
                  const original = EDITAL_PRESETS.find(o => o.id === preset.id);
                  const isModified = original ? JSON.stringify(original) !== JSON.stringify(preset) : false;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative select-none",
                        isSelected
                          ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10"
                          : "bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-300 shadow-sm"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex flex-wrap gap-1">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border",
                              preset.difficulty === 'Superior' 
                                ? "bg-indigo-50 text-indigo-700 border-indigo-120"
                                : "bg-sky-50 text-sky-700 border-sky-120"
                            )}>
                              {preset.difficulty}
                            </span>
                            {isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100">
                                Criação Sua
                              </span>
                            )}
                            {isModified && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-100">
                                Customizado
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">Banca: {preset.banca}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight mb-1 group-hover:text-indigo-600">
                          {preset.title}
                        </h4>
                        <span className="text-xs font-black text-slate-500 tracking-wider uppercase mb-2 block">{preset.institution}</span>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {preset.subjects.length} Matérias | <strong>{totalTopics}</strong> Tópicos
                        </span>
                        
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleRestorePresetToDefault(preset.id)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors"
                              title="Restaurar padrão do sistema para este edital"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePreset(preset.id, e)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors"
                              title="Deletar este edital"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-transform",
                            isSelected ? "bg-indigo-600 text-white translate-x-0.5" : "bg-slate-100 text-slate-500"
                          )}>
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Sequential Checklist Viewer & Mapping Panel */}
            <div className="lg:col-span-8 space-y-6">
              {(() => {
                const preset = presetsList.find(p => p.id === selectedPresetId);
                if (!preset) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                      Nenhum edital selecionado ou cadastrado.
                    </div>
                  );
                }

                const totalTopics = preset.subjects.reduce((acc, s) => acc + s.topics.length, 0);

                return (
                  <div className="space-y-6">
                    {/* Part A: Sequential List Preview */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-150 bg-slate-50/60">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                              <CheckSquare size={16} className="text-indigo-600" />
                              Edição & Visualização do Edital
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Configure e edite em tempo real as matérias e tópicos programáticos do concurso selecionado
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPresetMetaEdit(preset)}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-extrabold text-[11px] rounded-lg border border-indigo-150 flex items-center gap-1 transition-all"
                            >
                              <Edit2 size={11} />
                              Dados do Concurso
                            </button>
                            <span className="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-extrabold text-[11px] rounded-lg border border-slate-200 shrink-0">
                              {totalTopics} Tópicos
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                        {preset.subjects.map((pSub, pSubIdx) => (
                          <div key={pSubIdx} className="p-4 bg-white hover:bg-slate-50/10 transition-colors">
                            {/* Subject Title Inline Editing */}
                            <div className="flex items-center justify-between gap-4 mb-2">
                              {editingPresetSubjectName?.subjectIndex === pSubIdx ? (
                                <div className="flex items-center gap-1.5 w-full max-w-md" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingPresetSubjectName.name}
                                    onChange={(e) => setEditingPresetSubjectName({ ...editingPresetSubjectName, name: e.target.value })}
                                    className="px-2 py-1 text-xs border border-indigo-400 rounded-lg outline-none bg-white w-full font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleEditPresetSubjectName(pSubIdx, editingPresetSubjectName.name);
                                        setEditingPresetSubjectName(null);
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingPresetSubjectName(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleEditPresetSubjectName(pSubIdx, editingPresetSubjectName.name);
                                      setEditingPresetSubjectName(null);
                                    }}
                                    className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded shrink-0 transition-all"
                                    title="Confirmar Nome"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPresetSubjectName(null)}
                                    className="p-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded shrink-0 transition-all"
                                    title="Cancelar"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full group/subject select-none">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: pSub.color }} />
                                    <span className="font-extrabold text-slate-800 text-[13px]">{pSub.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                      {pSub.topics.length} tópicos
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/subject:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPresetSubjectName({ subjectIndex: pSubIdx, name: pSub.name })}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded transition-all"
                                      title="Renomear disciplina"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePresetSubject(pSubIdx)}
                                      className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-150 rounded transition-all"
                                      title="Excluir disciplina"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Topics List with inline hover actions & editor */}
                            <div className="pl-4 border-l border-slate-250 ml-1 py-1 space-y-1.5">
                              {pSub.topics.map((pTopic, idx) => {
                                const isEditingTopic = editingPresetTopicName?.subjectIndex === pSubIdx && editingPresetTopicName?.topicIndex === idx;

                                return (
                                  <div key={idx} className="flex items-start justify-between gap-3 text-xs text-slate-650 font-medium group/topic py-1 hover:bg-slate-50/70 rounded px-2 -mx-2 transition-colors">
                                    {isEditingTopic ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <input
                                          type="text"
                                          value={editingPresetTopicName.name}
                                          onChange={(e) => setEditingPresetTopicName({ ...editingPresetTopicName, name: e.target.value })}
                                          className="px-2 py-1 text-xs border border-indigo-400 rounded bg-white outline-none w-full"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleEditPresetTopicName(pSubIdx, idx, editingPresetTopicName.name);
                                              setEditingPresetTopicName(null);
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingPresetTopicName(null);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleEditPresetTopicName(pSubIdx, idx, editingPresetTopicName.name);
                                            setEditingPresetTopicName(null);
                                          }}
                                          className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded shrink-0"
                                        >
                                          <Check size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingPresetTopicName(null)}
                                          className="p-1 bg-rose-50 text-rose-700 border border-rose-150 rounded shrink-0"
                                        >
                                          <X size={11} />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                          <span className="text-[9px] font-black text-slate-400 mt-0.5 font-mono select-none">{(idx + 1).toString().padStart(2, '0')}.</span>
                                          <span className="text-slate-750 font-semibold">{pTopic}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setEditingPresetTopicName({ subjectIndex: pSubIdx, topicIndex: idx, name: pTopic })}
                                            className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition"
                                            title="Editar tópico"
                                          >
                                            <Edit2 size={10} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePresetTopic(pSubIdx, idx)}
                                            className="p-0.5 text-slate-400 hover:text-red-600 rounded transition"
                                            title="Excluir tópico"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Quick Mini Adder in-situ for each subject block */}
                              <div className="pt-1 flex items-center gap-1.5 max-w-md mt-1">
                                <input
                                  type="text"
                                  placeholder="Digite um tópico para adicionar..."
                                  value={newPresetTopicName[pSubIdx] || ''}
                                  onChange={(e) => setNewPresetTopicName({ ...newPresetTopicName, [pSubIdx]: e.target.value })}
                                  className="px-2.5 py-1 text-[11px] border border-slate-200 bg-slate-50/50 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 w-full"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddPresetTopic(pSubIdx, newPresetTopicName[pSubIdx] || '');
                                      setNewPresetTopicName({ ...newPresetTopicName, [pSubIdx]: '' });
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddPresetTopic(pSubIdx, newPresetTopicName[pSubIdx] || '');
                                    setNewPresetTopicName({ ...newPresetTopicName, [pSubIdx]: '' });
                                  }}
                                  className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-[10px] font-black shrink-0 transition-all flex items-center gap-0.5"
                                >
                                  <Plus size={11} />
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add subject block inside right preview panel */}
                      <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                        {isAddingPresetSubject ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                            <input
                              type="text"
                              placeholder="Digite o nome da nova matéria (Ex: Direito Constitucional)..."
                              value={newPresetSubjectName}
                              onChange={(e) => setNewPresetSubjectName(e.target.value)}
                              className="px-3 py-2 text-xs border border-slate-205 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 w-full font-bold text-slate-800"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newPresetSubjectName.trim()) {
                                    handleAddPresetSubject(newPresetSubjectName);
                                    setNewPresetSubjectName('');
                                    setIsAddingPresetSubject(false);
                                  }
                                }
                                if (e.key === 'Escape') {
                                  setIsAddingPresetSubject(false);
                                  setNewPresetSubjectName('');
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingPresetSubject(false);
                                  setNewPresetSubjectName('');
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (newPresetSubjectName.trim()) {
                                    handleAddPresetSubject(newPresetSubjectName);
                                    setNewPresetSubjectName('');
                                    setIsAddingPresetSubject(false);
                                  }
                                }}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-all"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => setIsAddingPresetSubject(true)}
                              className="px-4 py-2.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-indigo-200 hover:border-indigo-300 rounded-xl shadow-sm/5 transition-all flex items-center gap-2"
                            >
                              <Plus size={14} />
                              Adicionar Nova Disciplina ao Edital
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Part B: Intelligent Topic & Subject Mapper */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <Layers size={16} className="text-indigo-600" />
                          Mapeamento Inteligente de Disciplinas
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Escolha onde salvar os tópicos em sua conta. Recomendamos criar novas matérias com os nomes e cores sugeridos pelo concurso, ou você pode mesclar os itens com suas disciplinas já existentes.
                        </p>
                      </div>

                      <div className="space-y-4 pt-1">
                        {preset.subjects.map((pSub, pSubIdx) => {
                          const value = mappingState[pSub.name] || 'create';

                          return (
                            <div 
                              key={pSubIdx} 
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: pSub.color }} />
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-800 text-[13px] truncate">{pSub.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{pSub.topics.length} tópicos a serem criados sequencialmente</p>
                                </div>
                              </div>

                              <div className="sm:min-w-[240px]">
                                <select
                                  value={value}
                                  disabled={isImportingPreset}
                                  onChange={(e) => setMappingState({ ...mappingState, [pSub.name]: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-205 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white text-xs font-bold"
                                >
                                  <option value="create">
                                    ➕ Criar Nova Matéria: "{pSub.name.length > 25 ? pSub.name.substring(0, 22) + '...' : pSub.name}"
                                  </option>
                                  {subjects.map(s => (
                                    <option key={s.id} value={s.id}>
                                      🔗 Associar a: "{s.name}"
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-2 max-w-md">
                          <HelpCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium">
                            <strong>Dica SDE:</strong> Ao importar, nós criamos o checklist de teoria, exercícios e revisões inteiramente limpos. Você pode começar a registrar seu progresso imediatamente em qualquer dispositivo!
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleImportPreset}
                          disabled={isImportingPreset || totalTopics === 0}
                          className="px-6 py-3.5 bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md focus:ring-4 focus:ring-indigo-120/50 flex items-center justify-center gap-2.5 shrink-0 disabled:opacity-75 min-w-[200px]"
                        >
                          {isImportingPreset ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Mapeando e Importando...
                            </>
                          ) : (
                            <>
                              <Bookmark size={15} />
                              Importar "{preset.title}"
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 📝 Edit Preset Metadata Modal */}
      {isEditingPresetMeta && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 text-indigo-600 mb-4">
              <div className="p-3 bg-indigo-50 rounded-full">
                <Edit2 size={24} />
              </div>
              <h3 className="text-lg font-bold">Editar Informações do Concurso</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Título / Cargo</label>
                  <input
                    type="text"
                    value={presetMetaForm.title}
                    onChange={(e) => setPresetMetaForm({ ...presetMetaForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Órgão / Instituição</label>
                  <input
                    type="text"
                    value={presetMetaForm.institution}
                    onChange={(e) => setPresetMetaForm({ ...presetMetaForm, institution: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Banca Examinadora</label>
                  <input
                    type="text"
                    value={presetMetaForm.banca}
                    onChange={(e) => setPresetMetaForm({ ...presetMetaForm, banca: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Escolaridade / Dificuldade</label>
                  <select
                    value={presetMetaForm.difficulty}
                    onChange={(e) => setPresetMetaForm({ ...presetMetaForm, difficulty: e.target.value as 'Médio' | 'Superior' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Médio">Médio</option>
                    <option value="Superior">Superior</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Breve Descrição</label>
                <textarea
                  value={presetMetaForm.description}
                  rows={3}
                  onChange={(e) => setPresetMetaForm({ ...presetMetaForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  placeholder="Por que estudar para esta prova?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setIsEditingPresetMeta(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePresetMeta}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 Reset Cycle Confirmation Modal */}
      {topicToReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-indigo-600 mb-4">
              <div className="p-3 bg-indigo-50 rounded-full">
                <RotateCcw size={24} />
              </div>
              <h3 className="text-lg font-bold">Repetir Ciclo</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Deseja reiniciar o progresso de <strong>{topicToReset.name}</strong>? 
              Isso irá desmarcar a teoria, exercícios e revisão, permitindo que você inicie um novo ciclo de estudos para este tópico.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTopicToReset(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleResetCycle(topicToReset)}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Reiniciar Ciclo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Delete Confirmation Modal */}
      {topicToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir o tópico <strong>{topicToDelete.name}</strong>? 
              Isso removerá permanentemente todos os flashcards e registros de estudo associados a este tópico em todas as abas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTopicToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTopic}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : 'Excluir Tópico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ Floating Bulk Actions Toolbar */}
      {selectedTopicIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex flex-col md:flex-row items-center gap-4 border border-slate-800 animate-in slide-in-from-bottom-4 duration-300 w-11/12 max-w-4xl">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
              {selectedTopicIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300">
              {selectedTopicIds.length === 1 ? 'tópico selecionado' : 'tópicos selecionados'}
            </span>
            <button
              onClick={() => setSelectedTopicIds([])}
              className="text-slate-400 hover:text-white transition-colors text-xs font-semibold ml-auto md:ml-0"
              title="Desmarcar todos"
            >
              Desmarcar todos
            </button>
          </div>
          
          <div className="h-px md:h-8 w-full md:w-[1px] bg-slate-800 my-1 md:my-0" />
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end ml-auto">
            {/* Alterar Matéria Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mover para:</span>
              <select
                value={bulkActionSubjectId}
                onChange={(e) => setBulkActionSubjectId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:ring-0 text-white cursor-pointer pr-8 outline-none"
              >
                <option value="" className="text-slate-900">Selecionar Matéria</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkUpdateSubject}
                disabled={!bulkActionSubjectId || isUpdatingBulk}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[11px] font-extrabold rounded-lg transition-all"
              >
                {isUpdatingBulk ? 'Movendo...' : 'Mover'}
              </button>
            </div>

            {/* Alterar Cargo Input removed */}

            {/* Excluir selecionados */}
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      )}

      {/* 🗑️ Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-full">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold">Excluir {selectedTopicIds.length} Tópicos?</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Esta ação removerá permanentemente os <strong>{selectedTopicIds.length}</strong> tópicos selecionados, juntamente com todos os seus flashcards, resoluções de questões e progresso de estudo. Esta operação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isUpdatingBulk}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isUpdatingBulk}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdatingBulk ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : 'Excluir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💼 Gerenciar Cargos Modal */}
      {isManagingCargos && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Gerenciar Cargos</h3>
                  <p className="text-xs text-slate-500">Renomeie cargos para manter seus estudos consistentes</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsManagingCargos(false);
                  setEditingCargoName(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {uniquePositions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p className="text-sm font-medium">Nenhum cargo encontrado cadastrado nos seus tópicos.</p>
                </div>
              ) : (
                uniquePositions.map(pos => {
                  const topicsCount = topics.filter(t => t.position === pos).length;
                  const isEditing = editingCargoName === pos;

                  return (
                    <div key={pos} className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-4">
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={tempCargoEditName}
                            onChange={(e) => setTempCargoEditName(e.target.value)}
                            placeholder="Nome do cargo..."
                            className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameCargoAction(pos, tempCargoEditName)}
                            disabled={isSavingCargoName || !tempCargoEditName.trim()}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {isSavingCargoName ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            <span>Salvar</span>
                          </button>
                          <button
                            onClick={() => setEditingCargoName(null)}
                            disabled={isSavingCargoName}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <Briefcase size={14} className="text-indigo-600" />
                              {pos}
                            </span>
                            <span className="text-xs text-slate-500 block">
                              {topicsCount === 1 ? '1 Tópico cadastrado' : `${topicsCount} Tópicos cadastrados`}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setEditingCargoName(pos);
                              setTempCargoEditName(pos);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
              <button
                onClick={() => {
                  setIsManagingCargos(false);
                  setEditingCargoName(null);
                }}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧹 Cleanup Duplicates and Empty Confirmation Modal */}
      {showCleanupConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-full">
                <Sparkles size={24} className="text-rose-600" />
              </div>
              <h3 className="text-lg font-bold">Organizar e Deduplicar?</h3>
            </div>
            <div className="text-slate-600 mb-6 text-xs leading-relaxed space-y-2">
              <p>Esta ação irá verificar o seu edital e organizar de forma inteligente:</p>
              <p>• <strong>Mesclar tópicos repetidos</strong> sob a mesma matéria, unificando seu progresso, questões resolvidas e flashcards criados.</p>
              <p>• <strong>Mesclar matérias repetidas</strong> de mesmo nome.</p>
              <p>• <strong>Excluir matérias vazias</strong> que não possuem nenhum tópico, flashcard ou questão associada.</p>
              <p className="font-semibold text-rose-600 pt-1">Esta operação é 100% segura para o seu progresso e ajudará a manter seus estudos limpos e organizados!</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                disabled={isCleaningUp}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCleanupAction}
                disabled={isCleaningUp}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-xs"
              >
                {isCleaningUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Organizando...
                  </>
                ) : 'Organizar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
