import { useContext } from 'react'
import TranslationContext from './TranslationContext'

const useTranslation = () => {
  const context = useContext(TranslationContext)

  if (context === undefined) {
    return { t: (text) => text }
  }

  return context
}

export default useTranslation
