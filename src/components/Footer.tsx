import { Shield, Twitter, Facebook, Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">KeenVPN</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your trusted partner for online privacy and security. Protecting
              millions of users worldwide with enterprise-grade encryption and
              zero-log policy.
            </p>
          </div>

          {/* Company Info */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-2">Negative Nine Inc.</h3>
            <div className="text-muted-foreground text-sm">
              <p>134 N 4th St, office 203</p>
              <p>Brooklyn, NY 11249</p>
            </div>
          </div>

          {/* Legal */}
          <div>
            <ul className="flex gap-4">
              <li>
                <Link
                  to="/support"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground">
            © 2025 KeenVPN. All rights reserved. Your privacy is our priority.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;