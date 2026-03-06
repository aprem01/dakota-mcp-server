const API_VERSION = 'v59.0';

/**
 * Builds composite API request objects for multi-entity fetches.
 * Each builder returns an array of subrequest objects for the Composite API.
 */

export function buildFundManagerComposite(recordId) {
  return [
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/sobjects/Account/${recordId}`,
      referenceId: 'manager',
    },
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        `SELECT Id, Name, Strategy__c, Vintage_Year__c, Fund_Size__c, Status__c FROM Fund__c WHERE Manager__c = '${recordId}' ORDER BY Vintage_Year__c DESC`
      )}`,
      referenceId: 'funds',
    },
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        `SELECT Id, FirstName, LastName, Email, Phone, Title FROM Contact WHERE AccountId = '${recordId}' ORDER BY LastName`
      )}`,
      referenceId: 'contacts',
    },
  ];
}

export function buildAllocatorComposite(recordId) {
  return [
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/sobjects/Account/${recordId}`,
      referenceId: 'allocator',
    },
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        `SELECT Id, FirstName, LastName, Email, Phone, Title FROM Contact WHERE AccountId = '${recordId}' ORDER BY LastName`
      )}`,
      referenceId: 'contacts',
    },
  ];
}

export function buildFundComposite(recordId) {
  return [
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/sobjects/Fund__c/${recordId}`,
      referenceId: 'fund',
    },
    {
      method: 'GET',
      url: `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        `SELECT Id, Name, Type, Website FROM Account WHERE Id IN (SELECT Manager__c FROM Fund__c WHERE Id = '${recordId}')`
      )}`,
      referenceId: 'manager',
    },
  ];
}

export function parseCompositeResponse(compositeResult) {
  const parsed = {};
  for (const subResponse of compositeResult.compositeResponse) {
    if (subResponse.httpStatusCode >= 200 && subResponse.httpStatusCode < 300) {
      parsed[subResponse.referenceId] = subResponse.body;
    } else {
      parsed[subResponse.referenceId] = {
        error: true,
        status: subResponse.httpStatusCode,
        body: subResponse.body,
      };
    }
  }
  return parsed;
}
