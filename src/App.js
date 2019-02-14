import React from 'react';
import styled from 'styled-components';
import {
  Flex, Heading, Image, Box, Text, Link,
} from 'rebass';
import binanceLogo from './images/binance-coin-logo.png';
import SpreadSheet from './spreadSheet';
import 'react-datasheet/lib/react-datasheet.css';

const Container = styled.div`
  background-color: #282c34;
  min-height: 100vh;
  color: white;
`;

const CustomLink = styled(Link)`
  color: white;
`;

const App = () => (
  <Container>
    <Flex pt={20} flexDirection="column" alignItems="center">
      <Image
        src={binanceLogo}
        width={60}
        mb={20}
      />
      <Heading mb={20} fontSize={20}>BNB Equation of exchange (MV=PQ)</Heading>
      <Text>
        All data calculations were inspired and
        taken from
        <CustomLink
          target="_blank"
          href="https://medium.com/@Rewkang/an-in-depth-valuation-analysis-of-binance-coin-bnb-fairly-valued-and-a-potential-store-of-61e828b93f53"
        >
          &nbsp;this great medium article&nbsp;
        </CustomLink>
        by Andrew Kang.
      </Text>
    </Flex>
    <Box p={20}>
      <SpreadSheet />
    </Box>
    <Text mt={20} fontSize={12} textAlign="center">
      This is not financial advice and you should not rely on this solely
      to make your investment decisions. Do your own research.
      We will not be held responsible for any investment losses you make.
    </Text>
  </Container>
);

export default App;
