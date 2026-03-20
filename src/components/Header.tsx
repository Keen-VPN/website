import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import { ModeToggle } from "@/components/mode-toggle";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscription, logout } = useAuth();
  const appStoreUrl = useAppStoreUrl();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 relative overflow-hidden rounded-xl bg-primary flex items-center justify-center border border-primary/20 transition-transform group-hover:scale-105 shadow-glow">
              <img
                src="/logo-white.png"
                alt="KeenVPN"
                className="h-7 w-7 object-contain"
              />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">KeenVPN</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {[
              { name: "Home", path: "/" },
              { name: "Pricing", path: "/pricing" },
              { name: "Support", path: "/support" },
              { name: "Privacy", path: "/privacy" },
              { name: "Terms", path: "/terms" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all hover:bg-primary/10 hover:text-primary ${isActive(link.path) ? "text-primary bg-primary/5" : "text-muted-foreground"
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            <ModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-border/50 hover:bg-primary/5 hover:text-primary rounded-xl"
                  >
                    <User className="w-4 h-4 mr-2" />
                    <span className="max-w-[120px] truncate">{user.email}</span>
                    {subscription?.status === "active" && (
                      <span className="ml-2 px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded-full font-bold uppercase tracking-wider">
                        Premium
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
                  <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg">
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  {subscription?.status !== "active" && (
                    <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg">
                      <Link to="/subscribe">Subscribe</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout} className="cursor-pointer py-3 rounded-lg text-rose-500 hover:text-rose-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate("/signin")}
                variant="ghost"
                className="hover:bg-primary/5 hover:text-primary rounded-xl"
              >
                Sign In
              </Button>
            )}
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-glow transition-all rounded-xl font-bold px-6"
              onClick={() => window.open(appStoreUrl, "_blank")}
            >
              Download
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center space-x-2">
            <ModeToggle />
            <button
              className="p-2 rounded-lg hover:bg-primary/5 text-foreground transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-6 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col space-y-1">
              {[
                { name: "Home", path: "/" },
                { name: "Pricing", path: "/pricing" },
                { name: "Support", path: "/support" },
                { name: "Privacy", path: "/privacy" },
                { name: "Terms", path: "/terms" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-primary/5 hover:text-primary ${isActive(link.path) ? "text-primary bg-primary/5" : "text-muted-foreground"
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 px-2 space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl border border-border/50 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate">{user.email}</span>
                        {subscription?.status === "active" && (
                          <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Premium Member</span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsMenuOpen(false)}
                      variant="outline"
                      className="w-full justify-start rounded-xl h-12"
                      asChild
                    >
                      <Link to="/account">My Account</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start rounded-xl h-12 text-rose-500"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      navigate("/signin");
                      setIsMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full rounded-xl h-12 border-border/50 shadow-sm"
                  >
                    Sign In
                  </Button>
                )}
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-12 rounded-xl font-bold text-lg"
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.open(appStoreUrl, "_blank");
                  }}
                >
                  Download App
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
