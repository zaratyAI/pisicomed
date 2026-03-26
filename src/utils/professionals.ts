import { supabase } from "@/integrations/supabase/client";

export interface Professional {
  id: string;
  fullName: string;
  cpf?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  registrationNumber?: string;
  isActive: boolean;
}

export async function getProfessionals(activeOnly = true): Promise<Professional[]> {
  let query = supabase
    .from("professionals")
    .select("*")
    .order("full_name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name,
    cpf: p.cpf,
    email: p.email,
    phone: p.phone,
    specialty: p.specialty,
    registrationNumber: p.registration_number,
    isActive: p.is_active,
  }));
}

export async function createProfessional(
  professional: Omit<Professional, "id" | "isActive">
): Promise<string> {
  const { data, error } = await supabase
    .from("professionals")
    .insert({
      full_name: professional.fullName,
      cpf: professional.cpf || null,
      email: professional.email || null,
      phone: professional.phone || null,
      specialty: professional.specialty || null,
      registration_number: professional.registrationNumber || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateProfessional(
  professionalId: string,
  updates: Partial<Omit<Professional, "id">>
): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.specialty !== undefined) dbUpdates.specialty = updates.specialty;
  if (updates.registrationNumber !== undefined) dbUpdates.registration_number = updates.registrationNumber;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from("professionals")
    .update(dbUpdates)
    .eq("id", professionalId);

  if (error) throw error;
}
