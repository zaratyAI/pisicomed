import { supabase } from "@/integrations/supabase/client";

export interface Document {
  id: string;
  evaluationId: string;
  uploadedBy?: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSizeBytes?: number;
  category: string;
  description?: string;
  createdAt: string;
}

export async function getDocuments(evaluationId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((d: any) => ({
    id: d.id,
    evaluationId: d.evaluation_id,
    uploadedBy: d.uploaded_by,
    fileName: d.file_name,
    filePath: d.file_path,
    fileType: d.file_type,
    fileSizeBytes: d.file_size_bytes,
    category: d.category,
    description: d.description,
    createdAt: d.created_at,
  }));
}

export async function createDocumentRecord(
  evaluationId: string,
  doc: Omit<Document, "id" | "evaluationId" | "createdAt">
): Promise<string> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      evaluation_id: evaluationId,
      uploaded_by: doc.uploadedBy || null,
      file_name: doc.fileName,
      file_path: doc.filePath,
      file_type: doc.fileType || null,
      file_size_bytes: doc.fileSizeBytes || null,
      category: doc.category,
      description: doc.description || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) throw error;
}
