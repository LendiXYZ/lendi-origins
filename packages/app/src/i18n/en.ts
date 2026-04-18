import type { Strings } from './es'

export const en: Strings = {
  app: {
    name: 'Lendi',
    tagline: 'Prove what you earn. Reveal nothing.',
  },

  nav: {
    worker: {
      panel:   'Dashboard',
      income:  'My Income',
      apply:   'Apply',
      advisor: 'AI Advisor',
    },
    lender: {
      panel:     'Dashboard',
      verify:    'Verify',
      portfolio: 'Portfolio',
    },
    switchToLender: 'Go to Lender',
    switchToWorker: 'Go to Worker',
  },

  roles: {
    worker: {
      label:       "I'm a Worker",
      description: 'Record your income and apply for loans',
    },
    lender: {
      label:       "I'm a Lender",
      description: 'Verify income and manage your portfolio',
    },
  },

  auth: {
    signIn:        'Sign in with Passkey',
    createAccount: 'Create new account',
    alreadyHave:   'Already have an account? Sign in',
    usernamePlaceholder: 'Choose a username',
    connecting:    'Connecting...',
  },

  worker: {
    onboarding: {
      title:       'Create Account',
      subtitle:    'Set up your worker account',
      cta:         'Continue with Google',
      registerCta: 'Register on blockchain',
      registered:  'Account registered',
      registering: 'Registering...',
    },
    dashboard: {
      title:    'My Dashboard',
      subtitle: 'Record income, apply for loans',
    },
    income: {
      title:         'My Income This Month',
      view:          'View my income',
      hide:          'Hide',
      capture:       'Record income',
      amountLabel:   'Amount in USDC',
      amountPlaceholder: '350.00',
      recording:     'Encrypting...',
      recorded:      'Income recorded',
      listenerActive:   'Privara active — detecting payments...',
      listenerInactive: 'Listener inactive',
      noHistory:        'No records yet',
      historyTitle:     'Income History',
      source:           'Source',
      timestamp:        'Date',
      privacyNote:      'Only you can see amounts',
    },
    apply: {
      title:    'Apply for a Loan',
      subtitle: 'Apply with encrypted income as collateral',
      cta:      'Apply',
    },
    advisor: {
      title:       'Financial Advisor',
      subtitle:    'Local AI model — zero server calls',
      placeholder: 'Can I afford a $200 loan?',
      loading:     'Loading model...',
      loadingNote: 'First load ~2 GB, then cached',
      suggestions: [
        'Can I afford a $200 loan?',
        'In how many months can I qualify for more?',
        'How much should I save this month?',
      ],
      send: 'Send',
    },
    balance: {
      title:       'My Balance',
      reveal:      'View my income',
      concealed:   '••••••',
      privacyNote: 'Only you can see this',
    },
  },

  lender: {
    dashboard: {
      title:    'Lender Dashboard',
      subtitle: 'Verify income and manage your portfolio',
    },
    verify: {
      title:          'Verify Income',
      subtitle:       'The income amount is never revealed',
      workerLabel:    'Worker Address',
      workerPlaceholder: '0x...',
      thresholdLabel: 'Minimum income (USDC/month)',
      thresholdPlaceholder: '300',
      cta:            'Verify',
      qualifies:      'Qualifies ✅',
      notQualifies:   'Does not qualify ❌',
      privacyStatement: 'The income amount was never revealed.',
      viewOnChain:    'View on Arbiscan',
    },
    portfolio: {
      title:    'My Portfolio',
      subtitle: 'Active loans and escrows',
      empty:    'No active positions',
    },
    escrow: {
      create:   'Create Escrow',
      escrowId: 'Escrow ID',
      status:   'Status',
    },
  },

  tx: {
    idle:       '',
    encrypting: 'Encrypting on your device...',
    submitting: 'Submitting to blockchain...',
    processing: 'FHE comparison processing (10–30s)...',
    done:       'Done!',
    error:      'Error — please try again',
  },

  privacy: {
    note:      'Only you can see this',
    encrypted: 'Encrypted with FHE',
    noAmount:  'The amount never leaves your device',
  },

  errors: {
    walletNotConnected: 'Wallet not connected',
    fheNotReady:        'FHE not initialized — please wait',
    txFailed:           'Transaction failed',
    generic:            'Something went wrong — please try again',
  },
}
