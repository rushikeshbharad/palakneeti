import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
} from "@mui/material";

const ArticleTile = ({ slug, data }) => {
  const title = data.title.marathi || data.title.english;
  const shortDescription = data.short.marathi || data.short.english;

  return (
    <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CardActionArea
        component={RouterLink}
        to={`/${slug}`}
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        {data.image && (
          <CardMedia
            component="img"
            height="140"
            image={data.image}
            alt={title}
          />
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h5" component="div">
            {title}
          </Typography>
          {shortDescription && (
            <Box>
              <Typography variant="body2" color="text.secondary" component="span">
                {shortDescription}
              </Typography>
              <Link
                component="span"
                variant="body2"
                sx={{ ml: 1, whiteSpace: "nowrap" }}
              >
                Read More
              </Link>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ArticleTile;
