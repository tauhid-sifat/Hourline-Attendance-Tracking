import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import {
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Play,
  Pause,
  Calendar,
  Timer,
  Loader2,
  Pencil
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  status: string;
}

const DAILY_TARGET = 8; // Default 8 hours per day
const WORKING_DAYS = [0, 1, 2, 3, 4]; // Sun-Thu
const LATE_THRESHOLD = 10 * 60 + 5; // 10:05 AM
const HALF_DAY_THRESHOLD = 4; // 4 Hours

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [sessionTime, setSessionTime] = useState("0h 0m");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [hasLogsToday, setHasLogsToday] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [editingData, setEditingData] = useState({
    checkIn: "",
    checkOut: "",
    dayType: "working"
  });
  const [metricsData, setMetricsData] = useState({
    totalHours: 0,
    monthlyTarget: 0,
    workingDaysSoFar: 0,
    totalWorkingDays: 0,
    remainingWorkingDays: 0,
    lateCount: 0,
    pendingLogs: 0,
    weeklyStats: [] as any[]
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      // Fetch all records for the month
      const { data: monthRecords, error: monthError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', startOfMonth)
        .lte('check_in', endOfMonth)
        .order('check_in', { ascending: false });

      if (monthError) throw monthError;

      // 1. Check for Active Session and Today's Record
      const todayStr = now.toDateString();
      const todayRec = monthRecords?.find(r => new Date(r.check_in).toDateString() === todayStr);
      setTodayRecord(todayRec || null);
      setHasLogsToday(!!todayRec);

      const active = todayRec && !todayRec.check_out && todayRec.status !== 'On Leave' && todayRec.status !== 'Holiday' ? todayRec : null;

      if (active) {
        setIsSessionActive(true);
        setActiveRecord(active);
        const startTime = new Date(active.check_in).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      } else {
        setIsSessionActive(false);
        setActiveRecord(null);
        setElapsedSeconds(0);
      }

      // Pre-fill editing data if needed
      if (todayRec) {
        setEditingData({
          checkIn: todayRec.check_in ? new Date(todayRec.check_in).toTimeString().slice(0, 5) : "09:00",
          checkOut: todayRec.check_out ? new Date(todayRec.check_out).toTimeString().slice(0, 5) : "",
          dayType: todayRec.status === 'On Leave' ? 'leave' : todayRec.status === 'Holiday' ? 'holiday' : 'working'
        });
      } else {
        setEditingData({
          checkIn: "09:00",
          checkOut: "",
          dayType: "working"
        });
      }

      // 2. Calculate Total Hours
      let totalMinutes = 0;
      monthRecords?.forEach(r => {
        if (r.check_in && r.check_out) {
          totalMinutes += (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
        }
      });
      const totalHoursNum = totalMinutes / 60;

      // Calculate Days and Targets
      let totalWorkingDays = 0;
      let workingDaysSoFar = 0;
      let remainingWorkingDays = 0;

      const d = new Date(year, month, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      while (d.getMonth() === month) {
        if (WORKING_DAYS.includes(d.getDay())) {
          totalWorkingDays++;
          const dTime = new Date(d);
          dTime.setHours(0, 0, 0, 0);

          if (dTime <= today) {
            workingDaysSoFar++;
          } else {
            remainingWorkingDays++;
          }
        }
        d.setDate(d.getDate() + 1);
      }

      const monthlyTarget = totalWorkingDays * DAILY_TARGET;

      // 3. Late Arrivals
      const lateRecords = monthRecords?.filter(r => r.status === 'Late');
      const lateCount = lateRecords?.length || 0;

      // 4. Pending Logs
      let pendingLogsCount = 0;
      const checkDate = new Date(year, month, 1);
      while (checkDate < new Date(year, month, now.getDate())) {
        if (WORKING_DAYS.includes(checkDate.getDay())) {
          const dayRecords = monthRecords?.filter(r => new Date(r.check_in).toDateString() === checkDate.toDateString());
          if (!dayRecords || dayRecords.length === 0) {
            pendingLogsCount++;
          } else if (dayRecords.some(r => !r.check_out)) {
            pendingLogsCount++;
          }
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }
      // 6. Weekly Stats
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Adjust to Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const weeklyStats = weekDays.map((label, index) => {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + index);
        const dayRecords = monthRecords?.filter(r => new Date(r.check_in).toDateString() === dayDate.toDateString());

        let dayMinutes = 0;
        let isInProgress = false;

        const safeDayRecords = dayRecords || [];
        safeDayRecords.forEach(r => {
          if (r.check_in && r.check_out) {
            const inTime = new Date(r.check_in).getTime();
            const outTime = new Date(r.check_out).getTime();
            if (!isNaN(inTime) && !isNaN(outTime)) {
              dayMinutes += (outTime - inTime) / 60000;
            }
          } else if (r.check_in && !r.check_out && dayDate.toDateString() === now.toDateString()) {
            isInProgress = true;
          }
        });

        const dayHours = Math.max(0, dayMinutes / 60);
        return {
          label,
          value: dayHours.toFixed(1) + "h",
          progress: isNaN(dayHours) ? 0 : Math.min((dayHours / DAILY_TARGET) * 100, 100),
          inProgress: isInProgress
        };
      });
      setMetricsData({
        totalHours: totalHoursNum,
        monthlyTarget,
        workingDaysSoFar,
        totalWorkingDays,
        remainingWorkingDays,
        lateCount,
        pendingLogs: pendingLogsCount,
        weeklyStats
      });

      // Update Recent Activity
      const activityData = (monthRecords || []).slice(0, 5).map(record => {
        const checkInDate = record.check_in ? new Date(record.check_in) : null;
        const isValidDate = checkInDate && !isNaN(checkInDate.getTime());

        return {
          date: isValidDate ? checkInDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' }) : "Invalid Date",
          time: isValidDate ? checkInDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }) : "--:--",
          status: record.check_out ? 'Completed' : 'Active',
          type: record.check_out ? 'success' : 'warning'
        };
      });
      setRecentActivity(activityData);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isSessionActive) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    setSessionTime(`${hours}h ${minutes}m`);
  }, [elapsedSeconds]);

  const handleSaveToday = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const checkInDate = new Date(now);
      const [inH, inM] = editingData.checkIn.split(":").map(Number);
      checkInDate.setHours(inH, inM, 0, 0);

      let checkOutISO = null;
      if (editingData.checkOut) {
        const checkOutDate = new Date(now);
        const [outH, outM] = editingData.checkOut.split(":").map(Number);
        checkOutDate.setHours(outH, outM, 0, 0);
        checkOutISO = checkOutDate.toISOString();
      }

      let status = "Present";
      if (editingData.dayType === 'leave') status = 'On Leave';
      else if (editingData.dayType === 'holiday') status = 'Holiday';
      else if (editingData.dayType === 'half-day') status = 'Half Day';
      else if (inH * 60 + inM > LATE_THRESHOLD) status = 'Late';

      const entryData = {
        user_id: user.id,
        check_in: checkInDate.toISOString(),
        check_out: checkOutISO,
        status: status,
      };

      if (todayRecord) {
        const { error } = await supabase.from('attendance').update(entryData).eq('id', todayRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance').insert([entryData]);
        if (error) throw error;
      }

      toast.success("Today updated successfully");
      setIsEditingToday(false);
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Error saving today:", err);
      toast.error(err.message || "Failed to save today");
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isSessionActive && activeRecord) {
        // Clock out
        const { error } = await supabase
          .from('attendance')
          .update({ check_out: new Date().toISOString() })
          .eq('id', activeRecord.id);

        if (error) throw error;
        toast.success("Session ended successfully");
      } else {
        // Clock in
        const now = new Date();
        const checkInTimeMinutes = now.getHours() * 60 + now.getMinutes();

        // If it's leave/holiday, change to working first
        const status = checkInTimeMinutes > LATE_THRESHOLD ? 'Late' : 'Present';

        if (todayRecord) {
          const { error } = await supabase
            .from('attendance')
            .update({
              check_in: now.toISOString(),
              check_out: null,
              status: status
            })
            .eq('id', todayRecord.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance')
            .insert([{
              user_id: user.id,
              check_in: now.toISOString(),
              status: status
            }]);
          if (error) throw error;
        }
        toast.success(checkInTimeMinutes > LATE_THRESHOLD ? "Session started (Late arrival recorded)" : "Session started successfully");
      }
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Error toggling session:", err);
      toast.error(err.message || "Failed to update session");
    } finally {
      setLoading(false);
    }
  };

  const totalProgress = metricsData.monthlyTarget > 0 ? (metricsData.totalHours / metricsData.monthlyTarget) * 100 : 0;
  const latePercent = metricsData.workingDaysSoFar > 0 ? (metricsData.lateCount / metricsData.workingDaysSoFar) * 100 : 0;
  const shortfall = Math.max(0, metricsData.monthlyTarget - metricsData.totalHours);
  const catchUpPerDay = metricsData.remainingWorkingDays > 0 ? shortfall / metricsData.remainingWorkingDays : 0;

  const metrics = [
    {
      title: "Total Hours",
      value: metricsData.totalHours.toFixed(1) + "h",
      subtitle: `This month · ${metricsData.totalHours.toFixed(1)} / ${metricsData.monthlyTarget}h`,
      insight: `${totalProgress.toFixed(0)}% completed`,
      progress: totalProgress,
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Late Arrivals",
      value: `${metricsData.lateCount} Late Day${metricsData.lateCount !== 1 ? 's' : ''}`,
      subtitle: `Out of ${metricsData.workingDaysSoFar} working days`,
      insight: `${latePercent.toFixed(0)}% of workdays`,
      progress: latePercent,
      icon: AlertCircle,
      color: metricsData.lateCount > 3 ? "text-destructive" : metricsData.lateCount > 0 ? "text-warning" : "text-success",
      bgColor: metricsData.lateCount > 3 ? "bg-destructive/10" : metricsData.lateCount > 0 ? "bg-warning/10" : "bg-success/10",
      hideProgress: true,
    },
    {
      title: "Catch-Up",
      value: catchUpPerDay.toFixed(1) + "h",
      subtitle: "Per remaining workday",
      insight: `To reach ${metricsData.monthlyTarget}h by month end`,
      progress: totalProgress,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
      hideProgress: true,
    },
    {
      title: "Pending Logs",
      value: `${metricsData.pendingLogs} Issue${metricsData.pendingLogs !== 1 ? 's' : ''}`,
      subtitle: metricsData.pendingLogs === 0 ? "All logs complete" : "Action required",
      insight: "",
      progress: 0,
      icon: FileText,
      color: metricsData.pendingLogs > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: metricsData.pendingLogs > 0 ? "bg-destructive/10" : "bg-muted",
      hideProgress: true,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Welcome back! Here's your attendance overview.</p>
      </div>

      {/* Unified Today Panel - Integrated & Slim */}
      <div className="space-y-2">
        {/* Header inside Panel Area */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary md:hidden" />
            <h3 className="font-bold text-sm text-foreground">
              Today, {new Date().toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center gap-2 scale-90 origin-right">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mr-1 hidden sm:block">Day Type</Label>
            <Select
              value={editingData.dayType}
              onValueChange={(val: string) => {
                setEditingData(prev => ({ ...prev, dayType: val }));
                if (!isEditingToday) {
                  let status = 'Present';
                  if (val === 'leave') status = 'On Leave';
                  else if (val === 'holiday') status = 'Holiday';
                  else if (val === 'half-day') status = 'Half Day';

                  const now = new Date();
                  const entryData = {
                    user_id: user?.id,
                    check_in: todayRecord?.check_in || now.toISOString(),
                    check_out: todayRecord?.check_out || null,
                    status: status,
                  };
                  if (todayRecord) {
                    supabase.from('attendance').update(entryData).eq('id', todayRecord.id).then(() => fetchDashboardData());
                  } else {
                    supabase.from('attendance').insert([entryData]).then(() => fetchDashboardData());
                  }
                }
              }}
            >
              <SelectTrigger className="w-[110px] h-7 bg-background/50 border-border text-[11px] font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Area */}
        <div className="px-1">
          {/* State D: Leave / Holiday */}
          {(editingData.dayType === 'leave' || editingData.dayType === 'holiday') ? (
            <div className="flex flex-col items-center justify-center py-4 bg-secondary/10 rounded-2xl border border-dashed border-border/50">
              <p className="text-sm font-medium text-foreground">Enjoy your day off!</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs text-primary h-6"
                onClick={() => {
                  setEditingData(prev => ({ ...prev, dayType: 'working' }));
                  if (todayRecord) {
                    supabase.from('attendance').update({ status: 'Present' }).eq('id', todayRecord.id).then(() => fetchDashboardData());
                  }
                }}
              >
                Change to Working
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {!todayRecord ? (
                /* State A: No Entry Today */
                <div className="flex flex-col items-center justify-center py-5 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                  <p className="text-sm font-bold text-foreground">You haven't started your day yet.</p>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-9 rounded-xl transition-all shadow-md shadow-primary/20"
                    onClick={toggleSession}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                    Start Session
                  </Button>
                </div>
              ) : isEditingToday ? (
                /* Editing Mode (State C expanded) */
                <div className="p-4 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Clock In</Label>
                      <Input
                        type="time"
                        value={editingData.checkIn}
                        onChange={(e) => setEditingData(prev => ({ ...prev, checkIn: e.target.value }))}
                        className="h-8 bg-secondary/50 border-border text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Clock Out</Label>
                      <Input
                        type="time"
                        value={editingData.checkOut}
                        onChange={(e) => setEditingData(prev => ({ ...prev, checkOut: e.target.value }))}
                        className="h-8 bg-secondary/50 border-border text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsEditingToday(false)} disabled={loading}>Cancel</Button>
                    <Button size="sm" className="h-8 text-xs font-bold" onClick={handleSaveToday} disabled={loading}>
                      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : isSessionActive ? (
                /* State B: Active Session - Slim Unified Bar */
                <div className="flex items-center justify-between py-2.5 px-4 bg-success/5 rounded-2xl border border-success/20 gap-4 relative overflow-hidden group transition-all hover:bg-success/[0.07]">
                  <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-40" />

                  {/* Left: Session Info */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-9 h-9 bg-success/15 rounded-lg flex items-center justify-center relative shadow-inner shrink-0 ring-1 ring-success/10">
                      <Timer className="h-4.5 w-4.5 text-success" />
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success rounded-full border-2 border-card animate-pulse shadow-sm" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 leading-none mb-0.5">
                        <span className="text-xs font-bold text-foreground tracking-tight">Active</span>
                        <span className="text-[7px] px-1 py-0.5 bg-success/20 text-success rounded font-black uppercase tracking-wider">Live</span>
                      </div>
                      <p className="text-[9px] font-semibold text-muted-foreground/60 leading-none">Started {editingData.checkIn}</p>
                    </div>
                  </div>

                  {/* Middle: Live Timer */}
                  <div className="flex items-center gap-2 px-4 border-x border-border/10 shrink-0">
                    <p className="text-[8px] uppercase font-bold tracking-widest text-success/40 hidden sm:block">Elapsed</p>
                    <p className="text-xl font-black text-foreground tabular-nums tracking-tighter leading-none">{sessionTime}</p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] px-3 h-7 rounded-lg shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
                      onClick={toggleSession}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="mr-1 h-3.5 w-3.5 fill-current" />}
                      End
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background hover:bg-secondary border-border rounded-lg shrink-0"
                      onClick={() => setIsEditingToday(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* State C: Completed Today - Slim Unified Bar */
                <div className="flex items-center justify-between py-2.5 px-4 bg-secondary/20 rounded-2xl border border-border/40 gap-4 group transition-all hover:bg-secondary/30">
                  {/* Left: Completion Info */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center shadow-inner shrink-0 ring-1 ring-primary/10">
                      <Clock className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground tracking-tight leading-none mb-0.5">Done</p>
                      <p className="text-[9px] font-semibold text-muted-foreground/60 tabular-nums leading-none">
                        {editingData.checkIn}—{editingData.checkOut || "--:--"}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Calculated Metrics */}
                  <div className="flex items-center gap-2 px-4 border-x border-border/10 shrink-0">
                    <p className="text-[8px] uppercase font-bold tracking-widest text-muted-foreground/40 hidden sm:block">Worked</p>
                    <p className="text-xl font-black text-foreground tabular-nums tracking-tighter leading-none">
                      {(() => {
                        const diff = new Date(todayRecord.check_out!).getTime() - new Date(todayRecord.check_in).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return `${h}h ${m}m`;
                      })()}
                    </p>
                  </div>

                  {/* Right: Actions */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-background hover:bg-secondary border-border font-bold text-[9px] px-3 h-7 rounded-lg transition-all shadow-sm hover:scale-[1.02]"
                    onClick={() => setIsEditingToday(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {
          metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </CardTitle>
                    <div className={`size-10 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`size-5 ${metric.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                    </div>
                    <div className="space-y-2">
                      {!metric.hideProgress && <Progress value={metric.progress} className="h-2" />}
                      <p className="text-xs text-muted-foreground font-medium">{metric.insight}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div >

      {/* Recent Activity and Quick Stats Row */}
      < div className="grid grid-cols-1 lg:grid-cols-3 gap-4" >
        {/* Recent Activity */}
        < Card className="lg:col-span-2 bg-card border-border" >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity found.</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.type === "success" ? "bg-success" : "bg-warning"
                        }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.status}</p>
                        <p className="text-xs text-muted-foreground">{activity.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card >

        {/* Quick Stats */}
        < Card className="bg-card border-border" >
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricsData.weeklyStats.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{day.label}</span>
                    <span className={`text-sm font-medium ${day.inProgress ? "text-primary" : "text-foreground"}`}>
                      {day.inProgress ? "In Progress" : day.value}
                    </span>
                  </div>
                  <Progress value={day.progress} className="h-2" />
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Week Total</span>
                  <span className="text-lg font-bold text-primary">
                    {(metricsData.weeklyStats.reduce((acc, curr) => {
                      const val = parseFloat(curr.value);
                      return acc + (isNaN(val) ? 0 : val);
                    }, 0)).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card >
      </div >
    </div >
  );
}
