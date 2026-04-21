import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface WikipediaResult {
  title: string;
  snippet: string;
  pageid: number;
}

interface OpenLibraryResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

interface GoogleBooksResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail: string;
    };
    infoLink: string;
  };
}

export const ResourceFetcher: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'books' | 'articles' | 'ghana_books'>('books');

  // --- WEB ARTICLES STATE (WIKIPEDIA) ---
  const [articleQuery, setArticleQuery] = useState('');
  const [articleResults, setArticleResults] = useState<WikipediaResult[]>([]);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);

  // --- E-LIBRARY BOOKS STATE (OPEN LIBRARY) ---
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<OpenLibraryResult[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  // --- GHANA BOOKS & LIFESTYLE STATE (GOOGLE BOOKS) ---
  const [ghanaQuery, setGhanaQuery] = useState('Ghanaian Literature');
  const [ghanaResults, setGhanaResults] = useState<GoogleBooksResult[]>([]);
  const [isSearchingGhana, setIsSearchingGhana] = useState(false);
  const [ghanaError, setGhanaError] = useState('');

  const CURATED_CATEGORIES = [
    { label: '🇬🇭 Popular Ghana Books', query: '"The Beautyful Ones Are Not Yet Born" OR "Homegoing" OR "Ayi Kwei Armah" OR "Yaa Gyasi" OR "Ama Ata Aidoo"' },
    { label: '💰 Wealth & Business', query: 'Financial independence and business success books' },
    { label: '🧠 Major Topics', query: 'Artificial Intelligence, Climate Change, World History, Philosophy' },
    { label: '🌱 Self-Improvement', query: 'Best selling self help and motivation books' },
    { label: '🌍 African Classics', query: 'Things Fall Apart, Half of a Yellow Sun, African Literature' }
  ];

  const [error, setError] = useState<string>('');

  // --- WEB ARTICLES HANDLERS ---
  const searchArticles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleQuery.trim()) return;
    setIsSearchingArticles(true);
    try {
      const response = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(articleQuery)}&utf8=&format=json&origin=*`);
      setArticleResults(response.data.query.search);
    } catch (err) {
      setError('Failed to fetch articles. Please check your internet connection.');
    } finally {
      setIsSearchingArticles(false);
    }
  };

  // --- E-LIBRARY HANDLERS ---
  const searchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookQuery.trim()) return;
    setIsSearchingBooks(true);
    try {
      const response = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=20`);
      setBookResults(response.data.docs);
    } catch (err) {
      setError('Failed to fetch books. Please try again.');
    } finally {
      setIsSearchingBooks(false);
    }
  };

  // --- GHANA BOOKS & LIFESTYLE HANDLERS ---
  const searchGhanaBooks = async (queryToSearch: string = ghanaQuery) => {
    if (!queryToSearch.trim()) return;
    setIsSearchingGhana(true);
    setGhanaError('');
    try {
      // Using public Google Books API
      const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryToSearch)}&maxResults=20`);
      setGhanaResults(response.data.items || []);
    } catch (err) {
      setGhanaError('Failed to fetch premium curated books. Please try again.');
    } finally {
      setIsSearchingGhana(false);
    }
  };

  // Preload Ghana books on first mount of that tab
  useEffect(() => {
    if (activeTab === 'ghana_books' && ghanaResults.length === 0) {
      searchGhanaBooks(CURATED_CATEGORIES[0].query);
    }
  }, [activeTab]);

  return (
    <div className="resource-fetcher" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* ── HEADER & NAVIGATION ── */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📚 Interactive Library</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          Explore free story books, reference articles, and self-development materials.
        </p>

        <div className="app-nav" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px', background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <button 
            className={`btn ${activeTab === 'books' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('books')}
            style={{ padding: '10px 25px', borderRadius: '50px' }}
          >
            📖 Free E-Books
          </button>
          <button 
            className={`btn ${activeTab === 'articles' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('articles')}
            style={{ padding: '10px 25px', borderRadius: '50px' }}
          >
            🌐 Web Articles
          </button>
          <button 
            className={`btn ${activeTab === 'ghana_books' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ghana_books')}
            style={{ padding: '10px 25px', borderRadius: '50px', background: activeTab === 'ghana_books' ? 'linear-gradient(135deg, #0b7a4b, #10a261)' : '' }}
          >
            🇬🇭 Authors & Lifestyle
          </button>
        </div>
      </div>

      {error && activeTab !== 'ghana_books' && (
        <div className="resource-fetcher__error" style={{ marginBottom: '20px' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── TAB: GHANA AUTHORS & LIFESTYLE ── */}
      {activeTab === 'ghana_books' && (
        <div className="glass-card" style={{ padding: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h3 style={{ color: '#0b7a4b', fontSize: '1.8rem', marginBottom: '15px' }}>Curated Knowledge</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {CURATED_CATEGORIES.map(cat => (
                <button 
                  key={cat.label}
                  onClick={() => { setGhanaQuery(cat.label); searchGhanaBooks(cat.query); }}
                  style={{
                    padding: '10px 20px', borderRadius: '25px', border: '1px solid #0b7a4b', 
                    background: ghanaQuery === cat.label ? '#0b7a4b' : 'transparent',
                    color: ghanaQuery === cat.label ? '#fff' : '#0b7a4b',
                    cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', fontSize: '0.9rem'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); searchGhanaBooks(); }} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="Search entrepreneurship, health, or lifestyle books..." 
              value={ghanaQuery}
              onChange={(e) => setGhanaQuery(e.target.value)}
              style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
            />
            <button type="submit" className="btn-primary" disabled={isSearchingGhana} style={{ padding: '0 30px', background: 'linear-gradient(135deg, #0b7a4b, #10a261)' }}>
              {isSearchingGhana ? 'Searching...' : '🔍 Search'}
            </button>
          </form>

          {ghanaError && <div className="error-message">⚠️ {ghanaError}</div>}

          {ghanaResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
              {ghanaResults.map((book) => {
                const info = book.volumeInfo;
                return (
                  <div key={book.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => window.open(info.infoLink, '_blank')} className="book-card-hover">
                    <div style={{ height: '240px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                      {info.imageLinks?.thumbnail ? (
                        <img src={info.imageLinks.thumbnail} alt={info.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                      ) : (
                        <div style={{ color: '#94a3b8' }}>No Cover</div>
                      )}
                    </div>
                    <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', lineHeight: 1.3, color: '#0f172a' }}>{info.title}</h4>
                      <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '0.9rem' }}>{info.authors ? info.authors.join(', ') : 'Unknown Author'}</p>
                      <button className="btn-primary" style={{ marginTop: 'auto', width: '100%', padding: '8px', background: '#0b7a4b' }}>
                        View Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !isSearchingGhana && <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No books found for this topic.</div>
          )}
        </div>
      )}

      {/* ── TAB: FREE E-BOOKS ── */}
      {activeTab === 'books' && (
        <div className="glass-card" style={{ padding: '30px' }}>
          <form onSubmit={searchBooks} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="Search for story books, novels, reading materials (e.g. Oliver Twist)..." 
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
            />
            <button type="submit" className="btn-primary" disabled={isSearchingBooks} style={{ padding: '0 30px' }}>
              {isSearchingBooks ? 'Searching...' : '🔍 Search Library'}
            </button>
          </form>

          {bookResults.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '25px' }}>
              {bookResults.map((book, idx) => (
                <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => window.open(`https://openlibrary.org${book.key}`, '_blank')} className="book-card-hover">
                  <div style={{ height: '280px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {book.cover_i ? (
                      <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`} alt={book.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>No Cover</div>
                    )}
                  </div>
                  <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{book.title}</h4>
                    <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '0.9rem' }}>{book.author_name ? book.author_name[0] : 'Unknown Author'}</p>
                    <button className="btn-secondary" style={{ marginTop: 'auto', width: '100%', padding: '8px' }}>
                      Read / Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: WEB ARTICLES ── */}
      {activeTab === 'articles' && (
        <div className="glass-card" style={{ padding: '30px' }}>
          <form onSubmit={searchArticles} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="Research any topic (e.g. Quantum Mechanics, History of Ghana)..." 
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
              style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
            />
            <button type="submit" className="btn-primary" disabled={isSearchingArticles} style={{ padding: '0 30px' }}>
              {isSearchingArticles ? 'Searching...' : '🔍 Search Web'}
            </button>
          </form>

          {articleResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {articleResults.map((article) => (
                <div key={article.pageid} style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#1d4ed8', fontSize: '1.4rem' }}>{article.title}</h3>
                  <p 
                    dangerouslySetInnerHTML={{ __html: article.snippet + '...' }} 
                    style={{ margin: '0 0 15px 0', color: '#475569', lineHeight: 1.6 }}
                  />
                  <a 
                    href={`https://en.wikipedia.org/?curid=${article.pageid}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 20px', fontSize: '0.9rem' }}
                  >
                    Read Full Article
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceFetcher;
