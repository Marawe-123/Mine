import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Play, RefreshCw, Brain, Target, Users, TrendingUp, 
  MessageSquare, Search, Filter, Eye, CheckCircle, XCircle,
  AlertTriangle, Heart, Frown, Smile, Meh, Clock
} from "lucide-react";
import type { Comment, Job } from "@shared/schema";

// Analysis configuration for Egypt job market
const EGYPT_JOB_SEEKER_INDICATORS = {
  keywords: [
    // Direct job seeking
    'محتاج شغل', 'أبحث عن وظيفة', 'عايز شغل', 'مطلوب عمل', 'Available for work',
    'بدور على شغل', 'Fresh graduate', 'خريج جديد', 'معاي خبرة', 'CV متاح',
    
    // Professional expressions
    'سيرة ذاتية', 'خبرة في', 'مؤهل للعمل', 'متاح للعمل', 'أقدر أشتغل',
    'عندي خبرة', 'باحث عن فرصة', 'مهتم بالوظيفة', 'كيف أقدم؟',
    
    // Egyptian dialect expressions
    'محتاج أي حاجة', 'أي حد محتاج', 'ممكن أشتغل', 'عايزين إيه؟',
    'ازاي أقدم؟', 'فين التقديم؟', 'شروط إيه؟', 'الراتب كام؟'
  ],
  
  urgencyKeywords: [
    'محتاج ضروري', 'مستعجل', 'urgent', 'ASAP', 'فوري',
    'مضطر', 'محتاج بسرعة', 'ظروف صعبة'
  ],
  
  experienceLevels: {
    'خريج جديد': ['Fresh graduate', 'خريج جديد', 'بدايتي', 'أول شغل'],
    'خبرة متوسطة': ['سنة خبرة', 'سنتين خبرة', '3 سنوات', 'خبرة متوسطة'],
    'خبرة عالية': ['خبرة كبيرة', 'سنوات خبرة', 'خبير', 'متخصص']
  },
  
  sentimentKeywords: {
    positive: ['متحمس', 'مهتم', 'متشوق', 'excited', 'شكراً', 'جميل'],
    negative: ['متضايق', 'زهقان', 'محبط', 'صعب', 'مش لاقي', 'مستحيل'],
    neutral: ['ممكن', 'معلومات', 'استفسار', 'تفاصيل', 'شروط']
  }
};

export default function CommentAnalysis() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [confidenceThreshold, setConfidenceThreshold] = useState<string>("70");
  
  const { toast } = useToast();

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ['/api/comments', selectedJob],
    enabled: true,
  });

  const startAnalysisMutation = useMutation({
    mutationFn: async (data: { jobId?: number; config?: any }) => {
      const response = await apiRequest('POST', '/api/actions/start-comment-analysis', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء التحليل",
        description: "سيتم تحليل التعليقات في الخلفية",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/active'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في بدء تحليل التعليقات",
        variant: "destructive",
      });
    },
  });

  const handleStartAnalysis = () => {
    const config = {
      confidenceThreshold: parseInt(confidenceThreshold),
      keywords: EGYPT_JOB_SEEKER_INDICATORS.keywords,
      sentimentAnalysis: true,
      experienceDetection: true
    };

    startAnalysisMutation.mutate({
      jobId: selectedJob ? parseInt(selectedJob) : undefined,
      config
    });
  };

  const getFilteredComments = () => {
    if (!comments) return [];
    
    let filtered = comments;
    
    if (analysisFilter !== "all") {
      if (analysisFilter === "job_seekers") {
        filtered = filtered.filter(c => c.isJobSeeker === true);
      } else if (analysisFilter === "non_job_seekers") {
        filtered = filtered.filter(c => c.isJobSeeker === false);
      } else if (analysisFilter === "unanalyzed") {
        filtered = filtered.filter(c => c.isJobSeeker === null);
      }
    }
    
    if (sentimentFilter !== "all") {
      filtered = filtered.filter(c => c.sentiment === sentimentFilter);
    }
    
    return filtered;
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return <Smile className="h-4 w-4 text-green-500" />;
      case 'negative': return <Frown className="h-4 w-4 text-red-500" />;
      case 'neutral': return <Meh className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': 
        return <Badge className="bg-green-100 text-green-800">إيجابي</Badge>;
      case 'negative': 
        return <Badge className="bg-red-100 text-red-800">سلبي</Badge>;
      case 'neutral': 
        return <Badge className="bg-gray-100 text-gray-800">محايد</Badge>;
      default: 
        return <Badge variant="outline">غير محلل</Badge>;
    }
  };

  const getAnalysisStats = () => {
    if (!comments) return { total: 0, jobSeekers: 0, analyzed: 0, avgConfidence: 0 };
    
    const total = comments.length;
    const jobSeekers = comments.filter(c => c.isJobSeeker === true).length;
    const analyzed = comments.filter(c => c.isJobSeeker !== null).length;
    const avgConfidence = analyzed > 0 ? 
      comments.filter(c => c.isJobSeeker !== null).reduce((sum, c) => sum, 0) / analyzed : 0;
    
    return { total, jobSeekers, analyzed, avgConfidence };
  };

  const stats = getAnalysisStats();
  const filteredComments = getFilteredComments();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'قبل أقل من ساعة';
    if (diffInHours < 24) return `قبل ${diffInHours} ساعة`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `قبل ${diffInDays} يوم`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تحليل التعليقات الذكي</h1>
          <p className="text-muted-foreground mt-2">
            تحديد الباحثين عن عمل وتحليل نواياهم
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/comments'] })}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Badge variant="secondary" className="flex items-center space-x-1 space-x-reverse">
            <Brain className="h-3 w-3" />
            <span>تحليل ذكي</span>
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي التعليقات</p>
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
                <p className="text-sm font-medium text-gray-600">باحثين عن عمل</p>
                <p className="text-2xl font-bold text-green-600">{stats.jobSeekers}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">تم تحليلها</p>
                <p className="text-2xl font-bold text-purple-600">{stats.analyzed}</p>
                <div className="mt-2">
                  <Progress value={(stats.analyzed / Math.max(stats.total, 1)) * 100} className="h-2" />
                </div>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل التحويل</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.total > 0 ? ((stats.jobSeekers / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis" className="flex items-center space-x-2 space-x-reverse">
            <Brain className="h-4 w-4" />
            <span>بدء التحليل</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2 space-x-reverse">
            <Users className="h-4 w-4" />
            <span>النتائج ({filteredComments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="h-4 w-4" />
            <span>الإحصائيات</span>
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التحليل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>اختر وظيفة محددة (اختياري)</Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="تحليل جميع التعليقات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الوظائف</SelectItem>
                      {jobs?.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title} - {job.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حد الثقة في التحليل (%)</Label>
                  <Select value={confidenceThreshold} onValueChange={setConfidenceThreshold}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60% - تحليل واسع</SelectItem>
                      <SelectItem value="70">70% - متوازن (مُنصح)</SelectItem>
                      <SelectItem value="80">80% - دقيق</SelectItem>
                      <SelectItem value="90">90% - دقيق جداً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Analysis Features */}
              <div className="space-y-4">
                <h4 className="font-medium">ميزات التحليل المُفعلة</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">تحديد الباحثين عن عمل</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">تحليل المشاعر</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">تحديد مستوى الخبرة</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">الكلمات المفتاحية المصرية</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartAnalysis}
                disabled={startAnalysisMutation.isPending}
                className="w-full"
                size="lg"
              >
                {startAnalysisMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  <Play className="h-5 w-5 ml-2" />
                )}
                بدء تحليل التعليقات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>تصفية النتائج</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع التحليل</Label>
                  <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع التعليقات</SelectItem>
                      <SelectItem value="job_seekers">باحثين عن عمل فقط</SelectItem>
                      <SelectItem value="non_job_seekers">غير باحثين عن عمل</SelectItem>
                      <SelectItem value="unanalyzed">غير محللة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>المشاعر</Label>
                  <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المشاعر</SelectItem>
                      <SelectItem value="positive">إيجابي</SelectItem>
                      <SelectItem value="neutral">محايد</SelectItem>
                      <SelectItem value="negative">سلبي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الوظيفة</Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الوظائف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الوظائف</SelectItem>
                      {jobs?.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Table */}
          <Card>
            <CardHeader>
              <CardTitle>التعليقات المحللة</CardTitle>
            </CardHeader>
            <CardContent>
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredComments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المؤلف</TableHead>
                      <TableHead className="text-right">التعليق</TableHead>
                      <TableHead className="text-right">باحث عن عمل؟</TableHead>
                      <TableHead className="text-right">المشاعر</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComments.map((comment) => (
                      <TableRow key={comment.id}>
                        <TableCell className="font-medium">
                          {comment.authorName || 'مجهول'}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={comment.content}>
                            {comment.content}
                          </div>
                        </TableCell>
                        <TableCell>
                          {comment.isJobSeeker === true ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 ml-1" />
                              نعم
                            </Badge>
                          ) : comment.isJobSeeker === false ? (
                            <Badge className="bg-gray-100 text-gray-800">
                              <XCircle className="h-3 w-3 ml-1" />
                              لا
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 ml-1" />
                              غير محلل
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            {getSentimentIcon(comment.sentiment)}
                            {getSentimentBadge(comment.sentiment)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatTimeAgo(comment.createdAt!)}
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
                  <p className="text-gray-500">لا توجد تعليقات متاحة</p>
                  <p className="text-sm text-gray-400 mt-2">
                    تأكد من وجود وظائف مجمعة أولاً أو قم بتشغيل التحليل
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sentiment Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع المشاعر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['positive', 'neutral', 'negative'].map((sentiment) => {
                    const count = comments?.filter(c => c.sentiment === sentiment).length || 0;
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    
                    return (
                      <div key={sentiment} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {getSentimentIcon(sentiment)}
                            <span className="text-sm font-medium">
                              {sentiment === 'positive' ? 'إيجابي' : 
                               sentiment === 'neutral' ? 'محايد' : 'سلبي'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Job Seeker Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل الباحثين عن عمل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats.total > 0 ? ((stats.jobSeekers / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-sm text-gray-600">معدل تحويل التعليقات لباحثين عن عمل</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-semibold text-blue-600">{stats.jobSeekers}</div>
                      <p className="text-xs text-gray-600">باحث عن عمل</p>
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-gray-600">
                        {stats.total - stats.jobSeekers}
                      </div>
                      <p className="text-xs text-gray-600">غير باحث</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}