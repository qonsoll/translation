import { useContext } from 'react'
import TranslationContext from './TranslationContext'

const useTranslation = () => useContext(TranslationContext)

export default useTranslation
