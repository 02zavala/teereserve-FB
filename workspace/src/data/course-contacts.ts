import type { CourseContacts } from '@/lib/course-contacts';

// Directorio estático inicial de contactos por campo
// NOTA: Reemplaza estos datos con la información real de cada campo.
// Cuando existan contactos en Firestore (courses/{id}.contacts), estos tendrán prioridad.

export const courseContactsDirectory: CourseContacts[] = [
  {
    courseId: 'puerto-los-cabos',
    courseName: 'Puerto Los Cabos Golf Club',
    location: 'San José del Cabo',
    primaryEmails: ['reservations@puertoloscabos.com', 'proshop@puertoloscabos.com'],
    managers: [
      {
        name: 'Gerente de Campo',
        role: 'Manager',
        channels: { email: 'manager@puertoloscabos.com', phone: '+52-624-000-0000', whatsapp: '+52-624-000-0000' },
        notes: 'Contacto principal para confirmación de tee times.'
      }
    ],
    proShop: [
      {
        name: 'Pro Shop',
        role: 'ProShop',
        channels: { email: 'proshop@puertoloscabos.com', phone: '+52-624-000-0001' },
        notes: 'Atiende horarios y ajustes de salida.'
      }
    ],
    operations: [
      {
        name: 'Operaciones',
        role: 'Operations',
        channels: { email: 'ops@puertoloscabos.com' }
      }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    courseId: 'palmilla-golf-club',
    courseName: 'Palmilla Golf Club',
    location: 'San José del Cabo',
    primaryEmails: ['reservations@palmillagolf.com'],
    managers: [
      {
        name: 'Course Manager',
        role: 'Manager',
        channels: { email: 'manager@palmillagolf.com', phone: '+52-624-111-1111' }
      }
    ],
    proShop: [
      {
        name: 'Pro Shop',
        role: 'ProShop',
        channels: { email: 'proshop@palmillagolf.com' }
      }
    ],
    updatedAt: new Date().toISOString()
  }
];