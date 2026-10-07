import { useNavigate, useLocation } from "react-router";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Mail, 
  Phone,
  ArrowRight,
  Home,
  Download,
  Bell
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/button";

export default function LoanConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  const applicationDetails = {
    referenceNumber: location.state?.referenceNumber ?? "Not available",
    submittedDate: new Date().toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    submittedTime: new Date().toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
  };


   const downloadReceipt = () => {
    const receipt = window.open("", "_blank", "width=600,height=700");
    if (!receipt) return;
    receipt.document.write(`
      <html>
        <head><title>Receipt ${applicationDetails.referenceNumber}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px;">
          <h1 style="color: #005B3F;">Mbudzi Tshena Financial Solutions</h1>
          <h2>Loan Application Receipt</h2>
          <p><b>Reference Number:</b> ${applicationDetails.referenceNumber}</p>
          <p><b>Submitted Date:</b> ${applicationDetails.submittedDate}</p>
          <p><b>Submitted Time:</b> ${applicationDetails.submittedTime}</p>
          <p><b>Status:</b> Received, under review</p>
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            Keep this reference number to track your application.
            Questions? Call 0800 123 456 or email loans@mbudzitshena.co.za
          </p>
        </body>
      </html>
    `);
    receipt.document.close();
    receipt.print();
  };
  const nextSteps = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Application Review",
      description: "Our team will review your application and documents within 24 hours.",
      timeframe: "Within 24 hours"
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "AI Risk Assessment",
      description: "Your application will be processed through our AI credit scoring system.",
      timeframe: "Automated"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Verification Call",
      description: "A loan officer may contact you to verify details and answer questions.",
      timeframe: "1-2 business days"
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Final Decision",
      description: "You'll receive our decision via email and SMS notification.",
      timeframe: "2-3 business days"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-['Inter',sans-serif]">
      {/* Top Navigation */}
      <nav className="bg-[#005B3F] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/")}>
              <Logo textColor="text-white" />
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section with Image */}
        <div className="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden shadow-lg mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#005B3F]/90 to-[#005B3F]/70 mix-blend-multiply z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1648382317519-cdf77a7803b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwcGVyc29uJTIwY2VsZWJyYXRpbmclMjBzdWNjZXNzJTIwaGFwcHl8ZW58MXx8fHwxNzc2MjgyNDE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
            alt="Success celebration" 
            className="absolute inset-0 w-full h-full object-cover z-0 grayscale"
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 text-white">
            <div className="w-20 h-20 bg-[#B4D330] rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce-slow">
              <CheckCircle2 className="w-12 h-12 text-[#005B3F]" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-3">Application Submitted!</h1>
            <p className="text-lg md:text-xl text-white/90 font-medium max-w-2xl">
              Thank you for choosing Mbudzi Tshena Financial Solutions. Your loan application has been received successfully.
            </p>
          </div>
        </div>

        {/* Application Reference Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#005B3F] mb-2">Application Details</h2>
              <p className="text-gray-600">Please save your reference number for tracking</p>
            </div>
             <Button onClick={downloadReceipt} className="bg-[#005B3F] hover:bg-[#00432E] text-white">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 p-6 bg-gradient-to-r from-[#005B3F]/5 to-[#B4D330]/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Reference Number</p>
              <p className="text-xl font-black text-[#005B3F] font-mono">{applicationDetails.referenceNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Submitted Date</p>
              <p className="text-lg font-bold text-gray-900">{applicationDetails.submittedDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Submitted Time</p>
              <p className="text-lg font-bold text-gray-900">{applicationDetails.submittedTime}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Estimated Processing Time</h3>
                <p className="text-sm text-blue-800">
                  We aim to process your application within <strong>2-3 business days</strong>. You'll receive updates via email and SMS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What Happens Next Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What Happens Next?</h2>
          
          <div className="space-y-6">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-[#B4D330]/20 flex items-center justify-center text-[#005B3F]">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                      <Clock className="w-3 h-3 mr-1" />
                      {step.timeframe}
                    </span>
                  </div>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Email Confirmation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Email</h3>
            <p className="text-gray-600 mb-4">
              A confirmation email with your application details and reference number has been sent to your registered email address.
            </p>
            <p className="text-sm text-gray-500">
              <strong>Tip:</strong> Check your spam folder if you don't see it within a few minutes.
            </p>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Need Assistance?</h3>
            <p className="text-gray-600 mb-4">
              Our loan advisors are available to answer any questions about your application.
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:0800123456" className="flex items-center gap-2 text-[#005B3F] hover:text-[#00432E] font-medium">
                <Phone className="w-4 h-4" />
                0800 123 456
              </a>
              <a href="mailto:loans@mbudzitshena.co.za" className="flex items-center gap-2 text-[#005B3F] hover:text-[#00432E] font-medium">
                <Mail className="w-4 h-4" />
                loans@mbudzitshena.co.za
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-[#005B3F] to-[#00432E] rounded-2xl shadow-lg p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Track Your Application</h2>
              <p className="text-white/90">
                Visit your dashboard to check the status of your loan application anytime.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button 
                onClick={() => navigate("/dashboard")}
                className="bg-[#B4D330] hover:bg-[#a3c02b] text-[#005B3F] font-bold"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                onClick={() => navigate("/")}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Tips */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">💡 Helpful Tips While You Wait</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#B4D330] mt-0.5 shrink-0" />
              <span>Keep your phone available for our verification call</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#B4D330] mt-0.5 shrink-0" />
              <span>Ensure all uploaded documents are clear and readable</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#B4D330] mt-0.5 shrink-0" />
              <span>Check your email regularly for updates and requests</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#B4D330] mt-0.5 shrink-0" />
              <span>Have your reference number ready when contacting us</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; 2026 Mbudzi Tshena Financial Solutions. All rights reserved.</p>
          <p className="mt-2">Empowering communities through responsible lending.</p>
        </div>
      </footer>
    </div>
  );
}
