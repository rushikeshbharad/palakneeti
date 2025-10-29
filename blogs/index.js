import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import {
  Container,
  Typography,
  CssBaseline,
  Grid,
  Box,
} from "@mui/material";
import ARTICLES from "./constants/index";
import ArticleTile from "./components/article-tile";

const ArticlePage = () => {
  const { slug } = useParams();
  // Find the article data from the slug
  const articleObject = ARTICLES.find((a) => Object.keys(a)[0] === slug);

  if (!articleObject) {
    return <Typography variant="h4">Article not found!</Typography>;
  }

  const articleData = articleObject[slug];
  const content = articleData.content.marathi || articleData.content.english;

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        {articleData.title.marathi || articleData.title.english}
      </Typography>
      {/* Render the HTML content */}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </Box>
  );
};

const ArticleList = () => (
  <Box>
    <Typography variant="h3" component="h1" gutterBottom>
      Palakneeti Articles
    </Typography>
    <Grid container spacing={4}>
      {ARTICLES.map((articleObject) => {
        const [slug, data] = Object.entries(articleObject)[0];
        return (
          <Grid item key={slug} xs={12} sm={6} md={4}>
            <ArticleTile slug={slug} data={data} />
          </Grid>
        );
      })}
    </Grid>
  </Box>
);

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
