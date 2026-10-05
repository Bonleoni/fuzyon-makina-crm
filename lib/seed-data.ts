import type { LeadStatus, SectorValue } from "@/lib/lead-constants";

export type SeedContact = {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
};

export type SeedCompany = {
  name: string;
  country: string;
  city: string;
  sector: SectorValue;
  website: string;
  industryFocus: string;
  productPortfolio: string;
  companySize: string;
  contacts: SeedContact[];
  lead: {
    status: LeadStatus;
    aiScore: number;
    notes: string;
  };
};

/** Development seed — 3 gerçekçi DACH distribütör adayı */
export const SEED_COMPANIES: SeedCompany[] = [
  {
    name: "Bayern Food Process GmbH",
    country: "DE",
    city: "München",
    sector: "food",
    website: "https://www.bayern-food-process-example.de",
    industryFocus: "Süt ürünleri ve sos üretimi için proses ekipmanları",
    productPortfolio:
      "Paslanmaz çelik depolama tankları, karıştırıcılı proses tankları, CIP sistemleri",
    companySize: "51-200",
    contacts: [
      {
        fullName: "Thomas Berger",
        email: "t.berger@bayern-food-process-example.de",
        phone: "+49 89 4512300",
        jobTitle: "Einkaufsleiter",
      },
      {
        fullName: "Julia Hoffmann",
        email: "j.hoffmann@bayern-food-process-example.de",
        phone: "+49 89 4512301",
        jobTitle: "Prozessingenieurin",
      },
    ],
    lead: {
      status: "new",
      aiScore: 78,
      notes:
        "Münih merkezli gıda proses distribütörü. Paslanmaz tank talebi yüksek görünüyor.",
    },
  },
  {
    name: "Alpine Pharma Solutions AG",
    country: "CH",
    city: "Zürich",
    sector: "pharma",
    website: "https://www.alpine-pharma-solutions-example.ch",
    industryFocus: "İlaç ve biyoteknoloji tesisleri için hijyenik proses ekipmanı",
    productPortfolio:
      "Farmakope uyumlu paslanmaz tanklar, steril depolama, sıcaklık kontrollü sistemler",
    companySize: "11-50",
    contacts: [
      {
        fullName: "Sophie Keller",
        email: "s.keller@alpine-pharma-solutions-example.ch",
        phone: "+41 44 5566770",
        jobTitle: "Procurement Manager",
      },
      {
        fullName: "Luca Meier",
        email: "l.meier@alpine-pharma-solutions-example.ch",
        phone: "+41 44 5566771",
        jobTitle: "Technical Buyer",
      },
    ],
    lead: {
      status: "contacted",
      aiScore: 86,
      notes:
        "İlk Almanca tanıtım e-postası gönderildi. GMP odaklı tank çözümlerine ilgi var.",
    },
  },
  {
    name: "Donau Chemie Technik GmbH",
    country: "AT",
    city: "Wien",
    sector: "chemical",
    website: "https://www.donau-chemie-technik-example.at",
    industryFocus: "Kimya endüstrisi için proses ve depolama çözümleri",
    productPortfolio:
      "Asit/alkali dayanımlı paslanmaz tanklar, karıştırmalı reaktör tankları, transfer sistemleri",
    companySize: "51-200",
    contacts: [
      {
        fullName: "Anna Hofbauer",
        email: "a.hofbauer@donau-chemie-technik-example.at",
        phone: "+43 1 8901122",
        jobTitle: "Sales Director",
      },
    ],
    lead: {
      status: "replied",
      aiScore: 74,
      notes:
        "Müşteri yanıt verdi; teknik spesifikasyon ve kapasite bilgisi istedi.",
    },
  },
];
