import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  DollarSign,
  Briefcase,
  Home,
  Users,
  CreditCard,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface LoanFormData {
  fullName: string;
  idNumber: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  maritalStatus: string;
  dependents: string;

  residentialAddress: string;
  city: string;
  province: string;
  postalCode: string;
  yearsAtAddress: string;
  residentialStatus: string;

  employmentStatus: string;
  employerName: string;
  employerAddress: string;
  occupation: string;
  monthlyIncome: string;
  yearsEmployed: string;

  loanAmount: string;
  loanPurpose: string;
  loanType: string;
  repaymentTerm: string;

  bankName: string;
  accountNumber: string;
  accountType: string;

  reference1Name: string;
  reference1Phone: string;
  reference1Relationship: string;
  reference2Name: string;
  reference2Phone: string;
  reference2Relationship: string;

  monthlyExpenses: string;
  existingLoans: string;
  additionalInfo: string;
}

// --- API helpers -----------------------------------------------------------

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: any) => d.msg ?? String(d)).join(" ");
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function uploadDocument(applicationId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/documents/upload/${applicationId}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const message = await parseApiError(res, `Failed to upload ${file.name}`);
    throw new Error(message);
  }
  return res.json();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// -----------------------------------------------------------------------------

export default function LoanApplication() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = useForm<LoanFormData>();

  // Watch ID number and date of birth for relationship validation
  const watchedIdNumber = watch("idNumber");
  const watchedDob = watch("dateOfBirth");
    // Only ask for employer details if the applicant actually works
  const employmentStatus = watch("employmentStatus");
  const isSelfEmployed = employmentStatus === "self-employed";
  const showWorkDetails = ["employed", "part-time", "contract", "self-employed"].includes(employmentStatus);

  const idDobMismatch = useMemo(() => {
    if (!watchedIdNumber || watchedIdNumber.length !== 13 || !watchedDob) return false;
    const idYear  = watchedIdNumber.substring(0, 2);
    const idMonth = watchedIdNumber.substring(2, 4);
    const idDay   = watchedIdNumber.substring(4, 6);
    const dob = new Date(watchedDob);
    if (isNaN(dob.getTime())) return false;
    const dobYear  = String(dob.getFullYear()).slice(-2);
    const dobMonth = String(dob.getMonth() + 1).padStart(2, "0");
    const dobDay   = String(dob.getDate()).padStart(2, "0");
    return idYear !== dobYear || idMonth !== dobMonth || idDay !== dobDay;
  }, [watchedIdNumber, watchedDob]);

  const user = { name: "Sipho" };

  const totalSteps = 6;
  const progressPercent = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: "Personal Info", icon: <Users className="w-4 h-4" /> },
    { number: 2, title: "Address", icon: <Home className="w-4 h-4" /> },
    { number: 3, title: "Employment", icon: <Briefcase className="w-4 h-4" /> },
    { number: 4, title: "Loan Details", icon: <DollarSign className="w-4 h-4" /> },
    { number: 5, title: "Banking", icon: <CreditCard className="w-4 h-4" /> },
    { number: 6, title: "Documents", icon: <FileText className="w-4 h-4" /> },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const accepted: File[] = [];
    let rejectedCount = 0;

    Array.from(files).forEach((file) => {
      const validType = ALLOWED_FILE_TYPES.includes(file.type);
      const validSize = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
      if (validType && validSize) {
        accepted.push(file);
      } else {
        rejectedCount += 1;
      }
    });

    if (accepted.length > 0) {
      setUploadedFiles((prev) => [...prev, ...accepted]);
      toast.success(`${accepted.length} document(s) added`);
    }
    if (rejectedCount > 0) {
      toast.error(
        `${rejectedCount} file(s) skipped — only PDF, JPG, PNG, DOC, DOCX under ${MAX_FILE_SIZE_MB}MB are allowed`
      );
    }

    // allow re-selecting the same file later
    event.target.value = "";
  };

  const removeDocument = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info("Document removed");
  };

  const onSubmit = async (data: LoanFormData) => {
    // Prevent submission if ID and DOB mismatch
    if (idDobMismatch) {
      toast.error("ID number and date of birth do not match. Please verify your details on Step 1.");
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: data.fullName,
        id_number: data.idNumber,
        date_of_birth: data.dateOfBirth,
        phone_number: data.phoneNumber,
        email: data.email,
        marital_status: data.maritalStatus,
        dependents: parseInt(data.dependents, 10),

        residential_address: data.residentialAddress,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        years_at_address: parseFloat(data.yearsAtAddress),
        residential_status: data.residentialStatus,

        employment_status: data.employmentStatus,
        employer_name: showWorkDetails ? data.employerName : null,
        employer_address: showWorkDetails ? data.employerAddress : null,
        occupation: showWorkDetails ? data.occupation : null,
        monthly_income: parseFloat(data.monthlyIncome),
        years_employed: showWorkDetails ? parseFloat(data.yearsEmployed) : null,

        loan_amount: parseFloat(data.loanAmount),
        loan_purpose: data.loanPurpose,
        loan_type: data.loanType,
        repayment_term: parseInt(data.repaymentTerm, 10),

        bank_name: data.bankName,
        account_number: data.accountNumber,
        account_type: data.accountType,

        reference1_name: data.reference1Name,
        reference1_phone: data.reference1Phone,
        reference1_relationship: data.reference1Relationship,
        reference2_name: data.reference2Name,
        reference2_phone: data.reference2Phone,
        reference2_relationship: data.reference2Relationship,

        monthly_expenses: data.monthlyExpenses ? parseFloat(data.monthlyExpenses) : null,
        existing_loans: data.existingLoans || null,
        additional_info: data.additionalInfo || null,
      };

      console.log("submitting...");

      const res = await fetch(`${API_URL}/api/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const message = await parseApiError(res, "Failed to submit application.");
        toast.error(message);
        return;
      }

      const application = await res.json();

      if (uploadedFiles.length > 0) {
        const results = await Promise.allSettled(
          uploadedFiles.map((file) => uploadDocument(application.id, file))
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            `${failed} document(s) failed to upload. You can re-upload them from your dashboard.`
          );
        }
      }

      toast.success(
        "Your loan application has been submitted successfully! We'll review it within 24 hours."
      );
      navigate("/confirm", { state: { referenceNumber: application.reference_number } });
    } catch (err) {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
    // Fields that must be valid before leaving each step
  const stepFields: Record<number, (keyof LoanFormData)[]> = {
    1: ["fullName", "idNumber", "dateOfBirth", "phoneNumber", "email", "maritalStatus", "dependents"],
    2: ["residentialAddress", "city", "province", "postalCode", "yearsAtAddress", "residentialStatus"],
    3: showWorkDetails
      ? ["employmentStatus", "employerName", "occupation", "employerAddress", "monthlyIncome", "yearsEmployed", "monthlyExpenses"]
      : ["employmentStatus", "monthlyIncome", "monthlyExpenses"],
    4: ["loanAmount", "repaymentTerm", "loanType", "loanPurpose", "existingLoans"],
    5: ["bankName", "accountType", "accountNumber", "reference1Name", "reference1Phone", "reference1Relationship", "reference2Name", "reference2Phone", "reference2Relationship"],
  };
   const nextStep = async () => {
    const isValid = await trigger(stepFields[currentStep]);
    if (!isValid) return; // stay on this step; the red error messages will show
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-['Inter',sans-serif]">
      {/* Top Navigation */}
      <nav className="bg-[#005B3F] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate("/")}
            >
              <Logo textColor="text-white" />
            </div>
            <div className="flex items-center gap-6">
              <button className="text-white/80 hover:text-white transition-colors relative">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
                <span className="font-medium hidden sm:block">{user.name}</span>
                <button
                  onClick={() => navigate("/login")}
                  className="ml-2 text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-[#005B3F] hover:text-[#00432E] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <h1 className="text-3xl font-black text-[#005B3F] mb-2">Loan Application</h1>
          <p className="text-gray-600 mb-6">
            Complete the form below to apply for a loan. All fields marked with * are required.
          </p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-bold text-[#005B3F]">
                {Math.round(progressPercent)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#005B3F] to-[#B4D330] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                  currentStep === step.number
                    ? "bg-[#005B3F] text-white"
                    : currentStep > step.number
                    ? "bg-[#B4D330]/20 text-[#005B3F]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <div className="flex items-center justify-center">
                  {currentStep > step.number ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs font-bold text-center hidden sm:block">
                  {step.title}
                </span>
                <span className="text-xs font-bold text-center sm:hidden">{step.number}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                    <p className="text-sm text-gray-500">Tell us about yourself</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-700 font-bold mb-2">
                      Full Legal Name *
                    </Label>
                    <Input
                      id="fullName"
                      {...register("fullName", { required: "Full name is required" })}
                      placeholder="e.g., Sipho Mthembu"
                      className="mt-1"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="idNumber" className="text-gray-700 font-bold mb-2">
                      ID Number *
                    </Label>
                    <Input
                      id="idNumber"
                      {...register("idNumber", {
                        required: "ID number is required",
                        pattern: {
                          value: /^\d{13}$/,
                          message: "ID number must be 13 digits",
                        },
                      })}
                      placeholder="e.g., 9001010000000"
                      maxLength={13}
                      className="mt-1"
                    />
                    {errors.idNumber && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.idNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth" className="text-gray-700 font-bold mb-2">
                      Date of Birth *
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth", { required: "Date of birth is required" })}
                      className="mt-1"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.dateOfBirth.message}
                      </p>
                    )}
                    {idDobMismatch && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Date of birth does not match the ID number provided. Please verify both fields.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-gray-700 font-bold mb-2">
                      Phone Number *
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      {...register("phoneNumber", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^0\d{9}$/,
                          message: "Phone number must start with 0 and be 10 digits",
                        },
                      })}
                      placeholder="e.g., 0821234567"
                      maxLength={10}
                      className="mt-1"
                    />
                    {errors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.phoneNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-bold mb-2">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                      placeholder="e.g., sipho@email.com"
                      className="mt-1"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="maritalStatus" className="text-gray-700 font-bold mb-2">
                      Marital Status *
                    </Label>
                    <select
                      id="maritalStatus"
                      {...register("maritalStatus", { required: "Marital status is required" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                    >
                      <option value="">Select status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                    {errors.maritalStatus && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.maritalStatus.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dependents" className="text-gray-700 font-bold mb-2">
                      Number of Dependents *
                    </Label>
                    <Input
                      id="dependents"
                      type="number"
                      min="0"
                      {...register("dependents", { required: "Number of dependents is required" })}
                      placeholder="e.g., 2"
                      className="mt-1"
                    />
                    {errors.dependents && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.dependents.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Address Information</h2>
                    <p className="text-sm text-gray-500">Where do you currently reside?</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="residentialAddress" className="text-gray-700 font-bold mb-2">
                      Residential Address *
                    </Label>
                    <Input
                      id="residentialAddress"
                      {...register("residentialAddress", {
                        required: "Residential address is required",
                      })}
                      placeholder="e.g., 123 Main Street, Suburb"
                      className="mt-1"
                    />
                    {errors.residentialAddress && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.residentialAddress.message}
                      </p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="city" className="text-gray-700 font-bold mb-2">
                        City *
                      </Label>
                      <Input
                        id="city"
                        {...register("city", { required: "City is required" })}
                        placeholder="e.g., Johannesburg"
                        className="mt-1"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.city.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="province" className="text-gray-700 font-bold mb-2">
                        Province *
                      </Label>
                      <select
                        id="province"
                        {...register("province", { required: "Province is required" })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      >
                        <option value="">Select province</option>
                        <option value="gauteng">Gauteng</option>
                        <option value="western-cape">Western Cape</option>
                        <option value="kwazulu-natal">KwaZulu-Natal</option>
                        <option value="eastern-cape">Eastern Cape</option>
                        <option value="limpopo">Limpopo</option>
                        <option value="mpumalanga">Mpumalanga</option>
                        <option value="north-west">North West</option>
                        <option value="northern-cape">Northern Cape</option>
                        <option value="free-state">Free State</option>
                      </select>
                      {errors.province && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.province.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="postalCode" className="text-gray-700 font-bold mb-2">
                        Postal Code *
                      </Label>
                      <Input
                        id="postalCode"
                        {...register("postalCode", { required: "Postal code is required" })}
                        placeholder="e.g., 2000"
                        maxLength={4}
                        className="mt-1"
                      />
                      {errors.postalCode && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.postalCode.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="yearsAtAddress" className="text-gray-700 font-bold mb-2">
                        Years at Current Address *
                      </Label>
                      <Input
                        id="yearsAtAddress"
                        type="number"
                        min="0"
                        step="0.5"
                        {...register("yearsAtAddress", {
                          required: "Years at address is required",
                        })}
                        placeholder="e.g., 3"
                        className="mt-1"
                      />
                      {errors.yearsAtAddress && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.yearsAtAddress.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="residentialStatus" className="text-gray-700 font-bold mb-2">
                        Residential Status *
                      </Label>
                      <select
                        id="residentialStatus"
                        {...register("residentialStatus", {
                          required: "Residential status is required",
                        })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      >
                        <option value="">Select status</option>
                        <option value="owner">Home Owner</option>
                        <option value="renting">Renting</option>
                        <option value="family">Living with Family</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.residentialStatus && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.residentialStatus.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Employment Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Employment Information</h2>
                    <p className="text-sm text-gray-500">Tell us about your employment</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="employmentStatus" className="text-gray-700 font-bold mb-2">
                      Employment Status *
                    </Label>
                    <select
                      id="employmentStatus"
                      {...register("employmentStatus", {
                        required: "Employment status is required",
                      })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                    >
                      <option value="">Select status</option>
                      <option value="employed">Employed (Full-time)</option>
                      <option value="part-time">Employed (Part-time)</option>
                      <option value="self-employed">Self-Employed</option>
                      <option value="contract">Contract Worker</option>
                      <option value="unemployed">Unemployed</option>
                      <option value="retired">Retired</option>
                    </select>
                    {errors.employmentStatus && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.employmentStatus.message}
                      </p>
                    )}
                  </div>
{showWorkDetails && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="employerName" className="text-gray-700 font-bold mb-2">
                        {isSelfEmployed ? "Business Name *" : "Employer Name *"}
                      </Label>
                      <Input
                        id="employerName"
                        {...register("employerName", { required: "Employer name is required" })}
                        placeholder="e.g., ABC Company (Pty) Ltd"
                        className="mt-1"
                      />
                      {errors.employerName && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.employerName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="occupation" className="text-gray-700 font-bold mb-2">
                        Occupation / Job Title *
                      </Label>
                      <Input
                        id="occupation"
                        {...register("occupation", { required: "Occupation is required" })}
                        placeholder="e.g., Sales Manager"
                        className="mt-1"
                      />
                      {errors.occupation && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.occupation.message}
                        </p>
                      )}
                    </div>
                  </div>
                  )}
{showWorkDetails && (
                  <div>
                      <Label htmlFor="employerAddress" className="text-gray-700 font-bold mb-2">
                      {isSelfEmployed ? "Business Address *" : "Employer Address *"}
                    </Label>
                    <Input
                      id="employerAddress"
                      {...register("employerAddress", {
                        required: "Employer address is required",
                      })}
                      placeholder="e.g., 456 Business Park, Sandton"
                      className="mt-1"
                    />
                    {errors.employerAddress && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.employerAddress.message}
                      </p>
                    )}
                  </div>
)}

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="monthlyIncome" className="text-gray-700 font-bold mb-2">
                        Monthly Gross Income (R) *
                      </Label>
                      <Input
                        id="monthlyIncome"
                        type="number"
                        min="0"
                        {...register("monthlyIncome", { required: "Monthly income is required" })}
                        placeholder="e.g., 25000"
                        className="mt-1"
                      />
                      {errors.monthlyIncome && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.monthlyIncome.message}
                        </p>
                      )}
                    </div>
{showWorkDetails && (
                    <div>
                      <Label htmlFor="yearsEmployed" className="text-gray-700 font-bold mb-2">
                        Years with Current Employer *
                      </Label>
                      <Input
                        id="yearsEmployed"
                        type="number"
                        min="0"
                        step="0.5"
                        {...register("yearsEmployed", { required: "Years employed is required" })}
                        placeholder="e.g., 2.5"
                        className="mt-1"
                      />
                      {errors.yearsEmployed && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.yearsEmployed.message}
                        </p>
                      )}
                    </div>
)} 
                 </div>

                  <div>
                    <Label htmlFor="monthlyExpenses" className="text-gray-700 font-bold mb-2">
                      Total Monthly Expenses (R) *
                    </Label>
                    <Input
                      id="monthlyExpenses"
                      type="number"
                      min="0"
                      {...register("monthlyExpenses", {
                        required: "Monthly expenses is required",
                      })}
                      placeholder="e.g., 15000"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include rent, utilities, groceries, transport, etc.
                    </p>
                    {errors.monthlyExpenses && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.monthlyExpenses.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Loan Details */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Loan Details</h2>
                    <p className="text-sm text-gray-500">Specify your loan requirements</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="loanAmount" className="text-gray-700 font-bold mb-2">
                        Loan Amount Requested (R) *
                      </Label>
                      <Input
                        id="loanAmount"
                        type="number"
                        min="1000"
                        max="500000"
                        {...register("loanAmount", {
                          required: "Loan amount is required",
                          min: { value: 1000, message: "Minimum loan amount is R 1,000" },
                          max: { value: 500000, message: "Maximum loan amount is R 500,000" },
                        })}
                        placeholder="e.g., 50000"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Min: R 1,000 | Max: R 500,000</p>
                      {errors.loanAmount && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.loanAmount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="repaymentTerm" className="text-gray-700 font-bold mb-2">
                        Repayment Term *
                      </Label>
                      <select
                        id="repaymentTerm"
                        {...register("repaymentTerm", { required: "Repayment term is required" })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      >
                        <option value="">Select term</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                        <option value="36">36 Months</option>
                        <option value="48">48 Months</option>
                        <option value="60">60 Months</option>
                      </select>
                      {errors.repaymentTerm && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.repaymentTerm.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="loanType" className="text-gray-700 font-bold mb-2">
                      Loan Type *
                    </Label>
                    <select
                      id="loanType"
                      {...register("loanType", { required: "Loan type is required" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                    >
                      <option value="">Select loan type</option>
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="home-improvement">Home Improvement</option>
                      <option value="debt-consolidation">Debt Consolidation</option>
                      <option value="emergency">Emergency Loan</option>
                    </select>
                    {errors.loanType && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.loanType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="loanPurpose" className="text-gray-700 font-bold mb-2">
                      Loan Purpose / Description *
                    </Label>
                    <Textarea
                      id="loanPurpose"
                      {...register("loanPurpose", { required: "Loan purpose is required" })}
                      placeholder="Please describe in detail how you plan to use the loan funds..."
                      rows={4}
                      className="mt-1"
                    />
                    {errors.loanPurpose && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.loanPurpose.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="existingLoans" className="text-gray-700 font-bold mb-2">
                      Existing Loans / Debts
                    </Label>
                    <Textarea
                      id="existingLoans"
                      {...register("existingLoans")}
                      placeholder="Please list any existing loans, credit cards, or debts with approximate balances (optional)"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Banking & References */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Banking & References</h2>
                    <p className="text-sm text-gray-500">Your banking details and references</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-6">
                  <h3 className="font-bold text-lg text-gray-900">Banking Information</h3>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="bankName" className="text-gray-700 font-bold mb-2">
                        Bank Name *
                      </Label>
                      <select
                        id="bankName"
                        {...register("bankName", { required: "Bank name is required" })}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      >
                        <option value="">Select bank</option>
                        <option value="nedbank">Nedbank</option>
                        <option value="absa">ABSA</option>
                        <option value="fnb">FNB</option>
                        <option value="standard-bank">Standard Bank</option>
                        <option value="capitec">Capitec</option>
                        <option value="african-bank">African Bank</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.bankName && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.bankName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="accountType" className="text-gray-700 font-bold mb-2">
                        Account Type *
                      </Label>
                      <select
                        id="accountType"
                        {...register("accountType", { required: "Account type is required" })}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      >
                        <option value="">Select type</option>
                        <option value="cheque">Cheque Account</option>
                        <option value="savings">Savings Account</option>
                        <option value="transmission">Transmission Account</option>
                      </select>
                      {errors.accountType && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.accountType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accountNumber" className="text-gray-700 font-bold mb-2">
                      Account Number *
                    </Label>
                    <Input
                      id="accountNumber"
                      {...register("accountNumber", { required: "Account number is required" })}
                      placeholder="e.g., 1234567890"
                      className="mt-1"
                    />
                    {errors.accountNumber && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.accountNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Personal References</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Provide 2 references (not family members)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-md text-gray-700">Reference 1</h4>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="reference1Name" className="text-gray-700 font-bold mb-2">
                          Full Name *
                        </Label>
                        <Input
                          id="reference1Name"
                          {...register("reference1Name", {
                            required: "Reference name is required",
                          })}
                          placeholder="e.g., Donald Green"
                          className="mt-1"
                        />
                        {errors.reference1Name && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference1Name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="reference1Phone" className="text-gray-700 font-bold mb-2">
                          Phone Number *
                        </Label>
                        <Input
                          id="reference1Phone"
                          type="tel"
                          {...register("reference1Phone", {
                            required: "Reference phone is required",
                          })}
                          placeholder="e.g., 0821234567"
                          maxLength={10}
                          className="mt-1"
                        />
                        {errors.reference1Phone && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference1Phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="reference1Relationship"
                          className="text-gray-700 font-bold mb-2"
                        >
                          Relationship *
                        </Label>
                        <Input
                          id="reference1Relationship"
                          {...register("reference1Relationship", {
                            required: "Relationship is required",
                          })}
                          placeholder="e.g., Colleague"
                          className="mt-1"
                        />
                        {errors.reference1Relationship && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference1Relationship.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-md text-gray-700">Reference 2</h4>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="reference2Name" className="text-gray-700 font-bold mb-2">
                          Full Name *
                        </Label>
                        <Input
                          id="reference2Name"
                          {...register("reference2Name", {
                            required: "Reference name is required",
                          })}
                          placeholder="e.g., Victoria Grey"
                          className="mt-1"
                        />
                        {errors.reference2Name && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference2Name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="reference2Phone" className="text-gray-700 font-bold mb-2">
                          Phone Number *
                        </Label>
                        <Input
                          id="reference2Phone"
                          type="tel"
                          {...register("reference2Phone", {
                            required: "Reference phone is required",
                          })}
                          placeholder="e.g., 0831234567"
                          maxLength={10}
                          className="mt-1"
                        />
                        {errors.reference2Phone && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference2Phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="reference2Relationship"
                          className="text-gray-700 font-bold mb-2"
                        >
                          Relationship *
                        </Label>
                        <Input
                          id="reference2Relationship"
                          {...register("reference2Relationship", {
                            required: "Relationship is required",
                          })}
                          placeholder="e.g., Friend"
                          className="mt-1"
                        />
                        {errors.reference2Relationship && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference2Relationship.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="additionalInfo" className="text-gray-700 font-bold mb-2">
                    Additional Information
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    {...register("additionalInfo")}
                    placeholder="Any additional information you'd like to share (optional)"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Document Upload */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#005B3F] flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Supporting Documents</h2>
                    <p className="text-sm text-gray-500">Upload required documents</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2">Required Documents</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Certified copy of South African ID</li>
                        <li>• 3 Months recent bank statements</li>
                        <li>• Latest payslip or proof of income</li>
                        <li>• Proof of residence (utility bill not older than 3 months)</li>
                        <li>• For self-employed: 6 months bank statements + company registration</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#005B3F] transition-colors">
                  <div className="w-16 h-16 bg-[#F4F6F8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#005B3F]" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Upload Documents</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      type="button"
                      className="bg-[#005B3F] hover:bg-[#00432E] text-white cursor-pointer"
                      asChild
                    >
                      <span>Select Files</span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-400 mt-3">
                    Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max {MAX_FILE_SIZE_MB}MB per file)
                  </p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900">
                      Selected Documents ({uploadedFiles.length})
                    </h3>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#B4D330]/20 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#005B3F]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} · will upload on submit
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              variant="outline"
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-3 order-1 sm:order-2">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-[#005B3F] hover:bg-[#00432E] text-white px-8"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#B4D330] hover:bg-[#a3c02b] text-[#005B3F] font-bold px-8 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you have any questions or need assistance with your application, our team is here
            to help.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="tel:0800123456"
              className="text-[#005B3F] hover:text-[#00432E] font-medium flex items-center gap-2"
            >
              📞 0800 123 456
            </a>
            <a  href="mailto:loans@mbudzitshena.co.za"
              className="text-[#005B3F] hover:text-[#00432E] font-medium flex items-center gap-2"
            >
              ✉️ loans@mbudzitshena.co.za
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}