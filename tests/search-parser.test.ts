import { describe, it, expect } from 'vitest'
import { parseSearchQuery, filterCommandsBySearch } from '../src/utils/searchParser'

// ── parseSearchQuery ────────────────────────────────────────────

describe('parseSearchQuery', () => {
    it('returns empty filters for empty input', () => {
        const result = parseSearchQuery('')
        expect(result.filters).toHaveLength(0)
        expect(result.hasFilters).toBe(false)
    })

    it('returns empty filters for whitespace', () => {
        const result = parseSearchQuery('   ')
        expect(result.filters).toHaveLength(0)
        expect(result.hasFilters).toBe(false)
    })

    it('parses unprefixed text as "all" filter', () => {
        const result = parseSearchQuery('docker logs')
        expect(result.filters).toEqual([
            { type: 'all', value: 'docker logs' }
        ])
    })

    it('parses tag: prefix', () => {
        const result = parseSearchQuery('tag:kubernetes')
        expect(result.filters).toEqual([
            { type: 'tag', value: 'kubernetes' }
        ])
    })

    it('parses title: prefix', () => {
        const result = parseSearchQuery('title:curl')
        expect(result.filters).toEqual([
            { type: 'title', value: 'curl' }
        ])
    })

    it('parses body: prefix', () => {
        const result = parseSearchQuery('body:grep')
        expect(result.filters).toEqual([
            { type: 'body', value: 'grep' }
        ])
    })

    it('parses pipe-separated multiple filters', () => {
        const result = parseSearchQuery('tag:docker | title:logs')
        expect(result.filters).toEqual([
            { type: 'tag', value: 'docker' },
            { type: 'title', value: 'logs' },
        ])
    })

    it('ignores empty filter values', () => {
        const result = parseSearchQuery('tag:')
        expect(result.filters).toHaveLength(0)
    })

    it('ignores empty pipe segments', () => {
        const result = parseSearchQuery('tag:docker | | title:logs')
        expect(result.filters).toHaveLength(2)
    })
})

// ── filterCommandsBySearch ──────────────────────────────────────

describe('filterCommandsBySearch', () => {
    const commands = [
        { title: 'Docker: List Containers', body: 'docker ps -a', tags: '["docker", "containers"]' },
        { title: 'K8s: Get Pods', body: 'kubectl get pods', tags: '["kubernetes", "k8s"]' },
        { title: 'Curl: Basic Auth', body: 'curl -u user:pass url', tags: '["curl", "api"]' },
        { title: 'Git: Interactive Rebase', body: 'git rebase -i HEAD~3', tags: '["git"]' },
    ]

    it('returns all commands when no filters', () => {
        const parsed = parseSearchQuery('')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(4)
    })

    it('filters by tag', () => {
        const parsed = parseSearchQuery('tag:docker')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Docker: List Containers')
    })

    it('filters by title', () => {
        const parsed = parseSearchQuery('title:curl')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Curl: Basic Auth')
    })

    it('filters by body', () => {
        const parsed = parseSearchQuery('body:kubectl')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('K8s: Get Pods')
    })

    it('"all" filter searches title and body', () => {
        const parsed = parseSearchQuery('rebase')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Git: Interactive Rebase')
    })

    it('multiple filters use AND logic', () => {
        const parsed = parseSearchQuery('tag:docker | body:ps')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Docker: List Containers')
    })

    it('comma-separated tags use AND logic', () => {
        const parsed = parseSearchQuery('tag:docker,containers')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Docker: List Containers')
    })

    it('tag matching is case-insensitive', () => {
        const parsed = parseSearchQuery('tag:DOCKER')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(1)
    })

    it('returns empty when no commands match', () => {
        const parsed = parseSearchQuery('tag:nonexistent')
        const result = filterCommandsBySearch(commands, parsed)
        expect(result).toHaveLength(0)
    })
})
