import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Typography, Button, Box, Divider, Chip, Grid, Tooltip, Link as MuiLink } from "@mui/material";
import ArticleTile from "./article-tile";
import ARTICLES from "../constants/index";
import TAGS from "../constants/tags";

const ArticlePage = () => {
  const { slug } = useParams();
  const contentRef = useRef(null);
  const [readingTime, setReadingTime] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Find the article data from the slug
  const articleObject = ARTICLES.find((a) => {
    const articleKey = Object.keys(a)[0]
    const [yyyy, mm, dd, ...rest] = articleKey.split("_")
    return slug.toLowerCase() === rest.join("_").toLowerCase()
  });

  if (!articleObject) {
    return <Typography variant="h4">Article not found!</Typography>;
  }
  const articleKey = Object.keys(articleObject)[0];
  const [yyyy, mm, dd] = articleKey.split("_");
  // Month is 0-indexed in JS
  const formattedDate = new Date(yyyy, mm - 1, dd).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  const articleData = articleObject[articleKey];
  const title = articleData.title.marathi || articleData.title.english;
  const content = articleData.content.marathi || articleData.content.english;
  const tags = (articleData.tags || []).filter(t => t);
  const tagsKeyValues = tags.map((tag) => {
    const [key, value] = Object.entries(TAGS).find((t) => t[1] === tag) || [];
    return { key, value }
  });
  const tagsForArticles = tags.filter(t => !['palakneeti', 'masik-article', 'masik-monthly', 'पालकनीती'].includes(t))
  const relatedArticles = ARTICLES.filter((a) => {
    const key = Object.keys(a)[0];
    // Exclude the current article from the related list
    if (key === articleKey) return false;
    
    const articleTags = Object.values(a)[0]?.tags || [];
    return articleTags.filter(t => t).some(t => (tagsForArticles.length ? tagsForArticles : tags).includes(t));
  });
  const randomRelatedArticles = relatedArticles.sort(() => 0.5 - Math.random()).slice(0, 6);

  const encodedTitle = encodeURI(title);
  const encodedUrl = new URL(`${location.origin}/${slug}`).href;

  useEffect(() => {
    // After the component renders and the HTML is set,
    // we can inspect the DOM elements inside the ref.
    if (contentRef.current) {
      const images = contentRef.current.querySelectorAll("img");
      images.forEach((img) => {
        // For images that might already be broken (e.g., from cache),
        // check their 'complete' status and dimensions.
        const removeIfBroken = () => {
            if (img.complete && img.naturalWidth === 0) {
                img.remove();
            }
        }
        img.addEventListener('load', removeIfBroken);
        img.addEventListener('error', () => img.remove());
      });
      // Calculate word count and estimate reading time
      const words = contentRef.current.innerText.trim().split(/\s+/).length;
      const time = Math.ceil(words / 150); // Average reading speed: ~150 WPM
      if (readingTime !== time) {
        setReadingTime(time);
      }
    }
  }, [contentRef, slug]); // Rerun this effect if the article content changes.

  return (
    <Box className="article-page">
      <title>{`${title} | Palakneeti Blogs`}</title>
      <meta name="description" content={articleData.short.marathi || articleData.short.english} />
      <Link to="/">
        <Button variant="outlined" color="primary">Home</Button>
      </Link>
      <Typography variant="h3" component="h1" gutterBottom sx={{ marginTop: '1em' }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: "space-between", alignItems: 'center', marginBottom: '0.25em' }}>
        <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 'bold' }}>
          {formattedDate}
        </Typography>
        {readingTime > 0 && (
          <Typography
            sx={{ backgroundColor: '#1976d2', opacity: 0.7, fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', color: 'white' }}
            variant="body2"
        >
            {readingTime} {readingTime === 1 ? 'min' : 'mins'} read
        </Typography>
        )}
      </Box>
      <Divider sx={{ marginBottom: '4em' }} />
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: content }} />
      <div className="social-links">
        <Tooltip title="Share on Facebook" placement="top">
            <MuiLink
                href={`https://www.addtoany.com/add_to/facebook?linkurl=${encodedUrl}&linkname=${encodedTitle}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="330 1623 502 502">
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(27.236938%, 38.032532%, 71.470642%)" fillOpacity="1" d="M 831.988281 1764.578125 L 831.988281 1983.160156 C 831.988281 2061.320312 768.621094 2124.691406 690.457031 2124.691406 L 471.875 2124.691406 C 393.707031 2124.691406 330.34375 2061.320312 330.34375 1983.160156 L 330.34375 1764.578125 C 330.34375 1686.410156 393.707031 1623.050781 471.875 1623.050781 L 690.457031 1623.050781 C 768.621094 1623.050781 831.988281 1686.410156 831.988281 1764.578125 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 529.589844 2124.691406 L 529.945312 1945.519531 L 476.472656 1945.519531 L 476.472656 1881.671875 L 529.929688 1881.671875 L 529.929688 1844.441406 L 529.6875 1844.441406 L 529.742188 1839.121094 C 529.90625 1822.820312 530.792969 1803.789062 536.105469 1786.210938 C 541.644531 1767.898438 551.285156 1753.441406 565.585938 1741.988281 C 577.632812 1732.359375 592.285156 1725.828125 607.960938 1723.128906 C 619.023438 1721.21875 630.632812 1720.300781 643.453125 1720.300781 C 658.347656 1720.300781 674.636719 1721.558594 693.246094 1724.148438 L 697.785156 1724.789062 L 697.785156 1784.710938 L 685.359375 1784.808594 L 666.59375 1784.941406 C 653.316406 1785.039062 639.421875 1786.5 627.761719 1796.441406 C 616.222656 1806.300781 610.171875 1821.621094 610.265625 1840.761719 L 609.996094 1875.089844 L 609.949219 1881.671875 L 692.535156 1881.671875 L 680.277344 1947.75 L 611.058594 1947.75 L 610.800781 2124.691406 L 529.589844 2124.691406 "/>
                    </svg>
                </span>
            </MuiLink>
        </Tooltip>
        <Tooltip title="Share on X" placement="top">
            <MuiLink
                href={`https://www.addtoany.com/add_to/x?linkurl=${encodedUrl}&linkname=${encodedTitle}`}
                rel="nofollow noopener"
                target="_blank"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="2500 220 503 503">
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(6.266785%, 5.734253%, 5.047607%)" fillOpacity="1" d="M 3002.28125 362.75 L 3002.28125 581.328125 C 3002.28125 659.488281 2938.910156 722.859375 2860.75 722.859375 L 2642.171875 722.859375 C 2564 722.859375 2500.628906 659.488281 2500.628906 581.328125 L 2500.628906 362.75 C 2500.628906 284.578125 2564 221.210938 2642.171875 221.210938 L 2860.75 221.210938 C 2938.910156 221.210938 3002.28125 284.578125 3002.28125 362.75 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(98.731995%, 99.009705%, 99.099731%)" fillOpacity="1" d="M 2746.449219 492.71875 L 2735.339844 476.460938 L 2649.039062 350.199219 L 2685.621094 350.199219 L 2755.988281 452.21875 L 2767.140625 468.390625 L 2853.699219 593.871094 L 2815.589844 593.871094 Z M 2778.988281 454.449219 L 2767.851562 438.300781 L 2694.898438 332.53125 L 2615.558594 332.53125 L 2723.46875 490.398438 L 2734.589844 506.671875 L 2806.269531 611.539062 L 2887.351562 611.539062 L 2778.988281 454.449219 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(98.731995%, 99.009705%, 99.099731%)" fillOpacity="1" d="M 2735.339844 476.460938 L 2746.449219 492.71875 L 2734.589844 506.671875 L 2645.429688 611.539062 L 2620.269531 611.539062 L 2723.46875 490.398438 L 2735.339844 476.460938 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(98.731995%, 99.009705%, 99.099731%)" fillOpacity="1" d="M 2882.648438 332.53125 L 2778.988281 454.449219 L 2767.140625 468.390625 L 2755.988281 452.21875 L 2767.851562 438.300781 L 2857.949219 332.53125 L 2882.648438 332.53125 "/>
                    </svg>
                </span>
            </MuiLink>
        </Tooltip>
        <Tooltip title="Share on LinkedIn" placement="top">
            <MuiLink
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                rel="nofollow noopener"
                target="_blank"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="3947 1623 502 502">
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(21.801758%, 37.997437%, 71.408081%)" fillOpacity="1" d="M 4449.140625 1763.53125 L 4449.140625 1984.210938 C 4449.140625 2061.789062 4386.238281 2124.691406 4308.660156 2124.691406 L 4069.96875 2124.691406 C 4002.320312 2124.691406 3947.488281 2069.851562 3947.488281 2002.210938 L 3947.488281 1763.53125 C 3947.488281 1685.941406 4010.390625 1623.050781 4087.96875 1623.050781 L 4308.660156 1623.050781 C 4386.238281 1623.050781 4449.140625 1685.941406 4449.140625 1763.53125 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 4092.78125 1735.160156 C 4111.21875 1735.160156 4126.160156 1750.128906 4126.160156 1768.539062 C 4126.160156 1786.988281 4111.21875 1801.949219 4092.78125 1801.949219 C 4074.289062 1801.949219 4059.378906 1786.988281 4059.378906 1768.539062 C 4059.378906 1750.128906 4074.289062 1735.160156 4092.78125 1735.160156 M 4063.949219 1827.28125 L 4121.589844 1827.28125 L 4121.589844 2012.570312 L 4063.949219 2012.570312 L 4063.949219 1827.28125 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 4157.730469 1827.28125 L 4212.941406 1827.28125 L 4212.941406 1852.601562 L 4213.71875 1852.601562 C 4221.398438 1838.03125 4240.199219 1822.671875 4268.21875 1822.671875 C 4326.480469 1822.671875 4337.25 1861.03125 4337.25 1910.941406 L 4337.25 2012.570312 L 4279.730469 2012.570312 L 4279.730469 1922.480469 C 4279.730469 1900.980469 4279.308594 1873.328125 4249.789062 1873.328125 C 4219.820312 1873.328125 4215.25 1896.738281 4215.25 1920.910156 L 4215.25 2012.570312 L 4157.730469 2012.570312 L 4157.730469 1827.28125 "/>
                    </svg>
                </span>
            </MuiLink>
        </Tooltip>
        <Tooltip title="Share on Whatsapp" placement="top">
            <MuiLink
                href={`https://www.addtoany.com/add_to/whatsapp?linkurl=${encodedUrl}&linkname=${encodedTitle}`}
                rel="nofollow noopener"
                target="_blank"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="1053 1623 503 503">
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(30.078125%, 74.06311%, 21.932983%)" fillOpacity="1" d="M 1555.421875 1764.578125 L 1555.421875 1983.160156 C 1555.421875 2061.320312 1492.050781 2124.691406 1413.890625 2124.691406 L 1195.308594 2124.691406 C 1117.140625 2124.691406 1053.769531 2061.320312 1053.769531 1983.160156 L 1053.769531 1764.578125 C 1053.769531 1686.410156 1117.140625 1623.050781 1195.308594 1623.050781 L 1413.890625 1623.050781 C 1492.050781 1623.050781 1555.421875 1686.410156 1555.421875 1764.578125 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 1207.011719 1936.339844 C 1193.648438 1916.578125 1186.609375 1893.648438 1186.609375 1869.730469 C 1186.609375 1865.910156 1186.800781 1862.101562 1187.191406 1858.101562 C 1193.199219 1796.289062 1244.960938 1749.691406 1307.578125 1749.691406 C 1370.351562 1749.691406 1423.320312 1798.289062 1428.160156 1860.339844 C 1428.441406 1863.988281 1428.570312 1866.96875 1428.570312 1869.71875 C 1428.570312 1935.910156 1374.300781 1989.769531 1307.578125 1989.769531 C 1289.78125 1989.769531 1272.398438 1985.898438 1256.46875 1978.488281 C 1252.03125 1976.429688 1243.601562 1971.390625 1240.929688 1969.78125 C 1240.390625 1969.449219 1239.761719 1969.390625 1239.160156 1969.578125 L 1198.289062 1982.578125 C 1197.359375 1982.878906 1196.480469 1981.980469 1196.800781 1981.050781 L 1210 1942.140625 C 1210.230469 1941.460938 1210.121094 1940.730469 1209.699219 1940.148438 C 1208.898438 1939.039062 1207.578125 1937.191406 1207.011719 1936.339844 Z M 1456.5 1865.988281 C 1454.449219 1785.179688 1389.039062 1721.878906 1307.578125 1721.878906 C 1227.589844 1721.878906 1162.21875 1783.960938 1158.761719 1863.199219 C 1158.648438 1865.371094 1158.589844 1867.550781 1158.589844 1869.730469 C 1158.589844 1896.03125 1165.601562 1921.769531 1178.898438 1944.300781 C 1179.210938 1944.839844 1179.28125 1945.488281 1179.078125 1946.078125 L 1152.691406 2024.050781 C 1152.328125 2025.109375 1153.328125 2026.128906 1154.398438 2025.789062 L 1235.589844 1999.96875 C 1236.140625 1999.789062 1236.730469 1999.851562 1237.25 2000.121094 C 1258.808594 2011.578125 1283.078125 2017.628906 1307.578125 2017.628906 C 1389.730469 2017.628906 1456.570312 1951.28125 1456.570312 1869.730469 C 1456.570312 1868.660156 1456.5 1865.988281 1456.5 1865.988281 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 1378.421875 1902.628906 C 1377.488281 1901.148438 1371.058594 1898.058594 1371.058594 1898.058594 C 1368.53125 1896.800781 1349.871094 1887.660156 1346.359375 1886.398438 C 1343.359375 1885.328125 1339.960938 1884.101562 1336.910156 1888.640625 C 1334.589844 1892.070312 1327.808594 1899.980469 1325.609375 1902.480469 C 1324.058594 1904.238281 1322.640625 1904.820312 1319.210938 1903.101562 C 1318.628906 1902.820312 1302.011719 1895.71875 1290.550781 1885.578125 C 1280.378906 1876.601562 1273.328125 1865.5 1270.78125 1861.140625 C 1269.199219 1858.480469 1270.230469 1857.238281 1272.171875 1855.300781 C 1273.371094 1854.128906 1278.628906 1847.761719 1279.050781 1847.148438 C 1279.890625 1845.871094 1281.378906 1842.808594 1281.378906 1842.808594 C 1282.898438 1839.808594 1281.960938 1837.199219 1281.109375 1835.480469 C 1280.5 1834.300781 1270.929688 1811.261719 1270.019531 1809.089844 C 1267.300781 1802.578125 1264.378906 1802.238281 1261.601562 1802.398438 C 1260.238281 1802.5 1247.578125 1802.601562 1243.550781 1806.96875 L 1242.839844 1807.730469 C 1238.878906 1811.910156 1230.640625 1820.628906 1230.640625 1837.488281 C 1230.640625 1841.371094 1231.261719 1845.449219 1232.539062 1849.96875 C 1234.890625 1858.089844 1239.488281 1866.988281 1245.570312 1875.121094 C 1245.710938 1875.289062 1254.96875 1888.160156 1259.601562 1893.488281 C 1274.25 1910.359375 1290.800781 1922.820312 1307.5 1929.351562 C 1328.828125 1937.679688 1337.941406 1939.589844 1343.109375 1939.589844 C 1345.371094 1939.589844 1350.128906 1938.441406 1351.171875 1938.339844 C 1357.679688 1937.761719 1373.179688 1929.691406 1376.429688 1920.621094 C 1379.511719 1912.050781 1379.570312 1904.558594 1378.421875 1902.628906 "/>
                    </svg>
                </span>
            </MuiLink>
        </Tooltip>
        <Tooltip title="Share via Email" placement="top">
            <MuiLink
                href={`https://www.addtoany.com/add_to/email?linkurl=${encodedUrl}&linkname=${encodedTitle}`}
                rel="nofollow noopener"
                target="_blank"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="5394 922 502 502">
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(6.266785%, 5.734253%, 5.047607%)" fillOpacity="1" d="M 5896 1062.609375 L 5896 1283.289062 C 5896 1360.878906 5833.101562 1423.769531 5755.519531 1423.769531 L 5516.828125 1423.769531 C 5449.179688 1423.769531 5394.351562 1368.941406 5394.351562 1301.300781 L 5394.351562 1062.609375 C 5394.351562 985.03125 5457.25 922.128906 5534.828125 922.128906 L 5755.519531 922.128906 C 5833.101562 922.128906 5896 985.03125 5896 1062.609375 "/>
                        <path xmlns="http://www.w3.org/2000/svg" fillRule="nonzero" fill="rgb(100%, 100%, 100%)" fillOpacity="1" d="M 5484.328125 1171.820312 L 5726.109375 1069.898438 C 5737.78125 1064.980469 5750.320312 1074.761719 5748.390625 1087.28125 L 5718.988281 1277.738281 C 5716.660156 1292.851562 5699.390625 1300.378906 5686.730469 1291.820312 L 5600.089844 1233.261719 C 5593.28125 1228.660156 5592.460938 1218.949219 5598.378906 1213.261719 L 5680.601562 1134.421875 C 5682.75 1132.371094 5682.621094 1128.898438 5680.339844 1127.011719 C 5678.640625 1125.601562 5676.21875 1125.46875 5674.390625 1126.710938 L 5565.46875 1199.980469 C 5555.628906 1206.601562 5543.320312 1208.378906 5532.011719 1204.828125 L 5485.191406 1190.109375 C 5476.53125 1187.390625 5475.960938 1175.351562 5484.328125 1171.820312 "/>
                    </svg>
                </span>    
            </MuiLink>
        </Tooltip>
        <Tooltip title="Share on other platforms" placement="top">
            <MuiLink
                href={`https://www.addtoany.com/share?linkurl=${encodedUrl}&linkname=${encodedTitle}`}
                rel="nofollow noopener"
                target="_blank"
                sx={{ transition: 'all 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' }}}
            >
                <span style={{ backgroundColor: "rgb(1, 102, 255)" }}>
                    <svg focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                        <g fill="#FFF"><path d="M14 7h4v18h-4z"></path><path d="M7 14h18v4H7z"></path></g>
                    </svg>
                </span>
            </MuiLink>
        </Tooltip>
      </div>
      <Box sx={{ marginTop: '2em', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tagsKeyValues.filter(({ key }) => key).map(({ key, value }) => (
          <Chip
            key={key}
            label={value}
            component={Link}
            to={`/?tags=${key}`}
            clickable
            onClick={() => window.scrollTo(0, 0)}
            sx={{
              border: '1px solid #1976d2',
              backgroundColor: '#1976d2',
              color: '#ffffff !important',
              '&:hover': {
                color: '#1976d2 !important',
                backgroundColor: 'white !important',
              },
            }}
          />
        ))}
      </Box>
      {randomRelatedArticles.length > 0 && (
        <Box sx={{ marginTop: '4em', marginBottom: '4em' }}>
          <Typography variant="h4" component="h2" gutterBottom>Related Articles</Typography>
          <Divider sx={{ marginBottom: '2em' }} />
          <Box className="article-grid">
            {randomRelatedArticles.map((articleObject, index) => {
              const [dateSlug, data] = Object.entries(articleObject)[0];
              return (
                <Grid item key={`${dateSlug}-${index}}`}>
                  <ArticleTile shortTile dateSlug={dateSlug} data={data} />
                </Grid>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ArticlePage;
