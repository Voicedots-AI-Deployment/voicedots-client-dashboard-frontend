import {apiClient} from './apiClient';
export type OutboundAgent={id:string;display_name:string;mode:string;status:string;did?:string;outbound_trunk_id?:string;platform_enabled:boolean;enabled:boolean;daily_limit:number;max_duration_seconds:number};
export const outboundCallsApi={
 list:async()=>(await apiClient.get<OutboundAgent[]>('/v3/outbound-calls')).data,
 create:async(data:{phone_agent_id:string;destination:string;contact_name:string;consent_confirmed:boolean;conversation_id?:string})=>(await apiClient.post('/v3/outbound-calls',data)).data,
 status:async(id:string)=>(await apiClient.get(`/v3/outbound-calls/${id}`)).data,
};
