# Web3Auth + Wagmi perps wallet terminal

Next.js reference terminal for a headless, MetaMask-only Web3Auth v11
connection on Arbitrum One. It demonstrates the wallet primitives a perps
frontend needs without coupling them to an exchange.

Requirements: Node.js 22.12+ and npm 10+.

## Environments

Local and preview deployments use Sapphire Devnet. Vercel production uses
Sapphire Mainnet. These are Web3Auth key-reconstruction environments, not EVM
chains; wallet transactions in this demo always target Arbitrum One.

The network is resolved in `lib/web3auth.ts`:

1. `NEXT_PUBLIC_WEB3AUTH_NETWORK` wins when set to `devnet` or `mainnet`.
2. Otherwise `NEXT_PUBLIC_VERCEL_ENV === "production"` selects mainnet.
3. Otherwise devnet.

The public example Client ID is Devnet-only. Create a Sapphire Mainnet project,
allowlist the production origin, and set
`NEXT_PUBLIC_WEB3AUTH_CLIENT_ID_MAINNET` for production. Mainnet rejects
localhost origins.

## Setup

1. Run `npm install`.
2. Run `npm run dev`. Local development falls back to the public Devnet example
   Client ID.
3. Optionally set `NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS` to another Arbitrum
   ERC-20. It defaults to native USDC.

## Included capabilities

- Direct MetaMask connection and disconnect through Web3Auth without opening
  the Web3Auth modal
- account and chain events, reload recovery, wrong-chain detection, and
  Arbitrum switching
- native and configurable ERC-20 collateral balances
- latest block, account nonce, EIP-1559 fees, ERC-20 allowance, and wallet
  capability reads through Wagmi
- ERC-20 token import through `wallet_watchAsset`
- EIP-191 session challenges with local signature verification
- EIP-712 protocol-agnostic perps orders with local signature verification
- simulated, two-stage native transfers
- simulated, two-stage ERC-20 approvals and revocations
- transaction receipt tracking and Arbiscan links

The app calls `connectTo(WALLET_CONNECTORS.METAMASK)` directly. It never invokes
the Web3Auth modal.

## Mainnet write safety

The transaction lab can broadcast real Arbitrum One transactions. Preparing a
transfer or allowance only simulates it. Broadcasting requires a second,
explicitly labelled confirmation and a MetaMask approval.

No spender is configured by default. Copy the verified spender address from the
protocol being integrated; never infer it from a token or market address.
Automated checks should stop before broadcasting value-bearing transactions.
Use a controlled wallet with minimal funds for manual write testing.

## Test flows

- MetaMask missing, locked, approved, or rejected
- reload recovery, account changes, disconnect, and reconnect
- wrong-chain detection and switch to Arbitrum One
- session and typed-order signing, rejection, and local verification
- invalid recipient, spender, transfer, and allowance inputs
- transfer and approval simulation failures
- prepared-write invalidation after input, account, or chain changes
- transaction broadcast, receipt confirmation, revert, and rejection states

## Deliberate boundaries

The EIP-712 order is a reference schema, not an exchange-compatible payload. A
real adapter must supply the exact domain, types, nonce source, expiry rules,
and submission endpoint.

Social login, embedded wallets, MFA, key export, Wallet Services, and smart
accounts are excluded because this project is explicitly MetaMask-extension
only. Contract deployment and arbitrary calldata are omitted because they do
not help a perps terminal reference and make the write surface less safe.

Trade execution is not mocked. Production trading requires protocol-specific
market metadata, margin and liquidation calculations, risk checks, nonce
management, relaying or RPC submission, and settlement monitoring.
