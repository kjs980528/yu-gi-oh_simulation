import { useState, useEffect, useCallback, useRef } from 'react'
import { HoloCard } from '../components/HoloCard'
import './QuizPage.css'

const RACE_MAP = {
  'Warrior': '전사족',
  'Spellcaster': '마법사족',
  'Dragon': '드래곤족',
  'Zombie': '언데드족',
  'Fiend': '악마족',
  'Fairy': '천사족',
  'Machine': '기계족',
  'Beast': '야수족',
  'Beast-Warrior': '야수전사족',
  'Winged Beast': '비행야수족',
  'Insect': '곤충족',
  'Dinosaur': '공룡족',
  'Reptile': '파충류족',
  'Fish': '어류족',
  'Sea Serpent': '해룡족',
  'Aqua': '물족',
  'Pyro': '화염족',
  'Thunder': '번개족',
  'Rock': '암석족',
  'Plant': '식물족',
  'Psychic': '사이킥족',
  'Divine-Beast': '환신야수족',
  'Creator-God': '창조신족',
  'Wyrm': '환룡족',
  'Cyberse': '사이버스족',
  'Illusionist': '환상마족',
  'Illusion': '환상마족'
}

// Help elements for 3D tilt effect
function round(v, p = 3) { return parseFloat(v.toFixed(p)) }
function clamp(v, min = 0, max = 100) { return Math.min(Math.max(v, min), max) }
function adjust(v, fMin, fMax, tMin, tMax) { return round(tMin + (tMax - tMin) * (v - fMin) / (fMax - fMin)) }

async function fetchRandomMonsterCard() {
  let attempts = 0
  while (attempts < 15) {
    attempts++
    const res = await fetch('/api/ygopro/randomcard.php')
    if (!res.ok) continue
    const json = await res.json()
    const card = json && json.data && Array.isArray(json.data) ? json.data[0] : json
    if (card && card.type && card.type.toLowerCase().includes('monster') && card.race) {
      return card
    }
  }
  throw new Error('몬스터 카드를 가져올 수 없습니다.')
}

const generateChoices = (correctRace) => {
  const correctOption = {
    english: correctRace,
    korean: RACE_MAP[correctRace] || correctRace
  }

  const allRaces = Object.keys(RACE_MAP)
  const otherRaces = allRaces.filter(r => r.toLowerCase() !== correctRace.toLowerCase())
  
  const shuffledOthers = [...otherRaces].sort(() => 0.5 - Math.random())
  const selectedOthers = shuffledOthers.slice(0, 3).map(r => ({
    english: r,
    korean: RACE_MAP[r] || r
  }))
  
  return [correctOption, ...selectedOthers].sort(() => 0.5 - Math.random())
}

export function QuizPage() {
  const [gameState, setGameState] = useState('INTRO') // INTRO, PLAYING, REVEALED, GAMEOVER
  const [currentCard, setCurrentCard] = useState(null)
  const [nextCard, setNextCard] = useState(null)
  const [choices, setChoices] = useState([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [lives, setLives] = useState(3)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)

  const prefetchingRef = useRef(false)
  const cardWrapRef = useRef(null)
  const rafRef = useRef(null)

  // Start background prefetch
  const startPreFetch = useCallback(async () => {
    if (nextCard || prefetchingRef.current) return
    prefetchingRef.current = true
    try {
      const card = await fetchRandomMonsterCard()
      setNextCard(card)
    } catch (err) {
      console.error('Failed to pre-fetch next card:', err)
    } finally {
      prefetchingRef.current = false
    }
  }, [nextCard])

  // Trigger prefetch when in playing state
  useEffect(() => {
    if (gameState === 'PLAYING' && currentCard && !nextCard) {
      startPreFetch()
    }
  }, [gameState, currentCard, nextCard, startPreFetch])

  const startGame = async () => {
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setLives(3)
    setHistory([])
    setSelectedAnswer(null)
    setNextCard(null)
    setLoading(true)
    setError(null)
    setGameState('PLAYING')
    
    try {
      const card = await fetchRandomMonsterCard()
      setCurrentCard(card)
      setChoices(generateChoices(card.race))
      setLoading(false)
    } catch (err) {
      setError('카드를 불러오는 도중 에러가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  const handleAnswer = (choice) => {
    if (selectedAnswer) return
    setSelectedAnswer(choice)
    const isCorrect = choice.english.toLowerCase() === currentCard.race.toLowerCase()

    if (isCorrect) {
      setScore(prev => prev + 1)
      const newCombo = combo + 1
      setCombo(newCombo)
      setMaxCombo(prev => Math.max(prev, newCombo))
      setHistory(prev => [
        ...prev,
        {
          name: currentCard.name,
          image: currentCard.card_images?.[0]?.image_url_cropped,
          correct: true,
          id: currentCard.id
        }
      ])
    } else {
      setCombo(0)
      setLives(prev => prev - 1)
      setHistory(prev => [
        ...prev,
        {
          name: currentCard.name,
          image: currentCard.card_images?.[0]?.image_url_cropped,
          correct: false,
          id: currentCard.id
        }
      ])
    }

    setGameState('REVEALED')
  }

  const nextQuestion = async () => {
    if (lives <= 0) {
      setGameState('GAMEOVER')
      return
    }

    setSelectedAnswer(null)
    setError(null)
    setGameState('PLAYING')

    if (nextCard) {
      setCurrentCard(nextCard)
      setChoices(generateChoices(nextCard.race))
      setNextCard(null)
    } else {
      setChoices([])
      setLoading(true)
      try {
        const card = await fetchRandomMonsterCard()
        setCurrentCard(card)
        setChoices(generateChoices(card.race))
        setLoading(false)
      } catch (err) {
        setError('카드를 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }
  }

  // Mouse move handler for card tilt
  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = cardWrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x  = clamp(round((100 / rect.width)  * (e.clientX - rect.left)))
      const y  = clamp(round((100 / rect.height) * (e.clientY - rect.top)))
      const cx = x - 50
      const cy = y - 50
      const fromCenter = round(clamp(Math.sqrt(cx * cx + cy * cy) / 50, 0, 1), 3)
      el.style.setProperty('--pointer-x',           `${x}%`)
      el.style.setProperty('--pointer-y',           `${y}%`)
      el.style.setProperty('--rotate-x',            `${round(-cx / 3.5)}deg`)
      el.style.setProperty('--rotate-y',            `${round(cy / 3.5)}deg`)
      el.style.setProperty('--card-opacity',        '1')
      el.style.setProperty('--pointer-from-center', fromCenter)
      el.style.setProperty('--pointer-from-left',   round(x / 100, 3))
      el.style.setProperty('--pointer-from-top',    round(y / 100, 3))
      el.style.setProperty('--background-x',        `${adjust(x, 0, 100, 37, 63)}%`)
      el.style.setProperty('--background-y',        `${adjust(y, 0, 100, 33, 67)}%`)
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const el = cardWrapRef.current
    if (!el) return
    el.style.setProperty('--rotate-x',           '0deg')
    el.style.setProperty('--rotate-y',           '0deg')
    el.style.setProperty('--card-opacity',        '0')
    el.style.setProperty('--pointer-from-center', '0')
  }, [])

  // Render components based on game state
  return (
    <div className="quiz-container">
      {gameState !== 'INTRO' && gameState !== 'GAMEOVER' && (
        <div className="quiz-stats">
          <div className="stat-item">
            <span className="stat-label">점수</span>
            <span className="stat-value score">{score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">콤보</span>
            <span className="stat-value combo">{combo} {combo > 0 && '🔥'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">생명</span>
            <span className="stat-value lives">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
              ))}
            </span>
          </div>
        </div>
      )}

      {gameState === 'INTRO' && (
        <div className="screen-wrapper">
          <span className="intro-badge">Mini Game</span>
          <h2 className="screen-title">유희왕 일러스트 종족 퀴즈</h2>
          <p className="screen-desc">
            화면에 표시되는 카드 일러스트를 보고 올바른 몬스터 종족을 맞춰보세요!<br />
            기회는 총 3번 제공됩니다. 연속으로 정답을 맞추면 콤보 보너스가 쌓입니다.
          </p>
          <button className="primary-button" onClick={startGame}>
            게임 시작
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="card-display-box">
          <div className="quiz-instruction">이 일러스트의 주인인 몬스터의 종족은?</div>
          
          <div className="illustration-box-outer">
            {loading ? (
              <div className="illustration-container loading">
                <div className="quiz-loading-spinner" />
              </div>
            ) : (
              currentCard && (
                <div className="illustration-container">
                  <img 
                    className="illustration-img" 
                    src={currentCard.card_images?.[0]?.image_url_cropped} 
                    alt="Quiz Illustration" 
                    onError={(e) => {
                      // Fallback crop if cropped image fails
                      e.target.src = currentCard.card_images?.[0]?.image_url
                      e.target.classList.add('artwork-crop-fallback')
                    }}
                  />
                  <div className="illustration-overlay" />
                </div>
              )
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="choices-grid">
            {choices.map((choice, index) => (
              <button
                key={index}
                className="choice-button"
                onClick={() => handleAnswer(choice)}
                disabled={loading}
              >
                {choice.korean}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'REVEALED' && currentCard && (
        <div className="reveal-container">
          {selectedAnswer?.english.toLowerCase() === currentCard.race.toLowerCase() ? (
            <h2 className="reveal-heading success">🎉 정답입니다! (+1)</h2>
          ) : (
            <h2 className="reveal-heading danger">😢 오답입니다... (정답: {RACE_MAP[currentCard.race] || currentCard.race})</h2>
          )}

          <div className="card-details-layout">
            <div 
              ref={cardWrapRef}
              className="quiz-card-wrap"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className="quiz-card-tilt">
                <HoloCard 
                  imageUrl={currentCard.card_images?.[0]?.image_url} 
                  rarityTier="secret" 
                  alt={currentCard.name}
                />
              </div>
            </div>

            <div className="card-info-table">
              <div className="info-row">
                <span className="info-label">카드명</span>
                <span className="info-value">{currentCard.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">종족</span>
                <span className="info-value">{RACE_MAP[currentCard.race] || currentCard.race}</span>
              </div>
              <div className="info-row">
                <span className="info-label">속성</span>
                <span className="info-value">{currentCard.attribute || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">타입</span>
                <span className="info-value">{currentCard.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">공격력/수비력</span>
                <span className="info-value">
                  {currentCard.atk !== undefined ? currentCard.atk : '-'} / {currentCard.def !== undefined ? currentCard.def : '-'}
                </span>
              </div>
              <div className="card-description-box">
                {currentCard.desc}
              </div>
            </div>
          </div>

          <button className="next-button" onClick={nextQuestion}>
            {lives <= 0 ? '결과 보기' : '다음 카드로 진행'}
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="screen-wrapper">
          <span className="intro-badge" style={{ color: '#ef4444', borderColor: '#ef444455', background: '#ef444411' }}>Game Over</span>
          <h2 className="screen-title" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text' }}>도전 종료!</h2>
          
          <div className="quiz-stats" style={{ width: '100%', margin: '8px 0' }}>
            <div className="stat-item">
              <span className="stat-label">최종 점수</span>
              <span className="stat-value score">{score}점</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최대 콤보</span>
              <span className="stat-value combo">{maxCombo}회</span>
            </div>
          </div>

          {history.length > 0 && (
            <div className="review-section">
              <div className="review-section-title">출제된 카드 히스토리 ({history.length}개)</div>
              <div className="review-grid">
                {history.map((item, index) => (
                  <div key={index} className="review-item">
                    <div className="review-img-box">
                      <img className="review-img" src={item.image} alt={item.name} />
                    </div>
                    <span className="review-name" title={item.name}>{item.name}</span>
                    <span className={`review-result-badge ${item.correct ? 'correct' : 'incorrect'}`}>
                      {item.correct ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="primary-button" onClick={startGame}>
            다시 시작하기
          </button>
        </div>
      )}
    </div>
  )
}
