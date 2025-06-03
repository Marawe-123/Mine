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
  Loader2, Play, RefreshCw, MessageSquare, Plus, Edit, Trash2, 
  Send, Clock, CheckCircle, XCircle, Settings, Target, Users,
  Pause, AlertTriangle, Copy, Eye, BarChart3
} from "lucide-react";
import type { Reply, ReplyTemplate, Comment } from "@shared/schema";

// Egyptian job market reply templates
const EGYPT_REPLY_TEMPLATES = [
  {
    category: 'job_invitation',
    name: 'دعوة للتوظيف - عامة',
    content: `السلام عليكم {author_name},

شكراً لاهتمامك بفرصة العمل. نحن نبحث عن مرشحين مؤهلين للانضمام لفريقنا.

📋 المطلوب:
- السيرة الذاتية محدثة
- خبرة في {job_category}
- استعداد للعمل في {job_location}

📞 للتواصل: {contact_info}
📧 أرسل CV على: {email}

نتطلع للتعامل معك
فريق الموارد البشرية`,
    variables: ['author_name', 'job_category', 'job_location', 'contact_info', 'email']
  },
  {
    category: 'job_invitation',
    name: 'دعوة للتوظيف - تكنولوجيا المعلومات',
    content: `أهلاً وسهلاً {author_name} 👋

لاحظنا اهتمامك بوظائف التكنولوجيا. لدينا فرصة ممتازة قد تناسبك:

💻 المنصب: {job_title}
📍 المكان: {job_location}
💰 الراتب: قابل للتفاوض حسب الخبرة

المطلوب:
✅ خبرة في البرمجة
✅ إتقان {required_skills}
✅ التزام وجدية في العمل

للتقديم أرسل CV + Portfolio على:
📧 {email}
📱 WhatsApp: {phone}

بالتوفيق! 🚀`,
    variables: ['author_name', 'job_title', 'job_location', 'required_skills', 'email', 'phone']
  },
  {
    category: 'follow_up',
    name: 'متابعة - استفسار عن التقديم',
    content: `مرحباً {author_name},

شكراً لتفاعلك مع إعلان الوظيفة.

هل تحتاج معلومات إضافية عن:
• متطلبات الوظيفة
• عملية التقديم
• مواعيد المقابلات

نحن هنا للمساعدة 😊
تواصل معنا على: {contact_info}`,
    variables: ['author_name', 'contact_info']
  },
  {
    category: 'general_response',
    name: 'رد عام - شكر للاهتمام',
    content: `شكراً {author_name} لاهتمامك 🙏

نقدر تفاعلك مع منشوراتنا.
فريقنا سيراجع ملفك ويتواصل معك قريباً.

للاستفسارات:
📞 {phone}
📧 {email}

تابعنا للمزيد من الفرص`,
    variables: ['author_name', 'phone', 'email']
  },
  {
    category: 'urgent_response',
    name: 'رد سريع - فرصة عاجلة',
    content: `{author_name} فرصة عاجلة! ⚡

لدينا وظيفة شاغرة تحتاج شغل فوري:
📋 {job_title}
📍 {location}
💰 راتب مغري

شروط:
- إمكانية البدء فوراً
- {requirements}

للتقديم العاجل:
📱 اتصل الآن: {urgent_phone}

أول 5 متقدمين فقط!`,
    variables: ['author_name', 'job_title', 'location', 'requirements', 'urgent_phone']
  }
];

export default function AutoReplies() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyFilter, setReplyFilter] = useState<string>("all");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [delayMin, setDelayMin] = useState("60");
  const [delayMax, setDelayMax] = useState("300");
  
  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'general_response',
    content: '',
    isActive: true
  });

  const { toast } = useToast();

  const { data: replyTemplates, isLoading: templatesLoading } = useQuery<ReplyTemplate[]>({
    queryKey: ['/api/reply-templates'],
  });

  const { data: replies, isLoading: repliesLoading } = useQuery<Reply[]>({
    queryKey: ['/api/replies'],
    refetchInterval: 5000,
  });

  const { data: pendingReplies } = useQuery<Reply[]>({
    queryKey: ['/api/replies/pending'],
    refetchInterval: 3000,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const response = await apiRequest('POST', '/api/reply-templates', template);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء القالب",
        description: "تم حفظ قالب الرد بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reply-templates'] });
      setIsTemplateDialogOpen(false);
      setNewTemplate({ name: '', category: 'general_response', content: '', isActive: true });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء القالب",
        variant: "destructive",
      });
    },
  });

  const startAutoReplyMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest('POST', '/api/actions/start-auto-reply', config);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تفعيل الردود التلقائية",
        description: "النظام سيرد تلقائياً على التعليقات المناسبة",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/replies'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تفعيل الردود التلقائية",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  const handleStartAutoReply = () => {
    const config = {
      enabled: autoReplyEnabled,
      delayMin: parseInt(delayMin) * 1000, // Convert to milliseconds
      delayMax: parseInt(delayMax) * 1000,
      defaultTemplate: selectedTemplate?.id
    };

    startAutoReplyMutation.mutate(config);
  };

  const addPredefinedTemplate = (template: any) => {
    setNewTemplate({
      name: template.name,
      category: template.category,
      content: template.content,
      isActive: true
    });
    setIsTemplateDialogOpen(true);
  };

  const getFilteredReplies = () => {
    if (!replies) return [];
    
    if (replyFilter === "all") return replies;
    return replies.filter(reply => reply.status === replyFilter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 ml-1" />مُرسل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 ml-1" />فشل</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
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

  const getReplyStats = () => {
    if (!replies) return { total: 0, sent: 0, pending: 0, failed: 0 };
    
    return {
      total: replies.length,
      sent: replies.filter(r => r.status === 'sent').length,
      pending: replies.filter(r => r.status === 'pending').length,
      failed: replies.filter(r => r.status === 'failed').length,
    };
  };

  const stats = getReplyStats();
  const filteredReplies = getFilteredReplies();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الردود التلقائية الذكية</h1>
          <p className="text-muted-foreground mt-2">
            إدارة وأتمتة الردود على الباحثين عن عمل
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/replies'] });
              queryClient.invalidateQueries({ queryKey: ['/api/reply-templates'] });
            }}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Badge variant="secondary" className="flex items-center space-x-1 space-x-reverse">
            <MessageSquare className="h-3 w-3" />
            <span>{pendingReplies?.length || 0} في الانتظار</span>
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الردود</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">تم إرسالها</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">في الانتظار</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center space-x-2 space-x-reverse">
            <Target className="h-4 w-4" />
            <span>القوالب ({replyTemplates?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center space-x-2 space-x-reverse">
            <Settings className="h-4 w-4" />
            <span>الأتمتة</span>
          </TabsTrigger>
          <TabsTrigger value="replies" className="flex items-center space-x-2 space-x-reverse">
            <Users className="h-4 w-4" />
            <span>الردود ({filteredReplies.length})</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-4 w-4" />
            <span>التحليلات</span>
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">قوالب الردود</h3>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء قالب جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء قالب رد جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم القالب</Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                        placeholder="مثال: دعوة للتوظيف - عامة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>فئة القالب</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job_invitation">دعوة للتوظيف</SelectItem>
                          <SelectItem value="follow_up">متابعة</SelectItem>
                          <SelectItem value="general_response">رد عام</SelectItem>
                          <SelectItem value="urgent_response">رد عاجل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>محتوى الرد</Label>
                    <Textarea
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                      placeholder="اكتب محتوى الرد هنا..."
                      rows={8}
                    />
                    <p className="text-xs text-gray-500">
                      يمكنك استخدام متغيرات مثل: {"{author_name}"}, {"{job_title}"}, {"{contact_info}"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      checked={newTemplate.isActive}
                      onCheckedChange={(checked) => setNewTemplate({...newTemplate, isActive: checked})}
                    />
                    <Label>تفعيل القالب</Label>
                  </div>

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleCreateTemplate}
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <Plus className="h-4 w-4 ml-2" />
                      )}
                      إنشاء القالب
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Predefined Templates */}
          <Card>
            <CardHeader>
              <CardTitle>قوالب جاهزة للسوق المصري</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EGYPT_REPLY_TEMPLATES.map((template, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {template.content.substring(0, 100)}...
                    </p>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPredefinedTemplate(template)}
                      >
                        <Plus className="h-3 w-3 ml-1" />
                        إضافة
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3 w-3 ml-1" />
                        معاينة
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Existing Templates */}
          <Card>
            <CardHeader>
              <CardTitle>القوالب المحفوظة</CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : replyTemplates && replyTemplates.length > 0 ? (
                <div className="space-y-4">
                  {replyTemplates.map((template) => (
                    <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="outline">{template.category}</Badge>
                          {template.isActive ? (
                            <Badge className="bg-green-100 text-green-800">نشط</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">غير نشط</Badge>
                          )}
                        </div>
                        <div className="flex space-x-1 space-x-reverse">
                          <Button size="sm" variant="ghost">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.content.substring(0, 150)}...
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        استخدم {template.usageCount || 0} مرة
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد قوالب محفوظة</p>
                  <p className="text-sm text-gray-400 mt-2">
                    أنشئ قالبك الأول أو استخدم القوالب الجاهزة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الردود التلقائية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={autoReplyEnabled}
                  onCheckedChange={setAutoReplyEnabled}
                />
                <Label className="text-base font-medium">تفعيل الردود التلقائية</Label>
              </div>

              {autoReplyEnabled && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>أقل وقت انتظار (ثواني)</Label>
                      <Input
                        type="number"
                        value={delayMin}
                        onChange={(e) => setDelayMin(e.target.value)}
                        placeholder="60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>أقصى وقت انتظار (ثواني)</Label>
                      <Input
                        type="number"
                        value={delayMax}
                        onChange={(e) => setDelayMax(e.target.value)}
                        placeholder="300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>القالب الافتراضي</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القالب الافتراضي" />
                      </SelectTrigger>
                      <SelectContent>
                        {replyTemplates?.filter(t => t.isActive).map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleStartAutoReply}
                    disabled={startAutoReplyMutation.isPending}
                    className="w-full"
                  >
                    {startAutoReplyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Play className="h-4 w-4 ml-2" />
                    )}
                    تشغيل الردود التلقائية
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replies Tab */}
        <TabsContent value="replies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>سجل الردود</CardTitle>
                <Select value={replyFilter} onValueChange={setReplyFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الردود</SelectItem>
                    <SelectItem value="sent">مُرسلة</SelectItem>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="failed">فاشلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {repliesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredReplies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المحتوى</TableHead>
                      <TableHead className="text-right">القالب المستخدم</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">وقت الإرسال</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReplies.map((reply) => (
                      <TableRow key={reply.id}>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={reply.content}>
                            {reply.content.substring(0, 60)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          {reply.templateUsed || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reply.status)}
                        </TableCell>
                        <TableCell>
                          {reply.sentAt ? formatTimeAgo(reply.sentAt) : 'لم يُرسل'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد ردود متاحة</p>
                  <p className="text-sm text-gray-400 mt-2">
                    ابدأ بتفعيل الردود التلقائية أو أرسل ردود يدوية
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>أداء الردود</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-sm text-gray-600">معدل نجاح الإرسال</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">{stats.sent}</div>
                      <p className="text-xs text-gray-600">مُرسل</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-yellow-600">{stats.pending}</div>
                      <p className="text-xs text-gray-600">منتظر</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">{stats.failed}</div>
                      <p className="text-xs text-gray-600">فاشل</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>القوالب الأكثر استخداماً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {replyTemplates?.slice(0, 5).map((template) => (
                    <div key={template.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {template.name}
                      </span>
                      <Badge variant="outline">
                        {template.usageCount || 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}