import next from 'eslint-config-next'

export default [
  ...next,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'functions/**',
      'src/components/CheckoutForm.tsx',
      'src/app/**/book/**',
      'src/app/**/booking/**',
      'src/app/api/checkout/**',
      'src/app/api/webhooks/stripe/**',
      'src/app/api/**stripe**/**',
      'src/app/api/log-visits/**',
      'src/lib/firebase.ts',
      'src/components/**',
      'src/components/weather/**',
      'src/context/**'
      ,
      'scripts/**'
    ]
  },
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'warn'
    }
  }
  ,
  {
    files: ['src/hooks/**', 'src/components/admin/**', 'src/components/booking/**'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off'
    }
  },
  {
    files: ['src/app/**'],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off'
    }
  }
]
