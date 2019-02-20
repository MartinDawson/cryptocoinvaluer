import React, { useEffect, useState } from 'react';
import ReactDataSheet from 'react-datasheet';
import { Box, Flex } from 'rebass';
import numbro from 'numbro';
import dayjs from 'dayjs';
import classnames from 'classnames';
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

const transactionFeeRate = 0.002;

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

const getSheetRenderer = tableClassName => ({ className, children }) => (
  <table className={classnames(tableClassName, className)}>
    <tbody>
      {children}
    </tbody>
  </table>
);

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
  const [assumptions, setAssumptions] = useState({
    bnbStakedForReferalBonus: 500,
    annualBnbBurn: 8000000,
    annualVolumeLogMultiplier: 1.5,
  });
  const [assumptionsData, setAssumptionsData] = useState([
    [{ value: 'Assumptions', header: true, colSpan: 2, readOnly: true }],
    [{ value: 'Volume Growth Type', readOnly: true }, { value: 'Logarithmic' }],
    [{ value: 'Annual Volume Log Multiplier', readOnly: true }, { value: assumptions.annualVolumeLogMultiplier, key: 'annualVolumeLogMultiplier' }],
    [{ value: 'BNB Staked for Referal Bonus', readOnly: true }, { value: assumptions.bnbStakedForReferalBonus, key: 'bnbStakedForReferalBonus' }],
    [{ value: 'Annual BNB Burn', readOnly: true }, { value: assumptions.annualBnbBurn, key: 'annualBnbBurn' }],
  ]);

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
    value: totalSupply - (year * assumptions.annualBnbBurn),
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
    .map(stake => ({ value: stake.value * assumptions.bnbStakedForReferalBonus }));
  const tokensInFloatAfterStakersArray = circulatingSupplies.map((cS, i) => ({
    value: cS.value - coinsInStakeAfterReferalBonusArray[i].value,
  }));
  const averageTotalVolumeArray = yearsArray.map((year, i) => {
    if (i === 0) {
      return { value: averageTotalVolumeDaily };
    }

    return {
      value: averageTotalVolumeDaily * ((1 + Math.log(year))
        * assumptions.annualVolumeLogMultiplier),
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
      value: totalVolumeUsd * ((1 + Math.log(year)) * assumptions.annualVolumeLogMultiplier),
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
      { value: 'Date', readOnly: true, header: true },
      ...yearsArray.map(year => ({
        value: year === 0 ? 'Today' : dayjs().add(year, 'year').format('DD/MM/YY'), readOnly: true, header: true,
      })),
    ],
    [{ value: 'Coin Supply', colSpan: yearsArray.length + 1, readOnly: true }],
    [
      { value: 'Total Supply', readOnly: true },
      ...totalSupplies,
    ],
    [
      { value: 'Circulating Supply', readOnly: true },
      ...circulatingSupplies.map(cS => ({ value: roundNumToInteger(cS.value) })),
    ],
    [
      { value: 'Users Staked for Referal Bonus', readOnly: true },
      ...usersStakedForReferalBonusArray,
    ],
    [
      { value: 'Coins Staked for Referal Bonus', readOnly: true },
      ...coinsInStakeAfterReferalBonusArray,
    ],
    [
      { value: 'Tokens in Float after Stakers', readOnly: true },
      ...tokensInFloatAfterStakersArray,
    ],
    [{ value: 'Economic Activity', header: true, colSpan: yearsArray.length + 1, readOnly: true }],
    [
      { value: 'Average Total Volume (daily)', readOnly: true },
      ...averageTotalVolumeArray.map(aT => ({ value: numToDollars(aT.value) })),
    ],
    [
      { value: 'Transaction Fee Rate (Maker + Taker)', readOnly: true },
      ...yearsArray.map(() => ({ value: numToPercent(transactionFeeRate) })),
    ],
    [
      { value: 'BNB Discount', readOnly: true },
      ...bnbDiscounts.map(bD => ({ value: numToPercent(bD.value) })),
    ],
    [
      { value: 'Transaction Fee Saved (daily)', readOnly: true },
      ...transactionFeeSavedDailyArray.map(tFSD => ({ value: numToDollars(tFSD.value) })),
    ],
    [
      { value: 'Transaction Fee Saved (annual)', readOnly: true },
      ...transactionFeeSavedAnnualyArray.map(tFSA => ({ value: numToDollars(tFSA.value) })),
    ],
    [
      { value: 'BNB Volume (daily)', readOnly: true },
      ...totalVolumeDailyArray.map(tVD => ({ value: numToDollars(tVD.value) })),
    ],
    [
      { value: 'BNB Volume (annual)', readOnly: true },
      ...bnbVolumeAnnualyArray.map(bVA => ({ value: numToDollars(bVA.value) })),
    ],
    [
      { value: 'Total Economic Value Derived from BNB', readOnly: true },
      ...totalEconomicValueDerivedFromBnb.map(tEVDFB => ({ value: numToDollars(tEVDFB.value) })),
    ],
    [
      { value: 'BNB GDP from Discounts', readOnly: true },
      ...bnbGdpFromDiscountsArray.map(bGFD => ({ value: numToPercent(bGFD.value) })),
    ],
    [
      { value: 'BNB GDP from Tx Volume', readOnly: true },
      ...bnbGdpFromTransactionVolumeArray.map(bGFTV => ({ value: numToPercent(bGFTV.value) })),
    ],
    [{ value: 'Utility Value', header: true, colSpan: yearsArray.length + 1, readOnly: true }],
    [
      { value: 'Monetary Base Required for BNB GDP', readOnly: true },
      ...monetaryBaseRequiredForBnbGdpArray.map(mBRFBD => ({ value: numToDollars(mBRFBD.value) })),
    ],
    [
      { value: 'Current Utility Value per BNB in Float', readOnly: true },
      ...currentUtilityValuePerBnbInFloatArray
        .map(cUVPBIF => ({ value: numToDollars(cUVPBIF.value) })),
    ],
  ];

  const valuationSummaryData = [
    [{ value: 'Valuation Summary', header: true, colSpan: 2, readOnly: true }],
    [{ value: 'Current BNB Price', readOnly: true }, { value: numToDollars(currentPriceUsd) }],
    [{ value: 'Premium over Current Utility', readOnly: true }, { value: numToDollars(premiumOverCurrentUtility) }],
    [{ value: 'Premium over Current Utility (%)', readOnly: true }, { value: numToPercent(premiumOverCurrentUtilityPercent) }],
    [{ value: 'Backcalculated Coins in Float', readOnly: true }, { value: numToPercent(premiumOverCurrentUtilityPercent) }],
    [{ value: 'Current Velocity', readOnly: true }, { value: numbro(currentVelocity).format({ mantissa: 1 }) }],
    [{ value: 'Annual Volume (BNB)', readOnly: true }, { value: roundNumToInteger(annualVolumeBnb) }],
  ];

  return (
    <React.Fragment>
      <Flex justifyContent="center" mb={30}>
        <ReactDataSheet
          data={valuationData}
          valueRenderer={cell => cell.value}
          onContextMenu={onContextMenu}
          sheetRenderer={getSheetRenderer('valuationTable')}
        />
      </Flex>
      <Flex justifyContent="center">
        <Box mr={10}>
          <ReactDataSheet
            data={valuationSummaryData}
            valueRenderer={cell => cell.value}
            onContextMenu={onContextMenu}
            sheetRenderer={getSheetRenderer('valuationSummaryTable')}
          />
        </Box>
        <Box ml={10}>
          <ReactDataSheet
            data={assumptionsData}
            valueRenderer={cell => cell.value}
            onContextMenu={onContextMenu}
            sheetRenderer={getSheetRenderer('assumptionTable')}
            onCellsChanged={(changes) => {
              const newAssumptions = {
                ...assumptions,
              };
              const newAssumptionsData = assumptionsData.map(row => [...row]);

              changes.forEach(({ row, col, value, cell }) => {
                newAssumptions[cell.key] = parseFloat(value);
                newAssumptionsData[row][col] = { ...newAssumptionsData[row][col], value };
              });

              setAssumptions(newAssumptions);
              setAssumptionsData(newAssumptionsData);
            }}
          />
        </Box>
      </Flex>
    </React.Fragment>
  );
};

export default SpreadSheet;
