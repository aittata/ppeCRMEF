// frontend/src/shared/types/index.ts
// ═══════════════════════════════════════════════════════
// CONTRAT PARTAGÉ — Ne pas modifier les noms de types
// Tous les fichiers du projet importent depuis ce fichier
// ═══════════════════════════════════════════════════════

export type Role = 'ADMIN' | 'CADRE_ADMINISTRATIF' | 'ENSEIGNANT' | 'PARENT'
export type EtatAbsence = 'EN_ATTENTE' | 'JUSTIFIEE' | 'NON_JUSTIFIEE'
export type JourSemaine = 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI'
export type NiveauClasse = '1AC' | '2AC' | '3AC'
export type ToastType = 'success' | 'error' | 'info' | 'warning'

// ─── Constantes UI ───────────────────────────────────────────────────────────
export const JOURS_SEMAINE: JourSemaine[] = ['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI']
export const NIVEAUX_CLASSE: NiveauClasse[] = ['1AC','2AC','3AC']
export const ETAT_LABELS: Record<EtatAbsence, string> = {
  EN_ATTENTE: 'En attente', JUSTIFIEE: 'Justifiée', NON_JUSTIFIEE: 'Non justifiée'
}
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur', CADRE_ADMINISTRATIF: 'Cadre administratif', ENSEIGNANT: 'Enseignant', PARENT: 'Parent'
}
export const JOUR_LABELS: Record<JourSemaine, string> = {
  LUNDI:'Lundi', MARDI:'Mardi', MERCREDI:'Mercredi',
  JEUDI:'Jeudi', VENDREDI:'Vendredi', SAMEDI:'Samedi'
}

export const MATIERES = [
    "Arabe",
    "Français",
    "Mathématiques",
    "Physiques et Chimie",
    "Sciences de la Vie et de la Terre",
    "Histoire et Géographie",
    "Éducation Islamique",
    "Anglais",
    "Éducation Physique et Sportive",
    "Informatique",
    "Technologie"
];

// ─── Entités ─────────────────────────────────────────────────────────────────
export interface User {
  id: string
  username: string
  nom: string
  prenom: string
  cin?: string
  contact?: string
  role: Role
  actif: boolean
  matiere?: string    // ENSEIGNANT seulement
  poste?: string      // CADRE_ADMINISTRATIF et ADMIN
  createdAt: string
  updatedAt: string
}

export interface Classe {
  id: string
  niveau: NiveauClasse
  numero: number
  actif: boolean
  createdAt: string
  libelle?: string    // getter du backend : '{niveau}-{numero}'
}

export interface Eleve {
  id: string
  nom: string
  prenom: string
  codeMassar: string
  birthDate: string   // ISO date
  classeId: string | null
  parentId: string | null
  actif: boolean
  classe?: Classe
  parent?: User
}

export interface Seance {
  id: string
  enseignantId: string
  classeId: string
  matiere: string
  jourSemaine: JourSemaine
  heureDebut: string  // 'HH:MM'
  heureFin: string    // 'HH:MM'
  salle?: number
  actif: boolean
  enseignant?: Pick<User,'id'|'nom'|'prenom'|'matiere'>
  classe?: Classe
}

export interface Absence {
  id: string
  eleveId: string
  classeId: string
  saisieParId: string
  seanceId?: string
  date: string        // ISO date
  heureDebut: string
  heureFin: string
  matiere: string
  etat: EtatAbsence
  motif?: string
  modifieeParId?: string
  createdAt: string
  updatedAt: string
  eleve?: { nom: string; prenom: string; codeMassar: string; classe?: Classe }
  saisiePar?: { nom: string; prenom: string }
  seance?: Seance
  classe?: Classe
}

// ─── API Payloads ─────────────────────────────────────────────────────────────
export interface LoginPayload { username: string; password: string }
export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: Omit<User,'createdAt'|'updatedAt'>
}

export interface CreateUserPayload {
  username: string; nom: string; prenom: string; password: string; cin: string
  contact?: string
  role?: Role; matiere?: string; poste?: string
  eleveIds?: string[]
}
export interface UpdateUserPayload extends Partial<CreateUserPayload> { actif?: boolean }

export interface CreateClassePayload {
  niveau: NiveauClasse; numero: number; actif?: boolean;
}

export interface CreateElevePayload {
  nom: string; prenom: string; codeMassar: string
  birthDate: string; classeId: string
}

export interface CreateSeancePayload {
  enseignantId: string; classeId: string; matiere: string
  jourSemaine: JourSemaine; heureDebut: string; heureFin: string; salle?: number
}

export interface CreateAbsencePayload {
  eleveId: string; date: string; seanceId?: string
  heureDebut?: string; heureFin?: string; matiere?: string
  classeId?: string; motif?: string
}
export interface UpdateEtatPayload {
  etat: Exclude<EtatAbsence,'EN_ATTENTE'>
  motif?: string
}

// ─── Réponses API ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number
}
export interface ApiError {
  success: false; statusCode: number; error: string; timestamp: string; path: string
}
export interface ApiSuccess<T> {
  success: true; data: T; timestamp: string
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
export interface FilterAbsence {
  eleveId?: string; classeId?: string; enseignantId?: string
  etat?: EtatAbsence; matiere?: string
  dateDebut?: string; dateFin?: string; annee?: string
  page?: number; limit?: number; search?: string
}
export interface FilterEleve {
  classeId?: string; actif?: boolean
  search?: string; page?: number; limit?: number
}
export interface FilterClasse {
  niveau?: NiveauClasse; actif?: boolean
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalAbsences: number
  absencesAujourdHui: number
  enAttente: number
  justifiees: number
  nonJustifiees: number
  tauxJustification: number
  topElevesAbsents: Array<{ eleveId:string; nom:string; prenom:string; classe:string; count:number }>
  absencesParClasse: Array<{ classeId:string; libelle:string; count:number; tauxAbsenteisme:number }>
  absencesParMatiere: Array<{ matiere:string; count:number }>
  absencesParJour: Array<{ jour:string; count:number }>
  evolutionSemaine: Array<{ semaine:string; total:number }>
  classesAlerteAbsenteisme: Array<{ classeId:string; libelle:string; tauxAbsenteisme:number }>
  totalElevesActifs?: number
  elevesParNiveau?: Array<{ niveau: string; count: number }>
  totalElevesInactifs?: number
}
export interface EleveStats {
  totalAbsences: number; justifiees: number; nonJustifiees: number; enAttente: number
  absencesParMatiere: Array<{ matiere:string; count:number }>
  derniereAbsence: string | null
}

// ─── UI interne ───────────────────────────────────────────────────────────────
export interface Toast { id: string; message: string; type: ToastType; duration: number }
export type Column<T> = {
  key: string
  label: string
  width?: string
  render?: (row: T, index: number) => React.ReactNode
}
