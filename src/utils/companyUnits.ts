import { supabase } from "@/integrations/supabase/client";

export interface CompanyUnit {
  id: string;
  companyId: string;
  unitName: string;
  unitCode?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isHeadquarters: boolean;
  isActive: boolean;
}

export async function getCompanyUnits(companyId: string): Promise<CompanyUnit[]> {
  const { data, error } = await supabase
    .from("company_units")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_headquarters", { ascending: false });

  if (error) throw error;

  return (data || []).map((u: any) => ({
    id: u.id,
    companyId: u.company_id,
    unitName: u.unit_name,
    unitCode: u.unit_code,
    cnpj: u.cnpj,
    address: u.address,
    city: u.city,
    state: u.state,
    zipCode: u.zip_code,
    isHeadquarters: u.is_headquarters,
    isActive: u.is_active,
  }));
}

export async function createCompanyUnit(
  companyId: string,
  unit: Omit<CompanyUnit, "id" | "companyId" | "isActive">
): Promise<string> {
  const { data, error } = await supabase
    .from("company_units")
    .insert({
      company_id: companyId,
      unit_name: unit.unitName,
      unit_code: unit.unitCode || null,
      cnpj: unit.cnpj || null,
      address: unit.address || null,
      city: unit.city || null,
      state: unit.state || null,
      zip_code: unit.zipCode || null,
      is_headquarters: unit.isHeadquarters,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateCompanyUnit(
  unitId: string,
  updates: Partial<Omit<CompanyUnit, "id" | "companyId">>
): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.unitName !== undefined) dbUpdates.unit_name = updates.unitName;
  if (updates.unitCode !== undefined) dbUpdates.unit_code = updates.unitCode;
  if (updates.cnpj !== undefined) dbUpdates.cnpj = updates.cnpj;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.city !== undefined) dbUpdates.city = updates.city;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
  if (updates.isHeadquarters !== undefined) dbUpdates.is_headquarters = updates.isHeadquarters;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from("company_units")
    .update(dbUpdates)
    .eq("id", unitId);

  if (error) throw error;
}
