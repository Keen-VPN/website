import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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