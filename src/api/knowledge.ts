import { apiClient } from "./apiClient";

/**
 * Knowledge base API.
 *
 * Documents are the files the assistant reads, stored and returned whole. The
 * backend resolves which knowledge base belongs to the caller from their token,
 * so nothing here identifies a client.
 */

export interface KnowledgeDocument {
  filename: string;
  characters: number;
  updated_at: string | null;
}

export interface KnowledgeDocumentContent extends KnowledgeDocument {
  content: string;
}

export interface DocumentVersion {
  id: string;
  saved_at: string;
  characters: number;
}

export const knowledgeAPI = {
  listDocuments: async (): Promise<{
    domain: string;
    documents: KnowledgeDocument[];
    total_characters: number;
  }> => {
    const res = await apiClient.get("/v3/knowledge/documents");
    return res.data;
  },

  getDocument: async (filename: string): Promise<KnowledgeDocumentContent> => {
    const res = await apiClient.get(
      `/v3/knowledge/documents/${encodeURIComponent(filename)}`
    );
    return res.data;
  },

  saveDocument: async (filename: string, content: string) => {
    const res = await apiClient.post(
      `/v3/knowledge/documents/${encodeURIComponent(filename)}`,
      { content }
    );
    return res.data as { status: string; characters: number; note?: string };
  },

  listVersions: async (filename: string): Promise<DocumentVersion[]> => {
    const res = await apiClient.get(
      `/v3/knowledge/documents/${encodeURIComponent(filename)}/versions`
    );
    return res.data?.versions ?? [];
  },

  restoreVersion: async (filename: string, versionId: string) => {
    const res = await apiClient.post(
      `/v3/knowledge/documents/${encodeURIComponent(filename)}/restore/${versionId}`
    );
    return res.data;
  },
};

export default knowledgeAPI;
