# Firebase RealTime Database Translation

props:

- children,
- defaultApp
- defaultLanguage = 'en'
- onWrite
- onRead
- storage = window?.localStorage
- languages = [{ name: 'English', shortCode: 'en' }]
- initialState = {}
- useHashes = false
- saveNewAutomatically = false
- isLive = false


Example:

```js
const TranslationProvider = (props) => {
  const { children, currentApp = DEFAULT_APP } = props

  // [HELPER_FUNCTIONS]
  const onWrite = useCallback(
    ({ ref, value }) => database().ref(ref).update(value),
    []
  )
  const onRead = useCallback(
    async ({ ref: path, setTranslations, options }) => {
      const write = (snapshot) => setTranslations(snapshot?.val() || {})

      const ref = database().ref(path)
      if (options?.onlyOnce) {
        return ref.once('value', write)
      } else {
        return ref.on('value', write)
      }
    },
    []
  )

  return (
    <Provider
      storage={AsyncStorage}
      db={database()}
      onWrite={onWrite}
      useHashes
      onRead={onRead}
      saveNewAutomatically
      languages={LANGUAGES}
      defaultLanguage={DEFAULT_LANGUAGE}
      currentApp={currentApp}>
      <TranslationContext.Consumer>
        {({ loaded }) =>
          loaded ? children : <ScreenLoading text="Translation is loading" />
        }
      </TranslationContext.Consumer>
    </Provider>
  )
}

```
    
   
   Context value:

  - setCurrentLanguage = (string) => void
  - setCurrentApp = ({ appName, withLoading }) => void
  - currentApp
  - language
  - translations
  - saveTranslationForLanguage = ({ textLabel, shortCode, refEnding, appName }) => Promise
  - loading
  - loaded
  - languages
  - translationsRDBRef: `translations/${currentApp}/${language}`
  - t = (string) => string
    
   
  
   
    
   
    