import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw, Settings2, Bell, Shield, Database } from "lucide-react";
import type { Setting } from "@shared/schema";

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: allSettings, isLoading } = useQuery<Setting[]>({
    queryKey: ['/api/settings'],
    onSuccess: (data) => {
      const settingsMap: Record<string, string> = {};
      data.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
      setSettings(settingsMap);
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (data: { key: string; value: string; category: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/settings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تحديث الإعدادات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSetting = (key: string, category: string, description?: string) => {
    updateSettingMutation.mutate({
      key,
      value: settings[key] || '',
      category,
      description
    });
  };

  const handleSaveAllSettings = () => {
    const settingsToSave = [
      { key: 'facebook_check_interval', category: 'scraping', description: 'Facebook check interval in milliseconds' },
      { key: 'linkedin_check_interval', category: 'scraping', description: 'LinkedIn check interval in milliseconds' },
      { key: 'max_comments_per_job', category: 'analysis', description: 'Maximum comments to analyze per job post' },
      { key: 'auto_reply_enabled', category: 'replies', description: 'Enable automatic replies' },
      { key: 'reply_delay_min', category: 'replies', description: 'Minimum delay between replies in milliseconds' },
      { key: 'reply_delay_max', category: 'replies', description: 'Maximum delay between replies in milliseconds' },
    ];

    settingsToSave.forEach(setting => {
      updateSettingMutation.mutate({
        ...setting,
        value: settings[setting.key] || ''
      });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة إعدادات النظام والتكوين
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/settings'] })}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button 
            onClick={handleSaveAllSettings}
            disabled={updateSettingMutation.isPending}
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ جميع الإعدادات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scraping" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scraping" className="flex items-center space-x-2 space-x-reverse">
            <Settings2 className="h-4 w-4" />
            <span>الجمع والاستخراج</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2 space-x-reverse">
            <i className="fas fa-brain"></i>
            <span>التحليل</span>
          </TabsTrigger>
          <TabsTrigger value="replies" className="flex items-center space-x-2 space-x-reverse">
            <Bell className="h-4 w-4" />
            <span>الردود</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2 space-x-reverse">
            <Shield className="h-4 w-4" />
            <span>النظام</span>
          </TabsTrigger>
        </TabsList>

        {/* Scraping Settings */}
        <TabsContent value="scraping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات جمع الوظائف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="facebook_interval">فترة فحص فيسبوك (بالميللي ثانية)</Label>
                  <Input
                    id="facebook_interval"
                    type="number"
                    value={settings.facebook_check_interval || '300000'}
                    onChange={(e) => handleSettingChange('facebook_check_interval', e.target.value)}
                    placeholder="300000"
                  />
                  <p className="text-sm text-muted-foreground">
                    الفترة الزمنية بين عمليات فحص فيسبوك (300000 = 5 دقائق)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_interval">فترة فحص لينكد إن (بالميللي ثانية)</Label>
                  <Input
                    id="linkedin_interval"
                    type="number"
                    value={settings.linkedin_check_interval || '600000'}
                    onChange={(e) => handleSettingChange('linkedin_check_interval', e.target.value)}
                    placeholder="600000"
                  />
                  <p className="text-sm text-muted-foreground">
                    الفترة الزمنية بين عمليات فحص لينكد إن (600000 = 10 دقائق)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch 
                  id="scraping_enabled"
                  checked={settings.scraping_enabled === 'true'}
                  onCheckedChange={(checked) => handleSettingChange('scraping_enabled', checked.toString())}
                />
                <Label htmlFor="scraping_enabled" className="text-sm font-medium">
                  تمكين جمع الوظائف التلقائي
                </Label>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSaveSetting('facebook_check_interval', 'scraping')}
                  disabled={updateSettingMutation.isPending}
                  className="ml-2"
                >
                  حفظ إعدادات الجمع
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Settings */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات تحليل التعليقات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_comments">الحد الأقصى للتعليقات لكل وظيفة</Label>
                  <Input
                    id="max_comments"
                    type="number"
                    value={settings.max_comments_per_job || '100'}
                    onChange={(e) => handleSettingChange('max_comments_per_job', e.target.value)}
                    placeholder="100"
                  />
                  <p className="text-sm text-muted-foreground">
                    عدد التعليقات القصوى التي سيتم تحليلها لكل وظيفة
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analysis_confidence">الحد الأدنى لدقة التحليل (%)</Label>
                  <Input
                    id="analysis_confidence"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.analysis_confidence_threshold || '70'}
                    onChange={(e) => handleSettingChange('analysis_confidence_threshold', e.target.value)}
                    placeholder="70"
                  />
                  <p className="text-sm text-muted-foreground">
                    نسبة الثقة المطلوبة لاعتبار التحليل صحيحاً
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="analysis_enabled"
                    checked={settings.auto_analysis_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('auto_analysis_enabled', checked.toString())}
                  />
                  <Label htmlFor="analysis_enabled" className="text-sm font-medium">
                    تمكين التحليل التلقائي للتعليقات
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="sentiment_analysis"
                    checked={settings.sentiment_analysis_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('sentiment_analysis_enabled', checked.toString())}
                  />
                  <Label htmlFor="sentiment_analysis" className="text-sm font-medium">
                    تمكين تحليل المشاعر
                  </Label>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSaveSetting('max_comments_per_job', 'analysis')}
                  disabled={updateSettingMutation.isPending}
                  className="ml-2"
                >
                  حفظ إعدادات التحليل
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replies Settings */}
        <TabsContent value="replies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الردود التلقائية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 space-x-reverse mb-6">
                <Switch 
                  id="auto_reply"
                  checked={settings.auto_reply_enabled === 'true'}
                  onCheckedChange={(checked) => handleSettingChange('auto_reply_enabled', checked.toString())}
                />
                <Label htmlFor="auto_reply" className="text-sm font-medium">
                  تمكين الردود التلقائية
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reply_delay_min">الحد الأدنى للتأخير (بالميللي ثانية)</Label>
                  <Input
                    id="reply_delay_min"
                    type="number"
                    value={settings.reply_delay_min || '60000'}
                    onChange={(e) => handleSettingChange('reply_delay_min', e.target.value)}
                    placeholder="60000"
                    disabled={settings.auto_reply_enabled !== 'true'}
                  />
                  <p className="text-sm text-muted-foreground">
                    أقل وقت انتظار بين الردود (60000 = دقيقة واحدة)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply_delay_max">الحد الأقصى للتأخير (بالميللي ثانية)</Label>
                  <Input
                    id="reply_delay_max"
                    type="number"
                    value={settings.reply_delay_max || '300000'}
                    onChange={(e) => handleSettingChange('reply_delay_max', e.target.value)}
                    placeholder="300000"
                    disabled={settings.auto_reply_enabled !== 'true'}
                  />
                  <p className="text-sm text-muted-foreground">
                    أقصى وقت انتظار بين الردود (300000 = 5 دقائق)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_template">القالب الافتراضي للردود</Label>
                <Select 
                  value={settings.default_reply_template || ''}
                  onValueChange={(value) => handleSettingChange('default_reply_template', value)}
                  disabled={settings.auto_reply_enabled !== 'true'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القالب الافتراضي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job_invitation">دعوة للتوظيف</SelectItem>
                    <SelectItem value="general_response">رد عام</SelectItem>
                    <SelectItem value="follow_up">متابعة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSaveSetting('auto_reply_enabled', 'replies')}
                  disabled={updateSettingMutation.isPending}
                  className="ml-2"
                >
                  حفظ إعدادات الردود
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام العامة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="log_level">مستوى السجلات</Label>
                  <Select 
                    value={settings.log_level || 'INFO'}
                    onValueChange={(value) => handleSettingChange('log_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">تصحيح مفصل</SelectItem>
                      <SelectItem value="INFO">معلومات عامة</SelectItem>
                      <SelectItem value="WARN">تحذيرات فقط</SelectItem>
                      <SelectItem value="ERROR">أخطاء فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_tasks">الحد الأقصى للمهام المتزامنة</Label>
                  <Input
                    id="max_concurrent_tasks"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_concurrent_tasks || '3'}
                    onChange={(e) => handleSettingChange('max_concurrent_tasks', e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="error_notifications"
                    checked={settings.error_notifications_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('error_notifications_enabled', checked.toString())}
                  />
                  <Label htmlFor="error_notifications" className="text-sm font-medium">
                    تمكين إشعارات الأخطاء
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="performance_monitoring"
                    checked={settings.performance_monitoring_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('performance_monitoring_enabled', checked.toString())}
                  />
                  <Label htmlFor="performance_monitoring" className="text-sm font-medium">
                    تمكين مراقبة الأداء
                  </Label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <Database className="h-8 w-8 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900">حالة قاعدة البيانات</h4>
                    <p className="text-sm text-gray-600">متصلة وتعمل بشكل طبيعي</p>
                  </div>
                  <div className="flex-1"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSaveSetting('log_level', 'system')}
                  disabled={updateSettingMutation.isPending}
                  className="ml-2"
                >
                  حفظ إعدادات النظام
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
