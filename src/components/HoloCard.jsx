import './HoloCard.css'

export function HoloCard({ imageUrl, rarityTier = 'common', alt = '', children }) {
  return (
    <div className={`holo-wrap rarity-${rarityTier}`}>
      <div className="holo-inner">
        <img src={imageUrl} alt={alt} draggable={false} />
        {children}
        <div className="holo-shine" />
        <div className="holo-glare" />
      </div>
    </div>
  )
}
