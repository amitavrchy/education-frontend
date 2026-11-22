import {
  Activity,
  Award,
  Baby,
  Bell,
  Bookmark,
  BookOpen,
  Bot,
  Briefcase,
  Building,
  CalendarDays,
  Camera,
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileCheck,
  FileQuestionMark,
  FileText,
  FlaskConical,
  FolderOpen,
  GitBranch,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  Megaphone,
  NotebookPen,
  PenLine,
  Receipt,
  School,
  Settings,
  ShieldX,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
  UserCog,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import type { MarketingNavLink, NavItem, PortalKey, PortalNavigation } from "@/types";

const settings: NavItem = { slug: "settings", title: "সেটিংস", icon: Settings };

/**
 * Single source of truth for portal navigation.
 * Sidebar links, breadcrumbs and placeholder page titles are all derived from this.
 */
export const portalNavigation: Record<PortalKey, PortalNavigation> = {
  student: {
    key: "student",
    title: "শিক্ষার্থী পোর্টাল",
    basePath: "/student",
    sections: [
      {
        items: [
          { slug: "dashboard", title: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { slug: "ai-tutor", title: "AI টিউটর", icon: Bot, badge: "AI" },
          { slug: "photo-solver", title: "ফটো সলভার", icon: Camera },
        ],
      },
      {
        label: "পড়াশোনা",
        items: [
          { slug: "library", title: "লাইব্রেরি", icon: Library },
          { slug: "questions", title: "প্রশ্ন ব্যাংক", icon: FileQuestionMark },
          { slug: "practice", title: "অনুশীলন", icon: PenLine },
          { slug: "notes", title: "নোটস", icon: NotebookPen },
          { slug: "videos", title: "ভিডিও ক্লাস", icon: Video },
          { slug: "practical-lab", title: "প্র্যাকটিক্যাল ল্যাব", icon: FlaskConical },
        ],
      },
      {
        label: "পরীক্ষা ও ফলাফল",
        items: [
          { slug: "exams", title: "পরীক্ষা", icon: ClipboardList },
          { slug: "results", title: "ফলাফল", icon: Trophy },
          { slug: "answer-evaluation", title: "উত্তর মূল্যায়ন", icon: FileCheck },
          { slug: "analytics", title: "অ্যানালিটিক্স", icon: ChartLine },
          { slug: "study-planner", title: "স্টাডি প্ল্যানার", icon: CalendarDays },
        ],
      },
      {
        label: "আরও",
        items: [
          { slug: "community", title: "কমিউনিটি", icon: Users },
          { slug: "career", title: "ক্যারিয়ার", icon: Briefcase },
          { slug: "scholarships", title: "স্কলারশিপ", icon: Award },
          { slug: "notices", title: "নোটিশ", icon: Megaphone },
          settings,
        ],
      },
    ],
  },
  teacher: {
    key: "teacher",
    title: "শিক্ষক পোর্টাল",
    basePath: "/teacher",
    sections: [
      {
        items: [
          { slug: "dashboard", title: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { slug: "classes", title: "ক্লাসসমূহ", icon: School },
          { slug: "students", title: "শিক্ষার্থী", icon: Users },
          { slug: "assignments", title: "অ্যাসাইনমেন্ট", icon: ClipboardCheck },
          { slug: "exams", title: "পরীক্ষা", icon: ClipboardList },
          { slug: "question-generator", title: "প্রশ্ন জেনারেটর", icon: Sparkles, badge: "AI" },
          { slug: "materials", title: "শিক্ষা উপকরণ", icon: FolderOpen },
          { slug: "evaluation", title: "মূল্যায়ন", icon: FileCheck },
          { slug: "analytics", title: "অ্যানালিটিক্স", icon: ChartLine },
          settings,
        ],
      },
    ],
  },
  institution: {
    key: "institution",
    title: "প্রতিষ্ঠান পোর্টাল",
    basePath: "/institution",
    sections: [
      {
        items: [
          { slug: "dashboard", title: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { slug: "profile", title: "প্রোফাইল", icon: Building },
          { slug: "branches", title: "শাখাসমূহ", icon: GitBranch },
          { slug: "classes", title: "ক্লাসসমূহ", icon: School },
          { slug: "students", title: "শিক্ষার্থী", icon: Users },
          { slug: "teachers", title: "শিক্ষক", icon: GraduationCap },
          { slug: "subjects", title: "বিষয়সমূহ", icon: BookOpen },
          { slug: "exams", title: "পরীক্ষা", icon: ClipboardList },
          { slug: "results", title: "ফলাফল", icon: Trophy },
          { slug: "analytics", title: "অ্যানালিটিক্স", icon: ChartLine },
          { slug: "billing", title: "বিলিং", icon: CreditCard },
          settings,
        ],
      },
    ],
  },
  parent: {
    key: "parent",
    title: "অভিভাবক পোর্টাল",
    basePath: "/parent",
    sections: [
      {
        items: [
          { slug: "dashboard", title: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { slug: "children", title: "সন্তান", icon: Baby },
          { slug: "progress", title: "অগ্রগতি", icon: TrendingUp },
          { slug: "results", title: "ফলাফল", icon: Trophy },
          { slug: "reports", title: "রিপোর্ট", icon: FileText },
          { slug: "notifications", title: "নোটিফিকেশন", icon: Bell },
          settings,
        ],
      },
    ],
  },
  admin: {
    key: "admin",
    title: "অ্যাডমিন প্যানেল",
    basePath: "/admin",
    sections: [
      {
        items: [{ slug: "dashboard", title: "ড্যাশবোর্ড", icon: LayoutDashboard }],
      },
      {
        label: "ব্যবহারকারী",
        items: [
          { slug: "users", title: "ব্যবহারকারী", icon: UserCog },
          { slug: "students", title: "শিক্ষার্থী", icon: Users },
          { slug: "teachers", title: "শিক্ষক", icon: GraduationCap },
          { slug: "institutions", title: "প্রতিষ্ঠান", icon: Building },
        ],
      },
      {
        label: "কনটেন্ট",
        items: [
          { slug: "books", title: "বই", icon: Bookmark },
          { slug: "subjects", title: "বিষয়", icon: BookOpen },
          { slug: "chapters", title: "অধ্যায়", icon: Layers },
          { slug: "questions", title: "প্রশ্ন", icon: FileQuestionMark },
          { slug: "board-questions", title: "বোর্ড প্রশ্ন", icon: ListChecks },
          { slug: "model-tests", title: "মডেল টেস্ট", icon: ClipboardList },
          { slug: "content-review", title: "কনটেন্ট রিভিউ", icon: ShieldCheck },
        ],
      },
      {
        label: "AI",
        items: [
          { slug: "ai-knowledge", title: "AI নলেজ বেস", icon: Database },
          { slug: "ai-monitoring", title: "AI মনিটরিং", icon: Activity },
        ],
      },
      {
        label: "ব্যবসা ও সিস্টেম",
        items: [
          { slug: "subscriptions", title: "সাবস্ক্রিপশন", icon: Wallet },
          { slug: "payments", title: "পেমেন্ট", icon: Receipt },
          { slug: "analytics", title: "অ্যানালিটিক্স", icon: ChartLine },
          { slug: "moderation", title: "মডারেশন", icon: ShieldX },
          settings,
        ],
      },
    ],
  },
};

export function getNavItem(portal: PortalKey, slug: string): NavItem | undefined {
  return portalNavigation[portal].sections
    .flatMap((section) => section.items)
    .find((item) => item.slug === slug);
}

export const marketingNavigation: MarketingNavLink[] = [
  { title: "ফিচারসমূহ", href: "/features" },
  { title: "মূল্য", href: "/pricing" },
  { title: "আমাদের সম্পর্কে", href: "/about" },
  { title: "প্রশ্নোত্তর", href: "/faq" },
  { title: "যোগাযোগ", href: "/contact" },
];

/** Icon used for the user menu's profile entry. */
export const profileIcon = User;
