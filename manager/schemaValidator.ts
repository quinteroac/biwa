export interface SchemaValidationIssue {
  path: string
  message: string
}

type JsonSchema = {
  type?: string
  required?: string[]
  properties?: Record<string, JsonSchema>
  additionalProperties?: boolean | JsonSchema
  pattern?: string
  enum?: unknown[]
  minimum?: number
  minLength?: number
  anyOf?: JsonSchema[]
  items?: JsonSchema
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  if (typeof value === 'function') return 'function'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function typeMatches(expected: string, value: unknown): boolean {
  const actual = valueType(value)
  if (expected === 'integer') return actual === 'integer'
  if (expected === 'number') return actual === 'number' || actual === 'integer'
  return actual === expected
}

function formatPath(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key)
}

function validateAgainstSchema(value: unknown, schema: JsonSchema, path: string): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = []

  if (schema.anyOf) {
    const alternatives = schema.anyOf.map(option => validateAgainstSchema(value, option, path))
    if (alternatives.some(result => result.length === 0)) return []
    return alternatives[0] ?? [{ path, message: 'Value does not match any allowed schema.' }]
  }

  if (schema.type && !typeMatches(schema.type, value)) {
    issues.push({ path, message: `Expected ${schema.type}, got ${valueType(value)}.` })
    return issues
  }

  if (schema.enum && !schema.enum.includes(value)) {
    issues.push({ path, message: `Expected one of: ${schema.enum.map(String).join(', ')}.` })
  }

  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      issues.push({ path, message: `String does not match pattern ${schema.pattern}.` })
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ path, message: `String must be at least ${schema.minLength} character(s).` })
    }
  }

  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    issues.push({ path, message: `Number must be >= ${schema.minimum}.` })
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      issues.push(...validateAgainstSchema(item, schema.items!, formatPath(path, index)))
    })
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>
    const properties = schema.properties ?? {}
    for (const required of schema.required ?? []) {
      if (!(required in objectValue)) {
        issues.push({ path: formatPath(path, required), message: 'Missing required property.' })
      }
    }

    for (const [key, childValue] of Object.entries(objectValue)) {
      const childSchema = properties[key]
      if (childSchema) {
        issues.push(...validateAgainstSchema(childValue, childSchema, formatPath(path, key)))
        continue
      }

      if (schema.additionalProperties === false) {
        issues.push({ path: formatPath(path, key), message: 'Unexpected property.' })
      } else if (typeof schema.additionalProperties === 'object') {
        issues.push(...validateAgainstSchema(childValue, schema.additionalProperties, formatPath(path, key)))
      }
    }
  }

  return issues
}

export function validateJsonSchema(value: unknown, schema: JsonSchema): SchemaValidationIssue[] {
  return validateAgainstSchema(value, schema, '')
}
