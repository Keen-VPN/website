import { Shield, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContextNew";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscription, signIn, logout } = useAuth();
  const appStoreUrl = useAppStoreUrl();

  const isActive = (path: string) => location.pathname === path;

  const handleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.shouldRedirect) {
      navigate(result.shouldRedirect);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/logo-white.png"
              alt="KeenVPN"
              className="h-10 w-10 transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold text-foreground">KeenVPN</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              to="/pricing"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/pricing") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/support"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/support") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Support
            </Link>
            <Link
              to="/privacy"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/privacy") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/terms") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Terms
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-accent/50 hover:bg-accent/10 hover:border-accent"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.email}
                    {subscription?.status === "active" && (
                      <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                        Premium
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  {subscription?.status !== "active" && (
                    <DropdownMenuItem asChild>
                      <Link to="/subscribe">Subscribe</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate("/signin")}
                variant="outline"
                className="border-accent/50 hover:bg-accent/10 hover:border-accent"
              >
                Sign In
              </Button>
            )}
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-glow transition-all"
              onClick={() => window.open(appStoreUrl, "_blank")}
            >
              Download App
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/pricing"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/pricing")
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/support"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/support")
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>
              <Link
                to="/privacy"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/privacy")
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/terms") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Terms
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center space-x-2 p-2 bg-accent/10 rounded-lg border border-accent/20">
                      <User className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">{user.email}</span>
                      {subscription?.status === "active" && (
                        <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                          Premium
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link to="/account">My Account</Link>
                    </Button>
                    {subscription?.status !== "active" && (
                      <Button
                        onClick={() => {
                          setIsMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                        asChild
                      >
                        <Link to="/subscribe">Subscribe</Link>
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
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
                    className="border-accent/50 hover:bg-accent/10 hover:border-accent"
                  >
                    Sign In
                  </Button>
                )}
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-glow transition-all"
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
