import React, { useEffect, useState } from 'react';
import ReactDataSheet from 'react-datasheet';
import { Box, Flex } from 'rebass';
import numbro from 'numbro';
import dayjs from 'dayjs';
import {
  coinGeckoV3Endpoint, numToPercent, numToDollars,
  roundNumToInteger,
} from '../util';

const onContextMenu = (e, cell) => {
  if (cell.readOnly) {
    e.preventDefault();
  }
};

const getMarketCharts = (params, currency) => {
  params.append('vs_currency', currency);

  return global.fetch(`${coinGeckoV3Endpoint}/coins/binancecoin/market_chart?${params.toString()}`, {
    mode: 'cors',
  });
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
    circulatingSupply: parseFloat(json.market_data.circulating_supply),
    totalVolumeUsd: json.market_data.total_volume.usd,
    currentPriceUsd: json.market_data.current_price.usd,
  });
};

const fetchBNBHistoricalData = async (setBinanceData) => {
  const params = new URLSearchParams();

  params.append('days', '365');

  const usdTask = getMarketCharts(params, 'usd');
  const bnbTask = getMarketCharts(params, 'bnb');
  const usdRes = await usdTask;
  const bnbRes = await bnbTask;
  const usdJson = await usdRes.json();
  const bnbJson = await bnbRes.json();

  const annualVolumeBnb = bnbJson.total_volumes.reduce((prev, current) => prev + current[1], 0);
  const bnbVolumeAnually = usdJson.total_volumes.reduce((prev, current) => prev + current[1], 0);
  const averageTotalVolumeDaily = usdJson.total_volumes.reduce(
    (prev, current, i) => prev + (current[1] * usdJson.prices[i][1]),
    0,
  ) / usdJson.total_volumes.length;

  setBinanceData({
    annualVolumeBnb,
    bnbVolumeAnually,
    averageTotalVolumeDaily,
  });
};

const bnbStakedForReferalBonus = 500;
const transactionFeeRate = 0.002;
const annualBnbBurn = 8000000;
const annualVolumeLogMultiplier = 1.5;

const mapBnbDiscounts = (year) => {
  let value;

  const date = dayjs().add(year, 'year');

  if (date.isAfter('2018-07-20')) {
    value = 0.25;
  }

  if (date.isAfter('2019-07-20')) {
    value = 0.125;
  }

  if (date.isAfter('2020-07-20')) {
    value = 0.0675;
  }

  if (date.isAfter('2021-07-20')) {
    value = 0;
  }

  return { value };
};

const SpreadSheet = () => {
  const [{
    totalSupply,
    circulatingSupply,
    totalVolumeUsd,
    currentPriceUsd,
  }, setBnbData] = useState({});
  const [{
    annualVolumeBnb,
    bnbVolumeAnually,
    averageTotalVolumeDaily,
  }, setBnbHistoricalData] = useState({});
  const [hasLoadedData, setHadLoadedData] = useState();

  useEffect(() => {
    const task1 = fetchBnbData(setBnbData);
    const task2 = fetchBNBHistoricalData(setBnbHistoricalData);

    Promise.all([task1, task2]).then(() => {
      setHadLoadedData(true);
    });
  }, []);

  if (!hasLoadedData) return null;

  const yearsArray = [0, 1, 2, 3, 4, 5];
  const totalSupplies = yearsArray.map(year => ({
    value: totalSupply - (year * annualBnbBurn),
  }));
  const circulatingSupplies = totalSupplies.reduce((prev, current, i) => {
    if (i === 0) {
      prev.push({ value: circulatingSupply });

      return prev;
    }

    const difference = totalSupplies[i - 1].value - current.value;
    const value = prev[i - 1].value + difference;

    prev.push({ value: value >= current.value ? current.value : value });

    return prev;
  }, []);
  const usersStakedForReferalBonusArray = yearsArray.map(() => ({ value: 10000 }));
  const coinsInStakeAfterReferalBonusArray = usersStakedForReferalBonusArray
    .map(stake => ({ value: stake.value * bnbStakedForReferalBonus }));
  const tokensInFloatAfterStakersArray = circulatingSupplies.map((cS, i) => ({
    value: cS.value - coinsInStakeAfterReferalBonusArray[i].value,
  }));
  const averageTotalVolumeArray = yearsArray.map((year, i) => {
    if (i === 0) {
      return { value: averageTotalVolumeDaily };
    }

    return {
      value: averageTotalVolumeDaily * ((1 + Math.log(year)) * annualVolumeLogMultiplier),
    };
  });
  const bnbDiscounts = yearsArray.map(mapBnbDiscounts);
  const transactionFeeSavedDailyArray = averageTotalVolumeArray
    .map((atv, i) => ({ value: atv.value * transactionFeeRate * bnbDiscounts[i].value }));
  const transactionFeeSavedAnnualyArray = transactionFeeSavedDailyArray
    .map(tFSA => ({ value: tFSA.value * 365 }));
  const totalVolumeDailyArray = yearsArray.map((year, i) => {
    if (i === 0) {
      return { value: totalVolumeUsd };
    }

    return {
      value: totalVolumeUsd * ((1 + Math.log(year)) * annualVolumeLogMultiplier),
    };
  });
  const bnbVolumeAnnualyArray = totalVolumeDailyArray
    .map((tVD, i) => {
      if (i === 0) {
        return { value: bnbVolumeAnually };
      }

      return {
        value: tVD.value * 365,
      };
    });
  const totalEconomicValueDerivedFromBnb = bnbVolumeAnnualyArray
    .map((bVA, i) => ({ value: bVA.value + transactionFeeSavedAnnualyArray[i].value }));
  const bnbGdpFromDiscountsArray = transactionFeeSavedAnnualyArray
    .map((tFSA, i) => ({ value: tFSA.value / totalEconomicValueDerivedFromBnb[i].value }));
  const bnbGdpFromTransactionVolumeArray = bnbVolumeAnnualyArray
    .map((bVA, i) => ({ value: bVA.value / totalEconomicValueDerivedFromBnb[i].value }));
  const currentVelocity = annualVolumeBnb / tokensInFloatAfterStakersArray[0].value;
  const monetaryBaseRequiredForBnbGdpArray = totalEconomicValueDerivedFromBnb
    .map(tEVDFB => ({ value: tEVDFB.value / currentVelocity }));
  const currentUtilityValuePerBnbInFloatArray = monetaryBaseRequiredForBnbGdpArray
    .map((mBRfBG, i) => ({ value: mBRfBG.value / tokensInFloatAfterStakersArray[i].value }));
  const premiumOverCurrentUtility = currentPriceUsd
    - currentUtilityValuePerBnbInFloatArray[0].value;
  const premiumOverCurrentUtilityPercent = premiumOverCurrentUtility
    / currentUtilityValuePerBnbInFloatArray[0].value;

  const valuationData = [
    [
      { value: 'Date', readOnly: true },
      ...yearsArray.map(year => ({
        value: year === 0 ? 'Today' : dayjs().add(year, 'year').format('DD/MM/YY'), readOnly: true,
      })),
    ],
    [{ value: 'Coin Supply', colSpan: 2, readOnly: true }],
    [
      { value: 'Total Supply' },
      ...totalSupplies,
    ],
    [
      { value: 'Circulating Supply' },
      ...circulatingSupplies.map(cS => ({ value: roundNumToInteger(cS.value) })),
    ],
    [
      { value: 'Users Staked for Referal Bonus' },
      ...usersStakedForReferalBonusArray,
    ],
    [
      { value: 'Coins Staked for Referal Bonus' },
      ...coinsInStakeAfterReferalBonusArray,
    ],
    [
      { value: 'Tokens in Float after Stakers' },
      ...tokensInFloatAfterStakersArray,
    ],
    [{ value: 'Economic Activity', colSpan: 2, readOnly: true }],
    [
      { value: 'Average Total Volume (daily)' },
      ...averageTotalVolumeArray.map(aT => ({ value: numToDollars(aT.value) })),
    ],
    [
      { value: 'Transaction Fee Rate (Maker + Taker)' },
      ...yearsArray.map(() => ({ value: numToPercent(transactionFeeRate) })),
    ],
    [
      { value: 'BNB Discount' },
      ...bnbDiscounts.map(bD => ({ value: numToPercent(bD.value) })),
    ],
    [
      { value: 'Transaction Fee Saved (daily)' },
      ...transactionFeeSavedDailyArray.map(tFSD => ({ value: numToDollars(tFSD.value) })),
    ],
    [
      { value: 'Transaction Fee Saved (annual)' },
      ...transactionFeeSavedAnnualyArray.map(tFSA => ({ value: numToDollars(tFSA.value) })),
    ],
    [
      { value: 'BNB Volume (daily)' },
      ...totalVolumeDailyArray.map(tVD => ({ value: numToDollars(tVD.value) })),
    ],
    [
      { value: 'BNB Volume (annual)' },
      ...bnbVolumeAnnualyArray.map(bVA => ({ value: numToDollars(bVA.value) })),
    ],
    [
      { value: 'Total Economic Value Derived from BNB' },
      ...totalEconomicValueDerivedFromBnb.map(tEVDFB => ({ value: numToDollars(tEVDFB.value) })),
    ],
    [
      { value: 'BNB GDP from Discounts' },
      ...bnbGdpFromDiscountsArray.map(bGFD => ({ value: numToPercent(bGFD.value) })),
    ],
    [
      { value: 'BNB GDP from Tx Volume' },
      ...bnbGdpFromTransactionVolumeArray.map(bGFTV => ({ value: numToPercent(bGFTV.value) })),
    ],
    [{ value: 'Utility Value', colSpan: 2, readOnly: true }],
    [
      { value: 'Monetary Base Required for BNB GDP' },
      ...monetaryBaseRequiredForBnbGdpArray.map(mBRFBD => ({ value: numToDollars(mBRFBD.value) })),
    ],
    [
      { value: 'Current Utility Value per BNB in Float' },
      ...currentUtilityValuePerBnbInFloatArray
        .map(cUVPBIF => ({ value: numToDollars(cUVPBIF.value) })),
    ],
  ];

  const valuationSummaryData = [
    [{ value: 'Valuation Summary', colSpan: 2, readOnly: true }],
    [{ value: 'Current BNB Price' }, { value: numToDollars(currentPriceUsd) }],
    [{ value: 'Premium over Current Utility' }, { value: numToDollars(premiumOverCurrentUtility) }],
    [{ value: 'Premium over Current Utility (%)' }, { value: numToPercent(premiumOverCurrentUtilityPercent) }],
    [{ value: 'Backcalculated Coins in Float' }, { value: numToPercent(premiumOverCurrentUtilityPercent) }],
    [{ value: 'Annual Volume (BNB)' }, { value: roundNumToInteger(annualVolumeBnb) }],
  ];

  const assumptionsData = [
    [{ value: 'Assumptions', colSpan: 2, readOnly: true }],
    [{ value: 'Volume Growth Type' }, { value: 'Logarithmic' }],
    [{ value: 'Annual Volume Log Multiplier' }, { value: annualVolumeLogMultiplier }],
    [{ value: 'Current Velocity' }, { value: numbro(currentVelocity).format({ mantissa: 1 }) }],
    [{ value: 'BNB Staked for Referal Bonus' }, { value: bnbStakedForReferalBonus }],
    [{ value: 'Annual BNB Burn' }, { value: annualBnbBurn }],
  ];

  return (
    <React.Fragment>
      <Flex justifyContent="center" mb={30}>
        <ReactDataSheet
          data={valuationData}
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
