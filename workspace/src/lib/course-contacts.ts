export type ContactChannel = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  telegramChatId?: string;
};

export type CourseContactPerson = {
  name: string;
  role: 'Manager' | 'ProShop' | 'Operations' | 'Billing' | 'Marketing' | 'Owner' | 'Assistant' | 'Other';
  channels: ContactChannel;
  notes?: string;
};

export type CourseContacts = {
  courseId: string;
  courseName?: string;
  location?: string;
  primaryEmails?: string[]; // Correos principales para notificaciones
  managers?: CourseContactPerson[];
  proShop?: CourseContactPerson[];
  operations?: CourseContactPerson[];
  billing?: CourseContactPerson[];
  marketing?: CourseContactPerson[];
  additional?: CourseContactPerson[];
  updatedAt?: string;
};

// Utilidades
export async function getCourseContacts(courseId: string): Promise<CourseContacts | undefined> {
  if (!courseId) return undefined;

  // 1) Intentar leer desde Firestore dentro del documento del curso (campo "contacts")
  try {
    const { db } = await import('./firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    if (!db) return undefined;
    const courseDocRef = doc(db!, 'courses', courseId);
    const snap = await getDoc(courseDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const contacts = (data as any)?.contacts as CourseContacts | undefined;
      if (contacts) {
        return {
          ...contacts,
          courseId,
          courseName: contacts.courseName || (data as any)?.name,
          location: contacts.location || (data as any)?.location,
        };
      }
    }
  } catch (error) {
    // Silencioso: si Firestore no está disponible, usamos dataset local
    // console.warn('getCourseContacts: Firestore not available, using local dataset', error);
  }

  // 2) Fallback a dataset local estático
  try {
    const { courseContactsDirectory } = await import('@/data/course-contacts');
    return courseContactsDirectory.find((c) => c.courseId === courseId);
  } catch (error) {
    // Dataset no disponible
    return undefined;
  }
}

export async function listAllCourseContacts(): Promise<CourseContacts[]> {
  const list: CourseContacts[] = [];

  // Combinar Firestore y dataset local
  try {
    const { db } = await import('./firebase');
    const { collection, getDocs } = await import('firebase/firestore');
    if (!db) return list;
    const snapshot = await getDocs(collection(db!, 'courses'));
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const contacts = (data as any)?.contacts as CourseContacts | undefined;
      if (contacts) {
        list.push({
          ...contacts,
          courseId: docSnap.id,
          courseName: contacts.courseName || (data as any)?.name,
          location: contacts.location || (data as any)?.location,
        });
      }
    }
  } catch {
    // Ignorar si Firestore no está disponible
  }

  // Añadir del dataset local, evitando duplicados por courseId
  try {
    const { courseContactsDirectory } = await import('@/data/course-contacts');
    const existing = new Set(list.map((c) => c.courseId));
    for (const entry of courseContactsDirectory) {
      if (!existing.has(entry.courseId)) {
        list.push(entry);
      }
    }
  } catch {
    // No dataset
  }

  return list;
}

export async function resolveCourseEmailRecipients(courseId: string): Promise<string[]> {
  const contacts = await getCourseContacts(courseId);
  if (!contacts) return [];

  const emails = new Set<string>();

  // Correos principales
  (contacts.primaryEmails || []).forEach((e) => e && emails.add(e.toLowerCase()));

  // Managers y áreas clave
  const collect = (arr?: CourseContactPerson[]) => {
    (arr || []).forEach((p) => {
      const email = p.channels.email;
      if (email) emails.add(email.toLowerCase());
    });
  };

  collect(contacts.managers);
  collect(contacts.proShop);
  collect(contacts.operations);
  collect(contacts.billing);

  return Array.from(emails);
}

export function validateCourseContacts(entry: CourseContacts): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!entry.courseId) errors.push('courseId es requerido');

  const hasAnyEmail = (
    (entry.primaryEmails && entry.primaryEmails.length > 0) ||
    (entry.managers || []).some((m) => !!m.channels.email) ||
    (entry.proShop || []).some((m) => !!m.channels.email) ||
    (entry.operations || []).some((m) => !!m.channels.email) ||
    (entry.billing || []).some((m) => !!m.channels.email)
  );

  if (!hasAnyEmail) errors.push('Debe existir al menos un email de contacto');

  return { ok: errors.length === 0, errors };
}