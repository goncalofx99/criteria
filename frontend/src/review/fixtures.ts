import type { PropertyCardData } from '@/components/posts/PropertyCard'
import type { CriteriaCardData } from '@/components/posts/CriteriaCard'
import type { ReviewRole } from './mode'

export interface ReviewUser {
  __typename?: 'User'
  id: string
  email: string | null
  fullName: string | null
  role: ReviewRole
  avatarUrl: string | null
  onboardingComplete: boolean
  createdAt: string
  updatedAt: string
}

export type ReviewSellerPost = PropertyCardData & {
  __typename?: 'SellerPost'
  description: string | null
  isActive: boolean
  updatedAt: string
}

export type ReviewBuyerPost = CriteriaCardData & {
  __typename?: 'BuyerPost'
  description: string | null
  isActive: boolean
  updatedAt: string
}

export interface ReviewMessage {
  __typename?: 'Message'
  id: string
  sender: ReviewUser
  body: string
  createdAt: string
}

export interface ReviewConversation {
  __typename?: 'Conversation'
  id: string
  buyerPost: ReviewBuyerPost | null
  sellerPost: ReviewSellerPost | null
  buyer: ReviewUser
  seller: ReviewUser
  messages: ReviewMessage[]
  createdAt: string
}

export interface ReviewStore {
  me: ReviewUser
  sellers: ReviewSellerPost[]
  buyers: ReviewBuyerPost[]
  conversations: ReviewConversation[]
  nextId: number
}

const now = () => new Date().toISOString()
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

/** Self-contained images keep the review mode usable without image services. */
function illustration(sky: string, building: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#f1eadb"/></linearGradient></defs><rect width="800" height="600" fill="url(#sky)"/><circle cx="654" cy="112" r="45" fill="#fff9dd" opacity=".78"/><path d="M0 475Q180 430 325 480T800 454V600H0" fill="#71856b"/><path d="M0 527Q230 492 415 536T800 493V600H0" fill="#3b604d"/><path d="M124 277h559v246H124z" fill="${building}"/><path d="M86 280l332-181 305 181z" fill="${accent}"/><path d="M145 309h497v195H145z" fill="${building}"/><path d="M348 355h127v149H348z" fill="#b18a60"/><path d="M194 337h100v100H194zm309 0h100v100H503z" fill="#8eb7b3"/><path d="M244 337v100m309-100v100M194 387h100m209 0h100" stroke="#e4ddd0" stroke-width="10"/><path d="M0 528h800" stroke="#cbbf9e" stroke-width="16"/><path d="M111 508h584" stroke="#f4ede1" stroke-width="17"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const imageLisbon = illustration('#acc7c8', '#efe8d9', '#9c7255')
const imagePorto = illustration('#b0c8d6', '#e7d4b7', '#a7745d')
const imageAlgarve = illustration('#a9d4d8', '#fbf5e8', '#b88768')

export function makeReviewStore(role: ReviewRole): ReviewStore {
  const me: ReviewUser = {
    id: 'review-current', email: 'alex@example.test', fullName: 'Alex Ribeiro', role,
    avatarUrl: null, onboardingComplete: true, createdAt: daysAgo(240), updatedAt: now(),
  }
  const seller: ReviewUser = {
    id: 'review-seller', email: null, fullName: 'Sofia Martins', role: 'seller',
    avatarUrl: null, onboardingComplete: true, createdAt: daysAgo(300), updatedAt: now(),
  }
  const buyer: ReviewUser = {
    id: 'review-buyer', email: null, fullName: 'Miguel Costa', role: 'buyer',
    avatarUrl: null, onboardingComplete: true, createdAt: daysAgo(120), updatedAt: now(),
  }

  const sellers: ReviewSellerPost[] = [
    {
      id: 'review-listing-lisbon', title: 'Light-filled apartment near Jardim da Estrela',
      description: 'A calm, renovated home with an open living room, generous balcony and room to work from home. The city is close, but the street feels quiet.',
      locationText: 'Estrela, Lisboa', lat: 38.714, lng: -9.159, propertyType: 'apartment',
      price: 485000, bedrooms: 2, bathrooms: 2, areaSqm: 112, yearBuilt: 1988,
      condition: 'renovated', floor: 3, totalFloors: 5, hasBalcony: true,
      hasCentralHeating: true, amenities: ['elevator', 'parking'], images: [imageLisbon, imagePorto],
      isActive: true, createdAt: daysAgo(2), updatedAt: daysAgo(2), seller,
    },
    {
      id: 'review-listing-porto', title: 'Family house with a garden in Foz',
      description: 'Four comfortable bedrooms, natural materials and a private garden. A practical house for everyday family life.',
      locationText: 'Foz do Douro, Porto', lat: 41.151, lng: -8.674, propertyType: 'house',
      price: 920000, bedrooms: 4, bathrooms: 3, areaSqm: 245, yearBuilt: 2016,
      condition: 'good', floor: null, totalFloors: 2, hasBalcony: true,
      hasCentralHeating: true, amenities: ['garden', 'parking'], images: [imagePorto],
      isActive: true, createdAt: daysAgo(7), updatedAt: daysAgo(7), seller,
    },
    {
      id: 'review-listing-own', title: 'Contemporary townhouse in Braga',
      description: 'A flexible family home with three bedrooms and an easy-care courtyard.',
      locationText: 'Braga', lat: 41.550, lng: -8.423, propertyType: 'house',
      price: 365000, bedrooms: 3, bathrooms: 2, areaSqm: 161, yearBuilt: 2021,
      condition: 'new', floor: null, totalFloors: 2, hasBalcony: false,
      hasCentralHeating: true, amenities: ['parking'], images: [imageLisbon],
      isActive: true, createdAt: daysAgo(1), updatedAt: daysAgo(1), seller: me,
    },
    {
      id: 'review-listing-braga-other', title: 'Renovated home close to Braga centre',
      description: 'Three bedrooms, flexible living space and a short walk to everyday services.',
      locationText: 'Braga', lat: 41.551, lng: -8.421, propertyType: 'house',
      price: 390000, bedrooms: 3, bathrooms: 2, areaSqm: 174, yearBuilt: 2008,
      condition: 'renovated', floor: null, totalFloors: 2, hasBalcony: false,
      hasCentralHeating: true, amenities: ['parking'], images: [imagePorto],
      isActive: true, createdAt: daysAgo(4), updatedAt: daysAgo(4), seller,
    },
    {
      id: 'review-listing-land', title: 'Buildable plot close to the coast',
      description: 'Level land with road access. Planning and construction permissions should be verified independently.',
      locationText: 'Lagos, Faro', lat: 37.103, lng: -8.675, propertyType: 'land',
      price: 215000, bedrooms: 0, bathrooms: 0, areaSqm: 680, yearBuilt: null,
      condition: 'good', floor: null, totalFloors: null, hasBalcony: false,
      hasCentralHeating: false, amenities: [], images: [imageAlgarve],
      isActive: true, createdAt: daysAgo(14), updatedAt: daysAgo(14), seller,
    },
    {
      id: 'review-listing-archived', title: 'Archived studio in Coimbra',
      description: 'An archived listing shown only to its owner.',
      locationText: 'Coimbra', lat: 40.208, lng: -8.426, propertyType: 'apartment',
      price: 160000, bedrooms: 0, bathrooms: 1, areaSqm: 42, yearBuilt: 1999,
      condition: 'good', floor: 1, totalFloors: 4, hasBalcony: false,
      hasCentralHeating: false, amenities: [], images: [],
      isActive: false, createdAt: daysAgo(100), updatedAt: daysAgo(5), seller: me,
    },
    {
      id: 'review-listing-commercial', title: 'Street-level workspace in Aveiro',
      description: 'Flexible space for a studio or small business. Suitable uses are subject to local licensing.',
      locationText: 'Aveiro', lat: 40.640, lng: -8.654, propertyType: 'commercial',
      price: 289000, bedrooms: 0, bathrooms: 1, areaSqm: 130, yearBuilt: 2007,
      condition: 'good', floor: 0, totalFloors: 3, hasBalcony: false,
      hasCentralHeating: true, amenities: [], images: [],
      isActive: true, createdAt: daysAgo(12), updatedAt: daysAgo(12), seller,
    },
  ]

  const buyers: ReviewBuyerPost[] = [
    {
      id: 'review-request-lisbon', title: 'Looking for a bright family apartment',
      description: 'We are ready to buy and looking for a home close to parks and public transport. A balcony would be ideal.',
      locationText: 'Lisboa', lat: 38.722, lng: -9.139, radiusKm: 12, propertyType: 'apartment',
      priceMin: 350000, priceMax: 550000, bedroomsMin: 2, bathroomsMin: 2, areaSqmMin: 90,
      yearBuiltMin: null, conditions: ['good', 'renovated', 'new'], floorMin: null, floorMax: null,
      requiresBalcony: true, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(3), updatedAt: daysAgo(3), buyer,
    },
    {
      id: 'review-request-own', title: 'A house with space to grow',
      description: 'Hoping to find a home with three bedrooms, a garden and a good commute.',
      locationText: 'Braga', lat: 41.550, lng: -8.423, radiusKm: 20, propertyType: 'house',
      priceMin: 280000, priceMax: 430000, bedroomsMin: 3, bathroomsMin: 2, areaSqmMin: 120,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: true, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(1), updatedAt: daysAgo(1), buyer: me,
    },
    {
      id: 'review-request-braga-other', title: 'Seeking a three-bedroom home in Braga',
      description: 'Ready to buy a practical home near Braga centre.',
      locationText: 'Braga', lat: 41.551, lng: -8.422, radiusKm: 15, propertyType: 'house',
      priceMin: 300000, priceMax: 410000, bedroomsMin: 3, bathroomsMin: 2, areaSqmMin: 130,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: true, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(5), updatedAt: daysAgo(5), buyer,
    },
    {
      id: 'review-request-land', title: 'Plot for a small coastal home',
      description: 'Looking for buildable land within reach of Lagos.',
      locationText: 'Lagos, Faro', lat: 37.103, lng: -8.675, radiusKm: 25, propertyType: 'land',
      priceMin: 80000, priceMax: 250000, bedroomsMin: 0, bathroomsMin: 0, areaSqmMin: 400,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(11), updatedAt: daysAgo(11), buyer,
    },
    {
      id: 'review-request-archived', title: 'Archived apartment search',
      description: 'An archived request shown only to its owner.',
      locationText: 'Porto', lat: 41.149, lng: -8.611, radiusKm: 8, propertyType: 'apartment',
      priceMin: 180000, priceMax: 310000, bedroomsMin: 1, bathroomsMin: 1, areaSqmMin: 60,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: false, createdAt: daysAgo(80), updatedAt: daysAgo(6), buyer: me,
    },
  ]

  const conversations: ReviewConversation[] = role === 'seller' ? [{
    id: 'review-conversation-1', buyerPost: buyers[0], sellerPost: null, buyer, seller: me,
    messages: [
      { id: 'review-message-1', sender: me, body: 'Hello Miguel, I may have a property that fits your request.', createdAt: daysAgo(1) },
      { id: 'review-message-2', sender: buyer, body: 'Thanks, I would be happy to hear more.', createdAt: now() },
    ],
    createdAt: daysAgo(1),
  }] : [{
    id: 'review-conversation-1', buyerPost: null, sellerPost: sellers[0], buyer: me, seller,
    messages: [
      { id: 'review-message-1', sender: me, body: 'Hello Sofia, is the Estrela apartment still available?', createdAt: daysAgo(1) },
      { id: 'review-message-2', sender: seller, body: 'Yes, it is. Happy to answer any questions about it.', createdAt: now() },
    ],
    createdAt: daysAgo(1),
  }]

  for (const user of [me, seller, buyer]) user.__typename = 'User'
  for (const post of sellers) post.__typename = 'SellerPost'
  for (const post of buyers) post.__typename = 'BuyerPost'
  for (const conversation of conversations) {
    conversation.__typename = 'Conversation'
    for (const message of conversation.messages) message.__typename = 'Message'
  }

  return { me, sellers, buyers, conversations, nextId: 100 }
}
