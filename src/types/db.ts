export type AppRole =
  | "STUDENT"
  | "FACULTY"
  | "HOD"
  | "ADMIN"
  | "BUS_DRIVER"
  | "CANTEEN_STAFF"
  | "ALUMNI";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type AnnouncementCategory = "EXAM" | "PLACEMENT" | "NEWS" | "GENERAL";
export type CanteenOrderStatus = "PLACED" | "PREPARING" | "READY" | "COMPLETED";
export type LostFoundType = "LOST" | "FOUND";
export type LostFoundStatus = "OPEN" | "RESOLVED";
export type FeeType = "TUITION" | "BUS" | "LIBRARY" | "OTHER";
export type FeeStatus = "PAID" | "PENDING" | "OVERDUE";

export interface Profile {
  id: string;
  role: AppRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  department_id: string | null;
  roll_number: string;
  year: number;
  section: string;
  admission_year: number;
}

export interface Faculty {
  id: string;
  department_id: string | null;
  designation: string | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string | null;
  semester: number;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_id: string;
  faculty_id: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
}

export interface Note {
  id: string;
  subject_id: string;
  faculty_id: string;
  unit: string | null;
  topic: string;
  academic_year: string;
  section: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  department_id: string;
  section: string;
  academic_year: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  faculty_id: string;
  room: string | null;
}

export interface Fee {
  id: string;
  student_id: string;
  fee_type: FeeType;
  amount: number;
  due_date: string;
  academic_year: string;
}

export interface FeeTransaction {
  id: string;
  fee_id: string;
  amount_paid: number;
  paid_at: string;
  method: string;
  status: FeeStatus;
}

export interface ResumeSkill {
  name: string;
}

export interface ResumeProject {
  title: string;
  description: string;
  link: string;
}

export interface ResumeAchievement {
  title: string;
  date: string;
  description: string;
}

export interface Resume {
  student_id: string;
  headline: string | null;
  summary: string | null;
  skills: ResumeSkill[];
  projects: ResumeProject[];
  achievements: ResumeAchievement[];
  updated_at: string;
}

export interface CampusCoinTransaction {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  awarded_by: string;
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  created_by: string;
  created_at: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  student_id: string;
  option_index: number;
  created_at: string;
}

export type ProjectStatus = "OPEN" | "CLOSED";
export type TutoringType = "REQUEST" | "OFFER";
export type MarketplaceStatus = "AVAILABLE" | "SOLD";

export interface ProjectPost {
  id: string;
  title: string;
  description: string;
  skills_needed: string | null;
  posted_by: string;
  status: ProjectStatus;
  created_at: string;
}

export interface TutoringPost {
  id: string;
  type: TutoringType;
  subject: string;
  description: string | null;
  posted_by: string;
  created_at: string;
}

export interface TransportRoute {
  id: string;
  name: string;
  bus_number: string;
  driver_id: string | null;
  stops: string | null;
  active: boolean;
  created_at: string;
}

export interface BoardingRecord {
  id: string;
  student_id: string;
  route_id: string;
  boarded_at: string;
  verified_by: string;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string | null;
  image_path: string | null;
  seller_id: string;
  status: MarketplaceStatus;
  created_at: string;
}
