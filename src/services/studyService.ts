import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  setDoc,
  getDoc,
  Timestamp,
  limit,
  writeBatch,
  runTransaction,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage, auth } from '../lib/firebase';
import { PMMA_QUESTIONS, PMMA_FLASHCARDS } from '../data/pmmaEstatutoData';
import { Subject, Topic, StudySession, UserProfile, Flashcard, UserSubscription, Question, QuestionAnswer, StoreProduct } from '../types';
import { sanitizeText } from '../lib/utils';

// In-memory lookup caches to prevent redundant Firestore reads during bulk CSV imports
const subjectMemoryCache = new Map<string, string>();
const topicMemoryCache = new Map<string, string>();

// Shared subscriber registry (Multicasting Cache) to dramatically reduce Firestore read units
interface CacheEntry {
  data: any;
  unsubscribe: () => void;
  listeners: Set<(data: any) => void>;
}

const activeSubscriptions: Record<string, CacheEntry> = {};

function multicastSubscribe(
  cacheKey: string,
  createQuery: () => any,
  mapSnapshot: (snapshot: any) => any,
  callback: (data: any) => void,
  errorHandler: (error: any) => void
) {
  if (!activeSubscriptions[cacheKey]) {
    const listeners = new Set<(data: any) => void>();
    listeners.add(callback);

    let unsubscribedFromServer = false;
    const refOrQuery = createQuery();
    
    const unsubscribeFs = onSnapshot(refOrQuery, (snapshot: any) => {
      if (unsubscribedFromServer) return;
      const data = mapSnapshot(snapshot);
      activeSubscriptions[cacheKey].data = data;
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in multicast callback for key ${cacheKey}`, e);
        }
      });
    }, (error) => {
      errorHandler(error);
    });

    activeSubscriptions[cacheKey] = {
      data: null,
      unsubscribe: () => {
        unsubscribedFromServer = true;
        unsubscribeFs();
      },
      listeners
    };
  } else {
    const entry = activeSubscriptions[cacheKey];
    entry.listeners.add(callback);
    if (entry.data !== null) {
      const currentData = entry.data;
      setTimeout(() => {
        if (entry.listeners.has(callback)) {
          callback(currentData);
        }
      }, 0);
    }
  }

  return () => {
    const entry = activeSubscriptions[cacheKey];
    if (entry) {
      entry.listeners.delete(callback);
      if (entry.listeners.size === 0) {
        // Keep active for a grace period of 60 seconds to avoid duplicate immediate queries during rapid tab transitions
        setTimeout(() => {
          if (entry.listeners.size === 0) {
            entry.unsubscribe();
            delete activeSubscriptions[cacheKey];
          }
        }, 60000);
      }
    }
  };
}


export const studyService = {
  // Helper to remove undefined properties before saving to Firestore
  cleanObject(obj: any) {
    if (!obj || typeof obj !== 'object') return obj;
    const cleaned: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  },

  // Image Upload
  async uploadImage(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  // User Profile
  async ensureUserProfile(uid: string, email: string, displayName: string, photoURL?: string) {
    const userRef = doc(db, 'users', uid);
    try {
      const now = Date.now();
      const lastWriteKey = `last_access_write_${uid}`;
      const lastWriteStr = typeof localStorage !== 'undefined' ? localStorage.getItem(lastWriteKey) : null;
      const lastWrite = lastWriteStr ? parseInt(lastWriteStr, 10) : 0;
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const isAdmin = email === 'oeditordeimagens@gmail.com';

      // Skip redundant reads & writes if updated within the last 6 hours
      if (now - lastWrite < SIX_HOURS && lastWrite > 0) {
        return;
      }

      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const profile: Record<string, any> = {
          uid,
          email,
          displayName: displayName || 'Usuário',
          createdAt: now,
          lastAccess: now,
          role: isAdmin ? 'admin' : 'user'
        };
        if (photoURL) {
          profile.photoURL = photoURL;
        }
        await setDoc(userRef, this.cleanObject(profile));
      } else {
        const data = userDoc.data();
        const updates: any = {};
        
        if (!data.role) {
          updates.role = isAdmin ? 'admin' : 'user';
        }

        if (photoURL && data.photoURL !== photoURL) {
          updates.photoURL = photoURL;
        }

        if (displayName && displayName !== 'Usuário' && data.displayName !== displayName) {
          updates.displayName = displayName;
        }

        if (now - (data.lastAccess || 0) > SIX_HOURS) {
          updates.lastAccess = now;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(userRef, this.cleanObject(updates));
        }
      }

      // Check/Initialize Subscription with 10-day Elite Trial for non-admins
      const subRef = doc(db, 'subscriptions', uid);
      const subDoc = await getDoc(subRef);
      const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

      if (!subDoc.exists()) {
        if (isAdmin) {
          await setDoc(subRef, {
            uid,
            plan: 'elite',
            expiresAt: null,
            updatedAt: now
          });
        } else {
          await setDoc(subRef, {
            uid,
            plan: 'elite',
            expiresAt: now + TEN_DAYS,
            createdAt: now,
            updatedAt: now,
            isTrial: true
          });
        }
      } else {
        const subData = subDoc.data();
        if (isAdmin) {
          if (subData.plan !== 'elite' || subData.expiresAt !== null) {
            await updateDoc(subRef, { plan: 'elite', expiresAt: null, updatedAt: now });
          }
        } else {
          // If non-admin has no expiresAt and no trial set up yet (and is not already marked free explicitly)
          if (!subData.expiresAt && !subData.trialGrantedAt && !subData.isTrial && subData.plan !== 'free') {
            await updateDoc(subRef, {
              plan: 'elite',
              expiresAt: now + TEN_DAYS,
              trialGrantedAt: now,
              isTrial: true,
              updatedAt: now
            });
          }
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(lastWriteKey, String(now));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  },

  subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    const cacheKey = `profile_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => doc(db, 'users', uid),
      (snapshot) => snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserProfile) : null,
      callback,
      (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
    );
  },

  // Admin: Get all users
  subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
    const cacheKey = 'all_users';
    return multicastSubscribe(
      cacheKey,
      () => collection(db, 'users'),
      (snapshot) => snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );
  },

  async updateUserRole(uid: string, role: 'admin' | 'user' | 'colaborador') {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      
      // If the role is admin or colaborador, they might need different plan access logic
      // For now, let's keep the logic where admin gets Elite.
      if (role === 'admin') {
        await this.updatePlan(uid, 'elite');
      } else if (role === 'colaborador') {
        // Collaborators get Pro by default to have enough space? Or just keep current.
        // User didn't specify plan for collaborator, but usually they'd need more than free.
        await this.updatePlan(uid, 'pro');
      } else if (role === 'user') {
        await this.updatePlan(uid, 'free');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  // Questions
  async addQuestion(question: any) {
    try {
      // Sanitize fields
      const sanitizedQuestion = {
        ...question,
        text: sanitizeText(question.text),
        explanation: sanitizeText(question.explanation || ''),
        bank: sanitizeText(question.bank || ''),
        options: (question.options || []).map((o: any) => sanitizeText(o))
      };

      // Check for global duplicate to prevent "infinite duplicate questions"
      const q = query(
        collection(db, 'questions'), 
        where('text', '==', sanitizedQuestion.text)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Double check options to ensure it's the exact same question
        const isDuplicate = snapshot.docs.some(doc => {
          const data = doc.data();
          return JSON.stringify(data.options) === JSON.stringify(question.options);
        });
        if (isDuplicate) {
          console.log("Duplicate question detected, skipping creation.");
          return snapshot.docs[0].id;
        }
      }

      const docRef = await addDoc(collection(db, 'questions'), {
        ...question,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'questions');
    }
  },

  async bulkAddQuestions(questions: any[]) {
    try {
      const processedQuestions: any[] = [];
      const seenInBatch = new Set<string>();

      // Internal deduplication of the incoming array
      for (const q of questions) {
        if (!q || !q.text) continue;
        const key = `${q.text.trim().toLowerCase()}|${JSON.stringify((q.options || []).map((o: string) => o.trim().toLowerCase()))}`;
        if (!seenInBatch.has(key)) {
          seenInBatch.add(key);
          processedQuestions.push(q);
        }
      }

      if (processedQuestions.length === 0) return;

      // Extract subjectIds to do targeted batch query instead of per-question queries
      const subjectIds = Array.from(new Set(processedQuestions.map(q => q.subjectId).filter(Boolean)));
      const existingKeys = new Set<string>();

      if (subjectIds.length > 0 && subjectIds.length <= 30) {
        // Query existing questions for these subjects in a single batched query
        const qry = query(
          collection(db, 'questions'), 
          where('subjectId', 'in', subjectIds)
        );
        const snapshot = await getDocs(qry);
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.text) {
            const key = `${data.text.trim().toLowerCase()}|${JSON.stringify((data.options || []).map((o: string) => o.trim().toLowerCase()))}`;
            existingKeys.add(key);
          }
        });
      } else {
        // Fallback: fetch recent questions to check duplicates efficiently without N single queries
        const qry = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(500));
        const snapshot = await getDocs(qry);
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.text) {
            const key = `${data.text.trim().toLowerCase()}|${JSON.stringify((data.options || []).map((o: string) => o.trim().toLowerCase()))}`;
            existingKeys.add(key);
          }
        });
      }

      const finalQuestions = processedQuestions
        .filter(q => {
          const key = `${q.text.trim().toLowerCase()}|${JSON.stringify((q.options || []).map((o: string) => o.trim().toLowerCase()))}`;
          return !existingKeys.has(key);
        })
        .map(q => ({
          ...q,
          createdAt: Date.now()
        }));

      const CHUNK_SIZE = 450;
      for (let i = 0; i < finalQuestions.length; i += CHUNK_SIZE) {
        const chunk = finalQuestions.slice(i, i + CHUNK_SIZE);
        const currentBatch = writeBatch(db);
        
        for (const q of chunk) {
          const docRef = doc(collection(db, 'questions'));
          currentBatch.set(docRef, q);
        }
        
        await currentBatch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'questions');
    }
  },

  async updateQuestion(id: string, updates: any) {
    try {
      const sanitizedUpdates = this.cleanObject({
        ...updates,
        text: updates.text ? sanitizeText(updates.text) : undefined,
        explanation: updates.explanation ? sanitizeText(updates.explanation) : undefined,
        bank: updates.bank ? sanitizeText(updates.bank) : undefined,
        options: updates.options ? updates.options.map((o: any) => sanitizeText(o)) : undefined,
        updatedAt: Date.now()
      });

      const questionRef = doc(db, 'questions', id);
      const questionDoc = await getDoc(questionRef);

      if (questionDoc.exists()) {
        await updateDoc(questionRef, sanitizedUpdates);
      } else {
        let baseData: any = { authorId: 'system', createdAt: Date.now() };
        if (id.startsWith('pmma_preset_q_') || id.startsWith('preset_q_')) {
          const idxStr = id.replace('pmma_preset_q_', '').replace('preset_q_', '');
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx) && PMMA_QUESTIONS[idx]) {
            baseData = {
              authorId: 'system',
              ...PMMA_QUESTIONS[idx],
              createdAt: Date.now()
            };
          }
        }
        await setDoc(questionRef, { ...baseData, ...sanitizedUpdates }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `questions/${id}`);
    }
  },

  async deleteQuestion(id: string) {
    if (id.startsWith('pmma_preset_') || id.startsWith('preset_')) return;
    try {
      const questionRef = doc(db, 'questions', id);
      const questionDoc = await getDoc(questionRef);
      const questionData = questionDoc.exists() ? (questionDoc.data() as Question) : null;

      const answersQuery = query(collection(db, 'questionAnswers'), where('questionId', '==', id));
      const answersSnap = await getDocs(answersQuery);

      if (!answersSnap.empty) {
        const totalAns = answersSnap.size;
        const correctAns = answersSnap.docs.filter(d => d.data().isCorrect).length;

        const batch = writeBatch(db);
        answersSnap.docs.forEach(ansDoc => {
          batch.delete(ansDoc.ref);
        });
        await batch.commit();

        if (questionData && questionData.topicId) {
          const topicRef = doc(db, 'topics', questionData.topicId);
          const topicDoc = await getDoc(topicRef);
          if (topicDoc.exists()) {
            const topicData = topicDoc.data() as Topic;
            const newTotal = Math.max(0, (Number(topicData.questionsTotal) || 0) - totalAns);
            const newCorrect = Math.max(0, (Number(topicData.questionsCorrect) || 0) - correctAns);
            await updateDoc(topicRef, {
              questionsTotal: newTotal,
              questionsCorrect: newCorrect
            });
          }
        }
      }

      await deleteDoc(questionRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
    }
  },

  async bulkDeleteQuestions(ids: string[]) {
    try {
      const realIds = ids.filter(id => !id.startsWith('pmma_preset_') && !id.startsWith('preset_'));
      if (realIds.length === 0) return;
      for (const id of realIds) {
        await this.deleteQuestion(id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'questions');
    }
  },

  async bulkUpdateQuestions(ids: string[], updates: any) {
    try {
      if (!ids || ids.length === 0) return;
      const sanitizedUpdates = this.cleanObject({
        ...updates,
        text: updates.text ? sanitizeText(updates.text) : undefined,
        explanation: updates.explanation ? sanitizeText(updates.explanation) : undefined,
        bank: updates.bank ? sanitizeText(updates.bank) : undefined,
        options: updates.options ? updates.options.map((o: any) => sanitizeText(o)) : undefined,
        updatedAt: Date.now()
      });

      const ops: { ref: any; data: any; isSet: boolean }[] = [];
      for (const id of ids) {
        const qRef = doc(db, 'questions', id);
        if (id.startsWith('pmma_preset_q_') || id.startsWith('preset_q_')) {
          const idxStr = id.replace('pmma_preset_q_', '').replace('preset_q_', '');
          const idx = parseInt(idxStr, 10);
          const preset = !isNaN(idx) ? PMMA_QUESTIONS[idx] : null;
          const baseData = preset ? { authorId: 'system', ...preset, createdAt: Date.now() } : { authorId: 'system', createdAt: Date.now() };
          ops.push({ ref: qRef, data: { ...baseData, ...sanitizedUpdates }, isSet: true });
        } else {
          ops.push({ ref: qRef, data: sanitizedUpdates, isSet: false });
        }
      }

      const CHUNK_SIZE = 400;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          if (op.isSet) {
            batch.set(op.ref, op.data, { merge: true });
          } else {
            batch.update(op.ref, op.data);
          }
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'questions');
    }
  },

  subscribeToQuestions(
    callback: (questions: any[]) => void, 
    options: { limitVal?: number; subjectIds?: string[]; topicIds?: string[] } = {}
  ) {
    const { limitVal = 300, subjectIds, topicIds } = options;
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (subjectIds && subjectIds.length > 0) {
      constraints.push(where('subjectId', 'in', subjectIds));
    }
    if (topicIds && topicIds.length > 0) {
      constraints.push(where('topicId', 'in', topicIds));
    }
    constraints.push(limit(limitVal));

    const cacheKey = `questions_${limitVal}_${JSON.stringify(subjectIds || [])}_${JSON.stringify(topicIds || [])}`;

    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'questions'), ...constraints),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'questions')
    );
  },

  async sanitizeAllQuestions(onProgress?: (progress: { current: number; total: number }) => void) {
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      const total = snapshot.docs.length;
      let current = 0;
      
      const BATCH_SIZE = 450;
      for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(docSnap => {
          const data = docSnap.data();
          const updates: any = {};
          let changed = false;

          const fieldsToSanitize = ['text', 'explanation', 'bank', 'institution', 'position'];
          fieldsToSanitize.forEach(field => {
            if (data[field]) {
              const sanitized = sanitizeText(data[field]);
              if (sanitized !== data[field]) {
                updates[field] = sanitized;
                changed = true;
              }
            }
          });

          if (data.options && Array.isArray(data.options)) {
            const sanitizedOptions = data.options.map((opt: any) => sanitizeText(String(opt)));
            if (JSON.stringify(sanitizedOptions) !== JSON.stringify(data.options)) {
              updates.options = sanitizedOptions;
              changed = true;
            }
          }

          if (changed) {
            batch.update(docSnap.ref, updates);
          }
          current++;
        });

        await batch.commit();
        if (onProgress) onProgress({ current, total });
      }
    } catch (error) {
      console.error("Error sanitizing questions:", error);
      throw error;
    }
  },

  async sanitizeAllFlashcards(onProgress?: (progress: { current: number; total: number }) => void) {
    try {
      const snapshot = await getDocs(collection(db, 'flashcards'));
      const total = snapshot.docs.length;
      let current = 0;

      const BATCH_SIZE = 450;
      for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);

        chunk.forEach(docSnap => {
          const data = docSnap.data();
          const updates: any = {};
          let changed = false;

          const fieldsToSanitize = ['front', 'back', 'explanation', 'caption'];
          fieldsToSanitize.forEach(field => {
            if (data[field]) {
              const sanitized = sanitizeText(data[field]);
              if (sanitized !== data[field]) {
                updates[field] = sanitized;
                changed = true;
              }
            }
          });

          if (changed) {
            batch.update(docSnap.ref, updates);
          }
          current++;
        });

        await batch.commit();
        if (onProgress) onProgress({ current, total });
      }
    } catch (error) {
      console.error("Error sanitizing flashcards:", error);
      throw error;
    }
  },

  getQuestionCsvTemplate(): string {
    const headers = [
      'Enunciado',
      'Disciplina',
      'Assunto',
      'Opção A',
      'Opção B',
      'Opção C',
      'Opção D',
      'Opção E',
      'Opção F',
      'Gabarito',
      'Explicação',
      'Ano',
      'Banca',
      'Cargo',
      'Dificuldade'
    ];
    
    const escapeCsv = (val: string) => {
      const escaped = val.replace(/"/g, '""');
      return escaped.includes(';') || escaped.includes('\n') || escaped.includes('"') ? `"${escaped}"` : escaped;
    };

    const example = [
      'Qual a capital do Brasil?',
      'Geografia',
      'Brasil',
      'Rio de Janeiro',
      'São Paulo',
      'Brasília',
      'Salvador',
      '',
      '',
      'C',
      'Brasília é a capital federal do Brasil e a sede do governo do Distrito Federal.',
      '2024',
      'FGV',
      'Analista Judiciário',
      'easy'
    ].map(escapeCsv);

    const maranhaoExample = [
      'De acordo com levantamento da Comissão Pastoral da Terra (CPT) divulgado em 2026, a situação dos conflitos no campo no Maranhão é crítica. Sobre os dados apresentados, analise as afirmativas e marque a opção correta.',
      'História, Geografia e Conhecimentos Gerais do Maranhão',
      'Riscos naturais: vulnerabilidade social e ambiental',
      'O Maranhão foi o estado com o menor número de conflitos por terra no país em 2025.',
      'O Maranhão liderou o ranking nacional de conflitos por terra em 2025, com 190 casos registrados, e também apresentou crescimento no número de trabalhadores resgatados de condições análogas à escravidão.',
      'Os conflitos agrários no Maranhão têm diminuído significativamente nos últimos anos, sem registros de trabalho escravo.',
      'A CPT não realiza levantamentos sobre conflitos no campo no Maranhão, sendo esses dados de responsabilidade exclusiva do INCRA.',
      '',
      '',
      'B',
      'Segundo os relatórios da CPT, o Maranhão apresenta elevados índices de conflitos agrários e vulnerabilidades socioambientais nas comunidades de camponeses.',
      '2025',
      'CPT',
      'Agente de Polícia',
      'hard'
    ].map(escapeCsv);

    return `sep=;\n${headers.join(';')}\n${example.join(';')}\n${maranhaoExample.join(';')}`;
  },

  getFlashcardCsvTemplate(): string {
    const headers = ['frente', 'verso', 'explicação', 'materia', 'topico'];
    const example = [
      'O que é o Princípio da Dignidade da Pessoa Humana?',
      'É um valor supremo que atrai o conteúdo de todos os direitos fundamentais...',
      'Dica: Lembre-se que é o fundamento da República Federativa do Brasil.',
      'Direito Constitucional',
      'Direitos Fundamentais'
    ];
    return `sep=;\n${headers.join(';')}\n${example.join(';')}`;
  },

  // Database Maintenance: Sanitize All (Removing duplicate identifiers)
  // ... (The redundant versions at lines 364/396 are being removed in favor of the ones at 221/271)


  // Subjects
  subscribeToSubjects(uid: string, callback: (subjects: Subject[]) => void) {
    const cacheKey = `subjects_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'subjects'), where('uid', '==', uid), orderBy('name')),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'subjects')
    );
  },

  subscribeToAllSubjects(callback: (subjects: Subject[]) => void, limitVal: number = 300) {
    const cacheKey = `all_subjects_${limitVal}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'subjects'), orderBy('name'), limit(limitVal)),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'subjects')
    );
  },

  subscribeToAllTopics(callback: (topics: Topic[]) => void, limitVal: number = 300) {
    const cacheKey = `all_topics_${limitVal}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'topics'), orderBy('name'), limit(limitVal)),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'topics')
    );
  },

  async addSubject(uid: string, name: string, color: string, icon?: string): Promise<string | undefined> {
    try {
      let trimmedName = name.trim();
      if (trimmedName.length > 200) {
        trimmedName = trimmedName.substring(0, 200);
      }
      let finalColor = color.trim();
      if (!finalColor || finalColor.length < 4 || finalColor.length > 7) {
        finalColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      }
      const docRef = await addDoc(collection(db, 'subjects'), {
        uid,
        name: trimmedName,
        color: finalColor,
        icon: icon || 'BookOpen',
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subjects');
      return undefined;
    }
  },

  async deleteSubject(id: string) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      // 1. Delete all flashcards associated with this subject for THIS user
      const flashcardsQuery = query(
        collection(db, 'flashcards'), 
        where('uid', '==', uid),
        where('subjectId', '==', id)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const batch = writeBatch(db);
      
      const cardsDeleted = flashcardsSnapshot.size;
      flashcardsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 2. Delete all topics associated with this subject for THIS user
      const topicsQuery = query(
        collection(db, 'topics'), 
        where('uid', '==', uid),
        where('subjectId', '==', id)
      );
      const topicsSnapshot = await getDocs(topicsQuery);
      topicsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 3. Delete all sessions associated with this subject for THIS user
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('uid', '==', uid),
        where('subjectId', '==', id)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 4. Delete the subject itself
      batch.delete(doc(db, 'subjects', id));

      // 5. Update flashcards count
      if (cardsDeleted > 0) {
        const subRef = doc(db, 'subscriptions', uid);
        const subDoc = await getDoc(subRef);
        if (subDoc.exists()) {
          const subData = subDoc.data() as UserSubscription;
          batch.update(subRef, {
            flashcardsCount: Math.max(0, (subData.flashcardsCount || 0) - cardsDeleted),
            updatedAt: Date.now()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
    }
  },

  async updateSubject(id: string, updates: Partial<Subject>) {
    try {
      const cleaned = this.cleanObject(updates);
      await updateDoc(doc(db, 'subjects', id), cleaned);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subjects/${id}`);
    }
  },

  // Topics
  subscribeToTopics(uid: string, callback: (topics: Topic[]) => void) {
    const cacheKey = `topics_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'topics'), where('uid', '==', uid), orderBy('createdAt', 'desc')),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'topics')
    );
  },

  async addTopic(uid: string, topic: Partial<Topic>) {
    try {
      const cleaned = this.cleanObject(topic);
      await addDoc(collection(db, 'topics'), {
        ...cleaned,
        uid,
        status: 'pending',
        theoryDone: false,
        exercisesDone: false,
        revisionDone: false,
        questionsTotal: 0,
        questionsCorrect: 0,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'topics');
    }
  },

  async bulkAddTopics(uid: string, topics: Partial<Topic>[]) {
    try {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < topics.length; i += CHUNK_SIZE) {
        const chunk = topics.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(topic => {
          const newDocRef = doc(collection(db, 'topics'));
          const cleaned = this.cleanObject(topic);
          batch.set(newDocRef, {
            ...cleaned,
            uid,
            status: 'pending',
            theoryDone: false,
            exercisesDone: false,
            revisionDone: false,
            questionsTotal: Number(cleaned.questionsTotal || 0),
            questionsCorrect: Number(cleaned.questionsCorrect || 0),
            createdAt: Date.now()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'topics/bulk');
    }
  },

  async updateTopic(id: string, updates: Partial<Topic>) {
    try {
      const topicRef = doc(db, 'topics', id);
      const topicDoc = await getDoc(topicRef);
      
      if (!topicDoc.exists()) return;

      const topicData = topicDoc.data() as Topic;
      const currentUid = auth.currentUser?.uid;

      // Ownership check: Only owner or admin can update
      // Since isAdmin() in rules checks the DB, we do a basic check here or skip
      // A more robust app might have a 'isCollaborator' flag in the user profile
      if (topicData.uid !== currentUid) {
        console.warn("Skipping topic update: user does not own this topic.");
        return;
      }
      
      // If any completion flags are being updated, check if we should auto-update status
      if ('theoryDone' in updates || 'exercisesDone' in updates || 'revisionDone' in updates) {
        const theory = updates.theoryDone !== undefined ? updates.theoryDone : topicData.theoryDone;
        const exercises = updates.exercisesDone !== undefined ? updates.exercisesDone : topicData.exercisesDone;
        const revision = updates.revisionDone !== undefined ? updates.revisionDone : topicData.revisionDone;
        
        if (theory && exercises && revision) {
          updates.status = 'completed';
        } else if (theory || exercises || revision || (topicData.questionsTotal || 0) > 0) {
          updates.status = 'in-progress';
        }
      }

      const cleaned = this.cleanObject(updates);

      await updateDoc(topicRef, {
        ...cleaned,
        updatedAt: Date.now() // Ensure updatedAt is always pulsed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `topics/${id}`);
    }
  },

  async deleteTopic(id: string) {
    try {
      // 1. Delete all flashcards associated with this topic
      const flashcardsQuery = query(collection(db, 'flashcards'), where('topicId', '==', id));
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const batch = writeBatch(db);
      
      const cardsDeleted = flashcardsSnapshot.size;
      flashcardsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 2. Delete the topic itself
      batch.delete(doc(db, 'topics', id));

      // 3. Update flashcards count
      if (cardsDeleted > 0) {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const subRef = doc(db, 'subscriptions', uid);
          const subDoc = await getDoc(subRef);
          if (subDoc.exists()) {
            const subData = subDoc.data() as UserSubscription;
            batch.update(subRef, {
              flashcardsCount: Math.max(0, (subData.flashcardsCount || 0) - cardsDeleted),
              updatedAt: Date.now()
            });
          }
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `topics/${id}`);
    }
  },

  // Study Sessions
  subscribeToSessions(uid: string, callback: (sessions: StudySession[]) => void, limitVal: number = 300) {
    const cacheKey = `sessions_${uid}_${limitVal}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'sessions'), where('uid', '==', uid), orderBy('date', 'desc'), limit(limitVal)),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'sessions')
    );
  },

  async addSession(uid: string, session: Partial<StudySession>) {
    try {
      // Add the session
      const cleaned = this.cleanObject(session);
      await addDoc(collection(db, 'sessions'), {
        ...cleaned,
        uid,
        date: Date.now()
      });

      // Update the topic stats
      if (session.topicId) {
        const topicRef = doc(db, 'topics', session.topicId);
        const topicDoc = await getDoc(topicRef);
        if (topicDoc.exists()) {
          const topicData = topicDoc.data() as Topic;
          const updates: any = {
            questionsTotal: (topicData.questionsTotal || 0) + (session.questionsTotal || 0),
            questionsCorrect: (topicData.questionsCorrect || 0) + (session.questionsCorrect || 0),
            lastStudyDate: Date.now(),
            status: 'in-progress'
          };

          // If session has questions, mark exercises as done
          if ((session.questionsTotal || 0) > 0) {
            updates.exercisesDone = true;
          }

          // Check if this completes the topic
          const theory = topicData.theoryDone;
          const exercises = updates.exercisesDone || topicData.exercisesDone;
          const revision = topicData.revisionDone;

          if (theory && exercises && revision) {
            updates.status = 'completed';
          }

          await updateDoc(topicRef, updates);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  },

  async deleteSession(id: string) {
    try {
      const sessionRef = doc(db, 'sessions', id);
      const sessionDoc = await getDoc(sessionRef);
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data() as StudySession;
        if (sessionData.topicId) {
          const topicRef = doc(db, 'topics', sessionData.topicId);
          const topicDoc = await getDoc(topicRef);
          if (topicDoc.exists()) {
            const topicData = topicDoc.data() as Topic;
            const subTotal = Number(sessionData.questionsTotal) || 0;
            const subCorrect = Number(sessionData.questionsCorrect) || 0;

            const newTotal = Math.max(0, (Number(topicData.questionsTotal) || 0) - subTotal);
            const newCorrect = Math.max(0, (Number(topicData.questionsCorrect) || 0) - subCorrect);

            await updateDoc(topicRef, {
              questionsTotal: newTotal,
              questionsCorrect: newCorrect
            });
          }
        }
        await deleteDoc(sessionRef);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  },

  // Flashcards
  subscribeToFlashcards(uid: string, callback: (flashcards: Flashcard[]) => void) {
    const cacheKey = `flashcards_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'flashcards'), where('uid', '==', uid), orderBy('createdAt', 'desc')),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'flashcards')
    );
  },

  subscribeToAllFlashcards(callback: (flashcards: Flashcard[]) => void, limitVal: number = 250) {
    const cacheKey = `all_flashcards_${limitVal}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'flashcards'), orderBy('createdAt', 'desc'), limit(limitVal)),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'flashcards')
    );
  },

  async addFlashcard(uid: string, flashcard: Partial<Flashcard>) {
    try {
      const subRef = doc(db, 'subscriptions', uid);
      const flashcardRef = doc(collection(db, 'flashcards'));
      
      // Clean undefined values
      const cleanedFlashcard = this.cleanObject(flashcard);
      
      // Fetch user profile to check role
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      const isAdmin = userData?.role === 'admin' || userData?.role === 'colaborador';

      // Check for duplicate locally before transaction
      const q = query(
        collection(db, 'flashcards'), 
        where('uid', '==', uid), 
        where('subjectId', '==', cleanedFlashcard.subjectId),
        where('front', '==', cleanedFlashcard.front)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const existing = snapshot.docs.find(doc => doc.data().back === cleanedFlashcard.back);
        if (existing) {
          throw new Error('Este flashcard já existe em sua coleção.');
        }
      }

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subRef);
        const subData = subDoc.exists() ? subDoc.data() as UserSubscription : { plan: 'free', flashcardsCount: 0 };
        
        const limits = { free: 50, pro: 1000, elite: Infinity };
        const currentPlan = subData.plan || 'free';
        const limit = limits[currentPlan as keyof typeof limits];

        if ((subData.flashcardsCount || 0) >= limit) {
          throw new Error(`Limite de ${limit} flashcards atingido no plano ${currentPlan === 'free' ? 'Gratuito' : currentPlan === 'pro' ? 'Pro' : 'Elite'}. Faça o upgrade para continuar!`);
        }

        transaction.set(flashcardRef, {
          ...cleanedFlashcard,
          front: sanitizeText(cleanedFlashcard.front || ''),
          back: sanitizeText(cleanedFlashcard.back || ''),
          explanation: sanitizeText(cleanedFlashcard.explanation || ''),
          caption: sanitizeText(cleanedFlashcard.caption || ''),
          uid,
          interval: 0,
          repetition: 0,
          easeFactor: 2.5,
          nextReviewDate: Date.now(),
          createdAt: Date.now(),
          isPublic: isAdmin ? (cleanedFlashcard.isPublic || false) : false // ONLY admins can make public
        });

        transaction.set(subRef, { 
          plan: 'free',
          ...subData, 
          uid,
          flashcardsCount: (subData.flashcardsCount || 0) + 1,
          updatedAt: Date.now() 
        }, { merge: true });
      });
    } catch (error: any) {
      if (error.message.includes('Limite de 50 flashcards')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, 'flashcards');
    }
  },

  async addFlashcards(uid: string, flashcards: Partial<Flashcard>[]) {
    try {
      const subRef = doc(db, 'subscriptions', uid);
      const subDoc = await getDoc(subRef);
      const subData = subDoc.exists() ? subDoc.data() as UserSubscription : { plan: 'free', flashcardsCount: 0 };
      
      // Fetch user profile to check role
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      const isAdmin = userData?.role === 'admin' || userData?.role === 'colaborador';

      // Filter out existing flashcards (basic check to avoid duplicates in bulk)
      const q = query(collection(db, 'flashcards'), where('uid', '==', uid));
      const snapshot = await getDocs(q);
      const existingCards = snapshot.docs.map(doc => ({
        front: (doc.data().front || '').trim().toLowerCase(),
        back: (doc.data().back || '').trim().toLowerCase(),
        subjectId: doc.data().subjectId
      }));

      // Internal deduplication of the incoming array
      const seenInImport = new Set<string>();
      const uniqueNewCards = flashcards.filter(card => {
        const front = (card.front || '').trim().toLowerCase();
        const back = (card.back || '').trim().toLowerCase();
        const key = `${front}|${back}|${card.subjectId}`;
        
        // Already exists in user's collection?
        const alreadyInDb = existingCards.some(e => e.front === front && e.back === back && e.subjectId === card.subjectId);
        
        // Already seen in this batch?
        const alreadyInImport = seenInImport.has(key);
        
        if (!alreadyInDb && !alreadyInImport) {
          seenInImport.add(key);
          return true;
        }
        return false;
      });

      if (uniqueNewCards.length === 0) return;

      const currentCount = subData.flashcardsCount || 0;
      const totalAfter = currentCount + uniqueNewCards.length;

      const limits = { free: 50, pro: 1000, elite: Infinity };
      const currentPlan = subData.plan || 'free';
      const limit = limits[currentPlan as keyof typeof limits];

      if (totalAfter > limit) {
        const remaining = limit - currentCount;
        if (remaining <= 0) {
          throw new Error(`Limite de ${limit} flashcards atingido no plano ${currentPlan === 'free' ? 'Gratuito' : currentPlan === 'pro' ? 'Pro' : 'Elite'}. Faça o upgrade para continuar!`);
        } else {
          throw new Error(`Você só pode adicionar mais ${remaining} flashcards no plano ${currentPlan === 'free' ? 'Gratuito' : currentPlan === 'pro' ? 'Pro' : 'Elite'}. Faça o upgrade para mais!`);
        }
      }

      const CHUNK_SIZE = 450;
      for (let i = 0; i < uniqueNewCards.length; i += CHUNK_SIZE) {
        const chunk = uniqueNewCards.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(card => {
          const flashcardRef = doc(collection(db, 'flashcards'));
          const cleanedCard = this.cleanObject(card);
          batch.set(flashcardRef, {
            ...cleanedCard,
            front: sanitizeText(cleanedCard.front || ''),
            back: sanitizeText(cleanedCard.back || ''),
            explanation: sanitizeText(cleanedCard.explanation || ''),
            caption: sanitizeText(cleanedCard.caption || ''),
            uid,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5,
            nextReviewDate: Date.now(),
            createdAt: Date.now(),
            isPublic: isAdmin ? (cleanedCard.isPublic || false) : false
          });
        });

        // Update subscription count on the last batch
        if (i + CHUNK_SIZE >= uniqueNewCards.length) {
          batch.set(subRef, { 
            plan: 'free',
            ...subData, 
            uid,
            flashcardsCount: totalAfter,
            updatedAt: Date.now() 
          }, { merge: true });
        }

        await batch.commit();
      }
    } catch (error: any) {
      if (error.message.includes('Limite de 50 flashcards') || error.message.includes('Você só pode adicionar')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, 'flashcards/bulk');
    }
  },

  // Admin: Get all subscriptions
  subscribeToAllSubscriptions(callback: (subs: UserSubscription[]) => void) {
    const cacheKey = 'all_subscriptions';
    return multicastSubscribe(
      cacheKey,
      () => collection(db, 'subscriptions'),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserSubscription)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptions')
    );
  },

  // Marketplace & Subscriptions
  subscribeToSubscription(uid: string, callback: (sub: UserSubscription | null) => void) {
    const cacheKey = `subscription_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => doc(db, 'subscriptions', uid),
      (snapshot) => snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserSubscription) : null,
      callback,
      (error) => handleFirestoreError(error, OperationType.GET, `subscriptions/${uid}`)
    );
  },

  async updatePlan(uid: string, plan: 'free' | 'pro' | 'elite', expiresAt?: number | null) {
    try {
      const subRef = doc(db, 'subscriptions', uid);
      const data: any = {
        uid,
        plan,
        updatedAt: Date.now()
      };
      
      if (expiresAt !== undefined) {
        data.expiresAt = expiresAt;
      }

      await setDoc(subRef, data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptions/${uid}`);
    }
  },

  // Helper for Bulk Import with in-memory caching to minimize Firestore read costs
  async getOrCreateSubject(uid: string, name: string, color?: string, icon?: string): Promise<string> {
    try {
      let trimmedName = name.trim();
      if (trimmedName.length > 200) {
        trimmedName = trimmedName.substring(0, 200);
      }
      const normalizedName = trimmedName;
      const cacheKey = `${uid}:${normalizedName.toLowerCase()}`;

      if (subjectMemoryCache.has(cacheKey)) {
        return subjectMemoryCache.get(cacheKey)!;
      }

      const q = query(collection(db, 'subjects'), where('uid', '==', uid));
      const snapshot = await getDocs(q);
      
      const existing = snapshot.docs.find(docSnap => 
        (docSnap.data().name || '').toLowerCase() === normalizedName.toLowerCase()
      );
      
      if (existing) {
        subjectMemoryCache.set(cacheKey, existing.id);
        return existing.id;
      }
      
      let finalColor = (color || '').trim();
      if (!finalColor || finalColor.length < 4 || finalColor.length > 7) {
        finalColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      }

      const docRef = await addDoc(collection(db, 'subjects'), {
        uid,
        name: normalizedName,
        color: finalColor,
        icon: icon || 'BookOpen',
        createdAt: Date.now()
      });
      
      subjectMemoryCache.set(cacheKey, docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subjects');
      throw error;
    }
  },

  async getOrCreateTopic(uid: string, subjectId: string, name: string): Promise<string> {
    try {
      let trimmedName = name.trim();
      if (trimmedName.length > 200) {
        trimmedName = trimmedName.substring(0, 200);
      }
      const normalizedName = trimmedName;
      const cacheKey = `${uid}:${subjectId}:${normalizedName.toLowerCase()}`;

      if (topicMemoryCache.has(cacheKey)) {
        return topicMemoryCache.get(cacheKey)!;
      }

      const q = query(collection(db, 'topics'), where('uid', '==', uid), where('subjectId', '==', subjectId));
      const snapshot = await getDocs(q);
      
      const existing = snapshot.docs.find(docSnap => 
        (docSnap.data().name || '').toLowerCase() === normalizedName.toLowerCase()
      );

      if (existing) {
        topicMemoryCache.set(cacheKey, existing.id);
        return existing.id;
      }

      const docRef = await addDoc(collection(db, 'topics'), {
        uid,
        subjectId,
        name: normalizedName,
        status: 'pending',
        theoryDone: false,
        exercisesDone: false,
        revisionDone: false,
        questionsTotal: 0,
        questionsCorrect: 0,
        createdAt: Date.now()
      });

      topicMemoryCache.set(cacheKey, docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'topics');
      throw error;
    }
  },

  async updateFlashcard(id: string, updates: Partial<Flashcard>) {
    try {
      const sanitizedUpdates = {
        ...updates,
        front: updates.front !== undefined ? sanitizeText(updates.front) : undefined,
        back: updates.back !== undefined ? sanitizeText(updates.back) : undefined,
        explanation: updates.explanation !== undefined ? sanitizeText(updates.explanation) : undefined,
        caption: updates.caption !== undefined ? sanitizeText(updates.caption) : undefined,
        updatedAt: Date.now()
      };
      const cleaned = this.cleanObject(sanitizedUpdates);
      const flashcardRef = doc(db, 'flashcards', id);
      const flashcardDoc = await getDoc(flashcardRef);

      if (flashcardDoc.exists()) {
        await updateDoc(flashcardRef, cleaned);
      } else {
        let baseData: any = {};
        if (id.startsWith('pmma_preset_fc_') || id.startsWith('preset_fc_')) {
          const idxStr = id.replace('pmma_preset_fc_', '').replace('preset_fc_', '');
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx) && PMMA_FLASHCARDS[idx]) {
            baseData = {
              ...PMMA_FLASHCARDS[idx],
              interval: 0,
              repetition: 0,
              easeFactor: 2.5,
              nextReviewDate: Date.now(),
              createdAt: Date.now()
            };
          }
        }
        await setDoc(flashcardRef, { ...baseData, ...cleaned }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `flashcards/${id}`);
    }
  },

  async deleteFlashcard(uid: string, id: string) {
    try {
      const flashcardRef = doc(db, 'flashcards', id);
      const flashcardDoc = await getDoc(flashcardRef);
      
      if (!flashcardDoc.exists()) return;
      
      await deleteDoc(flashcardRef);

      // Update count
      const subRef = doc(db, 'subscriptions', uid);
      try {
        const subDoc = await getDoc(subRef);
        if (subDoc.exists()) {
          const subData = subDoc.data() as UserSubscription;
          await updateDoc(subRef, {
            flashcardsCount: Math.max(0, (subData.flashcardsCount || 0) - 1),
            updatedAt: Date.now()
          });
        }
      } catch (subError) {
        console.warn("Could not update subscription count:", subError);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `flashcards/${id}`);
    }
  },

  async bulkDeleteFlashcards(uid: string, ids: string[]) {
    try {
      const CHUNK_SIZE = 500;
      let cardsCount = ids.length;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'flashcards', id));
        });
        await batch.commit();
      }
      
      // Update count in subscription fora do batch para maior resiliência
      const subRef = doc(db, 'subscriptions', uid);
      try {
        const subDoc = await getDoc(subRef);
        if (subDoc.exists()) {
          const subData = subDoc.data() as UserSubscription;
          await updateDoc(subRef, {
            flashcardsCount: Math.max(0, (subData.flashcardsCount || 0) - cardsCount),
            updatedAt: Date.now()
          });
        }
      } catch (subError) {
        console.warn("Could not update subscription count in bulk delete:", subError);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'flashcards/bulk');
    }
  },

  async bulkUpdateFlashcards(uid: string, ids: string[], updates: Partial<Flashcard>) {
    try {
      if (!ids || ids.length === 0) return;
      const sanitizedUpdates = {
        ...updates,
        front: updates.front !== undefined ? sanitizeText(updates.front) : undefined,
        back: updates.back !== undefined ? sanitizeText(updates.back) : undefined,
        explanation: updates.explanation !== undefined ? sanitizeText(updates.explanation) : undefined,
        caption: updates.caption !== undefined ? sanitizeText(updates.caption) : undefined,
      };
      const cleaned = this.cleanObject(sanitizedUpdates);

      const ops: { ref: any; data: any; isSet: boolean }[] = [];
      for (const id of ids) {
        const fRef = doc(db, 'flashcards', id);
        if (id.startsWith('pmma_preset_fc_') || id.startsWith('preset_fc_')) {
          const idxStr = id.replace('pmma_preset_fc_', '').replace('preset_fc_', '');
          const idx = parseInt(idxStr, 10);
          const preset = !isNaN(idx) ? PMMA_FLASHCARDS[idx] : null;
          const baseData = preset ? {
            ...preset,
            uid,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5,
            nextReviewDate: Date.now(),
            createdAt: Date.now()
          } : { uid };
          ops.push({ ref: fRef, data: { ...baseData, ...cleaned, updatedAt: Date.now() }, isSet: true });
        } else {
          ops.push({ ref: fRef, data: { ...cleaned, updatedAt: Date.now() }, isSet: false });
        }
      }

      const CHUNK_SIZE = 400;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          if (op.isSet) {
            batch.set(op.ref, op.data, { merge: true });
          } else {
            batch.update(op.ref, op.data);
          }
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'flashcards/bulk');
    }
  },

  async recordQuestionResult(uid: string, question: Question, isCorrect: boolean) {
    if (!question.topicId || question.id.startsWith('pmma_preset_') || question.id.startsWith('preset_')) return;
    
    try {
      const topicRef = doc(db, 'topics', question.topicId);
      // Atomic direct update without prior getDoc read
      await updateDoc(topicRef, {
        questionsTotal: increment(1),
        questionsCorrect: isCorrect ? increment(1) : increment(0),
        lastStudyDate: Date.now(),
        status: 'in-progress',
        exercisesDone: true
      });
    } catch (error) {
      console.warn("Failed to update topic stats in result recording:", error);
    }
  },

  // SM-2 Algorithm for Spaced Repetition
  async reviewFlashcard(flashcard: Flashcard, quality: number) {
    if (!flashcard) {
      console.warn("Attempted to review undefined flashcard");
      return;
    }
    // Preset cards are managed in local memory / state to save 100% of remote cost
    if (flashcard.id.startsWith('pmma_preset_') || flashcard.id.startsWith('preset_')) {
      return;
    }

    let { interval, repetition, easeFactor } = flashcard;

    if (quality >= 3) {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition++;
    } else {
      repetition = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

    try {
      const batch = writeBatch(db);
      const cardRef = doc(db, 'flashcards', flashcard.id);
      
      batch.update(cardRef, {
        interval,
        repetition,
        easeFactor,
        nextReviewDate,
        lastReviewedAt: Date.now()
      });

      // Also update the topic if it exists
      if (flashcard.topicId) {
        const topicRef = doc(db, 'topics', flashcard.topicId);
        batch.update(topicRef, {
          lastStudyDate: Date.now(),
          status: 'in-progress',
          revisionDone: true
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `flashcards/${flashcard.id}`);
    }
  },

  // Question Answers
  async saveQuestionAnswer(uid: string, questionId: string, selectedOptionIndex: number, isCorrect: boolean) {
    if (selectedOptionIndex === undefined || selectedOptionIndex === null) {
      console.warn("Attempted to save answer with undefined or null option index. Skipping.");
      return;
    }

    try {
      const answersCol = collection(db, 'questionAnswers');
      await addDoc(answersCol, {
        uid,
        questionId,
        selectedOptionIndex,
        isCorrect,
        answeredAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questionAnswers');
    }
  },

  subscribeToUserAnswers(uid: string, callback: (answers: QuestionAnswer[]) => void, limitVal: number = 300) {
    const cacheKey = `answers_${uid}_${limitVal}`;
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'questionAnswers'), where('uid', '==', uid), limit(limitVal)),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionAnswer)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'questionAnswers')
    );
  },

  // Store Products
  subscribeToProducts(callback: (products: StoreProduct[]) => void) {
    const cacheKey = 'products';
    return multicastSubscribe(
      cacheKey,
      () => query(collection(db, 'products'), orderBy('createdAt', 'desc')),
      (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreProduct)),
      callback,
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );
  },

  async addProduct(product: Omit<StoreProduct, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  },

  async deleteProduct(id: string) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  },

  async bulkUpdateTopicsSubject(topicIds: string[], newSubjectId: string) {
    try {
      const ops: { ref: any; data: any }[] = [];

      for (const topicId of topicIds) {
        const topicRef = doc(db, 'topics', topicId);
        ops.push({ ref: topicRef, data: { subjectId: newSubjectId, updatedAt: Date.now() } });

        // Query and update associated flashcards
        const fcQuery = query(collection(db, 'flashcards'), where('topicId', '==', topicId));
        const fcSnapshot = await getDocs(fcQuery);
        fcSnapshot.docs.forEach(doc => {
          ops.push({ ref: doc.ref, data: { subjectId: newSubjectId } });
        });

        // Query and update associated questions
        const qQuery = query(collection(db, 'questions'), where('topicId', '==', topicId));
        const qSnapshot = await getDocs(qQuery);
        qSnapshot.docs.forEach(doc => {
          ops.push({ ref: doc.ref, data: { subjectId: newSubjectId } });
        });

        // Query and update study sessions
        const sQuery = query(collection(db, 'sessions'), where('topicId', '==', topicId));
        const sSnapshot = await getDocs(sQuery);
        sSnapshot.docs.forEach(doc => {
          ops.push({ ref: doc.ref, data: { subjectId: newSubjectId } });
        });
      }

      const CHUNK_SIZE = 400;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          batch.update(op.ref, op.data);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'topics/bulk-subject');
    }
  },

  async bulkUpdateTopicsPosition(topicIds: string[], newPosition: string) {
    try {
      const batch = writeBatch(db);
      topicIds.forEach(topicId => {
        const topicRef = doc(db, 'topics', topicId);
        batch.update(topicRef, { position: newPosition || null, updatedAt: Date.now() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'topics/bulk-position');
    }
  },

  async bulkDeleteTopics(topicIds: string[]) {
    try {
      const batch = writeBatch(db);
      for (const topicId of topicIds) {
        // Query associated flashcards
        const fcQuery = query(collection(db, 'flashcards'), where('topicId', '==', topicId));
        const fcSnapshot = await getDocs(fcQuery);
        fcSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Delete the topic itself
        batch.delete(doc(db, 'topics', topicId));
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'topics/bulk-delete');
    }
  },

  async renameCargo(uid: string, oldPositionName: string, newPositionName: string) {
    try {
      const batch = writeBatch(db);
      
      const q = query(
        collection(db, 'topics'),
        where('uid', '==', uid),
        where('position', '==', oldPositionName)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { position: newPositionName.trim() || null, updatedAt: Date.now() });
      });

      const qQuery = query(
        collection(db, 'questions'),
        where('authorId', '==', uid),
        where('position', '==', oldPositionName)
      );
      const qSnapshot = await getDocs(qQuery);
      qSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { position: newPositionName.trim() || null });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'topics/rename-cargo');
    }
  },

  async cleanupDuplicatesAndEmpty(uid: string) {
    try {
      console.log("[CLEANUP] Iniciando limpeza de duplicados e vazios para o usuário:", uid);

      // 1. Fetch all subjects of the user
      const subjectsQuery = query(collection(db, 'subjects'), where('uid', '==', uid));
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsList = subjectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject));

      // 2. Fetch all topics of the user
      const topicsQuery = query(collection(db, 'topics'), where('uid', '==', uid));
      const topicsSnapshot = await getDocs(topicsQuery);
      const topicsList = topicsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Topic));

      // 3. Fetch all flashcards of the user
      const flashcardsQuery = query(collection(db, 'flashcards'), where('uid', '==', uid));
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const flashcardsList = flashcardsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard));

      // 4. Fetch all user questions
      const questionsQuery = query(collection(db, 'questions'), where('authorId', '==', uid));
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsList = questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));

      // 5. Fetch all sessions of the user
      const sessionsQuery = query(collection(db, 'sessions'), where('uid', '==', uid));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsList = sessionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudySession));

      const operations: { type: 'set' | 'update' | 'delete', ref: any, data?: any }[] = [];

      // Keep track of subject mapping (merge duplicates)
      const subjectMapping: Record<string, string> = {}; // map duplicateSubjectId -> primarySubjectId
      const subjectNameMap: Record<string, Subject> = {};

      subjectsList.forEach(subj => {
        const key = subj.name.trim().toLowerCase();
        if (!subjectNameMap[key]) {
          subjectNameMap[key] = subj;
          subjectMapping[subj.id] = subj.id;
        } else {
          const primarySubj = subjectNameMap[key];
          subjectMapping[subj.id] = primarySubj.id;
          
          // Delete duplicate subject
          operations.push({ type: 'delete', ref: doc(db, 'subjects', subj.id) });
        }
      });

      // Map topics and detect duplicates, updating their subjectId if their parent subject was merged
      const updatedTopicsList = topicsList.map(topic => {
        const correctSubId = subjectMapping[topic.subjectId] || topic.subjectId;
        if (correctSubId !== topic.subjectId) {
          operations.push({ type: 'update', ref: doc(db, 'topics', topic.id), data: { subjectId: correctSubId } });
          return { ...topic, subjectId: correctSubId };
        }
        return topic;
      });

      // Group topics by subjectId and name (sanitized) to find duplicates
      const topicMapping: Record<string, string> = {}; // map duplicateTopicId -> primaryTopicId
      const topicGroupMap: Record<string, Topic[]> = {};

      updatedTopicsList.forEach(topic => {
        const key = `${topic.subjectId}|${topic.name.trim().toLowerCase()}`;
        if (!topicGroupMap[key]) {
          topicGroupMap[key] = [];
        }
        topicGroupMap[key].push(topic);
      });

      const topicsToDelete = new Set<string>();

      Object.entries(topicGroupMap).forEach(([key, group]) => {
        if (group.length <= 1) {
          // No duplicates
          group.forEach(t => {
            topicMapping[t.id] = t.id;
          });
          return;
        }

        // Sort group to find the best candidate to keep
        // Criteria: prefer one with progress, or higher questionsCorrect, or oldest
        group.sort((a, b) => {
          const aWeight = (a.theoryDone ? 1 : 0) + (a.exercisesDone ? 1 : 0) + (a.revisionDone ? 1 : 0);
          const bWeight = (b.theoryDone ? 1 : 0) + (b.exercisesDone ? 1 : 0) + (b.revisionDone ? 1 : 0);
          if (bWeight !== aWeight) return bWeight - aWeight;
          
          const aQTotal = a.questionsTotal || 0;
          const bQTotal = b.questionsTotal || 0;
          if (bQTotal !== aQTotal) return bQTotal - aQTotal;
          
          return a.createdAt - b.createdAt;
        });

        const primaryTopic = group[0];
        topicMapping[primaryTopic.id] = primaryTopic.id;

        // Sum up progress of other duplicates into the primary one
        let theoryDone = primaryTopic.theoryDone;
        let exercisesDone = primaryTopic.exercisesDone;
        let revisionDone = primaryTopic.revisionDone;
        let questionsTotal = primaryTopic.questionsTotal || 0;
        let questionsCorrect = primaryTopic.questionsCorrect || 0;

        for (let i = 1; i < group.length; i++) {
          const dupTopic = group[i];
          topicMapping[dupTopic.id] = primaryTopic.id;
          topicsToDelete.add(dupTopic.id);

          theoryDone = theoryDone || dupTopic.theoryDone;
          exercisesDone = exercisesDone || dupTopic.exercisesDone;
          revisionDone = revisionDone || dupTopic.revisionDone;
          questionsTotal += (dupTopic.questionsTotal || 0);
          questionsCorrect += (dupTopic.questionsCorrect || 0);
        }

        // Determine correct status
        let status: 'pending' | 'in-progress' | 'completed' = 'pending';
        if (theoryDone && exercisesDone && revisionDone) {
          status = 'completed';
        } else if (theoryDone || exercisesDone || revisionDone || questionsTotal > 0) {
          status = 'in-progress';
        }

        // Update primary topic with merged stats
        operations.push({
          type: 'update',
          ref: doc(db, 'topics', primaryTopic.id),
          data: {
            theoryDone,
            exercisesDone,
            revisionDone,
            questionsTotal,
            questionsCorrect,
            status,
            updatedAt: Date.now()
          }
        });
      });

      // Execute deletes for the duplicate topics
      topicsToDelete.forEach(topicId => {
        operations.push({ type: 'delete', ref: doc(db, 'topics', topicId) });
      });

      // Migrate flashcards to correct subject and topic
      flashcardsList.forEach(fc => {
        const correctSubId = subjectMapping[fc.subjectId] || fc.subjectId;
        const correctTopicId = fc.topicId ? (topicMapping[fc.topicId] || fc.topicId) : undefined;
        
        const updates: any = {};
        if (correctSubId !== fc.subjectId) {
          updates.subjectId = correctSubId;
        }
        if (fc.topicId && correctTopicId !== fc.topicId) {
          updates.topicId = correctTopicId;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({ type: 'update', ref: doc(db, 'flashcards', fc.id), data: updates });
        }
      });

      // Migrate questions to correct subject and topic
      questionsList.forEach(q => {
        const correctSubId = subjectMapping[q.subjectId] || q.subjectId;
        const correctTopicId = q.topicId ? (topicMapping[q.topicId] || q.topicId) : undefined;

        const updates: any = {};
        if (correctSubId !== q.subjectId) {
          updates.subjectId = correctSubId;
        }
        if (q.topicId && correctTopicId !== q.topicId) {
          updates.topicId = correctTopicId;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({ type: 'update', ref: doc(db, 'questions', q.id), data: updates });
        }
      });

      // Migrate study sessions to correct subject and topic
      sessionsList.forEach(s => {
        const correctSubId = subjectMapping[s.subjectId] || s.subjectId;
        const correctTopicId = s.topicId ? (topicMapping[s.topicId] || s.topicId) : undefined;

        const updates: any = {};
        if (correctSubId !== s.subjectId) {
          updates.subjectId = correctSubId;
        }
        if (s.topicId && correctTopicId !== s.topicId) {
          updates.topicId = correctTopicId;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({ type: 'update', ref: doc(db, 'sessions', s.id), data: updates });
        }
      });

      // 6. Delete empty subjects that don't have any non-deleted topics, questions or flashcards associated with them
      const activeSubjectIds = new Set<string>();

      // Keep subject IDs of non-deleted topics
      updatedTopicsList.forEach(topic => {
        if (!topicsToDelete.has(topic.id)) {
          activeSubjectIds.add(topic.subjectId);
        }
      });

      // Keep subject IDs from remaining flashcards
      flashcardsList.forEach(fc => {
        const correctSubId = subjectMapping[fc.subjectId] || fc.subjectId;
        activeSubjectIds.add(correctSubId);
      });

      // Keep subject IDs from remaining questions
      questionsList.forEach(q => {
        const correctSubId = subjectMapping[q.subjectId] || q.subjectId;
        activeSubjectIds.add(correctSubId);
      });

      // All remaining subjects
      const remainingSubjects = subjectsList.filter(s => !subjectMapping[s.id] || subjectMapping[s.id] === s.id);

      remainingSubjects.forEach(s => {
        if (!activeSubjectIds.has(s.id)) {
          // Empty (no topics, no flashcards, no questions)! Queue for deletion.
          operations.push({ type: 'delete', ref: doc(db, 'subjects', s.id) });
        }
      });

      // Execute in chunks
      if (operations.length > 0) {
        let chunkBatch = writeBatch(db);
        let chunkCount = 0;
        
        for (const op of operations) {
          if (op.type === 'set') {
            chunkBatch.set(op.ref, op.data);
          } else if (op.type === 'update') {
            chunkBatch.update(op.ref, op.data);
          } else if (op.type === 'delete') {
            chunkBatch.delete(op.ref);
          }
          
          chunkCount++;
          if (chunkCount === 450) {
            await chunkBatch.commit();
            chunkBatch = writeBatch(db);
            chunkCount = 0;
          }
        }
        
        if (chunkCount > 0) {
          await chunkBatch.commit();
        }
        console.log(`[CLEANUP] Deduplicação concluída com sucesso! Processadas ${operations.length} operações.`);
      } else {
        console.log("[CLEANUP] Nada para deduplicar.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'cleanup-duplicates-empty');
    }
  },

  // Weekly Study Schedule
  subscribeToSchedule(uid: string, callback: (schedule: any) => void) {
    const cacheKey = `schedule_${uid}`;
    return multicastSubscribe(
      cacheKey,
      () => doc(db, 'schedules', uid),
      (snapshot) => snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() }) : null,
      callback,
      (error) => handleFirestoreError(error, OperationType.GET, `schedules/${uid}`)
    );
  },

  async updateSchedule(uid: string, scheduleData: any) {
    try {
      const cleaned = this.cleanObject(scheduleData);
      await setDoc(doc(db, 'schedules', uid), {
        ...cleaned,
        uid,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${uid}`);
    }
  }
};
