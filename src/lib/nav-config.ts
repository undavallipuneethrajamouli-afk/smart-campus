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
    { label: "Events & News", href: "/dashboard/student/events" },
    { label: "Canteen", href: "/dashboard/student/canteen" },
    { label: "Lost & Found", href: "/dashboard/student/lost-found" },
    { label: "Messages", href: "/dashboard/student/messages" },
    { label: "Resume Builder", href: "/dashboard/student/resume" },
    { label: "Marketplace", href: "/dashboard/student/marketplace" },
    { label: "Projects & Tutoring", href: "/dashboard/student/projects" },
    { label: "Campus Coins", href: "/dashboard/student/coins" },
    { label: "Polls", href: "/dashboard/student/polls" },
    { label: "Transport", href: "/dashboard/student/transport" },
  ],
  FACULTY: [
    { label: "Overview", href: "/dashboard/faculty" },
    { label: "Mark Attendance", href: "/dashboard/faculty/attendance" },
    { label: "Upload Notes", href: "/dashboard/faculty/notes" },
    { label: "My Classes", href: "/dashboard/faculty/classes" },
    { label: "Messages", href: "/dashboard/faculty/messages" },
    { label: "Lost & Found", href: "/dashboard/faculty/lost-found" },
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
    { label: "Events & News", href: "/dashboard/admin/events" },
    { label: "Departments", href: "/dashboard/admin/departments" },
    { label: "Analytics", href: "/dashboard/admin/analytics" },
    { label: "Campus Coins", href: "/dashboard/admin/coins" },
    { label: "Polls", href: "/dashboard/admin/polls" },
    { label: "Transport", href: "/dashboard/admin/transport" },
  ],
  BUS_DRIVER: [{ label: "Overview", href: "/dashboard/driver" }],
  CANTEEN_STAFF: [
    { label: "Overview", href: "/dashboard/canteen" },
    { label: "Orders", href: "/dashboard/canteen/orders" },
    { label: "Menu", href: "/dashboard/canteen/menu" },
  ],
  ALUMNI: [{ label: "Overview", href: "/dashboard/alumni" }],
};
