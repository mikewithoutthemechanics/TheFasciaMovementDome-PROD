
import { Venue, Class, Registration, Template, ReferralStat, Instructor } from './types';

// Hardcoded instructor - Zelda
export const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: "instructor-zelda",
    name: "Zelda",
    email: "zelda@tfmd.com",
    phone: "+27 82 123 4567",
    bio: "Lead fascia movement instructor specializing in foot and ankle mobility. Certified in functional movement and myofascial release techniques.",
    specialties: ["General", "Hiking", "Running", "Yoga", "Pilates"],
    active: true
  }
];

export const MOCK_VENUES: Venue[] = [
  { 
    id: "v1", 
    name: "The Fascia Movement Dome", 
    address: "The Fascia Movement Dome", 
    suburb: "Dolphin Coast", 
    mapsUrl: "https://www.google.com/maps/place/The+Fascia+Movement+Dome/data=!4m2!3m1!1s0x0:0x3c7c14c1ae4dbe7d?sa=X&ved=1t:2428&ictx=111", 
    notes: "Parking available on-site. Arrive 10 minutes early.",
    capacity: 20
  }
];

export const MOCK_CLASSES: Class[] = [
  {
    id: "c-discovery", slug: "discovery-class-sat-mar-07", title: "Discovery Class",
    dateTime: "2026-03-07T10:00:00", duration: 90, venueId: "v1", instructorId: "instructor-zelda",
    sportTags: ["General", "Yoga", "Pilates"], bodyAreaTags: ["Full Body", "Feet", "Hips"],
    capacity: 20, registered: 0, status: "published",
    price: 0, creditCost: 0,
    description: "Experience The Fascia Movement Dome with our complimentary Discovery Class. A gentle introduction to fascia-focused movement in our heated environment. Perfect for first-timers. Spaces limited - book now!",
  },
  {
    id: "c1", slug: "happy-feet-sat-feb-28", title: "Happy Feet - Regenerate and Hydrate",
    dateTime: "2026-02-28T09:00:00", duration: 180, venueId: "v1", instructorId: "instructor-zelda",
    sportTags: ["General", "Hiking", "Running"], bodyAreaTags: ["Feet", "Ankles", "Calves"],
    capacity: 15, registered: 8, status: "published",
    price: 150, creditCost: 1,
    description: "Restore the bounce in your step. We focus on hydrating the connective tissue in your feet and calves to improve balance, reduce stiffness, and help you move with ease. Simple movements, profound relief.",
  },
  {
    id: "c2", slug: "happy-feet-sun-mar-01", title: "Happy Feet - Regenerate and Hydrate",
    dateTime: "2026-03-01T09:00:00", duration: 180, venueId: "v1", instructorId: "instructor-zelda",
    sportTags: ["General", "Hiking", "Running"], bodyAreaTags: ["Feet", "Ankles", "Calves"],
    capacity: 15, registered: 12, status: "published",
    price: 150, creditCost: 1,
    description: "Restore the bounce in your step. We focus on hydrating the connective tissue in your feet and calves to improve balance, reduce stiffness, and help you move with ease. Simple movements, profound relief.",
  }
];

export const MOCK_REGISTRATIONS: Registration[] = [
  { id: "r1", classId: "c1", userId: "u2", userName: "James Venter", userEmail: "james@example.com", userSport: "Running", bodyAreas: ["Feet"], referredBy: null, status: "confirmed", paymentStatus: "paid", registeredAt: "2026-02-10" },
  { id: "r2", classId: "c1", userId: "u3", userName: "Keegan Smith", userEmail: "keegan@example.com", userSport: "General", bodyAreas: ["Ankles"], referredBy: "u2", status: "registered", paymentStatus: "paid", registeredAt: "2026-02-11" },
  { id: "r3", classId: "c2", userId: "u4", userName: "Nadia Botha", userEmail: "nadia@example.com", userSport: "Hiking", bodyAreas: ["Feet"], referredBy: "u2", status: "confirmed", paymentStatus: "paid", registeredAt: "2026-02-12" },
  { id: "r4", classId: "c2", userId: "u5", userName: "Ryan Hendricks", userEmail: "ryan@example.com", userSport: "Running", bodyAreas: ["Calves"], referredBy: "u3", status: "registered", paymentStatus: "pending", registeredAt: "2026-02-13" },
];

export const MOCK_TEMPLATES: Template[] = [
  { 
    id: "t1", 
    name: "General / Happy Feet", 
    sportTags: ["General", "Hiking", "Running"], 
    bodyAreaTags: ["Feet", "Ankles"], 
    active: true, 
    whatsappBody: `Hey! 🦶 I'm going to this 'Happy Feet' workshop at The Barrel.\n\nIt's all about hydrating the fascia in your feet and calves. If you've been feeling stiff or just want to move better, this is perfect. No complicated jargon, just good movement.\n\nI'm going on {{class_date}}.\n\nJoin me here: {{invite_link}}`, 
    emailSubject: "Treat your feet? (Invited by {{referrer_first_name}})", 
    emailBody: "Join me at the dome." 
  },
  { 
    id: "t2", 
    name: "Running", 
    sportTags: ["Running", "Trail Running"], 
    bodyAreaTags: ["Feet", "Knees", "IT Band"], 
    active: true, 
    whatsappBody: `🏃‍♂️ Quick one — I'm heading to a fascia workshop for runners on {{class_date}}.\n\nThey focus on the stuff we always complain about: plantar fasciitis, IT bands, and tight calves. \n\nCome through? It's at {{venue_name}}.\n\nGrab a spot before it fills up: {{invite_link}}`, 
    emailSubject: "Running pain free (Invited by {{referrer_first_name}})", 
    emailBody: "Run better." 
  },
];

export const REFERRAL_STATS: ReferralStat[] = [
  { userId: "u2", name: "James Venter", sport: "Running", totalReferrals: 8, thisMonth: 3, classesAttended: 4 },
  { userId: "u3", name: "Keegan Smith", sport: "General", totalReferrals: 5, thisMonth: 2, classesAttended: 3 },
  { userId: "u4", name: "Nadia Botha", sport: "Hiking", totalReferrals: 3, thisMonth: 1, classesAttended: 1 },
];
