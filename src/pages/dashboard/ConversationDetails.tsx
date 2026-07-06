import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  User,
  Phone,
  Mail,
  Briefcase,
  AlertCircle,
  FileText,
  Clock,
  PhoneCall,
  X,
} from "lucide-react";
import conversationsApi from "@/api/conversations";
import { UI } from "@/ui/colors";
import type { GetConversationDetailsResult } from "@/types/conversation.types";
import { ConversationAudioPlayer } from "@/components/ConversationAudioPlayer";
import { useAuth } from "@/context/AuthContext";

const logoIcon = "/voicedotslogo.svg";

const formatTime = (timestamp?: number) => {
  if (!timestamp) return "";
  const date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export function ConversationDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GetConversationDetailsResult | null>(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");

  useEffect(() => {
    async function fetchConversationDetails() {
      try {
        setIsLoading(true);
        if (id) {
          const response = await conversationsApi.getConversationDetails(id, user?.agent_id);
          setData(response);
          const audioBlob = await conversationsApi.getConversationAudio(id, user?.agent_id);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchConversationDetails();
  }, [id, user?.agent_id]);


  const lead = data?.lead;
  const messages = data?.transcription;

  return (
    <div className="flex flex-col bg-white">
      {/* BACK */}
      <div className="border-b px-4 py-3 shrink-0 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* MOBILE INFO BUTTON */}
        <button
          onClick={() => setShowMobileInfo(true)}
          className="md:hidden text-sm font-medium text-blue-600"
        >
          Lead Info
        </button>
      </div>

      {/* TITLE */}
      <div className="border-b px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="pl-3" style={{ borderLeft: `4px solid ${UI.colors.primary}` }}>
          <h1 className="text-lg md:text-xl font-bold">Transcript Details</h1>
          <p className="text-xs text-gray-500 font-mono truncate">
            ID: {id}
          </p>
        </div>

        <ConversationAudioPlayer startTime={data?.start_time} endTime={data?.end_time} audioUrl={audioUrl} />
        
      </div>
      
      

      {/* BODY */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">
        {/* CHAT */}
        <div className="px-4 md:px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-center">
              <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">
                Conversation Start
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              messages?.map((msg, i) => {
                const isAgent = msg.role === "agent" || msg.role === "assistant";
                if (!msg.message) return null;

                return (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      isAgent ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    {isAgent ? (
                      <img src={logoIcon} className="w-9 h-9 rounded-full border p-1" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={16} />
                      </div>
                    )}

                    <div className={`max-w-[80%]`}>
                      <div className="text-xs text-gray-500 mb-1">
                        {isAgent ? "SRK" : lead?.name || "User"} ·{" "}
                        {formatTime(msg.timestamp)}
                      </div>

                      <div
                        className={`rounded-xl px-4 py-2 text-sm ${
                          isAgent
                            ? "bg-white border"
                            : "text-white"
                        }`}
                        style={{
                          backgroundColor: isAgent
                            ? undefined
                            : UI.colors.primary,
                        }}
                      >
                        {msg.message}

                        {msg.interrupted && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                            <AlertCircle size={12} />
                            Interrupted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:block border-l bg-gray-50 px-4 py-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
          <LeadInfo lead={lead} />
        </aside>
      </div>

      {/* MOBILE BOTTOM SHEET */}
      {showMobileInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
          <div className="absolute bottom-0 w-full bg-white rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Lead Info</h3>
              <button onClick={() => setShowMobileInfo(false)}>
                <X />
              </button>
            </div>
            <LeadInfo lead={lead} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== SHARED LEAD INFO ========== */

function LeadInfo({ lead }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg">
        <div className="flex gap-3 px-4 py-3 border-b">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="font-semibold">{lead?.name || "Unknown Lead"}</p>
            <p className="text-xs text-gray-500">Inbound Call</p>
          </div>
        </div>

        <InfoRow icon={<Phone size={14} />} label="Phone" value={lead?.mobile || lead?.phone || lead?.phone_number || "N/A"} />
        <InfoRow icon={<Mail size={14} />} label="Email" value={lead?.email || "N/A"} />
        <InfoRow icon={<Briefcase size={14} />} label="Business" value={lead?.business_description || lead?.business_desc || lead?.summary || "N/A"} />
      </div>

      <div className="bg-white border rounded-lg">
        <div className="flex gap-2 px-4 py-3 border-b">
          <FileText size={14} />
          <p className="font-semibold text-sm">Call Summary</p>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <SummaryRow icon={<Clock size={14} />} label="Duration" value="3m 49s" />
          <SummaryRow icon={<PhoneCall size={14} />} label="Outcome" value="No Response" />
          {/* <p className="text-xs text-gray-500">
            User did not respond clearly. No lead qualification captured.
          </p> */}
        </div>
      </div>
    </div>
  );
}

/* HELPERS */
function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3 px-4 py-2  min-w-0">
      <div className="text-gray-400 shrink-0">
        {icon}
      </div>

      <div className="min-w-0 w-full">
        <p className="text-xs text-gray-500">{label}</p>

        <p className="text-sm font-medium break-words overflow-hidden">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="flex gap-2 text-gray-500">
        {icon} {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
