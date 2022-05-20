import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import TranslationsContext from './TranslationContext'
import md5 from 'md5'

const storageKey = 'language'

const TranslationsProvider = (props) => {
  const {
    children,
    currentApp,
    defaultLanguage = 'en',
    db,
    storage = window?.localStorage,
    languages = [{ name: 'English', shortCode: 'en' }],
    initialState = {}
  } = props

  // STATES
  // State that indicates current language
  const [language, setLanguage] = useState(defaultLanguage)
  // State that indicates downloaded translations from the DB
  const [translations, setTranslations] = useState(initialState)
  // Loading state
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isStorageLoaded, setIsStorageLoaded] = useState(false)

	// FUNCTIONS
  // Function set current language to the LS and provider state
  const setCurrentLanguage = async (language) => {
    setLanguage(language)
    await storage.setItem(storageKey, language)
  }
  const saveTranslationForLanguage = ({
    textLabel,
    shortCode,
    refEnding,
    appName
  }) => {
    const appNameComputed = appName || currentApp
    /* Creating a reference to the database. */
    const ref = `translations/${appNameComputed}/${shortCode}/${refEnding}`

    return db.ref(ref).set(textLabel)
  }
  // Function that looks like i18n t
  const t = (label) => {
    if (typeof label === 'string' && label) {
      const md5Label = md5(label)

      const DBLabel = translations?.[md5Label]

      // this will fix translations disappearing as it stops
      // possibility of translations writing, instantly to the RDB
      // if (!DBLabel && loaded && Object.keys(translations).length) {
			// 	languages?.forEach((lang) =>
			// 	saveTranslationForLanguage({
			// 		label,
			// 		md5Label,
			// 		shortCode: lang?.shortCode
			// 	})
			// 	)
      // }

      return DBLabel || label
    } else {
      console.warn(
        `Wrong value was passed in the translation function. Type of value is ${typeof label}`
      )
      return ''
    }
  }

  // LISTENERS
  useEffect(() => {
    const getStorage = async () => {
      const LSLang = await storage?.getItem(storageKey)
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
        const data = snapshot?.val()
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

  return (
    <TranslationsContext.Provider
      value={{
        setCurrentLanguage,
        language,
        translations,
				saveTranslationForLanguage,
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
