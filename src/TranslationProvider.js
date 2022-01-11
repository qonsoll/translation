import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import TranslationsContext from './TranslationContext'

const storageKey = 'language'

const TranslationsProvider = (props) => {
  const {
    children,
    currentApp,
    defaultLanguage = 'en',
    db,
    storage = window && window.localStorage,
    languages = [{ name: 'English', shortCode: 'en' }]
  } = props

  // STATES
  // State that indicates current language
  const [language, setLanguage] = useState(defaultLanguage)
  // State that indicates downloaded translations from the DB
  const [translations, setTranslations] = useState({})
  // Loading state
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isStorageLoaded, setIsStorageLoaded] = useState(false)
  // LISTENERS

  useEffect(() => {
    const getStorage = async () => {
      const LSLang = storage && (await storage.getItem(storageKey))
      if (!LSLang) {
        await storage.setItem(storageKey, defaultLanguage)
      } else {
        setLanguage(LSLang)
      }
      setIsStorageLoaded(true)
    }
    getStorage()
  }, [defaultLanguage])

  // Fetching translations from the DB
  useEffect(() => {
    let isComponentMounted = true
    const ref = language && `translations/${currentApp}/${language}`

    const fetchTranslations = async () => {
      if (ref) {
        setLoading(true)
        const snapshot = await db.ref(ref).once('value')
        const data = snapshot && snapshot.val()
        if (data && Object.keys(data).length) {
          setTranslations(data)
        }
        setLoading(false)
        setLoaded(true)
      }
    }

    isComponentMounted && isStorageLoaded && fetchTranslations()

    return () => {
      isComponentMounted = false
    }
  }, [db, language, isStorageLoaded])

  // FUNCTIONS
  // Function set current language to the LS and provider state
  const setCurrentLanguage = async (language) => {
    setLanguage(language)
    await storage.setItem(storageKey, language)
  }

  // Function that looks like i18n t
  const t = (label) => {
    const DBLabel = label in translations && translations[label]
    if (!DBLabel && loaded) {
      languages.forEach((lang) => {
        const ref = `translations/${currentApp}/${lang.shortCode}/${label}`
        db.ref(ref).set(label)
      })
    }

    return DBLabel || label
  }

  return (
    <TranslationsContext.Provider
      value={{
        setCurrentLanguage,
        language,
        translations,
        loading,
        loaded,
        languages,
        translationsRDBRef: `translations/${currentApp}/${language}`,
        t
      }}>
      {children}
    </TranslationsContext.Provider>
  )
}

TranslationsProvider.propTypes = {
  currentApp: PropTypes.string.isRequired,
  languages: PropTypes.array.isRequired,
  defaultLanguage: PropTypes.string.isRequired,
  db: PropTypes.object.isRequired,
  storage: PropTypes.object
}

export default TranslationsProvider
