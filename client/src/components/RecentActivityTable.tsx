import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { Loader2, Download, Eye, RotateCcw } from "lucide-react";

export default function RecentActivityTable() {
  const { data: activities, isLoading } = useRecentActivities();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job_collected':
        return 'fas fa-search';
      case 'comment_analyzed':
        return 'fas fa-comments';
      case 'reply_sent':
        return 'fas fa-paper-plane';
      case 'error':
        return 'fas fa-exclamation-triangle';
      case 'scheduled_task_completed':
        return 'fas fa-clock';
      default:
        return 'fas fa-info-circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'job_collected':
        return 'bg-blue-100 text-blue-600';
      case 'comment_analyzed':
        return 'bg-orange-100 text-orange-600';
      case 'reply_sent':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      case 'scheduled_task_completed':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800">تحذير</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">فشل</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'job_collected':
        return 'جمع وظائف جديدة';
      case 'comment_analyzed':
        return 'تحليل التعليقات';
      case 'reply_sent':
        return 'إرسال ردود تلقائية';
      case 'error':
        return 'خطأ في النظام';
      case 'scheduled_task_completed':
        return 'مهمة مجدولة مكتملة';
      default:
        return activity.description;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>النشاطات الأخيرة</CardTitle>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Select defaultValue="24h">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">آخر 24 ساعة</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">النشاط</TableHead>
                    <TableHead className="text-right">المصدر</TableHead>
                    <TableHead className="text-right">النتيجة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!activities || activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد نشاطات حديثة
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(activity.createdAt!)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <div className={`w-8 h-8 ${getActivityColor(activity.type)} rounded-lg flex items-center justify-center`}>
                              <i className={`${getActivityIcon(activity.type)} text-sm`}></i>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {getActivityDescription(activity)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {activity.source || "النظام"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {activity.result || "مكتمل"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(activity.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-600">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {activities && activities.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  عرض 1 إلى {Math.min(10, activities.length)} من {activities.length} نشاط
                </p>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button variant="outline" size="sm" disabled>
                    <i className="fas fa-chevron-right"></i>
                  </Button>
                  <Button size="sm" className="bg-primary text-white">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <span className="px-2 text-gray-400">...</span>
                  <Button variant="outline" size="sm">
                    <i className="fas fa-chevron-left"></i>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
