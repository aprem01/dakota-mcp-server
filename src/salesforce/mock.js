/**
 * Mock Salesforce data and client for local testing.
 * Activate by setting USE_MOCK=true in .env
 */

const MANAGERS = [
  { Id: 'MGR001', Name: 'Apex Capital Partners', AUM__c: 12500, Strategy__c: 'Private Equity', BillingCity: 'New York', BillingState: 'NY', BillingCountry: 'United States', Website: 'https://apexcapital.com', Description: 'Global PE firm focused on mid-market buyouts', Phone: '212-555-0100', Industry: 'Financial Services', RecordType: { Name: 'Fund Manager' } },
  { Id: 'MGR002', Name: 'Horizon Ventures', AUM__c: 3200, Strategy__c: 'Venture Capital', BillingCity: 'San Francisco', BillingState: 'CA', BillingCountry: 'United States', Website: 'https://horizonvc.com', Description: 'Early-stage tech VC firm', Phone: '415-555-0200', Industry: 'Technology', RecordType: { Name: 'Fund Manager' } },
  { Id: 'MGR003', Name: 'Redstone Real Assets', AUM__c: 8700, Strategy__c: 'Real Estate', BillingCity: 'London', BillingState: null, BillingCountry: 'United Kingdom', Website: 'https://redstonera.com', Description: 'European real estate and infrastructure', Phone: '+44-20-7555-0300', Industry: 'Real Estate', RecordType: { Name: 'Fund Manager' } },
  { Id: 'MGR004', Name: 'BluePeak Hedge Advisors', AUM__c: 5400, Strategy__c: 'Hedge Fund', BillingCity: 'Greenwich', BillingState: 'CT', BillingCountry: 'United States', Website: 'https://bluepeak.com', Description: 'Multi-strategy hedge fund', Phone: '203-555-0400', Industry: 'Financial Services', RecordType: { Name: 'Fund Manager' } },
  { Id: 'MGR005', Name: 'Sakura Growth Partners', AUM__c: 2100, Strategy__c: 'Growth Equity', BillingCity: 'Tokyo', BillingState: null, BillingCountry: 'Japan', Website: 'https://sakuragrowth.jp', Description: 'Asia-focused growth equity', Phone: '+81-3-5555-0500', Industry: 'Financial Services', RecordType: { Name: 'Fund Manager' } },
];

const ALLOCATORS = [
  { Id: 'ALC001', Name: 'California State Teachers Retirement', Allocator_Type__c: 'Pension', AUM__c: 320000, BillingCity: 'Sacramento', BillingState: 'CA', BillingCountry: 'United States', Website: 'https://calstrs.com', Description: 'Second-largest public pension fund in the US', Phone: '916-555-1000', RecordType: { Name: 'Allocator' } },
  { Id: 'ALC002', Name: 'Harvard Management Company', Allocator_Type__c: 'Endowment', AUM__c: 50600, BillingCity: 'Boston', BillingState: 'MA', BillingCountry: 'United States', Website: 'https://hmc.harvard.edu', Description: 'Manages Harvard University endowment', Phone: '617-555-2000', RecordType: { Name: 'Allocator' } },
  { Id: 'ALC003', Name: 'Norges Bank Investment Management', Allocator_Type__c: 'Sovereign Wealth Fund', AUM__c: 1400000, BillingCity: 'Oslo', BillingState: null, BillingCountry: 'Norway', Website: 'https://nbim.no', Description: 'Manages Norway Government Pension Fund Global', Phone: '+47-2255-0300', RecordType: { Name: 'Allocator' } },
  { Id: 'ALC004', Name: 'Walton Family Foundation', Allocator_Type__c: 'Foundation', AUM__c: 8200, BillingCity: 'Bentonville', BillingState: 'AR', BillingCountry: 'United States', Website: 'https://waltonfamilyfoundation.org', Description: 'Major US philanthropic foundation', Phone: '479-555-4000', RecordType: { Name: 'Allocator' } },
  { Id: 'ALC005', Name: 'Meridian Family Office', Allocator_Type__c: 'Family Office', AUM__c: 1500, BillingCity: 'Zurich', BillingState: null, BillingCountry: 'Switzerland', Website: 'https://meridianfo.ch', Description: 'European multi-family office', Phone: '+41-44-555-5000', RecordType: { Name: 'Allocator' } },
];

const FUNDS = [
  { Id: 'FND001', Name: 'Apex Capital Fund VII', Strategy__c: 'Buyout', Vintage_Year__c: 2024, Fund_Size__c: 4500, Status__c: 'Fundraising', Target_Size__c: 5000, Description__c: 'Mid-market buyout fund targeting North America', Manager__c: 'MGR001', Manager__r: { Id: 'MGR001', Name: 'Apex Capital Partners' } },
  { Id: 'FND002', Name: 'Apex Capital Fund VI', Strategy__c: 'Buyout', Vintage_Year__c: 2021, Fund_Size__c: 3800, Status__c: 'Closed', Target_Size__c: 3500, Description__c: 'Mid-market buyout fund', Manager__c: 'MGR001', Manager__r: { Id: 'MGR001', Name: 'Apex Capital Partners' } },
  { Id: 'FND003', Name: 'Horizon Early Stage Fund III', Strategy__c: 'Venture Capital', Vintage_Year__c: 2023, Fund_Size__c: 800, Status__c: 'Open', Target_Size__c: 1000, Description__c: 'Seed and Series A investments in enterprise SaaS', Manager__c: 'MGR002', Manager__r: { Id: 'MGR002', Name: 'Horizon Ventures' } },
  { Id: 'FND004', Name: 'Redstone European Property Fund IV', Strategy__c: 'Real Estate', Vintage_Year__c: 2024, Fund_Size__c: 2200, Status__c: 'Fundraising', Target_Size__c: 3000, Description__c: 'Pan-European commercial real estate', Manager__c: 'MGR003', Manager__r: { Id: 'MGR003', Name: 'Redstone Real Assets' } },
  { Id: 'FND005', Name: 'BluePeak Multi-Strategy Fund II', Strategy__c: 'Hedge Fund', Vintage_Year__c: 2022, Fund_Size__c: 1800, Status__c: 'Open', Target_Size__c: 2000, Description__c: 'Global multi-strategy hedge fund', Manager__c: 'MGR004', Manager__r: { Id: 'MGR004', Name: 'BluePeak Hedge Advisors' } },
  { Id: 'FND006', Name: 'Sakura Asia Growth Fund I', Strategy__c: 'Growth Equity', Vintage_Year__c: 2023, Fund_Size__c: 600, Status__c: 'Open', Target_Size__c: 750, Description__c: 'Growth equity in Japan and Southeast Asia', Manager__c: 'MGR005', Manager__r: { Id: 'MGR005', Name: 'Sakura Growth Partners' } },
];

const CONTACTS = [
  { Id: 'CON001', FirstName: 'James', LastName: 'Mitchell', Email: 'jmitchell@apexcapital.com', Phone: '212-555-0101', Title: 'Managing Partner', Department: 'Investment', AccountId: 'MGR001', Account: { Name: 'Apex Capital Partners' }, MailingCity: 'New York', MailingState: 'NY' },
  { Id: 'CON002', FirstName: 'Sarah', LastName: 'Chen', Email: 'schen@apexcapital.com', Phone: '212-555-0102', Title: 'Partner', Department: 'Investment', AccountId: 'MGR001', Account: { Name: 'Apex Capital Partners' }, MailingCity: 'New York', MailingState: 'NY' },
  { Id: 'CON003', FirstName: 'David', LastName: 'Park', Email: 'dpark@horizonvc.com', Phone: '415-555-0201', Title: 'General Partner', Department: 'Investment', AccountId: 'MGR002', Account: { Name: 'Horizon Ventures' }, MailingCity: 'San Francisco', MailingState: 'CA' },
  { Id: 'CON004', FirstName: 'Emma', LastName: 'Williams', Email: 'ewilliams@redstonera.com', Phone: '+44-20-7555-0301', Title: 'Head of Acquisitions', Department: 'Real Estate', AccountId: 'MGR003', Account: { Name: 'Redstone Real Assets' }, MailingCity: 'London', MailingState: null },
  { Id: 'CON005', FirstName: 'Robert', LastName: 'Martinez', Email: 'rmartinez@calstrs.com', Phone: '916-555-1001', Title: 'Chief Investment Officer', Department: 'Investments', AccountId: 'ALC001', Account: { Name: 'California State Teachers Retirement' }, MailingCity: 'Sacramento', MailingState: 'CA' },
  { Id: 'CON006', FirstName: 'Lisa', LastName: 'Thompson', Email: 'lthompson@calstrs.com', Phone: '916-555-1002', Title: 'Director of Private Equity', Department: 'Alternatives', AccountId: 'ALC001', Account: { Name: 'California State Teachers Retirement' }, MailingCity: 'Sacramento', MailingState: 'CA' },
  { Id: 'CON007', FirstName: 'Michael', LastName: 'O\'Brien', Email: 'mobrien@hmc.harvard.edu', Phone: '617-555-2001', Title: 'VP of Alternative Investments', Department: 'Investment', AccountId: 'ALC002', Account: { Name: 'Harvard Management Company' }, MailingCity: 'Boston', MailingState: 'MA' },
  { Id: 'CON008', FirstName: 'Yuki', LastName: 'Tanaka', Email: 'ytanaka@sakuragrowth.jp', Phone: '+81-3-5555-0501', Title: 'Managing Director', Department: 'Investment', AccountId: 'MGR005', Account: { Name: 'Sakura Growth Partners' }, MailingCity: 'Tokyo', MailingState: null },
];

// Simple SOQL-like query parser for mock data
function matchesLike(value, pattern) {
  if (!value || !pattern) return false;
  const clean = pattern.replace(/%/g, '').toLowerCase();
  return String(value).toLowerCase().includes(clean);
}

function filterByConditions(records, soql) {
  return records.filter((r) => {
    // Name LIKE
    const nameMatch = soql.match(/Name LIKE '%(.+?)%'/);
    if (nameMatch && !matchesLike(r.Name, nameMatch[1])) return false;

    // Strategy
    const strategyMatch = soql.match(/Strategy__c = '(.+?)'/);
    if (strategyMatch && r.Strategy__c !== strategyMatch[1]) return false;

    // Allocator type
    const typeMatch = soql.match(/Allocator_Type__c = '(.+?)'/);
    if (typeMatch && r.Allocator_Type__c !== typeMatch[1]) return false;

    // AUM range
    const aumMin = soql.match(/AUM__c >= (\d+)/);
    if (aumMin && (r.AUM__c || 0) < Number(aumMin[1])) return false;
    const aumMax = soql.match(/AUM__c <= (\d+)/);
    if (aumMax && (r.AUM__c || 0) > Number(aumMax[1])) return false;

    // Fund size range
    const sizeMin = soql.match(/Fund_Size__c >= (\d+)/);
    if (sizeMin && (r.Fund_Size__c || 0) < Number(sizeMin[1])) return false;
    const sizeMax = soql.match(/Fund_Size__c <= (\d+)/);
    if (sizeMax && (r.Fund_Size__c || 0) > Number(sizeMax[1])) return false;

    // Vintage year
    const vintageMatch = soql.match(/Vintage_Year__c = (\d+)/);
    if (vintageMatch && r.Vintage_Year__c !== Number(vintageMatch[1])) return false;

    // Status
    const statusMatch = soql.match(/Status__c = '(.+?)'/);
    if (statusMatch && r.Status__c !== statusMatch[1]) return false;

    // Manager name (for fund search)
    const mgrNameMatch = soql.match(/Manager__r\.Name LIKE '%(.+?)%'/);
    if (mgrNameMatch && !matchesLike(r.Manager__r?.Name, mgrNameMatch[1])) return false;

    // AccountId (for contacts)
    const accountIdMatch = soql.match(/AccountId = '(.+?)'/);
    if (accountIdMatch && r.AccountId !== accountIdMatch[1]) return false;

    // Title LIKE (for contacts)
    const titleMatch = soql.match(/Title LIKE '%(.+?)%'/);
    if (titleMatch && !matchesLike(r.Title, titleMatch[1])) return false;

    // Manager__c (for fund by manager)
    const managerIdMatch = soql.match(/Manager__c = '(.+?)'/);
    if (managerIdMatch && r.Manager__c !== managerIdMatch[1]) return false;

    // RecordType filter
    if (soql.includes("RecordType.Name = 'Fund Manager'") && r.RecordType?.Name !== 'Fund Manager') return false;
    if (soql.includes("RecordType.Name = 'Allocator'") && r.RecordType?.Name !== 'Allocator') return false;

    // Location filters
    const billingMatch = soql.match(/BillingCountry LIKE '%(.+?)%'/);
    if (billingMatch) {
      const loc = billingMatch[1].toLowerCase();
      const inCity = matchesLike(r.BillingCity, loc);
      const inState = matchesLike(r.BillingState, loc);
      const inCountry = matchesLike(r.BillingCountry, loc);
      if (!inCity && !inState && !inCountry) return false;
    }

    // Location OR filter for allocators
    const locOrMatch = soql.match(/BillingCity LIKE '%(.+?)%' OR BillingState LIKE '%\1%' OR BillingCountry LIKE '%\1%'/);
    if (locOrMatch) {
      const loc = locOrMatch[1].toLowerCase();
      const inCity = matchesLike(r.BillingCity, loc);
      const inState = matchesLike(r.BillingState, loc);
      const inCountry = matchesLike(r.BillingCountry, loc);
      if (!inCity && !inState && !inCountry) return false;
    }

    return true;
  });
}

function extractLimit(soql) {
  const m = soql.match(/LIMIT (\d+)/i);
  return m ? Number(m[1]) : 25;
}

function detectObjectType(soql) {
  if (soql.includes('FROM Account')) return 'Account';
  if (soql.includes('FROM Fund__c')) return 'Fund__c';
  if (soql.includes('FROM Contact')) return 'Contact';
  return 'Unknown';
}

function getDataSet(objectType, soql) {
  if (objectType === 'Account') {
    if (soql.includes("RecordType.Name = 'Fund Manager'")) return MANAGERS;
    if (soql.includes("RecordType.Name = 'Allocator'")) return ALLOCATORS;
    return [...MANAGERS, ...ALLOCATORS];
  }
  if (objectType === 'Fund__c') return FUNDS;
  if (objectType === 'Contact') return CONTACTS;
  return [];
}

export class MockSalesforceClient {
  constructor() {
    this.accessToken = 'mock-token';
    this.instanceUrl = 'https://mock.salesforce.com';
  }

  async query(soql) {
    const objectType = detectObjectType(soql);
    const dataset = getDataSet(objectType, soql);
    const filtered = filterByConditions(dataset, soql);
    const limit = extractLimit(soql);
    const records = filtered.slice(0, limit);

    return {
      totalSize: records.length,
      done: true,
      records: records.map((r) => ({ ...r, attributes: { type: objectType } })),
    };
  }

  async getRecord(sobject, recordId) {
    let record;
    if (sobject === 'Account') {
      record = [...MANAGERS, ...ALLOCATORS].find((r) => r.Id === recordId);
    } else if (sobject === 'Fund__c') {
      record = FUNDS.find((r) => r.Id === recordId);
    } else if (sobject === 'Contact') {
      record = CONTACTS.find((r) => r.Id === recordId);
    }

    if (!record) {
      const err = new Error('Record not found');
      err.code = 'SF_API_ERROR';
      err.status = 404;
      throw err;
    }

    return { ...record, attributes: { type: sobject } };
  }

  async search(sosl) {
    // Parse FIND {term}
    const termMatch = sosl.match(/FIND \{(.+?)\}/);
    const term = termMatch ? termMatch[1].toLowerCase() : '';

    const allRecords = [
      ...MANAGERS.map((r) => ({ ...r, attributes: { type: 'Account' } })),
      ...ALLOCATORS.map((r) => ({ ...r, attributes: { type: 'Account' } })),
      ...FUNDS.map((r) => ({ ...r, attributes: { type: 'Fund__c' } })),
      ...CONTACTS.map((r) => ({ ...r, attributes: { type: 'Contact' } })),
    ];

    const searchRecords = allRecords.filter((r) => {
      const text = JSON.stringify(r).toLowerCase();
      return text.includes(term);
    });

    return { searchRecords };
  }

  async composite(requests) {
    const compositeResponse = [];

    for (const req of requests) {
      try {
        let body;
        const url = req.url;

        if (url.includes('/query?q=')) {
          const soql = decodeURIComponent(url.split('/query?q=')[1]);
          body = await this.query(soql);
        } else if (url.includes('/sobjects/')) {
          const parts = url.match(/\/sobjects\/(\w+)\/(\w+)/);
          if (parts) {
            body = await this.getRecord(parts[1], parts[2]);
          }
        }

        compositeResponse.push({
          httpStatusCode: 200,
          referenceId: req.referenceId,
          body: body || {},
        });
      } catch (err) {
        compositeResponse.push({
          httpStatusCode: err.status || 500,
          referenceId: req.referenceId,
          body: { message: err.message },
        });
      }
    }

    return { compositeResponse };
  }
}
