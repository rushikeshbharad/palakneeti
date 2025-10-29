import React, { useState, useRef, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import {
  Container,
  Divider,
  Typography,
  CssBaseline,
  Grid,
  Box,
} from "@mui/material";
import ARTICLES from "./constants/index";
import ArticleTile from "./components/article-tile";
import "./index.css"

const ArticlePage = () => {
  const { slug } = useParams();

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

  return (
    <Box className="article-page">
      <Typography variant="h3" component="h1" gutterBottom>
        {articleData.title.marathi || articleData.title.english}
      </Typography>
      <Divider sx={{ marginBottom: '4em' }} />
      {/* Render the HTML content */}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </Box>
  );
};

const ArticleList = () => {
  const [articles, setArticles] = useState(ARTICLES.slice(0, 20));
  const observer = useRef();

  const hasMore = articles.length < ARTICLES.length;

  const loadMoreArticles = useCallback(() => {
    const articlesPerPage = 20;
    const currentLength = articles.length;
    const newArticles = ARTICLES.slice(
      currentLength,
      currentLength + articlesPerPage
    );
    setArticles((prevArticles) => [...prevArticles, ...newArticles]);
  }, [articles.length]);

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

  return (
    <Box>
      <Typography sx={{ marginTop: '2em' }} variant="h3" component="h1" gutterBottom>
        पालकनीती ब्लॉग्स
      </Typography>
      <Divider sx={{ marginBottom: '2em' }} />
      <Box className="article-grid">
        {articles.map((articleObject, index) => {
          const [dateSlug, data] = Object.entries(articleObject)[0];
          const [yyyy, mm, dd, ...rest] = dateSlug.split("_");
          const slug = rest.join("_");
          const isLastArticle = articles.length === index + 1;
          return (
            <Grid item key={slug} ref={isLastArticle ? lastArticleElementRef : null}>
              <ArticleTile slug={slug} data={data} />
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
