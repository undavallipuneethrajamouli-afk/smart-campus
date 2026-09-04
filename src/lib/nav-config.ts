import type { AppRole } from "@/types/db";

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  STUDENT: [
    { label: "Overview", href: "/dashboard/student" },
    { label: "Attendance", href: "/dashboard/student/attendance" },
    { label: "Notes", href: "/dashboard/student/notes" },
    { label: "Timetable", href: "/dashboard/student/timetable" },
    { label: "Fees", href: "/dashboard/student/fees" },
    { label: "Digital ID", href: "/dashboard/student/id" },
    { label: "AI Helpdesk", href: "/dashboard/student/ai" },
  ],
  FACULTY: [
    { label: "Overview", href: "/dashboard/faculty" },
    { label: "Mark Attendance", href: "/dashboard/faculty/attendance" },
    { label: "Upload Notes", href: "/dashboard/faculty/notes" },
    { label: "My Classes", href: "/dashboard/faculty/classes" },
  ],
  HOD: [
    { label: "Overview", href: "/dashboard/hod" },
    { label: "Department Analytics", href: "/dashboard/hod/analytics" },
  ],
  ADMIN: [
    { label: "Overview", href: "/dashboard/admin" },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Timetable", href: "/dashboard/admin/timetable" },
    { label: "Fees", href: "/dashboard/admin/fees" },
    { label: "Departments", href: "/dashboard/admin/departments" },
    { label: "Analytics", href: "/dashboard/admin/analytics" },
  ],
  BUS_DRIVER: [{ label: "Overview", href: "/dashboard/driver" }],
  CANTEEN_STAFF: [{ label: "Overview", href: "/dashboard/canteen" }],
  ALUMNI: [{ label: "Overview", href: "/dashboard/alumni" }],
};
