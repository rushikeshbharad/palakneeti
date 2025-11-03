import React, { useState, useRef, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useSearchParams, Link } from "react-router-dom";
import {
  Autocomplete,
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
import ArticlePage from "./components/article";
import ChatBot from "./components/chat-bot";
import TAGS from './constants/tags'
import "./index.css"

const ArticleList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const observer = useRef();

  const searchTerm = searchParams.get("search") || "";
  const tagsParam = searchParams.get("tags") || "";

  const selectedTags = React.useMemo(() => {
    if (!tagsParam) return [];
    const tagIds = tagsParam.split(',');
    return Object.entries(TAGS)
      .filter(([key]) => tagIds.includes(key))
      .map(([key, value]) => ({ label: value, id: key }));
  }, [tagsParam]);

  const filteredArticles = React.useMemo(() => {
    const selectedTagIds = selectedTags.map(tag => tag.id);
    const selectedTagValues = selectedTags.map(tag => TAGS[tag.id]);
    const searchKeywords = searchTerm
      ? searchTerm.toLowerCase().split(/[ ,]+/).filter(Boolean)
      : [];

    if (searchKeywords.length === 0 && selectedTagIds.length === 0) {
      return ARTICLES;
    }
    return ARTICLES.filter(articleObject => {
      const data = Object.values(articleObject)[0];
      const articleTags = (data.tags || []).filter(t => t);

      // Check if all selected tags are present in the article's tags
      if (selectedTagIds.length > 0 && !selectedTagValues.every(tag => articleTags.includes(tag))) {
        return false;
      }

      // If no search keywords, and it passed tag filter, include it.
      if (searchKeywords.length === 0) {
        return true;
      }

      const titleMarathi = (data.title.marathi || "").toLowerCase();
      const titleEnglish = (data.title.english || "").toLowerCase();
      const contentMarathi = (data.content.marathi || "").toLowerCase();
      const contentEnglish = (data.content.english || "").toLowerCase();
      const allTags = articleTags.join(" ").toLowerCase();
      const searchableText = `${titleMarathi} ${titleEnglish} ${contentMarathi} ${contentEnglish} ${allTags}`;

      return searchKeywords.every(keyword => searchableText.includes(keyword));
    });
  }, [searchTerm, selectedTags]); // `selectedTags` is stable for the same `tagsParam`

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
    const newSearchParams = new URLSearchParams(searchParams); // Preserve other params like 'tags'
    if (searchText.trim()) {
      newSearchParams.set('search', searchText.trim());
    } else {
      newSearchParams.delete('search');
    }
    setSearchParams(newSearchParams);
    setSearchText(""); // Clear the input field after search
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleSearch();
  };

  const handleTagChange = (event, newTags) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (newTags.length > 0) {
      const tagIds = newTags.map(tag => tag.id).join(',');
      newSearchParams.set('tags', tagIds);
    } else {
      newSearchParams.delete('tags');
    }
    setSearchParams(newSearchParams);
  }

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
                marginTop: '1em'
            }}
        >
            {`${filteredArticles.length} article${filteredArticles.length === 1 ? '' : 's'} found for "${searchTerm}" (`}
            <Link to="/">Clear</Link>
            {`)`}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
      <Autocomplete
        multiple
        id="tags-filter"
        options={Object.entries(TAGS).map(([key, value]) => ({ label: value, id: key }))}
        value={selectedTags}
        onChange={handleTagChange}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>{option.label}</li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Filter by Categories"
            placeholder="Categories"
          />
        )}
        slotProps={{
          popper: {
            sx: {
              '& ul': {
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  padding: '1em',
                  gap: '0.5em'
              },
              '& ul li': {
                  backgroundColor: '#1976d250 !important',
                  borderRadius: '0.25em'
              },
              '& ul li:hover': {
                  backgroundColor: '#1976d280 !important'
              }
            }
          }
        }}
        sx={{
            marginBottom: '4em',
            marginTop: '1em',
        }}
      />
      <Box className="article-grid">
        {articles.map((articleObject, index) => {
          const [dateSlug, data] = Object.entries(articleObject)[0];
          const isLastArticle = articles.length === index + 1;
          return (
            <Grid item key={`${dateSlug}-${index}}`} ref={isLastArticle ? lastArticleElementRef : null}>
              <ArticleTile dateSlug={dateSlug} data={data} />
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
        <ChatBot />
      </Container>
    </BrowserRouter>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
