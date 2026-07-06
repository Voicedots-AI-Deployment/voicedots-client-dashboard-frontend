// ================= TYPES =================
export interface Conversation {
  id: string
  title: string
  avatar: string
  initials: string
  cost: number
  messages: number
  status: 'successful' | 'error'
  lastActive: string
  date: string // ISO date string for sorting
}

export interface Message {
  id: string
  conversationId: string
  sender: 'bot' | 'user'
  content: string
  timestamp: string
  cost?: number
}

// ================= CONVERSATIONS =================
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1601kfmpshb0fmb9skrek2b9m485',
    title: 'Hello? Hello? Hello? Hello?',
    avatar: 'VD',
    initials: 'VD',
    cost: 0.0044,
    messages: 7,
    status: 'successful', // ✅ user + bot present
    lastActive: '44 sec ago',
    date: '2025-01-16T10:00:00Z',
  },
  {
    id: 'conv_2101kffjh6rxeagrg2d2bjdjg0at',
    title: 'I think we can talk about it briefly',
    avatar: 'VD',
    initials: 'VD',
    cost: 0.015,
    messages: 21,
    status: 'successful', // ✅ user + bot present
    lastActive: '3 mins ago',
    date: '2025-01-21T12:00:00Z',
  },
  {
    id: 'conv_error_demo',
    title: 'Silent call',
    avatar: 'VD',
    initials: 'VD',
    cost: 0,
    messages: 1,
    status: 'error', // ❌ no meaningful exchange
    lastActive: '2 days ago',
    date: '2025-01-10T09:30:00Z',
  },
]

// ================= MESSAGES =================
export const MOCK_MESSAGES: Message[] = [
  // -------- Conversation 1 --------
  {
    id: 'm1',
    conversationId: 'conv_1601kfmpshb0fmb9skrek2b9m485',
    sender: 'bot',
    content: 'Hello! I am Lead Voice Ambassador of voicedots. How can I help you?',
    timestamp: '00:00',
    cost: 0.0003,
  },
  {
    id: 'm2',
    conversationId: 'conv_1601kfmpshb0fmb9skrek2b9m485',
    sender: 'user',
    content: 'Hello? Hello? Hello? Hello?',
    timestamp: '00:09',
  },
  {
    id: 'm3',
    conversationId: 'conv_1601kfmpshb0fmb9skrek2b9m485',
    sender: 'bot',
    content: 'Hello! I am here to assist you. How may I help you today?',
    timestamp: '00:15',
    cost: 0.0011,
  },

  // -------- Conversation 2 --------
  {
    id: 'm4',
    conversationId: 'conv_2101kffjh6rxeagrg2d2bjdjg0at',
    sender: 'user',
    content: 'I think we can talk about it briefly.',
    timestamp: '00:17',
  },
  {
    id: 'm5',
    conversationId: 'conv_2101kffjh6rxeagrg2d2bjdjg0at',
    sender: 'bot',
    content: 'Of course, I am here to help. What would you like to discuss?',
    timestamp: '00:22',
    cost: 0.0025,
  },
  {
    id: 'm6',
    conversationId: 'conv_2101kffjh6rxeagrg2d2bjdjg0at',
    sender: 'user',
    content: 'MBA की fees कितनी है?',
    timestamp: '01:31',
  },
  {
    id: 'm7',
    conversationId: 'conv_2101kffjh6rxeagrg2d2bjdjg0at',
    sender: 'bot',
    content:
      'MBA programs की annual fees लगभग ₹1,10,000 से ₹1,50,000 तक होती है.',
    timestamp: '01:36',
    cost: 0.0034,
  },
]

// ================= ANALYTICS (KEEP EXPORT!) =================
export const ANALYTICS_DATA = {
  totalConversations: 124,
  totalCost: 48.5,
  totalMessages: 1429,
  avgCost: 3.91,
  costHistory: [
    { day: 'Mon', cost: 120 },
    { day: 'Tue', cost: 145 },
    { day: 'Wed', cost: 132 },
    { day: 'Thu', cost: 180 },
    { day: 'Fri', cost: 210 },
    { day: 'Sat', cost: 95 },
    { day: 'Sun', cost: 85 },
  ],
  messageVolume: [
    { day: 'Mon', messages: 340 },
    { day: 'Tue', messages: 410 },
    { day: 'Wed', messages: 380 },
    { day: 'Thu', messages: 520 },
    { day: 'Fri', messages: 580 },
    { day: 'Sat', messages: 210 },
    { day: 'Sun', messages: 190 },
  ],
}
