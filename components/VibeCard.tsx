// EDIT ME: swap the playlist ID below if the playlist ever changes.
const PLAYLIST_ID = '6kdqw7CjTjWBhogdX1V0YP';

export default function VibeCard() {
  return (
    <div className="vibe-card">
      <p className="vibe-line">We can vibe to the same music.</p>
      <div className="vibe-embed">
        <iframe
          title="Spotify playlist"
          src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          style={{ borderRadius: 12, border: 0, display: 'block' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
}
