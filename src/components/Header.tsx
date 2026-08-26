import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendsBadge } from "@/hooks/use-friends-badge";
import { marketingSiteUrl } from "@/lib/site-urls";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscription, logout } = useAuth();
  const friendsBadge = useFriendsBadge({
    poll: !location.pathname.startsWith("/friends"),
  });

  const friendsMenuLabel = (
    <span className="flex items-center gap-2">
      Friends
      {friendsBadge.enabled && friendsBadge.totalBadge > 0 ? (
        <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
          {friendsBadge.totalBadge > 99 ? "99+" : friendsBadge.totalBadge}
        </Badge>
      ) : null}
    </span>
  );

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a
            href={marketingSiteUrl()}
            className="flex items-center space-x-3 group"
          >
            <img
              src="/logo-white.png"
              alt="KeenVPN"
              className="h-10 w-10 transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold text-foreground">KeenVPN</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href={marketingSiteUrl()}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Home
            </a>
            <a
              href={marketingSiteUrl("/pricing.html")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Pricing
            </a>
            <a
              href={marketingSiteUrl("/server-locations/")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Servers
            </a>
            <a
              href={marketingSiteUrl("/#faq")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Support
            </a>
            <a
              href={marketingSiteUrl("/privacy.html")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Privacy
            </a>
            <a
              href={marketingSiteUrl("/terms.html")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Terms
            </a>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 max-w-[min(100%,280px)] items-center rounded-[8px] border border-white/35 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <User className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{user.email}</span>
                    {subscription?.status === "active" && (
                      <span className="ml-2 shrink-0 rounded-full bg-[#E85C04] px-2 py-0.5 text-xs font-medium text-[#081020]">
                        Premium
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/referrals">Referrals</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/friends">{friendsMenuLabel}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/perks">Perks</Link>
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
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="inline-flex h-10 items-center rounded-[8px] border border-white/40 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Sign In
              </button>
            )}
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
              <a
                href={marketingSiteUrl()}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </a>
              <a
                href={marketingSiteUrl("/pricing.html")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href={marketingSiteUrl("/server-locations/")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Servers
              </a>
              <a
                href={marketingSiteUrl("/#faq")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </a>
              <a
                href={marketingSiteUrl("/privacy.html")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Privacy
              </a>
              <a
                href={marketingSiteUrl("/terms.html")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Terms
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center space-x-2 rounded-[8px] border border-white/25 bg-white/10 p-2 text-white">
                      <User className="h-4 w-4 shrink-0 text-white/90" />
                      <span className="min-w-0 truncate text-sm font-medium">
                        {user.email}
                      </span>
                      {subscription?.status === "active" && (
                        <span className="shrink-0 rounded-full bg-[#E85C04] px-2 py-0.5 text-xs font-medium text-[#081020]">
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
                      <Link to="/dashboard">My Account</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link to="/referrals">Referrals</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link to="/friends">{friendsMenuLabel}</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link to="/perks">Perks</Link>
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
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/signin");
                      setIsMenuOpen(false);
                    }}
                    className="inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-white/40 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
