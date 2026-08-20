import { describe, it, expect } from 'vitest'
import { convertCase } from './textCase'

/**
 * The converters split on [\s\-_]+ alone, so a camelCase or PascalCase input
 * was a single indivisible word: convertCase('helloWorldFoo', 'snake') gave
 * 'helloworldfoo'. Converting camelCase to snake_case is the main reason a
 * case converter exists, and it was the one input shape that did not work.
 */
describe('convertCase — splits on case boundaries', () => {
  it.each([
    ['snake', 'hello_world_foo'],
    ['kebab', 'hello-world-foo'],
    ['constant', 'HELLO_WORLD_FOO'],
    ['title', 'Hello World Foo'],
  ] as const)('camelCase input -> %s', (type, expected) => {
    expect(convertCase('helloWorldFoo', type)).toBe(expected)
  })

  it('splits PascalCase too', () => {
    expect(convertCase('HelloWorldFoo', 'snake')).toBe('hello_world_foo')
  })

  it('keeps acronyms together', () => {
    expect(convertCase('parseXMLHttpRequest', 'snake')).toBe('parse_xml_http_request')
    expect(convertCase('parseXMLHttpRequest', 'kebab')).toBe('parse-xml-http-request')
  })

  it('splits on digit-to-letter boundaries', () => {
    expect(convertCase('value2Name', 'snake')).toBe('value2_name')
  })
})

describe('convertCase — space-separated input still works', () => {
  it.each([
    ['camel', 'helloWorldFoo'],
    ['pascal', 'HelloWorldFoo'],
    ['snake', 'hello_world_foo'],
    ['kebab', 'hello-world-foo'],
    ['constant', 'HELLO_WORLD_FOO'],
    ['title', 'Hello World Foo'],
    ['lowercase', 'hello world foo'],
    ['uppercase', 'HELLO WORLD FOO'],
    ['sentence', 'Hello world foo'],
  ] as const)('%s', (type, expected) => {
    expect(convertCase('hello world foo', type)).toBe(expected)
  })
})

describe('convertCase — mixed and edge input', () => {
  it('normalises already-delimited input', () => {
    expect(convertCase('hello-world_foo bar', 'snake')).toBe('hello_world_foo_bar')
  })
  it('round trips camel -> snake -> camel', () => {
    const snake = convertCase('someLongName', 'snake')
    expect(snake).toBe('some_long_name')
    expect(convertCase(snake, 'camel')).toBe('someLongName')
  })
  it('returns empty for empty input', () => {
    expect(convertCase('', 'snake')).toBe('')
    expect(convertCase('   ', 'snake')).toBe('')
  })
})
