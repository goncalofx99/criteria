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
  hasPassword?: boolean
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

/** Local synthetic photos keep development review independent of image services. */
const imageLisbon = '/src/review/assets/review-apartment.jpg'
const imagePorto = '/src/review/assets/review-garden.jpg'
const imageAlgarve = '/src/review/assets/review-coast.jpg'
const imageBraga = '/src/review/assets/review-townhouse.jpg'
const imageRenovated = '/src/review/assets/review-renovated.jpg'

export function makeReviewStore(role: ReviewRole): ReviewStore {
  const me: ReviewUser = {
    id: 'review-current', email: 'alex@example.test', fullName: 'Alex Ribeiro', role,
    avatarUrl: null, hasPassword: true, onboardingComplete: true, createdAt: daysAgo(240), updatedAt: now(),
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
      id: 'review-listing-lisbon', title: 'Apartamento luminoso junto ao Jardim da Estrela',
      description: 'Casa renovada e tranquila, com sala aberta, varanda ampla e espaço para trabalhar. Perto do centro, numa rua sossegada.',
      locationText: 'Estrela, Lisboa, Lisboa', lat: 38.714, lng: -9.159, propertyType: 'apartment',
      price: 485000, bedrooms: 2, bathrooms: 2, areaSqm: 112, yearBuilt: 1988,
      condition: 'renovated', floor: 3, totalFloors: 5, hasBalcony: true,
      hasCentralHeating: true, amenities: ['elevator', 'parking'], images: [imageLisbon, '/landing-home.jpg'],
      isActive: true, createdAt: daysAgo(2), updatedAt: daysAgo(2), seller,
    },
    {
      id: 'review-listing-porto', title: 'Moradia familiar com jardim na Foz',
      description: 'Quatro quartos confortáveis, materiais naturais e jardim privado. Uma casa prática para a vida em família.',
      locationText: 'Foz do Douro, Porto, Porto', lat: 41.151, lng: -8.674, propertyType: 'house',
      price: 920000, bedrooms: 4, bathrooms: 3, areaSqm: 245, yearBuilt: 2016,
      condition: 'good', floor: null, totalFloors: 2, hasBalcony: true,
      hasCentralHeating: true, amenities: ['garden', 'parking'], images: [imagePorto],
      isActive: true, createdAt: daysAgo(7), updatedAt: daysAgo(7), seller,
    },
    {
      id: 'review-listing-own', title: 'Moradia contemporânea em Braga',
      description: 'Uma casa familiar versátil, com três quartos e um pátio fácil de manter.',
      locationText: 'Braga, Braga', lat: 41.550, lng: -8.423, propertyType: 'house',
      price: 365000, bedrooms: 3, bathrooms: 2, areaSqm: 161, yearBuilt: 2021,
      condition: 'new', floor: null, totalFloors: 2, hasBalcony: false,
      hasCentralHeating: true, amenities: ['parking'], images: [imageBraga],
      isActive: true, createdAt: daysAgo(1), updatedAt: daysAgo(1), seller: me,
    },
    {
      id: 'review-listing-braga-other', title: 'Casa renovada perto do centro de Braga',
      description: 'Três quartos, espaço versátil e serviços essenciais a poucos minutos a pé.',
      locationText: 'Braga, Braga', lat: 41.551, lng: -8.421, propertyType: 'house',
      price: 390000, bedrooms: 3, bathrooms: 2, areaSqm: 174, yearBuilt: 2008,
      condition: 'renovated', floor: null, totalFloors: 2, hasBalcony: false,
      hasCentralHeating: true, amenities: ['parking'], images: [imageRenovated],
      isActive: true, createdAt: daysAgo(4), updatedAt: daysAgo(4), seller,
    },
    {
      id: 'review-listing-land', title: 'Terreno para construção perto da costa',
      description: 'Terreno plano com acesso por estrada. A viabilidade e as licenças de construção devem ser confirmadas de forma independente.',
      locationText: 'Lagos, Faro', lat: 37.103, lng: -8.675, propertyType: 'land',
      price: 215000, bedrooms: 0, bathrooms: 0, areaSqm: 680, yearBuilt: null,
      condition: 'good', floor: null, totalFloors: null, hasBalcony: false,
      hasCentralHeating: false, amenities: [], images: [imageAlgarve],
      isActive: true, createdAt: daysAgo(14), updatedAt: daysAgo(14), seller,
    },
    {
      id: 'review-listing-archived', title: 'Estúdio arquivado em Coimbra',
      description: 'Anúncio arquivado, visível apenas para o proprietário.',
      locationText: 'Coimbra, Coimbra', lat: 40.208, lng: -8.426, propertyType: 'apartment',
      price: 160000, bedrooms: 0, bathrooms: 1, areaSqm: 42, yearBuilt: 1999,
      condition: 'good', floor: 1, totalFloors: 4, hasBalcony: false,
      hasCentralHeating: false, amenities: [], images: [],
      isActive: false, createdAt: daysAgo(100), updatedAt: daysAgo(5), seller: me,
    },
    {
      id: 'review-listing-commercial', title: 'Espaço comercial ao nível da rua em Aveiro',
      description: 'Espaço versátil para atelier ou pequeno negócio. A utilização está sujeita às licenças locais.',
      locationText: 'Aveiro, Aveiro', lat: 40.640, lng: -8.654, propertyType: 'commercial',
      price: 289000, bedrooms: 0, bathrooms: 1, areaSqm: 130, yearBuilt: 2007,
      condition: 'good', floor: 0, totalFloors: 3, hasBalcony: false,
      hasCentralHeating: true, amenities: [], images: [],
      isActive: true, createdAt: daysAgo(12), updatedAt: daysAgo(12), seller,
    },
  ]

  // A compact sample market: every mainland district and both autonomous
  // regions have an active property. Each label contains a real municipality
  // followed by its district (or island and region), like geocoded posts.
  type RegionalListing = Pick<ReviewSellerPost,
    'id' | 'title' | 'description' | 'locationText' | 'lat' | 'lng' |
    'propertyType' | 'price' | 'bedrooms' | 'bathrooms' | 'areaSqm' | 'images'> &
    Partial<Pick<ReviewSellerPost, 'hasBalcony' | 'amenities'>>
  const regionalListings: RegionalListing[] = [
    { id: 'review-listing-beja', title: 'Moradia com pátio perto do centro de Beja', description: 'Casa com dois quartos, espaço exterior à sombra e uma divisão versátil.', locationText: 'Beja, Beja', lat: 38.016, lng: -7.863, propertyType: 'house', price: 218000, bedrooms: 2, bathrooms: 1, areaSqm: 109, images: [imageBraga] },
    { id: 'review-listing-braganca', title: 'Moradia de pedra em Bragança', description: 'Casa bem conservada com três quartos e zona social luminosa.', locationText: 'Bragança, Bragança', lat: 41.807, lng: -6.757, propertyType: 'house', price: 245000, bedrooms: 3, bathrooms: 2, areaSqm: 145, images: [imageRenovated] },
    { id: 'review-listing-covilha', title: 'Apartamento com vista para a serra na Covilhã', description: 'Dois quartos confortáveis e zona social aberta perto dos serviços do dia a dia.', locationText: 'Covilhã, Castelo Branco', lat: 40.280, lng: -7.504, propertyType: 'apartment', price: 198000, bedrooms: 2, bathrooms: 1, areaSqm: 84, images: [imageRenovated] },
    { id: 'review-listing-coimbra', title: 'Apartamento soalheiro em Coimbra', description: 'Planta funcional, escritório separado e espaço para receber visitas.', locationText: 'Coimbra, Coimbra', lat: 40.211, lng: -8.429, propertyType: 'apartment', price: 278000, bedrooms: 2, bathrooms: 2, areaSqm: 96, images: [imageLisbon] },
    { id: 'review-listing-evora', title: 'Casa recuperada perto de Évora', description: 'Detalhes tradicionais, pátio privado e divisões práticas para o dia a dia.', locationText: 'Évora, Évora', lat: 38.571, lng: -7.913, propertyType: 'house', price: 349000, bedrooms: 3, bathrooms: 2, areaSqm: 151, images: [imageBraga] },
    { id: 'review-listing-guarda', title: 'Moradia familiar na Guarda', description: 'Moradia com três quartos, bastante arrumação e espaço exterior resguardado.', locationText: 'Guarda, Guarda', lat: 40.538, lng: -7.267, propertyType: 'house', price: 264000, bedrooms: 3, bathrooms: 2, areaSqm: 158, images: [imageBraga] },
    { id: 'review-listing-caldas', title: 'Apartamento moderno nas Caldas da Rainha', description: 'Divisões confortáveis e varanda, perto de comércio e transportes.', locationText: 'Caldas da Rainha, Leiria', lat: 39.403, lng: -9.136, propertyType: 'apartment', price: 312000, bedrooms: 2, bathrooms: 2, areaSqm: 101, images: [imageRenovated] },
    { id: 'review-listing-elvas', title: 'Casa tranquila em Elvas', description: 'Casa familiar compacta com pátio e rés do chão acolhedor.', locationText: 'Elvas, Portalegre', lat: 38.881, lng: -7.164, propertyType: 'house', price: 229000, bedrooms: 3, bathrooms: 2, areaSqm: 129, images: [imageBraga] },
    { id: 'review-listing-tomar', title: 'Moradia com jardim em Tomar', description: 'Moradia isolada com espaço exterior e divisões versáteis para a família.', locationText: 'Tomar, Santarém', lat: 39.605, lng: -8.410, propertyType: 'house', price: 335000, bedrooms: 3, bathrooms: 2, areaSqm: 172, images: [imagePorto] },
    { id: 'review-listing-almada', title: 'Apartamento junto ao rio em Almada', description: 'Apartamento arejado com dois quartos e acesso fácil a Lisboa.', locationText: 'Almada, Setúbal', lat: 38.678, lng: -9.158, propertyType: 'apartment', price: 385000, bedrooms: 2, bathrooms: 2, areaSqm: 94, images: [imageLisbon] },
    { id: 'review-listing-ponte-de-lima', title: 'Moradia com jardim em Ponte de Lima', description: 'Casa tranquila com três quartos e espaço para refeições ao ar livre.', locationText: 'Ponte de Lima, Viana do Castelo', lat: 41.767, lng: -8.583, propertyType: 'house', price: 374000, bedrooms: 3, bathrooms: 2, areaSqm: 179, images: [imagePorto] },
    { id: 'review-listing-chaves', title: 'Moradia renovada em Chaves', description: 'Casa prática com divisões luminosas e um pequeno terraço privado.', locationText: 'Chaves, Vila Real', lat: 41.740, lng: -7.470, propertyType: 'house', price: 252000, bedrooms: 3, bathrooms: 2, areaSqm: 138, images: [imageRenovated] },
    { id: 'review-listing-viseu', title: 'Apartamento central em Viseu', description: 'Apartamento confortável com dois quartos e sala de jantar separada.', locationText: 'Viseu, Viseu', lat: 40.661, lng: -7.909, propertyType: 'apartment', price: 265000, bedrooms: 2, bathrooms: 2, areaSqm: 92, images: [imageLisbon] },
    { id: 'review-listing-ponta-delgada', title: 'Moradia familiar em Ponta Delgada', description: 'Casa luminosa com jardim e espaço para conciliar trabalho e família.', locationText: 'Ponta Delgada, Ilha de São Miguel, Açores', lat: 37.750, lng: -25.670, propertyType: 'house', price: 489000, bedrooms: 3, bathrooms: 2, areaSqm: 167, images: [imagePorto], amenities: ['garden'] },
    { id: 'review-listing-funchal', title: 'Apartamento junto à costa no Funchal', description: 'Zona social aberta, varanda e vista para o Atlântico.', locationText: 'Funchal, Ilha da Madeira, Madeira', lat: 32.650, lng: -16.910, propertyType: 'apartment', price: 465000, bedrooms: 2, bathrooms: 2, areaSqm: 104, images: [imageAlgarve], hasBalcony: true },
    { id: 'review-listing-cascais', title: 'Apartamento perto do mar em Cascais', description: 'Casa acolhedora com varanda soalheira e planta funcional.', locationText: 'Cascais, Lisboa', lat: 38.697, lng: -9.423, propertyType: 'apartment', price: 599000, bedrooms: 2, bathrooms: 2, areaSqm: 108, images: [imageAlgarve] },
    { id: 'review-listing-matosinhos', title: 'Apartamento contemporâneo em Matosinhos', description: 'Dois quartos, muita luz natural e fácil acesso à costa.', locationText: 'Matosinhos, Porto', lat: 41.183, lng: -8.684, propertyType: 'apartment', price: 379000, bedrooms: 2, bathrooms: 2, areaSqm: 99, images: [imageRenovated] },
  ]
  sellers.push(...regionalListings.map((listing, index): ReviewSellerPost => ({
    yearBuilt: 2012, condition: 'good', floor: null, totalFloors: null,
    hasBalcony: false, hasCentralHeating: true, amenities: [], isActive: true,
    createdAt: daysAgo(5 + index), updatedAt: daysAgo(5 + index), seller, ...listing,
  })))

  const buyers: ReviewBuyerPost[] = [
    {
      id: 'review-request-lisbon', title: 'Procuro apartamento luminoso para a família',
      description: 'Estamos prontos para comprar e procuramos casa perto de jardins e transportes públicos. Uma varanda seria ideal.',
      locationText: 'Lisboa, Lisboa', lat: 38.722, lng: -9.139, radiusKm: 12, propertyType: 'apartment',
      priceMin: 350000, priceMax: 550000, bedroomsMin: 2, bathroomsMin: 2, areaSqmMin: 90,
      yearBuiltMin: null, conditions: ['good', 'renovated', 'new'], floorMin: null, floorMax: null,
      requiresBalcony: true, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(3), updatedAt: daysAgo(3), buyer,
    },
    {
      id: 'review-request-own', title: 'Moradia com espaço para crescer',
      description: 'Procuramos uma casa com três quartos, jardim e bons acessos.',
      locationText: 'Braga, Braga', lat: 41.550, lng: -8.423, radiusKm: 20, propertyType: 'house',
      priceMin: 280000, priceMax: 430000, bedroomsMin: 3, bathroomsMin: 2, areaSqmMin: 120,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: true, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(1), updatedAt: daysAgo(1), buyer: me,
    },
    {
      id: 'review-request-braga-other', title: 'Procuro moradia T3 em Braga',
      description: 'Prontos para comprar uma casa prática perto do centro de Braga.',
      locationText: 'Braga, Braga', lat: 41.551, lng: -8.422, radiusKm: 15, propertyType: 'house',
      priceMin: 300000, priceMax: 410000, bedroomsMin: 3, bathroomsMin: 2, areaSqmMin: 130,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: true, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(5), updatedAt: daysAgo(5), buyer,
    },
    {
      id: 'review-request-land', title: 'Terreno para uma casa pequena perto do mar',
      description: 'Procuramos terreno para construção perto de Lagos.',
      locationText: 'Lagos, Faro', lat: 37.103, lng: -8.675, radiusKm: 25, propertyType: 'land',
      priceMin: 80000, priceMax: 250000, bedroomsMin: 0, bathroomsMin: 0, areaSqmMin: 400,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(11), updatedAt: daysAgo(11), buyer,
    },
    {
      id: 'review-request-almada', title: 'Apartamento T2 em Almada',
      description: 'Procuramos uma casa confortável perto de transportes, com espaço para trabalhar.',
      locationText: 'Almada, Setúbal', lat: 38.678, lng: -9.158, radiusKm: 10, propertyType: 'apartment',
      priceMin: 280000, priceMax: 420000, bedroomsMin: 2, bathroomsMin: 1, areaSqmMin: 80,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(6), updatedAt: daysAgo(6), buyer,
    },
    {
      id: 'review-request-funchal', title: 'Apartamento com espaço exterior no Funchal',
      description: 'Procuramos um apartamento luminoso com varanda e uma planta prática para viver todo o ano.',
      locationText: 'Funchal, Ilha da Madeira, Madeira', lat: 32.650, lng: -16.910, radiusKm: 15, propertyType: 'apartment',
      priceMin: 340000, priceMax: 510000, bedroomsMin: 2, bathroomsMin: 2, areaSqmMin: 85,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: true, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(8), updatedAt: daysAgo(8), buyer,
    },
    {
      id: 'review-request-azores', title: 'Moradia com jardim perto de Ponta Delgada',
      description: 'Procuramos uma moradia com três quartos e espaço exterior em São Miguel.',
      locationText: 'Ponta Delgada, Ilha de São Miguel, Açores', lat: 37.750, lng: -25.670, radiusKm: 20, propertyType: 'house',
      priceMin: 350000, priceMax: 530000, bedroomsMin: 3, bathroomsMin: 2, areaSqmMin: 130,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: ['garden'],
      isActive: true, createdAt: daysAgo(13), updatedAt: daysAgo(13), buyer,
    },
    {
      id: 'review-request-workspace', title: 'Pequeno espaço comercial em Aveiro',
      description: 'Procuramos um espaço versátil ao nível da rua para atelier ou negócio independente.',
      locationText: 'Aveiro, Aveiro', lat: 40.640, lng: -8.654, radiusKm: 12, propertyType: 'commercial',
      priceMin: 180000, priceMax: 320000, bedroomsMin: 0, bathroomsMin: 1, areaSqmMin: 85,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: true, createdAt: daysAgo(17), updatedAt: daysAgo(17), buyer,
    },
    {
      id: 'review-request-archived', title: 'Pesquisa de apartamento arquivada',
      description: 'Critérios arquivados, visíveis apenas para o autor.',
      locationText: 'Porto, Porto', lat: 41.149, lng: -8.611, radiusKm: 8, propertyType: 'apartment',
      priceMin: 180000, priceMax: 310000, bedroomsMin: 1, bathroomsMin: 1, areaSqmMin: 60,
      yearBuiltMin: null, conditions: null, floorMin: null, floorMax: null,
      requiresBalcony: null, requiresCentralHeating: null, requiredAmenities: [],
      isActive: false, createdAt: daysAgo(80), updatedAt: daysAgo(6), buyer: me,
    },
  ]

  const conversations: ReviewConversation[] = role === 'seller' ? [{
    id: 'review-conversation-1', buyerPost: buyers[0], sellerPost: null, buyer, seller: me,
    messages: [
      { id: 'review-message-1', sender: me, body: 'Olá Miguel, tenho um imóvel que pode corresponder aos seus critérios.', createdAt: daysAgo(1) },
      { id: 'review-message-2', sender: buyer, body: 'Obrigado, gostava de saber mais.', createdAt: now() },
    ],
    createdAt: daysAgo(1),
  }] : [{
    id: 'review-conversation-1', buyerPost: null, sellerPost: sellers[0], buyer: me, seller,
    messages: [
      { id: 'review-message-1', sender: me, body: 'Olá Sofia, o apartamento na Estrela ainda está disponível?', createdAt: daysAgo(1) },
      { id: 'review-message-2', sender: seller, body: 'Sim, está. Terei gosto em responder a qualquer pergunta.', createdAt: now() },
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
