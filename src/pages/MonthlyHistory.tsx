import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { ManualEntryDialog } from "../components/ManualEntryDialog";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

type DayType = "working" | "half-day" | "leave" | "holiday" | "weekend" | "future" | "unrecorded";

interface DayData {
  date: number;
  type: DayType;
  hours?: string;
  status?: string;
  fullDate?: Date;
  id?: string;
}

export function MonthlyHistory() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthRecords = useCallback(async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('check_in', startOfMonth)
        .lte('check_in', endOfMonth)
        .order('check_in', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error("Error fetching history:", err);
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchMonthRecords();
  }, [fetchMonthRecords]);

  const getDayData = (dayNumber: number): DayData => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    const dateString = date.toDateString();

    // Check if it's a weekend (Friday, Saturday)
    const isWeekend = date.getDay() === 5 || date.getDay() === 6;

    // Check if it's in the future
    const isFuture = date > new Date();

    const record = records.find((r: any) => new Date(r.check_in).toDateString() === dateString);

    if (record) {
      let hours = "-";
      if (record.check_out) {
        const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        hours = `${h}h ${m}m`;
      }

      let type: DayType = "working";
      if (record.status === "On Leave") type = "leave";
      if (record.status === "Holiday") type = "holiday";
      if (record.status === "Half Day") type = "half-day";

      return {
        date: dayNumber,
        type,
        hours,
        status: record.status,
        fullDate: date,
        id: record.id
      };
    }

    return {
      date: dayNumber,
      type: isFuture ? "future" : (isWeekend ? "weekend" : "unrecorded"),
      fullDate: date
    };
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getDayColor = (day: DayData) => {
    if (day.status === "Late") {
      return "bg-warning/20 border-warning text-warning hover:bg-warning/30";
    }

    switch (day.type) {
      case "working":
        return "bg-success/20 border-success text-success hover:bg-success/30";
      case "half-day":
        return "bg-warning/20 border-warning text-warning hover:bg-warning/30";
      case "leave":
        return "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30";
      case "holiday":
        return "bg-primary/20 border-primary text-primary hover:bg-primary/30";
      case "weekend":
        return "bg-muted border-border text-muted-foreground";
      case "future":
        return "bg-secondary border-border text-muted-foreground";
      case "unrecorded":
        return "bg-card border-border hover:bg-secondary/50";
      default:
        return "bg-card border-border";
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
    setIsDialogOpen(true);
  };

  const handleNewEntry = () => {
    setSelectedDay(null);
    setIsDialogOpen(true);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return getDayData(dayNumber);
    }
    return null;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Monthly History</h2>
          <p className="text-muted-foreground mt-1">View and manage your attendance records</p>
        </div>
        <div className="flex gap-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary mt-3" />}
          <Button
            onClick={handleNewEntry}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 bg-success/20 border-success" />
              <span className="text-sm text-foreground">Working Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 bg-warning/20 border-warning" />
              <span className="text-sm text-foreground">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 bg-destructive/20 border-destructive" />
              <span className="text-sm text-foreground">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 bg-primary/20 border-primary" />
              <span className="text-sm text-foreground">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 bg-muted border-border" />
              <span className="text-sm text-foreground">Weekend</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">18</p>
              <p className="text-sm text-muted-foreground mt-1">Working Days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">1</p>
              <p className="text-sm text-muted-foreground mt-1">Half Days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">1</p>
              <p className="text-sm text-muted-foreground mt-1">Leaves</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">158h</p>
              <p className="text-sm text-muted-foreground mt-1">Total Hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="border-border hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="border-border hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`aspect-square p-2 rounded-lg border-2 transition-all ${day
                  ? `${getDayColor(day)} cursor-pointer`
                  : "bg-transparent border-transparent"
                  }`}
                onClick={() => day && handleDayClick(day)}
              >
                {day && (
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="text-right font-semibold">{day.date}</div>
                      {day.status && (
                        <div className="text-[8px] font-bold uppercase py-0.5 px-1 bg-background/50 rounded">
                          {day.status}
                        </div>
                      )}
                    </div>
                    {day.hours && (
                      <div className="text-xs text-center font-medium">{day.hours}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ManualEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDay={selectedDay}
        onSave={fetchMonthRecords}
      />
    </div>
  );
}
