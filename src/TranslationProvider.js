import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import TranslationsContext from './TranslationContext'
import md5 from 'md5'

const storageKey = 'language'

const TranslationsProvider = (props) => {
  const {
    children,
    defaultApp,
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
  const [currentApp, setCurrentApp] = useState(defaultApp)

  // FUNCTIONS
  // Function set current language to the LS and provider state
  const setCurrentLanguage = async (language) => {
    setLanguage(language)
    await storage.setItem(storageKey, language)
  }

  // Function set error message and date&time to RDB
  const handleError = async (errorMessage) => {
    // Get ref to errors
    const ref = 'translations/logs/errors'

    // Get formatted date and time, in format ISO. Delete '.' from string
    const [event] = new Date().toISOString().split('.')

    // Write error to RDB
    await onWrite?.({ ref, value: { [event]: errorMessage } })
  }

  const saveTranslationForLanguage = ({
    textLabel,
    shortCode,
    refEnding,
    appName,
    isNew
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

        resolve(onWrite?.({ ref, value: { [refEnding]: textLabel }, isNew }))
      })
    } catch (error) {
      handleError(error?.message)
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

      // If in translation not exist translation for such lable, save it
      if (!loading && !DBLabel && saveNewAutomatically && loaded) {
        //Save new translations automatically, try/catch block is inside saveTranslationForLanguage
        languages?.forEach((lang) =>
          saveTranslationForLanguage({
            textLabel: label,
            refEnding: md5Label || label,
            shortCode: lang?.shortCode,
            isNew: true
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
  const fetchTranslations = async ({ appName, withLoading = true }) => {
    const ref = language && `translations/${appName}/${language}`
    setLoading(true)
    if (withLoading) {
      setLoaded(false)
    }
    try {
      if (ref) {
        await onRead?.({
          ref,
          setTranslations: (data) => {
            setTranslations(data)

            if (withLoading) {
              setLoaded(true)
            }
            setLoading(false)
          },
          options: { onlyOnce: !isLive }
        })
      }
    } catch (error) {
      handleError(error?.message)
      setLoading(false)

      if (withLoading) {
        setLoaded(true)
      }
    }
  }
  const _onCurrentAppChange = ({ appName, withLoading }) => {
    fetchTranslations({ appName, withLoading })
    setCurrentApp(appName)
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

  // Fetching translations from the DB on language change
  useEffect(() => {
    loaded && fetchTranslations({ appName: currentApp, withLoading: false })
  }, [language])

  // Initial translations fetch from the DB
  useEffect(() => {
    isStorageLoaded && fetchTranslations({ appName: currentApp })
  }, [isStorageLoaded])

  return (
    <TranslationsContext.Provider
      value={{
        setCurrentLanguage,
        setCurrentApp: _onCurrentAppChange,
        currentApp,
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
