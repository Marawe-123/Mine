import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Play, Brain, Send, FileText } from "lucide-react";

export default function QuickActionsPanel() {
  const { toast } = useToast();

  const startJobCollectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/actions/start-job-collection', {
        source: 'facebook'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء جمع الوظائف",
        description: "سيتم جمع الوظائف الجديدة في الخلفية",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/active'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في بدء عملية جمع الوظائف",
        variant: "destructive",
      });
    },
  });

  const analyzeCommentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/actions/analyze-comments', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء تحليل التعليقات",
        description: "سيتم تحليل التعليقات المعلقة في الخلفية",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/active'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في بدء عملية تحليل التعليقات",
        variant: "destructive",
      });
    },
  });

  const sendRepliesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/actions/send-replies', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بدء إرسال الردود",
        description: "سيتم إرسال الردود المعلقة في الخلفية",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/active'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في بدء عملية إرسال الردود",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>إجراءات سريعة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => startJobCollectionMutation.mutate()}
          disabled={startJobCollectionMutation.isPending}
          className="w-full flex items-center justify-between p-4 bg-primary bg-opacity-5 border border-primary border-opacity-20 rounded-lg hover:bg-primary hover:bg-opacity-10 transition-colors"
          variant="ghost"
        >
          <div className="flex items-center space-x-3 space-x-reverse">
            <Play className="text-primary" size={16} />
            <span className="font-medium text-primary">بدء جمع الوظائف</span>
          </div>
          <ChevronLeft className="text-primary" size={16} />
        </Button>

        <Button
          onClick={() => analyzeCommentsMutation.mutate()}
          disabled={analyzeCommentsMutation.isPending}
          variant="ghost"
          className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3 space-x-reverse">
            <Brain className="text-gray-600" size={16} />
            <span className="font-medium text-gray-600">تحليل التعليقات المعلقة</span>
          </div>
          <ChevronLeft className="text-gray-400" size={16} />
        </Button>

        <Button
          onClick={() => sendRepliesMutation.mutate()}
          disabled={sendRepliesMutation.isPending}
          variant="ghost"
          className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3 space-x-reverse">
            <Send className="text-gray-600" size={16} />
            <span className="font-medium text-gray-600">إرسال الردود المعلقة</span>
          </div>
          <ChevronLeft className="text-gray-400" size={16} />
        </Button>

        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3 space-x-reverse">
            <FileText className="text-gray-600" size={16} />
            <span className="font-medium text-gray-600">عرض سجل النشاطات</span>
          </div>
          <ChevronLeft className="text-gray-400" size={16} />
        </Button>

        {/* Connection Status */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">حالة الاتصال</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">فيسبوك</span>
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">متصل</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">LinkedIn</span>
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">متصل</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">قاعدة البيانات</span>
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">متصل</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
