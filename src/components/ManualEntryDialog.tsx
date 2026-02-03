import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const LATE_THRESHOLD = 10 * 60 + 5; // 10:05 AM
const HALF_DAY_THRESHOLD = 4; // 4 Hours

interface DayData {
  date: number;
  type: string;
  hours?: string;
  status?: string;
  fullDate?: Date;
  id?: string;
}

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: DayData | null;
  onSave?: () => void;
}

export function ManualEntryDialog({ open, onOpenChange, selectedDay, onSave }: ManualEntryDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("18:00");
  const [dayType, setDayType] = useState("working");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDay) {
      // Pre-fill form with selected day data
      setDayType(selectedDay.type);
      setDate(selectedDay.fullDate || new Date());
      // If we had exact times in records, we'd set them here. 
      // For now, it defaults to standard or stays what it was.
    } else {
      // Reset form for new entry
      const now = new Date();
      const isToday = !date || date.toDateString() === now.toDateString();
      setDate(now);
      setCheckInTime("09:00");
      setCheckOutTime(isToday ? "" : "18:00");
      setDayType("working");
      setNotes("");
    }
  }, [selectedDay, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let checkInISO = null;
      let checkOutISO = null;

      if (dayType === "working" || dayType === "half-day") {
        const isToday = date.toDateString() === new Date().toDateString();

        if (!checkInTime || (!checkOutTime && !isToday)) {
          toast.error(isToday ? "Please enter at least a check-in time" : "Please enter check-in and check-out times");
          setLoading(false);
          return;
        }

        const [inH, inM] = checkInTime.split(":").map(Number);
        const checkInDate = new Date(date);
        checkInDate.setHours(inH, inM, 0, 0);
        checkInISO = checkInDate.toISOString();

        if (checkOutTime) {
          const [outH, outM] = checkOutTime.split(":").map(Number);
          const checkOutDate = new Date(date);
          checkOutDate.setHours(outH, outM, 0, 0);

          if (checkOutDate <= checkInDate) {
            toast.error("Check-out time must be after check-in time");
            setLoading(false);
            return;
          }
          checkOutISO = checkOutDate.toISOString();
        } else {
          checkOutISO = null;
        }
      } else {
        // For leaves/holidays, set check-in to start of day and check-out to null
        const dayDate = new Date(date);
        dayDate.setHours(9, 0, 0, 0);
        checkInISO = dayDate.toISOString();
        checkOutISO = null;
      }

      let finalStatus = "Present";
      if (dayType === "leave") finalStatus = "On Leave";
      else if (dayType === "holiday") finalStatus = "Holiday";
      else if (dayType === "half-day") finalStatus = "Half Day";
      else if (checkInTime) {
        const [inH, inM] = checkInTime.split(":").map(Number);
        if (inH * 60 + inM > LATE_THRESHOLD) finalStatus = "Late";
      }

      const entryData = {
        user_id: user.id,
        check_in: checkInISO,
        check_out: checkOutISO,
        status: finalStatus,
        notes: notes || null
      };

      let error;
      if (selectedDay?.id) {
        ({ error } = await supabase
          .from('attendance')
          .update(entryData)
          .eq('id', selectedDay.id));
      } else {
        ({ error } = await supabase
          .from('attendance')
          .insert([entryData]));
      }

      if (error) throw error;

      toast.success(selectedDay ? "Entry updated successfully!" : "Entry created successfully!");
      if (onSave) onSave();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error saving entry:", err);
      toast.error(err.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedDay ? "Edit Entry" : "New Manual Entry"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {selectedDay
              ? "Update attendance record for this day"
              : "Add a manual attendance entry for past dates"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal bg-input-background border-border hover:bg-secondary"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(date)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Day Type */}
          <div className="space-y-2">
            <Label htmlFor="dayType">Day Type</Label>
            <Select value={dayType} onValueChange={setDayType}>
              <SelectTrigger className="bg-input-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="working">Working Day</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Inputs - Only for working days */}
          {(dayType === "working" || dayType === "half-day") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-In Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="checkIn"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="bg-input-background border-border pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOut">
                    Check-Out Time {date && date.toDateString() === new Date().toDateString() ? "(Optional)" : ""}
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="checkOut"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      placeholder={date && date.toDateString() === new Date().toDateString() ? "Leave empty for active session" : ""}
                      className="bg-input-background border-border pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Hours Display */}
              {checkInTime && checkOutTime && (() => {
                const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);
                const [checkOutHour, checkOutMinute] = checkOutTime.split(":").map(Number);
                const checkInMinutes = checkInHour * 60 + checkInMinute;
                const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
                const totalMinutes = checkOutMinutes - checkInMinutes;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                if (totalMinutes > 0) {
                  return (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-lg font-semibold text-primary">
                        {hours}h {minutes > 0 ? `${minutes}m` : ""}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}



          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-input-background border-border"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedDay ? "Update Entry" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
