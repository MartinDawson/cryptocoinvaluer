import React, { useEffect, useState } from 'react';
import ReactDataSheet from 'react-datasheet';
import { Box, Flex } from 'rebass';
import {
  coinGeckoV3Endpoint, numToPercent, numToDollars,
  clampNumToInteger,
} from '../util';

const onContextMenu = (e, cell) => {
  if (cell.readOnly) {
    e.preventDefault();
  }
};

const fetchBnbData = async (setBnbData) => {
  const params = new URLSearchParams();

  params.append('localization', 'false');
  params.append('tickers', 'false');
  params.append('community_data', 'false');
  params.append('developer_data', 'false');
  params.append('sparkline', 'false');

  const res = await global.fetch(`${coinGeckoV3Endpoint}/coins/binancecoin?${params.toString()}`, {
    mode: 'cors',
  });
  const json = await res.json();

  setBnbData({
    totalSupply: json.market_data.total_supply,
    circulatingSupply: json.market_data.circulating_supply,
    totalVolumeUsd: json.market_data.total_volume.usd,
    currentPriceUsd: json.market_data.current_price.usd,
  });
};

const fetchBinanceData = async (setBinanceData) => {
  const res = await global.fetch(`${coinGeckoV3Endpoint}/exchanges/binance`, {
    mode: 'cors',
  });
  const json = await res.json();
  const btcPrice = json.tickers.find(x => x.base === 'BTC').last;

  setBinanceData({
    averageTotalVolumeDaily: json.trade_volume_24h_btc * btcPrice,
  });
};

const usersStakedForReferalBonus = 10000;
const coinsStakedForReferalBonus = 5000000;
const transactionFeeRate = 0.002;
// TODO Implement this dynamically based on dates changed
const bnbDiscount = 0.25;
// TODO change to actual volume
const annualVolumeBnb = 2660927825;
// TODO get actual velocity
const inititalVelocity = 19.1;

const SpreadSheet = () => {
  const [bnbData, setBnbData] = useState({});
  const [binanceData, setBinanceData] = useState({});
  const tokensInFloatAfterStakers = bnbData.circulatingSupply - coinsStakedForReferalBonus;
  const transactionFeeSavedDaily = binanceData.averageTotalVolumeDaily
    * transactionFeeRate * bnbDiscount;
  const transactionFeeSavedAnnualy = transactionFeeSavedDaily * 365;
  // TODO change to actual volume
  const bnbVolumeAnually = bnbData.totalVolumeUsd * 365;
  const totalEconomicValueDerivedFromBnb = bnbVolumeAnually + transactionFeeSavedAnnualy;
  const bnbGdpFromDiscounts = transactionFeeSavedAnnualy / totalEconomicValueDerivedFromBnb;
  const bnbGdpFromTransactionVolume = bnbVolumeAnually / totalEconomicValueDerivedFromBnb;
  const monetaryBaseRequiredForBnbGdp = totalEconomicValueDerivedFromBnb / inititalVelocity;
  const backcalculatedCoinsInFloat = totalEconomicValueDerivedFromBnb
    / (bnbData.currentPriceUsd) * inititalVelocity;
  const numCoinsInFloatOfCirculatingCoins = backcalculatedCoinsInFloat / bnbData.circulatingSupply;
  const numCoinsHODL = numCoinsInFloatOfCirculatingCoins * 0.99;
  const currenUtilityValuePerBnbInFloat = monetaryBaseRequiredForBnbGdp / tokensInFloatAfterStakers;
  const premiumOverCurrentUtility = bnbData.currentPriceUsd - currenUtilityValuePerBnbInFloat;
  const premiumOverCurrentUtilityPercent = premiumOverCurrentUtility
    / currenUtilityValuePerBnbInFloat;

  const data = [
    [{ value: 'Year', readOnly: true }, { value: 'Today', readOnly: true }],
    [{ value: 'Coin Supply', colSpan: 2, readOnly: true }],
    [{ value: 'Total Supply' }, { value: bnbData.totalSupply }],
    [{ value: 'Circulating Supply' }, { value: clampNumToInteger(bnbData.circulatingSupply) }],
    [{ value: 'Users Staked for Referal Bonus' }, { value: usersStakedForReferalBonus }],
    [{ value: 'Coins Staked for Referal Bonus' }, { value: coinsStakedForReferalBonus }],
    [{ value: 'Tokens in Float after Stakers' }, { value: tokensInFloatAfterStakers }],
    [{ value: 'Economic Activity', colSpan: 2, readOnly: true }],
    [{ value: 'Average Total Volume (daily)' }, { value: numToDollars(binanceData.averageTotalVolumeDaily) }],
    [{ value: 'Transaction Fee Rate (Maket + Taker)' }, { value: numToPercent(transactionFeeRate) }],
    [{ value: 'BNB Discount' }, { value: numToPercent(bnbDiscount) }],
    [{ value: 'Transaction Fee Saved (daily)' }, { value: numToDollars(transactionFeeSavedDaily) }],
    [{ value: 'Transaction Fee Saved (annual)' }, { value: numToDollars(transactionFeeSavedAnnualy) }],
    [{ value: 'BNB Volume (daily)' }, { value: numToDollars(bnbData.totalVolumeUsd) }],
    [{ value: 'BNB Volume (annual)' }, { value: numToDollars(bnbVolumeAnually) }],
    [{ value: 'Total Economic Value Derived from BNB' }, { value: numToDollars(totalEconomicValueDerivedFromBnb) }],
    [{ value: 'BNB GDP from Discounts' }, { value: numToPercent(bnbGdpFromDiscounts) }],
    [{ value: 'BNB GDP from Tx Volume' }, { value: numToPercent(bnbGdpFromTransactionVolume) }],
    [{ value: 'Utility Value', colSpan: 2, readOnly: true }],
    [{ value: 'Monetary Base Required for BNB GDP' }, { value: numToDollars(monetaryBaseRequiredForBnbGdp) }],
    [{ value: 'Current Utility Value per BNB in Float' }, { value: numToDollars(currenUtilityValuePerBnbInFloat) }],
  ];

  const valuationSummaryData = [
    [{ value: 'Valuation Summary', colSpan: 2, readOnly: true }],
    [{ value: 'Current BNB Price' }, { value: numToDollars(bnbData.currentPriceUsd) }],
    [{ value: 'Premium over Current Utility' }, { value: numToDollars(premiumOverCurrentUtility) }],
    [{ value: 'Premium over Current Utility (%)' }, { value: numToPercent(premiumOverCurrentUtilityPercent) }],
    [{ value: 'Backcalculated Coins in Float' }, { value: clampNumToInteger(backcalculatedCoinsInFloat) }],
    [{ value: '% Coins in Float of Circulating Coins' }, { value: numToPercent(numCoinsInFloatOfCirculatingCoins) }],
    [{ value: '% Coins HODL\'d' }, { value: numToPercent(numCoinsHODL) }],
    [{ value: 'Annual Volume (BNB)' }, { value: clampNumToInteger(annualVolumeBnb) }],
  ];

  const assumptionsData = [
    [{ value: 'Assumptions', colSpan: 2, readOnly: true }],
    [{ value: 'Volume Growth Type' }, { value: 'Logarithmic' }],
    [{ value: 'Annual Volume Log Multiplier' }, { value: 3 }],
    [{ value: 'Initial Velocity' }, { value: inititalVelocity }],
    [{ value: 'BNB Staked for Referal Bonus' }, { value: 500 }],
    [{ value: 'Annual BNB Burn' }, { value: 8000000 }],
    [{ value: 'Discount Rate' }, { value: numToPercent(0.2) }],
  ];

  useEffect(() => {
    fetchBnbData(setBnbData);
    fetchBinanceData(setBinanceData);
  }, []);

  return (
    <React.Fragment>
      <Flex justifyContent="center" mb={30}>
        <ReactDataSheet
          data={data}
          valueRenderer={cell => cell.value}
          onContextMenu={onContextMenu}
        />
      </Flex>
      <Flex justifyContent="center">
        <Box mr={10}>
          <ReactDataSheet
            data={valuationSummaryData}
            valueRenderer={cell => cell.value}
            onContextMenu={onContextMenu}
          />
        </Box>
        <Box ml={10}>
          <ReactDataSheet
            data={assumptionsData}
            valueRenderer={cell => cell.value}
            onContextMenu={onContextMenu}
          />
        </Box>
      </Flex>
    </React.Fragment>
  );
};

export default SpreadSheet;
