import { Mail, Shield, Globe, Lock, Twitter, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand & Mission */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-6 group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-transform group-hover:scale-105 shadow-glow">
                <img
                  src="/logo-white.png"
                  alt="KeenVPN"
                  className="h-7 w-7 object-contain dark:filter-none filter invert dark:invert-0"
                />
              </div>
              <span className="text-2xl font-black text-foreground tracking-tighter">KeenVPN</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
              Reclaiming digital sovereignty through military-grade encryption and global price parity. Empowering users to bypass regional discrimination securely.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-foreground font-black uppercase tracking-widest text-xs mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link to="/pricing" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Pricing Plans</Link></li>
              <li><Link to="/nodes" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Global Nodes</Link></li>
              <li><Link to="/deal-hunter" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Deal Hunter Extension</Link></li>
              <li><Link to="/adblocker" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Adblocker</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-foreground font-black uppercase tracking-widest text-xs mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><Link to="/support" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Help Center</Link></li>
              <li><Link to="/support" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Contact Support</Link></li>
              <li><Link to="/privacy" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="text-foreground font-black uppercase tracking-widest text-xs mb-6">Contact</h4>
            <div className="flex items-center space-x-3 text-slate-400 mb-6 group cursor-pointer">
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-all">
                <Mail className="h-4 w-4" />
              </div>
              <a href="mailto:support@vpnkeen.com" className="text-sm font-bold group-hover:text-secondary transition-colors">
                support@vpnkeen.com
              </a>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-wider">
                Negative Nine Inc.<br/>
                Texas, United States
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            © 2026 Negative Nine Inc. All Rights Reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Verified Secure</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Lock className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-tighter">256-Bit Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
