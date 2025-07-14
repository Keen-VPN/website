import { Shield, Twitter, Facebook, Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">KeenVPN</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your trusted partner for online privacy and security. Protecting millions of users worldwide with military-grade encryption and zero-log policy.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-secondary rounded-lg hover:bg-primary/20 transition-colors">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="p-2 bg-secondary rounded-lg hover:bg-primary/20 transition-colors">
                <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="p-2 bg-secondary rounded-lg hover:bg-primary/20 transition-colors">
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="p-2 bg-secondary rounded-lg hover:bg-primary/20 transition-colors">
                <Mail className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Download
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground">
            © 2024 KeenVPN. All rights reserved. Your privacy is our priority.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;