import React from "react";
import { Link } from "react-router";
import { 
  ArrowRight, 
  Activity, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  Users,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { Logo } from "../components/Logo";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] font-['Inter',sans-serif]">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Logo />
            </Link>
            
            <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
              <a href="#how-it-works" className="hover:text-[#005B3F] transition-colors">How it works</a>
             
            </div>

            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="hidden sm:inline-flex px-4 py-2 font-bold text-[#005B3F] hover:text-[#00432E] transition-colors"
              >
                Sign in
              </Link>
              <Link 
                to="/sign-up" 
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#005B3F] hover:bg-[#00432E] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B4D330]/20 text-[#005B3F] text-sm font-bold mb-6">
              <Activity className="w-4 h-4" />
              <span>AI-Powered Financial Growth</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#111827] leading-[1.1] mb-6 tracking-tight">
              Fair credit. <br className="hidden lg:block" />
              <span className="text-[#005B3F]">Smart investing.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 font-medium leading-relaxed">
              Experience the next generation of microfinance. We use advanced AI to assess your risk score instantly, unlocking fair loan rates or providing high-yield opportunities for investors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-[#005B3F] hover:bg-[#00432E] transition-colors gap-2"
              >
                Apply for a Loan
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-200 rounded-xl text-base font-bold text-[#111827] bg-white hover:border-gray-300 transition-colors"
              >
                Start Investing
              </Link>
            </div>
            
          
          </div>
          
          <div className="relative lg:h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl group">
            <div className="absolute inset-0 bg-[#005B3F]/60 mix-blend-multiply z-10 group-hover:bg-[#005B3F]/50 transition-colors duration-500"></div>
            <img 
              src="https://images.unsplash.com/photo-1687422808248-f807f4ea2a2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwYnVzaW5lc3MlMjBvd25lciUyMHNtaWxpbmd8ZW58MXx8fHwxNzczMDc0MjA2fDA&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="African business owner smiling" 
              className="absolute inset-0 w-full h-full object-cover z-0 grayscale"
            />
            {/* Floating UI Elements */}
            <div className="absolute top-8 left-8 z-20 bg-white p-4 rounded-xl shadow-lg border border-white/20 backdrop-blur-md animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Risk Score</p>
                  <p className="text-xl font-black text-[#005B3F]">88 / 100</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 z-20 bg-[#B4D330] p-4 rounded-xl shadow-lg animate-fade-in-up delay-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#005B3F]" />
                </div>
                <div>
                  <p className="text-xs text-[#005B3F]/80 font-bold uppercase tracking-wider">Funded</p>
                  <p className="text-xl font-black text-[#005B3F]">R 150,000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Section */}
      <section className="bg-[#005B3F] py-16 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#B4D330] rounded-full opacity-10 blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full opacity-5 blur-3xl -ml-20 -mb-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6 lg:gap-8 divide-x-0 lg:divide-x divide-white/20">
            <div className="px-4 text-center">
              <p className="text-3xl sm:text-4xl font-black text-[#B4D330] mb-2">R 45M+</p>
              <p className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Loans Disbursed</p>
            </div>
            <div className="px-4 text-center border-l border-white/20 lg:border-l-0">
              <p className="text-3xl sm:text-4xl font-black text-[#B4D330] mb-2">99.2%</p>
              <p className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Repayment Rate</p>
            </div>
            <div className="px-4 text-center lg:border-l border-white/20">
              <p className="text-3xl sm:text-4xl font-black text-[#B4D330] mb-2">2 Mins</p>
              <p className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Avg. Approval</p>
            </div>
            <div className="px-4 text-center border-l border-white/20 lg:border-l-0">
              <p className="text-3xl sm:text-4xl font-black text-[#B4D330] mb-2">12.5%</p>
              <p className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Avg. Investor</p>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Sided Market Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="how-it-works">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-[#111827] mb-4">A complete ecosystem for growth</h2>
          <p className="text-gray-600 font-medium">Whether you need capital to expand your business or want to earn solid returns on your savings, our AI-driven platform connects ambition with opportunity.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Borrowers */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#F4F6F8] rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-[#005B3F]" />
            </div>
            <h3 className="text-2xl font-bold text-[#111827] mb-3">For Borrowers</h3>
            <p className="text-gray-600 mb-6 font-medium leading-relaxed">
              Skip the traditional bank queues. Our alternative credit scoring model looks beyond your credit history to offer fair, personalized loan terms.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium">Fast approvals based on AI risk assessment</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium">No hidden fees or complex paperwork</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium">Flexible repayment terms that fit your cashflow</span>
              </li>
            </ul>
            <Link to="/login" className="inline-flex items-center font-bold text-[#005B3F] hover:text-[#00432E] gap-2 group">
              Get an instant quote
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Investors */}
          <div className="bg-[#005B3F] text-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#B4D330] rounded-full opacity-20 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-[#B4D330] rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-[#005B3F]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">For Investors</h3>
              <p className="text-white/80 mb-6 font-medium leading-relaxed">
                Put your money to work in the real economy. Fund pre-vetted local entrepreneurs and earn returns that outpace traditional savings accounts.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">Targeted returns between 9.5% and 12.5% p.a.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">AI-backed risk mitigation & capital protection</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">Auto-invest tools to diversify your portfolio</span>
                </li>
              </ul>
              <Link to="/login" className="inline-flex items-center font-bold text-[#B4D330] hover:text-[#c4e33d] gap-2 group">
                View investment opportunities
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#B4D330] py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-black text-[#005B3F] mb-6">Ready to transform your finances?</h2>
          <p className="text-[#005B3F]/80 text-xl font-medium mb-10 max-w-2xl mx-auto">
            Join thousands of users who have already discovered the power of AI-driven microfinance. Setup takes less than 3 minutes.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-[#005B3F] hover:bg-[#00432E] transition-all hover:scale-105"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo iconClassName="w-5 h-5 text-[#005B3F]" textClassName="text-lg font-bold tracking-tight" />
          
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-[#005B3F]">Privacy Policy</a>
            <a href="#" className="hover:text-[#005B3F]">Terms of Service</a>
            <a href="#" className="hover:text-[#005B3F]">Contact Support</a>
            <Link to="/admin/login" className="hover:text-[#005B3F] flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" />
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}