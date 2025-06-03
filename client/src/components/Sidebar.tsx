import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/",
    icon: "fas fa-tachometer-alt",
    label: "لوحة التحكم",
    exact: true
  },
  {
    href: "/job-collection",
    icon: "fas fa-search",
    label: "جمع الوظائف"
  },
  {
    href: "/comment-analysis",
    icon: "fas fa-comments",
    label: "تحليل التعليقات"
  },
  {
    href: "/auto-replies",
    icon: "fas fa-reply",
    label: "الردود التلقائية"
  },
  {
    href: "/task-scheduling",
    icon: "fas fa-clock",
    label: "جدولة المهام"
  },
  {
    href: "/analytics",
    icon: "fas fa-chart-line",
    label: "التحليلات"
  },
  {
    href: "/settings",
    icon: "fas fa-cog",
    label: "الإعدادات"
  }
];

export default function Sidebar() {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Smart Job Collector</h1>
            <p className="text-sm text-gray-500">جامع الوظائف الذكي</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-colors cursor-pointer",
                isActive(item.href, item.exact)
                  ? "bg-primary bg-opacity-10 text-primary"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className={cn(
                isActive(item.href, item.exact) ? "font-medium" : ""
              )}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 space-x-reverse p-3 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <i className="fas fa-user text-white text-sm"></i>
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">مدير النظام</p>
            <p className="text-xs text-gray-500">متصل</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
