import { useCards } from "./hooks/useCards";
import { UploadForm } from "./components/UploadForm";
import { CardGallery } from "./components/CardGallery";
import "./index.css";

function App() {
  const { cards, loading, error, addCard, removeCard } = useCards();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Card Binder</h1>
        <p className="app__count">{cards.length} card{cards.length === 1 ? "" : "s"}</p>
      </header>

      <UploadForm onSubmit={addCard} />

      {loading && <p className="app__status">Loading…</p>}
      {error && <p className="gallery-empty">Couldn't load your cards: {error}</p>}
      {!loading && !error && <CardGallery cards={cards} onDelete={removeCard} />}
    </div>
  );
}

export default App;