import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Calendar, Settings, LogOut } from "lucide-react";
import { Button } from "./ui/button";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Hourline</h1>
          <p className="text-sm text-muted-foreground mt-1">Attendance Tracker</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/app">
            <Button
              variant={isActive("/app") ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive("/app")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-secondary"
              }`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </Button>
          </Link>
          
          <Link to="/app/history">
            <Button
              variant={isActive("/app/history") ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive("/app/history")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-secondary"
              }`}
            >
              <Calendar className="mr-3 h-5 w-5" />
              Monthly History
            </Button>
          </Link>
          
          <Link to="/app/settings">
            <Button
              variant={isActive("/app/settings") ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive("/app/settings")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-secondary"
              }`}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Button>
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
