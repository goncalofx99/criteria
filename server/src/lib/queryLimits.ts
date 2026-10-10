import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type SelectionSetNode,
  type ValidationContext,
} from 'graphql'

const MAX_FIELDS = 100
const MAX_DEPTH = 8
const MAX_ROOT_FIELDS = 10

/** Count fragment spreads at every use, rather than once at their definition. */
export function queryLimitsRule(context: ValidationContext): ASTVisitor {
  return {
    OperationDefinition(operation) {
      let fields = 0
      let rootFields = 0
      let tooDeep = false
      let fragmentCycle = false

      function walk(selections: SelectionSetNode, depth: number, stack: Set<string>) {
        if (depth > MAX_DEPTH) tooDeep = true
        for (const selection of selections.selections) {
          if (fields > MAX_FIELDS || tooDeep || fragmentCycle) return
          if (selection.kind === Kind.FIELD) {
            fields++
            if (depth === 1) rootFields++
            if (selection.selectionSet) walk(selection.selectionSet, depth + 1, stack)
          } else if (selection.kind === Kind.INLINE_FRAGMENT) {
            walk(selection.selectionSet, depth, stack)
          } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const name = selection.name.value
            if (stack.has(name)) {
              fragmentCycle = true
              return
            }
            const fragment = context.getFragment(name)
            if (fragment) walk(fragment.selectionSet, depth, new Set([...stack, name]))
          }
        }
      }

      walk(operation.selectionSet, 1, new Set())
      if (fields > MAX_FIELDS || rootFields > MAX_ROOT_FIELDS || tooDeep || fragmentCycle) {
        context.reportError(new GraphQLError('GraphQL operation is too large or deeply nested', {
          nodes: [operation],
          extensions: { code: 'BAD_USER_INPUT' },
        }))
      }
    },
  }
}
