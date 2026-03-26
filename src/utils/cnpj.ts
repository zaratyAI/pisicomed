export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function cleanCNPJ(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (length: number) => {
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(digits.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  if (calc(12) !== parseInt(digits.charAt(12))) return false;
  if (calc(13) !== parseInt(digits.charAt(13))) return false;
  return true;
}

export interface CompanyData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
}

export async function lookupCNPJ(cnpj: string): Promise<CompanyData> {
  const clean = cleanCNPJ(cnpj);
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
  if (!res.ok) throw new Error("Falha ao consultar CNPJ");
  const data = await res.json();
  
  const parts = [data.logradouro, data.numero, data.complemento, data.bairro].filter(Boolean);

  return {
    cnpj: formatCNPJ(clean),
    legalName: data.razao_social || "",
    tradeName: data.nome_fantasia || "",
    address: parts.join(", "),
    city: data.municipio || "",
    state: data.uf || "",
    zipCode: data.cep || "",
    status: data.situacao_cadastral ? String(data.situacao_cadastral) : data.descricao_situacao_cadastral || "",
  };
}
