import { faker } from "@faker-js/faker";
import db, {
  type NewInvestorLead,
  type NewLead,
  investorLeads,
  leads,
} from "../index";

const INVESTOR_LEAD_STATUSES = [
  "RAW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "REJECTED",
] as const;

const LEAD_STATUSES = ["NEW", "PROCESSED", "DUPLICATE", "REJECTED"] as const;

const INFERRED_TYPES = ["HNWI", "FAMILY_OFFICE", "INSTITUTION"] as const;

async function main() {
  const investorLeadRows: NewInvestorLead[] = Array.from({ length: 100 }, () => ({
    name: faker.person.fullName(),
    source: faker.company.name(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    inferredType: faker.helpers.maybe(() => faker.helpers.arrayElement(INFERRED_TYPES), {
      probability: 0.7,
    }),
    notes: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(INVESTOR_LEAD_STATUSES),
  }));

  const leadRows: NewLead[] = Array.from({ length: 100 }, () => ({
    sourceWebsite: faker.internet.url(),
    externalListingId: `seed-${faker.string.uuid()}`,
    rawTitle: faker.company.catchPhrase(),
    rawDescription: faker.commerce.productDescription(),
    rawIndustry: faker.commerce.department(),
    revenue: faker.number.float({ min: 0.5, max: 50, fractionDigits: 2 }),
    ebitda: faker.number.float({ min: 0.1, max: 15, fractionDigits: 2 }),
    askingPrice: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
    brokerage: faker.company.name(),
    brokerFirstName: faker.person.firstName(),
    brokerLastName: faker.person.lastName(),
    brokerEmail: faker.internet.email(),
    brokerPhone: faker.phone.number(),
    normalizedCompanyName: faker.company.name(),
    companyLocation: faker.location.city(),
    status: faker.helpers.arrayElement(LEAD_STATUSES),
  }));

  await db.insert(investorLeads).values(investorLeadRows);
  await db.insert(leads).values(leadRows);

  console.log(`Seeded 100 InvestorLeads and 100 Leads.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
