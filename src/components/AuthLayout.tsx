import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Hourline</h1>
          <p className="text-muted-foreground">Attendance Tracking Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
