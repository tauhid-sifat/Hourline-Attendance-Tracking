import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { Settings as SettingsIcon, Clock, Calendar, Save, RotateCcw } from "lucide-react";

export function Settings() {
  const [settings, setSettings] = useState({
    officeStartTime: "09:00",
    lastAllowedEntry: "09:30",
    minDailyHours: "9",
    halfDayMinHours: "4.5",
    workdays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleTimeChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleHoursChange = (field: string, value: string) => {
    // Validate numeric input
    const numericValue = value.replace(/[^0-9.]/g, "");
    setSettings((prev) => ({ ...prev, [field]: numericValue }));
    setHasChanges(true);
  };

  const handleWorkdayToggle = (day: string) => {
    setSettings((prev) => ({
      ...prev,
      workdays: {
        ...prev.workdays,
        [day]: !prev.workdays[day as keyof typeof prev.workdays],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validation
    if (!settings.officeStartTime || !settings.lastAllowedEntry) {
      toast.error("Please fill in all time fields");
      return;
    }

    if (!settings.minDailyHours || !settings.halfDayMinHours) {
      toast.error("Please fill in all hour fields");
      return;
    }

    const minDaily = parseFloat(settings.minDailyHours);
    const halfDay = parseFloat(settings.halfDayMinHours);

    if (isNaN(minDaily) || isNaN(halfDay)) {
      toast.error("Please enter valid numbers for hours");
      return;
    }

    if (halfDay >= minDaily) {
      toast.error("Half day hours must be less than minimum daily hours");
      return;
    }

    // Check if at least one workday is selected
    const hasWorkday = Object.values(settings.workdays).some((day) => day);
    if (!hasWorkday) {
      toast.error("Please select at least one workday");
      return;
    }

    toast.success("Settings saved successfully!");
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings({
      officeStartTime: "09:00",
      lastAllowedEntry: "09:30",
      minDailyHours: "9",
      halfDayMinHours: "4.5",
      workdays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
    });
    setHasChanges(false);
    toast.info("Settings reset to defaults");
  };

  const workdaysList = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure your attendance tracking preferences</p>
      </div>

      {/* Time Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Time Configuration
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Set your office hours and entry rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="officeStartTime">Office Start Time</Label>
              <Input
                id="officeStartTime"
                type="time"
                value={settings.officeStartTime}
                onChange={(e) => handleTimeChange("officeStartTime", e.target.value)}
                className="bg-input-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Official office start time
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastAllowedEntry">Last Allowed Entry</Label>
              <Input
                id="lastAllowedEntry"
                type="time"
                value={settings.lastAllowedEntry}
                onChange={(e) => handleTimeChange("lastAllowedEntry", e.target.value)}
                className="bg-input-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Latest time to mark attendance without being late
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minDailyHours">Minimum Daily Hours</Label>
              <Input
                id="minDailyHours"
                type="text"
                placeholder="9"
                value={settings.minDailyHours}
                onChange={(e) => handleHoursChange("minDailyHours", e.target.value)}
                className="bg-input-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Required hours for a full working day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="halfDayMinHours">Half Day Minimum Hours</Label>
              <Input
                id="halfDayMinHours"
                type="text"
                placeholder="4.5"
                value={settings.halfDayMinHours}
                onChange={(e) => handleHoursChange("halfDayMinHours", e.target.value)}
                className="bg-input-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Minimum hours required for half day
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workdays Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Workdays Configuration
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Select your working days of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workdaysList.map((day) => (
              <div
                key={day.key}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <Label
                  htmlFor={day.key}
                  className="text-base font-medium cursor-pointer flex-1"
                >
                  {day.label}
                </Label>
                <Switch
                  id={day.key}
                  checked={settings.workdays[day.key as keyof typeof settings.workdays]}
                  onCheckedChange={() => handleWorkdayToggle(day.key)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-sm text-muted-foreground">
              Selected workdays:{" "}
              <span className="font-medium text-primary">
                {Object.entries(settings.workdays)
                  .filter(([_, enabled]) => enabled)
                  .length}{" "}
                days per week
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex-1">
                <Label htmlFor="lateReminder" className="text-base font-medium cursor-pointer">
                  Late Arrival Reminder
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when you're running late
                </p>
              </div>
              <Switch
                id="lateReminder"
                defaultChecked={true}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex-1">
                <Label htmlFor="dailySummary" className="text-base font-medium cursor-pointer">
                  Daily Summary
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive end-of-day attendance summary
                </p>
              </div>
              <Switch
                id="dailySummary"
                defaultChecked={true}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <div className="flex-1">
                <Label htmlFor="weeklyReport" className="text-base font-medium cursor-pointer">
                  Weekly Report
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get weekly attendance insights every Monday
                </p>
              </div>
              <Switch
                id="weeklyReport"
                defaultChecked={false}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-border hover:bg-secondary"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {hasChanges && (
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/30">
          <p className="text-sm text-warning">
            You have unsaved changes. Don't forget to save your settings.
          </p>
        </div>
      )}
    </div>
  );
}
