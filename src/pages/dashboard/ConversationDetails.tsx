import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import {outboundCallsApi,type OutboundAgent} from "@/api/outboundCalls";

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
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GetConversationDetailsResult | null>(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [outboundAgents,setOutboundAgents]=useState<OutboundAgent[]>([]);
  const [showCall,setShowCall]=useState(false);
  const [callNumber,setCallNumber]=useState("");
  const [consent,setConsent]=useState(false);
  const [callStatus,setCallStatus]=useState("");
  const [calling,setCalling]=useState(false);

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
    outboundCallsApi.list().then(setOutboundAgents).catch(()=>setOutboundAgents([]));
  }, [id, user?.agent_id]);


  const lead = data?.lead;
  const messages = data?.transcription;
  const outboundAgent=outboundAgents[0];
  const outboundReady=!!outboundAgent&&outboundAgent.platform_enabled&&outboundAgent.enabled&&outboundAgent.status==='active'&&!!outboundAgent.outbound_trunk_id;
  const leadPhone = lead?.mobile || lead?.phone || lead?.phone_number || "";
  const hasPhone = !!leadPhone;
  // Website conversations have no phone call to follow up on — hide the
  // call button and the phone-lead sidebar. Falls back to showing when the
  // source is unknown (e.g. direct URL) to stay backward compatible.
  const stateSource = (location.state as { source?: string | null } | null)?.source;
  const dataSource = (data as { source?: string | null } | null)?.source;
  const source = stateSource || dataSource;
  const isWebsite = source !== undefined && source !== null && source !== "phone_call" && source !== "phone";
  const showLeadInfo = hasPhone && !isWebsite;
  const openCall=()=>{setCallNumber(leadPhone);setCallStatus('');setConsent(false);setShowCall(true)};
  const placeCall=async()=>{if(!id||!outboundAgent)return;setCalling(true);setCallStatus('');try{const result=await outboundCallsApi.create({phone_agent_id:outboundAgent.id,destination:callNumber,contact_name:lead?.name||'DSCET enquiry',consent_confirmed:consent,conversation_id:id});setCallStatus(`Call queued successfully (${result.id}).`)}catch(e:any){const d=e.response?.data?.detail;setCallStatus(typeof d==='string'?d:d?.reasons?.join(' · ')||d?.message||'Unable to place the call.')}finally{setCalling(false)}};

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900">
      {/* BACK */}
      <div className="border-b px-4 py-3 shrink-0 flex justify-between items-center dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* MOBILE INFO BUTTON */}
        {showLeadInfo && (
          <button
            onClick={() => setShowMobileInfo(true)}
            className="md:hidden text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            Lead Info
          </button>
        )}
      </div>

      {/* TITLE */}
      <div className="border-b px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3 dark:border-slate-800">
        <div className="pl-3" style={{ borderLeft: `4px solid ${UI.colors.primary}` }}>
          <h1 className="text-lg md:text-xl font-bold dark:text-slate-100">Transcript Details</h1>
        </div>

        <ConversationAudioPlayer startTime={data?.start_time} endTime={data?.end_time} audioUrl={audioUrl} />
        {showLeadInfo && (
          <button onClick={openCall} disabled={!outboundReady} className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-violet-600 px-6 md:px-8 py-3 md:py-3.5 text-base font-bold text-white shadow-lg shadow-violet-100 transition-all hover:bg-violet-700 hover:shadow-violet-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40" title={outboundReady?'Call this lead using this conversation as context':'Outbound follow-up is not enabled'}><PhoneCall size={20}/>Call this lead</button>
        )}
      </div>
      
      

      {/* BODY */}
      <div className={`grid grid-cols-1 ${showLeadInfo ? "md:grid-cols-[1fr_260px]" : ""}`}>
        {/* CHAT */}
        <div className="px-4 md:px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-center">
              <span className="px-3 py-1 bg-gray-100 text-xs rounded-full dark:bg-slate-800 dark:text-slate-300">
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
                      <img src={logoIcon} className="w-9 h-9 rounded-full border p-1 dark:border-slate-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center">
                        <User size={16} />
                      </div>
                    )}

                    <div className={`max-w-[80%]`}>
                      <div className="text-xs text-gray-500 mb-1 dark:text-slate-400">
                        {isAgent ? "SRK" : lead?.name || "User"} ·{" "}
                        {formatTime(msg.timestamp)}
                      </div>

                      <div
                        className={`rounded-xl px-4 py-2 text-sm ${
                          isAgent
                            ? "bg-white border dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
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
        {showLeadInfo && (
          <aside className="hidden md:block border-l bg-gray-50 px-4 py-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar dark:bg-slate-900 dark:border-slate-800">
            <LeadInfo lead={lead} duration={data?.duration} sentiment={data?.sentiment_analysis} />
          </aside>
        )}
      </div>

      {/* MOBILE BOTTOM SHEET */}
      {showMobileInfo && showLeadInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
          <div className="absolute bottom-0 w-full bg-white rounded-t-xl p-4 max-h-[80vh] overflow-y-auto dark:bg-slate-900">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold dark:text-slate-100">Lead Info</h3>
              <button onClick={() => setShowMobileInfo(false)}>
                <X />
              </button>
            </div>
            <LeadInfo lead={lead} duration={data?.duration} sentiment={data?.sentiment_analysis} />
          </div>
        </div>
      )}
      {showCall&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold dark:text-slate-100">Outbound follow-up</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The dedicated follow-up agent will receive a secure summary and recent turns from this conversation.</p></div><button onClick={()=>setShowCall(false)}><X/></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium dark:text-slate-200">Contact<input value={lead?.name||'DSCET enquiry'} readOnly className="mt-1 w-full rounded-lg border bg-slate-50 p-3 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"/></label><label className="block text-sm font-medium dark:text-slate-200">Phone number<input value={callNumber} onChange={e=>setCallNumber(e.target.value)} placeholder="+919876543210" className="mt-1 w-full rounded-lg border bg-transparent p-3 dark:border-slate-700 dark:text-slate-100"/><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Review the number and include its country code.</span></label><div className="rounded-lg border bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-950/30 dark:text-violet-200"><strong>Context included:</strong> lead name and summary plus up to the latest 20 transcript turns. Audio and unrelated conversations are never sent.</div><label className="flex items-start gap-3 rounded-lg border p-3 text-sm dark:border-slate-700 dark:text-slate-200"><input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I confirm this person consented to this follow-up call.</span></label>{callStatus&&<p className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800 dark:text-slate-200">{callStatus}</p>}<button onClick={placeCall} disabled={calling||!consent||!callNumber} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 p-3 font-semibold text-white disabled:opacity-40">{calling?<Loader2 className="animate-spin" size={18}/>:<PhoneCall size={18}/>}Place follow-up call</button></div></div></div>}
    </div>
  );
}

/* ========== SHARED LEAD INFO ========== */

function LeadInfo({ lead, duration, sentiment }: any) {
  const durationText = typeof duration === "number"
    ? `${Math.floor(duration / 60)}m ${duration % 60}s`
    : "N/A";
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        <div className="flex gap-3 px-4 py-3 border-b dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="font-semibold dark:text-slate-100">{lead?.name || "Unknown Lead"}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{lead?.direction === "outbound" ? "Outbound Call" : "Inbound Call"}</p>
          </div>
        </div>

        <InfoRow icon={<Phone size={14} />} label="Phone" value={lead?.mobile || lead?.phone || lead?.phone_number || "N/A"} />
        <InfoRow icon={<Mail size={14} />} label="Email" value={lead?.email || "N/A"} />
        <InfoRow icon={<Briefcase size={14} />} label="Business" value={lead?.business_description || lead?.business_desc || lead?.summary || "N/A"} />
      </div>

      <div className="bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        <div className="flex gap-2 px-4 py-3 border-b dark:border-slate-800">
          <FileText size={14} className="text-slate-400" />
          <p className="font-semibold text-sm dark:text-slate-100">Call Summary</p>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <SummaryRow icon={<Clock size={14} />} label="Duration" value={durationText} />
          <SummaryRow icon={<PhoneCall size={14} />} label="Outcome" value={lead?.status || "Unqualified"} />
        </div>
      </div>

      <div className="bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        <div className="flex gap-2 px-4 py-3 border-b dark:border-slate-800">
          <FileText size={14} className="text-slate-400" />
          <p className="font-semibold text-sm dark:text-slate-100">Sentiment Analysis</p>
        </div>
        {sentiment ? (
          <div className="px-4 py-3 space-y-2 text-sm">
            <SummaryRow label="Overall" value={sentiment.overall_sentiment || "N/A"} />
            <SummaryRow label="Interest" value={sentiment.interest_level || "N/A"} />
            <SummaryRow label="Intent" value={sentiment.intent || "N/A"} />
            {sentiment.summary && <p className="pt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{sentiment.summary}</p>}
            {sentiment.recommended_action && <p className="border-t pt-2 text-xs leading-5 dark:border-slate-800 dark:text-slate-300"><strong>Next:</strong> {sentiment.recommended_action}</p>}
          </div>
        ) : (
          <p className="px-4 py-3 text-xs text-slate-500">Analysis is unavailable for this conversation.</p>
        )}
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
        <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>

        <p className="text-sm font-medium break-words overflow-hidden dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="flex gap-2 text-gray-500 dark:text-slate-400">
        {icon} {label}
      </span>
      <span className="font-medium dark:text-slate-200">{value}</span>
    </div>
  );
}
