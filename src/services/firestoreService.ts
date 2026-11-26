import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  INITIAL_STARTUPS,
  REGIONS,
  type AccountType,
  type CategoryId,
  type ChatMessage,
  type ClientDecisionStatus,
  type ClientRequest,
  type Conversation,
  type RegionId,
  type StartupService,
  type UserProfile,
} from '../data/startups';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { LocalizedText } from '../i18n/translations';

// Blueprint-synchronized volumetric bounds (from firebase-blueprint.json)
export const FIELD_LIMITS = {
  displayName: { min: 1, max: 120 },
  email: { min: 3, max: 200 },
  photoURL: { min: 0, max: 500 },
  organizationName: { min: 0, max: 140 },
  contactInfo: { min: 0, max: 200 },
  startupName: { min: 2, max: 120 },
  serviceTitle: { min: 4, max: 160 },
  city: { min: 2, max: 80 },
  deliveryTime: { min: 2, max: 80 },
  startingBudget: { min: 2, max: 80 },
  summary: { min: 10, max: 600 },
  idealClient: { min: 6, max: 400 },
  deliverables: { min: 4, max: 400 },
  responseTime: { min: 2, max: 80 },
  teamAndSupport: { min: 2, max: 200 },
  contactChannel: { min: 0, max: 180 },
  keywordMaxLen: 60,
  keywordsMaxCount: 20,
  clientName: { min: 2, max: 120 },
  clientContact: { min: 0, max: 180 },
  needDescription: { min: 10, max: 1000 },
  budgetRange: { min: 2, max: 100 },
  decisionNote: { min: 0, max: 500 },
  submittedLabel: { min: 1, max: 60 },
  chatMessageBody: { min: 1, max: 1500 },
  lastMessageText: { min: 0, max: 500 },
} as const;

function clampStr(value: string, max: number, fallback = ''): string {
  const cleaned = value.trim();
  const base = cleaned.length > 0 ? cleaned : fallback;
  return base.slice(0, max);
}

function clampLocalized(
  text: LocalizedText | string,
  min: number,
  max: number,
  fallback: LocalizedText
): LocalizedText {
  const rawAr = typeof text === 'string' ? text : text.ar;
  const rawEn = typeof text === 'string' ? text : text.en;
  const ar = clampStr(rawAr, max, fallback.ar);
  const en = clampStr(rawEn, max, fallback.en);
  return {
    ar: ar.length >= min ? ar : fallback.ar.slice(0, max),
    en: en.length >= min ? en : fallback.en.slice(0, max),
  };
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeKeywords(raw: string[]): string[] {
  const unique = new Set<string>();
  for (const item of raw) {
    const cleaned = item.trim().slice(0, FIELD_LIMITS.keywordMaxLen);
    if (cleaned.length >= 1) {
      unique.add(cleaned);
    }
    if (unique.size >= FIELD_LIMITS.keywordsMaxCount) break;
  }
  return Array.from(unique);
}

function tsToMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  return 0;
}

function mapDocToStartup(id: string, data: Record<string, unknown>): StartupService {
  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    categoryId: (data.categoryId as CategoryId) || 'tech',
    regionId: (data.regionId as RegionId) || 'riyadh',
    startupName: (data.startupName as LocalizedText) || { ar: '', en: '' },
    serviceTitle: (data.serviceTitle as LocalizedText) || { ar: '', en: '' },
    city: (data.city as LocalizedText) || { ar: '', en: '' },
    deliveryTime: (data.deliveryTime as LocalizedText) || { ar: '', en: '' },
    deliveryDays: typeof data.deliveryDays === 'number' ? data.deliveryDays : 21,
    startingBudget: (data.startingBudget as LocalizedText) || { ar: '', en: '' },
    budgetSar: typeof data.budgetSar === 'number' ? data.budgetSar : 10000,
    summary: (data.summary as LocalizedText) || { ar: '', en: '' },
    idealClient: (data.idealClient as LocalizedText) || { ar: '', en: '' },
    deliverables: (data.deliverables as LocalizedText) || { ar: '', en: '' },
    responseTime: (data.responseTime as LocalizedText) || { ar: '', en: '' },
    teamAndSupport: (data.teamAndSupport as LocalizedText) || { ar: '', en: '' },
    contactChannel: typeof data.contactChannel === 'string' ? data.contactChannel : '',
    keywords: Array.isArray(data.keywords)
      ? data.keywords.filter((k): k is string => typeof k === 'string')
      : [],
    createdAtMs: tsToMillis(data.createdAt),
    updatedAtMs: tsToMillis(data.updatedAt),
  };
}

function mapDocToRequest(id: string, data: Record<string, unknown>): ClientRequest {
  return {
    id,
    clientUid: typeof data.clientUid === 'string' ? data.clientUid : undefined,
    clientName: (data.clientName as LocalizedText) || { ar: '', en: '' },
    clientContact: typeof data.clientContact === 'string' ? data.clientContact : '',
    categoryId: (data.categoryId as CategoryId) || 'tech',
    regionId: (data.regionId as RegionId) || 'riyadh',
    needDescription: (data.needDescription as LocalizedText) || { ar: '', en: '' },
    budgetRange: (data.budgetRange as LocalizedText) || { ar: '', en: '' },
    targetStartupId: typeof data.targetStartupId === 'string' ? data.targetStartupId : '',
    targetStartupOwnerId:
      typeof data.targetStartupOwnerId === 'string' ? data.targetStartupOwnerId : '',
    targetStartupName: (data.targetStartupName as LocalizedText) || { ar: '', en: '' },
    matchedCount: typeof data.matchedCount === 'number' ? data.matchedCount : 1,
    status: (data.status as ClientDecisionStatus) || 'pending',
    decisionNote: typeof data.decisionNote === 'string' ? data.decisionNote : '',
    decidedByUid: typeof data.decidedByUid === 'string' ? data.decidedByUid : '',
    submittedLabel: (data.submittedLabel as LocalizedText) || { ar: 'الآن', en: 'Just now' },
    createdAtMs: tsToMillis(data.createdAt),
    updatedAtMs: tsToMillis(data.updatedAt),
  };
}

// ============================================================================
// User Profiles (/users/{uid})
// ============================================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: String(data.uid || uid),
      displayName: String(data.displayName || ''),
      email: String(data.email || ''),
      photoURL: String(data.photoURL || ''),
      accountType: data.accountType === 'startup' ? 'startup' : 'client',
      organizationName: String(data.organizationName || ''),
      regionId: (data.regionId as RegionId) || 'riyadh',
      contactInfo: String(data.contactInfo || ''),
      createdAtMs: tsToMillis(data.createdAt),
      updatedAtMs: tsToMillis(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(input: {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  accountType: AccountType;
  organizationName: string;
  regionId: RegionId;
  contactInfo: string;
}): Promise<UserProfile> {
  const path = `users/${input.uid}`;
  const payload = {
    uid: input.uid,
    displayName: clampStr(input.displayName, FIELD_LIMITS.displayName.max, 'User'),
    email: clampStr(input.email, FIELD_LIMITS.email.max),
    photoURL: clampStr(input.photoURL, FIELD_LIMITS.photoURL.max),
    accountType: input.accountType,
    organizationName: clampStr(input.organizationName, FIELD_LIMITS.organizationName.max),
    regionId: input.regionId,
    contactInfo: clampStr(input.contactInfo, FIELD_LIMITS.contactInfo.max),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'users', input.uid), payload);
    return {
      ...payload,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName: string;
    photoURL: string;
    accountType: AccountType;
    organizationName: string;
    regionId: RegionId;
    contactInfo: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampStr(updates.displayName, FIELD_LIMITS.displayName.max, 'User'),
      photoURL: clampStr(updates.photoURL, FIELD_LIMITS.photoURL.max),
      accountType: updates.accountType,
      organizationName: clampStr(updates.organizationName, FIELD_LIMITS.organizationName.max),
      regionId: updates.regionId,
      contactInfo: clampStr(updates.contactInfo, FIELD_LIMITS.contactInfo.max),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// Startup Services (/startups/{startupId})
// ============================================================================

export function subscribeToStartups(
  onData: (items: StartupService[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = 'startups';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        mapDocToStartup(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      items.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

let seedInFlight = false;

export async function seedInitialStartupsIfEmpty(ownerUid: string): Promise<boolean> {
  if (seedInFlight) return false;
  seedInFlight = true;
  const path = 'startups';
  try {
    const existingSnap = await getDocs(collection(db, path));
    if (!existingSnap.empty) {
      return false;
    }
    const batch = writeBatch(db);
    for (const item of INITIAL_STARTUPS) {
      const docRef = doc(db, path, item.id);
      batch.set(docRef, {
        ownerId: ownerUid,
        categoryId: item.categoryId,
        regionId: item.regionId,
        startupName: item.startupName,
        serviceTitle: item.serviceTitle,
        city: item.city,
        deliveryTime: item.deliveryTime,
        deliveryDays: item.deliveryDays,
        startingBudget: item.startingBudget,
        budgetSar: item.budgetSar,
        summary: item.summary,
        idealClient: item.idealClient,
        deliverables: item.deliverables,
        responseTime: item.responseTime,
        teamAndSupport: item.teamAndSupport,
        contactChannel: item.contactChannel ?? '',
        keywords: sanitizeKeywords(item.keywords),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  } finally {
    seedInFlight = false;
  }
}

export interface StartupMutationInput {
  categoryId: CategoryId;
  regionId: RegionId;
  startupName: LocalizedText | string;
  serviceTitle: LocalizedText | string;
  city: LocalizedText | string;
  deliveryTime: LocalizedText | string;
  deliveryDays: number;
  startingBudget: LocalizedText | string;
  budgetSar: number;
  summary: LocalizedText | string;
  idealClient: LocalizedText | string;
  deliverables: LocalizedText | string;
  responseTime: LocalizedText | string;
  teamAndSupport: LocalizedText | string;
  contactChannel: string;
  keywords?: string[];
}

function buildStartupFields(input: StartupMutationInput) {
  const regionMeta = REGIONS.find((r) => r.id === input.regionId) ?? REGIONS[0];
  const startupName = clampLocalized(
    input.startupName,
    FIELD_LIMITS.startupName.min,
    FIELD_LIMITS.startupName.max,
    { ar: 'شركة ناشئة', en: 'Startup' }
  );
  const serviceTitle = clampLocalized(
    input.serviceTitle,
    FIELD_LIMITS.serviceTitle.min,
    FIELD_LIMITS.serviceTitle.max,
    { ar: 'خدمة متخصصة', en: 'Specialized Service' }
  );
  const city = clampLocalized(
    input.city,
    FIELD_LIMITS.city.min,
    FIELD_LIMITS.city.max,
    regionMeta.hubCity
  );
  const deliveryTime = clampLocalized(
    input.deliveryTime,
    FIELD_LIMITS.deliveryTime.min,
    FIELD_LIMITS.deliveryTime.max,
    { ar: '3 أسابيع', en: '3 weeks' }
  );
  const startingBudget = clampLocalized(
    input.startingBudget,
    FIELD_LIMITS.startingBudget.min,
    FIELD_LIMITS.startingBudget.max,
    { ar: 'حسب نطاق المشروع', en: 'Custom scope' }
  );
  const summary = clampLocalized(
    input.summary,
    FIELD_LIMITS.summary.min,
    FIELD_LIMITS.summary.max,
    { ar: 'تقديم خدمات متخصصة عالية الجودة للعملاء.', en: 'Specialized high-quality client services.' }
  );
  const idealClient = clampLocalized(
    input.idealClient,
    FIELD_LIMITS.idealClient.min,
    FIELD_LIMITS.idealClient.max,
    { ar: 'الشركات والمشاريع المتنامية', en: 'Growing businesses and startups' }
  );
  const deliverables = clampLocalized(
    input.deliverables,
    FIELD_LIMITS.deliverables.min,
    FIELD_LIMITS.deliverables.max,
    { ar: summary.ar.slice(0, 120), en: summary.en.slice(0, 120) }
  );
  const responseTime = clampLocalized(
    input.responseTime,
    FIELD_LIMITS.responseTime.min,
    FIELD_LIMITS.responseTime.max,
    { ar: 'خلال 24 ساعة', en: 'Within 24 hours' }
  );
  const teamAndSupport = clampLocalized(
    input.teamAndSupport,
    FIELD_LIMITS.teamAndSupport.min,
    FIELD_LIMITS.teamAndSupport.max,
    { ar: 'فريق مخصص · دعم بعد التسليم', en: 'Dedicated team · Post-launch support' }
  );

  const derivedKeywords =
    input.keywords && input.keywords.length > 0
      ? input.keywords
      : `${startupName.ar} ${startupName.en} ${serviceTitle.ar} ${serviceTitle.en} ${city.ar} ${city.en} ${summary.ar}`
          .split(/\s+/)
          .filter((w) => w.length >= 2);

  return {
    categoryId: input.categoryId,
    regionId: input.regionId,
    startupName,
    serviceTitle,
    city,
    deliveryTime,
    deliveryDays: clampNumber(input.deliveryDays, 1, 365, 21),
    startingBudget,
    budgetSar: clampNumber(input.budgetSar, 0, 10000000, 10000),
    summary,
    idealClient,
    deliverables,
    responseTime,
    teamAndSupport,
    contactChannel: clampStr(input.contactChannel, FIELD_LIMITS.contactChannel.max),
    keywords: sanitizeKeywords(derivedKeywords),
  };
}

export async function createStartupService(
  ownerId: string,
  input: StartupMutationInput
): Promise<StartupService> {
  const newId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `startups/${newId}`;
  const fields = buildStartupFields(input);
  try {
    await setDoc(doc(db, 'startups', newId), {
      ownerId,
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: newId,
      ownerId,
      ...fields,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStartupService(
  startupId: string,
  input: StartupMutationInput
): Promise<void> {
  const path = `startups/${startupId}`;
  const fields = buildStartupFields(input);
  try {
    await updateDoc(doc(db, 'startups', startupId), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStartupService(startupId: string): Promise<void> {
  const path = `startups/${startupId}`;
  try {
    await deleteDoc(doc(db, 'startups', startupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Client Requests (/requests/{requestId})
// ============================================================================

export function subscribeToUserRequests(
  uid: string,
  isAdmin: boolean,
  onData: (items: ClientRequest[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = 'requests';

  if (isAdmin) {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) =>
          mapDocToRequest(d.id, d.data() as Record<string, unknown>)
        );
        items.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  }

  let sentByMe: ClientRequest[] = [];
  let incomingForMyStartups: ClientRequest[] = [];

  const emitMerged = () => {
    const byId = new Map<string, ClientRequest>();
    for (const r of sentByMe) byId.set(r.id, r);
    for (const r of incomingForMyStartups) byId.set(r.id, r);
    const merged = Array.from(byId.values()).sort(
      (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
    );
    onData(merged);
  };

  const unsubClient = onSnapshot(
    query(collection(db, path), where('clientUid', '==', uid)),
    (snapshot) => {
      sentByMe = snapshot.docs.map((d) =>
        mapDocToRequest(d.id, d.data() as Record<string, unknown>)
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubStartup = onSnapshot(
    query(collection(db, path), where('targetStartupOwnerId', '==', uid)),
    (snapshot) => {
      incomingForMyStartups = snapshot.docs.map((d) =>
        mapDocToRequest(d.id, d.data() as Record<string, unknown>)
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubClient();
    unsubStartup();
  };
}

export async function createClientRequest(input: {
  clientUid: string;
  clientName: string;
  clientContact: string;
  categoryId: CategoryId;
  regionId: RegionId;
  needDescription: string;
  budgetRange: string;
  targetStartup: StartupService;
  matchedCount: number;
}): Promise<ClientRequest> {
  if (!input.targetStartup.ownerId) {
    throw new Error('Target startup does not have a registered owner yet.');
  }

  const newId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `requests/${newId}`;

  const now = new Date();
  const formattedAr = now.toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
  });
  const formattedEn = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const payload = {
    clientUid: input.clientUid,
    clientName: clampLocalized(
      input.clientName,
      FIELD_LIMITS.clientName.min,
      FIELD_LIMITS.clientName.max,
      { ar: 'عميل', en: 'Client' }
    ),
    clientContact: clampStr(input.clientContact, FIELD_LIMITS.clientContact.max),
    categoryId: input.categoryId,
    regionId: input.regionId,
    needDescription: clampLocalized(
      input.needDescription,
      FIELD_LIMITS.needDescription.min,
      FIELD_LIMITS.needDescription.max,
      { ar: 'طلب خدمة جديدة من منصة لها.', en: 'New project request via Laha.' }
    ),
    budgetRange: clampLocalized(
      input.budgetRange,
      FIELD_LIMITS.budgetRange.min,
      FIELD_LIMITS.budgetRange.max,
      { ar: '5,000 – 15,000 ر.س', en: '5,000 – 15,000 SAR' }
    ),
    targetStartupId: input.targetStartup.id,
    targetStartupOwnerId: input.targetStartup.ownerId,
    targetStartupName: clampLocalized(
      input.targetStartup.startupName,
      FIELD_LIMITS.startupName.min,
      FIELD_LIMITS.startupName.max,
      { ar: 'شركة ناشئة', en: 'Startup' }
    ),
    matchedCount: clampNumber(input.matchedCount, 0, 1000, 1),
    status: 'pending' as ClientDecisionStatus,
    decisionNote: '',
    decidedByUid: '',
    submittedLabel: {
      ar: formattedAr.slice(0, FIELD_LIMITS.submittedLabel.max),
      en: formattedEn.slice(0, FIELD_LIMITS.submittedLabel.max),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'requests', newId), payload);
    return {
      id: newId,
      ...payload,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientRequestBrief(
  requestId: string,
  updates: {
    clientName: string;
    clientContact: string;
    categoryId: CategoryId;
    regionId: RegionId;
    needDescription: string;
    budgetRange: string;
  }
): Promise<void> {
  const path = `requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'requests', requestId), {
      clientName: clampLocalized(
        updates.clientName,
        FIELD_LIMITS.clientName.min,
        FIELD_LIMITS.clientName.max,
        { ar: 'عميل', en: 'Client' }
      ),
      clientContact: clampStr(updates.clientContact, FIELD_LIMITS.clientContact.max),
      categoryId: updates.categoryId,
      regionId: updates.regionId,
      needDescription: clampLocalized(
        updates.needDescription,
        FIELD_LIMITS.needDescription.min,
        FIELD_LIMITS.needDescription.max,
        { ar: 'طلب خدمة جديدة من منصة لها.', en: 'New project request via Laha.' }
      ),
      budgetRange: clampLocalized(
        updates.budgetRange,
        FIELD_LIMITS.budgetRange.min,
        FIELD_LIMITS.budgetRange.max,
        { ar: '5,000 – 15,000 ر.س', en: '5,000 – 15,000 SAR' }
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function decideClientRequest(
  requestId: string,
  decidedByUid: string,
  status: 'accepted' | 'declined',
  decisionNote: string
): Promise<void> {
  const path = `requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'requests', requestId), {
      status,
      decisionNote: clampStr(decisionNote, FIELD_LIMITS.decisionNote.max),
      decidedByUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClientRequest(requestId: string): Promise<void> {
  const path = `requests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Direct Startup Messaging (/conversations/{id} & /messages/{msgId})
// ============================================================================

function sanitizeDocIdSegment(raw: string, maxLen: number): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '');
  return (cleaned || 'id').slice(0, maxLen);
}

export function buildConversationId(startupId: string, clientUid: string): string {
  const sPart = sanitizeDocIdSegment(startupId, 52);
  const cPart = sanitizeDocIdSegment(clientUid, 52);
  return `conv_${sPart}_${cPart}`;
}

function mapDocToConversation(
  id: string,
  data: Record<string, unknown>
): Conversation {
  return {
    id,
    clientUid: typeof data.clientUid === 'string' ? data.clientUid : '',
    clientName: typeof data.clientName === 'string' ? data.clientName : '',
    startupId: typeof data.startupId === 'string' ? data.startupId : '',
    startupOwnerId:
      typeof data.startupOwnerId === 'string' ? data.startupOwnerId : '',
    startupName: (data.startupName as LocalizedText) || { ar: '', en: '' },
    serviceTitle: (data.serviceTitle as LocalizedText) || { ar: '', en: '' },
    lastMessageText:
      typeof data.lastMessageText === 'string' ? data.lastMessageText : '',
    lastSenderUid:
      typeof data.lastSenderUid === 'string' ? data.lastSenderUid : '',
    messageCount:
      typeof data.messageCount === 'number' ? data.messageCount : 0,
    createdAtMs: tsToMillis(data.createdAt),
    updatedAtMs: tsToMillis(data.updatedAt),
  };
}

function mapDocToMessage(
  id: string,
  data: Record<string, unknown>
): ChatMessage {
  return {
    id,
    conversationId:
      typeof data.conversationId === 'string' ? data.conversationId : '',
    senderUid: typeof data.senderUid === 'string' ? data.senderUid : '',
    senderName: typeof data.senderName === 'string' ? data.senderName : '',
    senderRole: data.senderRole === 'startup' ? 'startup' : 'client',
    clientUid: typeof data.clientUid === 'string' ? data.clientUid : '',
    startupOwnerId:
      typeof data.startupOwnerId === 'string' ? data.startupOwnerId : '',
    body: typeof data.body === 'string' ? data.body : '',
    createdAtMs: tsToMillis(data.createdAt),
  };
}

export function subscribeToUserConversations(
  uid: string,
  isAdmin: boolean,
  onData: (items: Conversation[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = 'conversations';

  if (isAdmin) {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((d) =>
          mapDocToConversation(d.id, d.data() as Record<string, unknown>)
        );
        items.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  }

  let asClient: Conversation[] = [];
  let asStartup: Conversation[] = [];

  const emitMerged = () => {
    const byId = new Map<string, Conversation>();
    for (const c of asClient) byId.set(c.id, c);
    for (const c of asStartup) byId.set(c.id, c);
    const merged = Array.from(byId.values()).sort(
      (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)
    );
    onData(merged);
  };

  const unsubClient = onSnapshot(
    query(collection(db, path), where('clientUid', '==', uid)),
    (snapshot) => {
      asClient = snapshot.docs.map((d) =>
        mapDocToConversation(d.id, d.data() as Record<string, unknown>)
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubStartup = onSnapshot(
    query(collection(db, path), where('startupOwnerId', '==', uid)),
    (snapshot) => {
      asStartup = snapshot.docs.map((d) =>
        mapDocToConversation(d.id, d.data() as Record<string, unknown>)
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubClient();
    unsubStartup();
  };
}

export function subscribeToConversationMessages(
  conversationId: string,
  participantField: 'clientUid' | 'startupOwnerId',
  uid: string,
  isAdmin: boolean,
  onData: (items: ChatMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `conversations/${conversationId}/messages`;
  const targetQuery = isAdmin
    ? collection(db, 'conversations', conversationId, 'messages')
    : query(
        collection(db, 'conversations', conversationId, 'messages'),
        where(participantField, '==', uid)
      );

  return onSnapshot(
    targetQuery,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapDocToMessage(d.id, d.data() as Record<string, unknown>)
      );
      items.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function sendConversationMessage(input: {
  existingConversation: Conversation | null;
  startup: StartupService | null;
  clientUid: string;
  clientName: string;
  senderUid: string;
  senderName: string;
  senderRole: 'client' | 'startup';
  body: string;
}): Promise<string> {
  const cleanBody = clampStr(input.body, FIELD_LIMITS.chatMessageBody.max);
  if (!cleanBody) {
    throw new Error('Message cannot be empty.');
  }

  const preview = cleanBody.slice(0, FIELD_LIMITS.lastMessageText.max);
  const cleanSenderName = clampStr(
    input.senderName,
    FIELD_LIMITS.displayName.max,
    'User'
  );
  const cleanClientName = clampStr(
    input.clientName,
    FIELD_LIMITS.displayName.max,
    'Client'
  );

  let conversationId: string;
  let clientUid: string;
  let startupOwnerId: string;

  if (input.existingConversation) {
    conversationId = input.existingConversation.id;
    clientUid = input.existingConversation.clientUid;
    startupOwnerId = input.existingConversation.startupOwnerId;
  } else {
    if (!input.startup || !input.startup.ownerId) {
      throw new Error('Startup is not yet synced to Firestore.');
    }
    conversationId = buildConversationId(input.startup.id, input.clientUid);
    clientUid = input.clientUid;
    startupOwnerId = input.startup.ownerId;
  }

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const convRef = doc(db, 'conversations', conversationId);
  const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
  const path = `conversations/${conversationId}/messages/${msgId}`;

  try {
    const batch = writeBatch(db);
    const existingSnap = input.existingConversation
      ? null
      : await getDoc(convRef);

    if (!input.existingConversation && !existingSnap?.exists()) {
      if (!input.startup || !input.startup.ownerId) {
        throw new Error('Missing startup details for new conversation.');
      }
      batch.set(convRef, {
        clientUid,
        clientName: cleanClientName,
        startupId: input.startup.id,
        startupOwnerId,
        startupName: clampLocalized(
          input.startup.startupName,
          FIELD_LIMITS.startupName.min,
          FIELD_LIMITS.startupName.max,
          { ar: 'شركة ناشئة', en: 'Startup' }
        ),
        serviceTitle: clampLocalized(
          input.startup.serviceTitle,
          FIELD_LIMITS.serviceTitle.min,
          FIELD_LIMITS.serviceTitle.max,
          { ar: 'خدمة متخصصة', en: 'Specialized Service' }
        ),
        lastMessageText: preview,
        lastSenderUid: input.senderUid,
        messageCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const currentCount = input.existingConversation
        ? input.existingConversation.messageCount
        : Number(existingSnap?.data()?.messageCount ?? 0);
      batch.update(convRef, {
        lastMessageText: preview,
        lastSenderUid: input.senderUid,
        messageCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(msgRef, {
      conversationId,
      senderUid: input.senderUid,
      senderName: cleanSenderName,
      senderRole: input.senderRole,
      clientUid,
      startupOwnerId,
      body: cleanBody,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return conversationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

