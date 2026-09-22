import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { Calendar, DollarSign, Eye, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthorAnalyticsWidgetProps {
  analytics: {
    salesTrend?: Array<{ date: string; sales: number; earnings: number }>;
    monthlyEarnings?: Array<{ month: string; earnings: number; sales: number }>;
    viewsTrend?: Array<{ title: string; views: number }>;
    topBooks?: Array<{ id: string; title: string; salesCount: number; earningsTotal: number; views?: number; price?: number }>;
  } | null;
}

const BAR_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

export const AuthorAnalyticsWidget: React.FC<AuthorAnalyticsWidgetProps> = ({ analytics }) => {
  if (!analytics) return null;

  const salesTrendData = analytics.salesTrend || [];
  const monthlyEarningsData = analytics.monthlyEarnings || [];
  const viewsTrendData = analytics.viewsTrend || [];
  const topBooksData = (analytics.topBooks || []).slice(0, 5).map((b) => ({
    title: b.title.length > 14 ? b.title.slice(0, 14) + '...' : b.title,
    sales: b.salesCount || 0,
    earnings: b.earningsTotal || 0,
  }));

  return (
    <div className="space-y-6">
      {/* 2x2 Grid of Recharts Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Sales Trend (Line Chart) */}
        <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Daily Sales (Last 30 Days)
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Units sold per day
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} interval={4} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} copies sold`, 'Daily Sales']}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ fill: '#059669', r: 3 }}
                      activeDot={{ r: 6, fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No daily sales recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Monthly Earnings (Bar Chart) */}
        <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              Monthly Earnings (₦)
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Royalty revenue trends
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {monthlyEarningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyEarningsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, 'Earnings']}
                    />
                    <Bar dataKey="earnings" fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No monthly earnings data yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Book Views Trend (Line Chart) */}
        <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              Book Views Distribution
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Reader interest by eBook
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {viewsTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={viewsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} total views`, 'Views']}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No view analytics available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Top 5 Performing Books (Horizontal Bar Chart) */}
        <Card className="border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#0d0d15] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-500" />
              Top 5 Performing Books
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Ranked by copies sold
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {topBooksData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topBooksData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: '#6b7280' }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} sales (₦${item.payload.earnings.toLocaleString()})`,
                        'Performance'
                      ]}
                    />
                    <Bar dataKey="sales" radius={[0, 6, 6, 0]}>
                      {topBooksData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No top books sales recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthorAnalyticsWidget;
