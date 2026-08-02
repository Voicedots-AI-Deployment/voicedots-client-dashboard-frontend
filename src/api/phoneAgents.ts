import { apiClient } from './apiClient';
export interface ClientPhoneAgent {id:string;phone_agent_id:string;client_key:string;display_name:string;mode:string;status:string;version:number;draft_config:any;published_config?:any;updated_at:string;dids:{did:string;provider?:string;channel_limit:number;status:string}[]}
export interface PromptSaveResponse {status:'draft';message:string;config:any}
export const phoneAgentsApi={
 async list(){return (await apiClient.get<ClientPhoneAgent[]>('/v3/phone-agents')).data},
 async savePrompt(id:string,first_message:string,system_prompt:string){return (await apiClient.put<PromptSaveResponse>(`/v3/phone-agents/${id}/prompt`,{first_message,system_prompt})).data},
};
