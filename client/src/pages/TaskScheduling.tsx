import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Play, RefreshCw, Clock, Plus, Edit, Trash2, 
  Pause, Settings, Calendar, Target, Users, CheckCircle,
  XCircle, AlertTriangle, BarChart3, Activity, Zap
} from "lucide-react";
import type { Task } from "@shared/schema";

// Pre-configured task templates for Egypt job market
const EGYPT_TASK_TEMPLATES = [
  {
    name: 'جمع وظائف يومي - القاهرة',
    type: 'job_collection',
    schedule: '0 9,15 * * *', // 9 AM and 3 PM daily
    description: 'جمع الوظائف من مجموعات فيسبوك في القاهرة مرتين يومياً',
    config: {
      sources: ['facebook'],
      keywords: ['وظائف القاهرة', 'عمل القاهرة', 'توظيف'],
      maxJobs: 50,
      region: 'القاهرة'
    }
  },
  {
    name: 'تحليل تعليقات IT',
    type: 'comment_analysis',
    schedule: '0 */2 * * *', // Every 2 hours
    description: 'تحليل التعليقات للباحثين عن وظائف تكنولوجيا المعلومات',
    config: {
      category: 'تطوير البرمجيات',
      confidenceThreshold: 75,
      keywords: ['مطور', 'برمجة', 'تكنولوجيا']
    }
  },
  {
    name: 'ردود تلقائية مسائية',
    type: 'auto_reply',
    schedule: '0 18 * * *', // 6 PM daily
    description: 'إرسال ردود تلقائية على التعليقات المتراكمة في المساء',
    config: {
      templateCategory: 'job_invitation',
      delayMin: 300,
      delayMax: 600
    }
  },
  {
    name: 'جمع وظائف أسبوعي شامل',
    type: 'job_collection',
    schedule: '0 8 * * 1', // Monday 8 AM
    description: 'جمع شامل للوظائف من جميع المصادر في بداية الأسبوع',
    config: {
      sources: ['facebook', 'linkedin'],
      maxJobs: 200,
      regions: ['القاهرة', 'الإسكندرية', 'الجيزة']
    }
  }
];

const SCHEDULE_PRESETS = [
  { label: 'كل ساعة', value: '0 * * * *' },
  { label: 'كل ساعتين', value: '0 */2 * * *' },
  { label: 'كل 4 ساعات', value: '0 */4 * * *' },
  { label: 'كل 6 ساعات', value: '0 */6 * * *' },
  { label: 'يومياً في 9 صباحاً', value: '0 9 * * *' },
  { label: 'يومياً في 6 مساءً', value: '0 18 * * *' },
  { label: 'مرتين يومياً (9ص، 6م)', value: '0 9,18 * * *' },
  { label: 'الاثنين في 8 صباحاً', value: '0 8 * * 1' },
  { label: 'نهاية كل أسبوع', value: '0 9 * * 5' },
];

export default function TaskScheduling() {
  const [activeTab, setActiveTab] = useState("active");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [schedulePreset, setSchedulePreset] = useState<string>("");
  
  // New task form
  const [newTask, setNewTask] = useState({
    name: '',
    type: 'job_collection',
    schedule: '',
    config: '{}',
    isActive: true
  });

  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    refetchInterval: 10000,
  });

  const { data: activeTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks/active'],
    refetchInterval: 5000,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      const response = await apiRequest('POST', '/api/tasks', task);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء المهمة",
        description: "تم جدولة المهمة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsTaskDialogOpen(false);
      setNewTask({ name: '', type: 'job_collection', schedule: '', config: '{}', isActive: true });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء المهمة",
        variant: "destructive",
      });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, { status: isActive ? 'active' : 'paused' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث المهمة",
        description: "تم تغيير حالة المهمة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث المهمة",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (!newTask.name || !newTask.schedule) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    let config;
    try {
      config = JSON.parse(newTask.config);
    } catch {
      toast({
        title: "خطأ",
        description: "تكوين المهمة غير صحيح (JSON غير صالح)",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      ...newTask,
      config,
      status: newTask.isActive ? 'active' : 'paused'
    });
  };

  const addTemplateTask = (template: any) => {
    setNewTask({
      name: template.name,
      type: template.type,
      schedule: template.schedule,
      config: JSON.stringify(template.config, null, 2),
      isActive: true
    });
    setIsTaskDialogOpen(true);
  };

  const handleSchedulePresetChange = (preset: string) => {
    setSchedulePreset(preset);
    setNewTask({ ...newTask, schedule: preset });
  };

  const getFilteredTasks = () => {
    if (!tasks) return [];
    
    if (taskFilter === "all") return tasks;
    return tasks.filter(task => task.status === taskFilter);
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'job_collection':
        return <Badge className="bg-blue-100 text-blue-800">جمع وظائف</Badge>;
      case 'comment_analysis':
        return <Badge className="bg-purple-100 text-purple-800">تحليل تعليقات</Badge>;
      case 'auto_reply':
        return <Badge className="bg-green-100 text-green-800">ردود تلقائية</Badge>;
      default:
        return <Badge variant="outline">مهمة عامة</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><Play className="h-3 w-3 ml-1" />نشط</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800"><Pause className="h-3 w-3 ml-1" />متوقف</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 ml-1" />مكتمل</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 ml-1" />فشل</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const formatSchedule = (schedule: string) => {
    const scheduleMap: { [key: string]: string } = {
      '0 * * * *': 'كل ساعة',
      '0 */2 * * *': 'كل ساعتين',
      '0 */4 * * *': 'كل 4 ساعات',
      '0 */6 * * *': 'كل 6 ساعات',
      '0 9 * * *': 'يومياً في 9ص',
      '0 18 * * *': 'يومياً في 6م',
      '0 9,18 * * *': 'مرتين يومياً',
      '0 8 * * 1': 'الاثنين 8ص',
      '0 9 * * 5': 'الجمعة 9ص'
    };
    
    return scheduleMap[schedule] || schedule;
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'لم يتم التشغيل';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `قبل ${diffInMinutes} دقيقة`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `قبل ${diffInHours} ساعة`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `قبل ${diffInDays} يوم`;
  };

  const getTaskStats = () => {
    if (!tasks) return { total: 0, active: 0, paused: 0, completed: 0, failed: 0 };
    
    return {
      total: tasks.length,
      active: tasks.filter(t => t.status === 'active').length,
      paused: tasks.filter(t => t.status === 'paused').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  };

  const stats = getTaskStats();
  const filteredTasks = getFilteredTasks();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">جدولة المهام الذكية</h1>
          <p className="text-muted-foreground mt-2">
            أتمتة وجدولة العمليات بشكل احترافي
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Badge variant="secondary" className="flex items-center space-x-1 space-x-reverse">
            <Activity className="h-3 w-3" />
            <span>{stats.active} نشط</span>
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المهام</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">نشطة</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Play className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوقفة</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
              </div>
              <Pause className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مكتملة</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? (((stats.completed + stats.active) / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center space-x-2 space-x-reverse">
            <Activity className="h-4 w-4" />
            <span>المهام النشطة ({activeTasks?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2 space-x-reverse">
            <Target className="h-4 w-4" />
            <span>قوالب جاهزة</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center space-x-2 space-x-reverse">
            <Settings className="h-4 w-4" />
            <span>جميع المهام ({filteredTasks.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Active Tasks Tab */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المهام النشطة حالياً</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : activeTasks && activeTasks.length > 0 ? (
                <div className="space-y-4">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="p-4 border border-gray-200 rounded-lg bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Activity className="h-4 w-4 text-green-600" />
                          <h4 className="font-medium">{task.name}</h4>
                          {getTaskTypeBadge(task.type)}
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Badge className="bg-green-100 text-green-800">
                            {task.progress || 0}% مكتمل
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleTaskMutation.mutate({ id: task.id, isActive: false })}
                          >
                            <Pause className="h-3 w-3 ml-1" />
                            إيقاف
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>الجدولة: {formatSchedule(task.source || '')}</span>
                        <span>آخر تشغيل: {formatTimeAgo(task.startedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد مهام نشطة حالياً</p>
                  <p className="text-sm text-gray-400 mt-2">
                    قم بإنشاء مهمة جديدة أو تفعيل مهمة موجودة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">قوالب مهام جاهزة للسوق المصري</h3>
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء مهمة مخصصة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المهمة</Label>
                      <Input
                        value={newTask.name}
                        onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                        placeholder="مثال: جمع وظائف يومي"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع المهمة</Label>
                      <Select
                        value={newTask.type}
                        onValueChange={(value) => setNewTask({...newTask, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job_collection">جمع وظائف</SelectItem>
                          <SelectItem value="comment_analysis">تحليل تعليقات</SelectItem>
                          <SelectItem value="auto_reply">ردود تلقائية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>جدولة المهمة</Label>
                    <Select value={schedulePreset} onValueChange={handleSchedulePresetChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر جدولة جاهزة أو أدخل مخصصة" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newTask.schedule}
                      onChange={(e) => setNewTask({...newTask, schedule: e.target.value})}
                      placeholder="أو أدخل Cron expression مخصص"
                      dir="ltr"
                      className="text-left font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>تكوين المهمة (JSON)</Label>
                    <Textarea
                      value={newTask.config}
                      onChange={(e) => setNewTask({...newTask, config: e.target.value})}
                      placeholder='{"maxJobs": 50, "keywords": ["وظائف", "عمل"]}'
                      rows={6}
                      dir="ltr"
                      className="text-left font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      checked={newTask.isActive}
                      onCheckedChange={(checked) => setNewTask({...newTask, isActive: checked})}
                    />
                    <Label>تفعيل المهمة فوراً</Label>
                  </div>

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleCreateTask}
                      disabled={createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <Plus className="h-4 w-4 ml-2" />
                      )}
                      إنشاء المهمة
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EGYPT_TASK_TEMPLATES.map((template, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {getTaskTypeBadge(template.type)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>الجدولة: {formatSchedule(template.schedule)}</span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span>تكوين متقدم متاح</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => addTemplateTask(template)}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    استخدام هذا القالب
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>جميع المهام</CardTitle>
                <Select value={taskFilter} onValueChange={setTaskFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المهام</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="paused">متوقفة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="failed">فاشلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المهمة</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">الجدولة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">آخر تشغيل</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>{getTaskTypeBadge(task.type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{formatSchedule(task.source || '')}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{formatTimeAgo(task.startedAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1 space-x-reverse">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleTaskMutation.mutate({ 
                                id: task.id, 
                                isActive: task.status !== 'active' 
                              })}
                            >
                              {task.status === 'active' ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد مهام متاحة</p>
                  <p className="text-sm text-gray-400 mt-2">
                    ابدأ بإنشاء مهمتك الأولى باستخدام القوالب الجاهزة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}