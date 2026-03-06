import { searchFundManagersDefinition, searchFundManagersHandler } from './searchFundManagers.js';
import { getFundManagerDefinition, getFundManagerHandler } from './getFundManager.js';
import { searchAllocatorsDefinition, searchAllocatorsHandler } from './searchAllocators.js';
import { getAllocatorDefinition, getAllocatorHandler } from './getAllocator.js';
import { searchFundsDefinition, searchFundsHandler } from './searchFunds.js';
import { getFundDefinition, getFundHandler } from './getFund.js';
import { getContactsDefinition, getContactsHandler } from './getContacts.js';
import { searchMarketplaceDefinition, searchMarketplaceHandler } from './searchMarketplace.js';

const TOOLS = [
  { def: searchFundManagersDefinition, handler: searchFundManagersHandler },
  { def: getFundManagerDefinition, handler: getFundManagerHandler },
  { def: searchAllocatorsDefinition, handler: searchAllocatorsHandler },
  { def: getAllocatorDefinition, handler: getAllocatorHandler },
  { def: searchFundsDefinition, handler: searchFundsHandler },
  { def: getFundDefinition, handler: getFundHandler },
  { def: getContactsDefinition, handler: getContactsHandler },
  { def: searchMarketplaceDefinition, handler: searchMarketplaceHandler },
];

export function createToolRegistry() {
  const definitions = TOOLS.map(({ def }) => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
  }));

  const handlers = Object.fromEntries(
    TOOLS.map(({ def, handler }) => [def.name, handler])
  );

  return { definitions, handlers, TOOLS };
}
