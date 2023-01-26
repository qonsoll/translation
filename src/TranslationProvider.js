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
    onWrite,
    onRead,
    storage = window?.localStorage,
    languages = [{ name: 'English', shortCode: 'en' }],
    initialState = {},
    useHashes = false,
    saveNewAutomatically = false,
    isLive = false
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
    try {
      return new Promise((resolve, reject) => {
        const appNameComputed = appName || currentApp

        // appNameComputed - could be wrong if the initialization of library context got wrong
        // shortCode - could be passed from the outside, should be a language short code
        // refEnding - could be passed from the outside, but it should always be a string md5-hash
        if (!appNameComputed || !shortCode || !refEnding) {
          reject(
            `appNameComputed(${appNameComputed}), shortCode(${shortCode}) and refEnding(${refEnding}) - are required parameters`
          )
        }
        /* Creating a reference to the database. */
        const ref = `translations/${appNameComputed}/${shortCode}`

        resolve(onWrite?.({ ref, value: { [refEnding]: textLabel } }))
      })
    } catch (error) {
      console.error(error)
    }
  }
  // Function that looks like i18n t
  const t = (label) => {
    if (typeof label === 'string' && label) {
      let DBLabel = ''
      let md5Label = ''

      if (useHashes) {
        // Use a hash as a key for translation
        md5Label = md5(label)

        DBLabel = translations?.[md5Label]
      } else {
        // Use a simple label as a key for translation
        DBLabel = translations?.[label]
      }

      if (
        !DBLabel &&
        saveNewAutomatically &&
        loaded &&
        Object.keys(translations).length
      ) {
        //Save new translations automatically, try/catch block is inside saveTranslationForLanguage
        languages?.forEach((lang) =>
          saveTranslationForLanguage({
            textLabel: label,
            refEnding: label || md5Label,
            shortCode: lang?.shortCode
          })
        )
      }
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
      try {
        if (ref) {
          setLoading(true)

          onRead?.({
            ref,
            setTranslations,
            options: { onlyOnce: !isLive }
          })

          setLoading(false)
          setLoaded(true)
        }
      } catch (error) {
        console.log(error)
      }
    }

    isComponentMounted && isStorageLoaded && fetchTranslations()

    return () => {
      isComponentMounted = false
    }
  }, [language, isStorageLoaded])

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
  onWrite: PropTypes.func.isRequired,
  onRead: PropTypes.func,
  storage: PropTypes.object,
  useHashes: PropTypes.bool,
  saveNewAutomatically: PropTypes.bool,
  isLive: PropTypes.bool
}

export default TranslationsProvider
