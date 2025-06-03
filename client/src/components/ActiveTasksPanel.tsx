import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveTasks } from "@/hooks/useActiveTasks";
import { Loader2, ChevronLeft, Pause } from "lucide-react";

export default function ActiveTasksPanel() {
  const { data: tasks, isLoading } = useActiveTasks();

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'job_collection':
        return 'fas fa-search';
      case 'comment_analysis':
        return 'fas fa-comments';
      case 'auto_reply':
        return 'fas fa-paper-plane';
      default:
        return 'fas fa-tasks';
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'job_collection':
        return 'bg-blue-500';
      case 'comment_analysis':
        return 'bg-orange-500';
      case 'auto_reply':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-100 text-green-800">نشط</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">معلق</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">مكتمل</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">فشل</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTaskName = (task: any) => {
    switch (task.type) {
      case 'job_collection':
        return `جمع وظائف - ${task.source || 'مصدر متعدد'}`;
      case 'comment_analysis':
        return 'تحليل التعليقات';
      case 'auto_reply':
        return 'إرسال الردود التلقائية';
      default:
        return task.name;
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 1) return 'أقل من دقيقة';
    if (diff < 60) return `${diff} دقيقة`;
    const hours = Math.floor(diff / 60);
    return `${hours} ساعة و ${diff % 60} دقيقة`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>المهام النشطة</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
            عرض الكل <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {!tasks || tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد مهام نشطة حالياً
              </p>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className={`w-10 h-10 ${getTaskColor(task.type)} rounded-lg flex items-center justify-center`}>
                      <i className={`${getTaskIcon(task.type)} text-white`}></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getTaskName(task)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {task.startedAt ? 
                          `يعمل منذ ${formatDuration(task.startedAt)}` : 
                          'في انتظار البدء'
                        }
                      </p>
                      {task.progress > 0 && (
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {getStatusBadge(task.status)}
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
