export interface Subject {
  id: string;
  uid: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
}

export interface Topic {
  id: string;
  uid: string;
  subjectId: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed';
  theoryDone: boolean;
  exercisesDone: boolean;
  revisionDone: boolean;
  questionsTotal: number;
  questionsCorrect: number;
  lastStudyDate?: number;
  createdAt: number;
  position?: string; // Cargo associado
  institution?: string; // Órgão associado
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string;
  date: number;
  durationMinutes: number;
  questionsTotal: number;
  questionsCorrect: number;
  notes?: string;
}

export interface Flashcard {
  id: string;
  uid: string;
  subjectId: string;
  topicId?: string;
  front: string;
  back: string;
  explanation?: string;
  imageUrl?: string;
  caption?: string;
  
  // SRS (Spaced Repetition System) - SM-2 Algorithm
  interval: number; // in days
  repetition: number; // consecutive correct reviews
  easeFactor: number; // default 2.5
  nextReviewDate: number; // timestamp
  
  createdAt: number;
  lastReviewedAt?: number;
  isPublic?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  subjectId: string;
  topicId?: string;
  year: number;
  source: 'ai' | 'human';
  bank?: string; // Banca
  institution?: string; // Instituição
  position?: string; // Cargo
  level?: string; // Nível
  areaOfFormation?: string;
  areaOfAction?: string;
  modality?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: number;
  authorId: string;
  imageUrl?: string;
  imageAlign?: 'local' | 'center' | 'left' | 'right';
}

export interface UserSubscription {
  uid: string;
  plan: 'free' | 'pro' | 'elite';
  status: string;
  flashcardsCount: number;
  updatedAt: number;
  expiresAt?: number | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  role: 'admin' | 'user' | 'colaborador';
  lastAccess?: number;
}

export interface QuestionAnswer {
  id: string;
  uid: string;
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  answeredAt: number;
}

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  link: string;
  createdAt: number;
}
