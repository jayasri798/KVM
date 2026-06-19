import { generateE2EKeyPair, exportKeyPairToJwk } from "./crypto";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  publicKeyJwk?: JsonWebKey;
  privateKeyJwk?: JsonWebKey; // Pre-populated for simulation switching
}

export interface Comment {
  id: string;
  username: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  hasLiked: boolean;
  timestamp: string;
  comments: Comment[];
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  wrappedKey: string;     // RSA-encrypted AES key
  iv: string;             // AES IV
  ciphertext: string;     // AES-encrypted text
  aesKeyHex?: string;     // Transmitted metadata (for debugger visibility)
  timestamp: string;
}

export const INITIAL_USERS: User[] = [
  {
    id: "user-ammu",
    username: "ammu",
    displayName: "Amareswar (Ammu)",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-kalyan",
    username: "kalyan",
    displayName: "Kalyan Kumar",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-siri",
    username: "siri",
    displayName: "Siri Vardhan",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-pranavi",
    username: "pranavi",
    displayName: "Pranavi Reddy",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: "post-1",
    userId: "user-ammu",
    username: "ammu",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    caption: "Designed the new dashboard using a premium Charcoal and Mint Green aesthetic. What do you guys think? 🍵⚙️",
    likesCount: 142,
    hasLiked: false,
    timestamp: "2 hours ago",
    comments: [
      {
        id: "c-1",
        username: "kalyan",
        userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=face",
        text: "Clean styling! The charcoal tones feel so premium compared to typical interfaces.",
        timestamp: "1h ago",
      },
      {
        id: "c-2",
        username: "siri",
        userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
        text: "Absolutely stunning! The contrast is perfect.",
        timestamp: "45m ago",
      },
    ],
  },
  {
    id: "post-2",
    userId: "user-kalyan",
    username: "kalyan",
    userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    caption: "Seeking total peace and digital privacy in a hyper-connected world. 🌊🛡️ #KAM #Matladuko",
    likesCount: 98,
    hasLiked: false,
    timestamp: "5 hours ago",
    comments: [
      {
        id: "c-3",
        username: "pranavi",
        userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        text: "E2EE is the way forward. Looking forward to chatting in the safe house!",
        timestamp: "3h ago",
      },
    ],
  },
  {
    id: "post-3",
    userId: "user-siri",
    username: "siri",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    caption: "Minimalist architecture has a unique voice. Quiet but powerful. 🏛️✨",
    likesCount: 215,
    hasLiked: false,
    timestamp: "1 day ago",
    comments: [
      {
        id: "c-4",
        username: "ammu",
        userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
        text: "The geometry of this shot is incredible. Mind-blowing architecture.",
        timestamp: "20h ago",
      },
    ],
  },
];

/**
 * Dynamically generates keys for mock users so they can perform E2EE immediately
 */
export async function setupMockUsersKeys(): Promise<User[]> {
  const usersWithKeys = await Promise.all(
    INITIAL_USERS.map(async (user) => {
      // Avoid regenerating if keys already exist (though this is typically run once)
      try {
        const keyPair = await generateE2EKeyPair();
        const jwks = await exportKeyPairToJwk(keyPair);
        return {
          ...user,
          publicKeyJwk: jwks.publicKey,
          privateKeyJwk: jwks.privateKey,
        };
      } catch (err) {
        console.error("Failed to generate keys for mock user", user.username, err);
        return user;
      }
    })
  );
  return usersWithKeys;
}

/**
 * Seed direct messages between users.
 * They will be dynamically encrypted on app start once users keys are generated
 */
export const MOCK_MESSAGE_TEXTS = [
  { from: "kalyan", to: "ammu", text: "Hey Ammu! Did you check out the new cryptography specs?" },
  { from: "ammu", to: "kalyan", text: "Yes! Hybrid encryption with RSA-OAEP wrapping AES-GCM is super fast." },
  { from: "kalyan", to: "ammu", text: "Awesome. I love that the private keys never leave our devices!" },
  { from: "siri", to: "ammu", text: "Hello! Are we meeting up today for the review?" },
  { from: "ammu", to: "siri", text: "Hey Siri, yes. Let's chat in KAM Direct. It's fully E2EE." },
];
