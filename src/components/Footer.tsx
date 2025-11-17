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
            <h3 className="font-semibold text-foreground mb-2">About Us</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              KeenVPN is a secure VPN service owned and operated by Negative
              Nine Inc., a technology company based in Texas, USA. Our mission
              is to provide privacy-first networking tools to individuals and
              businesses across the globe.
            </p>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a
                href="mailto:support@vpnkeen.com"
                className="hover:text-primary transition-colors"
              >
                support@vpnkeen.com
              </a>
            </div>
          </div>

          {/* Company Info */}
          {/* <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-2">Negative Nine Inc.</h3>
            <div className="text-muted-foreground text-sm">
              <p>134 N 4th St, office 203</p>
              <p>Brooklyn, NY 11249</p>
            </div>
          </div> */}

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
            © 2025 Negative Nine Inc. All rights reserved. KeenVPN™ is a product
            of Negative Nine Inc., registered in the United States.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
