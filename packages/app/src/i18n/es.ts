export const es = {
  app: {
    name: 'Lendi',
    tagline: 'Prueba lo que ganas. No reveles nada.',
  },

  nav: {
    worker: {
      panel:    'Panel',
      income:   'Mi Ingreso',
      apply:    'Solicitar',
      advisor:  'Asesor IA',
    },
    lender: {
      panel:     'Panel',
      verify:    'Verificar',
      portfolio: 'Portafolio',
    },
    switchToLender: 'Ir a Prestamista',
    switchToWorker: 'Ir a Trabajador',
  },

  roles: {
    worker: {
      label:       'Soy Trabajador',
      description: 'Registra tu ingreso y solicita préstamos',
    },
    lender: {
      label:       'Soy Prestamista',
      description: 'Verifica ingresos y gestiona tu portafolio',
    },
  },

  auth: {
    signIn:        'Ingresar con clave de paso',
    createAccount: 'Crear cuenta nueva',
    alreadyHave:   '¿Ya tienes cuenta? Ingresa',
    usernamePlaceholder: 'Elige un nombre de usuario',
    connecting:    'Conectando...',
  },

  worker: {
    onboarding: {
      title:       'Crear cuenta',
      subtitle:    'Configura tu cuenta de trabajador',
      cta:         'Continuar con Google',
      registerCta: 'Registrar en la blockchain',
      registered:  'Cuenta registrada',
      registering: 'Registrando...',
    },
    dashboard: {
      title:    'Mi Panel',
      subtitle: 'Registra ingreso, solicita préstamos',
    },
    income: {
      title:         'Mi Ingreso Este Mes',
      view:          'Ver mi ingreso',
      hide:          'Ocultar',
      capture:       'Registrar ingreso',
      amountLabel:   'Monto en USDC',
      amountPlaceholder: '350.00',
      recording:     'Cifrando...',
      recorded:      'Ingreso registrado',
      listenerActive:   'Privara activo — detectando pagos...',
      listenerInactive: 'Listener inactivo',
      noHistory:        'Sin registros aún',
      historyTitle:     'Historial de Ingresos',
      source:           'Fuente',
      timestamp:        'Fecha',
      privacyNote:      'Solo tú puedes ver los montos',
    },
    apply: {
      title:    'Solicitar Préstamo',
      subtitle: 'Solicita con ingreso cifrado como garantía',
      cta:      'Aplicar',
    },
    advisor: {
      title:       'Asesor Financiero',
      subtitle:    'Modelo de IA local — sin llamadas al servidor',
      placeholder: '¿Puedo pagar un préstamo de $200?',
      loading:     'Cargando modelo...',
      loadingNote: 'Primera carga ~2 GB, luego en caché',
      suggestions: [
        '¿Puedo pagar un préstamo de $200?',
        '¿En cuántos meses califico para más?',
        '¿Cuánto debo ahorrar este mes?',
      ],
      send: 'Enviar',
    },
    balance: {
      title:       'Mi Saldo',
      reveal:      'Ver mi ingreso',
      concealed:   '••••••',
      privacyNote: 'Solo tú puedes verlo',
    },
  },

  lender: {
    dashboard: {
      title:    'Panel Prestamista',
      subtitle: 'Verifica ingresos y gestiona tu portafolio',
    },
    verify: {
      title:          'Verificar Ingreso',
      subtitle:       'El monto de ingreso nunca es revelado',
      workerLabel:    'Dirección del Trabajador',
      workerPlaceholder: '0x...',
      thresholdLabel: 'Ingreso mínimo (USDC/mes)',
      thresholdPlaceholder: '300',
      cta:            'Verificar',
      qualifies:      'Califica ✅',
      notQualifies:   'No califica ❌',
      privacyStatement: 'El monto de ingreso nunca fue revelado.',
      viewOnChain:    'Ver en Arbiscan',
    },
    portfolio: {
      title:    'Mi Portafolio',
      subtitle: 'Préstamos y escrows activos',
      empty:    'Sin posiciones activas',
    },
    escrow: {
      create:    'Crear Escrow',
      escrowId:  'ID de Escrow',
      status:    'Estado',
    },
  },

  tx: {
    idle:       '',
    encrypting: 'Cifrando en tu dispositivo...',
    submitting: 'Enviando a la blockchain...',
    processing: 'Comparación FHE procesando (10–30s)...',
    done:       '¡Listo!',
    error:      'Error — intenta de nuevo',
  },

  privacy: {
    note:      'Solo tú puedes ver esto',
    encrypted: 'Cifrado con FHE',
    noAmount:  'El monto nunca sale de tu dispositivo',
  },

  errors: {
    walletNotConnected: 'Billetera no conectada',
    fheNotReady:        'FHE no inicializado — espera un momento',
    txFailed:           'Transacción fallida',
    generic:            'Algo salió mal — intenta de nuevo',
  },
} as const

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : DeepStringify<T[K]>
}

export type Strings = DeepStringify<typeof es>
