import workspaceTools from './workspaceTools.json' with { type: 'json' };

interface ToolSchema {
  type: string;
  enum?: unknown[];
  properties?: Record<string, ToolSchema>;
  required?: string[];
  items?: ToolSchema;
}

const schemas = new Map(workspaceTools.map(tool => [tool.name, tool.parameters as unknown as ToolSchema]));
function matches(schema: ToolSchema, value: unknown): boolean {
  if (schema.enum && !schema.enum.includes(value)) return false;
  switch (schema.type) {
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      const fields = schema.properties ?? {};
      return (schema.required ?? []).every(key => Object.hasOwn(record, key)) &&
        Object.entries(record).every(([key, item]) => Object.hasOwn(fields, key) && matches(fields[key], item));
    }
    case 'array': return Array.isArray(value) && value.length <= 250 && Boolean(schema.items) && value.every(item => matches(schema.items!, item));
    case 'integer': return Number.isSafeInteger(value);
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'string': return typeof value === 'string' && value.length <= 60_000;
    case 'boolean': return typeof value === 'boolean';
    default: return false;
  }
}

export function validToolArguments(name: string, value: unknown) {
  const schema = schemas.get(name);
  return Boolean(schema && matches(schema, value));
}
