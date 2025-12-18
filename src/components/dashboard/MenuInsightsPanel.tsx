import { useNavigate, useParams } from 'react-router-dom';
import { useMenuInsights, DaysThreshold } from '@/hooks/useMenuInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  AlertCircle, 
  Clock, 
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Settings2,
  Trophy,
  BarChart3,
  Flame
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface InsightItemProps {
  id: string;
  name: string;
  categoryName: string | null;
  label: string;
  variant: 'warning' | 'info' | 'muted' | 'success';
  onClick: () => void;
  orderCount?: number;
  showCount?: boolean;
}

function InsightItem({ name, categoryName, label, variant, onClick, orderCount, showCount }: InsightItemProps) {
  const variantClasses = {
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {categoryName && (
          <p className="text-sm text-muted-foreground truncate">{categoryName}</p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        {showCount && orderCount !== undefined && (
          <span className="text-sm font-semibold text-muted-foreground">{orderCount} sold</span>
        )}
        <Badge variant="outline" className={variantClasses[variant]}>
          {label}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

interface InsightSectionProps {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; name: string; categoryName: string | null; categoryId: string | null; orderCount?: number }>;
  label: string;
  variant: 'warning' | 'info' | 'muted' | 'success';
  onItemClick: (id: string) => void;
  defaultOpen?: boolean;
  showCount?: boolean;
}

function InsightSection({ title, icon, items, label, variant, onItemClick, defaultOpen = false, showCount }: InsightSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          <Badge variant="secondary">{items.length}</Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-2">
        {items.slice(0, 5).map((item, index) => (
          <InsightItem
            key={item.id}
            id={item.id}
            name={showCount ? `${index + 1}. ${item.name}` : item.name}
            categoryName={item.categoryName}
            label={label}
            variant={variant}
            onClick={() => onItemClick(item.id)}
            orderCount={item.orderCount}
            showCount={showCount}
          />
        ))}
        {items.length > 5 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            +{items.length - 5} more items
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MenuInsightsPanel() {
  const navigate = useNavigate();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { insights, loading, daysThreshold, setDaysThreshold, totalIssues } = useMenuInsights();
  const [showSettings, setShowSettings] = useState(false);

  const handleItemClick = (itemId: string) => {
    navigate(`/dashboard/${restaurantId}/menu?edit=${itemId}`);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/dashboard/${restaurantId}/menu?category=${categoryId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Menu & Sales Intelligence</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Inactive threshold:</span>
            <Select
              value={daysThreshold.toString()}
              onValueChange={(v) => setDaysThreshold(parseInt(v) as DaysThreshold)}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Best Sellers
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              To Review
              {totalIssues > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {totalIssues}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4 mt-4">
            {/* Best Sellers */}
            {insights.bestSellers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Top Performers</span>
                </div>
                <div className="space-y-1">
                  {insights.bestSellers.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-500 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.categoryName && (
                            <p className="text-sm text-muted-foreground truncate">{item.categoryName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <Flame className="h-3 w-3 mr-1" />
                          {item.orderCount} sold
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top Categories */}
            {insights.topCategories.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 px-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Category Performance</span>
                </div>
                <div className="space-y-1">
                  {insights.topCategories.map((cat, index) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-sm text-muted-foreground">{cat.itemCount} items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {cat.orderCount} orders
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Least Ordered */}
            {insights.leastOrdered.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 px-1">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lowest Sellers</span>
                </div>
                <div className="space-y-1">
                  {insights.leastOrdered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.categoryName && (
                          <p className="text-sm text-muted-foreground truncate">{item.categoryName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          {item.orderCount} sold
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {insights.bestSellers.length === 0 && insights.topCategories.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sales data yet</p>
                <p className="text-sm">Orders will appear here once customers start ordering.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-2 mt-4">
            {totalIssues === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Your menu looks healthy!</p>
                <p className="text-sm">All items are performing well.</p>
              </div>
            ) : (
              <>
                <InsightSection
                  title="Never ordered"
                  icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                  items={insights.neverOrdered}
                  label="Never ordered"
                  variant="warning"
                  onItemClick={handleItemClick}
                  defaultOpen={insights.neverOrdered.length > 0}
                />

                <InsightSection
                  title="Ordered only once"
                  icon={<AlertCircle className="h-4 w-4 text-blue-500" />}
                  items={insights.orderedOnce}
                  label="Ordered once"
                  variant="info"
                  onItemClick={handleItemClick}
                />

                <InsightSection
                  title={`Not ordered in ${daysThreshold} days`}
                  icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                  items={insights.notOrderedRecently}
                  label={`${daysThreshold}d inactive`}
                  variant="muted"
                  onItemClick={handleItemClick}
                />

                {insights.lowPerformingCategories.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Low-performing categories</span>
                    </div>
                    <div className="space-y-1 px-2">
                      {insights.lowPerformingCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                        >
                          <span className="font-medium">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              {cat.orderCount} orders
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
