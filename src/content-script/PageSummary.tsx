import { useState, useCallback, useEffect } from 'preact/hooks'
import classNames from 'classnames'
import { XCircleFillIcon, GearIcon } from '@primer/octicons-react'
import Browser from 'webextension-polyfill'
import ChatGPTQuery from './ChatGPTQuery'
// import { extractFromHtml, extract } from '@extractus/article-extractor'
import { extractFromHtml } from '../utils/article-extractor/cjs/article-extractor.esm'
import { getUserConfig, Language, getProviderConfigs } from '../config'
import { getSummaryPrompt } from './prompt'
import { isIOS } from '../utils/utils'
import logoWhite from '../logo-white.png'
import logo from '../logo.png'

interface Props {
  pageSummary: string
  pageSummarySites: string
  siteRegex: RegExp
}

function PageSummary(props: Props) {
  const { pageSummary, pageSummarySites, siteRegex } = props
  const [showCard, setShowCard] = useState(false)
  const [supportSummary, setSupportSummary] = useState(true)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)

  const onSwitch = useCallback(() => {
    setShowCard((state) => {
      const cardState = !state

      if (cardState) {
        setQuestion('')
        setLoading(false)
      }

      return cardState
    })
  }, [])

  const openOptionsPage = useCallback(() => {
    Browser.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' })
  }, [])

  const onSummary = useCallback(async () => {
    setLoading(true)
    setSupportSummary(true)

    setQuestion('')
    const html = document.querySelector('html')?.outerHTML
    const url = location.href

    if (!html) {
      setSupportSummary(false)
      return
    }

    const article = await extractFromHtml(html, url)
    console.log('article', article)

    const title = article?.title || document.title || ''
    const description =
      article?.description ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      ''
    const content = article?.content ? description + article?.content : title + description

    if (article?.content || description) {
      const language = window.navigator.language
      const userConfig = await getUserConfig()
      const providerConfigs = await getProviderConfigs()

      setQuestion(`Content:  ${getSummaryPrompt(
        content.replace(/<[^>]+>/g, ''),
        providerConfigs.provider,
      )}

Instructions: Summarize the highlights of the content and output a useful summary in a few sentences.

Please write in ${userConfig.language === Language.Auto ? language : userConfig.language} language.
      `)
      return
    }

    setSupportSummary(false)
  }, [])

  useEffect(() => {
    Browser.runtime.onMessage.addListener((message) => {
      const { type } = message
      if (type === 'OPEN_WEB_SUMMARY') {
        if (showCard) {
          return
        }

        setQuestion('')
        setShowCard(true)
        setLoading(false)
      }
    })
  }, [showCard])

  // useEffect(() => {
  //   console.log('question', question)
  // }, [question])

  return (
    <>
      {showCard ? (
        <div className="glarity--card">
          <div className="glarity--card__head ">
            <div className="glarity--card__head--title">
              <a href="https://glarity.app" rel="noreferrer" target="_blank">
                <img src={logo} alt="Glarity Summary" /> Glarity Summary
              </a>{' '}
              <button
                className={classNames('glarity--btn', 'glarity--btn__icon')}
                onClick={openOptionsPage}
              >
                <GearIcon size={14} />
              </button>
            </div>

            <div className="glarity--card__head--action">
              <button
                className={classNames('glarity--btn', 'glarity--btn__icon')}
                onClick={onSwitch}
              >
                <XCircleFillIcon />
              </button>
            </div>
          </div>

          <div className="glarity--card__content">
            {question ? (
              <div className="glarity--container">
                <div className="glarity--chatgpt">
                  <ChatGPTQuery question={question} />
                </div>
              </div>
            ) : (
              <div className="glarity--card__empty ">
                {!supportSummary ? (
                  'Sorry, the summary of this page is not supported.'
                ) : (
                  <button
                    className={classNames(
                      'glarity--btn',
                      'glarity--btn__primary',
                      // 'glarity--btn__large',
                      'glarity--btn__block',
                    )}
                    onClick={onSummary}
                    disabled={loading}
                  >
                    Summary
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        ((pageSummary === 'custom' && pageSummarySites.includes(location.hostname)) ||
          (pageSummary === 'all' && (isIOS || !siteRegex?.test(location.hostname)))) && (
          <button
            onClick={onSwitch}
            className={classNames('glarity--btn', 'glarity--btn__launch', 'glarity--btn__primary')}
          >
            <img
              src={logoWhite}
              alt="Glarity Summary"
              className="glarity--w-5 glarity--h-5 glarity--rounded-sm"
            />
          </button>
        )
      )}
    </>
  )
}

export default PageSummary