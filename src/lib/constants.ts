export const SUBMENUS = [
  "Sumatif Lingkup Materi",
  "STS Ganjil",
  "STS Genap",
  "SAS Ganjil",
  "SAS Genap",
  "USP",
] as const;

export const TINGKAT_OPTIONS = ["VII", "VIII", "IX"] as const;

export const MATA_PELAJARAN_OPTIONS = [
  "Bahasa Indonesia",
  "Pendidikan Agama dan Budi Pekerti (PABP)",
  "Pendidikan Pancasila",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Matematika",
  "Bahasa Inggris",
  "Seni Budaya dan Prakarya (SBDP)",
  "Pendidikan Jasmani dan Olah Raga (PJOK)",
  "Informatika",
  "Bahasa Sunda",
] as const;

export function formatKelas(tingkat: string): string {
  return `Kelas ${tingkat}`;
}

export type SchoolYear = { id: string; label: string; isActive: boolean };

export type ExamEntry = {
  id: string;
  schoolYearId: string;
  schoolYear: string | null;
  teacher: string;
  kelas: string;
  submenu: string;
  mataPelajaran: string;
  formUrl: string;
  isVisible: boolean;
  updatedAt: string;
};

export type StudentExam = {
  id: string;
  submenu: string;
  mataPelajaran: string;
  formUrl: string;
};

export type Student = { tingkat: string; kelas: string; nama: string };
