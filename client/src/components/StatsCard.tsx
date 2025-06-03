import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "orange" | "green" | "gray";
  trend?: number;
  description?: string;
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-600",
  orange: "bg-orange-100 text-orange-600", 
  green: "bg-green-100 text-green-600",
  gray: "bg-gray-100 text-gray-600"
};

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  color, 
  trend, 
  description 
}: StatsCardProps) {
  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {value.toLocaleString('ar-SA')}
            </p>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}>
            <i className={`${icon} text-xl`}></i>
          </div>
        </div>
        
        <div className="flex items-center mt-4 text-sm">
          {trend !== undefined ? (
            <>
              <i className="fas fa-arrow-up text-green-600 ml-1"></i>
              <span className="text-green-600 font-medium">+{trend}%</span>
              <span className="text-gray-500 mr-2">{description}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
              <span className="text-gray-500">{description}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
