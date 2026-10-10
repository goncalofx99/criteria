import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { GraphQLError } from 'graphql'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReviewLink, executeReviewOperation } from './link'
import { makeReviewStore } from './fixtures'
import { setReviewAuthenticated } from './state'
import { GET_BUYER_POST, GET_CONVERSATION, GET_MY_CONVERSATIONS, SEARCH_SELLER_POSTS } from '@/lib/gql'
import portugalAreas from '@/lib/portugalAdministrativeAreas.json'

afterEach(() => vi.unstubAllGlobals())

describe('development review transport', () => {
  it('uses only in-memory fixtures and never calls fetch for reads or writes', async () => {
    const fetch = vi.fn(() => Promise.reject(new Error('Network must remain unused')))
    vi.stubGlobal('fetch', fetch)
    const client = new ApolloClient({ link: createReviewLink(), cache: new InMemoryCache() })

    const result = await client.query({ query: gql`query ReviewMe { me { id role } }` })
    expect(result.data.me.id).toBe('review-current')

    const created = await client.mutate({ mutation: gql`mutation ReviewCreate($input: CreateSellerPostInput!) { createSellerPost(input: $input) { id title } }`, variables: {
      input: { title: 'Test home', locationText: 'Lisboa', lat: 38.7, lng: -9.1, propertyType: 'apartment', price: 400000, bedrooms: 2, bathrooms: 1, areaSqm: 80, yearBuilt: 2001, condition: 'good', hasBalcony: false, hasCentralHeating: false },
    } })
    expect(created.data?.createSellerPost.title).toBe('Test home')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fails closed for unknown operations', () => {
    expect(() => executeReviewOperation('deleteEverything', {}, makeReviewStore('both'))).toThrow(/no fixture/i)
  })

  it('contains owner, non-owner, and archived posts', () => {
    const store = makeReviewStore('both')
    const mine = executeReviewOperation('mySellerPosts', {}, store).mySellerPosts as {id:string;isActive:boolean}[]
    expect(mine.some(post => post.isActive)).toBe(true)
    expect(mine.some(post => !post.isActive)).toBe(true)
    const publicPosts = executeReviewOperation('sellerPostSearch', {}, store).sellerPostSearch as {items:{id:string}[]}
    expect(publicPosts.items.some(post => post.id === 'review-listing-archived')).toBe(false)
  })

  it('preserves fragment fields through Apollo cache normalization', async () => {
    const client = new ApolloClient({ link: createReviewLink(), cache: new InMemoryCache() })
    const result = await client.query({ query: SEARCH_SELLER_POSTS, variables: { limit: 24, sort: 'newest' } })
    const posts = result.data.sellerPostSearch.items as { images: string[]; seller: { id: string } }[]
    expect(posts.length).toBeGreaterThan(0)
    expect(posts.every(post => Array.isArray(post.images) && !!post.seller?.id)).toBe(true)
  })

  it('keeps inbox page queries connected to the review transport', async () => {
    const client = new ApolloClient({ link: createReviewLink(makeReviewStore('both')), cache: new InMemoryCache() })
    const list = await client.query({ query: GET_MY_CONVERSATIONS, variables: { limit: 30, offset: 0 } })
    const first = list.data.myConversations[0]
    expect(first?.id).toBeTruthy()
    const detail = await client.query({ query: GET_CONVERSATION, variables: { id: first.id } })
    expect(detail.data.conversation.id).toBe(first.id)
    expect(Array.isArray(detail.data.conversation.messages)).toBe(true)
  })

  it('enforces role and ownership rules while keeping plausible matches', () => {
    const buyerStore = makeReviewStore('buyer')
    expect(() => executeReviewOperation('buyerPostSearch', {}, buyerStore)).toThrow(/seller role/i)
    expect(() => executeReviewOperation('reactivateSellerPost', { id: 'review-listing-archived' }, buyerStore)).toThrow(/seller role/i)
    try {
      executeReviewOperation('buyerPost', { id: 'review-request-lisbon' }, buyerStore)
      expect.fail('A buyer must not browse another buyer request')
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError)
      expect((error as GraphQLError).extensions.code).toBe('FORBIDDEN')
    }
    const ownRequest = executeReviewOperation('buyerPost', { id: 'review-request-archived' }, buyerStore).buyerPost as { isActive: boolean }
    expect(ownRequest.isActive).toBe(false)
    const sellerMatches = executeReviewOperation('matchingSellerPosts', { buyerPostId: 'review-request-own' }, buyerStore).matchingSellerPosts as { id: string }[]
    expect(sellerMatches.map(post => post.id)).toContain('review-listing-braga-other')
    expect(sellerMatches.map(post => post.id)).not.toContain('review-listing-own')

    const sellerStore = makeReviewStore('seller')
    expect(() => executeReviewOperation('reactivateBuyerPost', { id: 'review-request-archived' }, sellerStore)).toThrow(/buyer role/i)
    const budgetOrder = executeReviewOperation('buyerPostSearch', { sort: 'budget_asc' }, sellerStore).buyerPostSearch as { items: { id: string }[] }
    expect(budgetOrder.items.findIndex(post => post.id === 'review-request-braga-other')).toBeLessThan(budgetOrder.items.findIndex(post => post.id === 'review-request-own'))
    const buyerMatches = executeReviewOperation('matchingBuyerPosts', { sellerPostId: 'review-listing-own' }, sellerStore).matchingBuyerPosts as { id: string }[]
    expect(buyerMatches.map(post => post.id)).toContain('review-request-braga-other')
  })

  it('returns a GraphQL role error for direct buyer-request links', async () => {
    const client = new ApolloClient({ link: createReviewLink(makeReviewStore('buyer')), cache: new InMemoryCache() })
    await expect(client.query({ query: GET_BUYER_POST, variables: { id: 'review-request-lisbon' } })).rejects.toMatchObject({
      graphQLErrors: [expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })],
    })
  })

  it('searches only public locality names and projects nonowner locations', () => {
    const store = makeReviewStore('both')
    const post = store.sellers.find(item => item.id === 'review-listing-lisbon')!
    post.title = 'Quiet apartment'
    post.description = 'A bright home'
    post.locationText = 'Rua das Laranjeiras, Lisboa, Portugal'
    post.lat = 38.7143
    post.lng = -9.1592

    const privateSearch = executeReviewOperation('sellerPostSearch', { search: 'Rua das Laranjeiras' }, store).sellerPostSearch as { items: { id: string }[] }
    expect(privateSearch.items.some(item => item.id === post.id)).toBe(false)

    const citySearch = executeReviewOperation('sellerPostSearch', { search: 'Lisboa' }, store).sellerPostSearch as { items: { id: string; locationText: string; lat: number; lng: number }[] }
    const publicPost = citySearch.items.find(item => item.id === post.id)
    expect(publicPost).toMatchObject({ locationText: 'Lisboa, Portugal', lat: 38.71, lng: -9.16 })
    const legacyEnglishSearch = executeReviewOperation('sellerPostSearch', { search: 'Lisbon, Portugal' }, store).sellerPostSearch as { items: { id: string }[] }
    expect(legacyEnglishSearch.items.some(item => item.id === post.id)).toBe(true)
  })

  it('lets signed-out visitors search locations and read only active, public property details', () => {
    const store = makeReviewStore('both')
    const ownPost = store.sellers.find(item => item.id === 'review-listing-own')!
    ownPost.locationText = 'Rua da Sé, Braga'
    ownPost.lat = 41.5504
    setReviewAuthenticated(false)
    try {
      const district = executeReviewOperation('sellerPostSearch', { district: 'Faro' }, store).sellerPostSearch as { items: { id: string }[] }
      expect(district.items.map(post => post.id)).toContain('review-listing-land')
      expect(district.items.every(post => post.id !== 'review-listing-archived')).toBe(true)
      const municipality = executeReviewOperation('sellerPostSearch', { municipality: 'Lagos', district: 'Faro' }, store).sellerPostSearch as { items: { id: string }[] }
      expect(municipality.items.map(post => post.id)).toEqual(['review-listing-land'])

      const post = executeReviewOperation('sellerPost', { id: 'review-listing-own' }, store).sellerPost as { locationText: string; lat: number; lng: number }
      expect(post).toMatchObject({ locationText: 'Braga, Portugal', lat: 41.55 })
      expect(executeReviewOperation('sellerPost', { id: 'review-listing-archived' }, store).sellerPost).toBeNull()
    } finally {
      setReviewAuthenticated(true)
    }
  })

  it('has an active property in each district and autonomous region', () => {
    const store = makeReviewStore('both')
    for (const district of [...portugalAreas.districts, ...portugalAreas.autonomousRegions]) {
      const result = executeReviewOperation('sellerPostSearch', { district }, store).sellerPostSearch as { items: { id: string }[] }
      expect(result.items.length, `No review properties in ${district}`).toBeGreaterThan(0)
    }
  })

  it('finds properties by their real municipality and projects public place labels', () => {
    const store = makeReviewStore('both')
    const places = [
      { municipality: 'Cascais', district: 'Lisboa', id: 'review-listing-cascais', label: 'Cascais, Portugal' },
      { municipality: 'Matosinhos', district: 'Porto', id: 'review-listing-matosinhos', label: 'Matosinhos, Portugal' },
      { municipality: 'Almada', district: 'Setúbal', id: 'review-listing-almada', label: 'Almada, Portugal' },
      { municipality: 'Caldas da Rainha', district: 'Leiria', id: 'review-listing-caldas', label: 'Caldas da Rainha, Portugal' },
      { municipality: 'Ponta Delgada', district: 'Açores', id: 'review-listing-ponta-delgada', label: 'Ponta Delgada, Portugal' },
      { municipality: 'Funchal', district: 'Madeira', id: 'review-listing-funchal', label: 'Funchal, Madeira' },
    ]
    setReviewAuthenticated(false)
    try {
      for (const { municipality, district, id, label } of places) {
        const result = executeReviewOperation('sellerPostSearch', { district, municipality }, store).sellerPostSearch as { items: { id: string; locationText: string }[] }
        expect(result.items, `${municipality}, ${district} should be searchable`).toContainEqual(expect.objectContaining({ id, locationText: label }))
      }
      const areaOnly = executeReviewOperation('sellerPostSearch', { district: 'Lisboa' }, store).sellerPostSearch as { items: { id: string }[] }
      expect(areaOnly.items.map(post => post.id)).toContain('review-listing-cascais')
      expect(() => executeReviewOperation('sellerPostSearch', { municipality: 'Funchal', district: 'Lisboa' }, store)).toThrow(/outside/i)
    } finally {
      setReviewAuthenticated(true)
    }
  })
})
