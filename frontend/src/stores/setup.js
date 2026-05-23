import { defineStore } from 'pinia'
import { ref } from 'vue'

const COUNTRY_DEFAULTS = {
  'Egypt':        { currency: 'EGP', vat: 14 },
  'Saudi Arabia': { currency: 'SAR', vat: 15 },
  'UAE':          { currency: 'AED', vat: 5  },
  'Kuwait':       { currency: 'KWD', vat: 0  },
  'Qatar':        { currency: 'QAR', vat: 0  },
  'Bahrain':      { currency: 'BHD', vat: 10 },
  'Oman':         { currency: 'OMR', vat: 5  },
  'Jordan':       { currency: 'JOD', vat: 16 },
  'Other':        { currency: 'USD', vat: 0  },
}

export const COUNTRIES = Object.keys(COUNTRY_DEFAULTS)

export const useSetupStore = defineStore('setup', () => {
  const country  = ref('Egypt')
  const province = ref('')
  const currency = ref('EGP')
  const vat      = ref(14)

  function setCountry(c) {
    country.value  = c
    const d = COUNTRY_DEFAULTS[c] || COUNTRY_DEFAULTS['Other']
    currency.value = d.currency
    vat.value      = d.vat
  }

  return { country, province, currency, vat, setCountry, COUNTRIES }
})
