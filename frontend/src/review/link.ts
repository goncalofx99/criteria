import { ApolloLink, Observable, type Operation } from '@apollo/client'
import { getMainDefinition } from '@apollo/client/utilities'
import { GraphQLError } from 'graphql'
import { getReviewScenario } from './mode'
import { getReviewStore, getReviewToken } from './state'
import type { ReviewBuyerPost, ReviewConversation, ReviewSellerPost, ReviewStore } from './fixtures'

type Variables = Record<string, unknown>

function object(value: unknown): Variables {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Variables : {}
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// Mirror the server's public locality rules so review data cannot expose an
// address through search or show more precise locations than live results.
const publicLocalities = [
  { label: 'Lisbon, Portugal', aliases: ['lisbon', 'lisboa'] },
  { label: 'Porto, Portugal', aliases: ['porto'] },
  { label: 'Cascais, Portugal', aliases: ['cascais'] },
  { label: 'Sintra, Portugal', aliases: ['sintra'] },
  { label: 'Braga, Portugal', aliases: ['braga'] },
  { label: 'Coimbra, Portugal', aliases: ['coimbra'] },
  { label: 'Faro, Portugal', aliases: ['faro'] },
  { label: 'Aveiro, Portugal', aliases: ['aveiro'] },
  { label: 'Lagos, Portugal', aliases: ['lagos'] },
  { label: 'Évora, Portugal', aliases: ['évora', 'evora'] },
  { label: 'Funchal, Madeira', aliases: ['funchal'] },
] as const

function locationSegments(value: string): string[] {
  return value.split(',').map(part => part.trim().toLocaleLowerCase('pt-PT')).filter(Boolean)
}

function publicLocationText(value: string): string {
  const parts = locationSegments(value)
  for (const part of parts) {
    const group = publicLocalities.find(item => item.aliases.some(alias => alias === part))
    if (group) return group.label
  }
  return parts.includes('portugal') ? 'Portugal' : 'Approximate area'
}

function matchesPublicLocality(value: string, term: string): boolean {
  const group = publicLocalities.find(item =>
    item.label.toLocaleLowerCase('pt-PT') === term || item.aliases.some(alias => alias === term))
  return !!group && group.aliases.some(alias => locationSegments(value).includes(alias))
}

function publicCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

function publicPost<T extends ReviewSellerPost | ReviewBuyerPost>(post: T, meId: string): T {
  const ownerId = 'seller' in post ? post.seller.id : post.buyer.id
  return ownerId === meId ? post : {
    ...post,
    locationText: publicLocationText(post.locationText),
    lat: publicCoordinate(post.lat),
    lng: publicCoordinate(post.lng),
  }
}

function filterSeller(post: ReviewSellerPost, filters: Variables): boolean {
  if (filters.propertyType && post.propertyType !== filters.propertyType) return false
  if (post.price < number(filters.priceMin, -Infinity) || post.price > number(filters.priceMax, Infinity)) return false
  if (post.bedrooms < number(filters.bedroomsMin, 0) || post.bathrooms < number(filters.bathroomsMin, 0)) return false
  if (filters.areaSqmMin != null && (post.areaSqm === null || post.areaSqm < number(filters.areaSqmMin, 0))) return false
  if (filters.areaSqmMax != null && (post.areaSqm === null || post.areaSqm > number(filters.areaSqmMax, Infinity))) return false
  if (filters.yearBuiltMin != null && (post.yearBuilt === null || post.yearBuilt < number(filters.yearBuiltMin, 0))) return false
  if (Array.isArray(filters.condition) && filters.condition.length && !filters.condition.includes(post.condition)) return false
  if (filters.hasBalcony === true && !post.hasBalcony) return false
  if (filters.hasCentralHeating === true && !post.hasCentralHeating) return false
  if (Array.isArray(filters.amenities) && filters.amenities.some(item => !post.amenities.includes(String(item)))) return false
  return true
}

function filterBuyer(post: ReviewBuyerPost, filters: Variables): boolean {
  if (filters.propertyType && post.propertyType !== filters.propertyType) return false
  if (post.priceMax < number(filters.budgetMin, -Infinity) || post.priceMin > number(filters.budgetMax, Infinity)) return false
  if (post.bedroomsMin < number(filters.bedroomsMin, 0) || post.bathroomsMin < number(filters.bathroomsMin, 0)) return false
  if (post.radiusKm > number(filters.radiusKmMax, Infinity)) return false
  return true
}

function inBounds(post: {lat: number; lng: number}, raw: unknown): boolean {
  if (!raw) return true
  const bounds = object(raw)
  const north = number(bounds.north, 90)
  const south = number(bounds.south, -90)
  const east = number(bounds.east, 180)
  const west = number(bounds.west, -180)
  const lat = publicCoordinate(post.lat)
  const lng = publicCoordinate(post.lng)
  return lat <= north && lat >= south && (
    west <= east ? lng >= west && lng <= east : lng >= west || lng <= east
  )
}

function sortPosts<T extends { createdAt: string; price?: number; priceMin?: number; priceMax?: number; areaSqm?: number | null }>(items: T[], raw: unknown): T[] {
  const sort = string(raw).toLowerCase()
  return [...items].sort((a, b) => {
    if (sort === 'oldest') return Date.parse(a.createdAt) - Date.parse(b.createdAt)
    if (sort === 'area_asc') return (a.areaSqm ?? Infinity) - (b.areaSqm ?? Infinity)
    if (sort === 'area_desc') return (b.areaSqm ?? -Infinity) - (a.areaSqm ?? -Infinity)
    if (sort === 'price_per_sqm_asc') return (a.price ?? 0) / (a.areaSqm || Infinity) - (b.price ?? 0) / (b.areaSqm || Infinity)
    if (sort === 'price_per_sqm_desc') return (b.price ?? 0) / (b.areaSqm || Infinity) - (a.price ?? 0) / (a.areaSqm || Infinity)
    if (sort === 'budget_asc') return (a.priceMax ?? 0) - (b.priceMax ?? 0)
    if (sort === 'budget_desc') return (b.priceMax ?? 0) - (a.priceMax ?? 0)
    if (sort === 'price_asc') return (a.price ?? 0) - (b.price ?? 0)
    if (sort === 'price_desc') return (b.price ?? 0) - (a.price ?? 0)
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

function searchPosts<T extends { title: string; description: string | null; locationText: string; createdAt: string; lat: number; lng: number }>(
  items: T[], variables: Variables,
): { items: T[]; totalCount: number; hasNextPage: boolean } {
  const q = string(variables.search).trim().toLocaleLowerCase('pt-PT')
  const matched = sortPosts(items.filter(item =>
    inBounds(item, variables.bounds) && (!q || `${item.title} ${item.description ?? ''}`.toLocaleLowerCase('pt-PT').includes(q) || matchesPublicLocality(item.locationText, q)),
  ), variables.sort)
  const offset = Math.max(0, number(variables.offset, 0))
  const limit = Math.max(0, number(variables.limit, 24))
  return { items: matched.slice(offset, offset + limit), totalCount: matched.length, hasNextPage: offset + limit < matched.length }
}

function visibleSellers(store: ReviewStore, variables: Variables): ReviewSellerPost[] {
  const filters = object(variables.filters)
  return store.sellers.filter(post => post.isActive && filterSeller(post, filters))
}

function visibleBuyers(store: ReviewStore, variables: Variables): ReviewBuyerPost[] {
  const filters = object(variables.filters)
  return store.buyers.filter(post => post.isActive && filterBuyer(post, filters))
}

function page<T>(items: T[], variables: Variables): T[] {
  const offset = Math.max(0, number(variables.offset, 0))
  const limit = Math.max(0, number(variables.limit, 50))
  return items.slice(offset, offset + limit)
}

function findSeller(store: ReviewStore, id: string): ReviewSellerPost | null {
  const post = store.sellers.find(item => item.id === id)
  return post && (post.isActive || post.seller.id === store.me.id) ? post : null
}

function findBuyer(store: ReviewStore, id: string): ReviewBuyerPost | null {
  const post = store.buyers.find(item => item.id === id)
  return post && (post.isActive || post.buyer.id === store.me.id) ? post : null
}

function distanceKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function postsMatch(seller: ReviewSellerPost, buyer: ReviewBuyerPost): boolean {
  return seller.isActive && buyer.isActive && seller.seller.id !== buyer.buyer.id &&
    seller.propertyType === buyer.propertyType &&
    seller.price >= buyer.priceMin && seller.price <= buyer.priceMax &&
    seller.bedrooms >= buyer.bedroomsMin && seller.bathrooms >= buyer.bathroomsMin &&
    distanceKm(seller, buyer) <= buyer.radiusKm &&
    (buyer.areaSqmMin === null || (seller.areaSqm !== null && seller.areaSqm >= buyer.areaSqmMin)) &&
    (buyer.yearBuiltMin === null || (seller.yearBuilt !== null && seller.yearBuilt >= buyer.yearBuiltMin)) &&
    (buyer.floorMin === null || (seller.floor !== null && seller.floor >= buyer.floorMin)) &&
    (buyer.floorMax === null || (seller.floor !== null && seller.floor <= buyer.floorMax)) &&
    (!buyer.requiresBalcony || seller.hasBalcony) &&
    (!buyer.requiresCentralHeating || seller.hasCentralHeating) &&
    (!buyer.conditions?.length || buyer.conditions.includes(seller.condition)) &&
    buyer.requiredAmenities.every(amenity => seller.amenities.includes(amenity))
}

function requireReviewAuth() {
  if (!getReviewToken()) throw new Error('Review session is signed out')
}

function assertOwned(post: { seller?: {id:string}; buyer?: {id:string} } | null, meId: string) {
  if (!post || (post.seller?.id ?? post.buyer?.id) !== meId) throw new Error('You can only manage your own posts')
}

function conversationFor(store: ReviewStore, id: string): ReviewConversation | null {
  const convo = store.conversations.find(item => item.id === id)
  return convo && (convo.buyer.id === store.me.id || convo.seller.id === store.me.id) ? convo : null
}

/** The only GraphQL executor used in development review mode. Unknown fields fail closed. */
export function executeReviewOperation(field: string, variables: Variables, store: ReviewStore = getReviewStore()): Record<string, unknown> {
  if (getReviewScenario() === 'error' && field !== 'me') throw new Error('Simulated service error')
  const empty = getReviewScenario() === 'empty'
  const me = store.me
  const id = string(variables.id)
  const input = object(variables.input)
  switch (field) {
    case '__typename': return { __typename: 'Query' }
    case 'me': return { me: getReviewToken() ? store.me : null }
    case 'sellerPosts': requireReviewAuth(); return { sellerPosts: empty ? [] : page(sortPosts(visibleSellers(store, variables), variables.sort), variables).map(post => publicPost(post, me.id)) }
    case 'buyerPosts': {
      requireReviewAuth()
      if (me.role === 'buyer' || !me.onboardingComplete) throw new Error('Seller role required to browse buyer requests')
      return { buyerPosts: empty ? [] : page(sortPosts(visibleBuyers(store, variables), variables.sort), variables).map(post => publicPost(post, me.id)) }
    }
    case 'sellerPostSearch': {
      requireReviewAuth()
      const result = empty ? { items: [], totalCount: 0, hasNextPage: false } : searchPosts(visibleSellers(store, variables), variables)
      return { sellerPostSearch: { ...result, items: result.items.map(post => publicPost(post, me.id)) } }
    }
    case 'buyerPostSearch': {
      requireReviewAuth()
      if (me.role === 'buyer' || !me.onboardingComplete) throw new Error('Seller role required to browse buyer requests')
      const result = empty ? { items: [], totalCount: 0, hasNextPage: false } : searchPosts(visibleBuyers(store, variables), variables)
      return { buyerPostSearch: { ...result, items: result.items.map(post => publicPost(post, me.id)) } }
    }
    case 'sellerPost': {
      requireReviewAuth()
      const post = empty ? null : findSeller(store, id)
      return { sellerPost: post ? publicPost(post, me.id) : null }
    }
    case 'buyerPost': {
      requireReviewAuth()
      const post = empty ? null : findBuyer(store, id)
      if (post && post.buyer.id !== me.id && (me.role === 'buyer' || !me.onboardingComplete)) {
        throw new GraphQLError('Your account role cannot browse buyer requests', { extensions: { code: 'FORBIDDEN' } })
      }
      return { buyerPost: post ? publicPost(post, me.id) : null }
    }
    case 'mySellerPosts': requireReviewAuth(); return { mySellerPosts: empty ? [] : store.sellers.filter(post => post.seller.id === me.id) }
    case 'myBuyerPosts': requireReviewAuth(); return { myBuyerPosts: empty ? [] : store.buyers.filter(post => post.buyer.id === me.id) }
    case 'matchingSellerPosts': {
      requireReviewAuth()
      if (me.role === 'seller' || !me.onboardingComplete) throw new Error('Buyer role required to view matches')
      const own = findBuyer(store, string(variables.buyerPostId))
      assertOwned(own, me.id)
      return { matchingSellerPosts: empty || !own?.isActive ? [] : page(store.sellers.filter(post => postsMatch(post, own)), variables).map(post => publicPost(post, me.id)) }
    }
    case 'matchingBuyerPosts': {
      requireReviewAuth()
      if (me.role === 'buyer' || !me.onboardingComplete) throw new Error('Seller role required to view matches')
      const own = findSeller(store, string(variables.sellerPostId))
      assertOwned(own, me.id)
      return { matchingBuyerPosts: empty || !own?.isActive ? [] : page(store.buyers.filter(post => postsMatch(own, post)), variables).map(post => publicPost(post, me.id)) }
    }
    case 'upsertUser': {
      requireReviewAuth()
      store.me = { ...me, ...input, id: me.id, role: input.role === 'buyer' || input.role === 'seller' || input.role === 'both' ? input.role : me.role, onboardingComplete: true, updatedAt: new Date().toISOString() }
      return { upsertUser: store.me }
    }
    case 'createSellerPost': {
      requireReviewAuth()
      if (me.role === 'buyer') throw new Error('Buyer role cannot create a property')
      const post = { __typename: 'SellerPost', description: null, areaSqm: null, yearBuilt: null, floor: null, totalFloors: null, ...input, id: `review-listing-${store.nextId++}`, seller: me, isActive: true, images: Array.isArray(input.images) ? input.images : [], amenities: Array.isArray(input.amenities) ? input.amenities : [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as ReviewSellerPost
      store.sellers.unshift(post)
      return { createSellerPost: post }
    }
    case 'createBuyerPost': {
      requireReviewAuth()
      if (me.role === 'seller') throw new Error('Seller role cannot create a buyer request')
      const post = { __typename: 'BuyerPost', description: null, areaSqmMin: null, yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null, requiresBalcony: null, requiresCentralHeating: null, ...input, id: `review-request-${store.nextId++}`, buyer: me, isActive: true, requiredAmenities: Array.isArray(input.requiredAmenities) ? input.requiredAmenities : [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as ReviewBuyerPost
      store.buyers.unshift(post)
      return { createBuyerPost: post }
    }
    case 'updateSellerPost': {
      requireReviewAuth()
      const post = store.sellers.find(item => item.id === id) ?? null
      assertOwned(post, me.id)
      Object.assign(post!, input, { updatedAt: new Date().toISOString() })
      return { updateSellerPost: post }
    }
    case 'updateBuyerPost': {
      requireReviewAuth()
      const post = store.buyers.find(item => item.id === id) ?? null
      assertOwned(post, me.id)
      Object.assign(post!, input, { updatedAt: new Date().toISOString() })
      return { updateBuyerPost: post }
    }
    case 'deactivateSellerPost':
    case 'reactivateSellerPost': {
      requireReviewAuth()
      if (field === 'reactivateSellerPost' && (me.role === 'buyer' || !me.onboardingComplete)) throw new Error('Seller role required to republish a property')
      const post = store.sellers.find(item => item.id === id) ?? null
      assertOwned(post, me.id)
      post!.isActive = field === 'reactivateSellerPost'
      post!.updatedAt = new Date().toISOString()
      return { [field]: post }
    }
    case 'deactivateBuyerPost':
    case 'reactivateBuyerPost': {
      requireReviewAuth()
      if (field === 'reactivateBuyerPost' && (me.role === 'seller' || !me.onboardingComplete)) throw new Error('Buyer role required to republish a request')
      const post = store.buyers.find(item => item.id === id) ?? null
      assertOwned(post, me.id)
      post!.isActive = field === 'reactivateBuyerPost'
      post!.updatedAt = new Date().toISOString()
      return { [field]: post }
    }
    case 'myConversations': requireReviewAuth(); return { myConversations: empty ? [] : store.conversations.filter(c => c.buyer.id === me.id || c.seller.id === me.id) }
    case 'conversation': requireReviewAuth(); return { conversation: empty ? null : conversationFor(store, id) }
    case 'startConversation': {
      requireReviewAuth()
      const buyerPost = input.buyerPostId ? findBuyer(store, string(input.buyerPostId)) : null
      const sellerPost = input.sellerPostId ? findSeller(store, string(input.sellerPostId)) : null
      if (!!buyerPost === !!sellerPost) throw new Error('Select one active post')
      if (buyerPost && (buyerPost.buyer.id === me.id || me.role === 'buyer')) throw new Error('Cannot contact this buyer')
      if (sellerPost && (sellerPost.seller.id === me.id || me.role === 'seller')) throw new Error('Cannot contact this seller')
      const existing = store.conversations.find(c => c.buyerPost?.id === buyerPost?.id && c.sellerPost?.id === sellerPost?.id && (c.buyer.id === me.id || c.seller.id === me.id))
      if (existing) return { startConversation: existing }
      const owner = (buyerPost?.buyer ?? sellerPost?.seller) as ReviewStore['me']
      const convo: ReviewConversation = { __typename: 'Conversation', id: `review-conversation-${store.nextId++}`, buyerPost, sellerPost, buyer: sellerPost ? me : owner, seller: buyerPost ? me : owner, messages: [], createdAt: new Date().toISOString() }
      store.conversations.unshift(convo)
      return { startConversation: convo }
    }
    case 'sendMessage': {
      requireReviewAuth()
      const convo = conversationFor(store, string(variables.conversationId))
      if (!convo) throw new Error('Conversation not found')
      const body = string(variables.body).trim()
      if (!body) throw new Error('Write a message first')
      const message = { __typename: 'Message' as const, id: `review-message-${store.nextId++}`, sender: me, body, createdAt: new Date().toISOString() }
      convo.messages.push(message)
      publishReviewMessage(convo.id, message)
      return { sendMessage: message }
    }
    default: throw new Error(`Review mode has no fixture for GraphQL field “${field}”`)
  }
}

type ReviewMessage = ReviewConversation['messages'][number]
const subscriptions = new Map<string, Set<(message: ReviewMessage) => void>>()

function publishReviewMessage(id: string, message: ReviewMessage) {
  subscriptions.get(id)?.forEach(listener => listener(message))
}

function rootField(operation: Operation): {field:string; subscription:boolean} {
  const definition = getMainDefinition(operation.query)
  if (definition.kind !== 'OperationDefinition') throw new Error('Review mode requires a GraphQL operation')
  const first = definition.selectionSet.selections[0]
  if (!first || first.kind !== 'Field') throw new Error('Review mode requires one root field')
  return { field: first.name.value, subscription: definition.operation === 'subscription' }
}

export function createReviewLink(store?: ReviewStore): ApolloLink { return new ApolloLink((operation: Operation) => new Observable(observer => {
  let root: ReturnType<typeof rootField>
  try { root = rootField(operation) } catch (error) { observer.error(error); return }
  if (root.subscription) {
    if (root.field !== 'messageSent') { observer.error(new Error(`Unknown review subscription: ${root.field}`)); return }
    const id = string(operation.variables.conversationId)
    const listeners = subscriptions.get(id) ?? new Set<(message: ReviewMessage) => void>()
    const listener = (message: ReviewMessage) => observer.next({ data: { messageSent: message } })
    listeners.add(listener)
    subscriptions.set(id, listeners)
    return () => { listeners.delete(listener); if (!listeners.size) subscriptions.delete(id) }
  }
  const delay = getReviewScenario() === 'slow' ? 1100 : 0
  const timer = globalThis.setTimeout(() => {
    try {
      const data = executeReviewOperation(root.field, operation.variables, store ?? getReviewStore())
      observer.next({ data })
      observer.complete()
    } catch (error) {
      if (error instanceof GraphQLError) {
        observer.next({ errors: [error] })
        observer.complete()
      } else observer.error(error)
    }
  }, delay)
  return () => globalThis.clearTimeout(timer)
})) }
