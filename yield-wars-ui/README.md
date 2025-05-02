# YieldWars UI

This is the frontend UI for YieldWars, a Solana-based strategy game using Bolt/Anchor.

## PDA Monitor

The PDA Monitor is a tool for developers to visualize and inspect Program Derived Addresses (PDAs) during testing and development.

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000/pda-monitor](http://localhost:3000/pda-monitor) to view the PDA Monitor.

### Using the PDA Monitor

1. Connect your wallet using the "Select Wallet" button in the top right.
2. Enter the Program ID of your Bolt/Anchor program in the input field.
3. Click "Fetch PDAs" to retrieve all Program Derived Addresses owned by your program.
4. The PDAs will be displayed with their type detected automatically.
5. Click on a PDA to expand and view its detailed data.
6. Enable "Auto Refresh" to keep the PDA data updated during testing.

### Features

- Automatically decodes Bolt component data
- Displays formatted currency values for wallet balances
- Auto-refreshes to monitor PDAs during testing
- Supports custom RPC endpoints

### Testing with Local Validator

To use the PDA Monitor with a local Solana validator:

1. Start your local validator:

```bash
solana-test-validator
```

2. Set the endpoint to `http://localhost:8899` in the PDA Monitor.
3. Make sure your program ID is correct.
4. Run your tests or interact with your program.
5. The PDA Monitor will show all PDAs created by your program.

## Development

- This project uses Next.js App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Solana wallet adapters for wallet connections

## Structure

- \`src/app/\` - Next.js App Router pages and layouts
- \`src/components/\` - React components
- \`src/hooks/\` - Custom React hooks
- \`src/lib/\` - Utility libraries and configurations
- \`src/models/\` - TypeScript interfaces and type definitions
- \`src/stores/\` - State management using Zustand
- \`src/utils/\` - Helper functions and utilities