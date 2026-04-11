import { describe, expect, it } from 'vitest'
import { filterCommandsByTags, matchesTagFilter } from '../src/utils/tags'

describe('matchesTagFilter', () => {
    it('returns true when any selected tag matches', () => {
        expect(matchesTagFilter(['docker', 'logs'], ['k8s', 'docker'])).toBe(true)
    })

    it('uses exact normalized tag matches instead of substring matches', () => {
        expect(matchesTagFilter(['docker-compose'], ['docker'])).toBe(false)
    })

    it('returns true when no filter tags are selected', () => {
        expect(matchesTagFilter(['docker'], [])).toBe(true)
    })
})

describe('filterCommandsByTags', () => {
    const commands = [
        { title: 'Docker Logs', tags: '["docker", "logs"]' },
        { title: 'K8s Pods', tags: '["k8s"]' },
        { title: 'Git Status', tags: '["git"]' },
    ]

    it('uses OR semantics for multi-tag filters', () => {
        const result = filterCommandsByTags(commands, ['docker', 'k8s'])
        expect(result.map(command => command.title)).toEqual(['Docker Logs', 'K8s Pods'])
    })
})
