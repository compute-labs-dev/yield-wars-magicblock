/*
    This file contains functions for fetching assets
    for Solana UI components
*/
import { PublicKey } from "@solana/web3.js";
import { FetchAssetsArgs } from "./types";

/**
 * Fetches token asset data from Birdeye API for a list of token addresses
 * @param args - Object containing fetch parameters
 * @param args.addresses - Array of token mint addresses to fetch data for
 * @param args.owner - Optional wallet address to fetch token balances for
 * @param args.connection - Optional web3 connection (required if fetching SOL balance)
 * @returns Array of SolAsset objects containing token data
 * @example
 * const assets = await fetchAssets({
 *   addresses: [new PublicKey("So11111111111111111111111111111111111111112")],
 *   owner: new PublicKey("..."),
 *   connection: new Connection("...")
 * });
 */
const fetchAssets = async ({
  addresses,
}: FetchAssetsArgs): Promise<{
    value: number;
    priceChange24h: number;
}> => {
  const addressList = addresses.map((a: PublicKey) => a.toString()).join(",");
  const headers = {
    "x-api-key": '578d5987166844fc952765b1d7d3959b',
  };

  try {


    const responses = await fetch(
        `https://public-api.birdeye.so/defi/price?address=${addressList}`,
        {
          headers,
        },
      )

    const pricesRes = await responses.json();

    const prices = pricesRes.data;
    const value = prices.value;
    const priceChange24h = prices.priceChange24h;

    return {
        value,
        priceChange24h,
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    return {
        value: 0,
        priceChange24h: 0,
    }
  }
};

  export { fetchAssets };