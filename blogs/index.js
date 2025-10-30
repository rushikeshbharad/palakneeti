import React, { useState, useRef, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams, useSearchParams, Link } from "react-router-dom";
import {
  Container,
  Divider,
  Typography,
  CssBaseline,
  Grid,
  Box,
  TextField,
  Button,
} from "@mui/material";
import ARTICLES from "./constants/index";
import ArticleTile from "./components/article-tile";
import "./index.css"

const ArticlePage = () => {
  const { slug } = useParams();
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Find the article data from the slug
  const articleObject = ARTICLES.find((a) => Object.keys(a)[0].includes(slug));

  if (!articleObject) {
    return <Typography variant="h4">Article not found!</Typography>;
  }
  const articleKey = Object.keys(articleObject)[0];

  const articleData = articleObject[articleKey];
  const content = articleData.content.marathi || articleData.content.english;

  useEffect(() => {
    // After the component renders and the HTML is set,
    // we can inspect the DOM elements inside the ref.
    if (contentRef.current) {
      const images = contentRef.current.querySelectorAll("img");
      images.forEach((img) => {
        // Assign an error handler to remove the image if it fails to load.
        img.onerror = () => img.remove();

        // For images that might already be broken (e.g., from cache),
        // check their 'complete' status and dimensions.
        if (img.complete && img.naturalWidth === 0) {
          img.remove();
        }
      });
    }
  }, [content]); // Rerun this effect if the article content changes.

  return (
    <Box className="article-page">
      <Typography variant="h3" component="h1" gutterBottom>
        {articleData.title.marathi || articleData.title.english}
      </Typography>
      <Divider sx={{ marginBottom: '4em' }} />
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: content }} />
    </Box>
  );
};

const ArticleList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const observer = useRef();

  const searchTerm = searchParams.get("search") || "";

  const filteredArticles = React.useMemo(() => {
    if (!searchTerm) {
      return ARTICLES;
    }
    return ARTICLES.filter(articleObject => {
      const data = Object.values(articleObject)[0];
      const titleMarathi = (data.title.marathi || "").toLowerCase();
      const titleEnglish = (data.title.english || "").toLowerCase();
      const contentMarathi = (data.content.marathi || "").toLowerCase();
      const contentEnglish = (data.content.english || "").toLowerCase();
      return titleMarathi.includes(searchTerm.toLowerCase()) ||
        titleEnglish.includes(searchTerm.toLowerCase()) ||
        contentMarathi.includes(searchTerm.toLowerCase()) ||
        contentEnglish.includes(searchTerm.toLowerCase());
    });
  }, [searchTerm]);

  const [articles, setArticles] = useState(filteredArticles.slice(0, 20));

  const hasMore = articles.length < filteredArticles.length;

  const loadMoreArticles = useCallback(() => {
    const articlesPerPage = 20;
    const currentLength = articles.length;
    const newArticles = filteredArticles.slice(
      currentLength,
      currentLength + articlesPerPage
    );
    setArticles((prevArticles) => [...prevArticles, ...newArticles]);
  }, [articles.length, filteredArticles]);

  // This callback ref is attached to the last article.
  // When it becomes visible, we'll load more.
  const lastArticleElementRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreArticles();
        }
      });

      if (node) observer.current.observe(node);
    },
    [hasMore, loadMoreArticles]
  );

  useEffect(() => {
    // Reset articles when search term changes
    setArticles(filteredArticles.slice(0, 20));
  }, [filteredArticles]);

  const handleSearch = () => {
    if (searchText.trim()) {
      setSearchParams({ search: searchText.trim() });
      setSearchText(""); // Clear the input field
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleSearch();
  };

  return (
    <Box>
      <Typography sx={{ marginTop: '2em' }} variant="h3" component="h1" gutterBottom>
        पालकनीती ब्लॉग्स
      </Typography>
      {searchTerm ? (
        <Typography
            variant="h5"
            sx={{
                textAlign: 'center',
                marginBottom: '2em',
                marginTop: '1em'
            }}
        >
            {`${filteredArticles.length} article${filteredArticles.length === 1 ? '' : 's'} found for search: "${searchTerm}" (`}
            <Link to="/">Clear</Link>
            {`)`}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: '4em' }}>
            <TextField
                fullWidth
                label="Search Articles"
                variant="outlined"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <Button variant="contained" sx={{ height: '56px' }} onClick={handleSearch}>Search</Button>
        </Box>
      )}
      <Box className="article-grid">
        {articles.map((articleObject, index) => {
          const [dateSlug, data] = Object.entries(articleObject)[0];
          const [yyyy, mm, dd, ...rest] = dateSlug.split("_");
          const slug = rest.join("_");
          const isLastArticle = articles.length === index + 1;
          const dateObj = new Date(yyyy, mm - 1, dd); // Month is 0-indexed in JS
          const date = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).replace(/ /g, '-');
          return (
            <Grid item key={slug} ref={isLastArticle ? lastArticleElementRef : null}>
              <ArticleTile slug={slug} data={data} date={date} />
            </Grid>
          );
        })}
      </Box>
    </Box>
  );
};

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <Container>
        <Routes>
          <Route path="/" element={<ArticleList />} />
          <Route path="/:slug" element={<ArticlePage />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
