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

  return ( <
    Card sx = {
      {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        "&:hover .MuiCardMedia-root": {
          transform: "scale(1.1)",
        },
      }
    } >
      <CardActionArea
        component={RouterLink}
        to={`/${slug}`}
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ height: 160, width: "100%", overflow: "hidden" }}>
          <CardMedia
            component="img"
            image={data.image || "invalid-image"} // Provide a value to ensure onError triggers
            alt={title}
            onError={(e) => {
              e.target.onerror = null; // Prevent infinite loop
              e.target.src =
                "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 160 160'%3e%3crect width='100%25' height='100%25' fill='%23ffffff'/%3e%3ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999'%3e%3c/text%3e%3c/svg%3e";
            }}
            sx={{ objectFit: "contain", height: "100%", width: "100%", transition: "transform 0.3s ease-in-out" }}
          />
        </Box>
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
