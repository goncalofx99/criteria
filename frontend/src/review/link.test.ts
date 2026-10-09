import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { GraphQLError } from 'graphql'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReviewLink, executeReviewOperation } from './link'
import { makeReviewStore } from './fixtures'
import { GET_BUYER_POST, SEARCH_SELLER_POSTS } from '@/lib/gql'

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
    expect(publicPost).toMatchObject({ locationText: 'Lisbon, Portugal', lat: 38.71, lng: -9.16 })
  })
})
