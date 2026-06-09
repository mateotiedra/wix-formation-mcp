// ── Credentials ──────────────────────────────────────────────────────────

export interface Credentials {
  token: string;
  siteId: string;
}

// ── Wix API response shapes ─────────────────────────────────────────────

export interface WixService {
  id: string;
  name: string;
  type: string;
  hidden: boolean;
  defaultCapacity: number;
  schedule?: {
    firstSessionStart?: string;
    lastSessionEnd?: string;
  };
  payment?: {
    fixed?: { price?: { value?: string; currency?: string } };
    varied?: { defaultPrice?: { value?: string; currency?: string } };
  };
}

export interface WixBooking {
  id: string;
  status: string;
  createdDate: string;
  contactDetails: {
    contactId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  bookedEntity: {
    title?: string;
    serviceId?: string;
    schedule?: {
      scheduleId?: string;
      firstSessionStart?: string;
      lastSessionEnd?: string;
      location?: { name?: string };
    };
  };
  bookedAddOns?: Array<{ name?: string }>;
  paymentStatus?: string;
}

// ── Tool output types ───────────────────────────────────────────────────

export interface ServiceOutput {
  id: string;
  name: string;
  type: string;
  hidden: boolean;
  firstSessionStart: string;
  lastSessionEnd: string;
  defaultCapacity: number;
  price: string;
}

export interface FormationOutput {
  scheduleId: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  rawCount: number;
}

export interface CourseOutput {
  id: string;
  name: string;
  type: string;
  hidden: boolean;
  defaultCapacity: number;
  price: string;
  location: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  rawCount: number;
}

export interface ParticipantOutput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  paymentStatus: string;
  addOns: string[];
}

export interface SearchResultOutput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courseTitle: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  addOns: string[];
}
