import { useState, useMemo } from "react";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, Globe, Users, Target, Settings, MapPin, Calendar, Plus, Trash2 } from "lucide-react";
import type { Job } from "@shared/schema";

// --- Configuration for Supported Countries ---
interface CountryConfig {
  name: string; // Display name (e.g., 'مصر', 'Canada')
  code: string; // ISO code (e.g., 'EG', 'CA')
  regionsLabel: string; // Label for regions dropdown (e.g., 'المحافظة', 'Province/Territory')
  regions: string[];
  categoriesLabel: string; // Label for categories dropdown (e.g., 'مجال العمل', 'Job Category')
  jobCategories: string[];
  popularSourcesLabel: string; // Label for popular sources section (e.g., 'المصادر الشائعة في مصر', 'Popular Sources in Canada')
  popularSources: { name: string; url: string; members?: string; type: string; lang?: 'en' | 'fr' | 'ar' | 'bilingual' }[];
  keywords: {
    default: string[]; // Common keywords for the country
    english?: string[];
    french?: string[];
    arabic?: string[];
  };
  language: 'ar' | 'en' | 'fr' | 'bilingual'; // Primary language for UI hints/defaults
  keywordsLabel: string; // Label for additional keywords input
  keywordsPlaceholder: string; // Placeholder for additional keywords input
}

const COUNTRIES_CONFIG: { [key: string]: CountryConfig } = {
  'EG': {
    name: 'مصر',
    code: 'EG',
    regionsLabel: 'المحافظة',
    regions: [
      'القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'المنوفية', 'الدقهلية',
      'البحيرة', 'كفر الشيخ', 'الغربية', 'المنيا', 'بني سويف', 'الفيوم',
      'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر',
      'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء', 'بورسعيد',
      'السويس', 'دمياط'
    ],
    categoriesLabel: 'مجال العمل',
    jobCategories: [
      'تطوير البرمجيات', 'التسويق الرقمي', 'المحاسبة والمالية', 'الموارد البشرية',
      'المبيعات', 'خدمة العملاء', 'التصميم الجرافيكي', 'الهندسة', 'الطب والصحة',
      'التعليم', 'القانون', 'الإعلام والصحافة', 'السياحة والضيافة', 'النقل واللوجستيات'
    ],
    popularSourcesLabel: 'المصادر الشائعة في مصر',
    popularSources: [
      { name: 'مجموعة وظائف مصر', url: 'https://www.facebook.com/groups/jobsegypt', members: '2.1M', type: 'facebook_group', lang: 'ar' },
      { name: 'وظائف القاهرة الكبرى', url: 'https://www.facebook.com/groups/cairojobs', members: '890K', type: 'facebook_group', lang: 'ar' },
      { name: 'وظائف تكنولوجيا المعلومات', url: 'https://www.facebook.com/groups/ITjobsegypt', members: '450K', type: 'facebook_group', lang: 'ar' },
      { name: 'وظائف الإسكندرية', url: 'https://www.facebook.com/groups/alexjobs', members: '320K', type: 'facebook_group', lang: 'ar' }
    ],
    keywords: {
      default: ['وظيفة', 'مطلوب', 'فرصة عمل', 'توظيف', 'نبحث عن', 'انضم إلينا', 'مرشح', 'خبرة', 'راتب', 'دوام', 'عمل', 'شاغر', 'فريق العمل'],
      arabic: ['وظيفة', 'مطلوب', 'فرصة عمل', 'توظيف', 'نبحث عن', 'انضم إلينا', 'مرشح', 'خبرة', 'راتب', 'دوام', 'عمل', 'شاغر', 'فريق العمل']
    },
    language: 'ar',
    keywordsLabel: 'كلمات مفتاحية إضافية',
    keywordsPlaceholder: 'مثال: مطور، محاسب، مصمم (افصل بفاصلة)'
  },
  'CA': {
    name: 'Canada',
    code: 'CA',
    regionsLabel: 'Province/Territory/City',
    regions: [
      // Provinces/Territories
      'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba',
      'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador',
      'Prince Edward Island', 'Northwest Territories', 'Yukon', 'Nunavut',
      // Major Cities 
      'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton',
      'Mississauga', 'Winnipeg', 'Hamilton', 'Quebec City', 'Brampton', 'Surrey'
    ],
    categoriesLabel: 'Job Category',
    jobCategories: [ // Needs refinement based on Canadian market
      'Software Development', 'IT & Networking', 'Digital Marketing', 'Accounting & Finance', 'Human Resources',
      'Sales & Business Development', 'Customer Service', 'Graphic Design', 'Engineering (Civil, Mechanical, Electrical)',
      'Healthcare & Nursing', 'Education & Teaching', 'Legal Services', 'Media & Communications',
      'Hospitality & Tourism', 'Transportation & Logistics', 'Skilled Trades', 'Administration'
    ],
    popularSourcesLabel: 'Popular Sources in Canada',
    popularSources: [ // Placeholder - Needs specific Canadian groups/pages
      { name: 'LinkedIn Jobs Canada', url: 'https://www.linkedin.com/jobs/search/?country=ca', type: 'linkedin', lang: 'en' },
      { name: 'Indeed Canada', url: 'https://ca.indeed.com/', type: 'indeed', lang: 'en' },
      { name: 'Job Bank (Gov. Canada)', url: 'https://www.jobbank.gc.ca/jobsearch', type: 'website', lang: 'bilingual' },
      // Need to find popular Facebook groups like "Jobs in Toronto", "Canada IT Jobs", "Emplois Quebec"
    ],
    keywords: {
      default: ['job', 'hiring', 'career', 'employment', 'recruiting', 'position', 'opportunity'],
      english: ['job', 'hiring', 'career', 'employment', 'recruiting', 'position', 'opportunity', 'vacancy', 'join us', 'apply now', 'remote', 'full-time', 'part-time', 'contract'],
      french: ['emploi', 'recrutement', 'carrière', 'poste', 'opportunité', 'travail', 'recherche', 'joignez-vous', 'postulez', 'télétravail', 'temps plein', 'temps partiel', 'contrat']
    },
    language: 'bilingual',
    keywordsLabel: 'Additional Keywords',
    keywordsPlaceholder: 'e.g., developer, accountant, designer (comma-separated)'
  }
};
// --- End Configuration ---

export default function JobCollection() {
  const [selectedCountry, setSelectedCountry] = useState<string>('EG'); // Default to Egypt
  const [activeTab, setActiveTab] = useState("quick-start");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all"); // Default to 'all'
  const [selectedCategory, setSelectedCategory] = useState<string>("all"); // Default to 'all'
  const [customKeywords, setCustomKeywords] = useState<string>("");
  const [maxJobs, setMaxJobs] = useState<string>("50");
  // const [autoMode, setAutoMode] = useState<boolean>(false); // Auto mode seems disabled
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState<string>("");

  const { toast } = useToast();

  // Memoize current config to avoid recalculation on every render
  const currentConfig = useMemo(() => COUNTRIES_CONFIG[selectedCountry], [selectedCountry]);

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { country: selectedCountry }], // Add country to query key if backend filters
    refetchInterval: 10000,
    // Consider filtering jobs based on selectedCountry on the client-side if backend doesn't support it
    // select: (allJobs) => allJobs.filter(job => job.countryCode === selectedCountry) 
  });

  const startCollectionMutation = useMutation({
    mutationFn: async (data: { 
      source: string; 
      sourceUrl?: string; 
      config?: any; 
      countryCode: string; // Pass country code to backend
    }) => {
      const response = await apiRequest('POST', '/api/actions/start-job-collection', data);
      // Ensure backend handles the countryCode and config appropriately
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: currentConfig.language === 'ar' ? "تم بدء جمع الوظائف" : "Job collection started",
        description: currentConfig.language === 'ar' ? "سيتم جمع الوظائف الجديدة في الخلفية" : "New jobs will be collected in the background",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/active'] });
    },
    onError: () => {
      toast({
        title: currentConfig.language === 'ar' ? "خطأ" : "Error",
        description: currentConfig.language === 'ar' ? "فشل في بدء عملية جمع الوظائف" : "Failed to start job collection process",
        variant: "destructive",
      });
    },
  });

  // Reset filters when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedRegion("all"); // Reset to 'all'
    setSelectedCategory("all"); // Reset to 'all'
    setCustomKeywords("");
    // Optionally reset custom source fields as well
    // setSelectedSource("");
    // setSourceUrl("");
  };

  const getSelectedKeywords = () => {
    const keywords = [...currentConfig.keywords.default];
    if (currentConfig.keywords.english && (currentConfig.language === 'en' || currentConfig.language === 'bilingual')) {
      keywords.push(...currentConfig.keywords.english);
    }
    if (currentConfig.keywords.french && (currentConfig.language === 'fr' || currentConfig.language === 'bilingual')) {
      keywords.push(...currentConfig.keywords.french);
    }
    if (currentConfig.keywords.arabic && currentConfig.language === 'ar') {
        keywords.push(...currentConfig.keywords.arabic);
    }
    
    // Add category/region only if they are not 'all'
    if (selectedCategory && selectedCategory !== 'all') keywords.push(selectedCategory);
    if (selectedRegion && selectedRegion !== 'all') keywords.push(selectedRegion);
    if (customKeywords) keywords.push(...customKeywords.split(',').map(k => k.trim()).filter(k => k)); // Filter empty strings
    return [...new Set(keywords)]; // Return unique keywords
  };

  const handleQuickStart = (source: any) => {
    const config = {
      maxJobs: parseInt(maxJobs),
      keywords: getSelectedKeywords(),
      region: selectedRegion === 'all' ? undefined : selectedRegion, // Pass undefined if 'all'
      category: selectedCategory === 'all' ? undefined : selectedCategory, // Pass undefined if 'all'
      targetLanguage: source.lang || currentConfig.language // Pass target language if available
    };

    startCollectionMutation.mutate({
      source: source.type, // Use source type (facebook_group, linkedin, etc.)
      sourceUrl: source.url,
      config,
      countryCode: selectedCountry // Pass selected country code
    });
  };

  const handleCustomStart = () => {
    if (!selectedSource || !sourceUrl) {
      toast({
        title: currentConfig.language === 'ar' ? "خطأ" : "Error",
        description: currentConfig.language === 'ar' ? "يرجى اختيار المصدر وإدخال الرابط" : "Please select a source type and enter the URL",
        variant: "destructive",
      });
      return;
    }

    const config = {
      maxJobs: parseInt(maxJobs),
      keywords: getSelectedKeywords(),
      region: selectedRegion === 'all' ? undefined : selectedRegion, // Pass undefined if 'all'
      category: selectedCategory === 'all' ? undefined : selectedCategory // Pass undefined if 'all'
    };

    startCollectionMutation.mutate({
      source: selectedSource,
      sourceUrl: sourceUrl,
      config,
      countryCode: selectedCountry // Pass selected country code
    });
  };

  const addCustomSource = () => {
    if (newSource && !customSources.includes(newSource)) {
      setCustomSources([...customSources, newSource]);
      setNewSource("");
    }
  };

  const removeCustomSource = (source: string) => {
    setCustomSources(customSources.filter(s => s !== source));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return currentConfig.language === 'ar' ? 'الآن' : 'Just now';
    if (diffInMinutes < 60) return currentConfig.language === 'ar' ? `قبل ${diffInMinutes} دقيقة` : `${diffInMinutes}m ago`;
    if (diffInHours < 24) return currentConfig.language === 'ar' ? `قبل ${diffInHours} ساعة` : `${diffInHours}h ago`;
    return currentConfig.language === 'ar' ? `قبل ${diffInDays} يوم` : `${diffInDays}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {currentConfig.language === 'ar' ? 'جمع الوظائف الذكي' : 'Smart Job Collector'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {currentConfig.language === 'ar' 
              ? `جمع وظائف ${currentConfig.name} تلقائياً من المصادر المختلفة` 
              : `Automatically collect jobs from ${currentConfig.name} from various sources`}
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Country Selector */}
          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-[180px]">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(COUNTRIES_CONFIG).map(country => (
                <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/jobs', { country: selectedCountry }] })}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            {currentConfig.language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-start" className="flex items-center space-x-2 space-x-reverse">
            <Target className="h-4 w-4" />
            <span>{currentConfig.language === 'ar' ? 'البدء السريع' : 'Quick Start'}</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center space-x-2 space-x-reverse">
            <Settings className="h-4 w-4" />
            <span>{currentConfig.language === 'ar' ? 'إعدادات مخصصة' : 'Custom Settings'}</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2 space-x-reverse">
            <Users className="h-4 w-4" />
            <span>{currentConfig.language === 'ar' ? 'النتائج' : 'Results'} ({jobs?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* Quick Start Tab */}
        <TabsContent value="quick-start" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentConfig.popularSourcesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentConfig.popularSources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentConfig.popularSources.map((source, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{source.name}</h3>
                        {source.members && <Badge variant="outline">{source.members}</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 text-left" dir="ltr">{source.url}</p>
                      <Button
                        size="sm"
                        onClick={() => handleQuickStart(source)}
                        disabled={startCollectionMutation.isPending}
                        className="w-full"
                      >
                        {startCollectionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <Play className="h-4 w-4 ml-2" />
                        )}
                        {currentConfig.language === 'ar' ? 'بدء الجمع' : 'Start Collection'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  {currentConfig.language === 'ar' ? 'لا توجد مصادر شائعة محددة لهذا البلد حالياً.' : 'No popular sources defined for this country yet.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Filters */}
          <Card>
            <CardHeader>
              <CardTitle>{currentConfig.language === 'ar' ? 'تصفية سريعة' : 'Quick Filters'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{currentConfig.regionsLabel}</Label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder={currentConfig.language === 'ar' ? `اختر ${currentConfig.regionsLabel}` : `Select ${currentConfig.regionsLabel}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* FIX: Use 'all' instead of "" for the value */}
                      <SelectItem value="all">{currentConfig.language === 'ar' ? `جميع ${currentConfig.regionsLabel}ات` : `All ${currentConfig.regionsLabel}s`}</SelectItem>
                      {currentConfig.regions.map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{currentConfig.categoriesLabel}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={currentConfig.language === 'ar' ? `اختر ${currentConfig.categoriesLabel}` : `Select ${currentConfig.categoriesLabel}`} />
                    </SelectTrigger>
                    <SelectContent>
                       {/* FIX: Use 'all' instead of "" for the value */}
                      <SelectItem value="all">{currentConfig.language === 'ar' ? `جميع ${currentConfig.categoriesLabel}ات` : `All ${currentConfig.categoriesLabel}s`}</SelectItem>
                      {currentConfig.jobCategories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{currentConfig.language === 'ar' ? 'عدد الوظائف المطلوب' : 'Number of Jobs'}</Label>
                  <Select value={maxJobs} onValueChange={setMaxJobs}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 {currentConfig.language === 'ar' ? 'وظيفة' : 'jobs'}</SelectItem>
                      <SelectItem value="50">50 {currentConfig.language === 'ar' ? 'وظيفة' : 'jobs'}</SelectItem>
                      <SelectItem value="100">100 {currentConfig.language === 'ar' ? 'وظيفة' : 'jobs'}</SelectItem>
                      <SelectItem value="200">200 {currentConfig.language === 'ar' ? 'وظيفة' : 'jobs'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>{currentConfig.keywordsLabel}</Label>
                <Input
                  placeholder={currentConfig.keywordsPlaceholder}
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentConfig.language === 'ar' ? 'إعدادات مخصصة' : 'Custom Settings'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{currentConfig.language === 'ar' ? 'نوع المصدر' : 'Source Type'}</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue placeholder={currentConfig.language === 'ar' ? 'اختر نوع المصدر' : 'Select source type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* FIX: Ensure value is not empty if placeholder is used, but here it's okay as value is controlled */} 
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="indeed">Indeed</SelectItem>
                      <SelectItem value="website">Website</SelectItem> 
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{currentConfig.language === 'ar' ? 'رابط المصدر' : 'Source URL'}</Label>
                  <Input
                    placeholder="https://www.facebook.com/groups/... or https://ca.indeed.com/..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>

              {/* Custom Sources Management - Kept simple for now */}
              <div className="space-y-4">
                <Label>{currentConfig.language === 'ar' ? 'إدارة المصادر المخصصة' : 'Manage Custom Sources'}</Label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Input
                    placeholder={currentConfig.language === 'ar' ? 'أضف رابط مصدر جديد' : 'Add new source URL'}
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    dir="ltr"
                    className="flex-1 text-left"
                  />
                  <Button onClick={addCustomSource} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {customSources.length > 0 && (
                  <div className="space-y-2">
                    {customSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono text-left" dir="ltr">{source}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomSource(source)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCustomStart}
                disabled={startCollectionMutation.isPending || !selectedSource || !sourceUrl}
                className="w-full"
              >
                {startCollectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Play className="h-4 w-4 ml-2" />
                )}
                {currentConfig.language === 'ar' ? 'بدء جمع الوظائف' : 'Start Job Collection'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentConfig.language === 'ar' ? 'الوظائف المجمعة' : 'Collected Jobs'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : jobs && jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{currentConfig.language === 'ar' ? 'الوظيفة' : 'Job'}</TableHead>
                      <TableHead>{currentConfig.language === 'ar' ? 'المصدر' : 'Source'}</TableHead>
                      <TableHead>{currentConfig.language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                      <TableHead>{currentConfig.language === 'ar' ? 'تاريخ النشر' : 'Date Posted'}</TableHead>
                      <TableHead>{currentConfig.language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                            {job.title}
                          </a>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {job.description}
                          </p>
                        </TableCell>
                        <TableCell>{job.source}</TableCell>
                        <TableCell>{job.location || (currentConfig.language === 'ar' ? 'غير محدد' : 'N/A')}</TableCell>
                        <TableCell>{formatTimeAgo(job.postedAt)}</TableCell>
                        <TableCell>
                          <Badge variant={job.status === 'new' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {currentConfig.language === 'ar' ? 'لم يتم جمع أي وظائف بعد.' : 'No jobs collected yet.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

