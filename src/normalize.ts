const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}

export function normalizeIdentifier(value: string): string {
  return EVM_ADDRESS.test(value) ? value.toLowerCase() : value;
}

export function chainFromAssetId(assetId: string): string {
  const slash = assetId.indexOf('/');
  return slash === -1 ? '' : assetId.slice(0, slash);
}

export function x402AssetId(network: string, asset: string): string {
  if (network.startsWith('eip155:')) {
    if (!EVM_ADDRESS.test(asset)) throw new TypeError('EVM x402 assets must be 20-byte addresses.');
    return `${network}/erc20:${asset.toLowerCase()}`;
  }

  if (!/^[A-Za-z0-9._%:-]{1,128}$/.test(asset)) {
    throw new TypeError('x402 asset cannot be represented as a portable asset identifier.');
  }
  return `${network}/token:${asset}`;
}
