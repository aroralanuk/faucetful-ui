# Faucetful UI

This repo contains the web interface for Faucetful (testnet-mainnet bridge) built on top of
[Hyperlane](https://hyperlane.xyz/). More details about the project can be found in the [Blog
Post](https://aurorabykunal.substack.com/p/ae541b8c-eda6-4db4-8f53-9d00fe6ec3b3) and the contracts can be found in the [Faucetful repo](https://github.com/aroralanuk/faucetful).

## Architecture

This app is built with Next+React, Wagmi, RainbowKit, and the Hyperlane SDK.

- The index page is located at `./src/pages/index.tsx`
- The primary features are implemented in `./src/features/`
- Constants that you may want to change are in `./src/consts/`, see the following Customization section for details.

## Customization

See [CUSTOMIZE.md](./CUSTOMIZE.md) for details about adjusting the tokens and branding of this app.

## Development

### Setup

```sh
# Install dependencies
yarn

# Build Next project
yarn build
```

### Run

```sh
# Start the Next dev server
yarn dev
```

### Test

```sh
# Lint check code
yarn lint

# Check code types
yarn typecheck
```

### Format

```sh
# Format code using Prettier
yarn prettier
```

### Clean / Reset

```sh
# Delete build artifacts to start fresh
yarn clean
```

## Deployment

The recommended hosting solution for this Next.JS app is to create a project on Vercel.

## Learn more

For more information, see the [Hyperlane documentation](https://docs.hyperlane.xyz/hyperlane-docs/).
