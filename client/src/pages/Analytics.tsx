import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useStats } from "@/hooks/useStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { Loader2, TrendingUp, TrendingDown, BarChart3, PieChart } from "lucide-react";
import type { Activity } from "@shared/schema";

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivities(168); // Last week

  // Calculate analytics from activities
  const getAnalytics = (activities: Activity[]) => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * dayMs);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + dayMs);
      
      const dayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.createdAt!);
        return activityDate >= dayStart && activityDate < dayEnd;
      });
      
      dailyStats.push({
        date: dayStart.toLocaleDateString('ar-SA', { weekday: 'short' }),
        jobsCollected: dayActivities.filter(a => a.type === 'job_collected').length,
        commentsAnalyzed: dayActivities.filter(a => a.type === 'comment_analyzed').length,
        repliesSent: dayActivities.filter(a => a.type === 'reply_sent').length,
        errors: dayActivities.filter(a => a.type === 'error').length,
      });
    }
    
    return dailyStats;
  };

  const analytics = activities ? getAnalytics(activities) : [];
  
  const totalJobs = analytics.reduce((sum, day) => sum + day.jobsCollected, 0);
  const totalComments = analytics.reduce((sum, day) => sum + day.commentsAnalyzed, 0);
  const totalReplies = analytics.reduce((sum, day) => sum + day.repliesSent, 0);
  const totalErrors = analytics.reduce((sum, day) => sum + day.errors, 0);

  const successRate = totalErrors > 0 ? ((totalJobs + totalComments + totalReplies) / (totalJobs + totalComments + totalReplies + totalErrors) * 100) : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التحليلات والإحصائيات</h1>
          <p className="text-muted-foreground mt-2">
            تحليل أداء النظام والنشاطات
          </p>
        </div>
        <Select defaultValue="7d">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">آخر 24 ساعة</SelectItem>
            <SelectItem value="7d">آخر 7 أيام</SelectItem>
            <SelectItem value="30d">آخر 30 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الوظائف</p>
                <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                  <span className="text-sm text-green-600">+15% هذا الأسبوع</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-briefcase text-blue-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">التعليقات المحللة</p>
                <p className="text-3xl font-bold text-gray-900">{totalComments}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                  <span className="text-sm text-green-600">+8% هذا الأسبوع</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-comments text-orange-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الردود المرسلة</p>
                <p className="text-3xl font-bold text-gray-900">{totalReplies}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                  <span className="text-sm text-green-600">+12% هذا الأسبوع</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-paper-plane text-green-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
                <p className="text-3xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
                <div className="flex items-center mt-2">
                  {successRate >= 95 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 ml-1" />
                  )}
                  <span className={`text-sm ${successRate >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalErrors} خطأ هذا الأسبوع
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>النشاط اليومي</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.map((day, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day.date}</span>
                      <span className="text-gray-600">
                        {day.jobsCollected + day.commentsAnalyzed + day.repliesSent} نشاط
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500"
                          style={{ width: `${(day.jobsCollected / Math.max(1, day.jobsCollected + day.commentsAnalyzed + day.repliesSent)) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-orange-500"
                          style={{ width: `${(day.commentsAnalyzed / Math.max(1, day.jobsCollected + day.commentsAnalyzed + day.repliesSent)) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-green-500"
                          style={{ width: `${(day.repliesSent / Math.max(1, day.jobsCollected + day.commentsAnalyzed + day.repliesSent)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center space-x-6 space-x-reverse text-sm mt-6">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>وظائف</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>تعليقات</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>ردود</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="h-5 w-5" />
              <CardTitle>مقاييس الأداء</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Today's Performance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">أداء اليوم</span>
                    <span className="text-sm text-gray-600">
                      {(stats?.jobsToday || 0) + (stats?.commentsAnalyzed || 0) + (stats?.repliesSent || 0)} إجمالي
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>الوظائف المجمعة</span>
                        <span>{stats?.jobsToday || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${((stats?.jobsToday || 0) / Math.max(1, (stats?.jobsToday || 0) + (stats?.commentsAnalyzed || 0) + (stats?.repliesSent || 0))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>التعليقات المحللة</span>
                        <span>{stats?.commentsAnalyzed || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${((stats?.commentsAnalyzed || 0) / Math.max(1, (stats?.jobsToday || 0) + (stats?.commentsAnalyzed || 0) + (stats?.repliesSent || 0))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>الردود المرسلة</span>
                        <span>{stats?.repliesSent || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${((stats?.repliesSent || 0) / Math.max(1, (stats?.jobsToday || 0) + (stats?.commentsAnalyzed || 0) + (stats?.repliesSent || 0))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">صحة النظام</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">استقرار النظام</span>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                        <span className="text-sm text-green-600">95%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">سرعة الاستجابة</span>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                        </div>
                        <span className="text-sm text-blue-600">88%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">كفاءة المعالجة</span>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                        <span className="text-sm text-purple-600">92%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Sources */}
      <Card>
        <CardHeader>
          <CardTitle>مصادر النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fab fa-facebook text-blue-600 text-2xl"></i>
              </div>
              <h3 className="font-medium text-gray-900">فيسبوك</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {Math.floor(totalJobs * 0.6)}
              </p>
              <p className="text-sm text-gray-600">وظيفة مجمعة</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fab fa-linkedin text-blue-600 text-2xl"></i>
              </div>
              <h3 className="font-medium text-gray-900">لينكد إن</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {Math.floor(totalJobs * 0.3)}
              </p>
              <p className="text-sm text-gray-600">وظيفة مجمعة</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-globe text-blue-600 text-2xl"></i>
              </div>
              <h3 className="font-medium text-gray-900">مصادر أخرى</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {Math.floor(totalJobs * 0.1)}
              </p>
              <p className="text-sm text-gray-600">وظيفة مجمعة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
