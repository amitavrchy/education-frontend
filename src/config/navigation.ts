import {
  Activity,
  AudioLines,
  Award,
  Baby,
  Bell,
  BookCopy,
  BookOpen,
  Bot,
  Building,
  CalendarDays,
  CalendarRange,
  Camera,
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileCheck,
  FileQuestionMark,
  FileStack,
  FileText,
  FlaskConical,
  FolderOpen,
  GalleryVerticalEnd,
  GraduationCap,
  HeartHandshake,
  History,
  Languages,
  LayoutDashboard,
  Layers,
  Library,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Mic,
  NotebookPen,
  PenLine,
  Radar,
  Receipt,
  School,
  Search,
  Settings,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  WifiOff,
} from "lucide-react";
import type { MarketingNavLink, NavItem, PortalKey, PortalNavigation } from "@/types";

const settings: NavItem = { slug: "settings", titleKey: "nav.settings", icon: Settings };
const notifications: NavItem = { slug: "notifications", titleKey: "nav.notifications", icon: Bell };

/**
 * Single source of truth for portal navigation.
 * Sidebar, mobile drawer, bottom bar, breadcrumbs and the command palette all derive from this.
 * Items carry an optional `permission`; the shell hides items the current role cannot use and
 * the route guard renders the access-denied state for direct URL access.
 */
export const portalNavigation: Record<PortalKey, PortalNavigation> = {
  student: {
    key: "student",
    titleKey: "portals.student",
    basePath: "/student",
    sections: [
      {
        items: [
          { slug: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard, mobile: true },
          { slug: "ai-tutor", titleKey: "nav.aiTutor", icon: Bot, badge: "AI", mobile: true },
          { slug: "voice-tutor", titleKey: "nav.voiceTutor", icon: Mic },
          { slug: "photo-solver", titleKey: "nav.photoSolver", icon: Camera },
        ],
      },
      {
        labelKey: "navGroups.learn",
        items: [
          { slug: "curriculum", titleKey: "nav.curriculum", icon: Layers, mobile: true },
          { slug: "library", titleKey: "nav.library", icon: Library },
          { slug: "questions", titleKey: "nav.questions", icon: FileQuestionMark },
          { slug: "board-questions", titleKey: "nav.boardQuestions", icon: ListChecks },
          { slug: "institution-questions", titleKey: "nav.institutionQuestions", icon: School },
          { slug: "practice", titleKey: "nav.practice", icon: PenLine },
          { slug: "notes", titleKey: "nav.notes", icon: NotebookPen },
          { slug: "flashcards", titleKey: "nav.flashcards", icon: GalleryVerticalEnd },
          { slug: "english-coach", titleKey: "nav.englishCoach", icon: Languages },
          { slug: "labs", titleKey: "nav.labs", icon: FlaskConical },
          { slug: "audio", titleKey: "nav.audio", icon: AudioLines },
        ],
      },
      {
        labelKey: "navGroups.exams",
        items: [
          { slug: "exams", titleKey: "nav.exams", icon: ClipboardList, mobile: true },
          { slug: "results", titleKey: "nav.results", icon: Trophy },
          { slug: "answer-evaluation", titleKey: "nav.answerEvaluation", icon: FileCheck },
        ],
      },
      {
        labelKey: "navGroups.progress",
        items: [
          { slug: "analytics", titleKey: "nav.adaptive", icon: Radar },
          { slug: "study-planner", titleKey: "nav.studyPlanner", icon: CalendarDays },
          { slug: "achievements", titleKey: "nav.achievements", icon: Award },
        ],
      },
      {
        labelKey: "navGroups.account",
        items: [
          { slug: "bookmarks", titleKey: "nav.bookmarks", icon: BookCopy },
          { slug: "offline", titleKey: "nav.offline", icon: WifiOff },
          notifications,
          { slug: "subscription", titleKey: "nav.subscription", icon: CreditCard },
          { slug: "help", titleKey: "nav.help", icon: LifeBuoy },
          settings,
        ],
      },
    ],
  },
  parent: {
    key: "parent",
    titleKey: "portals.parent",
    basePath: "/parent",
    sections: [
      {
        items: [
          { slug: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard },
          { slug: "children", titleKey: "nav.children", icon: Baby },
          { slug: "progress", titleKey: "nav.progress", icon: TrendingUp },
          { slug: "results", titleKey: "nav.results", icon: Trophy },
          { slug: "calendar", titleKey: "nav.calendar", icon: CalendarRange },
          { slug: "goals", titleKey: "nav.goals", icon: Target },
          { slug: "feedback", titleKey: "nav.feedback", icon: HeartHandshake },
          { slug: "reports", titleKey: "nav.reports", icon: FileText },
        ],
      },
      {
        labelKey: "navGroups.account",
        items: [
          notifications,
          { slug: "privacy", titleKey: "nav.privacy", icon: ShieldCheck },
          { slug: "subscription", titleKey: "nav.subscription", icon: CreditCard },
          settings,
        ],
      },
    ],
  },
  teacher: {
    key: "teacher",
    titleKey: "portals.teacher",
    basePath: "/teacher",
    sections: [
      { items: [{ slug: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard }] },
      {
        labelKey: "navGroups.review",
        items: [
          { slug: "review", titleKey: "nav.review", icon: ShieldCheck, permission: "content.review" },
          { slug: "questions", titleKey: "nav.questions", icon: FileQuestionMark, permission: "content.create" },
          { slug: "rubrics", titleKey: "nav.rubrics", icon: ListChecks, permission: ["rubric.manage", "content.create"] },
          { slug: "evaluations", titleKey: "nav.evaluations", icon: FileCheck, permission: "evaluation.review" },
          { slug: "history", titleKey: "nav.history", icon: History, permission: ["content.review", "content.submit"] },
        ],
      },
      {
        labelKey: "navGroups.teaching",
        items: [
          { slug: "subjects", titleKey: "nav.subjects", icon: BookOpen, permission: "teacher.dashboard" },
          { slug: "exams", titleKey: "nav.exams", icon: ClipboardList, permission: "exam.create" },
          { slug: "assignments", titleKey: "nav.assignments", icon: ClipboardCheck, permission: "assignment.manage" },
          { slug: "submissions", titleKey: "nav.submissions", icon: FileStack, permission: "submission.review" },
          { slug: "students", titleKey: "nav.students", icon: Users, permission: "students.view" },
          { slug: "analytics", titleKey: "nav.analytics", icon: ChartLine, permission: "students.view" },
        ],
      },
      { labelKey: "navGroups.account", items: [notifications, settings] },
    ],
  },
  institution: {
    key: "institution",
    titleKey: "portals.institution",
    basePath: "/institution",
    sections: [
      {
        items: [
          { slug: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard },
          { slug: "onboarding", titleKey: "nav.onboarding", icon: Sparkles },
        ],
      },
      {
        labelKey: "navGroups.setup",
        items: [
          { slug: "profile", titleKey: "nav.profile", icon: Building },
          { slug: "sessions", titleKey: "nav.sessions", icon: CalendarRange },
          { slug: "classes", titleKey: "nav.classes", icon: School },
          { slug: "subjects", titleKey: "nav.subjects", icon: BookOpen },
        ],
      },
      {
        labelKey: "navGroups.people",
        items: [
          { slug: "students", titleKey: "nav.students", icon: Users },
          { slug: "teachers", titleKey: "nav.teachers", icon: GraduationCap },
        ],
      },
      {
        labelKey: "navGroups.academics",
        items: [
          { slug: "exams", titleKey: "nav.exams", icon: ClipboardList },
          { slug: "assignments", titleKey: "nav.assignments", icon: ClipboardCheck },
          { slug: "question-papers", titleKey: "nav.questionPapers", icon: FileStack },
          { slug: "question-bank", titleKey: "nav.questionBank", icon: FileQuestionMark },
          { slug: "resources", titleKey: "nav.resources", icon: FolderOpen },
          { slug: "analytics", titleKey: "nav.analytics", icon: ChartLine },
        ],
      },
      {
        labelKey: "navGroups.communication",
        items: [
          { slug: "announcements", titleKey: "nav.announcements", icon: Megaphone },
          notifications,
        ],
      },
      {
        labelKey: "navGroups.account",
        items: [
          { slug: "billing", titleKey: "nav.billing", icon: CreditCard, permission: "institution.billing" },
          settings,
        ],
      },
    ],
  },
  admin: {
    key: "admin",
    titleKey: "portals.admin",
    basePath: "/admin",
    sections: [
      {
        items: [
          { slug: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard, permission: "admin.access" },
          { slug: "analytics", titleKey: "nav.analytics", icon: ChartLine, permission: "analytics.view" },
        ],
      },
      {
        labelKey: "navGroups.content",
        items: [
          { slug: "curriculum", titleKey: "nav.curriculum", icon: Layers, permission: "curriculum.manage" },
          { slug: "books", titleKey: "nav.books", icon: Library, permission: "books.manage" },
          { slug: "questions", titleKey: "nav.questions", icon: FileQuestionMark, permission: "questions.manage" },
          { slug: "board-questions", titleKey: "nav.boardQuestions", icon: ListChecks, permission: "board.manage" },
          { slug: "institution-questions", titleKey: "nav.institutionQuestions", icon: School, permission: "institutionPapers.moderate" },
          { slug: "exams", titleKey: "nav.exams", icon: ClipboardList, permission: "exams.manage" },
          { slug: "content-review", titleKey: "nav.contentReview", icon: ShieldCheck, permission: "content.review" },
          { slug: "coverage", titleKey: "nav.coverage", icon: Activity, permission: "coverage.view" },
        ],
      },
      {
        labelKey: "navGroups.ai",
        items: [{ slug: "knowledge-base", titleKey: "nav.knowledgeBase", icon: Database, permission: ["kb.view", "kb.manage"] }],
      },
      {
        labelKey: "navGroups.people",
        items: [
          { slug: "users", titleKey: "nav.users", icon: UserCog, permission: ["users.view", "users.manage"] },
          { slug: "teachers", titleKey: "nav.teachers", icon: GraduationCap, permission: "teachers.manage" },
          { slug: "institutions", titleKey: "nav.institutions", icon: Building, permission: "users.manage" },
        ],
      },
      {
        labelKey: "navGroups.business",
        items: [{ slug: "subscriptions", titleKey: "nav.subscriptions", icon: Receipt, permission: ["billing.view", "billing.manage"] }],
      },
      {
        labelKey: "navGroups.system",
        items: [
          { slug: "moderation", titleKey: "nav.moderation", icon: ShieldX, permission: "moderation.handle" },
          { slug: "security", titleKey: "nav.security", icon: ShieldCheck, permission: ["audit.view", "security.manage"] },
          { slug: "notifications", titleKey: "nav.notifications", icon: Bell },
          { slug: "settings", titleKey: "nav.settings", icon: Settings },
        ],
      },
    ],
  },
};

export function portalItems(portal: PortalKey): NavItem[] {
  return portalNavigation[portal].sections.flatMap((section) => section.items);
}

export function getNavItem(portal: PortalKey, slug: string): NavItem | undefined {
  return portalItems(portal).find((item) => item.slug === slug);
}

/** Extra command-palette entries that are not sidebar items. */
export const extraStudentCommands = [{ slug: "search", titleKey: "nav.search", icon: Search }] as const;

export const marketingNavigation: MarketingNavLink[] = [
  { titleKey: "marketingNav.features", href: "/features" },
  { titleKey: "marketingNav.pricing", href: "/pricing" },
  { titleKey: "marketingNav.parents", href: "/for-parents" },
  { titleKey: "marketingNav.teachers", href: "/for-teachers" },
  { titleKey: "marketingNav.schools", href: "/for-schools" },
  { titleKey: "marketingNav.faq", href: "/faq" },
];

export const marketingFooterNavigation: MarketingNavLink[] = [
  { titleKey: "marketingNav.about", href: "/about" },
  { titleKey: "marketingNav.contact", href: "/contact" },
  { titleKey: "marketingNav.help", href: "/help" },
  { titleKey: "marketingNav.terms", href: "/terms" },
  { titleKey: "marketingNav.privacy", href: "/privacy" },
  { titleKey: "marketingNav.accessibility", href: "/accessibility" },
];

