import { Card } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import ActiveTasksPanel from "@/components/ActiveTasksPanel";
import QuickActionsPanel from "@/components/QuickActionsPanel";
import RecentActivityTable from "@/components/RecentActivityTable";
import { useStats } from "@/hooks/useStats";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">لوحة التحكم الرئيسية</h2>
            <p className="text-gray-600 mt-1">مراقبة ومتابعة عمليات جمع الوظائف والردود التلقائية</p>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600">النظام نشط</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="الوظائف المجمعة اليوم"
          value={stats?.jobsToday || 0}
          icon="fas fa-briefcase"
          color="blue"
          trend={12}
          description="عن الأمس"
        />
        <StatsCard
          title="التعليقات المحللة"
          value={stats?.commentsAnalyzed || 0}
          icon="fas fa-comments"
          color="orange"
          trend={8}
          description="عن الأمس"
        />
        <StatsCard
          title="الردود المرسلة"
          value={stats?.repliesSent || 0}
          icon="fas fa-paper-plane"
          color="green"
          trend={15}
          description="عن الأمس"
        />
        <StatsCard
          title="المهام النشطة"
          value={stats?.activeTasks || 0}
          icon="fas fa-tasks"
          color="gray"
          description="جميعها تعمل بشكل طبيعي"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Active Tasks Panel */}
        <div className="lg:col-span-2">
          <ActiveTasksPanel />
        </div>

        {/* Quick Actions Panel */}
        <div>
          <QuickActionsPanel />
        </div>
      </div>

      {/* Recent Activities Table */}
      <RecentActivityTable />
    </div>
  );
}
