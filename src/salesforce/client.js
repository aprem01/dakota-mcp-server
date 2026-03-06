const API_VERSION = 'v59.0';

export class SalesforceClient {
  constructor(accessToken, instanceUrl) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
    this.baseUrl = `${instanceUrl}/services/data/${API_VERSION}`;
  }

  async query(soql) {
    const url = `${this.baseUrl}/query?q=${encodeURIComponent(soql)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    await this._handleErrors(response);
    return response.json();
  }

  async getRecord(sobject, recordId, fields) {
    const fieldsParam = fields ? `?fields=${fields.join(',')}` : '';
    const url = `${this.baseUrl}/sobjects/${sobject}/${recordId}${fieldsParam}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    await this._handleErrors(response);
    return response.json();
  }

  async search(sosl) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(sosl)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    await this._handleErrors(response);
    return response.json();
  }

  async composite(requests) {
    const url = `${this.baseUrl}/composite`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allOrNone: false,
        compositeRequest: requests.map((req, i) => ({
          method: req.method || 'GET',
          url: req.url.startsWith('/') ? req.url : `/${req.url}`,
          referenceId: req.referenceId || `ref_${i}`,
          ...(req.body && { body: req.body }),
        })),
      }),
    });

    await this._handleErrors(response);
    return response.json();
  }

  async _handleErrors(response) {
    if (response.ok) return;

    const status = response.status;
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    if (status === 401) {
      const err = new Error('Salesforce authentication expired');
      err.code = 'SF_AUTH_EXPIRED';
      err.status = 401;
      throw err;
    }

    if (status === 403) {
      const err = new Error(
        "You don't have access to this record. Check your Salesforce sharing rules."
      );
      err.code = 'SF_ACCESS_DENIED';
      err.status = 403;
      throw err;
    }

    const err = new Error(
      `Salesforce API error (${status}): ${JSON.stringify(body)}`
    );
    err.code = 'SF_API_ERROR';
    err.status = status;
    throw err;
  }
}
