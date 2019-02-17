import numbro from 'numbro';

export const coinGeckoBaseEndpoint = 'https://api.coingecko.com';
export const coinGeckoV3Endpoint = `${coinGeckoBaseEndpoint}/api/v3`;
export const numToPercent = num => numbro(num).format({ output: 'percent', mantissa: 1 });
export const numToDollars = num => numbro(num).formatCurrency();
export const roundNumToInteger = (num, mantissa = 0) => numbro(num).format({ mantissa });
