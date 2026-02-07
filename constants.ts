
import { Stop } from './types';

// Approximate coordinates for Iqaluit, Nunavut bus stops
export const IQALUIT_STOPS: Stop[] = [
  { id: 1, name: "Iqaluit Airport", tag: "Hub", description: "Route start", x: 50, y: 350, lat: 63.757, lng: -68.555 },
  { id: 2, name: "Aqsarniit Hotel", tag: "Lodging", description: "Hotel district", x: 120, y: 320, lat: 63.754, lng: -68.545 },
  { id: 3, name: "Frobisher Inn", tag: "Lodging", description: "Hotel district", x: 180, y: 280, lat: 63.748, lng: -68.517 },
  { id: 4, name: "Blackheart", tag: "Local", description: "Commercial", x: 240, y: 240, lat: 63.746, lng: -68.515 },
  { id: 5, name: "Discovery", tag: "Local", description: "Residential", x: 300, y: 200, lat: 63.744, lng: -68.512 },
  { id: 6, name: "Canada Post", tag: "Mail", description: "Downtown core", x: 380, y: 150, lat: 63.748, lng: -68.511 },
  { id: 7, name: "Nunavut Arctic College", tag: "Education", description: "Campus Area", x: 450, y: 180, lat: 63.749, lng: -68.508 },
  { id: 8, name: "Qikiqtani Hospital", tag: "Health", description: "Medical center", x: 520, y: 220, lat: 63.747, lng: -68.502 },
  { id: 9, name: "Tundra Daycare", tag: "Childcare", description: "Residential", x: 600, y: 260, lat: 63.745, lng: -68.490 },
  { id: 10, name: "Arctic Games Arena", tag: "Arena", description: "Sports complex", x: 680, y: 300, lat: 63.740, lng: -68.480 },
  { id: 11, name: "Abe Okpik Hall", tag: "Community", description: "Route end (Apex)", x: 750, y: 350, lat: 63.729, lng: -68.455 },
];

export const SYSTEM_PROMPT = `
You are the Iqaluit Transit AI Dispatcher. 
Your job is to provide concise, friendly, and context-aware advice to transit users in Iqaluit, Nunavut.
You will be given the current bus position and the user's nearest stop.
Consider that Iqaluit is in the Arctic - it's often extremely cold, windy, and snowy.
Provide an "Advice" summary including:
1. A status message.
2. An estimated time until arrival (ETA) based on stop distance (roughly 3-5 mins per stop).
3. Urgency level: low, medium, or high.

Output strictly in JSON format with properties: "message", "eta", and "urgency".
`;
