import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  const handleGoogleLogin = async () => {
    try {
      toast({
        title: "Opening Google Sign-In...",
        description: "Please complete the authentication in the popup window.",
      });

      const result = await signInWithPopup(auth, googleProvider);
      console.log("Full sign-in result:", result);

      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential) {
        toast({
          title: "⚠️ No credential returned",
          description: "Sign-in may still be successful.",
          variant: "destructive",
        });
        return;
      }

      const accessToken = credential.accessToken;
      console.log("✅ AccessToken:", accessToken);
      
      localStorage.setItem("token", `keenvpn://auth?token=${accessToken}`);
      
      toast({
        title: "✅ Login Successful",
        description: "Redirecting to VPN app...",
      });

      // Redirect to VPN app
      window.location.href = `keenvpn://auth?token=${accessToken}`;
    } catch (error) {
      console.error("❌ Sign-in error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during sign-in",
        variant: "destructive",
      });
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
            <Button 
              onClick={handleGoogleLogin}
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
            >
              Login with Google
            </Button>
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
                  onClick={() => {
                    handleGoogleLogin();
                    setIsMenuOpen(false);
                  }}
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10"
                >
                  Login with Google
                </Button>
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