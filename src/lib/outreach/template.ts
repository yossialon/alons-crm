// Interpolate {{variable}} placeholders in a template body/subject.
// Supported variables: {{name}}, {{area}}, {{type}}, {{source}}, {{phone}}, {{email}}

export type TemplateVars = Record<string, string>;

export function interpolate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function leadToVars(lead: {
  name?: string; area?: string; type?: string;
  source?: string; phone?: string; email?: string;
}): TemplateVars {
  return {
    name:   lead.name   ?? '',
    area:   lead.area   ?? '',
    type:   lead.type   ?? '',
    source: lead.source ?? '',
    phone:  lead.phone  ?? '',
    email:  lead.email  ?? '',
  };
}

// List all {{variable}} tokens found in a string
export function extractVars(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}
