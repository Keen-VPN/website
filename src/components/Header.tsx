import { Shield, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContextNew";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscription, signIn, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignIn = async () => {
    const result = await signIn();
    if (result.success && result.shouldRedirect) {
      navigate(result.shouldRedirect);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">KeenVPN</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/support" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/support') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Support
            </Link>
            <Link 
              to="/privacy" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/privacy') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Privacy
            </Link>
            <Link 
              to="/terms" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/terms') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Terms
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
                    <User className="w-4 h-4 mr-2" />
                    {user.email}
                    {subscription?.status === 'active' && (
                      <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        Premium
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  {subscription?.status !== 'active' && (
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
                onClick={() => navigate('/signin')}
                variant="outline"
                className="border-primary/50 hover:bg-primary/10"
              >
                Sign In
              </Button>
            )}
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
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
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/support" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/support') ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>
              <Link 
                to="/privacy" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/privacy') ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Privacy
              </Link>
              <Link 
                to="/terms" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/terms') ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Terms
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center space-x-2 p-2 bg-primary/5 rounded-lg">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">{user.email}</span>
                      {subscription?.status === 'active' && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
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
                    {subscription?.status !== 'active' && (
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
                      navigate('/signin');
                      setIsMenuOpen(false);
                    }}
                    variant="outline"
                    className="border-primary/50 hover:bg-primary/10"
                  >
                    Sign In
                  </Button>
                )}
                <Button 
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                  onClick={() => setIsMenuOpen(false)}
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